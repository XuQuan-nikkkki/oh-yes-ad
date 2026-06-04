import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { toNullableDecimal } from "@/lib/toNullableDecimal";
import { extractRoleCodes } from "@/lib/role-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BAD_DEBT_RECORD_TYPES = ["WRITE_OFF", "RECOVERY"] as const;

const includeDetail = {
  receivableNode: {
    select: {
      id: true,
      planId: true,
    },
  },
  actualNode: {
    select: {
      id: true,
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

const toBoolean = (value: unknown) => value === true;

type BadDebtRecordType = (typeof BAD_DEBT_RECORD_TYPES)[number];

const normalizeRecordType = (value: unknown): BadDebtRecordType | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return BAD_DEBT_RECORD_TYPES.includes(
    normalized as BadDebtRecordType,
  )
    ? (normalized as BadDebtRecordType)
    : null;
};

const requireBadDebtRecordPermission = async () => {
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
  const receivableNodeId =
    req.nextUrl.searchParams.get("receivableNodeId")?.trim() ?? "";
  if (!receivableNodeId) {
    return new Response("Missing receivableNodeId", { status: 400 });
  }

  const rows = await prisma.projectReceivableBadDebtRecord.findMany({
    where: { receivableNodeId },
    include: includeDetail,
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const { employee, response } = await requireBadDebtRecordPermission();
  if (response) return response;
  if (!employee) return new Response("Unauthorized", { status: 401 });

  const body = await sanitizeRequestBody(req);
  const receivableNodeId = String(body.receivableNodeId ?? "").trim();
  const type = normalizeRecordType(body.type);
  const amountTaxIncluded = toNullableDecimal(body.amountTaxIncluded);
  const occurredAt = toDate(body.occurredAt);
  const createActualNode = toBoolean(body.createActualNode);

  if (!receivableNodeId) {
    return new Response("receivableNodeId is required", { status: 400 });
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

  const node = await prisma.projectReceivableNode.findUnique({
    where: { id: receivableNodeId },
    select: { id: true },
  });
  if (!node) return new Response("Receivable node not found", { status: 404 });

  const created = await prisma.$transaction(async (tx) => {
    const actualNode =
      type === "RECOVERY" && createActualNode
        ? await tx.projectReceivableActualNode.create({
            data: {
              receivableNodeId,
              actualAmountTaxIncluded: amountTaxIncluded,
              actualDate: occurredAt,
              remark: "坏账收回",
              remarkNeedsAttention: false,
            },
            select: { id: true },
          })
        : null;

    return tx.projectReceivableBadDebtRecord.create({
      data: {
        receivableNodeId,
        type,
        amountTaxIncluded,
        occurredAt,
        reason: toNullableString(body.reason),
        remark: toNullableString(body.remark),
        actualNodeId: actualNode?.id ?? null,
        createdByEmployeeId: employee.id,
      },
      include: includeDetail,
    });
  });

  return Response.json(created);
}
