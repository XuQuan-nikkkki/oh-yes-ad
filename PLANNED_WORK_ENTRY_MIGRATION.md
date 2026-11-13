> 历史迁移记录：本文中的 Deliverable / deliverableId 是当时使用的名称。2026-09-08 已统一改为 WorkItem / workItemId；当前数据库操作请参阅 [工作项重命名说明](WORK_ITEM_RENAME.md)，不要在已改名数据库上直接执行下方旧 SQL。

# 计划工时归属迁移说明

## 目标数据模型

`PlannedWorkEntry` 是唯一的计划工时实体，同时支持项目任务和交付物两种归属。不在 `Deliverable` 上重复保存计划天数。

每条计划工时必须且只能满足一种归属：

- 任务工时：`taskId` 有值，`deliverableId` 为空。
- 交付物工时：`taskId` 为空，`deliverableId` 有值。

目标数据库通过 `PlannedWorkEntry_owner_check` 约束保证二选一。Prisma Schema 不能表达这条 CHECK 约束，必须在最终批量迁移的 SQL 中显式创建。

## 当前阶段

- 保留所有历史任务计划工时的 `taskId`，不复制、不改写工时数据。
- 新增 `deliverableId` 关联，用于后续交付物计划工时功能。
- 本阶段不执行“环节和任务批量迁移到新数据方案”。

## 最终数据库结构迁移

项目当前忽略新的 `prisma/migrations` 目录，并在构建中使用 `prisma db push --accept-data-loss`。因此最终批量迁移时要将下面的 DDL 放入当次可追踪、可审核的正式迁移脚本，不能只运行 `db push`。

```sql
ALTER TABLE "PlannedWorkEntry"
ALTER COLUMN "taskId" DROP NOT NULL;

ALTER TABLE "PlannedWorkEntry"
ADD COLUMN "deliverableId" TEXT;

CREATE INDEX "PlannedWorkEntry_taskId_idx"
ON "PlannedWorkEntry"("taskId");

CREATE INDEX "PlannedWorkEntry_deliverableId_idx"
ON "PlannedWorkEntry"("deliverableId");

ALTER TABLE "PlannedWorkEntry"
ADD CONSTRAINT "PlannedWorkEntry_deliverableId_fkey"
FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlannedWorkEntry"
ADD CONSTRAINT "PlannedWorkEntry_owner_check"
CHECK (
  ("taskId" IS NOT NULL AND "deliverableId" IS NULL)
  OR
  ("taskId" IS NULL AND "deliverableId" IS NOT NULL)
);
```

执行脚本前要检查字段、索引和约束是否已被 `db push` 部分创建，根据实际库结构调整为幂等 SQL，避免重复创建失败。

## 最终批量迁移前必须处理

1. 停止或锁定会同时写入环节、任务和计划工时的功能，避免迁移期间产生增量差异。
2. 在正式库执行迁移前备份相关表，至少包括项目、环节、任务、交付物和计划工时。
3. 迁移脚本必须可重复执行，使用稳定的旧数据 ID 或显式的迁移映射表，不得通过名称猜测对应关系。
4. 先迁移环节，再迁移任务，最后处理计划工时关联，确保所有外键目标已存在。
5. 如果某条旧工时需要从任务转为交付物归属，必须在同一个事务内同时清空 `taskId` 并写入 `deliverableId`，避免违反二选一约束。
6. 对无法唯一映射的历史记录生成异常清单，不自动选择交付物，不删除原记录。
7. 同步修改依赖 `taskId` 必填的列表、统计、导出、日历和成本分析查询，使其同时支持 `task.segment.projectId` 和 `deliverable.brief.projectId` 两条项目归属路径。
8. 当前构建命令使用 `prisma db push --accept-data-loss`。正式迁移前必须确认发布流程不会绕过手写 SQL 中的 CHECK 约束，也不能让 `db push` 意外删除该约束。

## 迁移后校验

迁移前后记录总数、计划天数总和以及按项目汇总的结果必须一致。

```sql
-- 不允许无归属或双重归属记录
SELECT COUNT(*)
FROM "PlannedWorkEntry"
WHERE
  ("taskId" IS NULL AND "deliverableId" IS NULL)
  OR
  ("taskId" IS NOT NULL AND "deliverableId" IS NOT NULL);

-- 分别核对两种归属的数量和计划天数
SELECT
  CASE WHEN "taskId" IS NOT NULL THEN 'task' ELSE 'deliverable' END AS owner_type,
  COUNT(*) AS entry_count,
  COALESCE(SUM("plannedDays"), 0) AS planned_days
FROM "PlannedWorkEntry"
GROUP BY owner_type;
```

第一条校验结果必须为 `0`。还要在应用层抽样对比任务详情、交付物详情、项目计划工时总计和导出结果。
