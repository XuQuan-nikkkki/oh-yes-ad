import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getDateValue,
  getRelationValue,
  getSelectValue,
  getStatusValue,
  getTitleValue,
} from "../lib/notion/parser";
import { prisma, migrateDatabase } from "./migrate-notion";
import { Project } from "@prisma/client";

const syncProject = async (project: PageObjectResponse) => {
  const { id } = project;
  const name = getTitleValue(project, "项目名称", true);
  const status = getStatusValue(project, "项目状态"); // 你需要有 getStatusValue
  const stage = getSelectValue(project, "项目阶段");
  const isInternal = getCheckboxValue(project, "是内部项目");

  const startDate = getDateValue(project, "开始日期");
  const endDate = getDateValue(project, "结束日期");

  const clientRelation = getRelationValue(project, "所属客户");
  let clientId: string | null = null;

  if (clientRelation?.length) {
    const client = await prisma.client.findUnique({
      where: { notionPageId: clientRelation[0].id },
    });

    if (!client) {
      throw new Error("未找到对应客户");
    }

    clientId = client.id;
  }

  // ===== 项目负责人 relation（单人） =====
  const ownerRelation = getRelationValue(project, "项目负责人");
  let ownerId: string | null = null;

  if (ownerRelation?.length) {
    const owner = await prisma.employee.findUnique({
      where: { notionPageId: ownerRelation[0].id },
    });

    if (!owner) {
      throw new Error("未找到对应负责人");
    }

    ownerId = owner.id;
  }

  const memberRelation = getRelationValue(project, "项目成员");

  const members = await Promise.all(
    (memberRelation ?? []).map(async (rel) => {
      const emp = await prisma.employee.findUnique({
        where: { notionPageId: rel.id },
      });

      if (!emp) {
        throw new Error(`未找到成员: ${rel.id}`);
      }

      return { id: emp.id };
    }),
  );

  const data: Partial<Project> = {
    notionPageId: id,
    name,
    type: isInternal ? "内部项目" : "客户项目",
    status,
    stage,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,

    clientId,
    ownerId,

    members: {
      connect: members,
    },
  };
  await prisma.project.create({
    data,
  });

  console.log("已同步项目:", name);
};

export const syncProjects = async () => {
  console.log("开始同步项目...", process.env.NOTION_PROJECT_DB_ID);
  await migrateDatabase(process.env.NOTION_PROJECT_DB_ID!, syncProject, "项目");
  console.log("项目同步完成");
};
