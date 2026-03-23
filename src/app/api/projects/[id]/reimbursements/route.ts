import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
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

const toDate = (value: unknown) => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const includeDetail = {
  applicantEmployee: {
    select: {
      id: true,
      name: true,
    },
  },
  categoryOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
} as const;

const serializeReimbursement = <
  T extends {
    amount?: unknown;
  },
>(
  row: T,
) => ({
  ...row,
  amount: toNullableNumber(row.amount),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const rows = await prisma.projectReimbursement.findMany({
    where: { projectId },
    include: includeDetail,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  return Response.json(rows.map(serializeReimbursement));
}

export async function POST(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  const applicantEmployeeId = String(body.applicantEmployeeId ?? "").trim();
  const categoryOptionId = String(body.categoryOptionId ?? "").trim();
  const occurredAt = toDate(body.occurredAt);
  const amount = toNullableNumber(body.amount);

  if (!applicantEmployeeId || !categoryOptionId || !occurredAt || amount === null) {
    return new Response(
      "applicantEmployeeId, categoryOptionId, occurredAt and amount are required",
      { status: 400 },
    );
  }

  const [project, employee, validCategory] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    }),
    prisma.employee.findUnique({
      where: { id: applicantEmployeeId },
      select: { id: true },
    }),
    prisma.projectFinancialStructure.findFirst({
      where: { projectId },
      select: {
        id: true,
        executionCostItems: {
          where: { costTypeOptionId: categoryOptionId },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  if (!project) return new Response("Project not found", { status: 404 });
  if (!employee) return new Response("Applicant not found", { status: 404 });
  if (!validCategory?.executionCostItems?.length) {
    return new Response("Invalid reimbursement category for this project", {
      status: 400,
    });
  }

  const created = await prisma.projectReimbursement.create({
    data: {
      projectId,
      applicantEmployeeId,
      categoryOptionId,
      occurredAt,
      amount,
    },
    include: includeDetail,
  });

  return Response.json(serializeReimbursement(created));
}
