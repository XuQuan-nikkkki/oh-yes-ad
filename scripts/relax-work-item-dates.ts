import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd(), true);

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error("缺少 DATABASE_URL");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (process.argv.includes("--execute")) {
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query(`ALTER TABLE "WorkItem"
          ALTER COLUMN "firstDraftAt" DROP NOT NULL,
          ALTER COLUMN "revisionAt" DROP NOT NULL,
          DROP CONSTRAINT IF EXISTS "WorkItem_new_record_dates_required"`);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    const columns = await client.query(`SELECT attname AS column, attnotnull AS required
      FROM pg_attribute WHERE attrelid = '"WorkItem"'::regclass
      AND attname IN ('firstDraftAt', 'revisionAt', 'finalAt') ORDER BY attname`);
    const constraints = await client.query(`SELECT conname FROM pg_constraint
      WHERE conrelid = '"WorkItem"'::regclass
      AND conname = 'WorkItem_new_record_dates_required'`);
    console.log(JSON.stringify({ dates: columns.rows, oldConstraints: constraints.rows }, null, 2));
    if (process.argv.includes("--execute") && (
      constraints.rowCount !== 0 || columns.rows.length !== 3 ||
      columns.rows.some((column) => column.required !== (column.column === "finalAt"))
    )) throw new Error("日期约束验证未通过");
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "日期约束更新失败");
  process.exitCode = 1;
});
