# Neighbour Renting

A peer-to-peer neighbourhood rental platform built with Laravel and Vue 3.

## Tech Stack

- **Backend**: Laravel API, MySQL, Sanctum auth (SPA cookie + token fallback)
- **Frontend**: Vue 3 SPA (inertia), Tailwind CSS, Vue Router, Pinia stores
- **Queues & Cache**: Database driver

## Setup

```bash
# Backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed

# Frontend
cd frontend
npm install
npm run build
```

## Development

```bash
# Terminal 1 — Backend
php artisan serve

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The frontend dev server proxies API calls to `http://localhost:8000/api`.
