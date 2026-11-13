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
  id?: string;
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
const isOptionalDate = (value: unknown) =>
  value == null || value === "" || (typeof value === "string" && DATE_PATTERN.test(value));

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
      id: typeof item.id === "string" && item.id ? item.id : undefined,
      type: item.type as WorkItemInput["type"],
      submissionEnabled: item.submissionEnabled as boolean | undefined,
      sourceFilePolicy: item.sourceFilePolicy as WorkItemInput["sourceFilePolicy"],
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
      firstDraftAt: typeof item.firstDraftAt === "string" && item.firstDraftAt ? item.firstDraftAt : undefined,
      revisionAt: typeof item.revisionAt === "string" && item.revisionAt ? item.revisionAt : undefined,
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
      workItems: { select: { id: true, assigneeId: true } },
    },
  });
  if (!brief) return new Response("需求单不存在", { status: 404 });

  const submittedIds = workItems
    .map((item) => item.id)
    .filter((value): value is string => Boolean(value));
  const existingById = new Map(
    brief.workItems.map((item) => [item.id, item]),
  );
  if (
    new Set(submittedIds).size !== submittedIds.length ||
    submittedIds.some((workItemId) => !existingById.has(workItemId))
  ) {
    return new Response("工作项不属于当前需求单", { status: 400 });
  }

  const optionIds = Array.from(
    new Set(
      workItems.flatMap((item) => [
        ...item.formatOptionIds,
        ...item.categoryOrSceneOptionIds,
      ]),
    ),
  );
  const employeeIds = Array.from(
    new Set([
      body.ownerId,
      ...workItems.flatMap((item) =>
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
    workItems.some(
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
    return new Response("工作项选项无效", { status: 400 });
  }

  const keepIds = new Set(submittedIds);
  const deleteIds = brief.workItems
    .map((item) => item.id)
    .filter((workItemId) => !keepIds.has(workItemId));
  const status = ["paused", "completed"].includes(brief.status)
    ? brief.status
    : workItems.every((item) => Boolean(item.assigneeId))
      ? "in_progress"
      : "waiting_assignment";

  const clearedAssignedWorkItem = workItems.find(
    (item) => item.id && existingById.get(item.id)?.assigneeId && !item.assigneeId,
  );
  if (clearedAssignedWorkItem) {
    return new Response("已指派的工作项不能清空执行人，请改派给其他人", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (deleteIds.length) {
      await tx.workItem.deleteMany({ where: { id: { in: deleteIds } } });
    }

    for (const item of workItems) {
      const data = {
        type: item.type,
        submissionEnabled: item.submissionEnabled ?? (item.id ? undefined : getDefaultSubmissionEnabled(item.type)),
        sourceFilePolicy: item.sourceFilePolicy,
        title: item.title,
        description: item.description,
        specification: item.specification,
        reviewerId: item.reviewerId,
        assigneeId: item.assigneeId,
        firstDraftAt: item.firstDraftAt ? parseDate(item.firstDraftAt) : null,
        revisionAt: item.revisionAt ? parseDate(item.revisionAt) : null,
        finalAt: parseDate(item.finalAt),
      };

      if (item.id) {
        const previous = existingById.get(item.id);
        await tx.workItem.update({ where: { id: item.id }, data });
        await Promise.all([
          tx.workItemFormatOption.deleteMany({
            where: { workItemId: item.id },
          }),
          tx.workItemCategoryOrSceneOption.deleteMany({
            where: { workItemId: item.id },
          }),
        ]);
        await Promise.all([
          item.formatOptionIds.length
            ? tx.workItemFormatOption.createMany({
                data: item.formatOptionIds.map((optionId) => ({
                  workItemId: item.id!,
                  optionId,
                })),
              })
            : Promise.resolve(),
          item.categoryOrSceneOptionIds.length
            ? tx.workItemCategoryOrSceneOption.createMany({
                data: item.categoryOrSceneOptionIds.map((optionId) => ({
                  workItemId: item.id!,
                  optionId,
                })),
              })
            : Promise.resolve(),
        ]);

        if (previous?.assigneeId !== item.assigneeId) {
          if (item.assigneeId) {
            await tx.workItemAssignmentChange.create({
              data: {
                workItemId: item.id,
                fromAssigneeId: previous?.assigneeId,
                toAssigneeId: item.assigneeId,
                changedById: auth.employee.id,
              },
            });
          }
        }
      } else {
        await tx.workItem.create({
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

  // 数据库级联删除工作项及其选项关联、指派历史，保证整体原子删除。
  await prisma.brief.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
