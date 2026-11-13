import type { Prisma } from "@prisma/client";

const personSelect = { id: true, name: true } as const;
const optionSelect = { id: true, value: true, color: true } as const;

export const workItemInclude = {
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
  submissions: {
    select: {
      id: true,
      versionNumber: true,
      versionTitle: true,
      contentText: true,
      isFinal: true,
      submittedBy: { select: personSelect },
      submittedAt: true,
      updatedAt: true,
      resources: {
        select: {
          id: true,
          kind: true,
          url: true,
          name: true,
          mimeType: true,
          thumbnailUrl: true,
          sortOrder: true,
          uploadedBy: { select: personSelect },
          updatedAt: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      feedback: {
        select: {
          id: true,
          content: true,
          recordedBy: { select: personSelect },
          recordedAt: true,
          updatedAt: true,
          images: {
            select: { id: true, url: true, name: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
          },
          adjustmentItems: {
            select: {
              id: true,
              title: true,
              content: true,
              sortOrder: true,
              images: {
                select: { id: true, url: true, name: true, sortOrder: true },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      adjustmentChecks: {
        select: {
          id: true,
          adjustmentItemId: true,
          checkedBy: { select: personSelect },
          checkedAt: true,
        },
      },
    },
    orderBy: { versionNumber: "desc" },
  },
} satisfies Prisma.WorkItemInclude;

export const briefInclude = {
  project: {
    select: { id: true, name: true, client: { select: personSelect } },
  },
  owner: { select: personSelect },
  creator: { select: personSelect },
  workItems: {
    include: workItemInclude,
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BriefInclude;
