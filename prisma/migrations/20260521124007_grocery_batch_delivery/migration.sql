-- AlterTable
ALTER TABLE "InventoryHold" ADD COLUMN     "batchAllocations" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryArea" TEXT,
ADD COLUMN     "deliverySlot" TEXT;

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Batch_variantId_expiryDate_idx" ON "Batch"("variantId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_variantId_batchNo_key" ON "Batch"("variantId", "batchNo");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
