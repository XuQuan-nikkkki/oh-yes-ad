"use client";

import { Modal } from "antd";
import ProjectPayableActivity from "@/components/project-detail/ProjectPayableActivity";
import type { ProjectPayableActualNodeFormValues } from "@/components/project-detail/ProjectPayableActualNodeModal";
import type { ProjectPayableAdjustmentRecordFormValues } from "@/components/project-detail/ProjectPayableAdjustmentRecordModal";
import type { ProjectPayableNodeRow } from "@/components/project-detail/ProjectPayableNodeTable";
import type { ProjectPayableNodeFormValues } from "@/components/project-detail/ProjectPayableNodeModal";
import type { ProjectPayableActivityRow } from "@/components/project-detail/project-payable-activity/types";

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  open: boolean;
  rows: ProjectPayableActivityRow[];
  stageOptions: StageOption[];
  initialSelectedStageOptionIds?: string[];
  onCancel: () => void;
  canManageProject: boolean;
  onEditNode?: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableNodeFormValues,
  ) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => Promise<void> | void;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectPayableActualNodeFormValues,
  ) => Promise<void> | void;
  onDeleteActualNode?: (actualNodeId: string) => Promise<void> | void;
  onEditAdjustmentRecord?: (
    adjustmentRecordId: string,
    values: ProjectPayableAdjustmentRecordFormValues,
  ) => Promise<void> | void;
  onDeleteAdjustmentRecord?: (adjustmentRecordId: string) => Promise<void> | void;
};

export default function ProjectPayableActivityModal({
  open,
  rows,
  stageOptions,
  initialSelectedStageOptionIds,
  onCancel,
  canManageProject,
  onEditNode,
  onDeleteNode,
  onEditActualNode,
  onDeleteActualNode,
  onEditAdjustmentRecord,
  onDeleteAdjustmentRecord,
}: Props) {
  return (
    <Modal
      title="付款动态"
      open={open}
      width="90vw"
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
      styles={{
        body: {
          padding: 0,
          maxHeight: "calc(80vh - 55px)",
          overflowY: "auto",
        },
      }}
    >
      <ProjectPayableActivity
        rows={rows}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        initialSelectedStageOptionIds={initialSelectedStageOptionIds}
        canManageProject={canManageProject}
        onEditNode={onEditNode}
        onDeleteNode={onDeleteNode}
        onEditActualNode={onEditActualNode}
        onDeleteActualNode={onDeleteActualNode}
        onEditAdjustmentRecord={onEditAdjustmentRecord}
        onDeleteAdjustmentRecord={onDeleteAdjustmentRecord}
      />
    </Modal>
  );
}
