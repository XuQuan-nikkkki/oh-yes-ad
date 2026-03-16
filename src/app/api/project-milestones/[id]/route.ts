import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
type ProjectMilestoneCompatClient = {
  projectMilestone: {
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
    update: (args: unknown) => Promise<Record<string, unknown>>;
  };
};
const prismaCompat = prisma as unknown as ProjectMilestoneCompatClient;

type RouteContext = { params: Promise<{ id: string }> };

const parseMilestoneDatePayload = (body: Record<string, unknown>) => {
  const hasLegacyDate = body.date !== undefined;
  const hasStartAt = body.startAt !== undefined;
  const hasEndAt = body.endAt !== undefined;
  const hasPrecision = body.datePrecision !== undefined;
  const shouldUpdateDate = hasLegacyDate || hasStartAt || hasEndAt || hasPrecision;

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
    shouldUpdateDate,
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
      color: parsed.color ?? "#d9d9d9",
    },
    update: {},
  });

  return option.id;
};

const includeDetailBase = {
  typeOption: { select: { id: true, value: true, color: true } },
  methodOption: { select: { id: true, value: true, color: true } },
  project: { select: { id: true, name: true } },
  internalParticipants: {
    select: {
      id: true,
      name: true,
      functionOption: { select: { id: true, value: true, color: true } },
    },
  },
  vendorParticipants: {
    select: {
      id: true,
      name: true,
      vendorTypeOption: { select: { id: true, value: true, color: true } },
      businessTypes: {
        select: {
          optionId: true,
          option: { select: { id: true, value: true, color: true } },
        },
      },
      businessTypeOption: { select: { id: true, value: true, color: true } },
      services: {
        select: {
          optionId: true,
          option: { select: { id: true, value: true, color: true } },
        },
      },
    },
  },
  clientParticipants: {
    select: {
      id: true,
      name: true,
      title: true,
      scope: true,
      preference: true,
    },
  },
} as const;

const includeDetailV2 = {
  ...includeDetailBase,
  documents: {
    select: {
      id: true,
      name: true,
      typeOption: { select: { id: true, value: true, color: true } },
      date: true,
      isFinal: true,
      internalLink: true,
      project: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
    },
  },
} as const;

const includeDetailV1 = {
  ...includeDetailBase,
  documents: {
    select: {
      id: true,
      name: true,
      typeOption: { select: { id: true, value: true, color: true } },
      date: true,
      isFinal: true,
      internalLink: true,
      project: { select: { id: true, name: true } },
      milestones: { select: { id: true, name: true } },
    },
  },
} as const;

const normalizeMilestoneDocumentShape = (item: Record<string, unknown>) => {
  const documents = (item as { documents?: unknown[] }).documents;
  return {
    ...item,
    documents: Array.isArray(documents)
      ? documents.map((document) => {
          if (!document || typeof document !== "object") return document;
          if ("milestone" in document) return document;
          const milestones = (document as { milestones?: unknown[] }).milestones;
          return {
            ...document,
            milestone: Array.isArray(milestones) ? milestones[0] ?? null : null,
          };
        })
      : [],
  };
};

const serializeMilestone = (
  milestone: Record<string, unknown> & {
    typeOption?: { value?: string | null } | null;
    methodOption?: { value?: string | null } | null;
    internalParticipants?: Array<
      Record<string, unknown> & {
        functionOption?: { value?: string | null; color?: string | null } | null;
      }
    >;
    vendorParticipants?: Array<
      Record<string, unknown> & {
        businessTypes?: Array<{
          optionId: string;
          option?: { id: string; value: string; color?: string | null } | null;
        }>;
        services?: Array<{
          optionId: string;
          option?: { id: string; value: string; color?: string | null } | null;
        }>;
        businessTypeOption?: { id: string; value: string; color?: string | null } | null;
      }
    >;
  },
) => ({
  ...milestone,
  date: (milestone.startAt as string | null | undefined) ?? null,
  type: milestone.typeOption?.value ?? null,
  method: milestone.methodOption?.value ?? null,
  internalParticipants: Array.isArray(milestone.internalParticipants)
    ? milestone.internalParticipants.map((participant) => ({
        ...participant,
        function: participant.functionOption?.value ?? null,
      }))
    : [],
  vendorParticipants: Array.isArray(milestone.vendorParticipants)
    ? milestone.vendorParticipants.map((vendor) => {
        const businessTypeOptions = Array.isArray(vendor.businessTypes)
          ? vendor.businessTypes
              .map((item) => item.option ?? null)
              .filter((item): item is { id: string; value: string; color?: string | null } => Boolean(item))
          : [];
        const serviceOptions = Array.isArray(vendor.services)
          ? vendor.services
              .map((item) => item.option ?? null)
              .filter((item): item is { id: string; value: string; color?: string | null } => Boolean(item))
          : [];
        return {
          ...vendor,
          businessTypeOptions,
          businessTypeOptionIds: Array.isArray(vendor.businessTypes)
            ? vendor.businessTypes.map((item) => item.optionId)
            : [],
          businessTypeOption:
            businessTypeOptions[0] ?? vendor.businessTypeOption ?? null,
          serviceOptions,
          serviceOptionIds: Array.isArray(vendor.services)
            ? vendor.services.map((item) => item.optionId)
            : [],
        };
      })
    : [],
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let item: Record<string, unknown> | null = null;
  try {
    item = await prismaCompat.projectMilestone.findFirst({
      where: { id },
      include: includeDetailV2,
    });
  } catch {
    item = await prismaCompat.projectMilestone.findFirst({
      where: { id },
      include: includeDetailV1,
    });
    if (item) {
      item = normalizeMilestoneDocumentShape(item);
    }
  }
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(serializeMilestone(item));
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectMilestone.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (!project) return new Response("Project not found", { status: 400 });
  }

  const [typeOptionId, methodOptionId] = await Promise.all([
    upsertSelectOption("projectMilestone.type", body.type),
    upsertSelectOption("projectMilestone.method", body.method),
  ]);
  const datePayload = parseMilestoneDatePayload(body);

  const internalParticipantIds = Array.isArray(body.internalParticipantIds)
    ? body.internalParticipantIds.filter((item: unknown): item is string => typeof item === "string")
    : null;
  const clientParticipantIds = Array.isArray(body.clientParticipantIds)
    ? body.clientParticipantIds.filter((item: unknown): item is string => typeof item === "string")
    : null;
  const vendorParticipantIds = Array.isArray(body.vendorParticipantIds)
    ? body.vendorParticipantIds.filter((item: unknown): item is string => typeof item === "string")
    : null;

  const updateData = {
    ...(typeof body.name === "string" ? { name: body.name } : {}),
    ...(body.type !== undefined ? { typeOptionId } : {}),
    ...(datePayload.shouldUpdateDate
      ? {
          startAt: datePayload.startAt,
          endAt: datePayload.endAt,
          datePrecision: datePayload.datePrecision,
        }
      : {}),
    ...(body.location !== undefined ? { location: body.location ?? null } : {}),
    ...(body.method !== undefined ? { methodOptionId } : {}),
    ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
    ...(internalParticipantIds
      ? {
          internalParticipants: {
            set: internalParticipantIds.map((participantId: string) => ({ id: participantId })),
          },
        }
      : {}),
    ...(clientParticipantIds
      ? {
          clientParticipants: {
            set: clientParticipantIds.map((participantId: string) => ({ id: participantId })),
          },
        }
      : {}),
    ...(vendorParticipantIds
      ? {
          vendorParticipants: {
            set: vendorParticipantIds.map((participantId: string) => ({ id: participantId })),
          },
        }
      : {}),
  };

  let item: Record<string, unknown>;
  try {
    item = await prismaCompat.projectMilestone.update({
      where: { id },
      data: updateData,
      include: includeDetailV2,
    });
  } catch {
    item = await prismaCompat.projectMilestone.update({
      where: { id },
      data: updateData,
      include: includeDetailV1,
    });
    item = normalizeMilestoneDocumentShape(item);
  }
  return Response.json(serializeMilestone(item));
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectMilestone.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectMilestone.delete({ where: { id } });
  return Response.json({ success: true });
}
