import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireFinanceOrAdminPermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { toNullableDecimal } from "@/lib/toNullableDecimal";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ADJUSTMENT_RECORD_TYPES = [
  "REDUCTION",
  "INCREASE",
  "REDUCTION_REVERSAL",
] as const;

type AdjustmentRecordType = (typeof ADJUSTMENT_RECORD_TYPES)[number];

const includeDetail = {
  payableNode: {
    select: {
      id: true,
      planId: true,
    },
  },
  createdByEmployee: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const toDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
};

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRecordType = (value: unknown): AdjustmentRecordType | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return ADJUSTMENT_RECORD_TYPES.includes(normalized as AdjustmentRecordType)
    ? (normalized as AdjustmentRecordType)
    : null;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectPayableAdjustmentRecord.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return new Response("Payable adjustment record not found", {
      status: 404,
    });
  }

  const body = await sanitizeRequestBody(req);
  const patchData: Prisma.ProjectPayableAdjustmentRecordUncheckedUpdateInput =
    {};

  if ("type" in body) {
    const type = normalizeRecordType(body.type);
    if (!type) return new Response("type is invalid", { status: 400 });
    patchData.type = type;
  }

  if ("amountTaxIncluded" in body) {
    const amountTaxIncluded = toNullableDecimal(body.amountTaxIncluded);
    if (amountTaxIncluded === null || amountTaxIncluded <= 0) {
      return new Response("amountTaxIncluded is invalid", { status: 400 });
    }
    patchData.amountTaxIncluded = amountTaxIncluded;
  }

  if ("occurredAt" in body) {
    const occurredAt = toDate(body.occurredAt);
    if (!occurredAt) return new Response("occurredAt is invalid", { status: 400 });
    patchData.occurredAt = occurredAt;
  }

  if ("reason" in body) {
    patchData.reason = toNullableString(body.reason);
  }

  if ("remark" in body) {
    patchData.remark = toNullableString(body.remark);
  }

  const updated = await prisma.projectPayableAdjustmentRecord.update({
    where: { id },
    data: patchData,
    include: includeDetail,
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.projectPayableAdjustmentRecord.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
