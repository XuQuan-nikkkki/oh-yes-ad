import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { toNullableInt } from "@/lib/toNullableInt";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const includeDetail = {
  project: {
    select: {
      id: true,
      name: true,
      statusOption: {
        select: {
          id: true,
          value: true,
          color: true,
        },
      },
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
      expectedDateHistories: {
        orderBy: [{ changedAt: "desc" as const }],
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

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";

  const rows = await prisma.projectReceivablePlan.findMany({
    where: projectId ? { projectId } : undefined,
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const clientId = String(body.clientId ?? "").trim();
  const legalEntityId = String(body.legalEntityId ?? "").trim();
  const ownerEmployeeId = String(body.ownerEmployeeId ?? "").trim();
  const clientContractId =
    String(body.clientContractId ?? body.customerContractId ?? "").trim() || null;

  if (!projectId || !clientId || !legalEntityId || !ownerEmployeeId) {
    return new Response("projectId, clientId, legalEntityId and ownerEmployeeId are required", {
      status: 400,
    });
  }

  const contractAmount = toNullableInt(body.contractAmount);
  const hasVendorPaymentRaw = toNullableBool(body.hasVendorPayment);
  const remarkNeedsAttentionRaw = toNullableBool(body.remarkNeedsAttention);
  if (contractAmount === null || contractAmount < 0) {
    return new Response("contractAmount must be a non-negative integer", {
      status: 400,
    });
  }
  if ("hasVendorPayment" in body && hasVendorPaymentRaw === null) {
    return new Response("hasVendorPayment must be boolean", { status: 400 });
  }
  const hasVendorPayment = hasVendorPaymentRaw ?? false;
  const remarkNeedsAttention = remarkNeedsAttentionRaw ?? false;

  const [project, client, legalEntity, owner] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true },
    }),
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
    prisma.legalEntity.findUnique({ where: { id: legalEntityId }, select: { id: true } }),
    prisma.employee.findUnique({ where: { id: ownerEmployeeId }, select: { id: true } }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!client) return new Response("Client not found", { status: 404 });
  if (!legalEntity) return new Response("Legal entity not found", { status: 404 });
  if (!owner) return new Response("Employee not found", { status: 404 });

  if (project.clientId && project.clientId !== clientId) {
    return new Response("clientId does not match project.clientId", { status: 400 });
  }

  let resolvedClientContractId: string | null = clientContractId;
  if (clientContractId) {
    const contract = await prisma.clientContract.findUnique({
      where: { id: clientContractId },
      select: {
        id: true,
        projectId: true,
        legalEntityId: true,
      },
    });
    if (!contract) {
      return new Response("Customer contract not found", { status: 404 });
    }
    if (contract.projectId !== projectId) {
        return new Response("clientContractId does not belong to project", {
          status: 400,
        });
      }
    if (legalEntityId && contract.legalEntityId !== legalEntityId) {
      resolvedClientContractId = null;
    }
  }

  const created = await prisma.projectReceivablePlan.create({
    data: {
      projectId,
      clientId,
      legalEntityId,
      ownerEmployeeId,
      clientContractId: resolvedClientContractId,
      contractAmount,
      hasVendorPayment,
      serviceContent:
        typeof body.serviceContent === "string" && body.serviceContent.trim().length > 0
          ? body.serviceContent.trim()
          : null,
      remark:
        typeof body.remark === "string" && body.remark.trim().length > 0
          ? body.remark.trim()
          : null,
      remarkNeedsAttention,
      status: "DRAFT",
    },
    include: includeDetail,
  });

  return Response.json(created);
}
