ALTER TABLE "Order"
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT,
  ADD COLUMN "utmContent" TEXT,
  ADD COLUMN "utmTerm" TEXT;

CREATE INDEX "Order_utmCampaign_idx" ON "Order"("utmCampaign");
CREATE INDEX "Order_utmSource_idx" ON "Order"("utmSource");

CREATE TABLE "AbandonedCheckout" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "total" INTEGER,
  "items" JSONB,
  "utm" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notifyCount" INTEGER NOT NULL DEFAULT 0,
  "lastNotifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "AbandonedCheckout_phone_idx" ON "AbandonedCheckout"("phone");
CREATE INDEX "AbandonedCheckout_status_idx" ON "AbandonedCheckout"("status");
CREATE INDEX "AbandonedCheckout_createdAt_idx" ON "AbandonedCheckout"("createdAt");
