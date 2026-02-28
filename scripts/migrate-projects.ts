import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  getCheckboxValue,
  getDateValue,
  getRelationValue,
  getRichTextValue,
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

const syncSegment = async (segment: PageObjectResponse) => {
  const { id } = segment;

  // ===== 基础字段 =====
  const name = getTitleValue(segment, "环节名称", true);
  const status = getStatusValue(segment, "环节状态");
  const dueDate = getDateValue(segment, "截止日期");

  // ===== 所属项目 =====
  const projectRelation = getRelationValue(segment, "所属项目");

  if (!projectRelation?.length) {
    throw new Error("环节未关联项目");
  }

  const project = await prisma.project.findUnique({
    where: { notionPageId: projectRelation[0].id },
  });

  if (!project) {
    throw new Error("未找到对应项目");
  }

  // ===== 环节负责人 =====
  const ownerRelation = getRelationValue(segment, "环节负责人");
  let ownerId: string | null = null;

  if (ownerRelation?.length) {
    const owner = await prisma.employee.findUnique({
      where: { notionPageId: ownerRelation[0].id },
    });

    if (!owner) {
      throw new Error("未找到环节负责人");
    }

    ownerId = owner.id;
  }

  // ===== 创建 =====
  await prisma.projectSegment.create({
    data: {
      notionPageId: id,
      name,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,

      projectId: project.id,
      ownerId,
    },
  });

  console.log("已同步环节:", name);
};

export const syncProjectSegments = async () => {
  console.log("开始同步项目环节...", process.env.NOTION_PROJECT_SEGMENT_DB_ID);
  await migrateDatabase(
    process.env.NOTION_PROJECT_SEGMENT_DB_ID!,
    syncSegment,
    "项目环节",
  );
  console.log("项目环节同步完成");
};

const syncTask = async (task: PageObjectResponse) => {
  const { id } = task;

  // ===== 基础字段 =====
  const name = getTitleValue(task, "任务名称", true);
  const status = getStatusValue(task, "任务状态");
  const dueDate = getDateValue(task, "截止日期");

  // ===== 所属环节 =====
  const segmentRelation = getRelationValue(task, "所属环节");

  if (!segmentRelation?.length) {
    throw new Error("任务未关联环节");
  }

  const segment = await prisma.projectSegment.findUnique({
    where: { notionPageId: segmentRelation[0].id },
  });

  if (!segment) {
    throw new Error("未找到对应环节");
  }

  // ===== 任务负责人 =====
  const ownerRelation = getRelationValue(task, "任务负责人");
  let ownerId: string | null = null;

  if (ownerRelation?.length) {
    const owner = await prisma.employee.findUnique({
      where: { notionPageId: ownerRelation[0].id },
    });

    if (!owner) {
      throw new Error("未找到任务负责人");
    }

    ownerId = owner.id;
  }

  // ===== 创建者（created_by）=====
  let creatorId: string | null = null;

  const createdByProperty = task.properties["创建者"];

  if (createdByProperty?.type === "created_by") {
    const notionUserId = createdByProperty.created_by?.id;

    if (notionUserId) {
      const creator = await prisma.employee.findUnique({
        where: { notionPageId: notionUserId },
      });

      if (creator) {
        creatorId = creator.id;
      }
    }
  }

  // ===== 创建 =====
  await prisma.projectTask.create({
    data: {
      notionPageId: id,
      name,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,

      segmentId: segment.id,
      ownerId,
      creatorId,
    },
  });

  console.log("已同步任务:", name);
};

export const syncProjectTasks = async () => {
  console.log("开始同步项目任务...", process.env.NOTION_PROJECT_TASK_DB_ID);
  await migrateDatabase(
    process.env.NOTION_PROJECT_TASK_DB_ID!,
    syncTask,
    "项目任务",
  );
  console.log("项目任务同步完成");
};

const syncProjectDocument = async (doc: PageObjectResponse) => {
  const { id } = doc;

  // ===== 基础字段 =====
  const name = getTitleValue(
    doc,
    "资料名称(项目名+交付/沟通内容+资料类型)",
    true,
  );

  const type = getSelectValue(doc, "资料类型");
  const date = getDateValue(doc, "日期");
  const isFinal = getCheckboxValue(doc, "是最终版");
  const internalLink = getRichTextValue(doc, "内部盘链接");

  // ===== 所属项目 =====
  const projectRelation = getRelationValue(doc, "所属项目");

  if (!projectRelation?.length) {
    throw new Error("资料未关联项目");
  }

  const project = await prisma.project.findUnique({
    where: { notionPageId: projectRelation[0].id },
  });

  if (!project) {
    throw new Error("未找到对应项目");
  }

  // ===== 创建 =====
  await prisma.projectDocument.create({
    data: {
      notionPageId: id,
      name,
      type,
      date: date ? new Date(date) : null,
      isFinal: isFinal ?? false,
      internalLink,

      projectId: project.id,
    },
  });

  console.log("已同步项目资料:", name);
};

export const syncProjectDocuments = async () => {
  console.log("开始同步项目资料...", process.env.NOTION_PROJECT_DOC_DB_ID);
  await migrateDatabase(
    process.env.NOTION_PROJECT_DOC_DB_ID!,
    syncProjectDocument,
    "项目资料",
  );
  console.log("项目资料同步完成");
};
