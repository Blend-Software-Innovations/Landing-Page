-- Create enums
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'DIGITAL');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELED', 'RETURNED');
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'COD', 'BKASH', 'NAGAD', 'ROCKET', 'MANUAL');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'REFUNDED');

-- Admin users
CREATE TABLE "AdminUser" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'OWNER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" "ProductType" NOT NULL DEFAULT 'PHYSICAL',
  "category" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "sku" TEXT UNIQUE,
  "barcode" TEXT,
  "basePrice" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Variant" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "size" TEXT,
  "color" TEXT,
  "option" TEXT,
  "price" INTEGER NOT NULL,
  "stockQty" INTEGER NOT NULL,
  "weight" INTEGER,
  "sku" TEXT UNIQUE,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");
CREATE INDEX "Variant_sku_idx" ON "Variant"("sku");

-- Landing pages
CREATE TABLE "LandingPage" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Templates
CREATE TABLE "Template" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "area" TEXT,
  "total" INTEGER NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "transactionId" TEXT,
  "reservationId" TEXT,
  "shippingPartner" TEXT,
  "trackingCode" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL
);

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- Inventory holds
CREATE TABLE "InventoryHold" (
  "id" TEXT PRIMARY KEY,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL
);

CREATE INDEX "InventoryHold_variantId_idx" ON "InventoryHold"("variantId");
CREATE INDEX "InventoryHold_expiresAt_idx" ON "InventoryHold"("expiresAt");

-- Audit log
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actor" TEXT,
  "role" TEXT,
  "action" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");


