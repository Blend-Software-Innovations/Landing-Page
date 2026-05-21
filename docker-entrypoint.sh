#!/bin/sh
set -e

# Migrations are NOT run on every instance start by default. On platforms that scale to
# multiple instances (e.g. DigitalOcean App Platform) running migrate per-instance races.
# Run migrations once in a dedicated pre-deploy job instead (see .do/app.yaml).
# For local docker-compose, set RUN_MIGRATIONS=1 so a single app container migrates on boot.
if [ "${RUN_MIGRATIONS:-0}" = "1" ] && [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
  if [ "${SKIP_SEED:-0}" != "1" ]; then
    echo "Running prisma db seed..."
    npx prisma db seed || echo "Seed skipped"
  fi
fi

exec "$@"
