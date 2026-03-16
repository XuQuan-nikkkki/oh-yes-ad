-- CreateTable
CREATE TABLE "VendorBusinessTypeOption" (
  "vendorId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  CONSTRAINT "VendorBusinessTypeOption_pkey" PRIMARY KEY ("vendorId", "optionId")
);

-- CreateIndex
CREATE INDEX "VendorBusinessTypeOption_optionId_idx" ON "VendorBusinessTypeOption"("optionId");

-- Backfill from legacy single-select relation
INSERT INTO "VendorBusinessTypeOption" ("vendorId", "optionId")
SELECT "id", "businessTypeOptionId"
FROM "Vendor"
WHERE "businessTypeOptionId" IS NOT NULL
ON CONFLICT ("vendorId", "optionId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "VendorBusinessTypeOption"
ADD CONSTRAINT "VendorBusinessTypeOption_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBusinessTypeOption"
ADD CONSTRAINT "VendorBusinessTypeOption_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "SelectOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
