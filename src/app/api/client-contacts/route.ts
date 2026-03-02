import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

// ================= GET =================
// /api/client-contacts?clientId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return Response.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  const contacts = await prisma.clientContact.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(contacts);
}

// ================= POST =================
export async function POST(req: NextRequest) {
  const body = await req.json();

  const contact = await prisma.clientContact.create({
    data: {
      name: body.name,
      title: body.title,
      scope: body.scope,
      preference: body.preference,
      phone: body.phone,
      email: body.email,
      wechat: body.wechat,
      address: body.address,
      clientId: body.clientId,
    },
  });

  return Response.json(contact);
}

// ================= PUT =================
export async function PUT(req: NextRequest) {
  const body = await req.json();

  const contact = await prisma.clientContact.update({
    where: { id: body.id },
    data: {
      name: body.name,
      title: body.title,
      scope: body.scope,
      preference: body.preference,
      phone: body.phone,
      email: body.email,
      wechat: body.wechat,
      address: body.address,
    },
  });

  return Response.json(contact);
}

// ================= DELETE =================
export async function DELETE(req: NextRequest) {
  const body = await req.json();

  await prisma.clientContact.delete({
    where: { id: body.id },
  });

  return Response.json({ success: true });
}