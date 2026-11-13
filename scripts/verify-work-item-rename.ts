// 在当前本地测试库的事务中创建临时样例，验证重命名、唯一约束和级联删除，最后始终回滚。
import { loadEnvConfig } from '@next/env';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
loadEnvConfig(process.cwd(), true);

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error('此验证仅允许本地测试库');
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    const old = (await client.query(`SELECT to_regclass('public."Deliverable"') AS name`)).rows[0].name;
    const prefix = old ? 'Deliverable' : 'WorkItem';
    const fk = old ? 'deliverableId' : 'workItemId';
    const id = randomUUID();
    const employee = (await client.query(`INSERT INTO "${prefix}"
      SELECT (jsonb_populate_record(NULL::"${prefix}", to_jsonb(t) || jsonb_build_object('id', $1::text, 'legacyTaskId', NULL))).*
      FROM "${prefix}" t LIMIT 1 RETURNING "reviewerId"`, [id])).rows[0]?.reviewerId;
    assert.ok(employee, '需要至少一条现有工作项作为合法字段样例');
    const versions = [randomUUID(), randomUUID()];
    const resource = randomUUID(), feedback = randomUUID(), image = randomUUID(), adjustment = randomUUID(), adjustmentImage = randomUUID(), check = randomUUID();
    for (const [index, version] of versions.entries()) await client.query(`INSERT INTO "${prefix}Submission"
      (id,"${fk}","versionNumber","isFinal","submittedById","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())`, [version,id,index+1,index===1,employee]);
    await client.query(`INSERT INTO "${prefix}SubmissionResource" (id,"submissionId",kind,url,"uploadedById","updatedAt") VALUES ($1,$2,'SOURCE','https://example.com/source.zip',$3,NOW())`, [resource, versions[1], employee]);
    await client.query(`INSERT INTO "${prefix}Feedback" (id,"submissionId",content,"recordedById","updatedAt") VALUES ($1,$2,'重命名验证',$3,NOW())`, [feedback,versions[0],employee]);
    await client.query(`INSERT INTO "${prefix}FeedbackImage" (id,"feedbackId",url) VALUES ($1,$2,'https://example.com/image.png')`, [image, feedback]);
    await client.query(`INSERT INTO "${prefix}AdjustmentItem" (id,"feedbackId",title,"updatedAt") VALUES ($1,$2,'调整项',NOW())`, [adjustment,feedback]);
    await client.query(`INSERT INTO "${prefix}AdjustmentItemImage" (id,"adjustmentItemId",url) VALUES ($1,$2,'https://example.com/image.png')`, [adjustmentImage, adjustment]);
    await client.query(`INSERT INTO "${prefix}AdjustmentCheck" (id,"submissionId","adjustmentItemId","checkedById") VALUES ($1,$2,$3,$4)`, [check,versions[1],adjustment,employee]);

    const sql = await readFile('prisma/migrations/20260908140000_rename_deliverables_to_work_items/migration.sql','utf8');
    await client.query(sql);
    await client.query(sql); // 重复执行不应改变记录或失败。
    const chain = await client.query(`SELECT r.url, f.content, a.title, c.id FROM "WorkItemSubmission" s
      JOIN "WorkItemSubmissionResource" r ON r."submissionId"=s.id
      JOIN "WorkItemAdjustmentCheck" c ON c."submissionId"=s.id
      JOIN "WorkItemAdjustmentItem" a ON a.id=c."adjustmentItemId"
      JOIN "WorkItemFeedback" f ON f.id=a."feedbackId"
      JOIN "WorkItemFeedbackImage" fi ON fi."feedbackId"=f.id
      JOIN "WorkItemAdjustmentItemImage" ai ON ai."adjustmentItemId"=a.id
      WHERE s."workItemId"=$1`, [id]);
    assert.equal(chain.rowCount,1);
    assert.equal(chain.rows[0].content,'重命名验证');
    async function rejected(sql: string, params: unknown[], code: string) {
      await client.query('SAVEPOINT expected_failure');
      await assert.rejects(client.query(sql,params), (error: {code?: string}) => error.code === code);
      await client.query('ROLLBACK TO SAVEPOINT expected_failure');
    }
    await rejected('UPDATE "WorkItemSubmission" SET "isFinal"=true WHERE id=$1', [versions[0]], '23505');
    await rejected('UPDATE "WorkItemSubmission" SET "versionNumber"=2 WHERE id=$1', [versions[0]], '23505');
    await rejected('UPDATE "WorkItemSubmission" SET "workItemId"=$1 WHERE id=$2', [randomUUID(),versions[0]], '23503');
    await client.query('DELETE FROM "WorkItem" WHERE id=$1',[id]);
    for (const [table, rowId] of [ ['WorkItemSubmission',versions[0]], ['WorkItemSubmission',versions[1]],
      ['WorkItemSubmissionResource',resource], ['WorkItemFeedback',feedback], ['WorkItemFeedbackImage',image],
      ['WorkItemAdjustmentItem',adjustment], ['WorkItemAdjustmentItemImage',adjustmentImage], ['WorkItemAdjustmentCheck',check] ]) {
      assert.equal((await client.query(`SELECT id FROM "${table}" WHERE id=$1`,[rowId])).rowCount,0);
    }
    console.log('通过：多版本、源文件、反馈、图片、调整确认关系；重复迁移；最终版与版本号唯一约束；外键；级联删除。全部测试数据及 DDL 将回滚。');
  } finally { await client.query('ROLLBACK'); await client.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : '验证失败'); process.exitCode=1; });
