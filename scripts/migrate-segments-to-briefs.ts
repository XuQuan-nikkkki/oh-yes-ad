import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config();
if (process.argv.includes("--test")) config({ path: ".db-sync/sync.env" });
const configuredConnectionString = process.argv.includes("--test")
  ? process.env.TEST_URL
  : process.env.DATABASE_URL;
if (!configuredConnectionString) {
  throw new Error(
    process.argv.includes("--test")
      ? "缺少 .db-sync/sync.env 中的 TEST_URL"
      : "缺少 DATABASE_URL",
  );
}
const connectionUrl = new URL(configuredConnectionString);
// sync.env 同时供 Docker 同步脚本使用；本命令在宿主机执行时需连 localhost。
if (process.argv.includes("--test") && connectionUrl.hostname === "host.docker.internal") {
  connectionUrl.hostname = "localhost";
}
const connectionString = connectionUrl.toString();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const execute = process.argv.includes("--execute");
const setupSchema = process.argv.includes("--setup-schema");
const HISTORICAL_DATA_EMPLOYEE_ID = "system-historical-data";
const HISTORICAL_DATA_EMPLOYEE_NAME = "历史数据";

type MigrationStats = {
  segments: number;
  tasks: number;
  briefsToCreate: number;
  workItemsToCreate: number;
  existingBriefs: number;
  existingWorkItems: number;
  segmentOwnersToBackfill: number;
  briefsWithoutTasks: number;
  tasksWithoutAssignee: number;
  datesFromTaskDueDate: number;
  datesFromSegmentEndDate: number;
  datesFromSegmentStartDate: number;
  datesFromCreatedAt: number;
  emptySegmentSamples: Array<{ id: string; name: string }>;
  unassignedTaskSamples: Array<{ id: string; name: string; segment: string }>;
  taskWithoutDueDateSamples: Array<{ id: string; name: string; segment: string }>;
  blockingSegments: Array<{ id: string; name: string; reason: string }>;
  blockingTasks: Array<{ id: string; name: string; reason: string }>;
};

const dateOnly = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const main = async () => {
  if (setupSchema && execute) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "WorkItem" ADD COLUMN IF NOT EXISTS "legacyTaskId" TEXT',
    );
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "WorkItem_legacyTaskId_key" ON "WorkItem"("legacyTaskId")',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "WorkItem" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'pending\'',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "WorkItem" ALTER COLUMN "firstDraftAt" DROP NOT NULL',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "WorkItem" ALTER COLUMN "revisionAt" DROP NOT NULL',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "WorkItem" DROP CONSTRAINT IF EXISTS "WorkItem_new_record_dates_required"',
    );
  }

  const [segments, existingBriefs, existingWorkItems] = await Promise.all([
    prisma.projectSegment.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        project: { select: { ownerId: true } },
        statusOption: true,
        projectTasks: {
          orderBy: { createdAt: "asc" },
          include: {
            owner: { include: { functionOption: true } },
            statusOption: true,
          },
        },
      },
    }),
    prisma.brief.findMany({
      where: { legacySegmentId: { not: null } },
      select: { id: true, legacySegmentId: true },
    }),
    prisma.workItem.findMany({
      where: { legacyTaskId: { not: null } },
      select: { legacyTaskId: true },
    }),
  ]);

  const briefBySegmentId = new Map(
    existingBriefs.map((brief) => [brief.legacySegmentId!, brief.id]),
  );
  const migratedTaskIds = new Set(
    existingWorkItems.map((item) => item.legacyTaskId!),
  );
  const stats: MigrationStats = {
    segments: segments.length,
    tasks: segments.reduce((sum, segment) => sum + segment.projectTasks.length, 0),
    briefsToCreate: 0,
    workItemsToCreate: 0,
    existingBriefs: existingBriefs.length,
    existingWorkItems: existingWorkItems.length,
    segmentOwnersToBackfill: 0,
    briefsWithoutTasks: 0,
    tasksWithoutAssignee: 0,
    datesFromTaskDueDate: 0,
    datesFromSegmentEndDate: 0,
    datesFromSegmentStartDate: 0,
    datesFromCreatedAt: 0,
    emptySegmentSamples: [],
    unassignedTaskSamples: [],
    taskWithoutDueDateSamples: [],
    blockingSegments: [],
    blockingTasks: [],
  };

  for (const segment of segments) {
    if (segment.projectTasks.length === 0) {
      stats.briefsWithoutTasks += 1;
      stats.emptySegmentSamples.push({ id: segment.id, name: segment.name });
    }

    const effectiveSegmentOwnerId = segment.ownerId ?? segment.project.ownerId;
    if (!segment.ownerId && segment.project.ownerId) {
      stats.segmentOwnersToBackfill += 1;
    }
    const segmentBlocked = !effectiveSegmentOwnerId;
    if (segmentBlocked) {
      stats.blockingSegments.push({
        id: segment.id,
        name: segment.name,
        reason: "环节和所属项目都没有负责人，无法迁移需求单负责人",
      });
    }

    if (!segmentBlocked && !briefBySegmentId.has(segment.id)) stats.briefsToCreate += 1;
    for (const task of segment.projectTasks) {
      let taskBlocked = false;
      if (!task.ownerId) {
        taskBlocked = true;
        stats.tasksWithoutAssignee += 1;
        stats.unassignedTaskSamples.push({
          id: task.id,
          name: task.name,
          segment: segment.name,
        });
        stats.blockingTasks.push({
          id: task.id,
          name: task.name,
          reason: "任务没有负责人，无法判断工作项类型",
        });
      } else {
        const functionName = task.owner?.functionOption?.value;
        if (!functionName || !["设计组", "空间组", "品牌组", "项目组", "新媒体"].includes(functionName)) {
          taskBlocked = true;
          stats.blockingTasks.push({
            id: task.id,
            name: task.name,
            reason: `负责人职能「${functionName ?? "未设置"}」没有工作项类型映射`,
          });
        }
        if (functionName === "项目组" && !segment.project.ownerId) {
          taskBlocked = true;
          stats.blockingTasks.push({
            id: task.id,
            name: task.name,
            reason: "项目管理工作项所属项目没有负责人，无法确定审核人",
          });
        }
      }
      if (!["待推进", "进行中", "已完成", "暂停"].includes(task.statusOption?.value ?? "")) {
        taskBlocked = true;
        stats.blockingTasks.push({
          id: task.id,
          name: task.name,
          reason: `任务状态「${task.statusOption?.value ?? "未设置"}」没有工作项状态映射`,
        });
      }
      if (!task.dueDate) {
        stats.taskWithoutDueDateSamples.push({
          id: task.id,
          name: task.name,
          segment: segment.name,
        });
      }
      if (task.dueDate) stats.datesFromTaskDueDate += 1;
      else if (segment.endDate) stats.datesFromSegmentEndDate += 1;
      else if (segment.startDate) stats.datesFromSegmentStartDate += 1;
      else stats.datesFromCreatedAt += 1;
      if (segmentBlocked || taskBlocked || migratedTaskIds.has(task.id)) continue;
      stats.workItemsToCreate += 1;
    }
  }

  const outputStats = process.argv.includes("--summary")
    ? {
        ...stats,
        emptySegmentSamples: undefined,
        unassignedTaskSamples: undefined,
        taskWithoutDueDateSamples: undefined,
      }
    : stats;
  console.log(
    JSON.stringify(
      { mode: execute ? "execute" : "dry-run", ...outputStats },
      null,
      2,
    ),
  );
  if (!execute) {
    console.log("\n当前为预检模式，未写入数据。确认后使用 --execute 执行。");
    return;
  }
  await prisma.$transaction(async (tx) => {
    const historicalDataEmployee = await tx.employee.upsert({
      where: { id: HISTORICAL_DATA_EMPLOYEE_ID },
      update: { name: HISTORICAL_DATA_EMPLOYEE_NAME },
      create: {
        id: HISTORICAL_DATA_EMPLOYEE_ID,
        name: HISTORICAL_DATA_EMPLOYEE_NAME,
      },
    });
    const [designReviewer, copyReviewer, newMediaReviewer] = await Promise.all([
      tx.employee.findFirst({
        where: {
          positionOption: { value: "美术指导" },
          NOT: { employmentStatusOption: { value: "离职" } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
      tx.employee.findFirst({
        where: {
          functionOption: { value: "品牌组" },
          positionOption: { value: "文案策划" },
          NOT: { employmentStatusOption: { value: "离职" } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
      tx.employee.findFirst({
        where: {
          functionOption: { value: "新媒体" },
          NOT: { employmentStatusOption: { value: "离职" } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
    if (!designReviewer) throw new Error("找不到在职美术指导，无法迁移设计工作项");
    if (!copyReviewer) throw new Error("找不到在职品牌组文案策划，无法迁移文案工作项");
    if (!newMediaReviewer) throw new Error("找不到在职新媒体职能员工，无法迁移新媒体工作项");

    for (const segment of segments) {
      const effectiveSegmentOwnerId = segment.ownerId ?? segment.project.ownerId;
      if (!effectiveSegmentOwnerId) continue;
      if (!segment.ownerId) {
        await tx.projectSegment.update({
          where: { id: segment.id },
          data: {
            ownerId: effectiveSegmentOwnerId,
            // 这是迁移前的数据修复，不改写历史业务更新时间。
            updatedAt: segment.updatedAt,
          },
        });
      }

      const allAssigned = segment.projectTasks.every((task) => Boolean(task.ownerId));
      const status =
        segment.statusOption?.value === "暂停"
          ? "paused"
          : segment.statusOption?.value === "已完成"
            ? "completed"
            : allAssigned
              ? "in_progress"
              : "waiting_assignment";
      const brief = await tx.brief.upsert({
        where: { legacySegmentId: segment.id },
        update: {},
        create: {
          legacySegmentId: segment.id,
          title: segment.name,
          description: "",
          status,
          projectId: segment.projectId,
          ownerId: effectiveSegmentOwnerId,
          creatorId: historicalDataEmployee.id,
          createdAt: segment.createdAt,
          updatedAt: segment.updatedAt,
        },
      });

      for (const task of segment.projectTasks) {
        const functionName = task.owner?.functionOption?.value;
        const type =
          functionName === "品牌组"
            ? "COPY"
            : functionName === "项目组"
              ? "PROJECT_MANAGEMENT"
              : functionName === "新媒体"
                ? "NEW_MEDIA"
                : functionName === "设计组" || functionName === "空间组"
                  ? "DESIGN"
                  : null;
        if (!task.ownerId || !type) continue;
        const status =
          task.statusOption?.value === "待推进"
            ? "pending"
            : task.statusOption?.value === "进行中"
              ? "in_progress"
              : task.statusOption?.value === "已完成"
                ? "completed"
                : task.statusOption?.value === "暂停"
                  ? "paused"
                  : null;
        if (!status) continue;
        const reviewerId =
          type === "DESIGN"
            ? designReviewer.id
            : type === "COPY"
              ? copyReviewer.id
              : type === "NEW_MEDIA"
                ? newMediaReviewer.id
                : segment.project.ownerId;
        if (!reviewerId) continue;
        const creatorId = task.creatorId ?? historicalDataEmployee.id;
        const milestoneDate = dateOnly(
          task.dueDate ?? segment.endDate ?? segment.startDate ?? task.createdAt,
        );

        const workItem = await tx.workItem.upsert({
          where: { legacyTaskId: task.id },
          update: {},
          create: {
            legacyTaskId: task.id,
            briefId: brief.id,
            type,
            status,
            title: task.name,
            description: "",
            reviewerId,
            assigneeId: task.ownerId,
            creatorId,
            firstDraftAt: null,
            revisionAt: null,
            finalAt: milestoneDate,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        });
        await tx.plannedWorkEntry.updateMany({
          where: { taskId: task.id },
          data: { workItemId: workItem.id },
        });
      }
    }
  });

  console.log(
    `\n迁移完成：回填 ${stats.segmentOwnersToBackfill} 个环节负责人，新增 ${stats.briefsToCreate} 张需求单、${stats.workItemsToCreate} 个工作项；跳过 ${stats.blockingSegments.length} 个问题环节、${stats.blockingTasks.length} 个问题任务。`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
