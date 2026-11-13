import { loadEnvConfig } from '@next/env';
import { config } from 'dotenv';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 应用本地运行遵循 Next 的 .env.local 优先级；部署时与 prisma.config.ts 一致。
if (process.argv.includes('--deployment')) config({ quiet: true });
else loadEnvConfig(process.cwd(), true);

const execute = process.argv.includes('--execute');
const rehearse = process.argv.includes('--rehearse');
const verifyOnly = process.argv.includes('--verify-only');
const migrationPath = 'prisma/migrations/20260908140000_rename_deliverables_to_work_items/migration.sql';
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const renamed = (name: string) => name.replaceAll('Deliverable', 'WorkItem');

type Snapshot = { table: string; count: number; digest: string; rows: string[] };
async function snapshot(client: Client): Promise<Snapshot[]> {
  const tables = await client.query<{ tablename: string }>(`SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND (tablename LIKE 'Deliverable%' OR tablename LIKE 'WorkItem%'
      OR tablename IN ('PlannedWorkEntry', 'Brief', 'SelectOption')) ORDER BY tablename`);
  const result: Snapshot[] = [];
  for (const { tablename } of tables.rows) {
    // 在数据库端序列化，避免 JS 日期/数字转换降低数据核验精度。
    const data = await client.query<{ raw: string; normalized: string }>(`
      SELECT j::text AS raw, (
        CASE WHEN j ? 'deliverableId' THEN (j - 'deliverableId') || jsonb_build_object('workItemId', j->'deliverableId')
          WHEN $1 = 'SelectOption' AND j->>'field' IN ('briefDeliverable.format', 'briefDeliverable.categoryOrScene')
            THEN jsonb_set(j, '{field}', to_jsonb(replace(j->>'field', 'briefDeliverable.', 'briefWorkItem.')))
          ELSE j END
      )::text AS normalized FROM (SELECT to_jsonb(t) j FROM public.${quote(tablename)} t) data`, [tablename]);
    const normalized = data.rows.map(row => row.normalized).sort();
    result.push({ table: renamed(tablename), count: data.rowCount ?? 0,
      digest: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
      rows: data.rows.map(row => row.raw) });
  }
  return result.sort((a, b) => a.table.localeCompare(b.table));
}
const summary = (items: Snapshot[]) => items.map(({ table, count, digest }) => ({ table, count, digest }));

async function verify(client: Client) {
  const remaining = await client.query(`
    SELECT 'table' kind, tablename name FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'Deliverable%'
    UNION ALL SELECT 'column', table_name || '.' || column_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='deliverableId'
    UNION ALL SELECT 'index', indexname FROM pg_indexes WHERE schemaname='public' AND indexname ~ '[Dd]eliverable'
      AND (tablename LIKE 'WorkItem%' OR tablename='PlannedWorkEntry')
    UNION ALL SELECT 'constraint', c.conname FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
      JOIN pg_class t ON t.oid=c.conrelid
      WHERE n.nspname='public' AND c.conname ~ '[Dd]eliverable'
      AND (t.relname LIKE 'WorkItem%' OR t.relname='PlannedWorkEntry')
    UNION ALL SELECT 'type', t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' AND t.typname LIKE '%Deliverable%'
  `);
  if (remaining.rowCount) throw new Error(`旧结构名称仍存在：${JSON.stringify(remaining.rows)}`);
  const options = await client.query(`SELECT to_regclass('public."SelectOption"') AS name`);
  if (options.rows[0].name) {
    const old = await client.query(`SELECT count(*)::int n FROM public."SelectOption" WHERE field LIKE 'briefDeliverable.%'`);
    if (old.rows[0].n) throw new Error('旧选项分类仍存在');
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('缺少 DATABASE_URL');
  if ([execute, rehearse, verifyOnly].filter(Boolean).length > 1) throw new Error('执行、演练、验证参数只能选择一个');
  const url = new URL(process.env.DATABASE_URL);
  console.log(JSON.stringify({ host: url.hostname, database: url.pathname, mode: execute ? '执行' : rehearse ? '演练并回滚' : verifyOnly ? '验证' : '预检' }));
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    if (verifyOnly) { await verify(client); console.log(JSON.stringify(summary(await snapshot(client)), null, 2)); return; }
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('rename-deliverables-to-work-items'))");
      const before = await snapshot(client);
      console.log(JSON.stringify(summary(before), null, 2));
      if (!execute && !rehearse) { await client.query('ROLLBACK'); return; }
      if (execute && !process.argv.includes('--deployment')) {
        await mkdir('.db-sync', { recursive: true });
        const backup = path.join('.db-sync', `before-work-item-rename-${Date.now()}.json`);
        await writeFile(backup, JSON.stringify(before), { mode: 0o600 });
        console.log(`本地数据快照：${backup}`);
      }
      await client.query(await readFile(migrationPath, 'utf8'));
      await verify(client);
      const after = await snapshot(client);
      if (JSON.stringify(summary(before)) !== JSON.stringify(summary(after))) throw new Error('重命名前后数据摘要不一致，自动回滚');
      await client.query(execute ? 'COMMIT' : 'ROLLBACK');
      console.log(`核验通过：${after.length} 张表的记录数与内容摘要一致；${execute ? '已提交数据库事务' : '演练已回滚'}`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : '重命名失败'); process.exitCode = 1; });
