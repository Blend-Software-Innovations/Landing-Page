-- Add idempotency key to Order for duplicate-submit prevention
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- Unique index: NULL values are excluded (multiple orders can omit the key)
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
