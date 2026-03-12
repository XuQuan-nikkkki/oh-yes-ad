import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const whereInternal = (id: string) => ({ id, segment: { project: { type: "内部项目" } } });

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await prisma.projectTask.findFirst({
    where: whereInternal(id),
    include: {
      segment: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
      owner: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      plannedWorkEntries: { select: { id: true, year: true, weekNumber: true, plannedDays: true } },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectTask.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.segmentId) {
    const segment = await prisma.projectSegment.findFirst({
      where: { id: body.segmentId, project: { type: "内部项目" } },
      select: { id: true },
    });
    if (!segment) return new Response("Segment not found", { status: 400 });
  }

  const item = await prisma.projectTask.update({
    where: { id },
    data: {
      name: body.name,
      segmentId: body.segmentId,
      ownerId: body.ownerId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return Response.json(item);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.projectTask.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectTask.delete({ where: { id } });
  return Response.json({ success: true });
}
