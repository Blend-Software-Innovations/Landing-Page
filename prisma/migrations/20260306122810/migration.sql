-- DropIndex
DROP INDEX "Order_callStatus_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "callVerifiedAt" SET DATA TYPE TIMESTAMP(3);
