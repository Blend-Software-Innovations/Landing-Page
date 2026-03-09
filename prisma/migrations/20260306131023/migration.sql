-- DropIndex
DROP INDEX "Order_utmCampaign_idx";

-- DropIndex
DROP INDEX "Order_utmSource_idx";

-- AlterTable
ALTER TABLE "AbandonedCheckout" ALTER COLUMN "lastNotifiedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
