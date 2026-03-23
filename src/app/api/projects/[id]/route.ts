import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import type { NullableSelectOptionValue } from "@/types/selectOption";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ownerPublicSelect = {
  id: true,
  name: true,
  functionOption: {
    select: {
      value: true,
      color: true,
    },
  },
  employmentStatusOption: {
    select: {
      value: true,
      color: true,
    },
  },
} as const;

const toProjectTypeCode = (value?: string | null) => {
  if (!value) return null;
  if (value === "客户项目") return "CLIENT";
  if (value === "内部项目") return "INTERNAL";
  return value;
};

const parseSelectOptionInput = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      value: normalized || null,
      color: null as string | null,
    };
  }
  if (value && typeof value === "object") {
    const candidateValue =
      "value" in value && typeof value.value === "string"
        ? value.value.trim()
        : "";
    const candidateColor =
      "color" in value && typeof value.color === "string"
        ? value.color.trim()
        : "";
    return {
      value: candidateValue || null,
      color: candidateColor || null,
    };
  }
  return {
    value: null as string | null,
    color: null as string | null,
  };
};

const upsertSelectOption = async (field: string, value: unknown) => {
  const parsed = parseSelectOptionInput(value);
  const normalized = parsed.value ?? "";
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
      color: parsed.color ?? DEFAULT_COLOR,
    },
    update: {},
  });

  return option.id;
};

type EmployeePayload = {
  functionOption?: NullableSelectOptionValue;
  employmentStatusOption?: NullableSelectOptionValue;
} & Record<string, unknown>;
type ProjectTaskPayload = {
  statusOption?: NullableSelectOptionValue;
  owner?: EmployeePayload | null;
  plannedWorkEntries?: Array<
    Record<string, unknown> & {
      yearOption?: NullableSelectOptionValue;
      weekNumberOption?: NullableSelectOptionValue;
    }
  >;
} & Record<string, unknown>;
type ProjectSegmentPayload = {
  statusOption?: NullableSelectOptionValue;
  projectTasks?: ProjectTaskPayload[];
} & Record<string, unknown>;
type ProjectMilestonePayload = {
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  datePrecision?: string | null;
  date?: string | null;
  typeOption?: NullableSelectOptionValue;
  methodOption?: NullableSelectOptionValue;
  internalParticipants?: EmployeePayload[];
} & Record<string, unknown>;
type ProjectDocumentPayload = {
  typeOption?: NullableSelectOptionValue;
} & Record<string, unknown>;
type ProjectCostEstimationMemberPayload = {
  id: string;
  estimationId: string;
  employeeId: string;
  allocationPercent: number;
  laborCostSnapshot: number;
  rentCostSnapshot: number;
  employee?: EmployeePayload | null;
} & Record<string, unknown>;
type ProjectCostEstimationPayload = {
  id: string;
  projectId: string;
  owner?: EmployeePayload | null;
  version: number;
  type: "planning" | "baseline";
  estimatedDuration: number;
  clientBudget?: string | null;
  contractAmountSnapshot?: number | null;
  totalLaborCost: number;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
  otherExecutionCostRemark?: string | null;
  executionCostTypes?: NullableSelectOptionValue[];
  members?: ProjectCostEstimationMemberPayload[];
} & Record<string, unknown>;
type ProjectPayload = {
  typeOption?: NullableSelectOptionValue;
  statusOption?: NullableSelectOptionValue;
  stageOption?: NullableSelectOptionValue;
  owner?: EmployeePayload | null;
  members?: EmployeePayload[];
  milestones?: ProjectMilestonePayload[];
  segments?: ProjectSegmentPayload[];
  documents?: ProjectDocumentPayload[];
  costEstimations?: ProjectCostEstimationPayload[];
  baselineCostEstimations?: ProjectCostEstimationPayload[];
  planningCostEstimations?: ProjectCostEstimationPayload[];
} & Record<string, unknown>;

const projectCostEstimationSelect = {
  id: true,
  projectId: true,
  owner: {
    select: ownerPublicSelect,
  },
  version: true,
  type: true,
  estimatedDuration: true,
  clientBudget: true,
  contractAmountSnapshot: true,
  totalLaborCost: true,
  agencyFeeRate: true,
  outsourceRemark: true,
  outsourceItems: {
    select: {
      id: true,
      type: true,
      amount: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  otherExecutionCostRemark: true,
  createdAt: true,
  updatedAt: true,
  executionCostTypes: {
    select: {
      id: true,
      value: true,
      color: true,
    },
  },
  members: {
    select: {
      id: true,
      estimationId: true,
      employeeId: true,
      allocationPercent: true,
      laborCostSnapshot: true,
      rentCostSnapshot: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: ownerPublicSelect,
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const serializeEmployee = (employee: EmployeePayload) => ({
  ...employee,
  function: employee.functionOption?.value ?? null,
  employmentStatus: employee.employmentStatusOption?.value ?? null,
});

const serializeProject = (project: ProjectPayload) => ({
  ...project,
  type: toProjectTypeCode(project.typeOption?.value),
  status: project.statusOption?.value ?? null,
  stage: project.stageOption?.value ?? null,
  owner: project.owner ? serializeEmployee(project.owner) : null,
  members: Array.isArray(project.members)
    ? project.members.map((member) => serializeEmployee(member))
    : [],
  milestones: Array.isArray(project.milestones)
    ? project.milestones.map((milestone) => ({
        ...milestone,
        date: milestone.startAt ?? null,
        type: milestone.typeOption?.value ?? null,
        method: milestone.methodOption?.value ?? null,
        internalParticipants: Array.isArray(milestone.internalParticipants)
          ? milestone.internalParticipants.map((participant) =>
              serializeEmployee(participant),
            )
          : [],
      }))
    : [],
      segments: Array.isArray(project.segments)
        ? project.segments.map((segment) => ({
            ...segment,
            status: segment.statusOption?.value ?? null,
            dueDate: segment.endDate ?? null,
            projectTasks: Array.isArray(segment.projectTasks)
              ? segment.projectTasks.map((task) => ({
              ...task,
              status: task.statusOption?.value ?? null,
              owner: task.owner ? serializeEmployee(task.owner) : null,
              plannedWorkEntries: Array.isArray(task.plannedWorkEntries)
                ? task.plannedWorkEntries.map((entry) => {
                    const year = Number(entry.yearOption?.value);
                    const weekNumber = Number(entry.weekNumberOption?.value);
                    return {
                      ...entry,
                      year: Number.isFinite(year) ? year : null,
                      weekNumber: Number.isFinite(weekNumber)
                        ? weekNumber
                        : null,
                    };
                  })
                : [],
            }))
          : [],
      }))
    : [],
  documents: Array.isArray(project.documents)
    ? project.documents.map((document) => ({
        ...document,
      }))
    : [],
  latestCostEstimation: Array.isArray(project.costEstimations)
    ? (project.costEstimations[0]
      ? {
          ...project.costEstimations[0],
          outsourceCost: getProjectOutsourceTotal(
            project.costEstimations[0].outsourceItems,
          ),
          owner: project.costEstimations[0].owner
            ? serializeEmployee(project.costEstimations[0].owner)
            : null,
          executionCostTypes: Array.isArray(
            project.costEstimations[0].executionCostTypes,
          )
            ? project.costEstimations[0].executionCostTypes
            : [],
          members: Array.isArray(project.costEstimations[0].members)
            ? project.costEstimations[0].members.map((member) => ({
                ...member,
                employee: member.employee
                  ? serializeEmployee(member.employee)
                  : null,
              }))
            : [],
        }
      : null)
    : null,
  latestBaselineCostEstimation: Array.isArray(project.baselineCostEstimations)
    ? (project.baselineCostEstimations[0]
      ? {
          ...project.baselineCostEstimations[0],
          outsourceCost: getProjectOutsourceTotal(
            project.baselineCostEstimations[0].outsourceItems,
          ),
          owner: project.baselineCostEstimations[0].owner
            ? serializeEmployee(project.baselineCostEstimations[0].owner)
            : null,
          executionCostTypes: Array.isArray(
            project.baselineCostEstimations[0].executionCostTypes,
          )
            ? project.baselineCostEstimations[0].executionCostTypes
            : [],
          members: Array.isArray(project.baselineCostEstimations[0].members)
            ? project.baselineCostEstimations[0].members.map((member) => ({
                ...member,
                employee: member.employee
                  ? serializeEmployee(member.employee)
                  : null,
              }))
            : [],
        }
      : null)
    : null,
  latestPlanningCostEstimation: Array.isArray(project.planningCostEstimations)
    ? (project.planningCostEstimations[0]
      ? {
          ...project.planningCostEstimations[0],
          outsourceCost: getProjectOutsourceTotal(
            project.planningCostEstimations[0].outsourceItems,
          ),
          owner: project.planningCostEstimations[0].owner
            ? serializeEmployee(project.planningCostEstimations[0].owner)
            : null,
          executionCostTypes: Array.isArray(
            project.planningCostEstimations[0].executionCostTypes,
          )
            ? project.planningCostEstimations[0].executionCostTypes
            : [],
          members: Array.isArray(project.planningCostEstimations[0].members)
            ? project.planningCostEstimations[0].members.map((member) => ({
                ...member,
                employee: member.employee
                  ? serializeEmployee(member.employee)
                  : null,
              }))
            : [],
        }
      : null)
    : null,
});

export async function GET(req: Request) {
  const { pathname } = new URL(req.url);
  const id = pathname.split("/").pop();

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
      vendors: {
        select: {
          id: true,
          name: true,
        },
      },
      members: {
        select: {
          id: true,
          name: true,
          salary: true,
          socialSecurity: true,
          providentFund: true,
          workstationCost: true,
          utilityCost: true,
          functionOption: {
            select: {
              value: true,
              color: true,
            },
          },
          employmentStatusOption: {
            select: {
              value: true,
              color: true,
            },
          },
        },
      },
      milestones: {
        select: {
          id: true,
          name: true,
          typeOption: {
            select: {
              id: true,
              value: true,
              color: true,
            },
          },
          startAt: true,
          endAt: true,
          datePrecision: true,
          location: true,
          methodOption: {
            select: {
              value: true,
              color: true,
            },
          },
          internalParticipants: {
            select: {
              id: true,
              name: true,
              functionOption: {
                select: {
                  value: true,
                  color: true,
                },
              },
              employmentStatusOption: {
                select: {
                  value: true,
                  color: true,
                },
              },
            },
          },
          vendorParticipants: {
            select: {
              id: true,
              name: true,
              contactName: true,
            },
          },
          clientParticipants: {
            select: {
              id: true,
              name: true,
              title: true,
            },
          },
        },
        orderBy: { startAt: "asc" },
      },
      segments: {
        select: {
          id: true,
          name: true,
          statusOption: {
            select: {
              id: true,
              value: true,
              color: true,
            },
          },
          startDate: true,
          endDate: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          projectTasks: {
            select: {
              id: true,
              name: true,
              statusOption: {
                select: {
                  id: true,
                  value: true,
                  color: true,
                },
              },
              segmentId: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  functionOption: {
                    select: {
                      value: true,
                      color: true,
                    },
                  },
                  employmentStatusOption: {
                    select: {
                      value: true,
                      color: true,
                    },
                  },
                },
              },
              dueDate: true,
              plannedWorkEntries: {
                select: {
                  id: true,
                  yearOption: {
                    select: {
                      value: true,
                    },
                  },
                  weekNumberOption: {
                    select: {
                      value: true,
                    },
                  },
                  plannedDays: true,
                  monday: true,
                  tuesday: true,
                  wednesday: true,
                  thursday: true,
                  friday: true,
                  saturday: true,
                  sunday: true,
                },
              },
            },
          },
        },
      },
      actualWorkEntries: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          employee: {
            select: {
              id: true,
              name: true,
              salary: true,
              socialSecurity: true,
              providentFund: true,
              workstationCost: true,
              utilityCost: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      },
      documents: {
        select: {
          id: true,
          name: true,
          typeOption: {
            select: {
              value: true,
              color: true,
            },
          },
          date: true,
          isFinal: true,
          internalLink: true,
        },
        orderBy: { date: "desc" },
      },
      costEstimations: {
        select: projectCostEstimationSelect,
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  const [baselineCostEstimations, planningCostEstimations] = await Promise.all([
    prisma.projectCostEstimation.findMany({
      where: { projectId: id, type: "baseline" },
      select: projectCostEstimationSelect,
      orderBy: { version: "desc" },
      take: 1,
    }),
    prisma.projectCostEstimation.findMany({
      where: { projectId: id, type: "planning" },
      select: projectCostEstimationSelect,
      orderBy: { version: "desc" },
      take: 1,
    }),
  ]);

  return Response.json(
    serializeProject({
      ...(project as Record<string, unknown>),
      baselineCostEstimations,
      planningCostEstimations,
    } as ProjectPayload),
  );
}

export async function PATCH(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;

  const { pathname } = new URL(req.url);
  const id = pathname.split("/").pop();

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const body = await req.json();
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const [typeOptionId, statusOptionId, stageOptionId] = await Promise.all([
    has("type")
      ? upsertSelectOption("project.type", body.type ?? null)
      : Promise.resolve(undefined),
    has("status")
      ? upsertSelectOption("project.status", body.status ?? null)
      : Promise.resolve(undefined),
    has("stage")
      ? upsertSelectOption("project.stage", body.stage ?? null)
      : Promise.resolve(undefined),
  ]);

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(has("type") ? { typeOptionId: typeOptionId ?? null } : {}),
      ...(has("status") ? { statusOptionId: statusOptionId ?? null } : {}),
      ...(has("stage") ? { stageOptionId: stageOptionId ?? null } : {}),
    },
    include: {
      client: true,
      typeOption: true,
      statusOption: true,
      stageOption: true,
      owner: {
        select: ownerPublicSelect,
      },
    },
  });

  return Response.json(serializeProject(project as ProjectPayload));
}
