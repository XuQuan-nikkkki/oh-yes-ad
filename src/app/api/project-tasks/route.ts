import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function GET() {
  const items = await prisma.projectTask.findMany({
    include: {
      segment: {
        select: { id: true, name: true, project: { select: { id: true, name: true } } },
      },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const body = await sanitizeRequestBody(req);
  if (!body?.name || typeof body.name !== "string") {
    return new Response("Invalid task name", { status: 400 });
  }
  if (!body?.segmentId || typeof body.segmentId !== "string") {
    return new Response("Invalid segment ID", { status: 400 });
  }

  const segment = await prisma.projectSegment.findUnique({
    where: { id: body.segmentId },
    select: { id: true },
  });
  if (!segment) return new Response("Segment not found", { status: 400 });

  const item = await prisma.projectTask.create({
    data: {
      name: body.name,
      segmentId: body.segmentId,
      ownerId: body.ownerId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return Response.json(item);
}
