import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COLOR } from "@/lib/constants";
import { requireProjectWritePermission } from "@/lib/api-permissions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const INTERNAL_PROJECT_TYPE_VALUES = ["内部项目", "INTERNAL"] as const;

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
      color: DEFAULT_COLOR,
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

const internalProjectWhere = {
  task: {
    segment: {
      project: {
        typeOption: {
          value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
        },
      },
    },
  },
};

const isInternalOnly = (projectType?: string | null) =>
  projectType === "internal";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectType = searchParams.get("projectType");
  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));
  const taskName = searchParams.get("taskName")?.trim() ?? "";
  const ownerName = searchParams.get("ownerName")?.trim() ?? "";
  const projectName = searchParams.get("projectName")?.trim() ?? "";
  const segmentName = searchParams.get("segmentName")?.trim() ?? "";
  const year = searchParams.get("year")?.trim() ?? "";
  const weekNumber = searchParams.get("weekNumber")?.trim() ?? "";
  const taskId = searchParams.get("taskId")?.trim() ?? "";
  const paged = Number.isFinite(page) && page > 0 && Number.isFinite(pageSize) && pageSize > 0;

  const where = {
    task: {
      ...(taskName
        ? {
            name: {
              contains: taskName,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(taskId ? { id: taskId } : {}),
      ...(ownerName
        ? {
            owner: {
              name: {
                contains: ownerName,
                mode: "insensitive" as const,
              },
            },
          }
        : {}),
      segment: {
        ...(segmentName
          ? {
              name: {
                contains: segmentName,
                mode: "insensitive" as const,
              },
            }
          : {}),
        project: {
          ...(isInternalOnly(projectType)
            ? {
                typeOption: {
                  value: { in: INTERNAL_PROJECT_TYPE_VALUES as unknown as string[] },
                },
              }
            : {}),
          ...(projectName
            ? {
                name: {
                  contains: projectName,
                  mode: "insensitive" as const,
                },
              }
            : {}),
        },
      },
    },
    ...(year
      ? {
          yearOption: {
            value: year,
          },
        }
      : {}),
    ...(weekNumber
      ? {
          weekNumberOption: {
            value: weekNumber,
          },
        }
      : {}),
  };

  if (paged) {
    const [items, total] = await Promise.all([
      prisma.plannedWorkEntry.findMany({
        where,
        include: {
          yearOption: {
            select: { id: true, value: true, color: true },
          },
          weekNumberOption: {
            select: { id: true, value: true, color: true },
          },
          task: {
            select: {
              id: true,
              name: true,
              owner: { select: { id: true, name: true } },
              segment: {
                select: {
                  id: true,
                  name: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                      client: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.plannedWorkEntry.count({ where }),
    ]);
    return Response.json({
      data: items.map(serializeEntry),
      total,
      page,
      pageSize,
    });
  }

  const items = await prisma.plannedWorkEntry.findMany({
    where: isInternalOnly(projectType) ? internalProjectWhere : undefined,
    include: {
      yearOption: {
        select: { id: true, value: true, color: true },
      },
      weekNumberOption: {
        select: { id: true, value: true, color: true },
      },
      task: {
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
          segment: {
            select: {
              id: true,
              name: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  client: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items.map(serializeEntry));
}

export async function POST(req: NextRequest) {
  const permissionResponse = await requireProjectWritePermission();
  if (permissionResponse) return permissionResponse;

  const body = await sanitizeRequestBody(req);
  const projectType = req.nextUrl.searchParams.get("projectType");
  if (!body?.taskId || typeof body.taskId !== "string") {
    return new Response("Invalid task ID", { status: 400 });
  }

  const task = await prisma.projectTask.findFirst({
    where: isInternalOnly(projectType)
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

  const year = normalizeInteger(body.yearOption ?? body.year);
  const weekNumber = normalizeInteger(body.weekNumberOption ?? body.weekNumber);
  if (year === null) return new Response("Invalid year", { status: 400 });
  if (weekNumber === null) return new Response("Invalid week number", { status: 400 });

  const [yearOptionId, weekNumberOptionId] = await Promise.all([
    ensureOptionId("plannedWorkEntry.year", year),
    ensureOptionId("plannedWorkEntry.weekNumber", weekNumber),
  ]);

  const item = await prisma.plannedWorkEntry.create({
    data: {
      taskId: body.taskId,
      yearOptionId,
      weekNumberOptionId,
      plannedDays: Number(body.plannedDays ?? 0),
      monday: Boolean(body.monday),
      tuesday: Boolean(body.tuesday),
      wednesday: Boolean(body.wednesday),
      thursday: Boolean(body.thursday),
      friday: Boolean(body.friday),
      saturday: Boolean(body.saturday),
      sunday: Boolean(body.sunday),
    },
    include: {
      yearOption: { select: { id: true, value: true, color: true } },
      weekNumberOption: { select: { id: true, value: true, color: true } },
      task: {
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true } },
          segment: {
            select: {
              id: true,
              name: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  client: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  return Response.json(serializeEntry(item));
}
