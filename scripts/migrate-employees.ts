import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import { getSelectValue, getTitleValue } from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";
import { Employee } from "@prisma/client";
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
  await migrateDatabase(process.env.NOTION_EMPLOYEE_DB_ID!, syncEmployee, "员工");
  console.log("员工同步完成");
};
