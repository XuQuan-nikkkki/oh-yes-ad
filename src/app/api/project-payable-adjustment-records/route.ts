import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { extractRoleCodes } from "@/lib/role-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { toNullableDecimal } from "@/lib/toNullableDecimal";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ADJUSTMENT_RECORD_TYPES = [
  "REDUCTION",
  "INCREASE",
  "REDUCTION_REVERSAL",
] as const;

type AdjustmentRecordType = (typeof ADJUSTMENT_RECORD_TYPES)[number];

const includeDetail = {
  payableNode: {
    select: {
      id: true,
      planId: true,
    },
  },
  createdByEmployee: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const toDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
};

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRecordType = (value: unknown): AdjustmentRecordType | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return ADJUSTMENT_RECORD_TYPES.includes(
    normalized as AdjustmentRecordType,
  )
    ? (normalized as AdjustmentRecordType)
    : null;
};

const requireAdjustmentRecordPermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return { employee: null, response };

  const roleCodes = extractRoleCodes(employee);
  if (!roleCodes.includes("ADMIN") && !roleCodes.includes("FINANCE")) {
    return {
      employee: null,
      response: new Response("Forbidden", { status: 403 }),
    };
  }

  return { employee, response: null };
};

export async function GET(req: NextRequest) {
  const payableNodeId =
    req.nextUrl.searchParams.get("payableNodeId")?.trim() ?? "";
  if (!payableNodeId) {
    return new Response("Missing payableNodeId", { status: 400 });
  }

  const rows = await prisma.projectPayableAdjustmentRecord.findMany({
    where: { payableNodeId },
    include: includeDetail,
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const { employee, response } = await requireAdjustmentRecordPermission();
  if (response) return response;
  if (!employee) return new Response("Unauthorized", { status: 401 });

  const body = await sanitizeRequestBody(req);
  const payableNodeId = String(body.payableNodeId ?? "").trim();
  const type = normalizeRecordType(body.type);
  const amountTaxIncluded = toNullableDecimal(body.amountTaxIncluded);
  const occurredAt = toDate(body.occurredAt);

  if (!payableNodeId) {
    return new Response("payableNodeId is required", { status: 400 });
  }
  if (!type) {
    return new Response("type is invalid", { status: 400 });
  }
  if (amountTaxIncluded === null || amountTaxIncluded <= 0) {
    return new Response("amountTaxIncluded is invalid", { status: 400 });
  }
  if (!occurredAt) {
    return new Response("occurredAt is invalid", { status: 400 });
  }

  const node = await prisma.projectPayableNode.findUnique({
    where: { id: payableNodeId },
    select: { id: true },
  });
  if (!node) return new Response("Payable node not found", { status: 404 });

  const created = await prisma.projectPayableAdjustmentRecord.create({
    data: {
      payableNodeId,
      type,
      amountTaxIncluded,
      occurredAt,
      reason: toNullableString(body.reason),
      remark: toNullableString(body.remark),
      createdByEmployeeId: employee.id,
    },
    include: includeDetail,
  });

  return Response.json(created);
}
