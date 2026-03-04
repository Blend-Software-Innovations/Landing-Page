#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
  if [ "${SKIP_SEED:-0}" != "1" ]; then
    echo "Running prisma db seed..."
    npx prisma db seed || echo "Seed skipped"
  fi
fi

exec "$@"
