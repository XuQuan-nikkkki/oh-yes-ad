import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".db-sync/sync.env" });
if (!process.env.TEST_URL) throw new Error("缺少 .db-sync/sync.env 中的 TEST_URL");
if (!process.argv.includes("--execute-reset")) {
  throw new Error("这是破坏性的测试库重置命令，必须显式传入 --execute-reset");
}

const connectionUrl = new URL(process.env.TEST_URL);
if (connectionUrl.hostname === "host.docker.internal") {
  connectionUrl.hostname = "localhost";
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: connectionUrl.toString() }),
});

const main = async () => {
  const columnRows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'PlannedWorkEntry'
        AND column_name = 'workItemId'
    ) AS "exists"
  `);
  const hasWorkItemId = columnRows[0]?.exists ?? false;

  await prisma.$transaction(async (tx) => {
    if (hasWorkItemId) {
      await tx.$executeRawUnsafe(
        'UPDATE "PlannedWorkEntry" SET "workItemId" = NULL WHERE "workItemId" IS NOT NULL',
      );
    }
    await tx.$executeRawUnsafe(
      'ALTER TABLE "PlannedWorkEntry" DROP CONSTRAINT IF EXISTS "PlannedWorkEntry_work_itemId_fkey"',
    );
    await tx.$executeRawUnsafe(
      'DROP INDEX IF EXISTS "PlannedWorkEntry_work_itemId_idx"',
    );
    await tx.$executeRawUnsafe(
      'ALTER TABLE "PlannedWorkEntry" DROP COLUMN IF EXISTS "workItemId"',
    );
    await tx.$executeRawUnsafe(
      'ALTER TABLE "PlannedWorkEntry" DROP CONSTRAINT IF EXISTS "PlannedWorkEntry_taskId_fkey"',
    );
    await tx.$executeRawUnsafe(
      'ALTER TABLE "PlannedWorkEntry" ALTER COLUMN "taskId" SET NOT NULL',
    );
    await tx.$executeRawUnsafe(
      'DROP INDEX IF EXISTS "PlannedWorkEntry_taskId_idx"',
    );
    await tx.$executeRawUnsafe(`
      ALTER TABLE "PlannedWorkEntry"
      ADD CONSTRAINT "PlannedWorkEntry_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkItemFormatOption" CASCADE');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkItemCategoryOrSceneOption" CASCADE');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkItemAssignmentHistory" CASCADE');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkItem" CASCADE');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS "Brief" CASCADE');
  });

  console.log(
    "测试库已恢复到迁移前结构：已删除需求单/工作项表，原环节、任务和原计划工时已保留。",
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
