import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getDateValue,
  getDateRangeValue,
  getSelectValue,
  getTitleValue,
  getStartDateValue,
  getEndDateValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const syncWorkdayAdjustment = async (page: PageObjectResponse) => {
  const { id } = page;

  const name = getTitleValue(page, "名称") ?? getTitleValue(page, "标题");
  const changeType = getSelectValue(page, "变动类型", true);

  let startDate: string;
  let endDate: string;

  // 优先使用「时间范围」单一日程属性，否则使用「开始日期」「结束日期」
  const range = getDateRangeValue(page, "时间范围");
  if (range.start) {
    startDate = range.start;
    endDate = range.end ?? range.start;
  } else {
    const start = getStartDateValue(page, "日期", true);
    const end = getEndDateValue(page, "日期");
    startDate = start!;
    endDate = end ?? start!;
  }

  await prisma.workdayAdjustment.create({
    data: {
      notionPageId: id,
      name: name ?? null,
      changeType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  console.log("已同步工作日变动:", changeType, startDate);
};

export const syncWorkdayAdjustments = async () => {
  const dbId = process.env.NOTION_WORKDAY_ADJUSTMENT_DB_ID;
  if (!dbId) {
    console.warn("未配置 NOTION_WORKDAY_ADJUSTMENT_DB_ID，跳过工作日变动同步");
    return;
  }
  console.log("开始同步工作日变动...", dbId);
  await migrateDatabase(dbId, syncWorkdayAdjustment, "工作日变动");
  console.log("工作日变动同步完成");
};

// 独立运行：npm run migrate:workday-adjustment
if (process.argv[1]?.includes("migrate-workday-adjustment")) {
  syncWorkdayAdjustments().catch(console.error);
}
