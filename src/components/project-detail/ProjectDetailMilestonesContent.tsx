"use client";

import { useMemo } from "react";
import type { Project } from "@/types/projectDetail";
import ProjectMilestoneSection from "@/components/project-detail/ProjectMilestoneSection";

type Props = {
  milestones?: Project["milestones"];
};

const ProjectDetailMilestonesContent = ({ milestones = [] }: Props) => {
  const cardRows = useMemo(
    () =>
      (milestones ?? []).map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        type: milestone.type ?? null,
        typeOption: milestone.typeOption ?? null,
        date: milestone.date ?? milestone.startAt ?? milestone.endAt ?? null,
        detail: milestone.detail ?? null,
        clientParticipants: milestone.clientParticipants ?? [],
        internalParticipants: milestone.internalParticipants ?? [],
        vendorParticipants: milestone.vendorParticipants ?? [],
      })),
    [milestones],
  );

  return (
    <ProjectMilestoneSection
      milestones={cardRows}
      withContainerCard={false}
      showAddButton={false}
      filterTodayAndFuture={false}
      layout="grid"
    />
  );
};

export default ProjectDetailMilestonesContent;
