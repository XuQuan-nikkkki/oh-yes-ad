import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; segmentId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: projectId, segmentId } = await context.params;
  if (!projectId || !segmentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectSegment.findFirst({
    where: { id: segmentId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = await req.json();

  const segment = await prisma.projectSegment.update({
    where: { id: segmentId },
    data: {
      name: body.name,
      status: body.status ?? null,
      ownerId: body.ownerId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  return Response.json(segment);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id: projectId, segmentId } = await context.params;
  if (!projectId || !segmentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectSegment.findFirst({
    where: { id: segmentId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.projectSegment.delete({
    where: { id: segmentId },
  });

  return Response.json({ success: true });
}
