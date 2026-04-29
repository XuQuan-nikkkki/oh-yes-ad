import { prisma } from "@/lib/prisma";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { DEFAULT_COLOR } from "@/lib/constants";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import { computeInitiationEstimatedAgencyFee } from "@/lib/prisma/project-initiation";
import type { NullableSelectOptionValue } from "@/types/selectOption";

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

const employeeCostSelect = {
  id: true,
  name: true,
  salary: true,
  socialSecurity: true,
  providentFund: true,
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
  estimationId?: string;
  costEstimationId?: string;
  initiationId?: string;
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
  type?: "planning" | "baseline";
  estimatedDuration: number;
  clientBudget?: string | null;
  contractAmount?: number | null;
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
  initiations?: ProjectCostEstimationPayload[];
} & Record<string, unknown>;

const projectCostEstimationSelect = {
  id: true,
  projectId: true,
  owner: {
    select: ownerPublicSelect,
  },
  version: true,
  estimatedDuration: true,
  clientBudget: true,
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
      costEstimationId: true,
      employeeId: true,
      allocationPercent: true,
      laborCostSnapshot: true,
      rentCostSnapshot: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: employeeCostSelect,
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const projectInitiationSelect = {
  id: true,
  projectId: true,
  owner: {
    select: ownerPublicSelect,
  },
  version: true,
  estimatedDuration: true,
  contractAmount: true,
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
      initiationId: true,
      employeeId: true,
      allocationPercent: true,
      laborCostSnapshot: true,
      rentCostSnapshot: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: employeeCostSelect,
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

const parseBudgetToNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeEstimatedAgencyFee = (estimation?: {
  agencyFeeRate?: unknown;
  clientBudget?: unknown;
} | null) => {
  if (!estimation) return null;
  const rate = Number(estimation.agencyFeeRate ?? 0);
  const budget = parseBudgetToNumber(estimation.clientBudget);
  if (!Number.isFinite(rate) || budget === null) return null;
  if (rate <= 0 || budget <= 0) return null;
  return (rate / 100) * budget;
};

const serializePlanningCostEstimation = (
  estimation: ProjectCostEstimationPayload,
) => ({
  ...estimation,
  type: "planning" as const,
  estimatedAgencyFee: computeEstimatedAgencyFee(estimation),
  outsourceCost: getProjectOutsourceTotal(estimation.outsourceItems),
  owner: estimation.owner ? serializeEmployee(estimation.owner) : null,
  executionCostTypes: Array.isArray(estimation.executionCostTypes)
    ? estimation.executionCostTypes
    : [],
  members: Array.isArray(estimation.members)
    ? estimation.members.map((member) => ({
        ...member,
        estimationId:
          "costEstimationId" in member ? member.costEstimationId : undefined,
        employee: member.employee ? serializeEmployee(member.employee) : null,
      }))
    : [],
});

const serializeInitiation = (initiation: ProjectCostEstimationPayload) => ({
  ...initiation,
  type: "baseline" as const,
  estimatedAgencyFee: computeInitiationEstimatedAgencyFee(initiation),
  outsourceCost: getProjectOutsourceTotal(initiation.outsourceItems),
  owner: initiation.owner ? serializeEmployee(initiation.owner) : null,
  executionCostTypes: Array.isArray(initiation.executionCostTypes)
    ? initiation.executionCostTypes
    : [],
  members: Array.isArray(initiation.members)
    ? initiation.members.map((member) => ({
        ...member,
        estimationId: "initiationId" in member ? member.initiationId : undefined,
        employee: member.employee ? serializeEmployee(member.employee) : null,
      }))
    : [],
});

const serializeProject = (project: ProjectPayload) => {
  const { costEstimations, initiations, ...baseProject } = project;

  return {
    ...baseProject,
    type: toProjectTypeCode(baseProject.typeOption?.value),
    status: baseProject.statusOption?.value ?? null,
    stage: baseProject.stageOption?.value ?? null,
    owner: baseProject.owner ? serializeEmployee(baseProject.owner) : null,
    members: Array.isArray(baseProject.members)
      ? baseProject.members.map((member) => serializeEmployee(member))
      : [],
    milestones: Array.isArray(baseProject.milestones)
      ? baseProject.milestones.map((milestone) => ({
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
    segments: Array.isArray(baseProject.segments)
      ? baseProject.segments.map((segment) => ({
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
    documents: Array.isArray(baseProject.documents)
      ? baseProject.documents.map((document) => ({
          ...document,
        }))
      : [],
    latestCostEstimation: Array.isArray(costEstimations)
      ? costEstimations[0]
        ? serializePlanningCostEstimation(costEstimations[0])
        : null
      : null,
    latestInitiation: Array.isArray(initiations)
      ? initiations[0]
        ? serializeInitiation(initiations[0])
        : null
      : null,
    initiations: Array.isArray(initiations)
      ? initiations.map((item) => serializeInitiation(item))
      : [],
  };
};

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
          detail: true,
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
              functionOption: {
                select: {
                  value: true,
                  color: true,
                },
              },
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
      initiations: {
        select: projectInitiationSelect,
        orderBy: { version: "desc" },
      },
    },
  });

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(serializeProject(project as ProjectPayload));
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
