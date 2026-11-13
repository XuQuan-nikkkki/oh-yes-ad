-- 工作项类型迁移前数据复核：项目组、空间组、无负责人任务
-- 只读查询，不会修改数据。

SELECT
  CASE
    WHEN owner."id" IS NULL THEN '无负责人'
    ELSE COALESCE(owner_function."value", '未设置职能')
  END AS "分组",
  project."name" AS "项目",
  segment."name" AS "环节",
  task."name" AS "任务",
  owner."name" AS "负责人",
  owner_function."value" AS "负责人职能",
  owner_position."value" AS "负责人职位",
  task_status."value" AS "任务状态",
  task."dueDate" AS "截止日期",
  task."id" AS "任务ID",
  segment."id" AS "环节ID",
  project."id" AS "项目ID"
FROM "ProjectTask" AS task
JOIN "ProjectSegment" AS segment
  ON segment."id" = task."segmentId"
JOIN "Project" AS project
  ON project."id" = segment."projectId"
LEFT JOIN "Employee" AS owner
  ON owner."id" = task."ownerId"
LEFT JOIN "SelectOption" AS owner_function
  ON owner_function."id" = owner."functionOptionId"
LEFT JOIN "SelectOption" AS owner_position
  ON owner_position."id" = owner."positionOptionId"
LEFT JOIN "SelectOption" AS task_status
  ON task_status."id" = task."statusOptionId"
WHERE
  task."ownerId" IS NULL
  OR owner_function."value" IN ('项目组', '空间组')
ORDER BY
  CASE
    WHEN owner."id" IS NULL THEN 3
    WHEN owner_function."value" = '项目组' THEN 1
    WHEN owner_function."value" = '空间组' THEN 2
    ELSE 4
  END,
  project."name",
  segment."name",
  task."createdAt";
