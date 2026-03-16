import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type RouteContext = { params: Promise<{ id: string }> };

const INTERNAL_PROJECT_TYPE_VALUES = ["内部项目", "INTERNAL"] as const;
const isInternalOnly = (projectType?: string | null) =>
  projectType === "internal";

const isNumberLike = (value: unknown): value is number | string =>
  typeof value === "number" || typeof value === "string";

const normalizeInteger = (value: unknown) => {
  if (!isNumberLike(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
};

const ensureOptionId = async (field: string, value: number | string) => {
  const normalized = String(value).trim();
  if (!normalized) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value: normalized,
      },
    },
    update: {},
    create: {
      field,
      value: normalized,
      color: "#d9d9d9",
    },
  });

  return option.id;
};

const serializeEntry = (
  item: Record<string, unknown> & {
    yearOption?: { value?: string | null } | null;
    weekNumberOption?: { value?: string | null } | null;
  },
) => {
  const year = Number(item.yearOption?.value);
  const weekNumber = Number(item.weekNumberOption?.value);

  return {
    ...item,
    year: Number.isFinite(year) ? year : null,
    weekNumber: Number.isFinite(weekNumber) ? weekNumber : null,
  };
};

const whereByScope = (id: string, internalOnly: boolean) =>
  internalOnly
    ? {
        id,
        task: {
          segment: {
            project: {
              typeOption: {
                value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
              },
            },
          },
        },
      }
    : { id };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internalOnly = isInternalOnly(req.nextUrl.searchParams.get("projectType"));
  const item = await prisma.plannedWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    include: {
      yearOption: { select: { id: true, value: true, color: true } },
      weekNumberOption: { select: { id: true, value: true, color: true } },
      task: {
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              id: true,
              name: true,
              functionOption: {
                select: { id: true, value: true, color: true },
              },
            },
          },
          segment: {
            select: {
              id: true,
              name: true,
              statusOption: {
                select: { id: true, value: true, color: true },
              },
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!item) return new Response("Not Found", { status: 404 });
  return Response.json(serializeEntry(item));
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internalOnly = isInternalOnly(req.nextUrl.searchParams.get("projectType"));
  const found = await prisma.plannedWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });

  const body = await req.json();
  if (body.taskId) {
    const task = await prisma.projectTask.findFirst({
      where: internalOnly
        ? {
            id: body.taskId,
            segment: {
              project: {
                typeOption: {
                  value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
                },
              },
            },
          }
        : { id: body.taskId },
      select: { id: true },
    });
    if (!task) return new Response("Task not found", { status: 400 });
  }

  const year = normalizeInteger(body.yearOption ?? body.year);
  const weekNumber = normalizeInteger(body.weekNumberOption ?? body.weekNumber);

  const [yearOptionId, weekNumberOptionId] = await Promise.all([
    year !== null ? ensureOptionId("plannedWorkEntry.year", year) : Promise.resolve(undefined),
    weekNumber !== null
      ? ensureOptionId("plannedWorkEntry.weekNumber", weekNumber)
      : Promise.resolve(undefined),
  ]);

  const item = await prisma.plannedWorkEntry.update({
    where: { id },
    data: {
      taskId: body.taskId,
      yearOptionId,
      weekNumberOptionId,
      plannedDays:
        typeof body.plannedDays === "number" ? body.plannedDays : undefined,
      monday: typeof body.monday === "boolean" ? body.monday : undefined,
      tuesday: typeof body.tuesday === "boolean" ? body.tuesday : undefined,
      wednesday:
        typeof body.wednesday === "boolean" ? body.wednesday : undefined,
      thursday: typeof body.thursday === "boolean" ? body.thursday : undefined,
      friday: typeof body.friday === "boolean" ? body.friday : undefined,
      saturday: typeof body.saturday === "boolean" ? body.saturday : undefined,
      sunday: typeof body.sunday === "boolean" ? body.sunday : undefined,
    },
    include: {
      yearOption: { select: { id: true, value: true, color: true } },
      weekNumberOption: { select: { id: true, value: true, color: true } },
      task: {
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              id: true,
              name: true,
              functionOption: {
                select: { id: true, value: true, color: true },
              },
            },
          },
          segment: {
            select: {
              id: true,
              name: true,
              statusOption: {
                select: { id: true, value: true, color: true },
              },
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  return Response.json(serializeEntry(item));
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const internalOnly = isInternalOnly(req.nextUrl.searchParams.get("projectType"));
  const found = await prisma.plannedWorkEntry.findFirst({
    where: whereByScope(id, internalOnly),
    select: { id: true },
  });
  if (!found) return new Response("Not Found", { status: 404 });
  await prisma.plannedWorkEntry.delete({ where: { id } });
  return Response.json({ success: true });
}
