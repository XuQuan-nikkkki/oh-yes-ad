import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getDateRangeValue,
  getNumberValue,
  getRelationValue,
  getSelectValue,
  getTitleValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const DEFAULT_COLOR = "#d9d9d9";

const upsertSelectOption = async (field: string, value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return null;
  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value: normalized,
      },
    },
    create: {
      field,
      value: normalized,
      color: DEFAULT_COLOR,
    },
    update: {},
  });
  return option.id;
};

const syncPlannedWorkEntry = async (page: PageObjectResponse) => {
  const { id } = page;

  // 所属任务 relation
  const taskRelation = getRelationValue(page, "所属任务", true);
  if (!taskRelation?.length) return;

  const notionTaskId = taskRelation[0].id;

  const task = await prisma.projectTask.findUnique({
    where: { notionPageId: notionTaskId },
  });

  if (!task) {
    console.log("未找到任务:", notionTaskId);
    return;
  }

  const yearStr = getSelectValue(page, "年份", true);
  const weekNumber = getNumberValue(page, "第n周", true);
  if (weekNumber === null || weekNumber === undefined) {
    throw new Error(`计划工时缺少第n周，notionPageId=${id}`);
  }
  const weekNumberStr = String(weekNumber);
  const plannedDays = getNumberValue(page, "工时(天)", true);
  if (plannedDays === null || plannedDays === undefined) {
    throw new Error(`计划工时缺少工时(天)，notionPageId=${id}`);
  }
  const monday = getCheckboxValue(page, "周一") ?? false;
  const tuesday = getCheckboxValue(page, "周二") ?? false;
  const wednesday = getCheckboxValue(page, "周三") ?? false;
  const thursday = getCheckboxValue(page, "周四") ?? false;
  const friday = getCheckboxValue(page, "周五") ?? false;
  const saturday = getCheckboxValue(page, "周六") ?? false;
  const sunday = getCheckboxValue(page, "周天") ?? false;

  const [yearOptionId, weekNumberOptionId] = await Promise.all([
    upsertSelectOption("plannedWorkEntry.year", yearStr),
    upsertSelectOption("plannedWorkEntry.weekNumber", weekNumberStr),
  ]);

  await prisma.plannedWorkEntry.upsert({
    where: { notionPageId: id },
    update: {
      taskId: task.id,
      yearOptionId: yearOptionId ?? null,
      weekNumberOptionId: weekNumberOptionId ?? null,
      plannedDays,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    },
    create: {
      notionPageId: id,
      taskId: task.id,
      yearOptionId: yearOptionId ?? null,
      weekNumberOptionId: weekNumberOptionId ?? null,
      plannedDays,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    },
  });

  console.log("已同步计划工时:", id);
};

export const syncPlannedWorkEntries = async () => {
  console.log(
    "开始同步计划工时...",
    process.env.NOTION_PLANNED_WORK_ENTRY_DB_ID,
  );
  await migrateDatabase(
    process.env.NOTION_PLANNED_WORK_ENTRY_DB_ID!,
    syncPlannedWorkEntry,
    "计划工时",
  );
  console.log("计划工时同步完成");
};

const syncActualWorkEntry = async (page: PageObjectResponse) => {
  const { id } = page;

  const title = getTitleValue(page, "事件", true);

  const timeRange = getDateRangeValue(page, "时间", true);
  const startDate = timeRange.start;
  const endDate = timeRange.end ?? timeRange.start;
  if (!startDate || !endDate) {
    throw new Error("字段 '时间' 为空");
  }

  // 人员 relation
  const employeeRelation = getRelationValue(page, "人员", true);
  if (!employeeRelation?.length) return;

  const notionEmployeeId = employeeRelation[0].id;

  const employee = await prisma.employee.findUnique({
    where: { notionPageId: notionEmployeeId },
  });

  if (!employee) {
    console.log("未找到员工:", notionEmployeeId);
    return;
  }

  // 所属项目 relation
  const projectRelation = getRelationValue(page, "所属项目", true);
  if (!projectRelation?.length) return;

  const notionProjectId = projectRelation[0].id;

  const project = await prisma.project.findUnique({
    where: { notionPageId: notionProjectId },
  });

  if (!project) {
    console.log("未找到项目:", notionProjectId);
    return;
  }

  await prisma.actualWorkEntry.create({
    data: {
      notionPageId: id,
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      employeeId: employee.id,
      projectId: project.id,
    },
  });

  console.log("已同步实际工时:", title);
};

export const syncActualWorkEntries = async () => {
  console.log(
    "开始同步实际工时...",
    process.env.NOTION_ACTUAL_WORK_ENTRY_DB_ID,
  );
  await migrateDatabase(
    process.env.NOTION_ACTUAL_WORK_ENTRY_DB_ID!,
    syncActualWorkEntry,
    "实际工时",
  );
  console.log("实际工时同步完成");
};    
