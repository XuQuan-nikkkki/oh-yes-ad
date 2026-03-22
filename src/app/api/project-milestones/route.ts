import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const parseMilestoneDatePayload = (body: Record<string, unknown>) => {
  const rawPrecision =
    typeof body.datePrecision === "string" ? body.datePrecision.toUpperCase() : "";
  const datePrecision = rawPrecision === "DATETIME" ? "DATETIME" : "DATE";

  const legacyDate =
    typeof body.date === "string" && body.date.trim() ? body.date.trim() : null;
  const startAtInput =
    typeof body.startAt === "string" && body.startAt.trim()
      ? body.startAt.trim()
      : legacyDate;
  const endAtInput =
    typeof body.endAt === "string" && body.endAt.trim() ? body.endAt.trim() : null;

  return {
    startAt: startAtInput ? new Date(startAtInput) : null,
    endAt: endAtInput ? new Date(endAtInput) : null,
    datePrecision,
  } as const;
};

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
      color: parsed.color ?? DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

const serializeMilestone = (
  milestone: Record<string, unknown> & {
    typeOption?: { value?: string | null } | null;
    methodOption?: { value?: string | null } | null;
  },
) => ({
  ...milestone,
  date: (milestone.startAt as string | null | undefined) ?? null,
  type: milestone.typeOption?.value ?? null,
  method: milestone.methodOption?.value ?? null,
});

export async function GET() {
  const items = await prisma.projectMilestone.findMany({
    include: {
      typeOption: { select: { id: true, value: true, color: true } },
      methodOption: { select: { id: true, value: true, color: true } },
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true } },
        },
      },
      internalParticipants: { select: { id: true, name: true } },
      vendorParticipants: { select: { id: true, name: true } },
      clientParticipants: { select: { id: true, name: true } },
      documents: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items.map(serializeMilestone));
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid milestone name", { status: 400 });
  }
  if (!body?.projectId || typeof body.projectId !== "string") {
    return new Response("Invalid project ID", { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true },
  });
  if (!project) return new Response("Project not found", { status: 400 });

  const [typeOptionId, methodOptionId] = await Promise.all([
    upsertSelectOption("projectMilestone.type", body.type),
    upsertSelectOption("projectMilestone.method", body.method),
  ]);
  const datePayload = parseMilestoneDatePayload(body);

  const item = await prisma.projectMilestone.create({
    data: {
      name: body.name,
      typeOptionId,
      startAt: datePayload.startAt,
      endAt: datePayload.endAt,
      datePrecision: datePayload.datePrecision,
      location: body.location ?? null,
      methodOptionId,
      projectId: body.projectId,
    },
    include: {
      typeOption: { select: { id: true, value: true, color: true } },
      methodOption: { select: { id: true, value: true, color: true } },
      project: { select: { id: true, name: true } },
      internalParticipants: { select: { id: true, name: true } },
      vendorParticipants: { select: { id: true, name: true } },
      clientParticipants: { select: { id: true, name: true } },
      documents: { select: { id: true, name: true } },
    },
  });
  return Response.json(serializeMilestone(item));
}
