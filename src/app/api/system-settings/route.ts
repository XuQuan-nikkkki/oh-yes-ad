import { Prisma, SystemSettingValueType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireAdminPermission,
  requireAuthenticatedEmployee,
} from "@/lib/api-permissions";
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

export async function GET() {
  const { response } = await requireAuthenticatedEmployee();
  if (response) return response;

  const items = await prisma.systemSetting.findMany({
    orderBy: [
      { group: "asc" },
      { order: "asc" },
      { name: "asc" },
      { createdAt: "asc" },
    ],
  });

  return Response.json(items);
}

export async function POST(req: Request) {
  const { response, employee } = await requireAdminPermission();
  if (response || !employee) return response;

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
    const created = await prisma.systemSetting.create({
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
    return Response.json(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new Response("参数 key 已存在", { status: 409 });
    }
    throw error;
  }
}
