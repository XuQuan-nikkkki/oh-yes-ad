"use client";

import type { ComponentProps } from "react";
import ProjectProgressNestedTable, {
  type ProjectProgressSegmentRow,
} from "@/components/project-detail/ProjectProgressNestedTable";

type NestedTableProps = ComponentProps<typeof ProjectProgressNestedTable>;

type Props = {
  projectId: string;
  data: ProjectProgressSegmentRow[];
  segmentCount: number;
  taskCount: number;
  pageSize?: number;
  actionsDisabled?: boolean;
  onAddTask?: NestedTableProps["onAddTask"];
  onEditSegment?: NestedTableProps["onEditSegment"];
  onAfterDeleteSegment?: () => Promise<void> | void;
  onAddPlannedWork?: NestedTableProps["onAddPlannedWork"];
  onEditTask?: NestedTableProps["onEditTask"];
  onAfterDeleteTask?: () => Promise<void> | void;
  onEditPlannedWork?: NestedTableProps["onEditPlannedWork"];
  onAfterDeletePlannedWork?: () => Promise<void> | void;
};

const ProjectDetailProgressContent = ({
  projectId,
  data,
  segmentCount,
  taskCount,
  pageSize = 8,
  actionsDisabled = false,
  onAddTask,
  onEditSegment,
  onAfterDeleteSegment,
  onAddPlannedWork,
  onEditTask,
  onAfterDeleteTask,
  onEditPlannedWork,
  onAfterDeletePlannedWork,
}: Props) => {
  return (
    <ProjectProgressNestedTable
      data={data}
      segmentHeaderTitle={`项目环节（${segmentCount}）/任务（${taskCount}）`}
      pageSize={pageSize}
      actionsDisabled={actionsDisabled}
      onAddTask={onAddTask}
      onEditSegment={onEditSegment}
      onDeleteSegment={async (segment) => {
        if (actionsDisabled) return;
        await fetch(`/api/projects/${projectId}/segments/${segment.id}`, {
          method: "DELETE",
        });
        await onAfterDeleteSegment?.();
      }}
      onAddPlannedWork={onAddPlannedWork}
      onEditTask={onEditTask}
      onDeleteTask={async (task) => {
        if (actionsDisabled) return;
        await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
          method: "DELETE",
        });
        await onAfterDeleteTask?.();
      }}
      onEditPlannedWork={onEditPlannedWork}
      onDeletePlannedWork={async (entry) => {
        if (actionsDisabled) return;
        await fetch(`/api/projects/${projectId}/planned-work-entries/${entry.id}`, {
          method: "DELETE",
        });
        await onAfterDeletePlannedWork?.();
      }}
    />
  );
};

export default ProjectDetailProgressContent;
