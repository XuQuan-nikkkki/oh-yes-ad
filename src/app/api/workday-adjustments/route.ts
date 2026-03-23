import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COLOR } from "@/lib/constants";
import { requireWorkdayAdjustmentWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const CHANGE_TYPE_FIELD = "workdayAdjustment.changeType";

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next ? next : null;
};

const ensureChangeTypeOptionId = async (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field: CHANGE_TYPE_FIELD,
        value: normalized,
      },
    },
    update: {},
    create: {
      field: CHANGE_TYPE_FIELD,
      value: normalized,
      color: DEFAULT_COLOR,
    },
  });

  return option.id;
};

type WorkdayAdjustmentPayload = Record<string, unknown> & {
  changeTypeOption?: { id: string; value: string; color?: string | null } | null;
};

const serializeWorkdayAdjustment = (record: WorkdayAdjustmentPayload) => ({
  ...record,
  changeType: record.changeTypeOption?.value ?? null,
});

export async function GET() {
  try {
    const records = await prisma.workdayAdjustment.findMany({
      include: {
        changeTypeOption: true,
      },
      orderBy: { startDate: "desc" },
    });
    return Response.json(records.map(serializeWorkdayAdjustment));
  } catch (error) {
    console.error("GET /api/workday-adjustments error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const permissionResponse = await requireWorkdayAdjustmentWritePermission();
    if (permissionResponse) return permissionResponse;

    const body = await sanitizeRequestBody(req);
    const changeTypeOptionId = await ensureChangeTypeOptionId(body.changeType);

    const record = await prisma.workdayAdjustment.create({
      data: {
        name: normalizeText(body.name),
        changeTypeOptionId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      include: {
        changeTypeOption: true,
      },
    });
    return Response.json(serializeWorkdayAdjustment(record));
  } catch (error) {
    console.error("POST /api/workday-adjustments error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
