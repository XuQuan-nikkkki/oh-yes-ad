import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET() {
  const items = await prisma.projectSegment.findMany({
    where: { project: { type: "内部项目" } },
    include: {
      project: { select: { id: true, name: true, type: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid segment name", { status: 400 });
  }
  if (!body?.projectId || typeof body.projectId !== "string") {
    return new Response("Invalid project ID", { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: body.projectId, type: "内部项目" },
    select: { id: true },
  });
  if (!project) return new Response("Project not found", { status: 400 });

  const item = await prisma.projectSegment.create({
    data: {
      name: body.name,
      status: body.status ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId,
      ownerId: body.ownerId ?? null,
    },
  });

  return Response.json(item);
}
