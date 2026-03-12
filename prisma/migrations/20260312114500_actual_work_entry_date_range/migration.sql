ALTER TABLE "ActualWorkEntry"
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "endDate" TIMESTAMP(3);

UPDATE "ActualWorkEntry"
SET "startDate" = "date",
    "endDate" = "date";

ALTER TABLE "ActualWorkEntry"
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL;

DROP INDEX IF EXISTS "ActualWorkEntry_date_idx";

ALTER TABLE "ActualWorkEntry"
DROP COLUMN "date";

CREATE INDEX "ActualWorkEntry_startDate_idx" ON "ActualWorkEntry"("startDate");
