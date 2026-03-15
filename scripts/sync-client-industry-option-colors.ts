import "dotenv/config";
import {
  Client as NotionClient,
  DatabaseObjectResponse,
} from "@notionhq/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type NotionSelectOption = {
  name: string;
  color: string;
};

type NotionPropertyMaybeSelect = {
  type?: string;
  select?: {
    options?: NotionSelectOption[];
  };
};

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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

const getDataSourceIdByDbId = async (databaseId: string) => {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = (database as DatabaseObjectResponse).data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error("未找到 data_source_id");
  }

  return dataSourceId;
};

const getIndustrySelectOptions = async (databaseId: string) => {
  const dataSourceId = await getDataSourceIdByDbId(databaseId);
  const response = await notion.dataSources.retrieve({ data_source_id: dataSourceId });

  const properties = response.properties as Record<string, unknown>;
  const industryProp = properties["行业"] as NotionPropertyMaybeSelect | undefined;

  if (!industryProp) {
    throw new Error("Notion 客户库未找到字段：行业");
  }

  if (industryProp.type !== "select") {
    throw new Error(`字段“行业”类型不是 select，当前类型：${industryProp.type ?? "unknown"}`);
  }

  return industryProp.select?.options ?? [];
};

const syncClientIndustryOptionColors = async () => {
  const databaseId = process.env.NOTION_CLIENT_DB_ID;
  if (!databaseId) {
    throw new Error("缺少环境变量 NOTION_CLIENT_DB_ID");
  }

  const options = await getIndustrySelectOptions(databaseId);

  console.log(`从 Notion 读取到行业选项 ${options.length} 条`);

  let updatedCount = 0;
  for (const [index, option] of options.entries()) {
    await prisma.selectOption.upsert({
      where: {
        field_value: {
          field: "client.industry",
          value: option.name,
        },
      },
      create: {
        field: "client.industry",
        value: option.name,
        color: normalizeNotionColor(option.color),
        order: index + 1,
      },
      update: {
        color: normalizeNotionColor(option.color),
        order: index + 1,
      },
    });

    updatedCount += 1;
  }

  console.log(`已同步 client.industry 颜色/排序：${updatedCount} 条`);
};

syncClientIndustryOptionColors()
  .catch((error) => {
    console.error("同步失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
