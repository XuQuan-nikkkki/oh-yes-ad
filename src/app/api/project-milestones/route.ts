import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET() {
  const items = await prisma.projectMilestone.findMany({
    where: { project: { type: "内部项目" } },
    include: {
      project: { select: { id: true, name: true } },
      internalParticipants: { select: { id: true, name: true } },
      vendorParticipants: { select: { id: true, name: true } },
      clientParticipants: { select: { id: true, name: true } },
      documents: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid milestone name", { status: 400 });
  }
  if (!body?.projectId || typeof body.projectId !== "string") {
    return new Response("Invalid project ID", { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: body.projectId, type: "内部项目" },
    select: { id: true },
  });
  if (!project) return new Response("Project not found", { status: 400 });

  const item = await prisma.projectMilestone.create({
    data: {
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      location: body.location ?? null,
      method: body.method ?? null,
      projectId: body.projectId,
    },
  });
  return Response.json(item);
}
