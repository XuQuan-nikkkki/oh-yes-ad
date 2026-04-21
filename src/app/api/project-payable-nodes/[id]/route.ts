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

  const existing = await prisma.projectPayableNode.findUnique({
    where: { id },
    select: {
      id: true,
    },
  });
  if (!existing) return new Response("Node not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const patchData: Record<string, unknown> = {};

  if ("stageOptionId" in body) {
    const stageOptionId = String(body.stageOptionId ?? "").trim();
    if (!stageOptionId) {
      return new Response("stageOptionId is invalid", { status: 400 });
    }
    patchData.stageOptionId = stageOptionId;
  }

  if ("sortOrder" in body) {
    const sortOrder = toNullableInt(body.sortOrder);
    if (sortOrder === null) {
      return new Response("sortOrder is invalid", { status: 400 });
    }
    patchData.sortOrder = sortOrder;
  }

  if ("paymentCondition" in body) {
    const paymentCondition = String(body.paymentCondition ?? "").trim();
    if (!paymentCondition) {
      return new Response("paymentCondition is invalid", { status: 400 });
    }
    patchData.paymentCondition = paymentCondition;
  }

  if ("expectedAmountTaxIncluded" in body) {
    const amount = toNullableInt(body.expectedAmountTaxIncluded);
    if (amount === null || amount < 0) {
      return new Response("expectedAmountTaxIncluded is invalid", { status: 400 });
    }
    patchData.expectedAmountTaxIncluded = amount;
  }

  if ("expectedDate" in body) {
    const expectedDate = toNullableDate(body.expectedDate);
    if (expectedDate === null) {
      return new Response("expectedDate is invalid", { status: 400 });
    }
    patchData.expectedDate = expectedDate;
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

  const updated = await prisma.projectPayableNode.update({
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

  await prisma.projectPayableNode.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
