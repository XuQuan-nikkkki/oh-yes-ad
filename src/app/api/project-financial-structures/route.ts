import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

const toRequiredNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeExecutionCostItems = (value: unknown): ExecutionCostItemInput[] => {
  if (!Array.isArray(value)) return [];
  const items: ExecutionCostItemInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const costTypeOptionId = String(
      (raw as { costTypeOptionId?: unknown }).costTypeOptionId ?? "",
    ).trim();
    const budgetAmount = toRequiredNumber(
      (raw as { budgetAmount?: unknown }).budgetAmount,
    );
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
      const amount = toRequiredNumber((raw as { amount?: unknown }).amount);
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

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const estimationId = req.nextUrl.searchParams.get("estimationId")?.trim() ?? "";

  const rows = await prisma.projectFinancialStructure.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(estimationId ? { estimationId } : {}),
    },
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const estimationId = String(body.estimationId ?? "").trim();
  if (!projectId || !estimationId) {
    return new Response("projectId and estimationId are required", { status: 400 });
  }

  const laborCost = toRequiredNumber(body.laborCost);
  const rentCost = toRequiredNumber(body.rentCost);
  const middleOfficeCost = toRequiredNumber(body.middleOfficeCost);
  const executionCost = toRequiredNumber(body.executionCost);
  const agencyFeeRate = toRequiredNumber(body.agencyFeeRate ?? body.agencyFee);
  const totalCost = toRequiredNumber(body.totalCost);
  const executionCostItems = normalizeExecutionCostItems(body.executionCostItems);
  const outsourceItems = normalizeOutsourceItems(body.outsourceItems);
  const outsourceRemark = toNullableString(body.outsourceRemark);

  if (
    laborCost === null ||
    rentCost === null ||
    middleOfficeCost === null ||
    executionCost === null ||
    totalCost === null
  ) {
    return new Response(
      "laborCost, rentCost, middleOfficeCost, executionCost and totalCost are required",
      { status: 400 },
    );
  }

  const optionIds = executionCostItems.map((item) => item.costTypeOptionId);
  const validOptionIds = await validateOptionIds(optionIds);
  if (!validOptionIds) {
    return new Response("Invalid costTypeOptionId in executionCostItems", {
      status: 400,
    });
  }

  const [project, estimation, existingByEstimation] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.projectCostEstimation.findUnique({
      where: { id: estimationId },
      select: { id: true, projectId: true, type: true },
    }),
    prisma.projectFinancialStructure.findUnique({
      where: { estimationId },
      select: { id: true },
    }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!estimation) return new Response("Estimation not found", { status: 404 });
  if (estimation.projectId !== projectId) {
    return new Response("estimationId does not belong to projectId", { status: 400 });
  }
  if (estimation.type !== "baseline") {
    return new Response("estimationId must be a baseline estimation", { status: 400 });
  }
  if (existingByEstimation) {
    return new Response("Financial structure already exists for this estimation", {
      status: 409,
    });
  }

  const created = await prisma.projectFinancialStructure.create({
    data: {
      projectId,
      estimationId,
      laborCost,
      rentCost,
      middleOfficeCost,
      executionCost,
      agencyFeeRate: agencyFeeRate ?? 0,
      totalCost,
      outsourceRemark,
      outsourceItems: {
        create: outsourceItems.map((item) => ({
          type: item.type,
          amount: item.amount,
        })),
      },
      executionCostItems: {
        create: executionCostItems.map((item) => ({
          costTypeOptionId: item.costTypeOptionId,
          budgetAmount: item.budgetAmount,
          remark: item.remark ?? null,
        })),
      },
    } as never,
    include: includeDetail,
  });

  return Response.json(created);
}
