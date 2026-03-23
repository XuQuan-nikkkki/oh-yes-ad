import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

export async function GET() {
  const legalEntities = await prisma.legalEntity.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          employees: true,
          bankAccounts: true,
        },
      },
    },
  });

  return Response.json(legalEntities);
}

export async function POST(req: NextRequest) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const name = String(body.name ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const taxNumber = String(body.taxNumber ?? "").trim();
  const address = String(body.address ?? "").trim();
  const isActive = Boolean(body.isActive);

  if (!name) {
    return new Response("名称不能为空", { status: 400 });
  }

  const created = await prisma.legalEntity.create({
    data: {
      name,
      fullName: fullName || null,
      taxNumber: taxNumber || null,
      address: address || null,
      isActive,
    },
  });

  return Response.json(created);
}
