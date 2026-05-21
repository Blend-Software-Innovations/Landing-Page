-- Re-create the raw snake_case tables used by lib/siteConfig.server.ts, lib/audit.ts and
-- lib/analytics.ts. These were created by 0006_site_config_tables but later DROPPED by
-- 20260305193050_init (a `prisma migrate dev` that treated them as drift). On a fresh database
-- the lexicographic apply order runs the DROP after the CREATE, so the tables end up missing,
-- causing "relation \"site_config\" does not exist". This migration runs last and restores them.
-- All statements are idempotent so existing databases are unaffected.

CREATE TABLE IF NOT EXISTS "site_config" (
  "id" TEXT PRIMARY KEY,
  "data" JSONB NOT NULL,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "site_config_audit" (
  "id" TEXT PRIMARY KEY,
  "config_id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "actor" TEXT,
  "role" TEXT,
  "ip" TEXT,
  "note" TEXT,
  "data" JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS "site_config_audit_config_id_idx" ON "site_config_audit"("config_id");
CREATE INDEX IF NOT EXISTS "site_config_audit_created_at_idx" ON "site_config_audit"("created_at");

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" TEXT PRIMARY KEY,
  "event_name" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT
);

CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events"("created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_event_name_idx" ON "analytics_events"("event_name");
