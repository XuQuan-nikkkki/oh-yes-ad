-- CreateTable
CREATE TABLE "SelectOption" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectOption_pkey" PRIMARY KEY ("id")
);

-- Add nullable relation column first (seed will backfill it)
ALTER TABLE "Client" ADD COLUMN "industryOptionId" TEXT;

-- Indexes and constraints
CREATE UNIQUE INDEX "SelectOption_field_value_key" ON "SelectOption"("field", "value");
CREATE INDEX "SelectOption_field_order_idx" ON "SelectOption"("field", "order");
CREATE INDEX "Client_industryOptionId_idx" ON "Client"("industryOptionId");

ALTER TABLE "Client" ADD CONSTRAINT "Client_industryOptionId_fkey"
FOREIGN KEY ("industryOptionId") REFERENCES "SelectOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
