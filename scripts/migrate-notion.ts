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
import { syncEmployees, syncLeaveRecords } from "./migrate-employees";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});

const notion = new NotionClient({
  auth: process.env.NOTION_TOKEN,
});

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
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });
  return response.results;
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
// const getResultStructure = async (databaseId: string) => {
//   getDataSourceResults(databaseId!)
//     .then((results) => {
//       console.log("Notion 数据源查询结果:", JSON.stringify(results, null, 2));
//     })
//     .catch((error) => {
//       console.error("查询 Notion 数据源失败:", error);
//     });
// };
// getResultStructure(process.env.NOTION_LEAVE_RECORD_DB_ID!);

const resetDatabases = async () => {
  console.log("重置数据库...");
  await prisma.clientContact.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.legalEntity.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.bankAccountBalanceSnapshot.deleteMany({});
};

// resetDatabases().catch(console.error);
const runMigrate = async () => {
  console.log("开始迁移...");
  // await resetDatabases();
  // await syncClients();
  // await syncClientContacts();
  // await syncLegalEntities();
  // await syncEmployees();
  await syncLeaveRecords();
}

runMigrate().catch(console.error);