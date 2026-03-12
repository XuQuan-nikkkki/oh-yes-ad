import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const whereInternal = (id: string) => ({ id, project: { type: "内部项目" } });

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await prisma.projectDocument.findFirst({
    where: whereInternal(id),
    include: {
      project: { select: { id: true, name: true } },
      milestones: { select: { id: true, name: true } },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectDocument.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, type: "内部项目" },
      select: { id: true },
    });
    if (!project) return new Response("Project not found", { status: 400 });
  }

  const item = await prisma.projectDocument.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type ?? null,
      date: body.date ? new Date(body.date) : null,
      isFinal: Boolean(body.isFinal),
      internalLink: body.internalLink ?? null,
      projectId: body.projectId,
    },
  });
  return Response.json(item);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectDocument.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectDocument.delete({ where: { id } });
  return Response.json({ success: true });
}
