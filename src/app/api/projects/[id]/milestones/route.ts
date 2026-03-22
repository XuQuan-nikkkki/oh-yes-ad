import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
  if (!parsed.value) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value: parsed.value,
      },
    },
    create: {
      field,
      value: parsed.value,
      color: parsed.color ?? DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid milestone name", { status: 400 });
  }

  const internalParticipantIds: string[] = Array.isArray(
    body.internalParticipantIds,
  )
    ? body.internalParticipantIds
    : [];
  const clientParticipantIds: string[] = Array.isArray(body.clientParticipantIds)
    ? body.clientParticipantIds
    : [];
  const vendorParticipantIds: string[] = Array.isArray(body.vendorParticipantIds)
    ? body.vendorParticipantIds
    : [];
  const [typeOptionId, methodOptionId] = await Promise.all([
    upsertSelectOption("projectMilestone.type", body.type),
    upsertSelectOption("projectMilestone.method", body.method),
  ]);
  const datePayload = parseMilestoneDatePayload(body);

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      name: body.name,
      typeOptionId,
      startAt: datePayload.startAt,
      endAt: datePayload.endAt,
      datePrecision: datePayload.datePrecision,
      location: body.location ?? null,
      methodOptionId,
      internalParticipants: {
        connect: internalParticipantIds.map((id) => ({ id })),
      },
      clientParticipants: {
        connect: clientParticipantIds.map((id) => ({ id })),
      },
      vendorParticipants: {
        connect: vendorParticipantIds.map((id) => ({ id })),
      },
    },
  });

  return Response.json(milestone);
}
