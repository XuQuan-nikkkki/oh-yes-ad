import { readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { Client } from "pg";
import { DEFERRED_TASK_IDS } from "./lib/deferred-migration-tasks";

config();
const test = process.argv.includes("--test");
const production = process.argv.includes("--production");
if (test && production) throw new Error("--test 与 --production 不能同时使用");
const syncEnv = test || production
  ? parse(readFileSync(process.env.MIGRATION_SYNC_ENV ?? ".db-sync/sync.env"))
  : null;
const connectionString = production
  ? syncEnv?.PROD_URL
  : test
    ? syncEnv?.TEST_URL
    : process.env.DATABASE_URL;
if (!connectionString) throw new Error("缺少数据库连接地址");
const url = new URL(connectionString);
if (test && url.hostname === "host.docker.internal") url.hostname = "localhost";

const deferredTaskIds: string[] = [...DEFERRED_TASK_IDS];

async function main() {
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const requiredTables = [
      "Brief", "WorkItem", "ProjectCostEstimationExecutionCostItem",
      "ProjectInitiationExecutionCostItem",
    ];
    const tableCheck = await client.query<{ name: string; exists: boolean }>(`
      SELECT name, to_regclass(format('public.%I', name)) IS NOT NULL AS exists
      FROM unnest($1::text[]) AS name
    `, [requiredTables]);
    const missingTables = tableCheck.rows.filter((row) => !row.exists).map((row) => row.name);
    if (missingTables.length) {
      throw new Error(`数据库结构尚未同步，缺少：${missingTables.join("、")}`);
    }
    const result = await client.query<{
      segments: string;
      briefs: string;
      missing_briefs: string;
      eligible_tasks: string;
      migrated_tasks: string;
      missing_items: string;
      wrong_item_briefs: string;
      deferred_tasks: string;
      deferred_items: string;
      planned_entries: string;
      expected_links: string;
      actual_links: string;
      wrong_links: string;
      estimate_source: string;
      estimate_target: string;
      initiation_source: string;
      initiation_target: string;
    }>(`
      SELECT
        (SELECT count(*) FROM "ProjectSegment") segments,
        (SELECT count(*) FROM "Brief" WHERE "legacySegmentId" IS NOT NULL) briefs,
        (SELECT count(*) FROM "ProjectSegment" segment
          LEFT JOIN "Brief" brief ON brief."legacySegmentId" = segment.id
          WHERE brief.id IS NULL OR brief."projectId" <> segment."projectId") missing_briefs,
        (SELECT count(*) FROM "ProjectTask" WHERE id <> ALL($1::text[])) eligible_tasks,
        (SELECT count(*) FROM "WorkItem" WHERE "legacyTaskId" IS NOT NULL) migrated_tasks,
        (SELECT count(*) FROM "ProjectTask" task
          LEFT JOIN "WorkItem" item ON item."legacyTaskId" = task.id
          WHERE task.id <> ALL($1::text[]) AND item.id IS NULL) missing_items,
        (SELECT count(*) FROM "WorkItem" item
          JOIN "ProjectTask" task ON task.id = item."legacyTaskId"
          JOIN "ProjectSegment" segment ON segment.id = task."segmentId"
          JOIN "Brief" brief ON brief.id = item."briefId"
          WHERE brief."legacySegmentId" IS DISTINCT FROM segment.id) wrong_item_briefs,
        (SELECT count(*) FROM "ProjectTask" WHERE id = ANY($1::text[])) deferred_tasks,
        (SELECT count(*) FROM "WorkItem" WHERE "legacyTaskId" = ANY($1::text[])) deferred_items,
        (SELECT count(*) FROM "PlannedWorkEntry") planned_entries,
        (SELECT count(*) FROM "PlannedWorkEntry" WHERE "taskId" IS NOT NULL
          AND "taskId" <> ALL($1::text[])) expected_links,
        (SELECT count(*) FROM "PlannedWorkEntry" WHERE "taskId" IS NOT NULL
          AND "workItemId" IS NOT NULL) actual_links,
        (SELECT count(*) FROM "PlannedWorkEntry" entry
          LEFT JOIN "WorkItem" item ON item."legacyTaskId" = entry."taskId"
          WHERE entry."taskId" IS NOT NULL
            AND entry."workItemId" IS DISTINCT FROM item.id) wrong_links,
        (SELECT count(*) FROM "_ProjectCostEstimationExecutionCostTypes") estimate_source,
        (SELECT count(*) FROM "ProjectCostEstimationExecutionCostItem" target
          JOIN "_ProjectCostEstimationExecutionCostTypes" source
            ON source."A" = target."costEstimationId" AND source."B" = target."costTypeOptionId") estimate_target,
        (SELECT count(*) FROM "_ProjectInitiationExecutionCostTypes") initiation_source,
        (SELECT count(*) FROM "ProjectInitiationExecutionCostItem" target
          JOIN "_ProjectInitiationExecutionCostTypes" source
            ON source."A" = target."initiationId" AND source."B" = target."costTypeOptionId") initiation_target
    `, [deferredTaskIds]);
    const row = result.rows[0];
    console.log(JSON.stringify({ database: `${url.hostname}/${url.pathname.slice(1)}`, ...row }, null, 2));
    const number = (key: keyof typeof row) => Number(row[key]);
    const valid =
      number("segments") === number("briefs") &&
      number("missing_briefs") === 0 &&
      number("eligible_tasks") === number("migrated_tasks") &&
      number("missing_items") === 0 &&
      number("wrong_item_briefs") === 0 &&
      number("deferred_tasks") === deferredTaskIds.length &&
      number("deferred_items") === 0 &&
      number("expected_links") === number("actual_links") &&
      number("wrong_links") === 0 &&
      number("estimate_source") === number("estimate_target") &&
      number("initiation_source") === number("initiation_target");
    if (!valid) throw new Error("迁移核验未通过，检查上方计数");
    console.log("迁移核验通过");
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
