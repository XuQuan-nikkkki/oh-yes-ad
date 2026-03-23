import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

const toDate = (value: unknown) => {
  if (typeof value !== "string") return null;
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
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

export async function GET() {
  const rows = await prisma.bankAccountBalanceRecord.findMany({
    where: {
      bankAccount: {
        isActive: true,
      },
    },
    include: {
      bankAccount: {
        include: {
          legalEntity: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { bankAccountId: "asc" },
      { snapshotAt: "desc" },
      { createdAt: "desc" },
    ],
    distinct: ["bankAccountId"],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const bankAccountId = String(body.bankAccountId ?? "").trim();
  const balance = toNullableNumber(body.balance);
  const snapshotAt = toDate(body.snapshotAt);
  const remark = String(body.remark ?? "").trim();

  if (!bankAccountId || balance === null || !snapshotAt) {
    return new Response("bankAccountId, balance and snapshotAt are required", {
      status: 400,
    });
  }

  const created = await prisma.bankAccountBalanceRecord.create({
    data: {
      bankAccountId,
      balance,
      snapshotAt,
      remark: remark || null,
    },
  });

  return Response.json(created);
}
