ALTER TABLE "DeliverableAssignmentHistory" RENAME TO "DeliverableAssignmentChange";

ALTER TABLE "DeliverableAssignmentChange"
  RENAME COLUMN "assigneeId" TO "toAssigneeId";
ALTER TABLE "DeliverableAssignmentChange"
  RENAME COLUMN "assignedById" TO "changedById";
ALTER TABLE "DeliverableAssignmentChange"
  RENAME COLUMN "assignedAt" TO "changedAt";
ALTER TABLE "DeliverableAssignmentChange"
  RENAME COLUMN "changeReason" TO "remarks";

ALTER TABLE "DeliverableAssignmentChange"
  ADD COLUMN "fromAssigneeId" TEXT;

WITH ordered_changes AS (
  SELECT
    "id",
    LAG("toAssigneeId") OVER (
      PARTITION BY "deliverableId"
      ORDER BY "changedAt", "id"
    ) AS "previousAssigneeId"
  FROM "DeliverableAssignmentChange"
)
UPDATE "DeliverableAssignmentChange" AS assignment_change
SET "fromAssigneeId" = ordered_changes."previousAssigneeId"
FROM ordered_changes
WHERE assignment_change."id" = ordered_changes."id";

ALTER TABLE "DeliverableAssignmentChange" DROP COLUMN "endedAt";

ALTER TABLE "DeliverableAssignmentChange"
  ADD CONSTRAINT "DeliverableAssignmentChange_fromAssigneeId_fkey"
  FOREIGN KEY ("fromAssigneeId") REFERENCES "Employee"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliverableAssignmentChange"
  RENAME CONSTRAINT "DeliverableAssignmentHistory_pkey"
  TO "DeliverableAssignmentChange_pkey";
ALTER INDEX "DeliverableAssignmentHistory_deliverableId_idx"
  RENAME TO "DeliverableAssignmentChange_deliverableId_changedAt_idx";
ALTER INDEX "DeliverableAssignmentHistory_assigneeId_idx"
  RENAME TO "DeliverableAssignmentChange_toAssigneeId_idx";
ALTER INDEX "DeliverableAssignmentHistory_assignedById_idx"
  RENAME TO "DeliverableAssignmentChange_changedById_idx";

DROP INDEX "DeliverableAssignmentChange_deliverableId_changedAt_idx";
CREATE INDEX "DeliverableAssignmentChange_deliverableId_changedAt_idx"
  ON "DeliverableAssignmentChange"("deliverableId", "changedAt");
CREATE INDEX "DeliverableAssignmentChange_fromAssigneeId_idx"
  ON "DeliverableAssignmentChange"("fromAssigneeId");

ALTER TABLE "DeliverableAssignmentChange"
  RENAME CONSTRAINT "DeliverableAssignmentHistory_deliverableId_fkey"
  TO "DeliverableAssignmentChange_deliverableId_fkey";
ALTER TABLE "DeliverableAssignmentChange"
  RENAME CONSTRAINT "DeliverableAssignmentHistory_assigneeId_fkey"
  TO "DeliverableAssignmentChange_toAssigneeId_fkey";
ALTER TABLE "DeliverableAssignmentChange"
  RENAME CONSTRAINT "DeliverableAssignmentHistory_assignedById_fkey"
  TO "DeliverableAssignmentChange_changedById_fkey";
