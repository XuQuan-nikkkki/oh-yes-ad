import "dotenv/config";
import {
  DatabaseObjectResponse,
  Client as NotionClient,
  PageObjectResponse,
} from "@notionhq/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { syncClientContacts, syncClients } from "./migrate-clients";
import { syncLegalEntities } from "./migrate-companies";
import {
  syncEmployees,
  syncEmployeeSalaries,
  syncLeaveRecords,
} from "./migrate-employees";
import {
  syncProjectDocuments,
  syncProjectMilestones,
  syncProjects,
  syncProjectSegments,
  syncProjectTasks,
} from "./migrate-projects";
import { syncVendors } from "./migrate-vendors";
import {
  syncActualWorkEntries,
  syncPlannedWorkEntries,
} from "./migrate-work-entries";
import { syncWorkdayAdjustments } from "./migrate-workday-adjustment";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});

const notion = new NotionClient({
  auth: process.env.NOTION_TOKEN,
});

const notionColorToHex: Record<string, string> = {
  default: "#d9d9d9",
  gray: "#8c8c8c",
  brown: "#8b5e3c",
  orange: "#fa8c16",
  yellow: "#faad14",
  green: "#52c41a",
  blue: "#1677ff",
  purple: "#722ed1",
  pink: "#eb2f96",
  red: "#ff4d4f",
};

const normalizeNotionColor = (color?: string | null) => {
  if (!color) return notionColorToHex.default;
  if (color.startsWith("#")) return color;
  return notionColorToHex[color] ?? notionColorToHex.default;
};

type NotionSelectOption = {
  name?: string;
  color?: string | null;
};

type NotionPropertyWithOptions = {
  type?: string;
  select?: {
    options?: NotionSelectOption[];
  };
  multi_select?: {
    options?: NotionSelectOption[];
  };
  status?: {
    options?: NotionSelectOption[];
  };
};

type SelectOptionFieldConfig = {
  optionField: string;
  notionNames: string[];
  supportedTypes: Array<"select" | "multi_select" | "status">;
};

type SelectOptionDataSourceConfig = {
  envVar: string;
  label: string;
  fields: SelectOptionFieldConfig[];
};

const getDataSourceIdByDbId = async (databaseId: string) => {
  const database = await notion.databases.retrieve({
    database_id: databaseId,
  });

  const dataSourceId = (database as DatabaseObjectResponse).data_sources?.[0]
    ?.id;

  if (!dataSourceId) {
    throw new Error("No data_source_id found");
  }

  return dataSourceId;
};

const getDataSourceResults = async (databaseId: string) => {
  const dataSourceId = await getDataSourceIdByDbId(databaseId);

  let cursor: string | undefined = undefined;
  let allResults: PageObjectResponse[] = [];

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });

    allResults = allResults.concat(response.results as PageObjectResponse[]);

    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  return allResults;
};

const getDataSourceProperties = async (databaseId: string) => {
  const dataSourceId = await getDataSourceIdByDbId(databaseId);
  const response = await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  });
  return response.properties;
};

const NOTION_SELECT_OPTION_CONFIGS: SelectOptionDataSourceConfig[] = [
  {
    envVar: "NOTION_CLIENT_DB_ID",
    label: "客户",
    fields: [
      {
        optionField: "client.industry",
        notionNames: ["行业"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_EMPLOYEE_DB_ID",
    label: "员工",
    fields: [
      {
        optionField: "employee.function",
        notionNames: ["职能"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_EMPLOYEE_SALARY_DB_ID",
    label: "员工薪酬",
    fields: [
      {
        optionField: "employee.departmentLevel1",
        notionNames: ["一级部门", "一级部门(中心)", "一级部门（中心）"],
        supportedTypes: ["select"],
      },
      {
        optionField: "employee.departmentLevel2",
        notionNames: ["二级部门", "二级部门(部门)", "二级部门（部门）"],
        supportedTypes: ["select"],
      },
      {
        optionField: "employee.position",
        notionNames: ["职位"],
        supportedTypes: ["select"],
      },
      {
        optionField: "employee.employmentType",
        notionNames: ["用工性质"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_LEAVE_DB_ID",
    label: "请假记录",
    fields: [
      {
        optionField: "leaveRecord.type",
        notionNames: ["类型"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_VENDOR_DB_ID",
    label: "供应商",
    fields: [
      {
        optionField: "vendor.vendorType",
        notionNames: ["供应商类型"],
        supportedTypes: ["select"],
      },
      {
        optionField: "vendor.businessType",
        notionNames: ["业务类型"],
        supportedTypes: ["select", "multi_select"],
      },
      {
        optionField: "vendor.services",
        notionNames: ["服务范围"],
        supportedTypes: ["multi_select"],
      },
      {
        optionField: "vendor.cooperationStatus",
        notionNames: ["合作状态"],
        supportedTypes: ["select"],
      },
      {
        optionField: "vendor.rating",
        notionNames: ["综合评级"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_PROJECT_DB_ID",
    label: "项目",
    fields: [
      {
        optionField: "project.status",
        notionNames: ["项目状态"],
        supportedTypes: ["status", "select"],
      },
      {
        optionField: "project.stage",
        notionNames: ["项目阶段"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_PROJECT_SEGMENT_DB_ID",
    label: "项目环节",
    fields: [
      {
        optionField: "projectSegment.status",
        notionNames: ["环节状态"],
        supportedTypes: ["status", "select"],
      },
    ],
  },
  {
    envVar: "NOTION_PROJECT_DOCUMENT_DB_ID",
    label: "项目资料",
    fields: [
      {
        optionField: "projectDocument.type",
        notionNames: ["类型"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_PROJECT_MILESTONE_DB_ID",
    label: "项目里程碑",
    fields: [
      {
        optionField: "projectMilestone.type",
        notionNames: ["类型"],
        supportedTypes: ["select", "status"],
      },
      {
        optionField: "projectMilestone.method",
        notionNames: ["方式"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_PLANNED_WORK_ENTRY_DB_ID",
    label: "计划工时",
    fields: [
      {
        optionField: "plannedWorkEntry.year",
        notionNames: ["年份"],
        supportedTypes: ["select"],
      },
      {
        optionField: "plannedWorkEntry.weekNumber",
        notionNames: ["第n周"],
        supportedTypes: ["select"],
      },
    ],
  },
  {
    envVar: "NOTION_WORKDAY_ADJUSTMENT_DB_ID",
    label: "工作日变动",
    fields: [
      {
        optionField: "workdayAdjustment.changeType",
        notionNames: ["变动类型"],
        supportedTypes: ["select", "status"],
      },
    ],
  },
];

const extractNotionPropertyOptions = (
  property: NotionPropertyWithOptions,
): NotionSelectOption[] => {
  if (property.type === "multi_select") {
    return property.multi_select?.options ?? [];
  }
  if (property.type === "status") {
    return property.status?.options ?? [];
  }
  return property.select?.options ?? [];
};

const findMatchedProperty = (
  properties: Record<string, unknown>,
  fieldConfig: SelectOptionFieldConfig,
) => {
  for (const notionName of fieldConfig.notionNames) {
    const property = properties[notionName] as NotionPropertyWithOptions | undefined;
    if (!property?.type) continue;
    if (!fieldConfig.supportedTypes.includes(property.type as "select" | "multi_select" | "status")) {
      continue;
    }
    return property;
  }
  return null;
};

const syncSelectOptionOrdersFromNotion = async () => {
  console.log("开始同步 Notion Select Option 顺序...");
  let synced = 0;

  for (const config of NOTION_SELECT_OPTION_CONFIGS) {
    const databaseId = process.env[config.envVar];
    if (!databaseId) {
      console.warn(`未配置 ${config.envVar}，跳过${config.label}选项顺序同步`);
      continue;
    }

    const properties = (await getDataSourceProperties(databaseId)) as Record<
      string,
      unknown
    >;

    for (const fieldConfig of config.fields) {
      const matchedProperty = findMatchedProperty(properties, fieldConfig);
      if (!matchedProperty) continue;

      const options = extractNotionPropertyOptions(matchedProperty);
      for (const [index, option] of options.entries()) {
        const value = option.name?.trim();
        if (!value) continue;

        await prisma.selectOption.upsert({
          where: {
            field_value: {
              field: fieldConfig.optionField,
              value,
            },
          },
          create: {
            field: fieldConfig.optionField,
            value,
            color: normalizeNotionColor(option.color),
            order: index + 1,
          },
          update: {
            color: normalizeNotionColor(option.color),
            order: index + 1,
          },
        });
        synced += 1;
      }
    }
  }

  console.log(`Notion Select Option 顺序同步完成，共更新 ${synced} 条`);
};

export const migrateDatabase = async (
  database_id: string,
  handler: (item: PageObjectResponse) => Promise<void>,
  label: string,
) => {
  const items = (await getDataSourceResults(
    database_id,
  )) as PageObjectResponse[];

  const errors: { id: string; message: string }[] = [];

  for (const item of items) {
    try {
      await handler(item);
    } catch (error: unknown) {
      const pageId = (item as PageObjectResponse).id;
      const message = (error as Error).message;

      console.error(`❌ ${label} ${pageId} 失败:`, message);

      errors.push({ id: pageId, message });
    }
  }

  console.log(`---- ${label} 同步完成 ----`);
  console.log("成功:", items.length - errors.length);
  console.log("失败:", errors.length);

  if (errors.length > 0) {
    console.log("失败详情:", errors);
  }
};

// 测试
const getResultStructure = async (databaseId: string) => {
  getDataSourceProperties(databaseId!)
    .then((results) => {
      for (const [key, value] of Object.entries(results)) {
        const valueType = (value as { type?: string }).type;
        if (valueType !== "formula" && valueType !== "button") {
          console.log(`${key}: ${JSON.stringify(value)}`);
        }
      }
    })
    .catch((error) => {
      console.error("查询 Notion 数据源失败:", error);
    });
};
// getResultStructure(process.env.NOTION_EMPLOYEE_SALARY_DB_ID!);

const resetDatabases = async () => {
  console.log("重置数据库...");
  await prisma.workdayAdjustment.deleteMany({});
  await prisma.clientContact.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.plannedWorkEntry.deleteMany({});
  await prisma.actualWorkEntry.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.legalEntity.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.bankAccountBalanceSnapshot.deleteMany({});
  await prisma.leaveRecord.deleteMany({});
  await prisma.projectMilestone.deleteMany({});
  await prisma.projectDocument.deleteMany({});
  await prisma.projectTask.deleteMany({});
  await prisma.projectSegment.deleteMany({});
  await prisma.project.deleteMany({});

  console.log("数据库重置完成");
};

// resetDatabases().catch(console.error);
const runMigrate = async () => {
  console.log("开始迁移...");
  await resetDatabases();
  await syncSelectOptionOrdersFromNotion();
  await syncClients();
  await syncClientContacts();
  await syncLegalEntities();
  await syncEmployees();
  await syncEmployeeSalaries();
  await syncLeaveRecords();
  await syncVendors();
  await syncProjects();
  await syncProjectSegments();
  await syncProjectTasks();
  await syncProjectMilestones();
  await syncProjectDocuments();
  await syncPlannedWorkEntries();
  await syncActualWorkEntries();
  await syncWorkdayAdjustments();
};

runMigrate().catch(console.error);
