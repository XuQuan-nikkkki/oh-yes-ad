import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import { toNullableInt } from "@/lib/toNullableInt";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

const includeDetail = {
  stageOption: {
    select: {
      id: true,
      field: true,
      value: true,
      color: true,
    },
  },
  actualNodes: {
    orderBy: [{ actualDate: "asc" as const }, { createdAt: "asc" as const }],
  },
};


const toNullableDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
};

const toNullableBool = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

const getCurrentEmployeeId = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = decodeAuthSession(raw);
  return session?.employeeId ?? null;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectReceivableNode.findUnique({
    where: { id },
    select: {
      id: true,
      expectedDate: true,
      expectedDateChangeCount: true,
    },
  });
  if (!existing) return new Response("Node not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const patchData: Record<string, unknown> = {};

  if ("stageOptionId" in body) {
    const stageOptionId = String(body.stageOptionId ?? "").trim();
    if (!stageOptionId) {
      return new Response("stageOptionId is invalid", { status: 400 });
    }
    patchData.stageOptionId = stageOptionId;
  }

  if ("sortOrder" in body) {
    const sortOrder = toNullableInt(body.sortOrder);
    if (sortOrder === null) {
      return new Response("sortOrder is invalid", { status: 400 });
    }
    patchData.sortOrder = sortOrder;
  }

  if ("keyDeliverable" in body) {
    const keyDeliverable = String(body.keyDeliverable ?? "").trim();
    if (!keyDeliverable) {
      return new Response("keyDeliverable is invalid", { status: 400 });
    }
    patchData.keyDeliverable = keyDeliverable;
  }

  if ("expectedAmountTaxIncluded" in body) {
    const amount = toNullableInt(body.expectedAmountTaxIncluded);
    if (amount === null || amount < 0) {
      return new Response("expectedAmountTaxIncluded is invalid", { status: 400 });
    }
    patchData.expectedAmountTaxIncluded = amount;
  }

  const nextExpectedDate =
    "expectedDate" in body ? toNullableDate(body.expectedDate) : existing.expectedDate;
  if ("expectedDate" in body && nextExpectedDate === null) {
    return new Response("expectedDate is invalid", { status: 400 });
  }
  if ("expectedDate" in body) {
    patchData.expectedDate = nextExpectedDate;
  }

  if ("remark" in body) {
    patchData.remark =
      typeof body.remark === "string" && body.remark.trim().length > 0
        ? body.remark.trim()
        : null;
  }

  if ("remarkNeedsAttention" in body) {
    const remarkNeedsAttention = toNullableBool(body.remarkNeedsAttention);
    if (remarkNeedsAttention === null) {
      return new Response("remarkNeedsAttention must be boolean", { status: 400 });
    }
    patchData.remarkNeedsAttention = remarkNeedsAttention;
  }

  const expectedDateChanged =
    Boolean("expectedDate" in body) &&
    nextExpectedDate !== null &&
    existing.expectedDate.valueOf() !== nextExpectedDate.valueOf();

  const changedByEmployeeId = await getCurrentEmployeeId();
  if (expectedDateChanged && !changedByEmployeeId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (expectedDateChanged) {
      await tx.projectReceivableNodeExpectedDateHistory.create({
        data: {
          nodeId: id,
          fromExpectedDate: existing.expectedDate,
          toExpectedDate: nextExpectedDate!,
          changedByEmployeeId: changedByEmployeeId!,
          reason:
            typeof body.expectedDateChangeReason === "string" &&
            body.expectedDateChangeReason.trim().length > 0
              ? body.expectedDateChangeReason.trim()
              : null,
          remark:
            typeof body.expectedDateChangeRemark === "string" &&
            body.expectedDateChangeRemark.trim().length > 0
              ? body.expectedDateChangeRemark.trim()
              : null,
        },
      });
      patchData.expectedDateChangeCount = existing.expectedDateChangeCount + 1;
    }

    return tx.projectReceivableNode.update({
      where: { id },
      data: patchData,
      include: includeDetail,
    });
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.projectReceivableNode.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
