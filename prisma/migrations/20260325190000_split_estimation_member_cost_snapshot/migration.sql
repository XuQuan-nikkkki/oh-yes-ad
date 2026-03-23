ALTER TABLE "ProjectCostEstimationMember"
ADD COLUMN "laborCostSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "rentCostSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "ProjectCostEstimationMember"
SET
  "laborCostSnapshot" = COALESCE("salarySnapshot", 0),
  "rentCostSnapshot" = 0;

ALTER TABLE "ProjectCostEstimationMember"
DROP COLUMN "salarySnapshot";
