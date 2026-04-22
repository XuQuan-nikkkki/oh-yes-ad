import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  EXECUTION_COST_FIELD as FIELD,
  EXECUTION_COST_TYPE_OPTIONS,
} from "../src/lib/execution-cost";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PALETTE = [
  "#1677ff",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#faad14",
  "#2f54eb",
  "#a0d911",
  "#d4380d",
  "#08979c",
  "#7cb305",
] as const;

const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

async function main() {
  let created = 0;
  let existed = 0;

  for (const [index, value] of EXECUTION_COST_TYPE_OPTIONS.entries()) {
    const existing = await prisma.selectOption.findUnique({
      where: {
        field_value: {
          field: FIELD,
          value,
        },
      },
      select: { id: true },
    });

    if (existing) {
      existed += 1;
      continue;
    }

    await prisma.selectOption.create({
      data: {
        field: FIELD,
        value,
        color: randomColor(),
        order: index + 1,
      },
    });
    created += 1;
  }

  console.log(
    `ProjectCostEstimation 执行费用类别已处理：新增 ${created} 条，已存在 ${existed} 条。`,
  );
}

main()
  .catch((error) => {
    console.error("写入执行费用类别失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
