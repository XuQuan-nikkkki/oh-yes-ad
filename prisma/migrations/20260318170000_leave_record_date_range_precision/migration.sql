-- Introduce leave-record date precision/range semantics (DMID)
CREATE TYPE "LeaveRecordDatePrecision" AS ENUM ('DATE', 'DATETIME');

ALTER TABLE "LeaveRecord"
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "endAt" TIMESTAMP(3),
ADD COLUMN "datePrecision" "LeaveRecordDatePrecision" NOT NULL DEFAULT 'DATE';

UPDATE "LeaveRecord"
SET
  "startAt" = "startDate",
  "endAt" = CASE
    WHEN "endDate" = "startDate" THEN NULL
    ELSE "endDate"
  END;

ALTER TABLE "LeaveRecord"
ALTER COLUMN "startAt" SET NOT NULL;

ALTER TABLE "LeaveRecord"
DROP COLUMN "startDate",
DROP COLUMN "endDate";

CREATE INDEX "LeaveRecord_employeeId_startAt_idx" ON "LeaveRecord"("employeeId", "startAt");
