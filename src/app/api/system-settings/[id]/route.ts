import { Prisma, SystemSettingValueType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/api-permissions";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";

const parseOrderValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
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
  const { response, employee } = await requireAdminPermission();
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

  if (!key || !name || !group || value === "" || !valueType) {
    return new Response("Missing required fields", { status: 400 });
  }

  try {
    const updated = await prisma.systemSetting.update({
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
    return Response.json(updated);
  } catch (error) {
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
  const { response } = await requireAdminPermission();
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
