import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";
import { toSerializableNumber } from "@/lib/toSerializableNumber";
import { toNullableDecimal } from "@/lib/toNullableDecimal";
import type { NullableSelectOptionTextValue } from "@/types/selectOption";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const ownerPublicSelect = {
  id: true,
  name: true,
  functionOption: {
    select: {
      value: true,
    },
  },
  employmentStatusOption: {
    select: {
      value: true,
    },
  },
} as const;

const toProjectTypeValue = (value?: string | null) => {
  if (!value) return null;
  if (value === "CLIENT") return "客户项目";
  if (value === "INTERNAL") return "内部项目";
  return value;
};

const toProjectTypeCode = (value?: string | null) => {
  if (!value) return null;
  if (value === "客户项目") return "CLIENT";
  if (value === "内部项目") return "INTERNAL";
  return value;
};

const normalizeProjectName = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const findProjectByName = async (name: string, excludeId?: string | null) => {
  return prisma.project.findFirst({
    where: {
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
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

type ProjectOwnerPayload = {
  functionOption?: NullableSelectOptionTextValue;
  employmentStatusOption?: NullableSelectOptionTextValue;
} & Record<string, unknown>;
type ProjectManualCostPayload = {
  agencyFeeAmount?: number | string | null;
  agencyFeeRemark?: string | null;
  outsourceAmount?: number | string | null;
  outsourceRemark?: string | null;
  laborAmount?: number | string | null;
  laborRemark?: string | null;
  rentAmount?: number | string | null;
  rentRemark?: string | null;
  middleOfficeAmount?: number | string | null;
  middleOfficeRemark?: string | null;
  executionAmount?: number | string | null;
  executionRemark?: string | null;
} & Record<string, unknown>;
type ProjectPayload = {
  costSourceMode?: "AUTO" | "MANUAL";
  typeOption?: NullableSelectOptionTextValue;
  statusOption?: NullableSelectOptionTextValue;
  stageOption?: NullableSelectOptionTextValue;
  owner?: ProjectOwnerPayload | null;
  manualCost?: ProjectManualCostPayload | null;
} & Record<string, unknown>;

const normalizeNullableRemark = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const MANUAL_COST_FIELDS = [
  "agencyFee",
  "outsource",
  "labor",
  "rent",
  "middleOffice",
  "execution",
] as const;

const toManualCostData = (value: unknown) => {
  if (!value || typeof value !== "object") return null;

  const manualCost = value as Record<string, unknown>;
  const data = {
    agencyFeeAmount: toNullableDecimal(manualCost.agencyFeeAmount),
    agencyFeeRemark: normalizeNullableRemark(manualCost.agencyFeeRemark),
    outsourceAmount: toNullableDecimal(manualCost.outsourceAmount),
    outsourceRemark: normalizeNullableRemark(manualCost.outsourceRemark),
    laborAmount: toNullableDecimal(manualCost.laborAmount),
    laborRemark: normalizeNullableRemark(manualCost.laborRemark),
    rentAmount: toNullableDecimal(manualCost.rentAmount),
    rentRemark: normalizeNullableRemark(manualCost.rentRemark),
    middleOfficeAmount: toNullableDecimal(manualCost.middleOfficeAmount),
    middleOfficeRemark: normalizeNullableRemark(manualCost.middleOfficeRemark),
    executionAmount: toNullableDecimal(manualCost.executionAmount),
    executionRemark: normalizeNullableRemark(manualCost.executionRemark),
  };

  const hasValue = MANUAL_COST_FIELDS.some((field) => {
    const amount = data[`${field}Amount` as keyof typeof data];
    const remark = data[`${field}Remark` as keyof typeof data];
    return amount !== null || remark !== null;
  });

  return hasValue ? data : null;
};

const buildManualCostWriteInput = (value: unknown) => {
  const manualCostData = toManualCostData(value);

  if (!manualCostData) {
    return undefined;
  }

  return {
    upsert: {
      create: manualCostData,
      update: manualCostData,
    },
  };
};

const serializeManualCost = (manualCost: ProjectManualCostPayload | null | undefined) => {
  if (!manualCost) return null;
  return {
    agencyFeeAmount: toSerializableNumber(manualCost.agencyFeeAmount),
    agencyFeeRemark: manualCost.agencyFeeRemark ?? null,
    outsourceAmount: toSerializableNumber(manualCost.outsourceAmount),
    outsourceRemark: manualCost.outsourceRemark ?? null,
    laborAmount: toSerializableNumber(manualCost.laborAmount),
    laborRemark: manualCost.laborRemark ?? null,
    rentAmount: toSerializableNumber(manualCost.rentAmount),
    rentRemark: manualCost.rentRemark ?? null,
    middleOfficeAmount: toSerializableNumber(manualCost.middleOfficeAmount),
    middleOfficeRemark: manualCost.middleOfficeRemark ?? null,
    executionAmount: toSerializableNumber(manualCost.executionAmount),
    executionRemark: manualCost.executionRemark ?? null,
  };
};

const serializeProject = (project: ProjectPayload) => {
  return {
    ...project,
    costSourceMode: project.costSourceMode ?? "AUTO",
    type: toProjectTypeCode(project.typeOption?.value),
    status: project.statusOption?.value ?? null,
    stage: project.stageOption?.value ?? null,
    owner: project.owner
      ? {
          ...project.owner,
          function: project.owner.functionOption?.value ?? null,
          employmentStatus: project.owner.employmentStatusOption?.value ?? null,
        }
      : null,
    manualCost: serializeManualCost(project.manualCost),
  };
};

const projectInclude = {
  client: true,
  typeOption: true,
  statusOption: true,
  stageOption: true,
  manualCost: true,
  owner: {
    select: ownerPublicSelect,
  },
} as const;

// ==================== GET ====================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const clientId = url.searchParams.get("clientId");
  const vendorId = url.searchParams.get("vendorId");
  const ownerId = url.searchParams.get("ownerId");

  const where: Prisma.ProjectWhereInput = {};
  if (type) {
    where.typeOption = {
      value: toProjectTypeValue(type) ?? type,
    };
  }
  if (clientId) {
    where.clientId = clientId;
  }
  if (vendorId) {
    where.vendors = {
      some: {
        id: vendorId,
      },
    };
  }
  if (ownerId) {
    where.ownerId = ownerId;
  }

  const projects = await prisma.project.findMany({
    where,
    include: projectInclude as never,
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json(projects.map(serializeProject));
}

// ==================== POST ====================
export async function POST(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const name = normalizeProjectName(body.name);
  if (!name) {
    return new Response("项目名称不能为空", { status: 400 });
  }
  const existingProject = await findProjectByName(name);
  if (existingProject) {
    return new Response("项目名称已存在", { status: 409 });
  }

  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    upsertSelectOption("project.type", toProjectTypeValue(body.type)),
    upsertSelectOption("project.status", body.status ?? null),
    upsertSelectOption("project.stage", body.stage ?? null),
  ]);
  const manualCost = buildManualCostWriteInput(body.manualCost);
  const projectData = {
    name,
    costSourceMode: body.costSourceMode === "MANUAL" ? "MANUAL" : "AUTO",
    typeOptionId,
    isArchived: Boolean(body.isArchived),
    statusOptionId,
    stageOptionId,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    clientId: body.clientId ?? null,
    ownerId: body.ownerId ?? null,
    ...(manualCost ? { manualCost } : {}),
  };

  const project = await prisma.project.create({
    data: projectData as never,
    include: projectInclude as never,
  });

  return Response.json(serializeProject(project));
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = normalizeProjectName(body.name);
  if (!id) {
    return new Response("Missing project ID", { status: 400 });
  }
  if (!name) {
    return new Response("项目名称不能为空", { status: 400 });
  }
  const existingProject = await findProjectByName(name, id);
  if (existingProject) {
    return new Response("项目名称已存在", { status: 409 });
  }

  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    upsertSelectOption("project.type", toProjectTypeValue(body.type)),
    upsertSelectOption("project.status", body.status ?? null),
    upsertSelectOption("project.stage", body.stage ?? null),
  ]);
  const manualCost = buildManualCostWriteInput(body.manualCost);
  const shouldDeleteManualCost =
    "manualCost" in body && manualCost === undefined;

  const project = await prisma.$transaction(async (tx) => {
    if (shouldDeleteManualCost) {
      const txClient = tx as unknown as PrismaClient;
      await txClient.projectManualCost.deleteMany({
        where: { projectId: id },
      });
    }

    const projectData = {
      name,
      costSourceMode: body.costSourceMode === "MANUAL" ? "MANUAL" : "AUTO",
      typeOptionId,
      isArchived: Boolean(body.isArchived),
      statusOptionId,
      stageOptionId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      clientId: body.clientId ?? null,
      ownerId: body.ownerId ?? null,
      ...(manualCost ? { manualCost } : {}),
    };

    return tx.project.update({
      where: {
        id,
      },
      data: projectData as never,
      include: projectInclude as never,
    });
  });

  return Response.json(serializeProject(project));
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  await prisma.$transaction(async (tx) => {
    await tx.plannedWorkEntry.deleteMany({
      where: {
        task: {
          segment: {
            projectId: body.id,
          },
        },
      },
    });

    await tx.actualWorkEntry.deleteMany({
      where: {
        projectId: body.id,
      },
    });

    await tx.project.delete({
      where: {
        id: body.id,
      },
    });
  });

  return Response.json({ success: true });
}
