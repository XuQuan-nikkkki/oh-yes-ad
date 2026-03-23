-- CreateEnum
CREATE TYPE "ProjectCostEstimationType" AS ENUM ('planning', 'baseline');

-- AlterTable
ALTER TABLE "ProjectCostEstimation"
ADD COLUMN "type" "ProjectCostEstimationType" NOT NULL DEFAULT 'planning';

-- Backfill from legacy boolean flag
UPDATE "ProjectCostEstimation"
SET "type" = 'baseline'
WHERE "isFinal" = true;

-- Drop old index + column
DROP INDEX IF EXISTS "ProjectCostEstimation_projectId_isFinal_idx";
ALTER TABLE "ProjectCostEstimation" DROP COLUMN "isFinal";

-- CreateIndex
CREATE INDEX "ProjectCostEstimation_projectId_type_idx"
ON "ProjectCostEstimation"("projectId", "type");
