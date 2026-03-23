import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { DEFAULT_COLOR } from "@/lib/constants";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { extractRoleCodes } from "@/lib/role-permissions";
import { getNumericSystemSettings } from "@/lib/system-settings.server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OptionValue = { id?: string; value?: string | null; color?: string | null } | null | undefined;
type ProjectPayload = Record<string, unknown> & {
  typeOption?: OptionValue;
  statusOption?: OptionValue;
  stageOption?: OptionValue;
};
type LeaveRecordPayload = Record<string, unknown> & {
  typeOption?: OptionValue;
};
type EmployeePayload = Record<string, unknown> & {
  functionOption?: OptionValue;
  positionOption?: OptionValue;
  position?: string | null;
  departmentLevel1Option?: OptionValue;
  departmentLevel2Option?: OptionValue;
  employmentTypeOption?: OptionValue;
  employmentStatusOption?: OptionValue;
  ownedProjects?: ProjectPayload[];
  projects?: ProjectPayload[];
  leaveRecords?: LeaveRecordPayload[];
  legalEntity?: { id: string; name: string; fullName?: string | null } | null;
};

const serializeEmployee = (
  employee: EmployeePayload,
  employeeCostDefaults?: {
    workstationCost: number;
    utilityCost: number;
  },
) => ({
  ...employee,
  function: employee.functionOption?.value ?? null,
  position: employee.positionOption?.value ?? employee.position ?? null,
  departmentLevel1: employee.departmentLevel1Option?.value ?? null,
  departmentLevel2: employee.departmentLevel2Option?.value ?? null,
  employmentType: employee.employmentTypeOption?.value ?? null,
  employmentStatus: employee.employmentStatusOption?.value ?? null,
  workstationCost:
    employeeCostDefaults?.workstationCost ?? employee.workstationCost ?? null,
  utilityCost:
    employeeCostDefaults?.utilityCost ?? employee.utilityCost ?? null,
  ownedProjects: (employee.ownedProjects ?? []).map((project) => ({
    ...project,
    type: project.typeOption?.value ?? null,
    status: project.statusOption?.value ?? null,
    stage: project.stageOption?.value ?? null,
  })),
  projects: (employee.projects ?? []).map((project) => ({
    ...project,
    type: project.typeOption?.value ?? null,
    status: project.statusOption?.value ?? null,
    stage: project.stageOption?.value ?? null,
  })),
  leaveRecords: (employee.leaveRecords ?? []).map((record) => ({
    ...record,
    startDate: (record.startAt as string | null | undefined) ?? null,
    endDate:
      (record.endAt as string | null | undefined) ??
      ((record.startAt as string | null | undefined) ?? null),
    type: record.typeOption?.value ?? null,
  })),
});

const toStringOrNull = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const upsertSelectOption = async (field: string, value: unknown) => {
  const normalized =
    typeof value === "string"
      ? toStringOrNull(value)
      : value &&
          typeof value === "object" &&
          "value" in value &&
          typeof value.value === "string"
        ? toStringOrNull(value.value)
        : null;
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
      color:
        value &&
        typeof value === "object" &&
        "color" in value &&
        typeof value.color === "string" &&
        value.color.trim()
          ? value.color.trim()
          : DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

const requireEmployeeOptionWritePermission = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = decodeAuthSession(raw);
  if (!session?.employeeId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const employee = await sharedPrisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      roles: {
        select: {
          role: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!employee) {
    return new Response("Unauthorized", { status: 401 });
  }

  const roleCodes = extractRoleCodes(employee);
  const allowed =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("PROJECT_MANAGER") ||
    roleCodes.includes("HR");

  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const [employee, systemSettings] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      select: {
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
        ownedProjects: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            typeOption: {
              select: { id: true, value: true, color: true },
            },
            statusOption: {
              select: { id: true, value: true, color: true },
            },
            stageOption: {
              select: { id: true, value: true, color: true },
            },
          },
          orderBy: [
            {
              startDate: {
                sort: "desc",
                nulls: "last",
              },
            },
            { name: "asc" },
          ],
        },
        projects: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            typeOption: {
              select: { id: true, value: true, color: true },
            },
            statusOption: {
              select: { id: true, value: true, color: true },
            },
            stageOption: {
              select: { id: true, value: true, color: true },
            },
          },
          orderBy: [
            {
              startDate: {
                sort: "desc",
                nulls: "last",
              },
            },
            { name: "asc" },
          ],
        },
        leaveRecords: {
          select: {
            id: true,
            typeOption: {
              select: { id: true, value: true, color: true },
            },
            startAt: true,
            endAt: true,
            datePrecision: true,
          },
          orderBy: { startAt: "desc" },
        },
        actualWorkEntries: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
        },
      },
    }),
    getNumericSystemSettings(),
  ]);

  if (!employee) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(
    serializeEmployee(employee, {
      workstationCost: systemSettings.employeeDefaultWorkstationCost,
      utilityCost: systemSettings.employeeDefaultUtilityCost,
    }),
  );
}

export async function PATCH(req: Request, context: RouteContext) {
  const denied = await requireEmployeeOptionWritePermission();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await sanitizeRequestBody(req);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  const found = await prisma.employee.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!found) {
    return new Response("Not Found", { status: 404 });
  }

  const functionOptionId = has("function")
    ? await upsertSelectOption("employee.function", body.function)
    : undefined;
  const departmentLevel1OptionId = has("departmentLevel1")
    ? await upsertSelectOption("employee.departmentLevel1", body.departmentLevel1)
    : undefined;
  const departmentLevel2OptionId = has("departmentLevel2")
    ? await upsertSelectOption("employee.departmentLevel2", body.departmentLevel2)
    : undefined;
  const positionOptionId = has("position")
    ? await upsertSelectOption("employee.position", body.position)
    : undefined;
  const employmentTypeOptionId = has("employmentType")
    ? await upsertSelectOption("employee.employmentType", body.employmentType)
    : undefined;
  const employmentStatusOptionId = has("employmentStatus")
    ? await upsertSelectOption("employee.employmentStatus", body.employmentStatus)
    : undefined;

  const data: Record<string, unknown> = {};
  if (has("function")) {
    data.functionOptionId = functionOptionId ?? null;
  }
  if (has("departmentLevel1")) {
    data.departmentLevel1OptionId = departmentLevel1OptionId ?? null;
  }
  if (has("departmentLevel2")) {
    data.departmentLevel2OptionId = departmentLevel2OptionId ?? null;
  }
  if (has("position")) {
    data.positionOptionId = positionOptionId ?? null;
  }
  if (has("employmentType")) {
    data.employmentTypeOptionId = employmentTypeOptionId ?? null;
  }
  if (has("employmentStatus")) {
    data.employmentStatusOptionId = employmentStatusOptionId ?? null;
  }

  const employee = await prisma.employee.update({
    where: { id },
    data,
    select: {
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
      ownedProjects: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          typeOption: {
            select: { id: true, value: true, color: true },
          },
          statusOption: {
            select: { id: true, value: true, color: true },
          },
          stageOption: {
            select: { id: true, value: true, color: true },
          },
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          typeOption: {
            select: { id: true, value: true, color: true },
          },
          statusOption: {
            select: { id: true, value: true, color: true },
          },
          stageOption: {
            select: { id: true, value: true, color: true },
          },
        },
      },
      leaveRecords: {
        select: {
          id: true,
          typeOption: {
            select: { id: true, value: true, color: true },
          },
          startAt: true,
          endAt: true,
          datePrecision: true,
        },
      },
      actualWorkEntries: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return Response.json(serializeEmployee(employee));
}
