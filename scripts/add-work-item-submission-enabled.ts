import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd(), true);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (process.argv.includes("--execute")) {
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query('ALTER TABLE "WorkItem" ADD COLUMN IF NOT EXISTS "submissionEnabled" BOOLEAN NOT NULL DEFAULT true');
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    const result = await client.query(`SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'WorkItem' AND column_name = 'submissionEnabled'`);
    console.log(result.rows);
    if (process.argv.includes("--execute") && (result.rows.length !== 1 || result.rows[0].data_type !== 'boolean' || result.rows[0].is_nullable !== 'NO')) {
      throw new Error("提交内容字段验证失败");
    }
  } finally {
    await client.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
