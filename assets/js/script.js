document.addEventListener("DOMContentLoaded", function () {
    (async function () {
        try {
            const r = await fetch("backend/php/auth.php?action=session", {
                credentials: "same-origin",
                cache: "no-store"
            });
            const j = await r.json();
            if (!j.authenticated) {
                window.location.replace("backend/php/index.php");
                return;
            }
            window.AUTH_USER = j.user_name || "";

            // Start app only after auth check passes
            startApp();
        } catch (e) {
            window.location.replace("backend/php/index.php");
        }
    })();
    return;

    function startApp() {
        const regionInput = document.getElementById("region");
        const citySelect = document.getElementById("city");
        const countrySelect = document.getElementById("country");
        const searchBtn = document.getElementById("searchBtn");
        const clearBtn = document.getElementById("clearBtn");
        const logBtn = document.getElementById("logBtn");
        const regionError = document.getElementById("regionError");
        const cityError = document.getElementById("cityError");
        const countryError = document.getElementById("countryError");
        const resultsSection = document.getElementById("resultsSection");
        const resultsTopDivider = document.getElementById("resultsTopDivider");
        const next24Body = document.getElementById("next24Body");
        const logBody = document.getElementById("logBody");

        const detachedLogModal = document.getElementById("logModal");
        if (detachedLogModal && detachedLogModal.parentElement !== document.body) {
            document.body.appendChild(detachedLogModal);
        }

        const OPENWEATHER_KEY = "";
        const WAQI_TOKEN = "";
        const COUNTRIES_API_URL = "https://countriesnow.space/api/v0.1/countries";
        const API_URL = "backend/php/api.php";
        const USERNAME = window.AUTH_USER || "";
        const canUsePhpApi = !(window.location.protocol === "file:" || window.location.port === "5500");

        let countriesData = [];
        let mapInstance = null;
        let forecastListCache = [];
        let forecastCityCache = "N.A.";
        let localLogs = [];
        
        function na(value) {
            return value === undefined || value === null || value === "" ? "N.A." : value;
        }

        function setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        function setAirQualityTitle(text) {
            const title = document.querySelector(".card-gauges-quality") || document.getElementById("airQualityTitle");
            if (title) title.textContent = text;
        }

        function formatDateTime(unixTs) {
            if (!unixTs) return "N.A.";
            const d = new Date(unixTs * 1000);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const h = String(d.getHours()).padStart(2, "0");
            const min = String(d.getMinutes()).padStart(2, "0");
            return y + "-" + m + "-" + day + " " + h + ":" + min;
        }

        function formatModalDate(unixTs) {
            if (!unixTs) return "N.A.";
            const d = new Date(unixTs * 1000);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = d.getDate();
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            return day + " " + month + " " + year + " " + hm;
        }

        function tempText(v, digits) {
            if (v === undefined || v === null || v === "") return "N.A.";
            const n = Number(v);
            if (!Number.isFinite(n)) return "N.A.";
            return (digits !== undefined ? n.toFixed(digits) : n) + " °C";
        }

        function showResults(show) {
            resultsSection.classList.toggle("d-none", !show);
            if (resultsTopDivider) resultsTopDivider.classList.toggle("d-none", !show);
        }

        function toggleRightNowExtras(show) {
            const extras = document.querySelectorAll(".right-now-extra");
            for (let i = 0; i < extras.length; i++) {
                extras[i].classList.toggle("d-none", !show);
            }
        }

        function clearValidationErrors() {
            regionError.textContent = "";
            cityError.textContent = "";
            countryError.textContent = "";
        }

        function validateForm() {
            clearValidationErrors();
            let ok = true;
            if (!regionInput.value.trim()) {
                regionError.textContent = "Please enter your region!";
                ok = false;
            }
            if (!citySelect.value) {
                cityError.textContent = "Please select your city!";
                ok = false;
            }
            if (!countrySelect.value) {
                countryError.textContent = "Please select your country!";
                ok = false;
            }
            return ok;
        }

        function resetCityOptions() {
            citySelect.innerHTML = '<option value="" selected>Select city</option>';
        }

        function fillCountryOptions(list) {
            countrySelect.innerHTML = '<option value="" selected>Select country</option>';
            for (let i = 0; i < list.length; i++) {
                const opt = document.createElement("option");
                opt.value = list[i].country;
                opt.textContent = list[i].country;
                countrySelect.appendChild(opt);
            }
        }

        function fillCityOptionsForCountry(countryName) {
            resetCityOptions();
            if (!countryName) return;
            let rec = null;
            for (let i = 0; i < countriesData.length; i++) {
                if (countriesData[i].country === countryName) {
                    rec = countriesData[i];
                    break;
                }
            }
            if (!rec || !Array.isArray(rec.cities)) return;
            const cities = rec.cities.slice().sort(function (a, b) { return a.localeCompare(b); });
            for (let i = 0; i < cities.length; i++) {
                const opt = document.createElement("option");
                opt.value = cities[i];
                opt.textContent = cities[i];
                citySelect.appendChild(opt);
            }
        }

        function clearDisplayedData() {
            const ids = [
                "currentCondition", "currentLocation", "currentTemp", "currentMin", "currentMax",
                "currentPressure", "currentHumidity", "currentWind", "currentCloud",
                "currentSunrise", "currentSunset"
            ];
            for (let i = 0; i < ids.length; i++) setText(ids[i], "N.A.");
            const currentIcon = document.getElementById("currentIcon");
            if (currentIcon) currentIcon.src = "";
            next24Body.innerHTML = '<tr><td colspan="5">N.A.</td></tr>';
            setAirQualityTitle("Air Quality for N.A., N.A.");
            setText("aqiValue", "N.A.");
            setText("aqPm25", "N.A.");
            setText("aqPm10", "N.A.");
            setText("aqCo", "N.A.");
            setText("aqNo2", "N.A.");
            setText("aqO3", "N.A.");
            setText("aqSo2", "N.A.");
            setText("aqDew", "N.A.");
        }

        function clearResultsUI() {
            clearDisplayedData();
            if (mapInstance) {
                mapInstance.setTarget(null);
                mapInstance = null;
            }
            showResults(false);
        }

        function fillCurrentWeather(current) {
            const icon = current.weather && current.weather[0] ? current.weather[0].icon : "";
            const iconEl = document.getElementById("currentIcon");
            if (iconEl) iconEl.src = icon ? "https://openweathermap.org/img/w/" + icon + ".png" : "";
            setText("currentCondition", na(current.weather && current.weather[0] ? current.weather[0].description : null));
            setText("currentTemp", na(current.main ? current.main.temp : null) + " ° C");
            setText("currentMin", tempText(current.main ? current.main.temp_min : null));
            setText("currentMax", tempText(current.main ? current.main.temp_max : null));
            setText("currentPressure", na(current.main ? current.main.pressure : null) + " hPa");
            setText("currentHumidity", na(current.main ? current.main.humidity : null) + "%");
            setText("currentWind", na(current.wind ? current.wind.speed : null) + " meters/sec");
            setText("currentCloud", na(current.clouds ? current.clouds.all : null) + "%");
            setText("currentSunrise", formatDateTime(current.sys ? current.sys.sunrise : null));
            setText("currentSunset", formatDateTime(current.sys ? current.sys.sunset : null));
        }

        function setCurrentRangeFromForecast(forecast) {
            const list = (forecast && Array.isArray(forecast.list)) ? forecast.list.slice(0, 8) : [];
            if (list.length === 0) {
                setText("currentMin", "N.A.");
                setText("currentMax", "N.A.");
                return;
            }
            let minTemp = Infinity;
            let maxTemp = -Infinity;
            for (let i = 0; i < list.length; i++) {
                const t = list[i] && list[i].main ? list[i].main.temp : null;
                if (typeof t === "number") {
                    if (t < minTemp) minTemp = t;
                    if (t > maxTemp) maxTemp = t;
                }
            }
            setText("currentMin", Number.isFinite(minTemp) ? tempText(minTemp, 2) : "N.A.");
            setText("currentMax", Number.isFinite(maxTemp) ? tempText(maxTemp, 2) : "N.A.");
        }

        function fillNext24Table(forecast) {
            next24Body.innerHTML = "";
            forecastListCache = (forecast.list || []).slice(0, 8);
            forecastCityCache = forecast.city && forecast.city.name ? forecast.city.name : "N.A.";
            if (forecastListCache.length === 0) {
                next24Body.innerHTML = '<tr><td colspan="5">N.A.</td></tr>';
                return;
            }
            for (let i = 0; i < forecastListCache.length; i++) {
                const item = forecastListCache[i];
                const icon = item.weather && item.weather[0] ? item.weather[0].icon : "";
                const temp = item.main && item.main.temp != null ? tempText(item.main.temp, 2) : "N.A.";
                const cloud = item.clouds && item.clouds.all != null ? item.clouds.all + "%" : "N.A.";
                const time = item.dt_txt ? item.dt_txt.slice(0, 16) : formatDateTime(item.dt);
                const tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + time + "</td>" +
                    "<td><img src='https://openweathermap.org/img/w/" + icon + ".png' alt=''></td>" +
                    "<td>" + temp + "</td>" +
                    "<td>" + cloud + "</td>" +
                    "<td><button type='button' class='btn btn-sm btn-success view-forecast-btn' data-index='" + i + "'>View</button></td>";
                next24Body.appendChild(tr);
            }
        }

        function openForecastModal(index) {
            if (index < 0 || index >= forecastListCache.length) return;
            const item = forecastListCache[index];
            const weather = item.weather && item.weather[0] ? item.weather[0] : {};
            const main = item.main || {};
            const wind = item.wind || {};
            const icon = weather.icon ? "https://openweathermap.org/img/w/" + weather.icon + ".png" : "";
            setText("forecastModalTitle", "Weather in " + forecastCityCache + " on " + formatModalDate(item.dt));
            const modalIcon = document.getElementById("modalIcon");
            if (modalIcon) modalIcon.src = icon;
            setText("modalMainText", "" + na(weather.description));
            setText("modalHumidity", main.humidity != null ? main.humidity + "%" : "N.A.");
            setText("modalPressure", main.pressure != null ? main.pressure + " hPa" : "N.A.");
            setText("modalWind", wind.speed != null ? wind.speed + " meters/sec" : "N.A.");
            bootstrap.Modal.getOrCreateInstance(document.getElementById("forecastModal")).show();
        }

        function fillAirQuality(aq, region, city) {
            const data = aq.data || {};
            const iaqi = data.iaqi || {};
            setAirQualityTitle("Air Quality for " + na(region) + ", " + na(city));
            setText("aqiValue", na(data.aqi));
            setText("aqPm25", na(iaqi.pm25 ? iaqi.pm25.v : null));
            setText("aqPm10", na(iaqi.pm10 ? iaqi.pm10.v : null));
            setText("aqCo", na(iaqi.co ? iaqi.co.v : null));
            setText("aqNo2", na(iaqi.no2 ? iaqi.no2.v : null));
            setText("aqO3", na(iaqi.o3 ? iaqi.o3.v : null));
            setText("aqSo2", na(iaqi.so2 ? iaqi.so2.v : null));
            setText("aqDew", na(iaqi.dew ? iaqi.dew.v : null));
        }

        function renderMap(lat, lon) {
            if (!mapInstance) {
                mapInstance = new ol.Map({
                    target: "map",
                    layers: [
                        new ol.layer.Tile({ source: new ol.source.OSM() }),
                        new ol.layer.Tile({
                            opacity: 0.6,
                            source: new ol.source.XYZ({
                                url: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" + OPENWEATHER_KEY
                            })
                        }),
                        new ol.layer.Tile({
                            opacity: 0.6,
                            source: new ol.source.XYZ({
                                url: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=" + OPENWEATHER_KEY
                            })
                        })
                    ],
                    view: new ol.View({
                        center: ol.proj.fromLonLat([lon, lat]),
                        zoom: 5
                    })
                });
            } else {
                mapInstance.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
                mapInstance.getView().setZoom(5);
            }
            setTimeout(function () {
                if (mapInstance) mapInstance.updateSize();
            }, 100);
        }

        function fetchJSON(url, options) {
            return fetch(url, options).then(function (res) {
                if (!res.ok) throw new Error("Request failed: " + res.status);
                return res.json();
            });
        }

        function fetchNominatim(region, city, country) {
            const q = encodeURIComponent(region + ", " + city + ", " + country);
            return fetchJSON("https://nominatim.openstreetmap.org/search?q=" + q + "&format=json", {
                headers: { Accept: "application/json" }
            }).then(function (data) {
                if (!Array.isArray(data) || data.length === 0) throw new Error("NO_RESULT");
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("NO_RESULT");
                return { lat: lat, lon: lon };
            });
        }

        function fetchCurrentWeather(lat, lon) {
            return fetchJSON("https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&units=metric&appid=" + OPENWEATHER_KEY);
        }

        function fetchForecast(lat, lon) {
            return fetchJSON("https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&units=metric&appid=" + OPENWEATHER_KEY);
        }

        function fetchAirQuality(city) {
            return fetchJSON("https://api.waqi.info/feed/" + encodeURIComponent(city) + "/?token=" + WAQI_TOKEN).then(function (data) {
                if (data.status !== "ok") throw new Error("Air quality not available");
                return data;
            });
        }

        function postRequestLog(payload) {
            if (!canUsePhpApi) return Promise.resolve(null);
            return fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(function () { return null; });
        }

        function getLastLogs() {
            if (!canUsePhpApi) return Promise.reject(new Error("PHP API unavailable in static preview."));
            return fetchJSON(API_URL + "?username=" + encodeURIComponent(USERNAME));
        }

        function pushLocalLog(entry) {
            localLogs.unshift({
                username: USERNAME,
                region: entry.region,
                city: entry.city,
                country: entry.country,
                timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
            });
            if (localLogs.length > 5) localLogs = localLogs.slice(0, 5);
        }

        function renderLogs(rows) {
            if (!Array.isArray(rows) || rows.length === 0) {
                logBody.innerHTML = "<tr><td colspan='4'>No log data yet.</td></tr>";
                return;
            }
            logBody.innerHTML = "";
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i] || {};
                const tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + formatModalDate(Number(row.timestamp)) + "</td>" +
                    "<td>" + na(row.region) + "</td>" +
                    "<td>" + na(row.city) + "</td>" +
                    "<td>" + na(row.country) + "</td>";
                logBody.appendChild(tr);
            }
        }

        function drawGauge(id, value, title, range, color) {
            Plotly.newPlot(id, [{
                domain: { x: [0, 1], y: [0, 1] },
                value: value,
                title: { text: title },
                type: "indicator",
                mode: "gauge+number",
                gauge: { axis: { range: range, tickwidth: 1, tickcolor: color }, bar: { color: color } }
            }], {
                margin: { l: 40, r: 40, t: 60, b: 20 },
                height: 260,
                autosize: true
            }, { responsive: true, displayModeBar: false, displaylogo: false });
        }

        function drawLine(id, x, y, title) {
            Plotly.newPlot(id, [{ x: x, y: y, mode: "lines+markers" }], {
                title: { text: title },
                margin: { l: 40, r: 20, t: 40, b: 60 },
                height: 260,
                xaxis: { tickangle: -45 }
            }, { responsive: true, displayModeBar: false, displaylogo: false });
        }

        function fillGauges(forecast, city, region) {
            const list = forecast.list || [];
            let maxTemp = -Infinity;
            let maxHum = -Infinity;
            let maxPres = -Infinity;
            for (let i = 0; i < list.length; i++) {
                if (list[i].main.temp > maxTemp) maxTemp = list[i].main.temp;
                if (list[i].main.humidity > maxHum) maxHum = list[i].main.humidity;
                if (list[i].main.pressure > maxPres) maxPres = list[i].main.pressure;
            }
            const title = document.querySelector(".card-gauges-title");
            if (title) title.textContent = "Weather extremes for " + region + ", " + city + " within next 5 days";
            drawGauge("gaugeTemp", maxTemp, "Max Temp (C)", [-20, 50], "darkblue");
            drawGauge("gaugeHumidity", maxHum, "Max Humidity (%)", [0, 100], "darkred");
            drawGauge("gaugePressure", maxPres, "Max Pressure (hPa)", [900, 1100], "darkgreen");
        }

        function fillGaugesGraphs(forecast, city, region) {
            const list = forecast.list || [];
            const title = document.querySelector(".card-gauges-graphs");
            if (title) title.textContent = "Weather Forecast for " + region + ", " + city;
            const times = [];
            const temps = [];
            const hums = [];
            const pres = [];
            for (let i = 0; i < list.length; i++) {
                times.push(list[i].dt_txt);
                temps.push(list[i].main.temp);
                hums.push(list[i].main.humidity);
                pres.push(list[i].main.pressure);
            }
            drawLine("chartTemp", times, temps, " Temperature (C)");
            drawLine("chartHumidity", times, hums, " Humidity (%)");
            drawLine("chartPressure", times, pres, " Pressure (hPa)");
        }

        function loadCountryCityData() {
            fetchJSON(COUNTRIES_API_URL, { method: "GET", headers: { Accept: "application/json" } })
                .then(function (payload) {
                    countriesData = Array.isArray(payload.data) ? payload.data : [];
                    countriesData.sort(function (a, b) { return a.country.localeCompare(b.country); });
                    fillCountryOptions(countriesData);
                    resetCityOptions();
                })
                .catch(function () {
                    clearResultsUI();
                    cityError.textContent = "Could not load countries.";
                });
        }

        countrySelect.addEventListener("change", function () {
            fillCityOptionsForCountry(countrySelect.value);
        });

        searchBtn.addEventListener("click", function () {
            if (!validateForm()) return;
            const region = regionInput.value.trim();
            const city = citySelect.value;
            const country = countrySelect.value || "Cyprus";
            const payload = { username: USERNAME, region: region, city: city, country: country };
            // pushLocalLog(payload);
            // postRequestLog(payload);

            fetchNominatim(region, city, country)
                .then(function (coords) {
                    return Promise.all([
                        fetchCurrentWeather(coords.lat, coords.lon),
                        fetchForecast(coords.lat, coords.lon),
                        fetchAirQuality(city)
                    ]).then(function (all) {
                        return { current: all[0], forecast: all[1], aq: all[2], lat: coords.lat, lon: coords.lon };
                    });
                })
                .then(function (pack) {
                    fillCurrentWeather(pack.current);
                    fillNext24Table(pack.forecast);
                    setText("currentLocation", na(pack.forecast && pack.forecast.city ? pack.forecast.city.name : pack.current.name));
                    setCurrentRangeFromForecast(pack.forecast);
                    fillAirQuality(pack.aq, region, city);
                    showResults(true);
                    //toggleRightNowExtras(true);
                    pushLocalLog(payload);
                    postRequestLog(payload);
                    toggleRightNowExtras(true);
                    renderMap(pack.lat, pack.lon);
                    fillGauges(pack.forecast, city, region);
                    fillGaugesGraphs(pack.forecast, city, region);
                })
                .catch(function (err) {
                    clearResultsUI();
                    if (String(err && err.message).includes("NO_RESULT")) {
                        alert("No result for that location.");
                        regionInput.value = "";
                    } else {
                        cityError.textContent = err.message;
                    }
                });
        });
        const searchForm = document.getElementById("searchForm");
        if (searchForm) {
            searchForm.addEventListener("submit", function (e) {
                e.preventDefault();
                searchBtn.click();
            });
        }

        clearBtn.addEventListener("click", function () {
            regionInput.value = "";
            countrySelect.selectedIndex = 0;
            resetCityOptions();
            clearValidationErrors();
            clearResultsUI();
            toggleRightNowExtras(true);
        });

        logBtn.addEventListener("click", function () {
            const logModal = document.getElementById("logModal");
            if (!logModal) return;

            getLastLogs()
                .then(function (rows) {
                    renderLogs(rows);
                    bootstrap.Modal.getOrCreateInstance(logModal).show();
                })
                .catch(function () {
                    renderLogs(localLogs);
                    bootstrap.Modal.getOrCreateInstance(logModal).show();
                });
        });

        next24Body.addEventListener("click", function (event) {
            const btn = event.target.closest(".view-forecast-btn");
            if (!btn) return;
            openForecastModal(Number(btn.getAttribute("data-index")));
        });

        const rightNowBtn = document.querySelector('button[data-bs-target="#rightNowTab"]');
        const next24Btn = document.querySelector('button[data-bs-target="#next24Tab"]');
        if (rightNowBtn) {
            rightNowBtn.addEventListener("shown.bs.tab", function () {
                toggleRightNowExtras(true);
                if (mapInstance) mapInstance.updateSize();
                if (window.Plotly) {
                    Plotly.Plots.resize("gaugeTemp");
                    Plotly.Plots.resize("gaugeHumidity");
                    Plotly.Plots.resize("gaugePressure");
                    Plotly.Plots.resize("chartTemp");
                    Plotly.Plots.resize("chartHumidity");
                    Plotly.Plots.resize("chartPressure");
                }
            });
        }
        if (next24Btn) {
            next24Btn.addEventListener("shown.bs.tab", function () {
                toggleRightNowExtras(true);
            });
        }

        loadCountryCityData();
        resetCityOptions();
        clearDisplayedData();
        toggleRightNowExtras(true);
    }
});
