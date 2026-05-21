# pen-landing

A Next.js (Pages Router) cash-on-delivery (COD) e-commerce backend + landing page. Handles
products/variants, inventory holds, orders, OTP phone verification, manual/gateway payments,
fraud checks, abandoned-cart recovery, and an admin panel — backed by PostgreSQL (Prisma).

## Stack

- **Next.js** (Pages Router) + React + TypeScript
- **PostgreSQL** via **Prisma 7** (`@prisma/client` + `@prisma/adapter-pg`)
- **Redis** (optional) for rate limiting — falls back to in-memory when unset
- **Object storage**: DigitalOcean Spaces / S3, or Cloudinary (uploads)
- Stripe, Twilio (SMS/OTP), Sentry, Pino logging

State note: all durable state (admin users, refresh tokens, OTP, audit, analytics, site
config, orders) lives in **Postgres**. The app writes nothing important to the local
filesystem, so it runs statelessly and can scale horizontally.

## Local development

Prerequisites: Node 20+ (Node 22 recommended for Prisma 7), a PostgreSQL 15 instance.

```bash
cp .env.example .env.local        # fill in at least DATABASE_URL + AUTH_* secrets
npm install
npx prisma migrate deploy         # apply migrations
npx prisma db seed                # create the owner admin + sample data
npm run dev                       # http://localhost:3000
```

Or run everything (app + Postgres) in containers:

```bash
docker compose up --build         # app migrates on boot (RUN_MIGRATIONS=1) and seeds
```

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm test` | Vitest (DB-dependent tests auto-skip when `DATABASE_URL` is unset) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | `prisma db seed` |

## Environment variables

See `.env.example` for the full list. Required for a real deployment:

- `DATABASE_URL` — Postgres connection string (`?sslmode=require` on managed DBs)
- `AUTH_JWT_SECRET`, `AUTH_REFRESH_SECRET` — strong random secrets (NOT `change_me`)
- `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD` — seeds the first owner admin

Recommended in production:

- `S3_BUCKET`/`S3_REGION`/`S3_ENDPOINT`/`S3_PUBLIC_URL`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`
  (DigitalOcean Spaces) — otherwise uploads fall back to the local disk, which is **not durable**
  on App Platform.
- `REDIS_URL` — only when running 2+ instances (cross-instance rate limiting).

## Deploying to DigitalOcean App Platform

The live app deploys from the GitHub repo using the **Node buildpack** (`npm run build` /
`npm start`), autodeploy on push. `npm start` is `prisma migrate deploy && next start`, so the
schema is migrated on boot — fine for a single instance. The buildpack runs `prisma generate`
via the `postinstall` script. App Platform's filesystem is ephemeral, so the app is stateless:
all durable state is in Postgres, uploads go to Cloudinary/Spaces.

1. Provision a **FRESH Managed Postgres** (do not reuse the old prototype DB — its raw tables
   would collide with the Prisma migrations). Use its connection string as `DATABASE_URL`.
2. Set the component env vars (see `.do/app.yaml` for the full list). Required and currently
   missing on the live app:
   - `AUTH_JWT_SECRET`, `AUTH_REFRESH_SECRET` — strong random secrets
   - `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD` — seeds the first owner on first login
   - Twilio must be named `TWILIO_SID` / `TWILIO_AUTH` / `TWILIO_PHONE` (not `TWILIO_ACCOUNT_SID`…)
   - `NPM_CONFIG_PRODUCTION=false` (build needs devDependencies)
   - Cloudinary vars already work; the `AWS_*` / `S3_BUCKET_NAME` vars are unused by the code.
3. Push to the repo's `main` → App Platform autodeploys.
4. Verify `https://<app>/api/health` returns `200` (checks DB connectivity; `503` if the
   database is unreachable).

When you scale to 2+ instances, move migrations out of `npm start` into a dedicated
`PRE_DEPLOY` job so only one runner migrates. A `Dockerfile` + `docker-compose.yml` are also
included for a single-VM deploy.

## Project layout

- `pages/` — UI + `pages/api/*` route handlers
- `lib/` — business logic (auth, otp, orders, inventory, uploads, siteConfig, …)
- `prisma/` — schema, migrations, seed
- `tests/` — Vitest suites
- `.do/app.yaml` — DigitalOcean App Platform spec
