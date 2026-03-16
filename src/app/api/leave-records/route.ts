import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const LEAVE_TYPE_FIELD = "leaveRecord.type";

const parseLeaveTemporalPayload = (body: Record<string, unknown>) => {
  const rawPrecision =
    typeof body.datePrecision === "string" ? body.datePrecision.toUpperCase() : "";
  const datePrecision = rawPrecision === "DATETIME" ? "DATETIME" : "DATE";

  const legacyStart =
    typeof body.startDate === "string" && body.startDate.trim()
      ? body.startDate.trim()
      : null;
  const legacyEnd =
    typeof body.endDate === "string" && body.endDate.trim()
      ? body.endDate.trim()
      : null;
  const startInput =
    typeof body.startAt === "string" && body.startAt.trim()
      ? body.startAt.trim()
      : legacyStart;
  const endInput =
    typeof body.endAt === "string" && body.endAt.trim() ? body.endAt.trim() : legacyEnd;

  const startAt = startInput ? new Date(startInput) : null;
  const endAt = endInput ? new Date(endInput) : null;
  return {
    startAt,
    endAt:
      startAt && endAt && startAt.getTime() === endAt.getTime() ? null : endAt,
    datePrecision,
  } as const;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next ? next : null;
};

const ensureLeaveTypeOptionId = async (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const option = await prisma.selectOption.upsert({
    where: {
      field_value: {
        field: LEAVE_TYPE_FIELD,
        value: normalized,
      },
    },
    update: {},
    create: {
      field: LEAVE_TYPE_FIELD,
      value: normalized,
      color: "#1677ff",
    },
  });

  return option.id;
};

type LeaveRecordPayload = Record<string, unknown> & {
  typeOption?: { id: string; value: string; color?: string | null } | null;
};

const serializeLeaveRecord = (record: LeaveRecordPayload) => ({
  ...record,
  startDate: (record.startAt as string | null | undefined) ?? null,
  endDate:
    (record.endAt as string | null | undefined) ??
    ((record.startAt as string | null | undefined) ?? null),
  type: record.typeOption?.value ?? null,
});

export async function GET() {
  const records = await prisma.leaveRecord.findMany({
    include: {
      employee: {
        select: { id: true, name: true },
      },
      typeOption: true,
    },
    orderBy: { startAt: "desc" },
  });

  return Response.json(records.map(serializeLeaveRecord));
}

export async function POST(req: Request) {
  try {
    const body = await sanitizeRequestBody(req);
    const typeOptionId = await ensureLeaveTypeOptionId(body.type);
    const temporal = parseLeaveTemporalPayload(body);
    if (!temporal.startAt) {
      return Response.json({ error: "Missing startAt/startDate" }, { status: 400 });
    }
    const record = await prisma.leaveRecord.create({
      data: {
        typeOptionId,
        startAt: temporal.startAt,
        endAt: temporal.endAt,
        datePrecision: temporal.datePrecision,
        employeeId: body.employeeId,
      },
      include: {
        employee: {
          select: { id: true, name: true },
        },
        typeOption: true,
      },
    });
    return Response.json(serializeLeaveRecord(record));
  } catch (error) {
    console.error("POST /api/leave-records error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
