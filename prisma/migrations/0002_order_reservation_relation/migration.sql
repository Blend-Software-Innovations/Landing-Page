-- Add reservation relation + inventory hold FK
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reservationId" TEXT;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Order_reservationId_key" ON "Order"("reservationId");
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "InventoryHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
