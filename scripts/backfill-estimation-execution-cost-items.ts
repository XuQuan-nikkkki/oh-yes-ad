import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  try {
    const inserted = await prisma.$executeRawUnsafe(`
      INSERT INTO "ProjectCostEstimationExecutionCostItem"
        ("id", "costEstimationId", "costTypeOptionId", "requestedAmount", "updatedAt")
      SELECT gen_random_uuid()::text, legacy."A", legacy."B", NULL, CURRENT_TIMESTAMP
      FROM "_ProjectCostEstimationExecutionCostTypes" AS legacy
      ON CONFLICT ("costEstimationId", "costTypeOptionId") DO NOTHING
    `);
    console.log(`已回填 ${inserted} 条历史执行费用类别，申请金额保持为空。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("回填历史执行费用类别失败:", error);
  process.exitCode = 1;
});
