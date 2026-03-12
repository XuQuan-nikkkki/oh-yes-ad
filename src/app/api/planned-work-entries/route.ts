import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectType = searchParams.get("projectType");

  const items = await prisma.plannedWorkEntry.findMany({
    where:
      projectType === "all"
        ? undefined
        : { task: { segment: { project: { type: "内部项目" } } } },
    include: {
      task: {
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
          segment: {
            select: {
              id: true,
              name: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.taskId || typeof body.taskId !== "string") {
    return new Response("Invalid task ID", { status: 400 });
  }

  const task = await prisma.projectTask.findFirst({
    where: { id: body.taskId, segment: { project: { type: "内部项目" } } },
    select: { id: true },
  });
  if (!task) return new Response("Task not found", { status: 400 });

  const item = await prisma.plannedWorkEntry.create({
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
