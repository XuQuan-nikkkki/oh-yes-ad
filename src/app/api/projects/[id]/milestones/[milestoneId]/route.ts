import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: projectId, milestoneId } = await context.params;
  if (!projectId || !milestoneId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = await req.json();
  const internalParticipantIds: string[] = Array.isArray(
    body.internalParticipantIds,
  )
    ? body.internalParticipantIds
    : [];
  const clientParticipantIds: string[] = Array.isArray(body.clientParticipantIds)
    ? body.clientParticipantIds
    : [];
  const vendorParticipantIds: string[] = Array.isArray(body.vendorParticipantIds)
    ? body.vendorParticipantIds
    : [];

  const milestone = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      location: body.location ?? null,
      method: body.method ?? null,
      internalParticipants: {
        set: internalParticipantIds.map((id) => ({ id })),
      },
      clientParticipants: {
        set: clientParticipantIds.map((id) => ({ id })),
      },
      vendorParticipants: {
        set: vendorParticipantIds.map((id) => ({ id })),
      },
    },
  });

  return Response.json(milestone);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id: projectId, milestoneId } = await context.params;
  if (!projectId || !milestoneId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.projectMilestone.delete({
    where: { id: milestoneId },
  });

  return Response.json({ success: true });
}
