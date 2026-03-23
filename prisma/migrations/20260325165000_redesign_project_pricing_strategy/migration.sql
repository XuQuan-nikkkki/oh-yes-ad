CREATE TYPE "ProjectPricingStrategyMode" AS ENUM ('range', 'target');

ALTER TABLE "ProjectPricingStrategy"
ADD COLUMN "mode" "ProjectPricingStrategyMode" NOT NULL DEFAULT 'range',
ADD COLUMN "rentCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "ProjectPricingStrategy"
RENAME COLUMN "redundantLaborCost" TO "suggestedLaborCost";

ALTER TABLE "ProjectPricingStrategy"
RENAME COLUMN "redundantMiddleOfficeCost" TO "suggestedMiddleOfficeCost";

ALTER TABLE "ProjectPricingStrategy"
DROP COLUMN "suggestedPlannedLaborCost",
DROP COLUMN "suggestedPlannedExecutionCost",
DROP COLUMN "redundantExecutionCost";

UPDATE "ProjectPricingStrategy"
SET "plannedExecutionCost" = 0
WHERE "plannedExecutionCost" IS NULL;

ALTER TABLE "ProjectPricingStrategy"
ALTER COLUMN "plannedExecutionCost" SET NOT NULL;
