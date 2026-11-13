import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".db-sync/sync.env" });
if (!process.env.TEST_URL) throw new Error("缺少 .db-sync/sync.env 中的 TEST_URL");

const connectionUrl = new URL(process.env.TEST_URL);
if (connectionUrl.hostname === "host.docker.internal") connectionUrl.hostname = "localhost";

const main = async () => {
  const client = new Client({ connectionString: connectionUrl.toString() });
  await client.connect();
  try {
    const result = await client.query(`
      WITH reviewer_ids AS (
        SELECT
          (
            SELECT e.id
            FROM "Employee" e
            JOIN "SelectOption" p ON p.id = e."positionOptionId"
            LEFT JOIN "SelectOption" employment ON employment.id = e."employmentStatusOptionId"
            WHERE p.value = '美术指导' AND employment.value IS DISTINCT FROM '离职'
            ORDER BY e."createdAt", e.id
            LIMIT 1
          ) AS design_id,
          (
            SELECT e.id
            FROM "Employee" e
            JOIN "SelectOption" f ON f.id = e."functionOptionId"
            JOIN "SelectOption" p ON p.id = e."positionOptionId"
            LEFT JOIN "SelectOption" employment ON employment.id = e."employmentStatusOptionId"
            WHERE f.value = '品牌组' AND p.value = '文案策划'
              AND employment.value IS DISTINCT FROM '离职'
            ORDER BY e."createdAt", e.id
            LIMIT 1
          ) AS copy_id,
          (
            SELECT e.id
            FROM "Employee" e
            JOIN "SelectOption" f ON f.id = e."functionOptionId"
            LEFT JOIN "SelectOption" employment ON employment.id = e."employmentStatusOptionId"
            WHERE f.value = '新媒体' AND employment.value IS DISTINCT FROM '离职'
            ORDER BY e."createdAt", e.id
            LIMIT 1
          ) AS new_media_id
      ),
      brief_check AS (
        SELECT b.*, s.name AS source_name, s."ownerId" AS source_owner,
          s."projectId" AS source_project, s."createdAt" AS source_created,
          s."updatedAt" AS source_updated,
          CASE
            WHEN status.value = '暂停' THEN 'paused'
            WHEN status.value = '已完成' THEN 'completed'
            WHEN NOT EXISTS (
              SELECT 1 FROM "ProjectTask" task
              WHERE task."segmentId" = s.id AND task."ownerId" IS NULL
            ) THEN 'in_progress'
            ELSE 'waiting_assignment'
          END AS expected_status
        FROM "Brief" b
        JOIN "ProjectSegment" s ON s.id = b."legacySegmentId"
        LEFT JOIN "SelectOption" status ON status.id = s."statusOptionId"
      ),
      workItem_check AS (
        SELECT d.*, task.name AS source_name, task."ownerId" AS source_owner,
          task."creatorId" AS source_creator, task."dueDate",
          task."createdAt" AS source_created, task."updatedAt" AS source_updated,
          segment."endDate", segment."startDate", project."ownerId" AS project_owner,
          function.value AS function_name, task_status.value AS source_status,
          CASE
            WHEN function.value = '品牌组' THEN 'COPY'
            WHEN function.value = '项目组' THEN 'PROJECT_MANAGEMENT'
            WHEN function.value = '新媒体' THEN 'NEW_MEDIA'
            ELSE 'DESIGN'
          END AS expected_type,
          CASE task_status.value
            WHEN '待推进' THEN 'pending'
            WHEN '进行中' THEN 'in_progress'
            WHEN '已完成' THEN 'completed'
            WHEN '暂停' THEN 'paused'
          END AS expected_status,
          CASE
            WHEN function.value IN ('设计组', '空间组') THEN reviewers.design_id
            WHEN function.value = '品牌组' THEN reviewers.copy_id
            WHEN function.value = '新媒体' THEN reviewers.new_media_id
            ELSE project."ownerId"
          END AS expected_reviewer
        FROM "WorkItem" d
        JOIN "ProjectTask" task ON task.id = d."legacyTaskId"
        JOIN "ProjectSegment" segment ON segment.id = task."segmentId"
        JOIN "Project" project ON project.id = segment."projectId"
        JOIN "Employee" owner ON owner.id = task."ownerId"
        LEFT JOIN "SelectOption" function ON function.id = owner."functionOptionId"
        LEFT JOIN "SelectOption" task_status ON task_status.id = task."statusOptionId"
        CROSS JOIN reviewer_ids reviewers
      )
      SELECT
        (SELECT COUNT(*) FROM "Brief") AS briefs,
        (SELECT COUNT(*) FROM "WorkItem") AS workItems,
        (SELECT COUNT(*) FROM brief_check WHERE
          title <> source_name OR description <> '' OR "ownerId" <> source_owner
          OR "projectId" <> source_project OR status <> expected_status
          OR "createdAt" <> source_created OR "updatedAt" <> source_updated
        ) AS brief_field_mismatches,
        (SELECT COUNT(*) FROM workItem_check WHERE
          title <> source_name OR description <> '' OR "assigneeId" <> source_owner
          OR type <> expected_type OR status <> expected_status
          OR "reviewerId" <> expected_reviewer
          OR "creatorId" <> COALESCE(source_creator, 'system-historical-data')
          OR "createdAt" <> source_created OR "updatedAt" <> source_updated
          OR "finalAt" <> COALESCE("dueDate", "endDate", "startDate", source_created)::date
          OR "firstDraftAt" IS NOT NULL OR "revisionAt" IS NOT NULL
        ) AS workItem_field_mismatches,
        (SELECT COUNT(*) FROM "PlannedWorkEntry" work
          JOIN "ProjectTask" task ON task.id = work."taskId"
          LEFT JOIN "WorkItem" d ON d."legacyTaskId" = task.id
          WHERE (d.id IS NOT NULL AND work."workItemId" IS DISTINCT FROM d.id)
             OR (d.id IS NULL AND work."workItemId" IS NOT NULL)
        ) AS work_entry_link_mismatches,
        (SELECT COUNT(*) FROM "WorkItemAssignmentHistory") AS assignment_histories,
        (SELECT COUNT(*) FROM "WorkItemFormatOption") AS format_options,
        (SELECT COUNT(*) FROM "WorkItemCategoryOrSceneOption") AS category_options,
        (SELECT COUNT(*) FROM "Brief" b WHERE NOT EXISTS (
          SELECT 1 FROM "WorkItem" d WHERE d."briefId" = b.id
        )) AS empty_briefs,
        (SELECT COUNT(*) FROM "Brief" WHERE "legacySegmentId" IS NULL) AS briefs_without_legacy_id,
        (SELECT COUNT(*) FROM "WorkItem" WHERE "legacyTaskId" IS NULL) AS workItems_without_legacy_id,
        (SELECT COUNT(*) - COUNT(DISTINCT "legacySegmentId") FROM "Brief") AS duplicate_legacy_segments,
        (SELECT COUNT(*) - COUNT(DISTINCT "legacyTaskId") FROM "WorkItem") AS duplicate_legacy_tasks
    `);
    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
