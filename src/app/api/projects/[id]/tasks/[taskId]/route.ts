import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; taskId: string }>;
};

const findTaskInProject = async (projectId: string, taskId: string) => {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      segment: {
        projectId,
      },
    },
    select: {
      id: true,
    },
  });
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, taskId } = await context.params;
  if (!projectId || !taskId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findTaskInProject(projectId, taskId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = (await req.json()) as {
    name?: unknown;
    segmentId?: unknown;
    ownerId?: unknown;
    dueDate?: unknown;
  };

  if (typeof body.segmentId === "string" && body.segmentId) {
    const targetSegment = await prisma.projectSegment.findFirst({
      where: { id: body.segmentId, projectId },
      select: { id: true },
    });
    if (!targetSegment) {
      return new Response("Segment not in project", { status: 400 });
    }
  }

  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      segmentId: typeof body.segmentId === "string" ? body.segmentId : undefined,
      ownerId: typeof body.ownerId === "string" ? body.ownerId : null,
      dueDate:
        typeof body.dueDate === "string" && body.dueDate
          ? new Date(body.dueDate)
          : null,
    },
  });

  return Response.json(task);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, taskId } = await context.params;
  if (!projectId || !taskId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await findTaskInProject(projectId, taskId);
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.projectTask.delete({
    where: { id: taskId },
  });

  return Response.json({ success: true });
}
