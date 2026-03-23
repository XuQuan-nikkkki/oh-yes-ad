import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
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
    statusOption?: { value?: string | null } | null;
  },
) => ({
  ...task,
  status: task.statusOption?.value ?? null,
});

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId")?.trim() ?? "";
  const items = await prisma.projectTask.findMany({
    where: ownerId ? { ownerId } : undefined,
    include: {
      statusOption: {
        select: {
          id: true,
          value: true,
          color: true,
        },
      },
      segment: {
        select: {
          id: true,
          name: true,
          project: {
            select: {
              id: true,
              name: true,
              statusOption: {
                select: {
                  id: true,
                  value: true,
                  color: true,
                },
              },
              stageOption: {
                select: {
                  id: true,
                  value: true,
                  color: true,
                },
              },
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items.map((item) => serializeTask(item)));
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
  const statusOptionId = await upsertTaskStatusOption(
    body.status ?? DEFAULT_PROJECT_TASK_STATUS,
  );

  const item = await prisma.projectTask.create({
    data: {
      name: body.name,
      segmentId: body.segmentId,
      statusOptionId,
      ownerId: body.ownerId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
    include: {
      statusOption: {
        select: {
          id: true,
          value: true,
          color: true,
        },
      },
      segment: {
        select: {
          id: true,
          name: true,
          project: {
            select: {
              id: true,
              name: true,
              statusOption: {
                select: {
                  id: true,
                  value: true,
                  color: true,
                },
              },
              stageOption: {
                select: {
                  id: true,
                  value: true,
                  color: true,
                },
              },
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      owner: { select: { id: true, name: true } },
    },
  });
  return Response.json(serializeTask(item));
}
