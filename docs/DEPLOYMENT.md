# Deployment Guide

## Docker
Build and run with Postgres:
```bash
docker compose up --build
```
App runs at `http://localhost:3000`.

Healthcheck endpoint:
- `GET /api/health`

## CI (GitLab)
Pipeline stages:
- install ? lint ? test ? build

File: `.gitlab-ci.yml`

## Environment Separation
Examples stored in:
- `env/.env.development.example`
- `env/.env.staging.example`
- `env/.env.production.example`

Base template:
- `.env.example`

### Required for Auth
- `AUTH_JWT_SECRET`
- `AUTH_REFRESH_SECRET`

### Database
- `DATABASE_URL`
- `DISABLE_DB=1` (dev mode, fallback to JSON config)

## Migrations
In production, run migrations before start:
```bash
npm run db:generate
npm run db:migrate
```

## Basic Logging
`/api/health` logs each request (timestamp).
Add structured logging in API routes if needed.

## Reverse Proxy (Optional)
Use Nginx or Caddy in front of port 3000 if needed. Not included by default.
