import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import {
  requireAuthenticatedEmployee,
  requireProjectWritePermission,
} from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { briefInclude } from "@/lib/brief-query";

const FORMAT_OPTION_FIELD = "briefDeliverable.format";
const CATEGORY_SCENE_OPTION_FIELD = "briefDeliverable.categoryOrScene";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DeliverableInput = {
  type: "DESIGN" | "COPY" | "PROJECT_MANAGEMENT" | "NEW_MEDIA";
  title: string;
  description: string;
  specification?: string;
  reviewerId: string;
  assigneeId?: string;
  firstDraftAt: string;
  revisionAt: string;
  finalAt: string;
  formatOptionIds: string[];
  categoryOrSceneOptionIds: string[];
};

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)))
    : [];

const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

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
    !Array.isArray(body.deliverables) ||
    body.deliverables.length === 0
  ) {
    return new Response("需求单数据不完整", { status: 400 });
  }

  const deliverables: DeliverableInput[] = [];
  for (const raw of body.deliverables) {
    if (!raw || typeof raw !== "object") {
      return new Response("交付物数据无效", { status: 400 });
    }
    const item = raw as Record<string, unknown>;
    if (
      !["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"].includes(String(item.type)) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.description !== "string" ||
      !item.description.trim() ||
      typeof item.reviewerId !== "string" ||
      !item.reviewerId ||
      typeof item.firstDraftAt !== "string" ||
      !DATE_PATTERN.test(item.firstDraftAt) ||
      typeof item.revisionAt !== "string" ||
      !DATE_PATTERN.test(item.revisionAt) ||
      typeof item.finalAt !== "string" ||
      !DATE_PATTERN.test(item.finalAt)
    ) {
      return new Response("交付物必填项不完整", { status: 400 });
    }
    deliverables.push({
      type: item.type as DeliverableInput["type"],
      title: item.title.trim(),
      description: item.description.trim(),
      specification: typeof item.specification === "string" ? item.specification.trim() || undefined : undefined,
      reviewerId: item.reviewerId,
      assigneeId: typeof item.assigneeId === "string" && item.assigneeId ? item.assigneeId : undefined,
      firstDraftAt: item.firstDraftAt,
      revisionAt: item.revisionAt,
      finalAt: item.finalAt,
      formatOptionIds: stringArray(item.formatOptionIds),
      categoryOrSceneOptionIds: stringArray(item.categoryOrSceneOptionIds),
    });
  }

  const optionIds = Array.from(new Set(deliverables.flatMap((item) => [
    ...item.formatOptionIds,
    ...item.categoryOrSceneOptionIds,
  ])));
  const [project, employees, options] = await Promise.all([
    prisma.project.findUnique({ where: { id: body.projectId }, select: { id: true } }),
    prisma.employee.findMany({
      where: { id: { in: Array.from(new Set([body.ownerId, ...deliverables.flatMap((item) => [item.reviewerId, item.assigneeId].filter(Boolean) as string[])])) } },
      select: { id: true },
    }),
    optionIds.length
      ? prisma.selectOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, field: true } })
      : Promise.resolve([]),
  ]);
  if (!project) return new Response("项目不存在", { status: 400 });

  const requiredEmployeeIds = new Set([body.ownerId, ...deliverables.flatMap((item) => [item.reviewerId, item.assigneeId].filter(Boolean) as string[])]);
  if (employees.length !== requiredEmployeeIds.size) {
    return new Response("负责人、审核人或执行人不存在", { status: 400 });
  }
  const optionFieldById = new Map(options.map((option) => [option.id, option.field]));
  if (deliverables.some((item) =>
    item.formatOptionIds.some((id) => optionFieldById.get(id) !== FORMAT_OPTION_FIELD) ||
    item.categoryOrSceneOptionIds.some((id) => optionFieldById.get(id) !== CATEGORY_SCENE_OPTION_FIELD)
  )) {
    return new Response("交付物选项无效", { status: 400 });
  }

  const creatorId = auth.employee.id;
  const status = deliverables.every((item) => Boolean(item.assigneeId))
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
      deliverables: {
        create: deliverables.map((item) => ({
          type: item.type,
          title: item.title,
          description: item.description,
          specification: item.specification,
          reviewerId: item.reviewerId,
          assigneeId: item.assigneeId,
          creatorId,
          firstDraftAt: parseDate(item.firstDraftAt),
          revisionAt: parseDate(item.revisionAt),
          finalAt: parseDate(item.finalAt),
          formatOptions: { create: item.formatOptionIds.map((optionId) => ({ optionId })) },
          categoryOrSceneOptions: { create: item.categoryOrSceneOptionIds.map((optionId) => ({ optionId })) },
          assignmentChanges: item.assigneeId
            ? { create: { toAssigneeId: item.assigneeId, changedById: creatorId } }
            : undefined,
        })),
      },
    },
    include: { deliverables: true },
  });

  return Response.json(brief, { status: 201 });
}
