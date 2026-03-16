-- Introduce milestone date range and precision semantics
CREATE TYPE "MilestoneDatePrecision" AS ENUM ('DATE', 'DATETIME');

ALTER TABLE "ProjectMilestone"
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "endAt" TIMESTAMP(3),
ADD COLUMN "datePrecision" "MilestoneDatePrecision" NOT NULL DEFAULT 'DATE';

-- Backfill from legacy single datetime column
UPDATE "ProjectMilestone"
SET "startAt" = "date"
WHERE "date" IS NOT NULL;

-- Drop legacy column after backfill
ALTER TABLE "ProjectMilestone"
DROP COLUMN "date";
