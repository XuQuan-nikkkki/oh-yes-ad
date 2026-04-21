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
  vendorContract: {
    select: {
      id: true,
      serviceContent: true,
      contractAmount: true,
      vendor: {
        select: {
          id: true,
          name: true,
          fullName: true,
        },
      },
      legalEntity: {
        select: {
          id: true,
          name: true,
          fullName: true,
        },
      },
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
          order: true,
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

  const existing = await prisma.projectPayablePlan.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      ownerEmployeeId: true,
      contractAmount: true,
      hasCustomerCollection: true,
      remark: true,
      remarkNeedsAttention: true,
      vendorContractId: true,
    },
  });
  if (!existing) return new Response("Payable plan not found", { status: 404 });

  const body = await sanitizeRequestBody(req);

  if ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) {
    return new Response("projectId is immutable", { status: 400 });
  }

  const ownerEmployeeId =
    "ownerEmployeeId" in body
      ? String(body.ownerEmployeeId ?? "").trim()
      : existing.ownerEmployeeId;
  const contractAmount =
    "contractAmount" in body ? toNullableInt(body.contractAmount) : existing.contractAmount;
  const hasCustomerCollection =
    "hasCustomerCollection" in body
      ? toNullableBool(body.hasCustomerCollection)
      : existing.hasCustomerCollection;
  const vendorContractIdRaw =
    "vendorContractId" in body
      ? String(body.vendorContractId ?? "").trim() || null
      : existing.vendorContractId;

  if (!ownerEmployeeId) {
    return new Response("ownerEmployeeId is required", {
      status: 400,
    });
  }
  if (contractAmount === null || contractAmount < 0) {
    return new Response("contractAmount must be a non-negative integer", {
      status: 400,
    });
  }
  if (hasCustomerCollection === null) {
    return new Response("hasCustomerCollection must be boolean", {
      status: 400,
    });
  }

  const owner = await prisma.employee.findUnique({
    where: { id: ownerEmployeeId },
    select: { id: true },
  });
  if (!owner) return new Response("Employee not found", { status: 404 });

  const resolvedVendorContractId = vendorContractIdRaw;
  if (vendorContractIdRaw) {
    const contract = await prisma.vendorContract.findUnique({
      where: { id: vendorContractIdRaw },
      select: {
        id: true,
        projectId: true,
      },
    });
    if (!contract) {
      return new Response("Vendor contract not found", { status: 404 });
    }
    if (contract.projectId !== existing.projectId) {
      return new Response("vendorContractId does not belong to project", {
        status: 400,
      });
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

  const updated = await prisma.projectPayablePlan.update({
    where: { id },
    data: {
      ownerEmployeeId,
      contractAmount,
      hasCustomerCollection,
      vendorContractId: resolvedVendorContractId,
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

  await prisma.projectPayablePlan.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
