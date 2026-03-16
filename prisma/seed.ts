import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLE_SEEDS = [
  { code: "ADMIN", name: "管理员" },
  { code: "PROJECT_MANAGER", name: "项目经理" },
  { code: "HR", name: "人事" },
  { code: "FINANCE", name: "财务" },
  { code: "STAFF", name: "员工" },
] as const;

async function seedRoles() {
  for (const role of ROLE_SEEDS) {
    const exists = await prisma.role.findUnique({
      where: { code: role.code },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.role.create({
      data: {
        code: role.code,
        name: role.name,
      },
    });
  }
}

async function ensureXiaoHua() {
  const TARGET_NAME = "小花";
  const TARGET_PHONE = "18600404232";
  const REQUIRED_ROLE_CODES = ["ADMIN", "STAFF"] as const;

  let xiaoHua = await prisma.employee.findFirst({
    where: { name: TARGET_NAME },
    select: { id: true, phone: true },
  });

  if (!xiaoHua) {
    xiaoHua = await prisma.employee.create({
      data: {
        name: TARGET_NAME,
        phone: TARGET_PHONE,
      },
      select: { id: true, phone: true },
    });
  }

  if (xiaoHua.phone !== TARGET_PHONE) {
    await prisma.employee.update({
      where: { id: xiaoHua.id },
      data: { phone: TARGET_PHONE },
    });
  }

  const requiredRoles = await prisma.role.findMany({
    where: {
      code: {
        in: [...REQUIRED_ROLE_CODES],
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  for (const roleCode of REQUIRED_ROLE_CODES) {
    const role = requiredRoles.find((item) => item.code === roleCode);
    if (!role) continue;
    await prisma.employeeRole.upsert({
      where: {
        employeeId_roleId: {
          employeeId: xiaoHua.id,
          roleId: role.id,
        },
      },
      create: {
        employeeId: xiaoHua.id,
        roleId: role.id,
      },
      update: {},
    });
  }
}

async function main() {
  await seedRoles();
  await ensureXiaoHua();
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
