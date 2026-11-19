import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireCrmWritePermission } from "@/lib/api-permissions";
import { findClientWithSameName, normalizeClientName } from "@/lib/client-name";

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
    include: {
      industryOption: true,
    },
  });

  if (!client) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(client);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await req.json();
  const name = normalizeClientName(body?.name);
  if (!name) return new Response("请输入客户名称", { status: 400 });
  const existingClient = await prisma.client.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!existingClient) return new Response("客户不存在", { status: 404 });
  if (
    existingClient.name.trim().toLowerCase() !== name.toLowerCase() &&
    (await findClientWithSameName(prisma, name, id))
  ) {
    return new Response("客户名称已存在", { status: 409 });
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      name,
      industryOptionId: body.industryOptionId,
    },
    include: {
      industryOption: true,
    },
  });

  return Response.json(client);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireCrmWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  await prisma.client.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
