import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import {
  DEFAULT_COLOR,
  DEFAULT_PROJECT_TASK_STATUS,
  PROJECT_TASK_STATUS_FIELD,
} from "@/lib/constants";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const parseSelectOptionInput = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      value: normalized || null,
      color: null as string | null,
    };
  }
  if (value && typeof value === "object") {
    const candidateValue =
      "value" in value && typeof value.value === "string"
        ? value.value.trim()
        : "";
    const candidateColor =
      "color" in value && typeof value.color === "string"
        ? value.color.trim()
        : "";
    return {
      value: candidateValue || null,
      color: candidateColor || null,
    };
  }
  return {
    value: null as string | null,
    color: null as string | null,
  };
};

const upsertTaskStatusOption = async (value: unknown) => {
  const parsed = parseSelectOptionInput(value);
  const normalized = parsed.value ?? DEFAULT_PROJECT_TASK_STATUS;
  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field: PROJECT_TASK_STATUS_FIELD,
        value: normalized,
      },
    },
    create: {
      field: PROJECT_TASK_STATUS_FIELD,
      value: normalized,
      color: parsed.color ?? DEFAULT_COLOR,
    },
    update: {},
  });
  return option.id;
};

const serializeTask = (
  task: Record<string, unknown> & {
    statusOption?: { id?: string; value?: string | null; color?: string | null } | null;
    plannedWorkEntries?: Array<
      Record<string, unknown> & {
        yearOption?: { value?: string | null } | null;
        weekNumberOption?: { value?: string | null } | null;
      }
    >;
  },
) => ({
  ...task,
  status: task.statusOption?.value ?? null,
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
      statusOption: {
        select: {
          id: true,
          value: true,
          color: true,
        },
      },
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
  const found = await prisma.projectTask.findUnique({
    where: { id },
    select: {
      id: true,
      statusOption: {
        select: {
          value: true,
        },
      },
    },
  });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.segmentId) {
    const segment = await prisma.projectSegment.findUnique({
      where: { id: body.segmentId },
      select: { id: true },
    });
    if (!segment) return new Response("Segment not found", { status: 400 });
  }
  const statusOptionId = await upsertTaskStatusOption(
    body.status ?? found.statusOption?.value ?? DEFAULT_PROJECT_TASK_STATUS,
  );

  const item = await prisma.projectTask.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.segmentId === "string" ? { segmentId: body.segmentId } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "status")
        ? { statusOptionId }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "ownerId")
        ? { ownerId: body.ownerId ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "dueDate")
        ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
        : {}),
    },
    include: {
      statusOption: {
        select: {
          id: true,
          value: true,
          color: true,
        },
      },
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
  return Response.json(serializeTask(item));
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
