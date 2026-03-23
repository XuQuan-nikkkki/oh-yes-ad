import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import {
  getProjectOutsourceTotal,
  normalizeProjectOutsourceItems,
} from "@/lib/project-outsource";
import { getNumericSystemSettings } from "@/lib/system-settings.server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; estimationId: string }>;
};

const EXECUTION_COST_FIELD = "projectCostEstimation.executionCostType";
const COST_ESTIMATION_TYPES = ["planning", "baseline"] as const;
type CostEstimationType = (typeof COST_ESTIMATION_TYPES)[number];

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

const normalizeCostEstimationType = (
  value: unknown,
  fallback: CostEstimationType = "planning",
): CostEstimationType => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return COST_ESTIMATION_TYPES.includes(normalized as CostEstimationType)
    ? (normalized as CostEstimationType)
    : fallback;
};

const normalizeMembers = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rawEmployeeId =
        "employeeId" in item ? String((item as { employeeId?: unknown }).employeeId ?? "") : "";
      const employeeId = rawEmployeeId.trim();
      const allocationPercent = toNullableNumber(
        "allocationPercent" in item
          ? (item as { allocationPercent?: unknown }).allocationPercent
          : null,
      );
      if (!employeeId || allocationPercent === null) return null;
      return {
        employeeId,
        allocationPercent: Math.round(allocationPercent),
      };
    })
    .filter(
      (
        item,
      ): item is {
        employeeId: string;
        allocationPercent: number;
      } => Boolean(item),
    );
};

const upsertExecutionCostTypeOptions = async (values: string[]) => {
  const ids: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const option = await prisma.selectOption.upsert({
      where: {
        field_value: {
          field: EXECUTION_COST_FIELD,
          value: normalized,
        },
      },
      create: {
        field: EXECUTION_COST_FIELD,
        value: normalized,
        color: DEFAULT_COLOR,
      },
      update: {},
      select: { id: true },
    });
    ids.push(option.id);
  }
  return ids;
};

const includeDetail = {
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
  executionCostTypes: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  outsourceItems: {
    select: {
      id: true,
      type: true,
      amount: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  members: {
    select: {
      id: true,
      estimationId: true,
      employeeId: true,
      allocationPercent: true,
      laborCostSnapshot: true,
      rentCostSnapshot: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: {
          id: true,
          name: true,
          functionOption: { select: { value: true, color: true } },
          employmentStatusOption: { select: { value: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const serializeEstimation = (
  estimation: {
    members: Array<{
      employee: {
        functionOption?: { value?: string | null } | null;
        employmentStatusOption?: { value?: string | null } | null;
      } | null;
    }> &
      Array<Record<string, unknown>>;
  } & Record<string, unknown>,
) => ({
  ...estimation,
  outsourceCost: getProjectOutsourceTotal(
    "outsourceItems" in estimation ? (estimation.outsourceItems as never) : [],
  ),
  members: Array.isArray(estimation.members)
    ? estimation.members.map((member) => ({
        ...member,
        employee: member.employee
          ? {
              ...member.employee,
              function: member.employee.functionOption?.value ?? null,
              employmentStatus: member.employee.employmentStatusOption?.value ?? null,
            }
          : null,
      }))
    : [],
});

const serializeProjectCostEstimationPayload = (
  projectId: string,
  estimation: ReturnType<typeof serializeEstimation> | null,
) => ({
  project: {
    id: projectId,
    latestCostEstimation: estimation,
  },
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, estimationId } = await context.params;
  if (!projectId || !estimationId) {
    return new Response("Missing params", { status: 400 });
  }

  const existing = await prisma.projectCostEstimation.findFirst({
    where: { id: estimationId, projectId },
    select: { id: true, type: true },
  });
  if (!existing) {
    return new Response("Cost estimation not found", { status: 404 });
  }

  const body = await sanitizeRequestBody(req);
  const rawSession = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  const session = rawSession ? decodeAuthSession(rawSession) : null;
  if (!session?.employeeId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const estimatedDuration = toNullableNumber(body.estimatedDuration);
  if (estimatedDuration === null) {
    return new Response("Invalid estimatedDuration", { status: 400 });
  }
  const normalizedEstimatedDuration = Math.round(estimatedDuration);

  const members = normalizeMembers(body.members);
  if (members.length === 0) {
    return new Response("At least one member is required", { status: 400 });
  }

  const memberEmployeeIds = Array.from(new Set(members.map((item) => item.employeeId)));
  const [employeeRows, systemSettings] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: memberEmployeeIds } },
      select: {
        id: true,
        salary: true,
        socialSecurity: true,
        providentFund: true,
      },
    }),
    getNumericSystemSettings(),
  ]);
  if (employeeRows.length !== memberEmployeeIds.length) {
    return new Response("Invalid employee IDs in members", { status: 400 });
  }
  const monthlyWorkdayBase = systemSettings.employeeMonthlyWorkdayBase;
  const monthlyRentCostPerEmployee =
    systemSettings.employeeDefaultWorkstationCost +
    systemSettings.employeeDefaultUtilityCost;
  const monthlyLaborCostByEmployeeId = new Map(
    employeeRows.map((item) => [
      item.id,
      Number(item.salary ?? 0) +
        Number(item.socialSecurity ?? 0) +
        Number(item.providentFund ?? 0),
    ]),
  );
  const memberCreateData = members.map((item) => ({
    employeeId: item.employeeId,
    allocationPercent: item.allocationPercent,
    laborCostSnapshot: Number(
      (
        ((monthlyLaborCostByEmployeeId.get(item.employeeId) ?? 0) /
          monthlyWorkdayBase) *
        normalizedEstimatedDuration *
        (item.allocationPercent / 100)
      ).toFixed(2),
    ),
    rentCostSnapshot: Number(
      (
        (monthlyRentCostPerEmployee / monthlyWorkdayBase) *
        normalizedEstimatedDuration *
        (item.allocationPercent / 100)
      ).toFixed(2),
    ),
  }));

  const totalLaborCost = memberCreateData.reduce(
    (sum, item) => sum + item.laborCostSnapshot,
    0,
  );

  const executionCostTypeValues = Array.isArray(body.executionCostTypes)
    ? body.executionCostTypes
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean)
    : [];
  const executionCostTypeOptionIds = await upsertExecutionCostTypeOptions(
    executionCostTypeValues,
  );
  const outsourceItems = normalizeProjectOutsourceItems(
    Array.isArray(body.outsourceItems) ? body.outsourceItems : [],
  );

  const nextType = normalizeCostEstimationType(body.type, existing.type);
  const created = await prisma.$transaction(async (tx) => {
    const maxVersion = await tx.projectCostEstimation.aggregate({
      where: { projectId },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? 0) + 1;

    if (nextType === "baseline") {
      await tx.projectCostEstimation.updateMany({
        where: { projectId, type: "baseline" },
        data: { type: "planning" },
      });
    }

    return tx.projectCostEstimation.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        owner: {
          connect: {
            id: session.employeeId,
          },
        },
        version: nextVersion,
        type: nextType,
        estimatedDuration: normalizedEstimatedDuration,
        clientBudget: toNullableString(body.clientBudget),
        contractAmountSnapshot: toNullableNumber(body.contractAmountSnapshot),
        totalLaborCost,
        agencyFeeRate:
          toNullableNumber(body.agencyFeeRate ?? body.agencyFee) ?? 0,
        outsourceRemark: toNullableString(body.outsourceRemark),
        otherExecutionCostRemark: toNullableString(body.otherExecutionCostRemark),
        outsourceItems: {
          create: outsourceItems.map((item) => ({
            type: item.type,
            amount: item.amount ?? 0,
          })),
        },
        executionCostTypes: {
          connect: executionCostTypeOptionIds.map((id) => ({ id })),
        },
        members: {
          create: memberCreateData.map(
            ({
              employeeId,
              allocationPercent,
              laborCostSnapshot,
              rentCostSnapshot,
            }) => ({
              employeeId,
              allocationPercent,
              laborCostSnapshot,
              rentCostSnapshot,
            }),
          ),
        },
      } as never,
      include: includeDetail,
    });
  });

  return Response.json(
    serializeProjectCostEstimationPayload(
      projectId,
      serializeEstimation(created as Record<string, unknown> as never),
    ),
  );
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, estimationId } = await context.params;
  if (!projectId || !estimationId) {
    return new Response("Missing params", { status: 400 });
  }

  const existing = await prisma.projectCostEstimation.findFirst({
    where: { id: estimationId, projectId },
    select: { id: true },
  });
  if (!existing) {
    return new Response("Cost estimation not found", { status: 404 });
  }

  const latestEstimationAfterDelete = await prisma.$transaction(async (tx) => {
    await tx.projectCostEstimation.delete({
      where: { id: estimationId },
    });

    return tx.projectCostEstimation.findFirst({
      where: { projectId },
      orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
      include: includeDetail,
    });
  });

  return Response.json(
    serializeProjectCostEstimationPayload(
      projectId,
      latestEstimationAfterDelete
        ? serializeEstimation(
            latestEstimationAfterDelete as Record<string, unknown> as never,
          )
        : null,
    ),
  );
}
