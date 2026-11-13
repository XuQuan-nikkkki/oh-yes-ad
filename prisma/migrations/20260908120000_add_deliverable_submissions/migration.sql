CREATE TYPE "DeliverableSubmissionResourceKind" AS ENUM ('OUTPUT', 'SOURCE');

CREATE TABLE "DeliverableSubmission" (
  "id" TEXT NOT NULL,
  "deliverableId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "versionTitle" TEXT,
  "contentText" TEXT,
  "isFinal" BOOLEAN NOT NULL DEFAULT false,
  "submittedById" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliverableSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableSubmissionResource" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "kind" "DeliverableSubmissionResourceKind" NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT,
  "mimeType" TEXT,
  "thumbnailUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliverableSubmissionResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableFeedback" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "content" TEXT,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliverableFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableFeedbackImage" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableFeedbackImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableAdjustmentItem" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliverableAdjustmentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableAdjustmentItemImage" (
  "id" TEXT NOT NULL,
  "adjustmentItemId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableAdjustmentItemImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableAdjustmentCheck" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "adjustmentItemId" TEXT NOT NULL,
  "checkedById" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableAdjustmentCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliverableSubmission_deliverableId_versionNumber_key"
  ON "DeliverableSubmission"("deliverableId", "versionNumber");
CREATE INDEX "DeliverableSubmission_deliverableId_isFinal_idx"
  ON "DeliverableSubmission"("deliverableId", "isFinal");
CREATE UNIQUE INDEX "DeliverableSubmission_one_final_per_deliverable_key"
  ON "DeliverableSubmission"("deliverableId") WHERE "isFinal" = true;
CREATE INDEX "DeliverableSubmission_submittedById_idx"
  ON "DeliverableSubmission"("submittedById");

CREATE INDEX "DeliverableSubmissionResource_submissionId_kind_sortOrder_idx"
  ON "DeliverableSubmissionResource"("submissionId", "kind", "sortOrder");
CREATE INDEX "DeliverableSubmissionResource_uploadedById_idx"
  ON "DeliverableSubmissionResource"("uploadedById");

CREATE UNIQUE INDEX "DeliverableFeedback_submissionId_key"
  ON "DeliverableFeedback"("submissionId");
CREATE INDEX "DeliverableFeedback_recordedById_idx"
  ON "DeliverableFeedback"("recordedById");

CREATE INDEX "DeliverableFeedbackImage_feedbackId_sortOrder_idx"
  ON "DeliverableFeedbackImage"("feedbackId", "sortOrder");
CREATE INDEX "DeliverableAdjustmentItem_feedbackId_sortOrder_idx"
  ON "DeliverableAdjustmentItem"("feedbackId", "sortOrder");
CREATE INDEX "DeliverableAdjustmentItemImage_adjustmentItemId_sortOrder_idx"
  ON "DeliverableAdjustmentItemImage"("adjustmentItemId", "sortOrder");

CREATE UNIQUE INDEX "DeliverableAdjustmentCheck_submissionId_adjustmentItemId_key"
  ON "DeliverableAdjustmentCheck"("submissionId", "adjustmentItemId");
CREATE INDEX "DeliverableAdjustmentCheck_adjustmentItemId_idx"
  ON "DeliverableAdjustmentCheck"("adjustmentItemId");
CREATE INDEX "DeliverableAdjustmentCheck_checkedById_idx"
  ON "DeliverableAdjustmentCheck"("checkedById");

ALTER TABLE "DeliverableSubmission"
  ADD CONSTRAINT "DeliverableSubmission_deliverableId_fkey"
  FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission"
  ADD CONSTRAINT "DeliverableSubmission_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "Employee"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliverableSubmissionResource"
  ADD CONSTRAINT "DeliverableSubmissionResource_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmissionResource"
  ADD CONSTRAINT "DeliverableSubmissionResource_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "Employee"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliverableFeedback"
  ADD CONSTRAINT "DeliverableFeedback_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableFeedback"
  ADD CONSTRAINT "DeliverableFeedback_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "Employee"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliverableFeedbackImage"
  ADD CONSTRAINT "DeliverableFeedbackImage_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "DeliverableFeedback"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableAdjustmentItem"
  ADD CONSTRAINT "DeliverableAdjustmentItem_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "DeliverableFeedback"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableAdjustmentItemImage"
  ADD CONSTRAINT "DeliverableAdjustmentItemImage_adjustmentItemId_fkey"
  FOREIGN KEY ("adjustmentItemId") REFERENCES "DeliverableAdjustmentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliverableAdjustmentCheck"
  ADD CONSTRAINT "DeliverableAdjustmentCheck_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableAdjustmentCheck"
  ADD CONSTRAINT "DeliverableAdjustmentCheck_adjustmentItemId_fkey"
  FOREIGN KEY ("adjustmentItemId") REFERENCES "DeliverableAdjustmentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverableAdjustmentCheck"
  ADD CONSTRAINT "DeliverableAdjustmentCheck_checkedById_fkey"
  FOREIGN KEY ("checkedById") REFERENCES "Employee"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
