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
  payableNode: {
    select: {
      id: true,
      planId: true,
    },
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

const toNullableDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
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

  const existing = await prisma.projectPayableActualNode.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return new Response("Actual node not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const patchData: Record<string, unknown> = {};

  if ("actualAmountTaxIncluded" in body) {
    const actualAmountTaxIncluded = toNullableInt(body.actualAmountTaxIncluded);
    if (actualAmountTaxIncluded === null || actualAmountTaxIncluded < 0) {
      return new Response("actualAmountTaxIncluded is invalid", { status: 400 });
    }
    patchData.actualAmountTaxIncluded = actualAmountTaxIncluded;
  }

  if ("actualDate" in body) {
    const actualDate = toNullableDate(body.actualDate);
    if (actualDate === null) {
      return new Response("actualDate is invalid", { status: 400 });
    }
    patchData.actualDate = actualDate;
  }

  if ("remark" in body) {
    patchData.remark =
      typeof body.remark === "string" && body.remark.trim().length > 0
        ? body.remark.trim()
        : null;
  }

  if ("remarkNeedsAttention" in body) {
    const remarkNeedsAttention = toNullableBool(body.remarkNeedsAttention);
    if (remarkNeedsAttention === null) {
      return new Response("remarkNeedsAttention must be boolean", { status: 400 });
    }
    patchData.remarkNeedsAttention = remarkNeedsAttention;
  }

  const updated = await prisma.projectPayableActualNode.update({
    where: { id },
    data: patchData,
    include: includeDetail,
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.projectPayableActualNode.delete({
    where: { id },
  });

  return Response.json({ success: true });
}

