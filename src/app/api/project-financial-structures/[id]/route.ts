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
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  estimation: {
    select: {
      id: true,
      projectId: true,
      version: true,
      type: true,
    },
  },
  executionCostItems: {
    select: {
      id: true,
      costTypeOptionId: true,
      budgetAmount: true,
      remark: true,
      costTypeOption: {
        select: {
          id: true,
          value: true,
          color: true,
          field: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  outsourceItems: {
    select: {
      id: true,
      type: true,
      amount: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

type ExecutionCostItemInput = {
  costTypeOptionId: string;
  budgetAmount: number;
  remark?: string | null;
};

type OutsourceItemInput = {
  type: string;
  amount: number;
};

const normalizeExecutionCostItems = (value: unknown): ExecutionCostItemInput[] => {
  if (!Array.isArray(value)) return [];
  const items: ExecutionCostItemInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const costTypeOptionId = String(
      (raw as { costTypeOptionId?: unknown }).costTypeOptionId ?? "",
    ).trim();
    const budgetAmount = toNullableNumber((raw as { budgetAmount?: unknown }).budgetAmount);
    if (!costTypeOptionId || budgetAmount === null) continue;
    items.push({
      costTypeOptionId,
      budgetAmount,
      remark: toNullableString((raw as { remark?: unknown }).remark),
    });
  }
  const dedupMap = new Map<string, ExecutionCostItemInput>();
  for (const item of items) {
    dedupMap.set(item.costTypeOptionId, item);
  }
  return Array.from(dedupMap.values());
};

const normalizeOutsourceItems = (value: unknown): OutsourceItemInput[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const type = String((raw as { type?: unknown }).type ?? "").trim();
      const amount = toNullableNumber((raw as { amount?: unknown }).amount);
      if (!type || amount === null) return null;
      return {
        type,
        amount: Math.round(amount),
      };
    })
    .filter((item): item is OutsourceItemInput => Boolean(item));
};

const validateOptionIds = async (optionIds: string[]) => {
  if (optionIds.length === 0) return true;
  const rows = await prisma.selectOption.findMany({
    where: { id: { in: optionIds } },
    select: { id: true },
  });
  return rows.length === optionIds.length;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const item = await prisma.projectFinancialStructure.findUnique({
    where: { id },
    include: includeDetail,
  });

  if (!item) {
    return new Response("Project financial structure not found", { status: 404 });
  }

  return Response.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectFinancialStructure.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      estimationId: true,
    },
  });
  if (!existing) {
    return new Response("Project financial structure not found", { status: 404 });
  }

  const body = await sanitizeRequestBody(req);

  if (
    ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) ||
    ("estimationId" in body &&
      String(body.estimationId ?? "").trim() !== existing.estimationId)
  ) {
    return new Response("projectId and estimationId are immutable", { status: 400 });
  }

  const laborCost = toNullableNumber(body.laborCost);
  const rentCost = toNullableNumber(body.rentCost);
  const middleOfficeCost = toNullableNumber(body.middleOfficeCost);
  const executionCost = toNullableNumber(body.executionCost);
  const agencyFeeRate = toNullableNumber(body.agencyFeeRate ?? body.agencyFee);
  const totalCost = toNullableNumber(body.totalCost);
  const hasExecutionCostItems = "executionCostItems" in body;
  const executionCostItems = hasExecutionCostItems
    ? normalizeExecutionCostItems(body.executionCostItems)
    : [];
  const hasOutsourceItems = "outsourceItems" in body;
  const outsourceItems = hasOutsourceItems
    ? normalizeOutsourceItems(body.outsourceItems)
    : [];

  const requiredFieldPairs: Array<[string, number | null]> = [
    ["laborCost", laborCost],
    ["rentCost", rentCost],
    ["middleOfficeCost", middleOfficeCost],
    ["executionCost", executionCost],
    ["agencyFeeRate", agencyFeeRate],
    ["totalCost", totalCost],
  ];

  for (const [field, value] of requiredFieldPairs) {
    if (field in body && value === null) {
      return new Response(`Invalid ${field}`, { status: 400 });
    }
  }

  if (hasExecutionCostItems) {
    const optionIds = executionCostItems.map((item) => item.costTypeOptionId);
    const validOptionIds = await validateOptionIds(optionIds);
    if (!validOptionIds) {
      return new Response("Invalid costTypeOptionId in executionCostItems", {
        status: 400,
      });
    }
  }

  const updated = await prisma.projectFinancialStructure.update({
    where: { id },
    data: {
      laborCost: laborCost === null || laborCost === undefined ? undefined : laborCost,
      rentCost: rentCost === null || rentCost === undefined ? undefined : rentCost,
      middleOfficeCost:
        middleOfficeCost === null || middleOfficeCost === undefined
          ? undefined
          : middleOfficeCost,
      executionCost:
        executionCost === null || executionCost === undefined
          ? undefined
          : executionCost,
      agencyFeeRate:
        agencyFeeRate === null || agencyFeeRate === undefined
          ? undefined
          : agencyFeeRate,
      totalCost: totalCost === null || totalCost === undefined ? undefined : totalCost,
      ...(hasExecutionCostItems
        ? {
            executionCostItems: {
              deleteMany: {},
              create: executionCostItems.map((item) => ({
                costTypeOptionId: item.costTypeOptionId,
                budgetAmount: item.budgetAmount,
                remark: item.remark ?? null,
              })),
            },
          }
        : {}),
      ...(hasOutsourceItems
        ? {
            outsourceItems: {
              deleteMany: {},
              create: outsourceItems.map((item) => ({
                type: item.type,
                amount: item.amount,
              })),
            },
          }
        : {}),
    },
    include: includeDetail,
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectFinancialStructure.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return new Response("Project financial structure not found", { status: 404 });
  }

  await prisma.projectFinancialStructure.delete({ where: { id } });

  return Response.json({ success: true });
}
