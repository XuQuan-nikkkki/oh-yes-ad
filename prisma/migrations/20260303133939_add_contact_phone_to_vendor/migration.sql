-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "scope" TEXT,
    "preference" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "address" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "taxNumber" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankBranch" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notionPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "function" TEXT,
    "position" TEXT,
    "level" TEXT,
    "departmentLevel1" TEXT,
    "departmentLevel2" TEXT,
    "employmentType" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL DEFAULT '在职',
    "entryDate" TIMESTAMP(3),
    "leaveDate" TIMESTAMP(3),
    "salary" DECIMAL(65,30),
    "socialSecurity" DECIMAL(65,30),
    "providentFund" DECIMAL(65,30),
    "workstationCost" DECIMAL(65,30),
    "utilityCost" DECIMAL(65,30),
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "legalEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRecord" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayAdjustment" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT,
    "changeType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT,
    "stage" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "clientId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSegment" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "dueDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "dueDate" TIMESTAMP(3),
    "segmentId" TEXT NOT NULL,
    "ownerId" TEXT,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "date" TIMESTAMP(3),
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "internalLink" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "vendorType" TEXT,
    "businessType" TEXT,
    "services" TEXT[],
    "location" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "strengths" TEXT,
    "notes" TEXT,
    "companyIntro" TEXT,
    "portfolioLink" TEXT,
    "priceRange" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "cooperationStatus" TEXT,
    "rating" TEXT,
    "lastCoopDate" TEXT,
    "cooperatedProjects" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "date" TIMESTAMP(3),
    "location" TEXT,
    "method" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkEntry" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "taskId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "plannedDays" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedWorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualWorkEntry" (
    "id" TEXT NOT NULL,
    "notionPageId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualWorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MilestoneClientParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneClientParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestoneInternalParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneInternalParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectVendors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectVendors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestoneDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneDocuments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestoneVendorParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneVendorParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_notionPageId_key" ON "Client"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContact_notionPageId_key" ON "ClientContact"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_notionPageId_key" ON "LegalEntity"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_name_key" ON "LegalEntity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountNumber_key" ON "BankAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountBalanceSnapshot_notionPageId_key" ON "BankAccountBalanceSnapshot"("notionPageId");

-- CreateIndex
CREATE INDEX "BankAccountBalanceSnapshot_bankAccountId_recordedAt_idx" ON "BankAccountBalanceSnapshot"("bankAccountId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_notionPageId_key" ON "Employee"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRecord_notionPageId_key" ON "LeaveRecord"("notionPageId");

-- CreateIndex
CREATE INDEX "LeaveRecord_employeeId_startDate_idx" ON "LeaveRecord"("employeeId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayAdjustment_notionPageId_key" ON "WorkdayAdjustment"("notionPageId");

-- CreateIndex
CREATE INDEX "WorkdayAdjustment_startDate_endDate_idx" ON "WorkdayAdjustment"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Project_notionPageId_key" ON "Project"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSegment_notionPageId_key" ON "ProjectSegment"("notionPageId");

-- CreateIndex
CREATE INDEX "ProjectSegment_projectId_idx" ON "ProjectSegment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTask_notionPageId_key" ON "ProjectTask"("notionPageId");

-- CreateIndex
CREATE INDEX "ProjectTask_segmentId_idx" ON "ProjectTask"("segmentId");

-- CreateIndex
CREATE INDEX "ProjectTask_ownerId_idx" ON "ProjectTask"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_notionPageId_key" ON "ProjectDocument"("notionPageId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_notionPageId_key" ON "Vendor"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMilestone_notionPageId_key" ON "ProjectMilestone"("notionPageId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedWorkEntry_notionPageId_key" ON "PlannedWorkEntry"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualWorkEntry_notionPageId_key" ON "ActualWorkEntry"("notionPageId");

-- CreateIndex
CREATE INDEX "ActualWorkEntry_employeeId_idx" ON "ActualWorkEntry"("employeeId");

-- CreateIndex
CREATE INDEX "ActualWorkEntry_projectId_idx" ON "ActualWorkEntry"("projectId");

-- CreateIndex
CREATE INDEX "ActualWorkEntry_date_idx" ON "ActualWorkEntry"("date");

-- CreateIndex
CREATE INDEX "_MilestoneClientParticipants_B_index" ON "_MilestoneClientParticipants"("B");

-- CreateIndex
CREATE INDEX "_ProjectMembers_B_index" ON "_ProjectMembers"("B");

-- CreateIndex
CREATE INDEX "_MilestoneInternalParticipants_B_index" ON "_MilestoneInternalParticipants"("B");

-- CreateIndex
CREATE INDEX "_ProjectVendors_B_index" ON "_ProjectVendors"("B");

-- CreateIndex
CREATE INDEX "_MilestoneDocuments_B_index" ON "_MilestoneDocuments"("B");

-- CreateIndex
CREATE INDEX "_MilestoneVendorParticipants_B_index" ON "_MilestoneVendorParticipants"("B");

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountBalanceSnapshot" ADD CONSTRAINT "BankAccountBalanceSnapshot_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSegment" ADD CONSTRAINT "ProjectSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSegment" ADD CONSTRAINT "ProjectSegment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "ProjectSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkEntry" ADD CONSTRAINT "PlannedWorkEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualWorkEntry" ADD CONSTRAINT "ActualWorkEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualWorkEntry" ADD CONSTRAINT "ActualWorkEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneClientParticipants" ADD CONSTRAINT "_MilestoneClientParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "ClientContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneClientParticipants" ADD CONSTRAINT "_MilestoneClientParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectMembers" ADD CONSTRAINT "_ProjectMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectMembers" ADD CONSTRAINT "_ProjectMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneInternalParticipants" ADD CONSTRAINT "_MilestoneInternalParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneInternalParticipants" ADD CONSTRAINT "_MilestoneInternalParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectVendors" ADD CONSTRAINT "_ProjectVendors_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectVendors" ADD CONSTRAINT "_ProjectVendors_B_fkey" FOREIGN KEY ("B") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDocuments" ADD CONSTRAINT "_MilestoneDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDocuments" ADD CONSTRAINT "_MilestoneDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneVendorParticipants" ADD CONSTRAINT "_MilestoneVendorParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneVendorParticipants" ADD CONSTRAINT "_MilestoneVendorParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
