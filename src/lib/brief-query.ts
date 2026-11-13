import type { Prisma } from "@prisma/client";

const personSelect = { id: true, name: true } as const;
const optionSelect = { id: true, value: true, color: true } as const;

export const deliverableInclude = {
  reviewer: { select: personSelect },
  assignee: { select: personSelect },
  creator: { select: personSelect },
  formatOptions: { select: { option: { select: optionSelect } } },
  categoryOrSceneOptions: { select: { option: { select: optionSelect } } },
  assignmentChanges: {
    select: {
      id: true,
      fromAssignee: { select: personSelect },
      toAssignee: { select: personSelect },
      changedBy: { select: personSelect },
      remarks: true,
      changedAt: true,
    },
    orderBy: { changedAt: "asc" },
  },
  plannedWorkEntries: {
    select: {
      id: true,
      yearOption: { select: optionSelect },
      weekNumberOption: { select: optionSelect },
      plannedDays: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.DeliverableInclude;

export const briefInclude = {
  project: {
    select: { id: true, name: true, client: { select: personSelect } },
  },
  owner: { select: personSelect },
  creator: { select: personSelect },
  deliverables: {
    include: deliverableInclude,
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BriefInclude;
