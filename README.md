# Weather Forecasting Dashboard

A coursework web application that provides weather search, 24-hour forecast, map overlays, and basic user authentication/logging.

## Tech Stack
- Frontend: HTML, CSS (Bootstrap), JavaScript
- Backend: PHP
- Database: MySQL
- External APIs: OpenWeather, WAQI, Countries API

## Project Structure
- `index.html` - Main dashboard UI
- `assets/` - CSS, JavaScript, images
- `backend/php/` - Authentication and backend endpoints
- `data/` - Static support data

## How It Works (Brief)
1. Users authenticate through PHP endpoints.
2. Frontend requests current/forecast weather data and renders charts/map/cards.
3. Backend stores and returns recent request history per user.

## Local/Hosting Setup
- Configure DB credentials in `backend/php/config.php`.
- Configure API keys in `assets/js/script.js`.
- Serve with a PHP-capable host (e.g., InfinityFree/XAMPP).

## Security Note
This repository intentionally does **not** include real credentials or API keys.
- `backend/php/config.php` is not fully committed.
- API keys are left empty in source.

Use `backend/php/config.example.php` as the template.
