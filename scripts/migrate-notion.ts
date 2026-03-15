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
        if (value.type !== "formula" && value.type !== "button") {
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
  await syncClients();
  await syncClientContacts();
  await syncLegalEntities();
  await syncEmployees();
  await syncLeaveRecords();
  await syncProjects();
  await syncProjectSegments();
  await syncProjectTasks();
  await syncProjectDocuments();
  await syncVendors();
  await syncProjectMilestones();
  await syncPlannedWorkEntries();
  await syncActualWorkEntries();
  await syncWorkdayAdjustments();
};

runMigrate().catch(console.error);
