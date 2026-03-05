-- Add manual payment review fields
CREATE TYPE "ManualPaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "Order"
ADD COLUMN "manualStatus" "ManualPaymentStatus",
ADD COLUMN "manualProofUrl" TEXT,
ADD COLUMN "manualSubmittedAt" TIMESTAMP(3),
ADD COLUMN "manualReviewedAt" TIMESTAMP(3),
ADD COLUMN "manualReviewNote" TEXT;
