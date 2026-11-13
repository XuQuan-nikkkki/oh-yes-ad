import { getDefaultSubmissionEnabled } from "@/lib/work-item-defaults";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import {
  requireAuthenticatedEmployee,
  requireProjectWritePermission,
} from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { briefInclude } from "@/lib/brief-query";

const FORMAT_OPTION_FIELD = "briefWorkItem.format";
const CATEGORY_SCENE_OPTION_FIELD = "briefWorkItem.categoryOrScene";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type WorkItemInput = {
  submissionEnabled?: boolean;
  sourceFilePolicy: "REQUIRED" | "OPTIONAL";
  type: "DESIGN" | "COPY" | "PROJECT_MANAGEMENT" | "NEW_MEDIA";
  title: string;
  description: string;
  specification?: string;
  reviewerId: string;
  assigneeId?: string;
  firstDraftAt?: string;
  revisionAt?: string;
  finalAt: string;
  formatOptionIds: string[];
  categoryOrSceneOptionIds: string[];
};

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)))
    : [];

const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const isOptionalDate = (value: unknown) =>
  value == null || value === "" || (typeof value === "string" && DATE_PATTERN.test(value));

export async function GET() {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response) return auth.response;

  const briefs = await prisma.brief.findMany({
    include: briefInclude,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return Response.json(briefs);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const body = await sanitizeRequestBody(req);
  if (
    !body ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
    typeof body.projectId !== "string" ||
    typeof body.ownerId !== "string" ||
    !Array.isArray(body.workItems) ||
    body.workItems.length === 0
  ) {
    return new Response("需求单数据不完整", { status: 400 });
  }

  const workItems: WorkItemInput[] = [];
  for (const raw of body.workItems) {
    if (!raw || typeof raw !== "object") {
      return new Response("工作项数据无效", { status: 400 });
    }
    const item = raw as Record<string, unknown>;
    if (item.submissionEnabled !== undefined && typeof item.submissionEnabled !== "boolean") {
      return new Response("提交内容选项无效", { status: 400 });
    }
    if (!["REQUIRED", "OPTIONAL"].includes(String(item.sourceFilePolicy))) {
      return new Response("请选择是否必须提交源文件", { status: 400 });
    }
    if (
      !["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"].includes(String(item.type)) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.description !== "string" ||
      !item.description.trim() ||
      typeof item.reviewerId !== "string" ||
      !item.reviewerId ||
      !isOptionalDate(item.firstDraftAt) ||
      !isOptionalDate(item.revisionAt) ||
      typeof item.finalAt !== "string" ||
      !DATE_PATTERN.test(item.finalAt)
    ) {
      return new Response("工作项必填项不完整", { status: 400 });
    }
    workItems.push({
      type: item.type as WorkItemInput["type"],
      submissionEnabled: item.submissionEnabled as boolean | undefined,
      sourceFilePolicy: item.sourceFilePolicy as WorkItemInput["sourceFilePolicy"],
      title: item.title.trim(),
      description: item.description.trim(),
      specification: typeof item.specification === "string" ? item.specification.trim() || undefined : undefined,
      reviewerId: item.reviewerId,
      assigneeId: typeof item.assigneeId === "string" && item.assigneeId ? item.assigneeId : undefined,
      firstDraftAt: typeof item.firstDraftAt === "string" && item.firstDraftAt ? item.firstDraftAt : undefined,
      revisionAt: typeof item.revisionAt === "string" && item.revisionAt ? item.revisionAt : undefined,
      finalAt: item.finalAt,
      formatOptionIds: stringArray(item.formatOptionIds),
      categoryOrSceneOptionIds: stringArray(item.categoryOrSceneOptionIds),
    });
  }

  const optionIds = Array.from(new Set(workItems.flatMap((item) => [
    ...item.formatOptionIds,
    ...item.categoryOrSceneOptionIds,
  ])));
  const [project, employees, options] = await Promise.all([
    prisma.project.findUnique({ where: { id: body.projectId }, select: { id: true } }),
    prisma.employee.findMany({
      where: { id: { in: Array.from(new Set([body.ownerId, ...workItems.flatMap((item) => [item.reviewerId, item.assigneeId].filter(Boolean) as string[])])) } },
      select: { id: true },
    }),
    optionIds.length
      ? prisma.selectOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, field: true } })
      : Promise.resolve([]),
  ]);
  if (!project) return new Response("项目不存在", { status: 400 });

  const requiredEmployeeIds = new Set([body.ownerId, ...workItems.flatMap((item) => [item.reviewerId, item.assigneeId].filter(Boolean) as string[])]);
  if (employees.length !== requiredEmployeeIds.size) {
    return new Response("负责人、审核人或执行人不存在", { status: 400 });
  }
  const optionFieldById = new Map(options.map((option) => [option.id, option.field]));
  if (workItems.some((item) =>
    item.formatOptionIds.some((id) => optionFieldById.get(id) !== FORMAT_OPTION_FIELD) ||
    item.categoryOrSceneOptionIds.some((id) => optionFieldById.get(id) !== CATEGORY_SCENE_OPTION_FIELD)
  )) {
    return new Response("工作项选项无效", { status: 400 });
  }

  const creatorId = auth.employee.id;
  const status = workItems.every((item) => Boolean(item.assigneeId))
    ? "in_progress"
    : "waiting_assignment";
  const brief = await prisma.brief.create({
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      status,
      projectId: body.projectId,
      ownerId: body.ownerId,
      creatorId,
      workItems: {
        create: workItems.map((item) => ({
          type: item.type,
          submissionEnabled: item.submissionEnabled ?? getDefaultSubmissionEnabled(item.type),
          sourceFilePolicy: item.sourceFilePolicy,
          title: item.title,
          description: item.description,
          specification: item.specification,
          reviewerId: item.reviewerId,
          assigneeId: item.assigneeId,
          creatorId,
          firstDraftAt: item.firstDraftAt ? parseDate(item.firstDraftAt) : null,
          revisionAt: item.revisionAt ? parseDate(item.revisionAt) : null,
          finalAt: parseDate(item.finalAt),
          formatOptions: { create: item.formatOptionIds.map((optionId) => ({ optionId })) },
          categoryOrSceneOptions: { create: item.categoryOrSceneOptionIds.map((optionId) => ({ optionId })) },
          assignmentChanges: item.assigneeId
            ? { create: { toAssigneeId: item.assigneeId, changedById: creatorId } }
            : undefined,
        })),
      },
    },
    include: { workItems: true },
  });

  return Response.json(brief, { status: 201 });
}
