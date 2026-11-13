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
  id?: string;
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
    ? Array.from(
        new Set(
          value.filter(
            (item): item is string =>
              typeof item === "string" && item.length > 0,
          ),
        ),
      )
    : [];

const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response) return auth.response;

  const { id } = await params;
  const brief = await prisma.brief.findUnique({
    where: { id },
    include: briefInclude,
  });
  if (!brief) return new Response("需求单不存在", { status: 404 });
  return Response.json(brief);
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
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
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
      id: typeof item.id === "string" && item.id ? item.id : undefined,
      type: item.type as DeliverableInput["type"],
      title: item.title.trim(),
      description: item.description.trim(),
      specification:
        typeof item.specification === "string"
          ? item.specification.trim() || undefined
          : undefined,
      reviewerId: item.reviewerId,
      assigneeId:
        typeof item.assigneeId === "string" && item.assigneeId
          ? item.assigneeId
          : undefined,
      firstDraftAt: item.firstDraftAt,
      revisionAt: item.revisionAt,
      finalAt: item.finalAt,
      formatOptionIds: stringArray(item.formatOptionIds),
      categoryOrSceneOptionIds: stringArray(item.categoryOrSceneOptionIds),
    });
  }

  const brief = await prisma.brief.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      status: true,
      deliverables: { select: { id: true, assigneeId: true } },
    },
  });
  if (!brief) return new Response("需求单不存在", { status: 404 });

  const submittedIds = deliverables
    .map((item) => item.id)
    .filter((value): value is string => Boolean(value));
  const existingById = new Map(
    brief.deliverables.map((item) => [item.id, item]),
  );
  if (
    new Set(submittedIds).size !== submittedIds.length ||
    submittedIds.some((deliverableId) => !existingById.has(deliverableId))
  ) {
    return new Response("交付物不属于当前需求单", { status: 400 });
  }

  const optionIds = Array.from(
    new Set(
      deliverables.flatMap((item) => [
        ...item.formatOptionIds,
        ...item.categoryOrSceneOptionIds,
      ]),
    ),
  );
  const employeeIds = Array.from(
    new Set([
      body.ownerId,
      ...deliverables.flatMap((item) =>
        [item.reviewerId, item.assigneeId].filter(Boolean) as string[],
      ),
    ]),
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
    return new Response("负责人、审核人或执行人不存在", { status: 400 });
  }
  const optionFieldById = new Map(
    options.map((option) => [option.id, option.field]),
  );
  if (
    deliverables.some(
      (item) =>
        item.formatOptionIds.some(
          (optionId) =>
            optionFieldById.get(optionId) !== FORMAT_OPTION_FIELD,
        ) ||
        item.categoryOrSceneOptionIds.some(
          (optionId) =>
            optionFieldById.get(optionId) !== CATEGORY_SCENE_OPTION_FIELD,
        ),
    )
  ) {
    return new Response("交付物选项无效", { status: 400 });
  }

  const keepIds = new Set(submittedIds);
  const deleteIds = brief.deliverables
    .map((item) => item.id)
    .filter((deliverableId) => !keepIds.has(deliverableId));
  const status = ["paused", "completed"].includes(brief.status)
    ? brief.status
    : deliverables.every((item) => Boolean(item.assigneeId))
      ? "in_progress"
      : "waiting_assignment";

  const clearedAssignedDeliverable = deliverables.find(
    (item) => item.id && existingById.get(item.id)?.assigneeId && !item.assigneeId,
  );
  if (clearedAssignedDeliverable) {
    return new Response("已指派的交付物不能清空执行人，请改派给其他人", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (deleteIds.length) {
      await tx.deliverable.deleteMany({ where: { id: { in: deleteIds } } });
    }

    for (const item of deliverables) {
      const data = {
        type: item.type,
        title: item.title,
        description: item.description,
        specification: item.specification,
        reviewerId: item.reviewerId,
        assigneeId: item.assigneeId,
        firstDraftAt: parseDate(item.firstDraftAt),
        revisionAt: parseDate(item.revisionAt),
        finalAt: parseDate(item.finalAt),
      };

      if (item.id) {
        const previous = existingById.get(item.id);
        await tx.deliverable.update({ where: { id: item.id }, data });
        await Promise.all([
          tx.deliverableFormatOption.deleteMany({
            where: { deliverableId: item.id },
          }),
          tx.deliverableCategoryOrSceneOption.deleteMany({
            where: { deliverableId: item.id },
          }),
        ]);
        await Promise.all([
          item.formatOptionIds.length
            ? tx.deliverableFormatOption.createMany({
                data: item.formatOptionIds.map((optionId) => ({
                  deliverableId: item.id!,
                  optionId,
                })),
              })
            : Promise.resolve(),
          item.categoryOrSceneOptionIds.length
            ? tx.deliverableCategoryOrSceneOption.createMany({
                data: item.categoryOrSceneOptionIds.map((optionId) => ({
                  deliverableId: item.id!,
                  optionId,
                })),
              })
            : Promise.resolve(),
        ]);

        if (previous?.assigneeId !== item.assigneeId) {
          if (item.assigneeId) {
            await tx.deliverableAssignmentChange.create({
              data: {
                deliverableId: item.id,
                fromAssigneeId: previous?.assigneeId,
                toAssigneeId: item.assigneeId,
                changedById: auth.employee.id,
              },
            });
          }
        }
      } else {
        await tx.deliverable.create({
          data: {
            ...data,
            briefId: id,
            creatorId: auth.employee.id,
            formatOptions: {
              create: item.formatOptionIds.map((optionId) => ({ optionId })),
            },
            categoryOrSceneOptions: {
              create: item.categoryOrSceneOptionIds.map((optionId) => ({
                optionId,
              })),
            },
            assignmentChanges: item.assigneeId
              ? {
                  create: {
                    toAssigneeId: item.assigneeId,
                    changedById: auth.employee.id,
                  },
                }
              : undefined,
          },
        });
      }
    }

    await tx.brief.update({
      where: { id },
      data: {
        title: body.title.trim(),
        description: body.description.trim(),
        ownerId: body.ownerId,
        status,
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
  const brief = await prisma.brief.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!brief) return new Response("需求单不存在", { status: 404 });

  // 数据库级联删除交付物及其选项关联、指派历史，保证整体原子删除。
  await prisma.brief.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
