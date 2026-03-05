-- DropForeignKey
ALTER TABLE "InventoryHold" DROP CONSTRAINT "InventoryHold_variantId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_productId_fkey";

-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InventoryHold" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LandingPage" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "confirmedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "packedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "shippedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deliveredAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "canceledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "returnedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Template" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Variant" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
