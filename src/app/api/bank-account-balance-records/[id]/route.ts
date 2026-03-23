import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

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

  const updated = await prisma.bankAccountBalanceRecord.update({
    where: { id },
    data: {
      bankAccountId,
      balance,
      snapshotAt,
      remark: remark || null,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.bankAccountBalanceRecord.delete({
    where: { id },
  });

  return new Response(null, { status: 204 });
}
