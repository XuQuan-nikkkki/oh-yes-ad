import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectReceivableNodeExpectedDateHistory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return new Response("History not found", { status: 404 });

  const body = await sanitizeRequestBody(req);
  const updated = await prisma.projectReceivableNodeExpectedDateHistory.update({
    where: { id },
    data: {
      reason:
        "reason" in body
          ? typeof body.reason === "string" && body.reason.trim().length > 0
            ? body.reason.trim()
            : null
          : undefined,
      remark:
        "remark" in body
          ? typeof body.remark === "string" && body.remark.trim().length > 0
            ? body.remark.trim()
            : null
          : undefined,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const existing = await prisma.projectReceivableNodeExpectedDateHistory.findUnique({
    where: { id },
    select: { id: true, nodeId: true },
  });
  if (!existing) return new Response("History not found", { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.projectReceivableNodeExpectedDateHistory.delete({
      where: { id },
    });
    const nextCount = await tx.projectReceivableNodeExpectedDateHistory.count({
      where: { nodeId: existing.nodeId },
    });
    await tx.projectReceivableNode.update({
      where: { id: existing.nodeId },
      data: { expectedDateChangeCount: nextCount },
    });
  });

  return Response.json({ success: true });
}
