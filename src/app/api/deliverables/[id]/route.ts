import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import {
  requireAuthenticatedEmployee,
  requireProjectWritePermission,
} from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { briefInclude, deliverableInclude } from "@/lib/brief-query";

const FORMAT_OPTION_FIELD = "briefDeliverable.format";
const CATEGORY_SCENE_OPTION_FIELD = "briefDeliverable.categoryOrScene";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
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
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: {
      ...deliverableInclude,
      brief: {
        select: { id: true, title: true, project: briefInclude.project },
      },
    },
  });
  if (!deliverable) return new Response("交付物不存在", { status: 404 });
  return Response.json(deliverable);
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
  if (
    !body ||
    !["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"].includes(String(body.type)) ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
    typeof body.reviewerId !== "string" ||
    !body.reviewerId ||
    typeof body.firstDraftAt !== "string" ||
    !DATE_PATTERN.test(body.firstDraftAt) ||
    typeof body.revisionAt !== "string" ||
    !DATE_PATTERN.test(body.revisionAt) ||
    typeof body.finalAt !== "string" ||
    !DATE_PATTERN.test(body.finalAt)
  ) {
    return new Response("交付物数据不完整", { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    select: { id: true, briefId: true, assigneeId: true, brief: { select: { status: true } } },
  });
  if (!deliverable) return new Response("交付物不存在", { status: 404 });

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
    return new Response("交付物选项无效", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({
      where: { id },
      data: {
        type: body.type,
        title: body.title.trim(),
        description: body.description.trim(),
        specification:
          typeof body.specification === "string"
            ? body.specification.trim() || null
            : null,
        reviewerId: body.reviewerId,
        assigneeId,
        firstDraftAt: parseDate(body.firstDraftAt),
        revisionAt: parseDate(body.revisionAt),
        finalAt: parseDate(body.finalAt),
      },
    });
    await tx.deliverableFormatOption.deleteMany({
      where: { deliverableId: id },
    });
    await tx.deliverableCategoryOrSceneOption.deleteMany({
      where: { deliverableId: id },
    });
    if (formatOptionIds.length) {
      await tx.deliverableFormatOption.createMany({
        data: formatOptionIds.map((optionId) => ({
          deliverableId: id,
          optionId,
        })),
      });
    }
    if (categoryOrSceneOptionIds.length) {
      await tx.deliverableCategoryOrSceneOption.createMany({
        data: categoryOrSceneOptionIds.map((optionId) => ({
          deliverableId: id,
          optionId,
        })),
      });
    }

    if (deliverable.assigneeId !== assigneeId) {
      await tx.deliverableAssignmentHistory.updateMany({
        where: { deliverableId: id, endedAt: null },
        data: { endedAt: new Date() },
      });
      if (assigneeId) {
        await tx.deliverableAssignmentHistory.create({
          data: {
            deliverableId: id,
            assigneeId,
            assignedById: auth.employee.id,
            changeReason: "编辑交付物时指派",
          },
        });
      }
    }

    const remaining = await tx.deliverable.findMany({
      where: { briefId: deliverable.briefId },
      select: { assigneeId: true },
    });
    await tx.brief.update({
      where: { id: deliverable.briefId },
      data: {
        status: ["paused", "completed"].includes(deliverable.brief.status)
          ? deliverable.brief.status
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
  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    select: {
      briefId: true,
      brief: {
        select: {
          deliverables: { select: { id: true, assigneeId: true } },
          status: true,
        },
      },
    },
  });
  if (!deliverable) return new Response("交付物不存在", { status: 404 });
  if (deliverable.brief.deliverables.length <= 1) {
    return new Response("需求单至少需要保留一个交付物", { status: 400 });
  }

  const remaining = deliverable.brief.deliverables.filter(
    (item) => item.id !== id,
  );
  await prisma.$transaction([
    prisma.deliverable.delete({ where: { id } }),
    prisma.brief.update({
      where: { id: deliverable.briefId },
      data: {
        status: ["paused", "completed"].includes(deliverable.brief.status)
          ? deliverable.brief.status
          : remaining.every((item) => Boolean(item.assigneeId))
            ? "in_progress"
            : "waiting_assignment",
      },
    }),
  ]);

  return new Response(null, { status: 204 });
}
