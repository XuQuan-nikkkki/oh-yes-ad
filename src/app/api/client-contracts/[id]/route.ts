import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

const includeDetail = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  legalEntity: {
    select: {
      id: true,
      name: true,
      fullName: true,
    },
  },
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const serializeContract = (
  row: {
    contractAmount: unknown;
    taxAmount: unknown;
  } & Record<string, unknown>,
) => ({
  ...row,
  contractAmount:
    row.contractAmount === null || row.contractAmount === undefined
      ? null
      : Number(row.contractAmount),
  taxAmount:
    row.taxAmount === null || row.taxAmount === undefined
      ? null
      : Number(row.taxAmount),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const item = await prisma.clientContract.findUnique({
    where: { id },
    include: includeDetail,
  });
  if (!item) return new Response("Client contract not found", { status: 404 });

  return Response.json(
    serializeContract(item as Record<string, unknown> as never),
  );
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.clientContract.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      contractAmount: true,
      taxAmount: true,
    },
  });
  if (!existing) return new Response("Client contract not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  if ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) {
    return new Response("projectId is immutable", { status: 400 });
  }

  if ("legalEntityId" in body) {
    const legalEntityId = String(body.legalEntityId ?? "").trim();
    if (!legalEntityId) {
      return new Response("legalEntityId is required", { status: 400 });
    }
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { id: true },
    });
    if (!legalEntity) {
      return new Response("Legal entity not found", { status: 404 });
    }
  }

  const nextContractAmount =
    "contractAmount" in body ? toNullableNumber(body.contractAmount) : existing.contractAmount;
  const nextTaxAmount =
    "taxAmount" in body ? toNullableNumber(body.taxAmount) : existing.taxAmount;

  const project = await prisma.project.findUnique({
    where: { id: existing.projectId },
    select: {
      typeOption: {
        select: {
          value: true,
        },
      },
    },
  });
  const isClientProject = project?.typeOption?.value === "客户项目";
  if (isClientProject && (nextContractAmount === null || nextTaxAmount === null)) {
    return new Response("contractAmount and taxAmount are required for client project", {
      status: 400,
    });
  }

  const updated = await prisma.clientContract.update({
    where: { id },
    data: {
      legalEntityId:
        "legalEntityId" in body ? String(body.legalEntityId ?? "").trim() : undefined,
      contractAmount: "contractAmount" in body ? nextContractAmount : undefined,
      taxAmount: "taxAmount" in body ? nextTaxAmount : undefined,
    },
    include: includeDetail,
  });

  return Response.json(
    serializeContract(updated as Record<string, unknown> as never),
  );
}
