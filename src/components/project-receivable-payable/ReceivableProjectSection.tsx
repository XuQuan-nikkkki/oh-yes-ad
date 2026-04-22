"use client";

import { useState } from "react";
import { Card, Empty, Progress } from "antd";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectReceivableNodeTable, {
  type ProjectReceivableNodeRow,
  type ReceivableNodeDelayFormValues,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
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
  onDelayNode?: (
    row: ProjectReceivableNodeRow,
    values: ReceivableNodeDelayFormValues,
  ) => void | Promise<void>;
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
  onCreateNode,
  onDeleteNode,
  onEditNode,
  onDragSortNodes,
  onCollectNode,
  onEditActualNode,
  onDeleteActualNode,
  onDelayNode,
}: ReceivableProjectSectionProps) {
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);
  const expectedAmountTotal = rows.reduce(
    (sum, row) => sum + Number(row.expectedAmountTaxIncluded ?? 0),
    0,
  );
  const actualAmountTotal = rows.reduce((sum, row) => {
    const rowActual = (row.actualNodes ?? []).reduce(
      (rowSum, actual) => rowSum + Number(actual.actualAmountTaxIncluded ?? 0),
      0,
    );
    return sum + rowActual;
  }, 0);
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
            disabled={!canManageProject}
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
            {Number(contractAmountTotal ?? 0).toLocaleString("zh-CN")} 元
          </span>
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
          onDelayNode={onDelayNode}
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
    </Card>
  );
}
