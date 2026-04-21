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

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const item = await prisma.vendorContract.findUnique({
    where: { id },
    include: includeDetail,
  });
  if (!item) return new Response("Vendor contract not found", { status: 404 });

  return Response.json(
    serializeContract(item as Record<string, unknown> as never),
  );
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.vendorContract.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      vendorId: true,
      contractAmount: true,
    },
  });
  if (!existing) return new Response("Vendor contract not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  if ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) {
    return new Response("projectId is immutable", { status: 400 });
  }

  if ("vendorId" in body) {
    const vendorId = String(body.vendorId ?? "").trim();
    if (!vendorId) return new Response("vendorId is required", { status: 400 });
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) return new Response("Vendor not found", { status: 404 });
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
    if (!legalEntity) return new Response("Legal entity not found", { status: 404 });
  }

  if ("contractAmount" in body) {
    const contractAmount = toNullableInt(body.contractAmount);
    if (contractAmount === null || contractAmount < 0) {
      return new Response("contractAmount is invalid", { status: 400 });
    }
  }

  const nextVendorId =
    "vendorId" in body ? String(body.vendorId ?? "").trim() : existing.vendorId;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.vendorContract.update({
      where: { id },
      data: {
        vendorId: "vendorId" in body ? nextVendorId : undefined,
        legalEntityId:
          "legalEntityId" in body ? String(body.legalEntityId ?? "").trim() : undefined,
        serviceContent: "serviceContent" in body ? toNullableText(body.serviceContent) : undefined,
        contractAmount:
          "contractAmount" in body
            ? (toNullableInt(body.contractAmount) as number)
            : undefined,
      },
      include: includeDetail,
    });

    if (nextVendorId && nextVendorId !== existing.vendorId) {
      await tx.project.update({
        where: { id: existing.projectId },
        data: {
          vendors: {
            disconnect: { id: existing.vendorId },
            connect: { id: nextVendorId },
          },
        },
      });
    } else if (nextVendorId) {
      await tx.project.update({
        where: { id: existing.projectId },
        data: {
          vendors: {
            connect: { id: nextVendorId },
          },
        },
      });
    }

    return row;
  });

  return Response.json(
    serializeContract(updated as Record<string, unknown> as never),
  );
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.vendorContract.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      vendorId: true,
    },
  });
  if (!existing) return new Response("Vendor contract not found", { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.vendorContract.delete({ where: { id } });
    await tx.project.update({
      where: { id: existing.projectId },
      data: {
        vendors: {
          disconnect: { id: existing.vendorId },
        },
      },
    });
  });

  return Response.json({ success: true });
}
