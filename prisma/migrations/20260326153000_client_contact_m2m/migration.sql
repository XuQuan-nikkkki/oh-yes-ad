-- CreateTable
CREATE TABLE "ClientContactClient" (
  "clientId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientContactClient_pkey" PRIMARY KEY ("clientId","contactId")
);

-- Backfill from legacy one-to-many relation
INSERT INTO "ClientContactClient" ("clientId", "contactId", "order", "createdAt")
SELECT "clientId", "id", "order", CURRENT_TIMESTAMP
FROM "ClientContact"
WHERE "clientId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ClientContactClient_clientId_order_idx" ON "ClientContactClient"("clientId", "order");

-- CreateIndex
CREATE INDEX "ClientContactClient_contactId_idx" ON "ClientContactClient"("contactId");

-- AddForeignKey
ALTER TABLE "ClientContactClient"
ADD CONSTRAINT "ClientContactClient_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactClient"
ADD CONSTRAINT "ClientContactClient_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "ClientContact"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex
DROP INDEX IF EXISTS "ClientContact_clientId_order_idx";

-- AlterTable
ALTER TABLE "ClientContact"
DROP COLUMN "clientId",
DROP COLUMN "order";
