-- CreateTable
CREATE TABLE "ProjectFinancialStructureExecutionCostItem" (
    "id" TEXT NOT NULL,
    "financialStructureId" TEXT NOT NULL,
    "costTypeOptionId" TEXT NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFinancialStructureExecutionCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFinancialStructureExecutionCostItem_financialStructureId_costTypeOptionId_key" ON "ProjectFinancialStructureExecutionCostItem"("financialStructureId", "costTypeOptionId");

-- CreateIndex
CREATE INDEX "ProjectFinancialStructureExecutionCostItem_financialStructureId_idx" ON "ProjectFinancialStructureExecutionCostItem"("financialStructureId");

-- CreateIndex
CREATE INDEX "ProjectFinancialStructureExecutionCostItem_costTypeOptionId_idx" ON "ProjectFinancialStructureExecutionCostItem"("costTypeOptionId");

-- AddForeignKey
ALTER TABLE "ProjectFinancialStructureExecutionCostItem" ADD CONSTRAINT "ProjectFinancialStructureExecutionCostItem_financialStructureId_fkey" FOREIGN KEY ("financialStructureId") REFERENCES "ProjectFinancialStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFinancialStructureExecutionCostItem" ADD CONSTRAINT "ProjectFinancialStructureExecutionCostItem_costTypeOptionId_fkey" FOREIGN KEY ("costTypeOptionId") REFERENCES "SelectOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
