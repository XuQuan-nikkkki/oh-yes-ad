import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Client } from "pg";
import { runOnceDataMigration } from "./lib/run-once-data-migration";

const MIGRATION_KEY = "2026-11-05-project-service-content-from-receivable-plan";
const execute = process.argv.includes("--execute");
const production = process.argv.includes("--production");
const unexpectedArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== "--execute" && arg !== "--production");
if (unexpectedArgs.length > 0) {
  throw new Error(`不支持的参数：${unexpectedArgs.join(", ")}`);
}

const databaseUrl = production
  ? parse(readFileSync(".db-sync/sync.env")).PROD_URL
  : process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(production ? "缺少 PROD_URL" : "缺少 DATABASE_URL");
}

const database = new URL(databaseUrl);
const client = new Client({ connectionString: databaseUrl });

type Summary = {
  totalPlans: number;
  plansWithContent: number;
  eligibleProjects: number;
};

const inspect = async (db: Client): Promise<Summary> => {
  const column = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'Project'
       AND column_name = 'serviceContent'`,
  );
  if (column.rowCount !== 1) {
    throw new Error("项目服务内容字段尚未创建；请先同步数据库结构");
  }

  const duplicates = await db.query<{ projectId: string }>(
    `SELECT "projectId"
     FROM "ProjectReceivablePlan"
     GROUP BY "projectId"
     HAVING COUNT(*) > 1`,
  );
  if (duplicates.rows.length > 0) {
    throw new Error(
      `发现 ${duplicates.rows.length} 个项目有多条收款计划，已停止回填；项目 ID：${duplicates.rows.map((row) => row.projectId).join(", ")}`,
    );
  }

  const summary = await db.query<Summary>(
    `SELECT
       COUNT(*)::int AS "totalPlans",
       COUNT(*) FILTER (
         WHERE r."serviceContent" IS NOT NULL
           AND LENGTH(BTRIM(r."serviceContent")) > 0
       )::int AS "plansWithContent",
       COUNT(*) FILTER (
         WHERE r."serviceContent" IS NOT NULL
           AND LENGTH(BTRIM(r."serviceContent")) > 0
           AND (p."serviceContent" IS NULL OR LENGTH(BTRIM(p."serviceContent")) = 0)
       )::int AS "eligibleProjects"
     FROM "ProjectReceivablePlan" r
     JOIN "Project" p ON p.id = r."projectId"`,
  );
  return summary.rows[0];
};

const preview = async () => {
  await client.query("BEGIN READ ONLY");
  try {
    const completed = await client.query(
      `SELECT 1 FROM "DataMigration" WHERE "key" = $1`,
      [MIGRATION_KEY],
    );
    const counts = await inspect(client);
    console.log(
      JSON.stringify({
        mode: "preview",
        database: `${database.hostname}/${database.pathname.slice(1)}`,
        alreadyCompleted: Boolean(completed.rowCount),
        ...counts,
      }),
    );
  } finally {
    await client.query("ROLLBACK");
  }
};

const main = async () => {
  await client.connect();
  try {
    if (!execute) {
      await preview();
      console.log("预览结束，未修改数据。");
      return;
    }

    const result = await runOnceDataMigration(client, MIGRATION_KEY, async (db) => {
      // Keep the one-to-one check and update against the same set of plans.
      await db.query('LOCK TABLE "ProjectReceivablePlan" IN SHARE MODE');
      const counts = await inspect(db);
      console.log(
        JSON.stringify({
          mode: "execute",
          database: `${database.hostname}/${database.pathname.slice(1)}`,
          ...counts,
        }),
      );

      const updated = await db.query(
        `UPDATE "Project" p
         SET "serviceContent" = r."serviceContent"
         FROM "ProjectReceivablePlan" r
         WHERE p.id = r."projectId"
           AND (p."serviceContent" IS NULL OR LENGTH(BTRIM(p."serviceContent")) = 0)
           AND r."serviceContent" IS NOT NULL
           AND LENGTH(BTRIM(r."serviceContent")) > 0`,
      );
      if (updated.rowCount !== counts.eligibleProjects) {
        throw new Error(
          `预计更新 ${counts.eligibleProjects} 个项目，实际更新 ${updated.rowCount ?? 0} 个，已回滚`,
        );
      }
      return { rowsUpdated: updated.rowCount ?? 0 };
    });

    if (result.applied) {
      console.log(`历史服务内容回填完成：更新 ${result.rowsUpdated ?? 0} 个项目。`);
    } else {
      console.log("历史服务内容已回填，本次部署跳过。");
    }
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
