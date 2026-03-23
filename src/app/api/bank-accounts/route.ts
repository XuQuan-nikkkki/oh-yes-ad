import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

export async function GET() {
  const rows = await prisma.bankAccount.findMany({
    include: {
      legalEntity: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const legalEntityId = String(body.legalEntityId ?? "").trim();
  const bankName = String(body.bankName ?? "").trim();
  const bankBranch = String(body.bankBranch ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").trim();
  const isActive = Boolean(body.isActive);

  if (!legalEntityId || !bankName || !bankBranch || !accountNumber) {
    return new Response("legalEntityId, bankName, bankBranch and accountNumber are required", {
      status: 400,
    });
  }

  const created = await prisma.bankAccount.create({
    data: {
      legalEntityId,
      bankName,
      bankBranch,
      accountNumber,
      isActive,
    },
  });

  return Response.json(created);
}
