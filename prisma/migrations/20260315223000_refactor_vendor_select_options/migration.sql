-- AlterTable
ALTER TABLE "Vendor"
ADD COLUMN "vendorTypeOptionId" TEXT,
ADD COLUMN "businessTypeOptionId" TEXT,
ADD COLUMN "cooperationStatusOptionId" TEXT,
ADD COLUMN "ratingOptionId" TEXT;

-- CreateTable
CREATE TABLE "VendorServiceOption" (
    "vendorId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "VendorServiceOption_pkey" PRIMARY KEY ("vendorId","optionId")
);

-- CreateIndex
CREATE INDEX "Vendor_vendorTypeOptionId_idx" ON "Vendor"("vendorTypeOptionId");

-- CreateIndex
CREATE INDEX "Vendor_businessTypeOptionId_idx" ON "Vendor"("businessTypeOptionId");

-- CreateIndex
CREATE INDEX "Vendor_cooperationStatusOptionId_idx" ON "Vendor"("cooperationStatusOptionId");

-- CreateIndex
CREATE INDEX "Vendor_ratingOptionId_idx" ON "Vendor"("ratingOptionId");

-- CreateIndex
CREATE INDEX "VendorServiceOption_optionId_idx" ON "VendorServiceOption"("optionId");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_vendorTypeOptionId_fkey" FOREIGN KEY ("vendorTypeOptionId") REFERENCES "SelectOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_businessTypeOptionId_fkey" FOREIGN KEY ("businessTypeOptionId") REFERENCES "SelectOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_cooperationStatusOptionId_fkey" FOREIGN KEY ("cooperationStatusOptionId") REFERENCES "SelectOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_ratingOptionId_fkey" FOREIGN KEY ("ratingOptionId") REFERENCES "SelectOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceOption" ADD CONSTRAINT "VendorServiceOption_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceOption" ADD CONSTRAINT "VendorServiceOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SelectOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old value columns after relation backfill strategy switched to migrate-notion runtime upsert.
ALTER TABLE "Vendor"
DROP COLUMN "vendorType",
DROP COLUMN "businessType",
DROP COLUMN "services",
DROP COLUMN "cooperationStatus",
DROP COLUMN "rating";
