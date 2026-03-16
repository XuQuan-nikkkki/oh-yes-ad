import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";
import { requireProjectWritePermission } from "@/lib/api-permissions";

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

type SelectOptionValue = { value?: string | null } | null | undefined;
type ProjectOwnerPayload = {
  functionOption?: SelectOptionValue;
  employmentStatusOption?: SelectOptionValue;
} & Record<string, unknown>;
type ProjectPayload = {
  typeOption?: SelectOptionValue;
  statusOption?: SelectOptionValue;
  stageOption?: SelectOptionValue;
  owner?: ProjectOwnerPayload | null;
} & Record<string, unknown>;

const serializeProject = (project: ProjectPayload) => {
  return {
    ...project,
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
  };
};

// ==================== GET ====================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const clientId = url.searchParams.get("clientId");
  const vendorId = url.searchParams.get("vendorId");

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

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
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
  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    upsertSelectOption("project.type", toProjectTypeValue(body.type)),
    upsertSelectOption("project.status", body.status ?? null),
    upsertSelectOption("project.stage", body.stage ?? null),
  ]);

  const project = await prisma.project.create({
    data: {
      name: body.name,
      typeOptionId,
      statusOptionId,
      stageOptionId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      clientId: body.clientId ?? null,
      ownerId: body.ownerId ?? null,
    },
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
  });

  return Response.json(serializeProject(project));
}

// ==================== PUT ====================
export async function PUT(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    upsertSelectOption("project.type", toProjectTypeValue(body.type)),
    upsertSelectOption("project.status", body.status ?? null),
    upsertSelectOption("project.stage", body.stage ?? null),
  ]);

  const project = await prisma.project.update({
    where: {
      id: body.id,
    },
    data: {
      name: body.name,
      typeOptionId,
      statusOptionId,
      stageOptionId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      clientId: body.clientId ?? null,
      ownerId: body.ownerId ?? null,
    },
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
  });

  return Response.json(serializeProject(project));
}

// ==================== DELETE ====================
export async function DELETE(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  await prisma.project.delete({
    where: {
      id: body.id,
    },
  });

  return Response.json({ success: true });
}
