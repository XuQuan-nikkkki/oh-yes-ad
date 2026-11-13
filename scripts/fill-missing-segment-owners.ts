import { config } from "dotenv";
import { Client } from "pg";

config();
if (process.argv.includes("--test")) config({ path: ".db-sync/sync.env" });

const configuredConnectionString = process.argv.includes("--test")
  ? process.env.TEST_URL
  : process.env.DATABASE_URL;
if (!configuredConnectionString) {
  throw new Error(process.argv.includes("--test") ? "缺少 TEST_URL" : "缺少 DATABASE_URL");
}
if (!process.argv.includes("--execute")) {
  throw new Error("该命令会修改环节负责人，必须显式传入 --execute");
}

const connectionUrl = new URL(configuredConnectionString);
if (process.argv.includes("--test") && connectionUrl.hostname === "host.docker.internal") {
  connectionUrl.hostname = "localhost";
}

const main = async () => {
  const client = new Client({ connectionString: connectionUrl.toString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    const missingProjectOwner = await client.query(`
      SELECT segment.id, segment.name, project.name AS project_name
      FROM "ProjectSegment" segment
      JOIN "Project" project ON project.id = segment."projectId"
      WHERE segment."ownerId" IS NULL AND project."ownerId" IS NULL
    `);
    if (missingProjectOwner.rowCount) {
      throw new Error(`仍有 ${missingProjectOwner.rowCount} 个环节所属项目没有负责人，已中止`);
    }

    const updated = await client.query(`
      UPDATE "ProjectSegment" AS segment
      SET "ownerId" = project."ownerId", "updatedAt" = NOW()
      FROM "Project" AS project
      WHERE segment."projectId" = project.id
        AND segment."ownerId" IS NULL
        AND project."ownerId" IS NOT NULL
      RETURNING segment.id, segment.name, segment."ownerId"
    `);
    await client.query("COMMIT");
    console.log(JSON.stringify({ updatedSegments: updated.rowCount }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
