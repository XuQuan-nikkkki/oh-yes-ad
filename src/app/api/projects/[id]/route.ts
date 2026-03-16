import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

type SelectOptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null | undefined;
type EmployeePayload = {
  functionOption?: SelectOptionValue;
  employmentStatusOption?: SelectOptionValue;
} & Record<string, unknown>;
type ProjectTaskPayload = {
  owner?: EmployeePayload | null;
  plannedWorkEntries?: Array<
    Record<string, unknown> & {
      yearOption?: SelectOptionValue;
      weekNumberOption?: SelectOptionValue;
    }
  >;
} & Record<string, unknown>;
type ProjectSegmentPayload = {
  statusOption?: SelectOptionValue;
  projectTasks?: ProjectTaskPayload[];
} & Record<string, unknown>;
type ProjectMilestonePayload = {
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  datePrecision?: string | null;
  date?: string | null;
  typeOption?: SelectOptionValue;
  methodOption?: SelectOptionValue;
  internalParticipants?: EmployeePayload[];
} & Record<string, unknown>;
type ProjectDocumentPayload = {
  typeOption?: SelectOptionValue;
} & Record<string, unknown>;
type ProjectPayload = {
  typeOption?: SelectOptionValue;
  statusOption?: SelectOptionValue;
  stageOption?: SelectOptionValue;
  owner?: EmployeePayload | null;
  members?: EmployeePayload[];
  milestones?: ProjectMilestonePayload[];
  segments?: ProjectSegmentPayload[];
  documents?: ProjectDocumentPayload[];
} & Record<string, unknown>;

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
        projectTasks: Array.isArray(segment.projectTasks)
          ? segment.projectTasks.map((task) => ({
              ...task,
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
          dueDate: true,
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
            select: { id: true, name: true },
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
    },
  });

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(serializeProject(project));
}
