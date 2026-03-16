import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

const serializeEmployee = (employee: EmployeePayload) => ({
  ...employee,
  function: employee.functionOption?.value ?? null,
  position: employee.positionOption?.value ?? employee.position ?? null,
  departmentLevel1: employee.departmentLevel1Option?.value ?? null,
  departmentLevel2: employee.departmentLevel2Option?.value ?? null,
  employmentType: employee.employmentTypeOption?.value ?? null,
  employmentStatus: employee.employmentStatusOption?.value ?? null,
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

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
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
  });

  if (!employee) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(serializeEmployee(employee));
}
