import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TARGET_FIELDS = [
  "employee.function",
  "employee.departmentLevel1",
  "employee.departmentLevel2",
  "employee.position",
  "employee.employmentType",
  "employee.employmentStatus",
  "leaveRecord.type",
  "workdayAdjustment.changeType",
  "project.type",
  "project.status",
  "project.stage",
  "projectSegment.status",
  "projectDocument.type",
  "projectMilestone.type",
  "projectMilestone.method",
  "plannedWorkEntry.year",
  "plannedWorkEntry.weekNumber",
] as const;

const FIXED_COLORS: Record<string, Record<string, string>> = {
  "employee.employmentStatus": {
    在职: "#52c41a",
    离职: "#8c8c8c",
  },
  "workdayAdjustment.changeType": {
    上班: "#52c41a",
    休息: "#ff4d4f",
    调休: "#fa8c16",
  },
  "project.type": {
    INTERNAL: "#1677ff",
    CLIENT: "#52c41a",
    内部项目: "#1677ff",
    客户项目: "#52c41a",
  },
};

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
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const colorByValue = (field: string, value: string) => {
  const fixed = FIXED_COLORS[field]?.[value];
  if (fixed) return fixed;
  const idx = hashString(`${field}:${value}`) % PALETTE.length;
  return PALETTE[idx];
};

const main = async () => {
  const options = await prisma.selectOption.findMany({
    where: {
      field: {
        in: [...TARGET_FIELDS],
      },
    },
    orderBy: [{ field: "asc" }, { order: "asc" }, { value: "asc" }],
  });

  const grouped = new Map<string, typeof options>();
  for (const option of options) {
    const list = grouped.get(option.field) ?? [];
    list.push(option);
    grouped.set(option.field, list);
  }

  let updated = 0;
  for (const [field, list] of grouped.entries()) {
    for (const [index, option] of list.entries()) {
      const color = colorByValue(field, option.value);
      await prisma.selectOption.update({
        where: { id: option.id },
        data: {
          color,
          order: index + 1,
        },
      });
      updated += 1;
    }
  }

  console.log(`已同步颜色/排序，共更新 ${updated} 条 option`);
};

main()
  .catch((error) => {
    console.error("同步失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
