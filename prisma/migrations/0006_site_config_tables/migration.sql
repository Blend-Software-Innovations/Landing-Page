-- Site config storage
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

-- Analytics events
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
