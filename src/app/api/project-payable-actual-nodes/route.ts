import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

export async function GET(req: NextRequest) {
  const payableNodeId = req.nextUrl.searchParams.get("payableNodeId")?.trim() ?? "";
  if (!payableNodeId) return new Response("Missing payableNodeId", { status: 400 });

  const rows = await prisma.projectPayableActualNode.findMany({
    where: { payableNodeId },
    include: includeDetail,
    orderBy: [{ actualDate: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const payableNodeId = String(body.payableNodeId ?? "").trim();
  if (!payableNodeId) {
    return new Response("payableNodeId is required", { status: 400 });
  }

  const actualAmountTaxIncluded = toNullableInt(body.actualAmountTaxIncluded);
  const actualDate = toNullableDate(body.actualDate);
  const remarkNeedsAttentionRaw = toNullableBool(body.remarkNeedsAttention);

  if (actualAmountTaxIncluded === null || actualAmountTaxIncluded < 0) {
    return new Response("actualAmountTaxIncluded is invalid", { status: 400 });
  }
  if (actualDate === null) {
    return new Response("actualDate is invalid", { status: 400 });
  }

  const remarkNeedsAttention = remarkNeedsAttentionRaw ?? false;

  const node = await prisma.projectPayableNode.findUnique({
    where: { id: payableNodeId },
    select: { id: true },
  });
  if (!node) return new Response("Payable node not found", { status: 404 });

  const created = await prisma.projectPayableActualNode.create({
    data: {
      payableNodeId,
      actualAmountTaxIncluded,
      actualDate,
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

