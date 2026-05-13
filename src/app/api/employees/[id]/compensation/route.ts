import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cookies } from "next/headers";

import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import { SYSTEM_LAUNCH_DATE } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OptionValue = { value?: string | null } | null | undefined;
type EmployeePayload = Record<string, unknown> & {
  functionOption?: OptionValue;
  positionOption?: OptionValue;
  position?: string | null;
  departmentLevel1Option?: OptionValue;
  departmentLevel2Option?: OptionValue;
  employmentTypeOption?: OptionValue;
  employmentStatusOption?: OptionValue;
};

const compensationFields = [
  "salary",
  "socialSecurity",
  "providentFund",
  "workstationCost",
  "utilityCost",
] as const;

const employeePublicSelect = {
  id: true,
  name: true,
  phone: true,
  fullName: true,
  roles: {
    select: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  functionOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  position: true,
  positionOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  level: true,
  departmentLevel1Option: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  departmentLevel2Option: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  employmentTypeOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  employmentStatusOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  entryDate: true,
  leaveDate: true,
  salary: true,
  socialSecurity: true,
  providentFund: true,
  workstationCost: true,
  utilityCost: true,
  bankAccountNumber: true,
  bankName: true,
  bankBranch: true,
  legalEntity: {
    select: {
      id: true,
      name: true,
      fullName: true,
    },
  },
} as const;

const serializeEmployee = (employee: EmployeePayload) => ({
  ...employee,
  function: employee.functionOption?.value ?? null,
  position: employee.positionOption?.value ?? employee.position ?? null,
  departmentLevel1: employee.departmentLevel1Option?.value ?? null,
  departmentLevel2: employee.departmentLevel2Option?.value ?? null,
  employmentType: employee.employmentTypeOption?.value ?? null,
  employmentStatus: employee.employmentStatusOption?.value ?? null,
});

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toNullableDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNullableText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getDateStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getSystemLaunchDate = () => getDateStart(new Date(SYSTEM_LAUNCH_DATE));

const hasCompensationValue = (compensation: Record<string, number | null>) =>
  Object.values(compensation).some((value) => value !== null);

const getCurrentEmployeeId = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = decodeAuthSession(raw);
  if (!session?.employeeId) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true },
  });

  return employee?.id ?? null;
};

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const hasCompensationInput = compensationFields.some((key) => has(key));
  if (!hasCompensationInput) {
    return new Response("Compensation fields are required", { status: 400 });
  }

  const effectiveDate = toNullableDate(
    body.effectiveDate ?? body.compensationEffectiveDate,
  );
  if (!effectiveDate) {
    return new Response("Effective date is required", { status: 400 });
  }

  const changedById = await getCurrentEmployeeId();
  const changeReason = toNullableText(body.changeReason);

  const employee = await prisma.$transaction(async (tx) => {
    const existing = await tx.employee.findUnique({
      where: { id },
      select: {
        salary: true,
        socialSecurity: true,
        providentFund: true,
        workstationCost: true,
        utilityCost: true,
        entryDate: true,
        compensationHistories: {
          select: {
            salary: true,
            socialSecurity: true,
            providentFund: true,
            workstationCost: true,
            utilityCost: true,
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    const nextCompensation = {
      salary: has("salary")
        ? toNullableNumber(body.salary)
        : toNullableNumber(existing.salary),
      socialSecurity: has("socialSecurity")
        ? toNullableNumber(body.socialSecurity)
        : toNullableNumber(existing.socialSecurity),
      providentFund: has("providentFund")
        ? toNullableNumber(body.providentFund)
        : toNullableNumber(existing.providentFund),
      workstationCost: has("workstationCost")
        ? toNullableNumber(body.workstationCost)
        : toNullableNumber(existing.workstationCost),
      utilityCost: has("utilityCost")
        ? toNullableNumber(body.utilityCost)
        : toNullableNumber(existing.utilityCost),
    };
    const currentCompensation = {
      salary: toNullableNumber(existing.salary),
      socialSecurity: toNullableNumber(existing.socialSecurity),
      providentFund: toNullableNumber(existing.providentFund),
      workstationCost: toNullableNumber(existing.workstationCost),
      utilityCost: toNullableNumber(existing.utilityCost),
    };

    const updated = await tx.employee.update({
      where: { id },
      data: nextCompensation,
      select: employeePublicSelect,
    });

    const hasMeaningfulHistory = existing.compensationHistories.some((history) =>
      hasCompensationValue({
        salary: toNullableNumber(history.salary),
        socialSecurity: toNullableNumber(history.socialSecurity),
        providentFund: toNullableNumber(history.providentFund),
        workstationCost: toNullableNumber(history.workstationCost),
        utilityCost: toNullableNumber(history.utilityCost),
      }),
    );

    if (!hasMeaningfulHistory && hasCompensationValue(currentCompensation)) {
      await tx.employeeCompensationHistory.create({
        data: {
          employeeId: id,
          ...currentCompensation,
          changeReason: "系统初始薪资",
          effectiveDate: existing.entryDate
            ? getDateStart(existing.entryDate)
            : getSystemLaunchDate(),
          changedById,
        },
      });
    }

    await tx.employeeCompensationHistory.create({
      data: {
        employeeId: id,
        ...nextCompensation,
        changeReason,
        effectiveDate,
        changedById,
      },
    });

    return updated;
  });

  if (!employee) {
    return new Response("Employee not found", { status: 404 });
  }

  return Response.json(serializeEmployee(employee));
}
