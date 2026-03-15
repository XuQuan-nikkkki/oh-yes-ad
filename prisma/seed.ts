import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLE_SEEDS = [
  { id: "role_admin", code: "ADMIN", name: "管理员" },
  { id: "role_project_manager", code: "PROJECT_MANAGER", name: "项目经理" },
  { id: "role_hr", code: "HR", name: "人事" },
  { id: "role_finance", code: "FINANCE", name: "财务" },
  { id: "role_staff", code: "STAFF", name: "员工" },
] as const;

async function seedRoles() {
  for (const role of ROLE_SEEDS) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: {
        id: role.id,
        code: role.code,
        name: role.name,
      },
      update: {
        name: role.name,
      },
    });
  }
}

async function replaceDesignerWithStaff() {
  const staff = await prisma.role.findUnique({ where: { code: "STAFF" }, select: { id: true } });
  const designer = await prisma.role.findUnique({ where: { code: "DESIGNER" }, select: { id: true } });

  if (!staff || !designer) return;

  const designerLinks = await prisma.employeeRole.findMany({
    where: { roleId: designer.id },
    select: { employeeId: true },
  });

  if (designerLinks.length > 0) {
    await prisma.employeeRole.createMany({
      data: designerLinks.map((link) => ({ employeeId: link.employeeId, roleId: staff.id })),
      skipDuplicates: true,
    });
  }

  await prisma.employeeRole.deleteMany({ where: { roleId: designer.id } });
  await prisma.role.delete({ where: { id: designer.id } });
}

async function ensureDefaultStaffRole() {
  const staff = await prisma.role.findUnique({ where: { code: "STAFF" }, select: { id: true } });
  if (!staff) return;

  const employeesWithoutRoles = await prisma.employee.findMany({
    where: { roles: { none: {} } },
    select: { id: true },
  });

  if (employeesWithoutRoles.length === 0) return;

  await prisma.employeeRole.createMany({
    data: employeesWithoutRoles.map((employee) => ({ employeeId: employee.id, roleId: staff.id })),
    skipDuplicates: true,
  });
}

async function grantAdminToXiaoHua() {
  const admin = await prisma.role.findUnique({ where: { code: "ADMIN" }, select: { id: true } });
  if (!admin) return;

  const employees = await prisma.employee.findMany({
    where: { name: "小花" },
    select: { id: true },
  });

  for (const employee of employees) {
    await prisma.employeeRole.upsert({
      where: {
        employeeId_roleId: {
          employeeId: employee.id,
          roleId: admin.id,
        },
      },
      create: {
        employeeId: employee.id,
        roleId: admin.id,
      },
      update: {},
    });
  }
}

async function ensureEmployeePhones() {
  await prisma.employee.updateMany({
    where: { name: "小花" },
    data: { phone: "18600404232" },
  });

  await prisma.employee.updateMany({
    where: { name: "珠珠" },
    data: { phone: "18600404233" },
  });
}

async function main() {
  await seedRoles();
  await replaceDesignerWithStaff();
  await ensureDefaultStaffRole();
  await grantAdminToXiaoHua();
  await ensureEmployeePhones();
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
