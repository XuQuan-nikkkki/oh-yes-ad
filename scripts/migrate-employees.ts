import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getDateValue,
  getRelationValue,
  getSelectValue,
  getTitleValue,
} from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";
import { Employee, LeaveRecord } from "@prisma/client";
import { Prisma } from "@prisma/client";

const syncEmployee = async (entity: PageObjectResponse) => {
  const { id } = entity;
  const name = getTitleValue(entity, "姓名", true);
  const employee_function = getSelectValue(entity, "职能", true);

  const data: Partial<Employee> = {
    notionPageId: id,
    name,
    function: employee_function,
    workstationCost: new Prisma.Decimal(116.91),
    utilityCost: new Prisma.Decimal(24.94),

    employmentType: "全职",
  };
  await prisma.employee.create({
    data,
  });

  console.log("已同步员工:", name);
};

export const syncEmployees = async () => {
  console.log("开始同步员工...", process.env.NOTION_EMPLOYEE_DB_ID);
  await migrateDatabase(
    process.env.NOTION_EMPLOYEE_DB_ID!,
    syncEmployee,
    "员工",
  );
  console.log("员工同步完成");
};

const syncLeaveRecord = async (entity: PageObjectResponse) => {
  const { id } = entity;
  const type = getSelectValue(entity, "类型", true);
  const startDate = getDateValue(entity, "开始日期", true);
  const endDate = getDateValue(entity, "结束日期", true);
  const employeeNotionId = getRelationValue(entity, "人员", true)[0]?.id;

  const employee = await prisma.employee.findUnique({
    where: { notionPageId: employeeNotionId },
  });

  const data: Partial<LeaveRecord> = {
    notionPageId: id,
    type,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    employeeId: employee?.id,
  };
  await prisma.leaveRecord.create({
    data,
  });

  console.log("已同步请假日历:", type);
};

export const syncLeaveRecords = async () => {
  console.log("开始同步请假日历...", process.env.NOTION_LEAVE_RECORD_DB_ID);
  await migrateDatabase(
    process.env.NOTION_LEAVE_RECORD_DB_ID!,
    syncLeaveRecord,
    "请假日历",
  );
  console.log("请假日历同步完成");
};
