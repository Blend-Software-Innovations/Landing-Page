#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Database backup script — pen-landing
# Usage:
#   DATABASE_URL=postgresql://... bash scripts/backup.sh
#   Or: set DATABASE_URL in your environment and run directly.
# The script writes a compressed .sql.gz file to ./backups/
# ---------------------------------------------------------------------------
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="pen_db_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting pg_dump → $FILEPATH"
pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"
echo "[backup] Done: $FILEPATH ($(du -sh "$FILEPATH" | cut -f1))"

# Optional: keep only the last N backups
KEEP="${KEEP_BACKUPS:-30}"
ls -1t "${BACKUP_DIR}"/pen_db_*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "[backup] Retention: kept last $KEEP backups."
