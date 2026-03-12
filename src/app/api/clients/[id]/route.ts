import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(client);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await req.json();

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      industry: body.industry,
      remark: body.remark ?? null,
    },
  });

  return Response.json(client);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  await prisma.client.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
