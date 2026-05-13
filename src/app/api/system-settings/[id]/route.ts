import { Prisma, SystemSettingValueType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSystemSettingsPermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

const parseOrderValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const parseEffectiveDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeValueType = (value: unknown): SystemSettingValueType | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return Object.values(SystemSettingValueType).includes(
    trimmed as SystemSettingValueType,
  )
    ? (trimmed as SystemSettingValueType)
    : null;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { response, employee } = await requireSystemSettingsPermission();
  if (response || !employee) return response;

  const { id } = await context.params;
  const body = await sanitizeRequestBody(req);
  const key = String(body.key ?? "").trim();
  const name = String(body.name ?? "").trim();
  const group = String(body.group ?? "").trim();
  const value = String(body.value ?? "").trim();
  const valueType = normalizeValueType(body.valueType);
  const unit = String(body.unit ?? "").trim() || null;
  const description = String(body.description ?? "").trim() || null;
  const order = parseOrderValue(body.order);
  const effectiveDate = parseEffectiveDate(body.effectiveDate);

  if (!key || !name || !group || value === "" || !valueType) {
    return new Response("Missing required fields", { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.systemSetting.findUnique({
        where: { id },
        select: {
          id: true,
          key: true,
          value: true,
          valueType: true,
        },
      });

      if (!existing) {
        throw new Error("System setting not found");
      }

      if (existing.value !== value && !effectiveDate) {
        throw new Error("Effective date is required when value changes");
      }

      const nextSetting = await tx.systemSetting.update({
        where: { id },
        data: {
          key,
          name,
          group,
          value,
          valueType,
          unit,
          description,
          order,
          updatedById: employee.id,
        },
      });

      if (existing.value !== value) {
        await tx.systemSettingHistory.create({
          data: {
            systemSettingId: existing.id,
            key,
            oldValue: existing.value,
            newValue: value,
            valueType,
            effectiveDate: effectiveDate!,
            changedById: employee.id,
          },
        });
      }

      const latestHistory = await tx.systemSettingHistory.findFirst({
        where: { systemSettingId: existing.id },
        orderBy: [
          { effectiveDate: "desc" },
          { changedAt: "desc" },
        ],
        select: {
          effectiveDate: true,
          newValue: true,
        },
      });

      return {
        ...nextSetting,
        histories: latestHistory ? [latestHistory] : [],
      };
    });
    return Response.json(updated);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Effective date is required when value changes"
    ) {
      return new Response("Effective date is required when value changes", {
        status: 400,
      });
    }
    if (error instanceof Error && error.message === "System setting not found") {
      return new Response("参数不存在", { status: 404 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new Response("参数 key 已存在", { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return new Response("参数不存在", { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { response } = await requireSystemSettingsPermission();
  if (response) return response;

  const { id } = await context.params;
  try {
    await prisma.systemSetting.delete({
      where: { id },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return new Response("参数不存在", { status: 404 });
    }
    throw error;
  }
}
