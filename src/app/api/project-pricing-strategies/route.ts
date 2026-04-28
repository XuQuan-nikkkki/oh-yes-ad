import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireFinanceOrAdminPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

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

const toRequiredNumber = (value: unknown) => {
  const parsed = toNullableNumber(value);
  return parsed === null ? null : parsed;
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

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const costEstimationId =
    req.nextUrl.searchParams.get("costEstimationId")?.trim() ??
    req.nextUrl.searchParams.get("estimationId")?.trim() ??
    "";

  const rows = await prisma.projectPricingStrategy.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(costEstimationId ? { costEstimationId } : {}),
    },
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(
    rows.map((item) => ({
      ...item,
      estimationId: item.costEstimationId,
      estimation: item.costEstimation,
    })),
  );
}

export async function POST(req: NextRequest) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const costEstimationId = String(
    body.costEstimationId ?? body.estimationId ?? "",
  ).trim();
  if (!projectId || !costEstimationId) {
    return new Response("projectId and costEstimationId are required", {
      status: 400,
    });
  }

  const [
    estimatedDuration,
    rentCost,
    plannedLaborCost,
    suggestedLaborCost,
    plannedMiddleOfficeCost,
    suggestedMiddleOfficeCost,
    executionCost,
    agencyFeeRate,
    bottomLinePrice,
    bottomLineProfit,
    targetPrice,
    targetProfit,
  ] = [
    toRequiredNumber(body.estimatedDuration),
    toRequiredNumber(body.rentCost),
    toRequiredNumber(body.plannedLaborCost),
    toRequiredNumber(body.suggestedLaborCost),
    toRequiredNumber(body.plannedMiddleOfficeCost),
    toRequiredNumber(body.suggestedMiddleOfficeCost),
    toRequiredNumber(body.executionCost),
    toRequiredNumber(body.agencyFeeRate ?? body.agencyFee),
    toRequiredNumber(body.bottomLinePrice),
    toRequiredNumber(body.bottomLineProfit),
    toRequiredNumber(body.targetPrice),
    toRequiredNumber(body.targetProfit),
  ];

  const requiredNumbers = [
    estimatedDuration,
    rentCost,
    plannedLaborCost,
    suggestedLaborCost,
    plannedMiddleOfficeCost,
    suggestedMiddleOfficeCost,
    executionCost,
    bottomLinePrice,
    bottomLineProfit,
    targetPrice,
    targetProfit,
  ];
  if (requiredNumbers.some((value) => value === null)) {
    return new Response("Missing required numeric fields", { status: 400 });
  }

  const [project, estimation, existingByEstimation] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.projectCostEstimation.findUnique({
      where: { id: costEstimationId },
      select: { id: true, projectId: true },
    }),
    prisma.projectPricingStrategy.findUnique({
      where: { costEstimationId },
      select: { id: true },
    }),
  ]);
  if (!project) return new Response("Project not found", { status: 404 });
  if (!estimation) return new Response("Estimation not found", { status: 404 });
  if (estimation.projectId !== projectId) {
    return new Response("costEstimationId does not belong to projectId", {
      status: 400,
    });
  }
  if (existingByEstimation) {
    return new Response("Pricing strategy already exists for this estimation", {
      status: 409,
    });
  }

  const executionCostItems = normalizeCostItems(body.executionCostItems);
  const outsourceItems = normalizeOutsourceItems(body.outsourceItems);
  const optionIds = executionCostItems.map((item) => item.costTypeOptionId);
  const validOptionIds = await validateOptionIds(optionIds);
  if (!validOptionIds) {
    return new Response("Invalid costTypeOptionId in executionCostItems", { status: 400 });
  }

  const created = await prisma.projectPricingStrategy.create({
    data: {
      projectId,
      costEstimationId,
      estimatedDuration: Math.round(estimatedDuration ?? 0),
      mode: normalizeMode(body.mode),
      rentCost: rentCost ?? 0,
      plannedLaborCost: plannedLaborCost ?? 0,
      suggestedLaborCost: suggestedLaborCost ?? 0,
      plannedMiddleOfficeCost: plannedMiddleOfficeCost ?? 0,
      suggestedMiddleOfficeCost: suggestedMiddleOfficeCost ?? 0,
      executionCost: executionCost ?? 0,
      agencyFeeRate: agencyFeeRate ?? 0,
      outsourceRemark: toNullableString(body.outsourceRemark),
      bottomLinePrice: bottomLinePrice ?? 0,
      bottomLineProfit: bottomLineProfit ?? 0,
      targetPrice: targetPrice ?? 0,
      targetProfit: targetProfit ?? 0,
      executionCostItems: {
        create: executionCostItems.map((item) => ({
          costTypeOptionId: item.costTypeOptionId,
          budgetAmount: item.budgetAmount ?? null,
          remark: item.remark ?? null,
        })),
      },
      outsourceItems: {
        create: outsourceItems.map((item) => ({
          type: item.type,
          amount: item.amount,
        })),
      },
    } as never,
    include: includeDetail,
  });

  return Response.json({
    ...created,
    estimationId: created.costEstimationId,
    estimation: created.costEstimation,
  });
}
