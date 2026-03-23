import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const legalEntity = await prisma.legalEntity.findUnique({
    where: { id },
    include: {
      bankAccounts: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          employees: true,
        },
      },
    },
  });

  if (!legalEntity) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(legalEntity);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  const name = String(body.name ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const taxNumber = String(body.taxNumber ?? "").trim();
  const address = String(body.address ?? "").trim();
  const isActive = typeof body.isActive === "boolean" ? body.isActive : false;

  if (!name) {
    return new Response("名称不能为空", { status: 400 });
  }

  const updated = await prisma.legalEntity.update({
    where: { id },
    data: {
      name,
      fullName: fullName || null,
      taxNumber: taxNumber || null,
      address: address || null,
      isActive,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  await prisma.legalEntity.delete({
    where: { id },
  });

  return new Response(null, { status: 204 });
}
