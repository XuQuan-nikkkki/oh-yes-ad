-- ProjectDocument 与 ProjectMilestone 从多对多改为一对多（Document 可选关联一个 Milestone）

ALTER TABLE "ProjectDocument"
ADD COLUMN "milestoneId" TEXT;

-- 从旧中间表回填 milestoneId（若历史存在多个里程碑，保留一条）
UPDATE "ProjectDocument" d
SET "milestoneId" = md."B"
FROM (
  SELECT DISTINCT ON ("A") "A", "B"
  FROM "_MilestoneDocuments"
  ORDER BY "A", "B"
) md
WHERE d."id" = md."A";

CREATE INDEX "ProjectDocument_milestoneId_idx" ON "ProjectDocument"("milestoneId");

ALTER TABLE "ProjectDocument"
ADD CONSTRAINT "ProjectDocument_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "_MilestoneDocuments";
