# Nexum Global Solutions — API (Phase 1)

PHP backend for the Nexum website. Phase 1 scaffolds the API, loads configuration, and provides a single health-check endpoint that verifies connectivity to MongoDB Atlas.

**Phase 1 contains:**
- Front controller with security headers, CORS, structured error responses
- PSR-4 autoloaded source tree under `src/`
- `.env`-driven configuration (same code path in dev and prod)
- MongoDB client (lazy singleton)
- `GET /api/health` — pings MongoDB and lists collections on the configured database

**Phase 1 does not contain:** contact endpoint, emails, Turnstile, rate limiting, admin panel. Those arrive in Phase 2+.

---

## Requirements

- PHP **8.1+**
- PHP extensions: `mongodb`, `openssl`, `json`, `curl`, `mbstring`
- [Composer](https://getcomposer.org/)
- MongoDB Atlas URI for the `nexum_development` database (user `areebaweb`)

Verify extensions are present:

```bash
php -v
php -m | grep -Ei 'mongodb|openssl|json|curl|mbstring'
```

If `mongodb` is missing:
- **Linux / macOS:** `sudo pecl install mongodb` then add `extension=mongodb` to php.ini
- **Windows:** download the matching DLL from https://pecl.php.net/package/mongodb, drop it into the PHP `ext/` folder, and add `extension=mongodb` to `php.ini`

---

## First-time setup

From inside the `api/` directory:

```bash
# 1. Install dependencies
composer install

# 2. Copy the env template
cp .env.example .env

# 3. Open .env and set MONGODB_URI to the connection string from Atlas:
#    Clusters → Connect → Drivers → PHP → version 1.17+
#    Replace <password>, append the database name:
#      ...mongodb.net/nexum_development?retryWrites=true&w=majority
```

The `.env` file is gitignored and must never be committed.

---

## Run locally

```bash
# From inside api/
php -S localhost:8000 -t public
```

Then verify:

```bash
curl -s http://localhost:8000/api/health | jq
```

A successful response looks like:

```json
{
  "ok": true,
  "app": {
    "env": "development",
    "phpVersion": "8.2.x",
    "timestamp": "2026-11-06T…Z"
  },
  "mongo": {
    "connected": true,
    "database": "nexum_development",
    "latencyMs": 180,
    "collections": [],
    "collectionCount": 0
  }
}
```

A failed response (bad URI, wrong password, IP not allowlisted in Atlas, firewall blocking TLS 443 to `*.mongodb.net`) returns HTTP 503 with:

```json
{
  "ok": false,
  "app": { ... },
  "mongo": {
    "connected": false,
    "database": "nexum_development",
    "error": "…details only when APP_DEBUG=true…"
  }
}
```

---

## Project layout

```
api/
├── public/
│   ├── index.php      ← single entry point
│   └── .htaccess      ← rewrites, blocks dotfiles
├── src/
│   ├── Config.php     ← env access
│   ├── Mongo.php      ← MongoDB client (lazy singleton)
│   ├── Router.php     ← method+path dispatcher
│   └── Controllers/
│       └── HealthController.php
├── logs/              ← runtime error logs (gitignored; created on first error)
├── vendor/            ← Composer-managed (gitignored)
├── composer.json
├── .env.example       ← template; copy to .env
├── .env               ← real secrets (gitignored)
├── .gitignore
└── README.md
```

---

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `APP_ENV` | `development` or `production` | `development` |
| `APP_DEBUG` | `true` includes error details in responses | `true` |
| `APP_URL` | Informational; no trailing slash | `http://localhost:8000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allow-list | `http://localhost:8000` |
| `MONGODB_URI` | Atlas connection string with password + database | `mongodb+srv://…/nexum_development?retryWrites=true&w=majority` |
| `MONGODB_DB` | Default database name | `nexum_development` |

Dev and prod switch by swapping env values on the host. No code change.

---

## Security notes (already applied in Phase 1)

- Secrets are in `.env`, never in code; `.env` is in `.gitignore`.
- `.htaccess` denies requests to `.env`, `.ini`, `.log`, `.md`, `.json`, `.lock`.
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. `X-Powered-By` removed.
- CORS uses a strict allow-list (not `*`).
- Error details are hidden unless `APP_DEBUG=true`; stack traces always go to `logs/php-error.log`.
- Only the `public/` directory should be exposed by the webserver. `src/`, `vendor/`, `.env`, and `composer.*` must live above the document root or be unreachable from the web.
