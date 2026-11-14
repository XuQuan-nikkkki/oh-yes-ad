import "dotenv/config";
import { Client } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("缺少 DATABASE_URL");
  const url = new URL(process.env.DATABASE_URL);
  console.log(`数据库：${url.hostname}/${url.pathname.slice(1)}`);
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    const duplicates = await client.query(`
      SELECT "workItemId", count(*)::int AS count
      FROM "WorkItemSubmission"
      WHERE "isFinal" = true
      GROUP BY "workItemId"
      HAVING count(*) > 1
    `);
    if (duplicates.rowCount) {
      throw new Error(`发现 ${duplicates.rowCount} 个工作项有多个最终版，不能创建唯一索引`);
    }
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WorkItemSubmission_one_final_per_work_item_key"
      ON "WorkItemSubmission"("workItemId") WHERE "isFinal" = true
    `);
    const index = await client.query<{ unique: boolean; predicate: string | null; definition: string }>(`
      SELECT i.indisunique AS unique, pg_get_expr(i.indpred, i.indrelid) AS predicate,
        pg_get_indexdef(i.indexrelid) AS definition
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_class t ON t.oid = i.indrelid
      WHERE c.relname = 'WorkItemSubmission_one_final_per_work_item_key'
        AND t.relname = 'WorkItemSubmission'
    `);
    if (index.rowCount !== 1 || !index.rows[0].unique ||
        !index.rows[0].definition.includes('("workItemId")') ||
        !index.rows[0].predicate?.includes('"isFinal"') ||
        !index.rows[0].predicate?.includes("true")) {
      throw new Error("最终版唯一索引校验失败");
    }
    await client.query("COMMIT");
    console.log("最终版唯一索引已就绪");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
