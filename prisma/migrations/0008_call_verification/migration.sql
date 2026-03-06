ALTER TABLE "Order"
  ADD COLUMN "callStatus" TEXT,
  ADD COLUMN "callNotes" TEXT,
  ADD COLUMN "callVerifiedAt" TIMESTAMP;

CREATE INDEX "Order_callStatus_idx" ON "Order"("callStatus");
