import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireCrmWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReorderPayload = {
  orderedIds?: unknown;
  movedId?: unknown;
};

const ORDER_STEP = 1000;
const MIN_GAP_THRESHOLD = 10;

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id: clientId } = await context.params;
  if (!clientId) {
    return new Response("Missing client ID", { status: 400 });
  }

  const body = (await req.json()) as ReorderPayload;
  const orderedIdsRaw = Array.isArray(body?.orderedIds) ? body.orderedIds : [];
  const movedIdRaw = typeof body?.movedId === "string" ? body.movedId : "";
  const orderedIds = orderedIdsRaw
    .map((item: unknown) => (typeof item === "string" ? item : ""))
    .filter(Boolean);

  if (orderedIds.length === 0 || !movedIdRaw) {
    return new Response("Invalid payload", { status: 400 });
  }

  const contacts = await prisma.clientContact.findMany({
    where: { clientId },
    select: { id: true, order: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  if (contacts.length === 0) {
    return Response.json({ success: true });
  }

  const dbIdSet = new Set(contacts.map((item) => item.id));
  const orderedSet = new Set(orderedIds);
  if (orderedIds.length !== contacts.length || orderedSet.size !== contacts.length) {
    return new Response("Ordered IDs length mismatch", { status: 400 });
  }
  for (const id of orderedIds as string[]) {
    if (!dbIdSet.has(id)) {
      return new Response("Ordered IDs contain invalid contact", { status: 400 });
    }
  }
  if (!dbIdSet.has(movedIdRaw)) {
    return new Response("Invalid moved contact", { status: 400 });
  }

  const movedIndex = (orderedIds as string[]).findIndex((id: string) => id === movedIdRaw);
  if (movedIndex < 0) {
    return new Response("Moved contact not in ordered IDs", { status: 400 });
  }

  const orderMap = new Map(contacts.map((item) => [item.id, item.order]));
  const prevId = movedIndex > 0 ? (orderedIds as string[])[movedIndex - 1] : null;
  const nextId =
    movedIndex < orderedIds.length - 1 ? (orderedIds as string[])[movedIndex + 1] : null;

  const prevOrder = prevId ? orderMap.get(prevId) ?? null : null;
  const nextOrder = nextId ? orderMap.get(nextId) ?? null : null;

  let nextOrderValue: number;
  if (prevOrder === null && nextOrder === null) {
    nextOrderValue = ORDER_STEP;
  } else if (prevOrder === null && nextOrder !== null) {
    nextOrderValue = nextOrder - ORDER_STEP;
  } else if (prevOrder !== null && nextOrder === null) {
    nextOrderValue = prevOrder + ORDER_STEP;
  } else {
    nextOrderValue = Math.floor((prevOrder! + nextOrder!) / 2);
  }

  const gapBefore =
    prevOrder === null ? Number.POSITIVE_INFINITY : nextOrderValue - prevOrder;
  const gapAfter =
    nextOrder === null ? Number.POSITIVE_INFINITY : nextOrder - nextOrderValue;
  const needRebalance = gapBefore <= MIN_GAP_THRESHOLD || gapAfter <= MIN_GAP_THRESHOLD;

  if (needRebalance) {
    await prisma.$transaction(
      (orderedIds as string[]).map((id: string, index: number) =>
        prisma.clientContact.update({
          where: { id },
          data: { order: (index + 1) * ORDER_STEP },
        }),
      ),
    );
    return Response.json({ success: true, rebalanced: true });
  }

  await prisma.clientContact.update({
    where: { id: movedIdRaw },
    data: { order: nextOrderValue },
  });

  return Response.json({ success: true, rebalanced: false });
}
