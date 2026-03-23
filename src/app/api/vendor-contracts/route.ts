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
};

const toNullableText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

const serializeContract = (
  row: {
    contractAmount: unknown;
  } & Record<string, unknown>,
) => ({
  ...row,
  contractAmount:
    row.contractAmount === null || row.contractAmount === undefined
      ? null
      : Number(row.contractAmount),
});

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";

  const rows = await prisma.vendorContract.findMany({
    where: projectId ? { projectId } : undefined,
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(
    rows.map((row) => serializeContract(row as Record<string, unknown> as never)),
  );
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const vendorId = String(body.vendorId ?? "").trim();
  const legalEntityId = String(body.legalEntityId ?? "").trim();
  const contractAmount = toNullableInt(body.contractAmount);

  if (!projectId || !vendorId || !legalEntityId || contractAmount === null || contractAmount < 0) {
    return new Response(
      "projectId, vendorId, legalEntityId and valid contractAmount are required",
      { status: 400 },
    );
  }

  const [project, vendor, legalEntity, existing] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } }),
    prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { id: true },
    }),
    prisma.vendorContract.findFirst({
      where: { projectId },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!vendor) return new Response("Vendor not found", { status: 404 });
  if (!legalEntity) return new Response("Legal entity not found", { status: 404 });
  if (existing) {
    return new Response("Vendor contract already exists for this project", {
      status: 409,
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.vendorContract.create({
      data: {
        projectId,
        vendorId,
        legalEntityId,
        serviceContent: toNullableText(body.serviceContent),
        contractAmount,
      },
      include: includeDetail,
    });

    await tx.project.update({
      where: { id: projectId },
      data: {
        vendors: {
          connect: { id: vendorId },
        },
      },
    });

    return row;
  });

  return Response.json(
    serializeContract(created as Record<string, unknown> as never),
  );
}
