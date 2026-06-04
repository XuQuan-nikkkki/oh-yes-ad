"use client";

import { Modal } from "antd";
import ProjectReceivableActivity from "@/components/project-detail/ProjectReceivableActivity";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import type { ProjectReceivableBadDebtRecordFormValues } from "@/components/project-detail/ProjectReceivableBadDebtRecordModal";
import type { ProjectReceivableNodeFormValues } from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActivityRow } from "@/components/project-detail/project-receivable-activity/types";

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  open: boolean;
  rows: ProjectReceivableActivityRow[];
  stageOptions: StageOption[];
  initialSelectedStageOptionIds?: string[];
  onCancel: () => void;
  canManageProject: boolean;
  canManageBadDebtRecords?: boolean;
  onEditNode?: (
    row: ProjectReceivableActivityRow,
    values: ProjectReceivableNodeFormValues,
  ) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => Promise<void> | void;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectReceivableActualNodeFormValues,
  ) => Promise<void> | void;
  onDeleteActualNode?: (actualNodeId: string) => Promise<void> | void;
  onEditBadDebtRecord?: (
    badDebtRecordId: string,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => Promise<void> | void;
  onDeleteBadDebtRecord?: (badDebtRecordId: string) => Promise<void> | void;
  onHistoryChanged?: () => Promise<void> | void;
};

export default function ProjectReceivableActivityModal({
  open,
  rows,
  stageOptions,
  initialSelectedStageOptionIds,
  onCancel,
  canManageProject,
  canManageBadDebtRecords = false,
  onEditNode,
  onDeleteNode,
  onEditActualNode,
  onDeleteActualNode,
  onEditBadDebtRecord,
  onDeleteBadDebtRecord,
  onHistoryChanged,
}: Props) {
  return (
    <Modal
      title="收款动态"
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
      <ProjectReceivableActivity
        rows={rows}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        initialSelectedStageOptionIds={initialSelectedStageOptionIds}
        initialSelectedEventFilters={[]}
        canManageProject={canManageProject}
        canManageBadDebtRecords={canManageBadDebtRecords}
        onEditNode={onEditNode}
        onDeleteNode={onDeleteNode}
        onEditActualNode={onEditActualNode}
        onDeleteActualNode={onDeleteActualNode}
        onEditBadDebtRecord={onEditBadDebtRecord}
        onDeleteBadDebtRecord={onDeleteBadDebtRecord}
        onHistoryChanged={onHistoryChanged}
      />
    </Modal>
  );
}
