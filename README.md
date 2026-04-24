# Weather Forecasting Dashboard

A web-based weather dashboard built for coursework, featuring authentication, current conditions, 24-hour forecast visualization, map overlays, and request logging.

## Tech Stack
- Frontend: HTML, CSS (Bootstrap), JavaScript
- Backend: PHP
- Data/API: OpenWeather API, WAQI API, Countries API
- Storage: MySQL (remote university DB in original coursework setup)

## Project Structure
- `index.html` - Main dashboard UI
- `assets/css/` - Stylesheets
- `assets/js/` - Frontend logic
- `assets/images/` - Static images
- `backend/php/` - Authentication and API endpoints
- `data/` - Supporting static JSON data
- `docs/` - Coursework document(s)

## Run Locally
1. Use a local PHP server (XAMPP/WAMP or `php -S`).
2. Open `index.html` through the server.
3. Ensure backend endpoints in `backend/php/` can access a valid MySQL database.

## Notes
- The original coursework used university-hosted database credentials.
- Replace hardcoded API keys and DB credentials before public deployment.


## Deployment Config
- Copy ackend/php/config.example.php to ackend/php/config.php and fill database credentials.
- Set API keys in ssets/js/script.js (OPENWEATHER_KEY, WAQI_TOKEN).

