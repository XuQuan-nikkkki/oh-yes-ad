import { NextRequest } from "next/server";
import { DEFAULT_COLOR } from "@/lib/constants";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

const normalizeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const ensureOptionId = async (field: string, value: number) => {
  const normalized = String(value);
  const option = await prisma.selectOption.upsert({
    where: { field_value: { field, value: normalized } },
    update: {},
    create: { field, value: normalized, color: DEFAULT_COLOR },
    select: { id: true },
  });
  return option.id;
};

const findEntry = (workItemId: string, entryId: string) =>
  prisma.plannedWorkEntry.findFirst({
    where: { id: entryId, workItemId },
    select: { id: true },
  });

export async function PATCH(req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: workItemId, entryId } = await context.params;
  if (!(await findEntry(workItemId, entryId))) {
    return new Response("计划工时不存在", { status: 404 });
  }

  const body = await sanitizeRequestBody(req);
  const year = normalizeInteger(body?.yearOption ?? body?.year);
  const weekNumber = normalizeInteger(
    body?.weekNumberOption ?? body?.weekNumber,
  );
  const plannedDays = normalizeNumber(body?.plannedDays);
  if (year === null) return new Response("年份无效", { status: 400 });
  if (weekNumber === null) return new Response("周数无效", { status: 400 });
  if (plannedDays === null) return new Response("计划天数无效", { status: 400 });

  const [yearOptionId, weekNumberOptionId] = await Promise.all([
    ensureOptionId("plannedWorkEntry.year", year),
    ensureOptionId("plannedWorkEntry.weekNumber", weekNumber),
  ]);

  const entry = await prisma.plannedWorkEntry.update({
    where: { id: entryId },
    data: {
      yearOptionId,
      weekNumberOptionId,
      plannedDays,
      monday: Boolean(body?.monday),
      tuesday: Boolean(body?.tuesday),
      wednesday: Boolean(body?.wednesday),
      thursday: Boolean(body?.thursday),
      friday: Boolean(body?.friday),
      saturday: Boolean(body?.saturday),
      sunday: Boolean(body?.sunday),
    },
  });

  return Response.json(entry);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { id: workItemId, entryId } = await context.params;
  if (!(await findEntry(workItemId, entryId))) {
    return new Response("计划工时不存在", { status: 404 });
  }

  await prisma.plannedWorkEntry.delete({ where: { id: entryId } });
  return new Response(null, { status: 204 });
}
