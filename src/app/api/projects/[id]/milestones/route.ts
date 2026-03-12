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

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid milestone name", { status: 400 });
  }

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

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      location: body.location ?? null,
      method: body.method ?? null,
      internalParticipants: {
        connect: internalParticipantIds.map((id) => ({ id })),
      },
      clientParticipants: {
        connect: clientParticipantIds.map((id) => ({ id })),
      },
      vendorParticipants: {
        connect: vendorParticipantIds.map((id) => ({ id })),
      },
    },
  });

  return Response.json(milestone);
}
