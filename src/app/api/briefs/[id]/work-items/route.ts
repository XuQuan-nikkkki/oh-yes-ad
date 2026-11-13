import { getDefaultSubmissionEnabled } from "@/lib/work-item-defaults";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import {
  requireAuthenticatedEmployee,
  requireProjectWritePermission,
} from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

const FORMAT_OPTION_FIELD = "briefWorkItem.format";
const CATEGORY_SCENE_OPTION_FIELD = "briefWorkItem.categoryOrScene";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const isOptionalDate = (value: unknown) =>
  value == null || value === "" || (typeof value === "string" && DATE_PATTERN.test(value));
const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (item): item is string =>
              typeof item === "string" && item.length > 0,
          ),
        ),
      )
    : [];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id: briefId } = await params;
  const body = await sanitizeRequestBody(req);
  if (body?.submissionEnabled !== undefined && typeof body.submissionEnabled !== "boolean") {
    return new Response("提交内容选项无效", { status: 400 });
  }
  if (!body || !["REQUIRED", "OPTIONAL"].includes(String(body.sourceFilePolicy))) {
    return new Response("请选择是否必须提交源文件", { status: 400 });
  }
  if (
    !body ||
    !["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"].includes(String(body.type)) ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
    typeof body.reviewerId !== "string" ||
    !body.reviewerId ||
    !isOptionalDate(body.firstDraftAt) ||
    !isOptionalDate(body.revisionAt) ||
    typeof body.finalAt !== "string" ||
    !DATE_PATTERN.test(body.finalAt)
  ) {
    return new Response("工作项数据不完整", { status: 400 });
  }

  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    select: {
      id: true,
      status: true,
      workItems: { select: { assigneeId: true } },
    },
  });
  if (!brief) return new Response("需求单不存在", { status: 404 });

  const assigneeId =
    typeof body.assigneeId === "string" && body.assigneeId
      ? body.assigneeId
      : undefined;
  const employeeIds = Array.from(
    new Set([body.reviewerId, assigneeId].filter(Boolean) as string[]),
  );
  const formatOptionIds = stringArray(body.formatOptionIds);
  const categoryOrSceneOptionIds = stringArray(
    body.categoryOrSceneOptionIds,
  );
  const optionIds = Array.from(
    new Set([...formatOptionIds, ...categoryOrSceneOptionIds]),
  );
  const [employees, options] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true },
    }),
    optionIds.length
      ? prisma.selectOption.findMany({
          where: { id: { in: optionIds } },
          select: { id: true, field: true },
        })
      : Promise.resolve([]),
  ]);
  if (employees.length !== employeeIds.length) {
    return new Response("审核人或执行人不存在", { status: 400 });
  }
  const optionFieldById = new Map(
    options.map((option) => [option.id, option.field]),
  );
  if (
    formatOptionIds.some(
      (optionId) => optionFieldById.get(optionId) !== FORMAT_OPTION_FIELD,
    ) ||
    categoryOrSceneOptionIds.some(
      (optionId) =>
        optionFieldById.get(optionId) !== CATEGORY_SCENE_OPTION_FIELD,
    )
  ) {
    return new Response("工作项选项无效", { status: 400 });
  }

  const allAssigned =
    Boolean(assigneeId) &&
    brief.workItems.every((item) => Boolean(item.assigneeId));
  const workItem = await prisma.$transaction(async (tx) => {
    const created = await tx.workItem.create({
      data: {
        type: body.type,
        submissionEnabled: body.submissionEnabled ?? getDefaultSubmissionEnabled(body.type),
        sourceFilePolicy: body.sourceFilePolicy,
        title: body.title.trim(),
        description: body.description.trim(),
        specification:
          typeof body.specification === "string"
            ? body.specification.trim() || undefined
            : undefined,
        briefId,
        reviewerId: body.reviewerId,
        assigneeId,
        creatorId: auth.employee.id,
        firstDraftAt:
          typeof body.firstDraftAt === "string" && body.firstDraftAt
            ? parseDate(body.firstDraftAt)
            : null,
        revisionAt:
          typeof body.revisionAt === "string" && body.revisionAt
            ? parseDate(body.revisionAt)
            : null,
        finalAt: parseDate(body.finalAt),
        formatOptions: {
          create: formatOptionIds.map((optionId) => ({ optionId })),
        },
        categoryOrSceneOptions: {
          create: categoryOrSceneOptionIds.map((optionId) => ({ optionId })),
        },
        assignmentChanges: assigneeId
          ? {
              create: {
                toAssigneeId: assigneeId,
                changedById: auth.employee.id,
              },
            }
          : undefined,
      },
      select: { id: true },
    });
    await tx.brief.update({
      where: { id: briefId },
      data: {
        status: ["paused", "completed"].includes(brief.status)
          ? brief.status
          : allAssigned
            ? "in_progress"
            : "waiting_assignment",
      },
    });
    return created;
  });

  return Response.json(workItem, { status: 201 });
}
