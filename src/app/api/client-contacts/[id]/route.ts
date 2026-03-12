import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const contact = await prisma.clientContact.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!contact) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(contact);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await req.json();

  const contact = await prisma.clientContact.update({
    where: { id },
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  await prisma.clientContact.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
