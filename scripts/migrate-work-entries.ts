import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getDateValue,
  getNumberValue,
  getRelationValue,
  getSelectValue,
  getTitleValue,
} from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";

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
  const plannedDays = getNumberValue(page, "工时(天)", true);

  await prisma.plannedWorkEntry.create({
    data: {
      notionPageId: id,
      taskId: task.id,
      year: Number(yearStr),
      weekNumber,
      plannedDays,
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

  const date = getDateValue(page, "时间", true);

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
      date: new Date(date),
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
