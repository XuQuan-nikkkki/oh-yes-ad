import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const whereInternal = (id: string) => ({ id, task: { segment: { project: { type: "内部项目" } } } });

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await prisma.plannedWorkEntry.findFirst({
    where: whereInternal(id),
    include: {
      task: {
        select: {
          id: true,
          name: true,
          segment: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.plannedWorkEntry.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.taskId) {
    const task = await prisma.projectTask.findFirst({
      where: { id: body.taskId, segment: { project: { type: "内部项目" } } },
      select: { id: true },
    });
    if (!task) return new Response("Task not found", { status: 400 });
  }

  const item = await prisma.plannedWorkEntry.update({
    where: { id },
    data: {
      taskId: body.taskId,
      year: Math.trunc(body.year),
      weekNumber: Math.trunc(body.weekNumber),
      plannedDays: body.plannedDays,
      monday: Boolean(body.monday),
      tuesday: Boolean(body.tuesday),
      wednesday: Boolean(body.wednesday),
      thursday: Boolean(body.thursday),
      friday: Boolean(body.friday),
      saturday: Boolean(body.saturday),
      sunday: Boolean(body.sunday),
    },
  });
  return Response.json(item);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const found = await prisma.plannedWorkEntry.findFirst({ where: whereInternal(id), select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.plannedWorkEntry.delete({ where: { id } });
  return Response.json({ success: true });
}
