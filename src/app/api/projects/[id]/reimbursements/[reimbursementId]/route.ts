import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

type RouteContext = {
  params: Promise<{ id: string; reimbursementId: string }>;
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  // Prisma Decimal (and similar) values are objects with toNumber/toString.
  if (typeof value === "object" && value) {
    const maybeDecimal = value as { toNumber?: () => unknown; toString?: () => string };
    if (typeof maybeDecimal.toNumber === "function") {
      const n = maybeDecimal.toNumber();
      return typeof n === "number" && Number.isFinite(n) ? n : null;
    }
    if (typeof maybeDecimal.toString === "function") {
      const parsed = Number(maybeDecimal.toString().trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, reimbursementId } = await context.params;
  if (!projectId || !reimbursementId) {
    return new Response("Missing params", { status: 400 });
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

  const [existing, employee, validCategory] = await Promise.all([
    prisma.projectReimbursement.findFirst({
      where: { id: reimbursementId, projectId },
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

  if (!existing) {
    return new Response("Reimbursement not found", { status: 404 });
  }
  if (!employee) {
    return new Response("Applicant not found", { status: 404 });
  }
  if (!validCategory?.executionCostItems?.length) {
    return new Response("Invalid reimbursement category for this project", {
      status: 400,
    });
  }

  const updated = await prisma.projectReimbursement.update({
    where: { id: reimbursementId },
    data: {
      applicantEmployeeId,
      categoryOptionId,
      occurredAt,
      amount,
    },
    include: includeDetail,
  });

  return Response.json(serializeReimbursement(updated));
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, reimbursementId } = await context.params;
  if (!projectId || !reimbursementId) {
    return new Response("Missing params", { status: 400 });
  }

  const existing = await prisma.projectReimbursement.findFirst({
    where: { id: reimbursementId, projectId },
    select: { id: true },
  });

  if (!existing) {
    return new Response("Reimbursement not found", { status: 404 });
  }

  await prisma.projectReimbursement.delete({
    where: { id: reimbursementId },
  });

  return Response.json({ success: true });
}
