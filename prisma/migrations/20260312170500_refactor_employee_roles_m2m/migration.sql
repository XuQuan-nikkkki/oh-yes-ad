CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_code_key" ON "Role"("code");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Employee' AND column_name = 'role'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeRole') THEN
      ALTER TABLE "Employee"
      ALTER COLUMN "role" TYPE TEXT USING "role"::text;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeRole') THEN
    DROP TYPE "EmployeeRole";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "EmployeeRole" (
  "employeeId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeRole_pkey" PRIMARY KEY ("employeeId", "roleId")
);

CREATE INDEX IF NOT EXISTS "EmployeeRole_roleId_idx" ON "EmployeeRole"("roleId");

ALTER TABLE "EmployeeRole"
  DROP CONSTRAINT IF EXISTS "EmployeeRole_employeeId_fkey",
  ADD CONSTRAINT "EmployeeRole_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeRole"
  DROP CONSTRAINT IF EXISTS "EmployeeRole_roleId_fkey",
  ADD CONSTRAINT "EmployeeRole_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "code", "name", "updatedAt") VALUES
  ('role_admin', 'ADMIN', '管理员', NOW()),
  ('role_project_manager', 'PROJECT_MANAGER', '项目经理', NOW()),
  ('role_hr', 'HR', '人事', NOW()),
  ('role_finance', 'FINANCE', '财务', NOW()),
  ('role_designer', 'DESIGNER', '设计师', NOW())
ON CONFLICT ("code") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Employee' AND column_name = 'role'
  ) THEN
    INSERT INTO "EmployeeRole" ("employeeId", "roleId")
    SELECT e."id", r."id"
    FROM "Employee" e
    JOIN "Role" r ON r."code" = e."role"::text
    ON CONFLICT ("employeeId", "roleId") DO NOTHING;
  END IF;
END $$;

INSERT INTO "EmployeeRole" ("employeeId", "roleId")
SELECT e."id", r."id"
FROM "Employee" e
JOIN "Role" r ON r."code" = 'DESIGNER'
LEFT JOIN "EmployeeRole" er ON er."employeeId" = e."id"
WHERE er."employeeId" IS NULL
ON CONFLICT ("employeeId", "roleId") DO NOTHING;

ALTER TABLE "Employee" DROP COLUMN IF EXISTS "role";
