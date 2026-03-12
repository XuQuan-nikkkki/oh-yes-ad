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

const ensureTaskInProject = async (projectId: string, taskId: string) => {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      segment: {
        projectId,
      },
    },
    select: { id: true },
  });
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await req.json();

  if (!body?.taskId || typeof body.taskId !== "string") {
    return new Response("Invalid task ID", { status: 400 });
  }
  if (typeof body.year !== "number") {
    return new Response("Invalid year", { status: 400 });
  }
  if (typeof body.weekNumber !== "number") {
    return new Response("Invalid week number", { status: 400 });
  }
  if (typeof body.plannedDays !== "number") {
    return new Response("Invalid planned days", { status: 400 });
  }

  const task = await ensureTaskInProject(projectId, body.taskId);
  if (!task) {
    return new Response("Task not in project", { status: 400 });
  }

  const entry = await prisma.plannedWorkEntry.create({
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

  return Response.json(entry);
}
