import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
type ProjectDocumentCompatClient = {
  projectDocument: {
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
    update: (args: unknown) => Promise<Record<string, unknown>>;
  };
};
const prismaCompat = prisma as unknown as ProjectDocumentCompatClient;

type RouteContext = { params: Promise<{ id: string }> };

const upsertSelectOption = async (field: string, value: unknown) => {
  const normalized = typeof value === "string" ? value.trim() : "";
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
      color: "#d9d9d9",
    },
    update: {},
  });

  return option.id;
};

const extractTypeOptionValue = (body: Record<string, unknown>) => {
  const typeOption = body.typeOption;
  if (typeof typeOption === "string") return typeOption;
  if (typeOption && typeof typeOption === "object" && "value" in typeOption) {
    const value = (typeOption as { value?: unknown }).value;
    return typeof value === "string" ? value : "";
  }
  const legacyType = body.type;
  return typeof legacyType === "string" ? legacyType : "";
};

const documentIncludeV2 = {
  typeOption: { select: { id: true, value: true, color: true } },
  project: { select: { id: true, name: true } },
  milestone: {
    select: {
      id: true,
      name: true,
      typeOption: { select: { id: true, value: true, color: true } },
      startAt: true,
      endAt: true,
      datePrecision: true,
      location: true,
      methodOption: { select: { id: true, value: true, color: true } },
    },
  },
} as const;

const documentIncludeV1 = {
  typeOption: { select: { id: true, value: true, color: true } },
  project: { select: { id: true, name: true } },
  milestones: {
    select: {
      id: true,
      name: true,
      typeOption: { select: { id: true, value: true, color: true } },
      date: true,
      location: true,
      methodOption: { select: { id: true, value: true, color: true } },
    },
  },
} as const;

const normalizeMilestoneShape = (item: Record<string, unknown>) => {
  if ("milestone" in item) return item;
  const milestones = (item as { milestones?: unknown[] }).milestones;
  return {
    ...item,
    milestone: Array.isArray(milestones) ? milestones[0] ?? null : null,
  };
};

const normalizeMilestoneDate = (item: Record<string, unknown>) => {
  const milestone = item.milestone as
    | { startAt?: unknown; date?: unknown }
    | null
    | undefined;
  if (!milestone || typeof milestone !== "object") return item;
  return {
    ...item,
    milestone: {
      ...milestone,
      date:
        typeof milestone.startAt === "string"
          ? milestone.startAt
          : typeof milestone.date === "string"
            ? milestone.date
            : null,
    },
  };
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const item = await prismaCompat.projectDocument.findFirst({
      where: { id },
      include: documentIncludeV2,
    });
    if (!item) return new Response("Not Found", { status: 404 });
    return Response.json(normalizeMilestoneDate(item));
  } catch {
    const item = await prismaCompat.projectDocument.findFirst({
      where: { id },
      include: documentIncludeV1,
    });
    if (!item) return new Response("Not Found", { status: 404 });
    return Response.json(
      normalizeMilestoneDate(normalizeMilestoneShape(item)),
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectDocument.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const targetProjectId =
    typeof body.projectId === "string" ? body.projectId : found.projectId;
  if (body.projectId && typeof body.projectId === "string") {
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (!project) return new Response("Project not found", { status: 400 });
  }

  const typeOptionId = await upsertSelectOption(
    "projectDocument.type",
    extractTypeOptionValue(body),
  );
  const milestoneId =
    typeof body.milestoneId === "string"
      ? body.milestoneId
      : body.milestoneId === null
        ? null
        : undefined;
  if (typeof milestoneId === "string") {
    const milestone = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId: targetProjectId },
      select: { id: true },
    });
    if (!milestone) return new Response("Milestone not found", { status: 400 });
  }

  let item: Record<string, unknown>;
  try {
    item = await prismaCompat.projectDocument.update({
      where: { id },
      data: {
        name: body.name,
        typeOptionId,
        date: body.date ? new Date(body.date) : null,
        isFinal: Boolean(body.isFinal),
        internalLink: body.internalLink ?? null,
        projectId: body.projectId,
        ...(milestoneId !== undefined ? { milestoneId } : {}),
      },
      include: documentIncludeV2,
    });
    item = normalizeMilestoneDate(item);
  } catch {
    item = await prismaCompat.projectDocument.update({
      where: { id },
      data: {
        name: body.name,
        typeOptionId,
        date: body.date ? new Date(body.date) : null,
        isFinal: Boolean(body.isFinal),
        internalLink: body.internalLink ?? null,
        projectId: body.projectId,
        ...(milestoneId !== undefined
          ? {
              milestones: milestoneId
                ? { set: [{ id: milestoneId }] }
                : { set: [] },
            }
          : {}),
      },
      include: documentIncludeV1,
    });
    item = normalizeMilestoneShape(item);
    item = normalizeMilestoneDate(item);
  }
  return Response.json(item);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectDocument.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectDocument.delete({ where: { id } });
  return Response.json({ success: true });
}
