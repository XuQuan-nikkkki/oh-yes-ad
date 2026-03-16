import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

export async function GET() {
  const items = await prisma.projectSegment.findMany({
    include: {
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      statusOption: { select: { value: true, color: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items.map(serializeSegment));
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid segment name", { status: 400 });
  }
  if (!body?.projectId || typeof body.projectId !== "string") {
    return new Response("Invalid project ID", { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true },
  });
  if (!project) return new Response("Project not found", { status: 400 });

  const statusOptionId = await upsertSelectOption(
    "projectSegment.status",
    body.status ?? null,
  );

  const item = await prisma.projectSegment.create({
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
    },
  });

  return Response.json(serializeSegment(item));
}
