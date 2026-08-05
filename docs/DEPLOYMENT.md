# Deployment Guide

## Live deployment

The production app runs on **DigitalOcean App Platform** as `blend-landing`, built with the
Node buildpack (not the Dockerfile) from the GitHub repo
`Blend-Software-Innovations/Landing-Page`, branch `main`, with `deploy_on_push: true`.

The App Platform **dashboard is the source of truth** for the running app.
`.do/app.yaml` documents the intended configuration and the full env-var checklist; apply it
with `doctl apps update <APP_ID> --spec .do/app.yaml`.

Because pushes to `main` deploy automatically, `.github/workflows/ci.yml` is the only gate
between a commit and production. It type-checks, validates the Prisma schema, applies
migrations against a throwaway Postgres, runs the tests and builds. Do not disable it.

## Required environment variables

Blank is not the same as unset for some variables, but the schema in `lib/env.ts` now
coerces empty strings to `undefined`, so a variable left blank in the dashboard degrades
instead of crashing the app at import time.

Genuinely required in production:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | All durable state. `/api/health` returns 503 in production without it. |
| `DATABASE_CA_CERT` | TLS verification for the managed Postgres. |
| `AUTH_JWT_SECRET` / `AUTH_REFRESH_SECRET` | Admin sessions, and the HMAC that signs inventory holds. Min 16 chars. |
| `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` | Seeds the owner account. Password min 8 chars. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, OG tags, sitemap. Dropped tags when unset. |
| `TRUSTED_PROXY_HOPS` | Client-IP derivation for rate limiting. **2** behind App Platform + Cloudflare. |

Name mismatches to watch for (the live app has historically had the wrong ones):

- SMS/OTP: **resolved, no longer a mismatch.** The code accepts Twilio's own names
  (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER`) and falls back to
  the legacy `TWILIO_SID` / `TWILIO_AUTH` / `TWILIO_PHONE`. Prefer the official names.
  Before this, the code read only the short names while the deployed app was configured
  with the official ones, so the client was never constructed and every OTP and order
  confirmation SMS silently failed to send.
- Object storage: the code reads `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` (plus optional `S3_ENDPOINT`, `S3_PUBLIC_URL`) — **not** `AWS_*` or
  `S3_BUCKET_NAME`. Uploads silently fall back to the container filesystem (wiped on every
  deploy) if neither Cloudinary nor a correctly-named S3 config is present.

Client-visible variables (`NEXT_PUBLIC_*`, including `NEXT_PUBLIC_SENTRY_DSN`) must be scoped
`BUILD_TIME` or `RUN_AND_BUILD_TIME`, or they are `undefined` in the browser bundle.

## Migrations

`npm start` is `prisma migrate deploy && next start`, so migrations run on every container
start. This is safe **only at `instance_count: 1`** — multiple instances would race each other.
Before scaling out, move `prisma migrate deploy` into a dedicated `PRE_DEPLOY` job and reduce
`start` to `next start`.

A failing migration means the container never reaches `next start`, the health check fails,
and the deploy rolls back. That is the intended behaviour: a schema mismatch should fail
closed, not serve traffic.

`site_config`, `site_config_audit` and `analytics_events` are read through raw SQL but are
**declared in `schema.prisma`** (mapped to their snake_case names). Keep them there: when they
were missing, `prisma migrate dev` treated them as drift and generated a `DROP` that destroyed
the live site configuration.

## Health check

`GET /api/health` returns 200 with `{checks: {db: "ok"}}` when Postgres is reachable, and 503
when the query fails **or** when `DATABASE_URL` is missing in production.

## Scaling checklist

Before raising `instance_count` above 1:

1. Set `REDIS_URL`. Without it, rate limiting is per-instance in-memory, so every limit
   effectively multiplies by the instance count.
2. Move migrations to a `PRE_DEPLOY` job (see above).
3. Confirm uploads go to Cloudinary or S3 — the local-filesystem fallback is per-instance and
   ephemeral.

## Error tracking

`instrumentation.ts` registers the Sentry server/edge SDKs and `instrumentation-client.ts`
the browser SDK; without those hooks Next.js never loads `sentry.*.config.ts`. Source-map
upload additionally needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` at build time.

## Local development

```bash
cp .env.example .env.local        # fill in DATABASE_URL + AUTH_* secrets
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                       # http://localhost:3000
```

Docker (local stack, not a production template):

```bash
docker compose up --build
```

`docker-compose.yml` requires `AUTH_JWT_SECRET`, `AUTH_REFRESH_SECRET` and
`AUTH_ADMIN_PASSWORD` to be present in your environment — it deliberately ships no defaults so
the stack cannot boot with a publicly-known signing key.

## Related docs

- `docs/SECURITY.md` — invariants for pricing, payments, uploads, rate limiting, admin roles.
- `docs/DB_MIGRATIONS.md` — migration history and the two naming schemes in use.
