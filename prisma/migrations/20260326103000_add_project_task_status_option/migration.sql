-- Create task status options
INSERT INTO "SelectOption" ("id", "field", "value", "color", "order", "createdAt")
SELECT gen_random_uuid(), 'projectTask.status', seeded.value, seeded.color, seeded."order", NOW()
FROM (
  VALUES
    ('待推进', '#d9d9d9', 1),
    ('进行中', '#1677ff', 2),
    ('已完成', '#52c41a', 3),
    ('暂停', '#faad14', 4)
) AS seeded(value, color, "order")
WHERE NOT EXISTS (
  SELECT 1
  FROM "SelectOption" existing
  WHERE existing."field" = 'projectTask.status'
    AND existing."value" = seeded.value
);

-- AlterTable
ALTER TABLE "ProjectTask"
ADD COLUMN "statusOptionId" TEXT;

-- Backfill existing tasks to default status
UPDATE "ProjectTask"
SET "statusOptionId" = default_status."id"
FROM "SelectOption" AS default_status
WHERE default_status."field" = 'projectTask.status'
  AND default_status."value" = '待推进'
  AND "ProjectTask"."statusOptionId" IS NULL;

-- Make status required after backfill
ALTER TABLE "ProjectTask"
ALTER COLUMN "statusOptionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectTask_statusOptionId_idx" ON "ProjectTask"("statusOptionId");

-- AddForeignKey
ALTER TABLE "ProjectTask"
ADD CONSTRAINT "ProjectTask_statusOptionId_fkey"
FOREIGN KEY ("statusOptionId") REFERENCES "SelectOption"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
