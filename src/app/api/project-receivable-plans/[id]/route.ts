import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { toNullableInt } from "@/lib/toNullableInt";

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
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  clientContract: {
    select: {
      id: true,
      contractAmount: true,
      taxAmount: true,
      legalEntityId: true,
      legalEntity: {
        select: {
          id: true,
          name: true,
          fullName: true,
        },
      },
    },
  },
  legalEntity: {
    select: {
      id: true,
      name: true,
      fullName: true,
    },
  },
  ownerEmployee: {
    select: {
      id: true,
      name: true,
    },
  },
  nodes: {
    include: {
      stageOption: {
        select: {
          id: true,
          field: true,
          value: true,
          color: true,
        },
      },
      actualNodes: {
        orderBy: [{ actualDate: "asc" as const }, { createdAt: "asc" as const }],
      },
    },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};


const toNullableBool = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectReceivablePlan.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      clientId: true,
      legalEntityId: true,
      ownerEmployeeId: true,
      contractAmount: true,
      hasVendorPayment: true,
      serviceContent: true,
      remark: true,
      remarkNeedsAttention: true,
      clientContractId: true,
    },
  });
  if (!existing) return new Response("Receivable plan not found", { status: 404 });

  const body = await sanitizeRequestBody(req);

  if ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) {
    return new Response("projectId is immutable", { status: 400 });
  }
  if ("clientId" in body && String(body.clientId ?? "").trim() !== existing.clientId) {
    return new Response("clientId is immutable", { status: 400 });
  }

  const legalEntityId =
    "legalEntityId" in body
      ? String(body.legalEntityId ?? "").trim()
      : existing.legalEntityId;
  const ownerEmployeeId =
    "ownerEmployeeId" in body
      ? String(body.ownerEmployeeId ?? "").trim()
      : existing.ownerEmployeeId;
  const contractAmount =
    "contractAmount" in body ? toNullableInt(body.contractAmount) : existing.contractAmount;
  const hasVendorPayment =
    "hasVendorPayment" in body
      ? toNullableBool(body.hasVendorPayment)
      : existing.hasVendorPayment;
  const clientContractIdRaw =
    "clientContractId" in body || "customerContractId" in body
      ? String(body.clientContractId ?? body.customerContractId ?? "").trim() || null
      : existing.clientContractId;

  if (!legalEntityId || !ownerEmployeeId) {
    return new Response("legalEntityId and ownerEmployeeId are required", {
      status: 400,
    });
  }
  if (contractAmount === null || contractAmount < 0) {
    return new Response("contractAmount must be a non-negative integer", {
      status: 400,
    });
  }
  if (hasVendorPayment === null) {
    return new Response("hasVendorPayment must be boolean", {
      status: 400,
    });
  }

  const [legalEntity, owner] = await Promise.all([
    prisma.legalEntity.findUnique({ where: { id: legalEntityId }, select: { id: true } }),
    prisma.employee.findUnique({ where: { id: ownerEmployeeId }, select: { id: true } }),
  ]);
  if (!legalEntity) return new Response("Legal entity not found", { status: 404 });
  if (!owner) return new Response("Employee not found", { status: 404 });

  let resolvedClientContractId = clientContractIdRaw;
  if (clientContractIdRaw) {
    const contract = await prisma.clientContract.findUnique({
      where: { id: clientContractIdRaw },
      select: {
        id: true,
        projectId: true,
        legalEntityId: true,
      },
    });
    if (!contract) {
      return new Response("Customer contract not found", { status: 404 });
    }
    if (contract.projectId !== existing.projectId) {
      return new Response("clientContractId does not belong to project", {
        status: 400,
      });
    }
    if (contract.legalEntityId !== legalEntityId) {
      resolvedClientContractId = null;
    }
  }

  let remarkNeedsAttentionPatch: boolean | undefined;
  if ("remarkNeedsAttention" in body) {
    const parsed = toNullableBool(body.remarkNeedsAttention);
    if (parsed === null) {
      return new Response("remarkNeedsAttention must be boolean", {
        status: 400,
      });
    }
    remarkNeedsAttentionPatch = parsed;
  }

  const updated = await prisma.projectReceivablePlan.update({
    where: { id },
    data: {
      legalEntityId,
      ownerEmployeeId,
      contractAmount,
      hasVendorPayment,
      clientContractId: resolvedClientContractId,
      serviceContent:
        "serviceContent" in body
          ? typeof body.serviceContent === "string" && body.serviceContent.trim().length > 0
            ? body.serviceContent.trim()
            : null
          : undefined,
      remark:
        "remark" in body
          ? typeof body.remark === "string" && body.remark.trim().length > 0
            ? body.remark.trim()
            : null
          : undefined,
      remarkNeedsAttention: remarkNeedsAttentionPatch,
    },
    include: includeDetail,
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.projectReceivablePlan.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
