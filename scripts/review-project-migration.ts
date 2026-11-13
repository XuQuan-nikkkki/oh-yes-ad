import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".db-sync/sync.env" });
if (!process.env.TEST_URL) throw new Error("缺少 .db-sync/sync.env 中的 TEST_URL");

const keyword = process.argv.slice(2).join(" ").trim();
if (!keyword) throw new Error("请提供项目名关键词或 --missing-segment-owners");

const connectionUrl = new URL(process.env.TEST_URL);
if (connectionUrl.hostname === "host.docker.internal") connectionUrl.hostname = "localhost";

const main = async () => {
  const client = new Client({ connectionString: connectionUrl.toString() });
  await client.connect();
  try {
    if (keyword === "--missing-segment-owners") {
      const result = await client.query(`
        SELECT project.id AS project_id, project.name AS project_name,
          project."ownerId" AS project_owner_id, project_owner.name AS project_owner_name,
          segment.id AS segment_id, segment.name AS segment_name,
          segment_status.value AS segment_status
        FROM "ProjectSegment" segment
        JOIN "Project" project ON project.id = segment."projectId"
        LEFT JOIN "Employee" project_owner ON project_owner.id = project."ownerId"
        LEFT JOIN "SelectOption" segment_status ON segment_status.id = segment."statusOptionId"
        WHERE segment."ownerId" IS NULL
        ORDER BY project.name, segment."createdAt", segment.name
      `);
      console.log(JSON.stringify(result.rows, null, 2));
      return;
    }

    const result = await client.query(
      `
        SELECT p.id AS project_id, p.name AS project_name,
          segment.id AS segment_id, segment.name AS segment_name,
          segment_status.value AS segment_status,
          segment."ownerId" AS segment_owner_id, owner.name AS segment_owner_name,
          brief.id AS brief_id, brief.status AS brief_status, brief.title AS brief_title,
          COUNT(task.id)::int AS task_count,
          COUNT(task.id) FILTER (WHERE task."ownerId" IS NULL)::int AS tasks_without_owner
        FROM "Project" p
        JOIN "ProjectSegment" segment ON segment."projectId" = p.id
        LEFT JOIN "SelectOption" segment_status ON segment_status.id = segment."statusOptionId"
        LEFT JOIN "Employee" owner ON owner.id = segment."ownerId"
        LEFT JOIN "Brief" brief ON brief."legacySegmentId" = segment.id
        LEFT JOIN "ProjectTask" task ON task."segmentId" = segment.id
        WHERE p.name ILIKE $1
        GROUP BY p.id, p.name, segment.id, segment.name, segment_status.value,
          segment."ownerId", owner.name, brief.id, brief.status, brief.title
        ORDER BY segment."createdAt"
      `,
      [`%${keyword}%`],
    );
    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
