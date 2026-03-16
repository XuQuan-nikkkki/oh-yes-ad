import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireCrmWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

// ================= GET =================
// /api/client-contacts
// /api/client-contacts?clientId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const contacts = await prisma.clientContact.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: true,
    },
    orderBy: [{ clientId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(contacts);
}

// ================= POST =================
export async function POST(req: NextRequest) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  const minOrder = await prisma.clientContact.aggregate({
    where: { clientId: body.clientId },
    _min: { order: true },
  });
  const nextOrder =
    minOrder._min.order === null ? 1000 : minOrder._min.order - 1000;

  const contact = await prisma.clientContact.create({
    data: {
      name: body.name,
      order: nextOrder,
      title: body.title,
      scope: body.scope,
      preference: body.preference,
      phone: body.phone,
      email: body.email,
      wechat: body.wechat,
      address: body.address,
      clientId: body.clientId,
    },
    include: {
      client: true,
    },
  });

  return Response.json(contact);
}
