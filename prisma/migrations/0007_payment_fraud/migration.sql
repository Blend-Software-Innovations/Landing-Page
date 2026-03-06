-- Add payment link + fraud fields to Order
ALTER TABLE "Order"
  ADD COLUMN "paymentProvider" TEXT,
  ADD COLUMN "paymentLink" TEXT,
  ADD COLUMN "paidAmount" INTEGER,
  ADD COLUMN "deviceFingerprint" TEXT,
  ADD COLUMN "fraudFlags" JSONB,
  ADD COLUMN "fraudScore" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Order_phone_idx" ON "Order"("phone");
CREATE INDEX "Order_deviceFingerprint_idx" ON "Order"("deviceFingerprint");
