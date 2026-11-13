import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import {
  requireAuthenticatedEmployee,
  requireProjectWritePermission,
} from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { briefInclude, workItemInclude } from "@/lib/brief-query";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response) return auth.response;

  const { id } = await params;
  const workItem = await prisma.workItem.findUnique({
    where: { id },
    include: {
      ...workItemInclude,
      brief: {
        select: { id: true, title: true, project: briefInclude.project },
      },
    },
  });
  if (!workItem) return new Response("工作项不存在", { status: 404 });
  return Response.json(workItem);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id } = await params;
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

  const workItem = await prisma.workItem.findUnique({
    where: { id },
    select: { id: true, briefId: true, assigneeId: true, brief: { select: { status: true } } },
  });
  if (!workItem) return new Response("工作项不存在", { status: 404 });

  const assigneeId =
    typeof body.assigneeId === "string" && body.assigneeId
      ? body.assigneeId
      : undefined;
  if (workItem.assigneeId && !assigneeId) {
    return new Response("已指派的工作项不能清空执行人，请改派给其他人", { status: 400 });
  }
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

  await prisma.$transaction(async (tx) => {
    await tx.workItem.update({
      where: { id },
      data: {
        type: body.type,
        submissionEnabled: body.submissionEnabled,
        sourceFilePolicy: body.sourceFilePolicy,
        title: body.title.trim(),
        description: body.description.trim(),
        specification:
          typeof body.specification === "string"
            ? body.specification.trim() || null
            : null,
        reviewerId: body.reviewerId,
        assigneeId,
        firstDraftAt:
          typeof body.firstDraftAt === "string" && body.firstDraftAt
            ? parseDate(body.firstDraftAt)
            : null,
        revisionAt:
          typeof body.revisionAt === "string" && body.revisionAt
            ? parseDate(body.revisionAt)
            : null,
        finalAt: parseDate(body.finalAt),
      },
    });
    await tx.workItemFormatOption.deleteMany({
      where: { workItemId: id },
    });
    await tx.workItemCategoryOrSceneOption.deleteMany({
      where: { workItemId: id },
    });
    if (formatOptionIds.length) {
      await tx.workItemFormatOption.createMany({
        data: formatOptionIds.map((optionId) => ({
          workItemId: id,
          optionId,
        })),
      });
    }
    if (categoryOrSceneOptionIds.length) {
      await tx.workItemCategoryOrSceneOption.createMany({
        data: categoryOrSceneOptionIds.map((optionId) => ({
          workItemId: id,
          optionId,
        })),
      });
    }

    if (workItem.assigneeId !== assigneeId) {
      if (assigneeId) {
        await tx.workItemAssignmentChange.create({
          data: {
            workItemId: id,
            fromAssigneeId: workItem.assigneeId,
            toAssigneeId: assigneeId,
            changedById: auth.employee.id,
          },
        });
      }
    }

    const remaining = await tx.workItem.findMany({
      where: { briefId: workItem.briefId },
      select: { assigneeId: true },
    });
    await tx.brief.update({
      where: { id: workItem.briefId },
      data: {
        status: ["paused", "completed"].includes(workItem.brief.status)
          ? workItem.brief.status
          : remaining.every((item) => Boolean(item.assigneeId))
            ? "in_progress"
            : "waiting_assignment",
      },
    });
  });

  return Response.json({ id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;

  const { id } = await params;
  const workItem = await prisma.workItem.findUnique({
    where: { id },
    select: {
      briefId: true,
      brief: {
        select: {
          workItems: { select: { id: true, assigneeId: true } },
          status: true,
        },
      },
    },
  });
  if (!workItem) return new Response("工作项不存在", { status: 404 });
  if (workItem.brief.workItems.length <= 1) {
    return new Response("需求单至少需要保留一个工作项", { status: 400 });
  }

  const remaining = workItem.brief.workItems.filter(
    (item) => item.id !== id,
  );
  await prisma.$transaction([
    prisma.workItem.delete({ where: { id } }),
    prisma.brief.update({
      where: { id: workItem.briefId },
      data: {
        status: ["paused", "completed"].includes(workItem.brief.status)
          ? workItem.brief.status
          : remaining.every((item) => Boolean(item.assigneeId))
            ? "in_progress"
            : "waiting_assignment",
      },
    }),
  ]);

  return new Response(null, { status: 204 });
}
