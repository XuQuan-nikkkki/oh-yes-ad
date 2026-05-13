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

async function main() {
  await seedRoles();
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
