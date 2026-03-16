import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getDateValue,
  getNumberValue,
  getPhoneValue,
  getRelationValue,
  getRichTextValue,
  getSelectValue,
  getTitleMentionPageId,
  getTitleValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";
import { Prisma } from "@prisma/client";

const DEFAULT_COLOR = "#d9d9d9";

const ensureStaffRoleId = async () => {
  const staff = await prisma.role.upsert({
    where: { code: "STAFF" },
    create: {
      code: "STAFF",
      name: "员工",
    },
    update: {},
    select: { id: true },
  });
  return staff.id;
};

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

const toDecimalOrNull = (value: number | null) => {
  if (value === null || value === undefined) return null;
  return new Prisma.Decimal(value);
};

const toNotionIdCandidates = (id: string) => {
  const compact = id.replace(/-/g, "");
  const hyphenated =
    compact.length === 32
      ? `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
      : id;
  return Array.from(new Set([id, compact, hyphenated]));
};

const getSelectValueByCandidates = (
  entity: PageObjectResponse,
  keys: string[],
): string | null => {
  for (const key of keys) {
    try {
      const value = getSelectValue(entity, key);
      if (value && value.trim()) return value.trim();
    } catch {
      // ignore type mismatch and continue trying other candidate keys
    }
  }
  return null;
};

const syncEmployee = async (entity: PageObjectResponse) => {
  const { id } = entity;
  const name = getTitleValue(entity, "姓名", true);
  const employeeFunction = getSelectValue(entity, "职能");
  const phone = getPhoneValue(entity, "联系电话");
  const isLeft = getCheckboxValue(entity, "已离职") ?? false;
  const employmentStatus = isLeft ? "离职" : "在职";
  const defaultEmploymentType = "全职";

  const [
    functionOptionId,
    employmentStatusOptionId,
    employmentTypeOptionId,
  ] = await Promise.all([
    upsertSelectOption("employee.function", employeeFunction),
    upsertSelectOption("employee.employmentStatus", employmentStatus),
    upsertSelectOption("employee.employmentType", defaultEmploymentType),
  ]);

  const staffRoleId = await ensureStaffRoleId();

  const employee = await prisma.employee.upsert({
    where: { notionPageId: id },
    update: {
      name,
      phone: phone ?? undefined,
      functionOptionId: functionOptionId ?? undefined,
      employmentStatusOptionId: employmentStatusOptionId ?? undefined,
      employmentTypeOptionId: employmentTypeOptionId ?? undefined,
      workstationCost: new Prisma.Decimal(116.91),
      utilityCost: new Prisma.Decimal(24.94),
    },
    create: {
      notionPageId: id,
      name,
      phone: phone ?? undefined,
      functionOptionId: functionOptionId ?? undefined,
      employmentStatusOptionId: employmentStatusOptionId ?? undefined,
      employmentTypeOptionId: employmentTypeOptionId ?? undefined,
      workstationCost: new Prisma.Decimal(116.91),
      utilityCost: new Prisma.Decimal(24.94),
    },
  });

  await prisma.employeeRole.upsert({
    where: {
      employeeId_roleId: {
        employeeId: employee.id,
        roleId: staffRoleId,
      },
    },
    create: {
      employeeId: employee.id,
      roleId: staffRoleId,
    },
    update: {},
  });

  console.log("已同步员工:", name);
};

export const syncEmployees = async () => {
  console.log("开始同步员工...", process.env.NOTION_EMPLOYEE_DB_ID);
  const staffRoleId = await ensureStaffRoleId();
  await migrateDatabase(
    process.env.NOTION_EMPLOYEE_DB_ID!,
    syncEmployee,
    "员工",
  );
  await prisma.employeeRole.createMany({
    data: (
      await prisma.employee.findMany({
        where: { roles: { none: {} } },
        select: { id: true },
      })
    ).map((employee) => ({ employeeId: employee.id, roleId: staffRoleId })),
    skipDuplicates: true,
  });
  console.log("员工同步完成");
};

const syncEmployeeSalary = async (entity: PageObjectResponse) => {
  const memberNotionPageId = getTitleMentionPageId(entity, "成员", true);
  if (!memberNotionPageId) {
    throw new Error("薪酬表记录缺少「成员」title");
  }
  const fullName =
    getRichTextValue(entity, "姓名") ?? getTitleValue(entity, "姓名");
  if (!fullName) {
    throw new Error("薪酬表缺少姓名");
  }

  const legalEntityName = getSelectValueByCandidates(entity, ["签约主体"]);
  const departmentLevel1 = getSelectValueByCandidates(entity, [
    "一级部门",
    "一级部门(中心)",
    "一级部门（中心）",
  ]);
  const departmentLevel2 = getSelectValueByCandidates(entity, [
    "二级部门",
    "二级部门(部门)",
    "二级部门（部门）",
  ]);
  const position = getSelectValue(entity, "职位");
  const employmentType = getSelectValue(entity, "用工性质");
  const entryDate = getDateValue(entity, "入职时间");
  const leaveDate = getDateValue(entity, "离职时间");

  const salary = getNumberValue(entity, "薪资");
  const socialSecurity = getNumberValue(entity, "社保");
  const providentFund = getNumberValue(entity, "公积金");
  const workstationCost = getNumberValue(entity, "工位费");
  const utilityCost = getNumberValue(entity, "水电");

  const [
    departmentLevel1OptionId,
    departmentLevel2OptionId,
    positionOptionId,
    employmentTypeOptionId,
    legalEntity,
  ] = await Promise.all([
    upsertSelectOption("employee.departmentLevel1", departmentLevel1),
    upsertSelectOption("employee.departmentLevel2", departmentLevel2),
    upsertSelectOption("employee.position", position),
    upsertSelectOption("employee.employmentType", employmentType),
    legalEntityName
      ? prisma.legalEntity.findFirst({
          where: {
            OR: [{ name: legalEntityName }, { fullName: legalEntityName }],
          },
        })
      : Promise.resolve(null),
  ]);

  const employee = await prisma.employee.findFirst({
    where: {
      notionPageId: { in: toNotionIdCandidates(memberNotionPageId) },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!employee) {
    throw new Error(
      `薪酬表未匹配到员工（按成员title里的链接ID匹配）。成员=${memberNotionPageId}，姓名=${fullName}`,
    );
  }

  if (legalEntityName && !legalEntity) {
    console.warn(
      `薪酬表签约主体未匹配到 legal entity：${legalEntityName}（成员=${memberNotionPageId}，姓名=${fullName}）`,
    );
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      fullName,
      legalEntityId: legalEntity?.id ?? null,
      departmentLevel1OptionId: departmentLevel1OptionId ?? null,
      departmentLevel2OptionId: departmentLevel2OptionId ?? null,
      positionOptionId: positionOptionId ?? null,
      employmentTypeOptionId: employmentTypeOptionId ?? null,
      entryDate: entryDate ? new Date(entryDate) : null,
      leaveDate: leaveDate ? new Date(leaveDate) : null,
      salary: toDecimalOrNull(salary),
      socialSecurity: toDecimalOrNull(socialSecurity),
      providentFund: toDecimalOrNull(providentFund),
      workstationCost: toDecimalOrNull(workstationCost),
      utilityCost: toDecimalOrNull(utilityCost),
    },
  });

  console.log("已同步薪酬信息:", fullName);
};

export const syncEmployeeSalaries = async () => {
  const dbId = process.env.NOTION_EMPLOYEE_SALARY_DB_ID;
  if (!dbId) {
    console.warn("未配置 NOTION_EMPLOYEE_SALARY_DB_ID，跳过薪酬表同步");
    return;
  }

  console.log("开始同步员工薪酬...", dbId);
  await migrateDatabase(dbId, syncEmployeeSalary, "员工薪酬");
  console.log("员工薪酬同步完成");
};

const syncLeaveRecord = async (entity: PageObjectResponse) => {
  const { id } = entity;
  const type = getSelectValue(entity, "类型", true);
  const startDate = getDateValue(entity, "开始日期", true);
  const endDate = getDateValue(entity, "结束日期", true);
  const employeeNotionId = getRelationValue(entity, "人员", true)[0]?.id;
  if (!employeeNotionId) {
    throw new Error("请假记录缺少「人员」relation");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      notionPageId: { in: toNotionIdCandidates(employeeNotionId) },
    },
  });
  if (!employee) {
    throw new Error(`请假记录关联员工不存在，人员=${employeeNotionId}`);
  }

  const typeOptionId = await upsertSelectOption("leaveRecord.type", type);
  if (!startDate) {
    throw new Error(`请假记录缺少开始日期，notionPageId=${id}`);
  }
  const resolvedEndDate = endDate ?? startDate;
  const startAt = new Date(startDate);
  const endAtRaw = new Date(resolvedEndDate);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAtRaw.getTime())) {
    throw new Error(`请假记录日期无效，notionPageId=${id}`);
  }
  const endAt =
    startAt.getTime() === endAtRaw.getTime() ? null : endAtRaw;
  const datePrecision = startDate.includes("T") ? "DATETIME" : "DATE";

  await prisma.leaveRecord.upsert({
    where: { notionPageId: id },
    update: {
      typeOptionId: typeOptionId ?? undefined,
      startAt,
      endAt,
      datePrecision,
      employeeId: employee.id,
    },
    create: {
      notionPageId: id,
      typeOptionId: typeOptionId ?? undefined,
      startAt,
      endAt,
      datePrecision,
      employeeId: employee.id,
    },
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
