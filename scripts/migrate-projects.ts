import "dotenv/config";
import { PageObjectResponse } from "@notionhq/client";
import {
  DEFAULT_PROJECT_TASK_STATUS,
  PROJECT_TASK_STATUS_FIELD,
  PROJECT_TASK_STATUS_OPTIONS,
} from "../src/lib/constants";
import {
  getCheckboxValue,
  getDatePrecisionValue,
  getDateRangeValue,
  getDateValue,
  getRelationValue,
  getRichTextValue,
  getSelectValue,
  getStatusValue,
  getTitleValue,
} from "./parser";
import { prisma, migrateDatabase } from "./migrate-notion";

const DEFAULT_COLOR = "#d9d9d9";

const getTrimmedRequiredTitle = (
  page: PageObjectResponse,
  fieldName: string,
) => {
  const raw = getTitleValue(page, fieldName, true);
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    throw new Error(`字段 '${fieldName}' 去除首尾空格后为空`);
  }
  return trimmed;
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

const syncProject = async (project: PageObjectResponse) => {
  const { id } = project;
  const name = getTrimmedRequiredTitle(project, "项目名称");
  const status = getStatusValue(project, "项目状态"); // 你需要有 getStatusValue
  const stage = getSelectValue(project, "项目阶段");
  const isInternal = getCheckboxValue(project, "是内部项目");
  const isArchived = Boolean(getCheckboxValue(project, "待归档"));
  const type = isInternal ? "内部项目" : "客户项目";

  const startDate = getDateValue(project, "开始日期");
  const endDate = getDateValue(project, "结束日期");

  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    upsertSelectOption("project.type", type),
    upsertSelectOption("project.status", status),
    upsertSelectOption("project.stage", stage),
  ]);

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
  const projectProperties = project.properties as Record<string, { type?: string }>;
  const vendorRelationKeyCandidates = [
    "供应商",
    "合作供应商",
    "关联供应商",
    "参与供应商",
  ];
  const vendorRelationKey = vendorRelationKeyCandidates.find(
    (key) => projectProperties[key]?.type === "relation",
  );
  const vendorRelation = vendorRelationKey
    ? getRelationValue(project, vendorRelationKey)
    : [];

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
  const vendorNotionIds = Array.from(
    new Set((vendorRelation ?? []).map((rel) => rel.id)),
  );
  const vendors = vendorNotionIds.length
    ? await prisma.vendor.findMany({
        where: { notionPageId: { in: vendorNotionIds } },
        select: { id: true, notionPageId: true },
      })
    : [];
  const vendorLinks = vendors.map((vendor) => ({ id: vendor.id }));
  if (vendorNotionIds.length > vendors.length) {
    const found = new Set(vendors.map((vendor) => vendor.notionPageId));
    const missing = vendorNotionIds.filter((notionId) => !found.has(notionId));
    console.warn(
      `项目 ${name} 存在未匹配到本地供应商的 relation: ${missing.join(", ")}`,
    );
  }

  await prisma.project.upsert({
    where: { notionPageId: id },
    update: {
      name,
      typeOptionId: typeOptionId ?? null,
      statusOptionId: statusOptionId ?? undefined,
      stageOptionId: stageOptionId ?? null,
      isArchived,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      clientId,
      ownerId,
      members: {
        set: members,
      },
      vendors: {
        set: vendorLinks,
      },
    },
    create: {
      notionPageId: id,
      name,
      typeOptionId: typeOptionId ?? null,
      statusOptionId: statusOptionId ?? null,
      stageOptionId: stageOptionId ?? null,
      isArchived,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      clientId,
      ownerId,
      members: {
        connect: members,
      },
      vendors: {
        connect: vendorLinks,
      },
    },
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
  const name = getTrimmedRequiredTitle(segment, "环节名称");
  const status = getStatusValue(segment, "环节状态");
  const startDate = getDateValue(segment, "开始时间") ?? getDateValue(segment, "开始日期");
  const endDate = getDateValue(segment, "结束时间") ?? getDateValue(segment, "结束日期");
  const statusOptionId = await upsertSelectOption("projectSegment.status", status);

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
      statusOptionId: statusOptionId ?? undefined,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,

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
  const name = getTrimmedRequiredTitle(task, "任务名称");
  const taskStatus = getStatusValue(task, "任务状态") ?? DEFAULT_PROJECT_TASK_STATUS;
  const dueDate = getDateValue(task, "截止日期");
  const statusOptionId = await upsertSelectOption(
    PROJECT_TASK_STATUS_FIELD,
    taskStatus,
  );
  if (!statusOptionId) {
    throw new Error(`任务状态选项未创建成功: ${taskStatus}`);
  }

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
      statusOptionId,
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
  await Promise.all(
    PROJECT_TASK_STATUS_OPTIONS.map((option) =>
      prisma.selectOption.upsert({
        where: {
          field_value: {
            field: PROJECT_TASK_STATUS_FIELD,
            value: option.value,
          },
        },
        create: {
          field: PROJECT_TASK_STATUS_FIELD,
          value: option.value,
          color: option.color,
          order: option.order,
        },
        update: {
          color: option.color,
          order: option.order,
        },
      }),
    ),
  );
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
  const typeOptionId = await upsertSelectOption("projectDocument.type", type);

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

  // ===== 关联里程碑（最多一个）=====
  const documentProperties = doc.properties as Record<string, { type?: string }>;
  const milestoneRelationKeyCandidates = ["关联里程碑", "里程碑"];
  const milestoneRelationKey =
    milestoneRelationKeyCandidates.find(
      (key) => documentProperties[key]?.type === "relation",
    ) ??
    Object.keys(documentProperties).find(
      (key) =>
        documentProperties[key]?.type === "relation" && key.includes("里程碑"),
    );

  const milestoneRelation = milestoneRelationKey
    ? getRelationValue(doc, milestoneRelationKey)
    : [];

  let milestoneId: string | null = null;
  if (milestoneRelation?.length) {
    const linkedMilestone = await prisma.projectMilestone.findFirst({
      where: {
        notionPageId: milestoneRelation[0].id,
        projectId: project.id,
      },
      select: { id: true },
    });

    if (!linkedMilestone) {
      console.warn(
        `项目资料 ${name} 关联里程碑未匹配到本地数据: ${milestoneRelation[0].id}`,
      );
    } else {
      milestoneId = linkedMilestone.id;
    }
  }

  // ===== 创建或更新 =====
  await prisma.projectDocument.upsert({
    where: { notionPageId: id },
    update: {
      name,
      typeOptionId: typeOptionId ?? null,
      date: date ? new Date(date) : null,
      isFinal: isFinal ?? false,
      internalLink,
      projectId: project.id,
      milestoneId,
    },
    create: {
      notionPageId: id,
      name,
      typeOptionId: typeOptionId ?? null,
      date: date ? new Date(date) : null,
      isFinal: isFinal ?? false,
      internalLink,
      projectId: project.id,
      milestoneId,
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

const syncProjectMilestone = async (milestone: PageObjectResponse) => {
  const { id } = milestone;

  // ===== 基础字段 =====
  const name = getTrimmedRequiredTitle(milestone, "里程碑名称");
  const type = getSelectValue(milestone, "类型");
  const dateRange = getDateRangeValue(milestone, "日期");
  const datePrecision = getDatePrecisionValue(milestone, "日期");
  const location = getRichTextValue(milestone, "地点");
  const method = getSelectValue(milestone, "方式");
  const [typeOptionId, methodOptionId] = await Promise.all([
    upsertSelectOption("projectMilestone.type", type),
    upsertSelectOption("projectMilestone.method", method),
  ]);

  // ===== 所属项目 =====
  const projectRelation = getRelationValue(milestone, "所属项目");

  if (!projectRelation?.length) {
    throw new Error("里程碑未关联项目");
  }

  const project = await prisma.project.findUnique({
    where: { notionPageId: projectRelation[0].id },
  });

  if (!project) {
    throw new Error("未找到对应项目");
  }

  // ===== 参与人员 =====
  const internalRelations = getRelationValue(milestone, "参与人员-内部") ?? [];
  const vendorRelations = getRelationValue(milestone, "参与人员-供应商") ?? [];
  const clientRelations = getRelationValue(milestone, "参与人员-客户") ?? [];

  const internalParticipants = await prisma.employee.findMany({
    where: {
      notionPageId: { in: internalRelations.map((r) => r.id) },
    },
    select: { id: true },
  });

  const vendorParticipants = await prisma.vendor.findMany({
    where: {
      notionPageId: { in: vendorRelations.map((r) => r.id) },
    },
    select: { id: true },
  });

  const clientParticipants = await prisma.clientContact.findMany({
    where: {
      notionPageId: { in: clientRelations.map((r) => r.id) },
    },
    select: { id: true },
  });

  // ===== 创建或更新 =====
  await prisma.projectMilestone.upsert({
    where: { notionPageId: id },
    update: {
      name,
      typeOptionId: typeOptionId ?? null,
      startAt: dateRange.start ? new Date(dateRange.start) : null,
      endAt: dateRange.end ? new Date(dateRange.end) : null,
      datePrecision,
      location,
      methodOptionId: methodOptionId ?? null,
      projectId: project.id,
      internalParticipants: {
        set: internalParticipants.map((p) => ({ id: p.id })),
      },
      vendorParticipants: {
        set: vendorParticipants.map((p) => ({ id: p.id })),
      },
      clientParticipants: {
        set: clientParticipants.map((p) => ({ id: p.id })),
      },
    },
    create: {
      notionPageId: id,
      name,
      typeOptionId: typeOptionId ?? null,
      startAt: dateRange.start ? new Date(dateRange.start) : null,
      endAt: dateRange.end ? new Date(dateRange.end) : null,
      datePrecision,
      location,
      methodOptionId: methodOptionId ?? null,
      projectId: project.id,
      internalParticipants: {
        connect: internalParticipants.map((p) => ({ id: p.id })),
      },
      vendorParticipants: {
        connect: vendorParticipants.map((p) => ({ id: p.id })),
      },
      clientParticipants: {
        connect: clientParticipants.map((p) => ({ id: p.id })),
      },
    },
  });

  console.log("已同步里程碑:", name);
};

export const syncProjectMilestones = async () => {
  console.log("开始同步项目里程碑...", process.env.NOTION_PROJECT_MILESTONE_DB_ID);
  await migrateDatabase(
    process.env.NOTION_PROJECT_MILESTONE_DB_ID!,
    syncProjectMilestone,
    "项目里程碑",
  );
  console.log("项目里程碑同步完成");
};
