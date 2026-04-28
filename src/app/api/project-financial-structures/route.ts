import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireFinanceOrAdminPermission } from "@/lib/api-permissions";

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
  initiation: {
    select: {
      id: true,
      projectId: true,
      version: true,
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

const serializeFinancialStructure = (row: Record<string, unknown>) => ({
  ...row,
  estimationId: "initiationId" in row ? row.initiationId : null,
  estimation:
    "initiation" in row && row.initiation
      ? {
          ...(row.initiation as Record<string, unknown>),
          type: "baseline",
        }
      : null,
});

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
      ...(estimationId ? { initiationId: estimationId } : {}),
    },
    include: includeDetail,
    orderBy: [{ updatedAt: "desc" }],
  });

  return Response.json(
    rows.map((row) =>
      serializeFinancialStructure(row as Record<string, unknown>),
    ),
  );
}

export async function POST(req: NextRequest) {
  const denied = await requireFinanceOrAdminPermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);

  const projectId = String(body.projectId ?? "").trim();
  const estimationId = String(body.estimationId ?? "").trim();
  if (!projectId) {
    return new Response("projectId is required", { status: 400 });
  }

  const laborCost = toRequiredNumber(body.laborCost);
  const rentCost = toRequiredNumber(body.rentCost);
  const middleOfficeCost = toRequiredNumber(body.middleOfficeCost);
  const executionCost = toRequiredNumber(body.executionCost);
  const contractAmountTaxIncluded = toRequiredNumber(
    body.contractAmountTaxIncluded ?? body.contractAmount,
  );
  const agencyFeeRate = toRequiredNumber(body.agencyFeeRate ?? body.agencyFee);
  const totalCost = toRequiredNumber(body.totalCost);
  const executionCostItems = normalizeExecutionCostItems(body.executionCostItems);
  const outsourceItems = normalizeOutsourceItems(body.outsourceItems);
  const outsourceRemark = toNullableString(body.outsourceRemark);

  if (
    contractAmountTaxIncluded === null ||
    laborCost === null ||
    rentCost === null ||
    middleOfficeCost === null ||
    executionCost === null ||
    totalCost === null
  ) {
    return new Response(
      "contractAmountTaxIncluded, laborCost, rentCost, middleOfficeCost, executionCost and totalCost are required",
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

  const [project, estimation, existingByEstimation, existingWithoutEstimation] =
    await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
      estimationId
        ? prisma.projectInitiation.findUnique({
            where: { id: estimationId },
            select: { id: true, projectId: true },
          })
        : Promise.resolve(null),
      estimationId
        ? prisma.projectFinancialStructure.findUnique({
            where: { initiationId: estimationId },
            select: { id: true },
          })
        : Promise.resolve(null),
      estimationId
        ? Promise.resolve(null)
        : prisma.projectFinancialStructure.findFirst({
            where: { projectId, initiationId: null },
            select: { id: true },
          }),
    ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (estimationId) {
    if (!estimation) return new Response("Estimation not found", { status: 404 });
    if (estimation.projectId !== projectId) {
      return new Response("estimationId does not belong to projectId", { status: 400 });
    }
  }
  if (existingByEstimation) {
    return new Response("Financial structure already exists for this estimation", {
      status: 409,
    });
  }
  if (existingWithoutEstimation) {
    return new Response(
      "Financial structure without estimation already exists for this project",
      { status: 409 },
    );
  }

  let created: Record<string, unknown>;
  try {
    created = (await prisma.projectFinancialStructure.create({
      data: {
        projectId,
        initiationId: estimationId || null,
        contractAmountTaxIncluded,
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
    })) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return new Response("Financial structure already exists", { status: 409 });
      }
      if (error.code === "P2003") {
        return new Response("Invalid relation input", { status: 400 });
      }
      if (error.code === "P2011") {
        return new Response("Missing required field", { status: 400 });
      }
    }
    console.error("Create project financial structure failed:", error);
    return new Response("Create project financial structure failed", {
      status: 500,
    });
  }

  return Response.json(
    serializeFinancialStructure(created),
  );
}
