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

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId")?.trim() ?? "";
  if (!planId) return new Response("Missing planId", { status: 400 });

  const rows = await prisma.projectPayableNode.findMany({
    where: { planId },
    include: includeDetail,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const planId = String(body.planId ?? "").trim();
  const stageOptionId = String(body.stageOptionId ?? "").trim();
  const paymentCondition = String(body.paymentCondition ?? "").trim();

  if (!planId || !stageOptionId || !paymentCondition) {
    return new Response("planId, stageOptionId and paymentCondition are required", {
      status: 400,
    });
  }

  const expectedAmountTaxIncluded = toNullableInt(body.expectedAmountTaxIncluded);
  const expectedDate = toNullableDate(body.expectedDate);
  const remarkNeedsAttentionRaw = toNullableBool(body.remarkNeedsAttention);

  if (
    expectedAmountTaxIncluded === null ||
    expectedAmountTaxIncluded < 0 ||
    expectedDate === null
  ) {
    return new Response("expectedAmountTaxIncluded and expectedDate are invalid", {
      status: 400,
    });
  }

  const remarkNeedsAttention = remarkNeedsAttentionRaw ?? false;

  const [plan, stageOption] = await Promise.all([
    prisma.projectPayablePlan.findUnique({ where: { id: planId }, select: { id: true } }),
    prisma.selectOption.findUnique({ where: { id: stageOptionId }, select: { id: true } }),
  ]);
  if (!plan) return new Response("Plan not found", { status: 404 });
  if (!stageOption) return new Response("Stage option not found", { status: 404 });

  const sortOrderFromBody = toNullableInt(body.sortOrder);
  const sortOrder =
    sortOrderFromBody !== null
      ? sortOrderFromBody
      : ((await prisma.projectPayableNode.aggregate({
          where: { planId },
          _max: { sortOrder: true },
        }))._max.sortOrder ?? 0) + 1;

  const created = await prisma.projectPayableNode.create({
    data: {
      planId,
      stageOptionId,
      sortOrder,
      paymentCondition,
      expectedAmountTaxIncluded,
      expectedDate,
      remarkNeedsAttention,
      remark:
        typeof body.remark === "string" && body.remark.trim().length > 0
          ? body.remark.trim()
          : null,
    },
    include: includeDetail,
  });

  return Response.json(created);
}
