import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const parseSelectOptionInput = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      value: normalized || null,
      color: null as string | null,
    };
  }
  if (value && typeof value === "object") {
    const candidateValue =
      "value" in value && typeof value.value === "string"
        ? value.value.trim()
        : "";
    const candidateColor =
      "color" in value && typeof value.color === "string"
        ? value.color.trim()
        : "";
    return {
      value: candidateValue || null,
      color: candidateColor || null,
    };
  }
  return {
    value: null as string | null,
    color: null as string | null,
  };
};

const upsertSelectOption = async (field: string, value: unknown) => {
  const parsed = parseSelectOptionInput(value);
  const normalized = parsed.value ?? "";
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
      color: parsed.color ?? "#d9d9d9",
    },
    update: {},
  });

  return option.id;
};

const serializeSegment = (segment: {
  statusOption?: { value: string; color: string | null } | null;
} & Record<string, unknown>) => ({
  ...segment,
  status: segment.statusOption?.value ?? null,
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await prisma.projectSegment.findFirst({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      statusOption: { select: { value: true, color: true } },
      projectTasks: {
        select: {
          id: true,
          name: true,
          dueDate: true,
          owner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(serializeSegment(item));
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectSegment.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (!project) return new Response("Project not found", { status: 400 });
  }
  const statusOptionId = await upsertSelectOption(
    "projectSegment.status",
    body.status ?? null,
  );

  const item = await prisma.projectSegment.update({
    where: { id },
    data: {
      name: body.name,
      statusOptionId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId,
      ownerId: body.ownerId ?? null,
    },
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      statusOption: { select: { value: true, color: true } },
      projectTasks: {
        select: {
          id: true,
          name: true,
          dueDate: true,
          owner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return Response.json(serializeSegment(item));
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectSegment.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectSegment.delete({ where: { id } });
  return Response.json({ success: true });
}
