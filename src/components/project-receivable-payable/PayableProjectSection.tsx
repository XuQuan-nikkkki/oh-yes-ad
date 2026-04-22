"use client";

import { useState } from "react";
import { Card, Empty, Progress } from "antd";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectPayableNodeTable, {
  type ProjectPayableNodeRow,
} from "@/components/project-detail/ProjectPayableNodeTable";
import ProjectPayableNodeModal, {
  type ProjectPayableNodeFormValues,
} from "@/components/project-detail/ProjectPayableNodeModal";
import type { ProjectPayableActualNodeFormValues } from "@/components/project-detail/ProjectPayableActualNodeModal";
import AppLink from "../AppLink";

type PayableProjectSectionProps = {
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
  rows: ProjectPayableNodeRow[];
  stageOptions: Array<{
    id: string;
    value: string;
    color?: string | null;
  }>;
  canManageProject?: boolean;
  onCreateNode: (
    planId: string,
    values: ProjectPayableNodeFormValues,
  ) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onEditNode: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableNodeFormValues,
  ) => Promise<void>;
  onDragSortNodes: (nextRows: ProjectPayableNodeRow[]) => void | Promise<void>;
  onPayNode?: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableActualNodeFormValues,
  ) => void | Promise<void>;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectPayableActualNodeFormValues,
  ) => void | Promise<void>;
  onDeleteActualNode?: (actualNodeId: string) => void | Promise<void>;
};

export default function PayableProjectSection({
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
  onPayNode,
  onEditActualNode,
  onDeleteActualNode,
}: PayableProjectSectionProps) {
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
  const hasPayableAmount = expectedAmountTotal > 0;
  const isFullyPaid =
    hasPayableAmount && actualAmountTotal >= expectedAmountTotal;
  const leftBorderColor = !hasPayableAmount
    ? "var(--ant-colorTextQuaternary, #bfbfbf)"
    : isFullyPaid
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
  c
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
        <ProjectPayableNodeTable
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
          onPayNode={onPayNode}
          onEditActualNode={onEditActualNode}
          onDeleteActualNode={onDeleteActualNode}
        />
      ) : (
        <div style={{ padding: 16 }}>
          <Empty description="暂无付款节点" />
        </div>
      )}
      <div style={{ display: "none" }}>{projectId}</div>
      <ProjectPayableNodeModal
        open={nodeModalOpen}
        title="新增付款节点"
        loading={creatingNode}
        onCancel={() => setNodeModalOpen(false)}
        onSubmit={async (values: ProjectPayableNodeFormValues) => {
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
