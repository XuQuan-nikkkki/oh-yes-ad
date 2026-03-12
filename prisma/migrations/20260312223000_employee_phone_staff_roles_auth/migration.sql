ALTER TABLE "Employee"
ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_phone_key" ON "Employee"("phone");

INSERT INTO "Role" ("id", "code", "name", "updatedAt") VALUES
  ('role_staff', 'STAFF', '员工', NOW()),
  ('role_admin', 'ADMIN', '管理员', NOW()),
  ('role_project_manager', 'PROJECT_MANAGER', '项目经理', NOW()),
  ('role_hr', 'HR', '人事', NOW()),
  ('role_finance', 'FINANCE', '财务', NOW())
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "EmployeeRole" ("employeeId", "roleId")
SELECT er."employeeId", staff."id"
FROM "EmployeeRole" er
JOIN "Role" designer ON designer."id" = er."roleId" AND designer."code" = 'DESIGNER'
JOIN "Role" staff ON staff."code" = 'STAFF'
ON CONFLICT ("employeeId", "roleId") DO NOTHING;

DELETE FROM "EmployeeRole"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "code" = 'DESIGNER');

DELETE FROM "Role" WHERE "code" = 'DESIGNER';

INSERT INTO "EmployeeRole" ("employeeId", "roleId")
SELECT e."id", staff."id"
FROM "Employee" e
JOIN "Role" staff ON staff."code" = 'STAFF'
LEFT JOIN "EmployeeRole" er ON er."employeeId" = e."id"
WHERE er."employeeId" IS NULL
ON CONFLICT ("employeeId", "roleId") DO NOTHING;
