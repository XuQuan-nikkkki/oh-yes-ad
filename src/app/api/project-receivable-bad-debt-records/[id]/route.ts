import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireFinanceOrAdminPermission } from "@/lib/api-permissions";
import { toNullableDecimal } from "@/lib/toNullableDecimal";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

const BAD_DEBT_RECORD_TYPES = ["WRITE_OFF", "RECOVERY"] as const;

type BadDebtRecordType = (typeof BAD_DEBT_RECORD_TYPES)[number];

const includeDetail = {
  receivableNode: {
    select: {
      id: true,
      planId: true,
    },
  },
  actualNode: {
    select: {
      id: true,
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

const normalizeRecordType = (value: unknown): BadDebtRecordType | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return BAD_DEBT_RECORD_TYPES.includes(normalized as BadDebtRecordType)
    ? (normalized as BadDebtRecordType)
    : null;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectReceivableBadDebtRecord.findUnique({
    where: { id },
    select: {
      id: true,
      receivableNodeId: true,
      type: true,
      amountTaxIncluded: true,
      occurredAt: true,
      actualNodeId: true,
    },
  });
  if (!existing) {
    return new Response("Bad debt record not found", { status: 404 });
  }

  const body = await sanitizeRequestBody(req);
  const patchData: Prisma.ProjectReceivableBadDebtRecordUncheckedUpdateInput = {};
  let nextType: BadDebtRecordType = existing.type;
  let nextAmount: Prisma.Decimal | number = existing.amountTaxIncluded;
  let nextOccurredAt = existing.occurredAt;

  if ("type" in body) {
    const type = normalizeRecordType(body.type);
    if (!type) return new Response("type is invalid", { status: 400 });
    patchData.type = type;
    nextType = type;
  }

  if ("amountTaxIncluded" in body) {
    const amountTaxIncluded = toNullableDecimal(body.amountTaxIncluded);
    if (amountTaxIncluded === null || amountTaxIncluded <= 0) {
      return new Response("amountTaxIncluded is invalid", { status: 400 });
    }
    patchData.amountTaxIncluded = amountTaxIncluded;
    nextAmount = amountTaxIncluded;
  }

  if ("occurredAt" in body) {
    const occurredAt = toDate(body.occurredAt);
    if (!occurredAt) return new Response("occurredAt is invalid", { status: 400 });
    patchData.occurredAt = occurredAt;
    nextOccurredAt = occurredAt;
  }

  if ("reason" in body) {
    patchData.reason = toNullableString(body.reason);
  }

  if ("remark" in body) {
    patchData.remark = toNullableString(body.remark);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (nextType === "RECOVERY") {
      const actualNode = existing.actualNodeId
        ? await tx.projectReceivableActualNode.update({
            where: { id: existing.actualNodeId },
            data: {
              actualAmountTaxIncluded: nextAmount,
              actualDate: nextOccurredAt,
              remark: "坏账收回自动生成实收记录",
              remarkNeedsAttention: false,
            },
            select: { id: true },
          })
        : await tx.projectReceivableActualNode.create({
            data: {
              receivableNodeId: existing.receivableNodeId,
              actualAmountTaxIncluded: nextAmount,
              actualDate: nextOccurredAt,
              remark: "坏账收回自动生成实收记录",
              remarkNeedsAttention: false,
            },
            select: { id: true },
          });

      return tx.projectReceivableBadDebtRecord.update({
        where: { id },
        data: {
          ...patchData,
          actualNodeId: actualNode.id,
        },
        include: includeDetail,
      });
    }

    const updatedRecord = await tx.projectReceivableBadDebtRecord.update({
      where: { id },
      data: {
        ...patchData,
        actualNodeId: null,
      },
      include: includeDetail,
    });

    if (existing.actualNodeId) {
      await tx.projectReceivableActualNode.deleteMany({
        where: { id: existing.actualNodeId },
      });
    }

    return updatedRecord;
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.$transaction(async (tx) => {
    const existing = await tx.projectReceivableBadDebtRecord.findUnique({
      where: { id },
      select: { actualNodeId: true },
    });

    await tx.projectReceivableBadDebtRecord.delete({
      where: { id },
    });

    if (existing?.actualNodeId) {
      await tx.projectReceivableActualNode.deleteMany({
        where: { id: existing.actualNodeId },
      });
    }
  });

  return Response.json({ success: true });
}
