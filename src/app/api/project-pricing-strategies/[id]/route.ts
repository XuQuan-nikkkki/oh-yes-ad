import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CostItemInput = {
  costTypeOptionId: string;
  budgetAmount?: number | null;
  remark?: string | null;
};

type OutsourceItemInput = {
  type: string;
  amount: number;
};

const normalizeMode = (value: unknown): "range" | "target" => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "target") return "target";
  return "range";
};

const includeDetail = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  costEstimation: {
    select: {
      id: true,
      projectId: true,
      version: true,
      clientBudget: true,
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

const normalizeCostItems = (value: unknown): CostItemInput[] => {
  if (!Array.isArray(value)) return [];
  const items: CostItemInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const costTypeOptionId = String(
      (raw as { costTypeOptionId?: unknown }).costTypeOptionId ?? "",
    ).trim();
    if (!costTypeOptionId) continue;
    items.push({
      costTypeOptionId,
      budgetAmount: toNullableNumber((raw as { budgetAmount?: unknown }).budgetAmount),
      remark: toNullableString((raw as { remark?: unknown }).remark),
    });
  }

  const dedupMap = new Map<string, CostItemInput>();
  for (const item of items) {
    dedupMap.set(item.costTypeOptionId, item);
  }
  return Array.from(dedupMap.values());
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

  const item = await prisma.projectPricingStrategy.findUnique({
    where: { id },
    include: includeDetail,
  });
  if (!item) return new Response("Project pricing strategy not found", { status: 404 });

  return Response.json({
    ...item,
    estimationId: item.costEstimationId,
    estimation: item.costEstimation,
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectPricingStrategy.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      costEstimationId: true,
      estimatedDuration: true,
      mode: true,
      rentCost: true,
      plannedLaborCost: true,
      suggestedLaborCost: true,
      plannedMiddleOfficeCost: true,
      suggestedMiddleOfficeCost: true,
      executionCost: true,
      agencyFeeRate: true,
      bottomLinePrice: true,
      bottomLineProfit: true,
      targetPrice: true,
      targetProfit: true,
    },
  });
  if (!existing) return new Response("Project pricing strategy not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const incomingCostEstimationId = String(
    body.costEstimationId ?? body.estimationId ?? "",
  ).trim();
  if (
    ("projectId" in body && String(body.projectId ?? "").trim() !== existing.projectId) ||
    (("costEstimationId" in body || "estimationId" in body) &&
      incomingCostEstimationId !== existing.costEstimationId)
  ) {
    return new Response("projectId and costEstimationId are immutable", {
      status: 400,
    });
  }

  const mode = "mode" in body ? normalizeMode(body.mode) : null;
  const estimatedDuration = toNullableNumber(body.estimatedDuration);
  const rentCost = toNullableNumber(body.rentCost);
  const plannedLaborCost = toNullableNumber(body.plannedLaborCost);
  const suggestedLaborCost = toNullableNumber(body.suggestedLaborCost);
  const plannedMiddleOfficeCost = toNullableNumber(body.plannedMiddleOfficeCost);
  const suggestedMiddleOfficeCost = toNullableNumber(body.suggestedMiddleOfficeCost);
  const executionCost = toNullableNumber(body.executionCost);
  const agencyFeeRate = toNullableNumber(body.agencyFeeRate ?? body.agencyFee);
  const bottomLinePrice = toNullableNumber(body.bottomLinePrice);
  const bottomLineProfit = toNullableNumber(body.bottomLineProfit);
  const targetPrice = toNullableNumber(body.targetPrice);
  const targetProfit = toNullableNumber(body.targetProfit);

  const requiredFieldPairs: Array<[string, number | null]> = [
    ["estimatedDuration", estimatedDuration],
    ["rentCost", rentCost],
    ["plannedLaborCost", plannedLaborCost],
    ["suggestedLaborCost", suggestedLaborCost],
    ["plannedMiddleOfficeCost", plannedMiddleOfficeCost],
    ["suggestedMiddleOfficeCost", suggestedMiddleOfficeCost],
    ["executionCost", executionCost],
    ["agencyFeeRate", agencyFeeRate],
    ["bottomLinePrice", bottomLinePrice],
    ["bottomLineProfit", bottomLineProfit],
    ["targetPrice", targetPrice],
    ["targetProfit", targetProfit],
  ];
  for (const [field, value] of requiredFieldPairs) {
    if (field in body && value === null) {
      return new Response(`Invalid ${field}`, { status: 400 });
    }
  }

  const hasExecutionCostItems = "executionCostItems" in body;
  const executionCostItems = hasExecutionCostItems
    ? normalizeCostItems(body.executionCostItems)
    : [];
  const hasOutsourceItems = "outsourceItems" in body;
  const outsourceItems = hasOutsourceItems
    ? normalizeOutsourceItems(body.outsourceItems)
    : [];
  if (hasExecutionCostItems) {
    const optionIds = executionCostItems.map((item) => item.costTypeOptionId);
    const validOptionIds = await validateOptionIds(optionIds);
    if (!validOptionIds) {
      return new Response("Invalid costTypeOptionId in executionCostItems", { status: 400 });
    }
  }

  const updated = await prisma.projectPricingStrategy.update({
    where: { id },
    data: {
      estimatedDuration:
        estimatedDuration === null || estimatedDuration === undefined
          ? undefined
          : Math.round(estimatedDuration),
      mode: mode ?? undefined,
      rentCost: rentCost === null || rentCost === undefined ? undefined : rentCost,
      plannedLaborCost:
        plannedLaborCost === null || plannedLaborCost === undefined
          ? undefined
          : plannedLaborCost,
      suggestedLaborCost:
        suggestedLaborCost === null || suggestedLaborCost === undefined
          ? undefined
          : suggestedLaborCost,
      plannedMiddleOfficeCost:
        plannedMiddleOfficeCost === null || plannedMiddleOfficeCost === undefined
          ? undefined
          : plannedMiddleOfficeCost,
      suggestedMiddleOfficeCost:
        suggestedMiddleOfficeCost === null || suggestedMiddleOfficeCost === undefined
          ? undefined
          : suggestedMiddleOfficeCost,
      executionCost:
        executionCost === null || executionCost === undefined
          ? undefined
          : executionCost,
      agencyFeeRate:
        agencyFeeRate === null || agencyFeeRate === undefined
          ? undefined
          : agencyFeeRate,
      outsourceRemark:
        "outsourceRemark" in body
          ? toNullableString(body.outsourceRemark)
          : undefined,
      bottomLinePrice:
        bottomLinePrice === null || bottomLinePrice === undefined
          ? undefined
          : bottomLinePrice,
      bottomLineProfit:
        bottomLineProfit === null || bottomLineProfit === undefined
          ? undefined
          : bottomLineProfit,
      targetPrice:
        targetPrice === null || targetPrice === undefined ? undefined : targetPrice,
      targetProfit:
        targetProfit === null || targetProfit === undefined ? undefined : targetProfit,
      ...(hasExecutionCostItems
        ? {
            executionCostItems: {
              deleteMany: {},
              create: executionCostItems.map((item) => ({
                costTypeOptionId: item.costTypeOptionId,
                budgetAmount: item.budgetAmount ?? null,
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
    } as never,
    include: includeDetail,
  });

  return Response.json({
    ...updated,
    estimationId: updated.costEstimationId,
    estimation: updated.costEstimation,
  });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectPricingStrategy.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return new Response("Project pricing strategy not found", { status: 404 });

  await prisma.projectPricingStrategy.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
