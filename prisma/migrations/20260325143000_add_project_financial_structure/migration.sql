-- CreateTable
CREATE TABLE "ProjectFinancialStructure" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "middleOfficeCost" DOUBLE PRECISION NOT NULL,
    "outsourceCost" DOUBLE PRECISION NOT NULL,
    "executionCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFinancialStructure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFinancialStructure_estimationId_key" ON "ProjectFinancialStructure"("estimationId");

-- CreateIndex
CREATE INDEX "ProjectFinancialStructure_projectId_idx" ON "ProjectFinancialStructure"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectFinancialStructure" ADD CONSTRAINT "ProjectFinancialStructure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinancialStructure" ADD CONSTRAINT "ProjectFinancialStructure_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "ProjectCostEstimation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
