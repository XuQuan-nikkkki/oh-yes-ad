import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const body = await sanitizeRequestBody(req);
  const bankName = String(body.bankName ?? "").trim();
  const bankBranch = String(body.bankBranch ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").trim();
  const isActive = Boolean(body.isActive);

  if (!bankName || !bankBranch || !accountNumber) {
    return new Response("bankName, bankBranch and accountNumber are required", {
      status: 400,
    });
  }

  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      bankName,
      bankBranch,
      accountNumber,
      isActive,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) return new Response("Missing ID", { status: 400 });

  await prisma.bankAccount.delete({
    where: { id },
  });

  return new Response(null, { status: 204 });
}
