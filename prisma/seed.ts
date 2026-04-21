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

const SYSTEM_SETTING_SEEDS = [
  {
    key: "employee.defaultWorkstationCost",
    name: "员工默认工位费",
    group: "employee",
    value: "116.91",
    valueType: "number",
    unit: "元",
    description: "新增员工时默认写入的工位费，也用于统一计算租金成本。",
    order: 10,
  },
  {
    key: "employee.defaultUtilityCost",
    name: "员工默认水电费",
    group: "employee",
    value: "24.94",
    valueType: "number",
    unit: "元",
    description: "新增员工时默认写入的水电费，也用于统一计算租金成本。",
    order: 20,
  },
  {
    key: "employee.monthlyWorkdayBase",
    name: "员工月基准工作日",
    group: "employee",
    value: "21.75",
    valueType: "number",
    unit: "天",
    description: "用于把员工月度人力成本和租金成本平摊到日成本的基准天数。",
    order: 30,
  },
  {
    key: "pricing.laborCostRateWarning",
    name: "人力成本率预警线",
    group: "pricing",
    value: "35",
    valueType: "percent",
    unit: "%",
    description: "报价参考中，人力成本率超过该阈值时高亮提示。",
    order: 10,
  },
  {
    key: "pricing.projectCostBaselineRatio",
    name: "项目费用成本基准率",
    group: "pricing",
    value: "53",
    valueType: "percent",
    unit: "%",
    description: "报价参考中用于计算成本基准参考的比例。",
    order: 20,
  },
  {
    key: "pricing.middleOfficeAverageMonthlyCost",
    name: "中台月均成本",
    group: "pricing",
    value: "16367.76",
    valueType: "number",
    unit: "元",
    description: "用于计算中台成本的月均值。",
    order: 30,
  },
  {
    key: "pricing.middleOfficeBaseDays",
    name: "中台成本基准天数",
    group: "pricing",
    value: "30",
    valueType: "number",
    unit: "天",
    description: "用于把中台月均成本换算成日成本的基准天数。",
    order: 40,
  },
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

async function seedSystemSettings() {
  for (const setting of SYSTEM_SETTING_SEEDS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        name: setting.name,
        group: setting.group,
        value: setting.value,
        valueType: setting.valueType,
        unit: setting.unit,
        description: setting.description,
        order: setting.order,
      },
      create: {
        ...setting,
      },
    });
  }
}

async function main() {
  await seedRoles();
  await seedSystemSettings();
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
