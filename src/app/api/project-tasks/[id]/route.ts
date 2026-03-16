import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const serializeTask = (
  task: Record<string, unknown> & {
    plannedWorkEntries?: Array<
      Record<string, unknown> & {
        yearOption?: { value?: string | null } | null;
        weekNumberOption?: { value?: string | null } | null;
      }
    >;
  },
) => ({
  ...task,
  plannedWorkEntries: Array.isArray(task.plannedWorkEntries)
    ? task.plannedWorkEntries.map((entry) => {
        const year = Number(entry.yearOption?.value);
        const weekNumber = Number(entry.weekNumberOption?.value);
        return {
          ...entry,
          year: Number.isFinite(year) ? year : null,
          weekNumber: Number.isFinite(weekNumber) ? weekNumber : null,
        };
      })
    : [],
});

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const item = await prisma.projectTask.findFirst({
    where: { id },
    include: {
      segment: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
      owner: {
        select: {
          id: true,
          name: true,
          functionOption: {
            select: {
              id: true,
              value: true,
              color: true,
            },
          },
        },
      },
      creator: { select: { id: true, name: true } },
      plannedWorkEntries: {
        select: {
          id: true,
          yearOption: { select: { value: true } },
          weekNumberOption: { select: { value: true } },
          plannedDays: true,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
      },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(serializeTask(item));
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectTask.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.segmentId) {
    const segment = await prisma.projectSegment.findUnique({
      where: { id: body.segmentId },
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
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  const found = await prisma.projectTask.findUnique({ where: { id }, select: { id: true } });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.projectTask.delete({ where: { id } });
  return Response.json({ success: true });
}
