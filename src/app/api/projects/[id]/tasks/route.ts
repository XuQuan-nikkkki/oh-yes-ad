import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId } = await context.params;
  if (!projectId) {
    return new Response("Missing project ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid task name", { status: 400 });
  }
  if (!body?.segmentId || typeof body.segmentId !== "string") {
    return new Response("Invalid segment ID", { status: 400 });
  }

  const segment = await prisma.projectSegment.findFirst({
    where: { id: body.segmentId, projectId },
    select: { id: true },
  });
  if (!segment) {
    return new Response("Segment not in project", { status: 400 });
  }

  const task = await prisma.projectTask.create({
    data: {
      name: body.name,
      segmentId: body.segmentId,
      ownerId: body.ownerId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  return Response.json(task);
}
