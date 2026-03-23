import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireLeaveRecordWritePermission } from "@/lib/api-permissions";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const LEAVE_TYPE_FIELD = "leaveRecord.type";

const parseLeaveTemporalPayload = (body: Record<string, unknown>) => {
  const rawPrecision =
    typeof body.datePrecision === "string" ? body.datePrecision.toUpperCase() : "";
  const datePrecision = rawPrecision === "DATETIME" ? "DATETIME" : "DATE";

  const hasLegacyStart = body.startDate !== undefined;
  const hasLegacyEnd = body.endDate !== undefined;
  const hasStartAt = body.startAt !== undefined;
  const hasEndAt = body.endAt !== undefined;
  const hasPrecision = body.datePrecision !== undefined;
  const shouldUpdateTemporal =
    hasLegacyStart || hasLegacyEnd || hasStartAt || hasEndAt || hasPrecision;

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
    shouldUpdateTemporal,
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionResponse = await requireLeaveRecordWritePermission();
    if (permissionResponse) return permissionResponse;

    const { id } = await params;
    const body = await sanitizeRequestBody(req);
    const typeOptionId = await ensureLeaveTypeOptionId(body.type);
    const temporal = parseLeaveTemporalPayload(body);
    const record = await prisma.leaveRecord.update({
      where: { id },
      data: {
        typeOptionId,
        ...(temporal.shouldUpdateTemporal
          ? {
              ...(temporal.startAt ? { startAt: temporal.startAt } : {}),
              endAt: temporal.endAt,
              datePrecision: temporal.datePrecision,
            }
          : {}),
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
    console.error("PUT /api/leave-records/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionResponse = await requireLeaveRecordWritePermission();
    if (permissionResponse) return permissionResponse;

    const { id } = await params;
    await prisma.leaveRecord.delete({
      where: { id },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leave-records/[id] error:", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
