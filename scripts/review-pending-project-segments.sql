-- 查看当前所有“待启动”项目环节
-- 只读查询，不会修改数据。

SELECT
  project."name" AS "项目",
  segment."name" AS "环节",
  segment_status."value" AS "环节状态",
  owner."name" AS "环节负责人",
  segment."startDate" AS "开始日期",
  segment."endDate" AS "结束日期",
  COUNT(task."id") AS "任务数量",
  COUNT(task."id") FILTER (WHERE task."ownerId" IS NULL) AS "无负责人任务数",
  segment."id" AS "环节ID",
  project."id" AS "项目ID"
FROM "ProjectSegment" AS segment
JOIN "Project" AS project
  ON project."id" = segment."projectId"
JOIN "SelectOption" AS segment_status
  ON segment_status."id" = segment."statusOptionId"
LEFT JOIN "Employee" AS owner
  ON owner."id" = segment."ownerId"
LEFT JOIN "ProjectTask" AS task
  ON task."segmentId" = segment."id"
WHERE
  segment_status."field" = 'projectSegment.status'
  AND segment_status."value" = '待启动'
GROUP BY
  project."name",
  segment."name",
  segment_status."value",
  owner."name",
  segment."startDate",
  segment."endDate",
  segment."id",
  project."id",
  segment."createdAt"
ORDER BY
  project."name",
  segment."startDate" NULLS LAST,
  segment."createdAt";
