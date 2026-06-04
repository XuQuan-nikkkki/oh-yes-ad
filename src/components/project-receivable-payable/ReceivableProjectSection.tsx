"use client";

import { useState } from "react";
import { Card, Empty, Progress, Tag, Tooltip } from "antd";
import ProjectReceivableActivityModal from "@/components/project-detail/ProjectReceivableActivityModal";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectReceivableNodeTable, {
  type ProjectReceivableNodeRow,
  type ReceivableNodeDelayFormValues,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import type { ProjectReceivableBadDebtRecordFormValues } from "@/components/project-detail/ProjectReceivableBadDebtRecordModal";
import AppLink from "../AppLink";

type ReceivableProjectSectionProps = {
  projectId: string;
  projectName: string;
  signingCompanyName?: string | null;
  contractAmountTotal?: number;
  ownerName?: string | null;
  projectStatusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  onProjectStatusUpdated?: () => Promise<void> | void;
  primaryPlanId?: string | null;
  rows: ProjectReceivableNodeRow[];
  stageOptions: Array<{
    id: string;
    value: string;
    color?: string | null;
  }>;
  canManageProject?: boolean;
  canManageProjectStatus?: boolean;
  onCreateNode: (
    planId: string,
    values: ProjectReceivableNodeFormValues,
  ) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onEditNode: (
    row: ProjectReceivableNodeRow,
    values: ProjectReceivableNodeFormValues,
  ) => Promise<void>;
  onDragSortNodes: (
    nextRows: ProjectReceivableNodeRow[],
  ) => void | Promise<void>;
  onCollectNode?: (
    row: ProjectReceivableNodeRow,
    values: ProjectReceivableActualNodeFormValues,
  ) => void | Promise<void>;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectReceivableActualNodeFormValues,
  ) => void | Promise<void>;
  onDeleteActualNode?: (actualNodeId: string) => void | Promise<void>;
  canManageBadDebtRecords?: boolean;
  onCreateBadDebtRecord?: (
    row: ProjectReceivableNodeRow,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => void | Promise<void>;
  onEditBadDebtRecord?: (
    badDebtRecordId: string,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => void | Promise<void>;
  onDeleteBadDebtRecord?: (
    badDebtRecordId: string,
  ) => void | Promise<void>;
  onDelayNode?: (
    row: ProjectReceivableNodeRow,
    values: ReceivableNodeDelayFormValues,
  ) => void | Promise<void>;
  onHistoryChanged?: () => void | Promise<void>;
};

export default function ReceivableProjectSection({
  projectId,
  projectName,
  signingCompanyName,
  contractAmountTotal = 0,
  ownerName,
  projectStatusOption,
  onProjectStatusUpdated,
  primaryPlanId,
  rows,
  stageOptions,
  canManageProject = true,
  canManageProjectStatus = canManageProject,
  onCreateNode,
  onDeleteNode,
  onEditNode,
  onDragSortNodes,
  onCollectNode,
  onEditActualNode,
  onDeleteActualNode,
  canManageBadDebtRecords = false,
  onCreateBadDebtRecord,
  onEditBadDebtRecord,
  onDeleteBadDebtRecord,
  onDelayNode,
  onHistoryChanged,
}: ReceivableProjectSectionProps) {
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityTargetStageOptionIds, setActivityTargetStageOptionIds] =
    useState<string[]>([]);
  const formatAmount = (value: number) => `${value.toLocaleString("zh-CN")} 元`;
  const expectedAmountTotal = rows.reduce(
    (sum, row) => sum + Number(row.expectedAmountTaxIncluded ?? 0),
    0,
  );
  const receivableAmountTotal = rows.reduce(
    (sum, row) =>
      sum +
      Number(row.receivableAmountTaxIncluded ?? row.expectedAmountTaxIncluded ?? 0),
    0,
  );
  const badDebtWriteOffAmountTotal = rows.reduce(
    (sum, row) => sum + Number(row.badDebtWriteOffAmountTotal ?? 0),
    0,
  );
  const badDebtRecoveryAmountTotal = rows.reduce(
    (sum, row) => sum + Number(row.badDebtRecoveryAmountTotal ?? 0),
    0,
  );
  const actualAmountTotal = rows.reduce(
    (sum, row) => sum + Number(row.actualAmountTotal ?? 0),
    0,
  );
  const progressPercent =
    expectedAmountTotal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((actualAmountTotal / expectedAmountTotal) * 100),
          ),
        )
      : 0;
  const hasReceivableAmount = expectedAmountTotal > 0;
  const expectedContractDiff =
    receivableAmountTotal - Number(contractAmountTotal ?? 0);
  const hasExpectedContractDiff =
    Math.round(expectedContractDiff * 100) !== 0;
  const hasBadDebtWriteOff = Math.round(badDebtWriteOffAmountTotal * 100) > 0;
  const hasBadDebtRecovery = Math.round(badDebtRecoveryAmountTotal * 100) > 0;
  const isDiffIncrease = Math.round(expectedContractDiff * 100) > 0;
  const isFullyCollected =
    hasReceivableAmount && actualAmountTotal >= expectedAmountTotal;
  const leftBorderColor = !hasReceivableAmount
    ? "var(--ant-colorTextQuaternary, #bfbfbf)"
    : isFullyCollected
      ? "var(--ant-colorSuccess, #52c41a)"
      : "var(--ant-colorPrimary, #1677ff)";
  const periodCount = rows.length;

  return (
    <Card
      type="inner"
      title={
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 14,
          }}
        >
          <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
            {signingCompanyName || "未设置签约公司"}
          </span>
          <span style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
          <AppLink
            href={`/projects/${projectId}`}
            style={{ color: "rgba(0,0,0,0.88)", fontWeight: 700, fontSize: 16 }}
          >
            {projectName || "-"}
          </AppLink>
          <SelectOptionQuickEditTag
            field="project.status"
            disabled={!canManageProjectStatus}
            option={
              projectStatusOption?.value
                ? {
                    id: projectStatusOption.id ?? "",
                    value: projectStatusOption.value,
                    color: projectStatusOption.color ?? null,
                  }
                : null
            }
            fallbackText="未设置"
            modalTitle="修改项目状态"
            saveSuccessText="项目状态已保存"
            onSaveSelection={async (nextOption) => {
              const response = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  status: nextOption.value,
                }),
              });
              if (!response.ok) {
                throw new Error((await response.text()) || "更新项目状态失败");
              }
            }}
            onUpdated={onProjectStatusUpdated}
          />
        </div>
      }
      extra={
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(0,0,0,0.65)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>
            合同：{Number(contractAmountTotal ?? 0).toLocaleString("zh-CN")} 元
          </span>
          {hasExpectedContractDiff ? (
            <>
              <Tooltip
                overlayInnerStyle={{ paddingRight: 16 }}
                title={
                  <div style={{ whiteSpace: "nowrap" }}>
                    <div>合同金额：{formatAmount(Number(contractAmountTotal ?? 0))}</div>
                    <div>预收节点合计：{formatAmount(expectedAmountTotal)}</div>
                    {hasBadDebtWriteOff ? (
                      <div>坏账核销：{formatAmount(badDebtWriteOffAmountTotal)}</div>
                    ) : null}
                    {hasBadDebtRecovery ? (
                      <div>坏账收回：{formatAmount(badDebtRecoveryAmountTotal)}</div>
                    ) : null}
                    <div>
                      共计{isDiffIncrease ? "增加" : "减少"}：
                      {formatAmount(Math.abs(expectedContractDiff))}
                    </div>
                  </div>
                }
              >
                <Tag
                  color={expectedContractDiff > 0 ? "success" : "error"}
                  style={{ marginInlineStart: -2, marginInlineEnd: 0 }}
                >
                  {expectedContractDiff > 0 ? "↑" : "↓"}
                  {Math.abs(expectedContractDiff).toLocaleString("zh-CN")} 元
                </Tag>
              </Tooltip>
            </>
          ) : null}
          <span style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
          <span>跟进：{ownerName?.trim() || "-"}</span>
          <span style={{ color: "rgba(0,0,0,0.25)" }}>·</span>
          <span>{periodCount}期</span>
          <div
            style={{ width: 96, display: "inline-flex", alignItems: "center" }}
          >
            <Progress percent={progressPercent} showInfo={false} size="small" />
          </div>
          <span>{progressPercent}%</span>
        </div>
      }
      style={{
        marginBottom: 12,
        borderRadius: 8,
        overflow: "hidden",
        borderLeft: `4px solid ${leftBorderColor}`,
      }}
      styles={{ body: { padding: "0 0 6px" } }}
    >
      {rows.length > 0 ? (
        <ProjectReceivableNodeTable
          rows={rows}
          stageOptions={stageOptions}
          canManageProject={canManageProject}
          canManageBadDebtRecords={canManageBadDebtRecords}
          onAddNode={() => {
            if (!primaryPlanId) return;
            setNodeModalOpen(true);
          }}
          onDeleteNode={onDeleteNode}
          onEditNode={onEditNode}
          onDragSortNodes={onDragSortNodes}
          onCollectNode={onCollectNode}
          onEditActualNode={onEditActualNode}
          onDeleteActualNode={onDeleteActualNode}
          onCreateBadDebtRecord={onCreateBadDebtRecord}
          onEditBadDebtRecord={onEditBadDebtRecord}
          onDeleteBadDebtRecord={onDeleteBadDebtRecord}
          onDelayNode={onDelayNode}
          onHistoryChanged={onHistoryChanged}
          onViewDetails={(row) => {
            setActivityTargetStageOptionIds(
              row.stageOptionId ? [row.stageOptionId] : [],
            );
            setActivityModalOpen(true);
          }}
        />
      ) : (
        <div style={{ padding: 16 }}>
          <Empty description="暂无收款节点" />
        </div>
      )}
      <div style={{ display: "none" }}>{projectId}</div>
      <ProjectReceivableNodeModal
        open={nodeModalOpen}
        loading={creatingNode}
        onCancel={() => setNodeModalOpen(false)}
        onSubmit={async (values) => {
          if (!primaryPlanId) return;
          setCreatingNode(true);
          try {
            await onCreateNode(primaryPlanId, values);
            setNodeModalOpen(false);
          } finally {
            setCreatingNode(false);
          }
        }}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        initialValues={{
          remarkNeedsAttention: false,
        }}
      />
      <ProjectReceivableActivityModal
        open={activityModalOpen}
        rows={rows}
        stageOptions={stageOptions}
        initialSelectedStageOptionIds={activityTargetStageOptionIds}
        onCancel={() => {
          setActivityModalOpen(false);
          setActivityTargetStageOptionIds([]);
        }}
        canManageProject={canManageProject}
        canManageBadDebtRecords={canManageBadDebtRecords}
        onEditNode={async (row, values) => {
          await onEditNode(row as ProjectReceivableNodeRow, values);
        }}
        onDeleteNode={onDeleteNode}
        onEditActualNode={onEditActualNode}
        onDeleteActualNode={onDeleteActualNode}
        onEditBadDebtRecord={onEditBadDebtRecord}
        onDeleteBadDebtRecord={onDeleteBadDebtRecord}
        onHistoryChanged={onHistoryChanged}
      />
    </Card>
  );
}
