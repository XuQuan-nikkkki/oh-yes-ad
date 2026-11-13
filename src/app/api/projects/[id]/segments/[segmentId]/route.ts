import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";
import {
  buildProjectSegmentScalarUpdate,
  hasProjectSegmentStatusUpdate,
} from "@/lib/project-segment-update";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string; segmentId: string }>;
};

const upsertSelectOption = async (field: string, value: unknown) => {
  const rawValue =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "value" in value && typeof value.value === "string"
        ? value.value
        : "";
  const normalized = rawValue.trim();
  if (!normalized) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field,
        value: normalized,
      },
    },
    create: {
      field,
      value: normalized,
      color: DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

const serializeSegment = (segment: {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  statusOption?: { value: string; color: string | null } | null;
} & Record<string, unknown>) => ({
  ...segment,
  status: segment.statusOption?.value ?? null,
  dueDate: segment.endDate ?? null,
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, segmentId } = await context.params;
  if (!projectId || !segmentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectSegment.findFirst({
    where: { id: segmentId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const body = await req.json();
  const data = buildProjectSegmentScalarUpdate(body);
  if (hasProjectSegmentStatusUpdate(body)) {
    data.statusOptionId = await upsertSelectOption(
      "projectSegment.status",
      body.status,
    );
  }

  const segment = await prisma.projectSegment.update({
    where: { id: segmentId },
    data,
    include: {
      owner: { select: { id: true, name: true } },
      statusOption: { select: { value: true, color: true } },
    },
  });

  return Response.json(serializeSegment(segment));
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: projectId, segmentId } = await context.params;
  if (!projectId || !segmentId) {
    return new Response("Missing IDs", { status: 400 });
  }

  const found = await prisma.projectSegment.findFirst({
    where: { id: segmentId, projectId },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.projectSegment.delete({
    where: { id: segmentId },
  });

  return Response.json({ success: true });
}
