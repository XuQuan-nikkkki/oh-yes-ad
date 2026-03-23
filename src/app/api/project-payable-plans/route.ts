import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

const toNullableInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
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

  const rows = await prisma.projectPayablePlan.findMany({
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
  const ownerEmployeeId = String(body.ownerEmployeeId ?? "").trim();
  const vendorContractId = String(body.vendorContractId ?? "").trim() || null;

  if (!projectId || !ownerEmployeeId) {
    return new Response("projectId and ownerEmployeeId are required", {
      status: 400,
    });
  }

  const contractAmount = toNullableInt(body.contractAmount);
  const remarkNeedsAttentionRaw = toNullableBool(body.remarkNeedsAttention);
  if (contractAmount === null || contractAmount < 0) {
    return new Response("contractAmount must be a non-negative integer", {
      status: 400,
    });
  }
  const remarkNeedsAttention = remarkNeedsAttentionRaw ?? false;

  const [project, owner] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    }),
    prisma.employee.findUnique({ where: { id: ownerEmployeeId }, select: { id: true } }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!owner) return new Response("Employee not found", { status: 404 });

  const resolvedVendorContractId: string | null = vendorContractId;
  if (vendorContractId) {
    const contract = await prisma.vendorContract.findUnique({
      where: { id: vendorContractId },
      select: {
        id: true,
        projectId: true,
      },
    });
    if (!contract) {
      return new Response("Vendor contract not found", { status: 404 });
    }
    if (contract.projectId !== projectId) {
      return new Response("vendorContractId does not belong to project", {
        status: 400,
      });
    }
  }

  const created = await prisma.projectPayablePlan.create({
    data: {
      projectId,
      ownerEmployeeId,
      vendorContractId: resolvedVendorContractId,
      contractAmount,
      remark:
        typeof body.remark === "string" && body.remark.trim().length > 0
          ? body.remark.trim()
          : null,
      remarkNeedsAttention,
    },
    include: includeDetail,
  });

  return Response.json(created);
}
