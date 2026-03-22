import { PrismaClient } from "@prisma/client";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COLOR } from "@/lib/constants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const ensureStaffRoleId = async () => {
  const staff = await prisma.role.upsert({
    where: { code: "STAFF" },
    create: {
      code: "STAFF",
      name: "员工",
    },
    update: {},
    select: { id: true },
  });
  return staff.id;
};

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

const employeeListSelect = {
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
  employmentStatusOption: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
} as const;

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const upsertSelectOption = async (field: string, value: unknown) => {
  const normalized = toStringOrNull(value);
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

const serializeEmployee = (employee: EmployeePayload) => ({
  ...employee,
  function: employee.functionOption?.value ?? null,
  position: employee.positionOption?.value ?? employee.position ?? null,
  departmentLevel1: employee.departmentLevel1Option?.value ?? null,
  departmentLevel2: employee.departmentLevel2Option?.value ?? null,
  employmentType: employee.employmentTypeOption?.value ?? null,
  employmentStatus: employee.employmentStatusOption?.value ?? null,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");

  const select = list === "full" ? employeePublicSelect : employeeListSelect;

  const employees = await prisma.employee.findMany({
    select,
    orderBy: { name: "asc" },
  });
  return Response.json(employees.map(serializeEmployee));
}

export async function POST(req: Request) {
  const body = await sanitizeRequestBody(req);
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return new Response("Phone is required", { status: 400 });
  }

  const staffRoleId = await ensureStaffRoleId();

  const roleIds: string[] = Array.isArray(body.roleIds)
    ? Array.from(
        new Set(
          body.roleIds.filter(
            (id: unknown): id is string => typeof id === "string",
          ),
        ),
      )
    : [];

  if (roleIds.length > 0) {
    const roleCount = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (roleCount !== roleIds.length) {
      return new Response("Invalid role IDs", { status: 400 });
    }
  }

  const [functionOptionId, employmentStatusOptionId] = await Promise.all([
    upsertSelectOption("employee.function", body.function),
    upsertSelectOption("employee.employmentStatus", body.employmentStatus),
  ]);

  try {
    const employee = await prisma.employee.create({
      data: {
        name: body.name,
        phone,
        fullName: body.fullName || null,
        password: body.password || undefined,
        functionOptionId,
        employmentStatusOptionId,
        roles: {
          create:
            roleIds.length > 0
              ? roleIds.map((roleId) => ({
                  role: { connect: { id: roleId } },
                }))
              : [
                  {
                    role: { connect: { id: staffRoleId } },
                  },
                ],
        },
      },
      select: employeePublicSelect,
    });

    return Response.json(serializeEmployee(employee));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response("Phone already exists", { status: 400 });
    }
    throw error;
  }
}

export async function PUT(req: Request) {
  const body = await sanitizeRequestBody(req);
  const staffRoleId = await ensureStaffRoleId();
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  const phone =
    typeof body.phone === "string" ? body.phone.trim() : null;
  if (has("phone") && !phone) {
    return new Response("Phone is required", { status: 400 });
  }
  if (typeof body.password === "string" && body.password.trim()) {
    return new Response("Password cannot be changed from this interface", { status: 400 });
  }

  const roleIds: string[] | undefined = Array.isArray(body.roleIds)
    ? Array.from(
        new Set(
          body.roleIds.filter(
            (id: unknown): id is string => typeof id === "string",
          ),
        ),
      )
    : undefined;

  if (roleIds && roleIds.length > 0) {
    const roleCount = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (roleCount !== roleIds.length) {
      return new Response("Invalid role IDs", { status: 400 });
    }
  }

  const [
    functionOptionId,
    positionOptionId,
    departmentLevel1OptionId,
    departmentLevel2OptionId,
    employmentTypeOptionId,
    employmentStatusOptionId,
  ] = await Promise.all([
    has("function")
      ? upsertSelectOption("employee.function", body.function)
      : Promise.resolve(undefined),
    has("position")
      ? upsertSelectOption("employee.position", body.position)
      : Promise.resolve(undefined),
    has("departmentLevel1")
      ? upsertSelectOption("employee.departmentLevel1", body.departmentLevel1)
      : Promise.resolve(undefined),
    has("departmentLevel2")
      ? upsertSelectOption("employee.departmentLevel2", body.departmentLevel2)
      : Promise.resolve(undefined),
    has("employmentType")
      ? upsertSelectOption("employee.employmentType", body.employmentType)
      : Promise.resolve(undefined),
    has("employmentStatus")
      ? upsertSelectOption("employee.employmentStatus", body.employmentStatus)
      : Promise.resolve(undefined),
  ]);

  const toNullableNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const toNullableDate = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const data: Record<string, unknown> = {
    name: body.name,
  };

  if (has("phone")) data.phone = phone;
  if (has("fullName")) data.fullName = body.fullName || null;
  if (has("function")) data.functionOptionId = functionOptionId ?? null;
  if (has("position")) data.positionOptionId = positionOptionId ?? null;
  if (has("departmentLevel1")) data.departmentLevel1OptionId = departmentLevel1OptionId ?? null;
  if (has("departmentLevel2")) data.departmentLevel2OptionId = departmentLevel2OptionId ?? null;
  if (has("employmentType")) data.employmentTypeOptionId = employmentTypeOptionId ?? null;
  if (has("employmentStatus")) data.employmentStatusOptionId = employmentStatusOptionId ?? null;
  if (has("level")) data.level = toStringOrNull(body.level);
  if (has("entryDate")) data.entryDate = toNullableDate(body.entryDate);
  if (has("leaveDate")) data.leaveDate = toNullableDate(body.leaveDate);
  if (has("salary")) data.salary = toNullableNumber(body.salary);
  if (has("socialSecurity")) data.socialSecurity = toNullableNumber(body.socialSecurity);
  if (has("providentFund")) data.providentFund = toNullableNumber(body.providentFund);
  if (has("workstationCost")) data.workstationCost = toNullableNumber(body.workstationCost);
  if (has("utilityCost")) data.utilityCost = toNullableNumber(body.utilityCost);
  if (has("bankAccountNumber")) data.bankAccountNumber = toStringOrNull(body.bankAccountNumber);
  if (has("bankName")) data.bankName = toStringOrNull(body.bankName);
  if (has("bankBranch")) data.bankBranch = toStringOrNull(body.bankBranch);
  if (has("legalEntityId")) {
    data.legalEntityId =
      typeof body.legalEntityId === "string" && body.legalEntityId.trim()
        ? body.legalEntityId.trim()
        : null;
  }

  if (roleIds) {
    data.roles = {
      deleteMany: {},
      create:
        roleIds.length > 0
          ? roleIds.map((roleId) => ({
              role: { connect: { id: roleId } },
            }))
          : [
              {
                role: { connect: { id: staffRoleId } },
              },
            ],
    };
  }

  try {
    const employee = await prisma.employee.update({
      where: { id: body.id },
      data,
      select: employeePublicSelect,
    });

    return Response.json(serializeEmployee(employee));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return new Response("Phone already exists", { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(req: Request) {
  const body = await sanitizeRequestBody(req);

  await prisma.employee.delete({
    where: { id: body.id },
  });

  return Response.json({ success: true });
}
