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

  const rows = await prisma.projectReceivableNode.findMany({
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
  const keyDeliverable = String(body.keyDeliverable ?? "").trim();

  if (!planId || !stageOptionId || !keyDeliverable) {
    return new Response("planId, stageOptionId and keyDeliverable are required", {
      status: 400,
    });
  }

  const expectedAmountTaxIncluded = toNullableInt(body.expectedAmountTaxIncluded);
  const expectedDate = toNullableDate(body.expectedDate);
  const actualAmountTaxIncluded = toNullableInt(body.actualAmountTaxIncluded);
  const actualDate = toNullableDate(body.actualDate);
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
  const hasActualAmount = actualAmountTaxIncluded !== null;
  const hasActualDate = actualDate !== null;
  if (hasActualAmount !== hasActualDate) {
    return new Response(
      "actualAmountTaxIncluded and actualDate must be both provided or both empty",
      { status: 400 },
    );
  }
  if (actualAmountTaxIncluded !== null && actualAmountTaxIncluded < 0) {
    return new Response("actualAmountTaxIncluded is invalid", { status: 400 });
  }

  const remarkNeedsAttention = remarkNeedsAttentionRaw ?? false;

  const [plan, stageOption] = await Promise.all([
    prisma.projectReceivablePlan.findUnique({ where: { id: planId }, select: { id: true } }),
    prisma.selectOption.findUnique({ where: { id: stageOptionId }, select: { id: true } }),
  ]);
  if (!plan) return new Response("Plan not found", { status: 404 });
  if (!stageOption) return new Response("Stage option not found", { status: 404 });

  const sortOrderFromBody = toNullableInt(body.sortOrder);
  const sortOrder =
    sortOrderFromBody !== null
      ? sortOrderFromBody
      : ((await prisma.projectReceivableNode.aggregate({
          where: { planId },
          _max: { sortOrder: true },
        }))._max.sortOrder ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    const node = await tx.projectReceivableNode.create({
      data: {
        planId,
        stageOptionId,
        sortOrder,
        keyDeliverable,
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

    if (actualAmountTaxIncluded !== null && actualDate !== null) {
      await tx.projectReceivableActualNode.create({
        data: {
          receivableNodeId: node.id,
          actualAmountTaxIncluded,
          actualDate,
        },
      });
    }

    return tx.projectReceivableNode.findUniqueOrThrow({
      where: { id: node.id },
      include: includeDetail,
    });
  });

  return Response.json(created);
}
