ALTER TABLE "ClientContact"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1000;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "ClientContact"
)
UPDATE "ClientContact" c
SET "order" = ranked.rn * 1000
FROM ranked
WHERE c.id = ranked.id;

CREATE INDEX "ClientContact_clientId_order_idx"
ON "ClientContact"("clientId", "order");
