"use client";

import dayjs from "dayjs";
import {
  DeleteOutlined,
  DiffOutlined,
  EditOutlined,
  PayCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Empty, Popconfirm, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import ProjectPayableActualNodeModal, {
  type ProjectPayableActualNodeFormValues,
} from "@/components/project-detail/ProjectPayableActualNodeModal";
import ProjectPayableAdjustmentRecordModal, {
  type ProjectPayableAdjustmentRecordFormValues,
} from "@/components/project-detail/ProjectPayableAdjustmentRecordModal";
import ProjectPayableNodeModal, {
  type ProjectPayableNodeFormValues,
} from "@/components/project-detail/ProjectPayableNodeModal";
import TimelineCell from "@/components/project-detail/project-receivable-activity/TimelineCell";
import { buildActivityRows } from "@/components/project-detail/project-payable-activity/buildActivityRows";
import type { ActivityTableRow, ActivityType, ProjectPayableActivityRow } from "@/components/project-detail/project-payable-activity/types";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";

type Props = {
  rows: ProjectPayableActivityRow[];
  stageOptions: Array<{ id: string; value: string; color?: string | null }>;
  initialSelectedStageOptionIds?: string[];
  canManageProject: boolean;
  onEditNode?: (row: ProjectPayableActivityRow, values: ProjectPayableNodeFormValues) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => Promise<void> | void;
  onEditActualNode?: (actualNodeId: string, values: ProjectPayableActualNodeFormValues) => Promise<void> | void;
  onDeleteActualNode?: (actualNodeId: string) => Promise<void> | void;
  onEditAdjustmentRecord?: (adjustmentRecordId: string, values: ProjectPayableAdjustmentRecordFormValues) => Promise<void> | void;
  onDeleteAdjustmentRecord?: (adjustmentRecordId: string) => Promise<void> | void;
};

const getEventTypeConfig = (eventType: ActivityType) => {
  if (eventType === "PAYABLE_NODE") return { icon: <WalletOutlined />, color: "#722ed1", text: "预付" };
  if (eventType === "PAYMENT") return { icon: <PayCircleOutlined />, color: "#1677ff", text: "实付" };
  return { icon: <DiffOutlined />, color: "#fa8c16", text: "应付调整" };
};

export default function ProjectPayableActivity({
  rows,
  stageOptions,
  initialSelectedStageOptionIds,
  canManageProject,
  onEditNode,
  onDeleteNode,
  onEditActualNode,
  onDeleteActualNode,
  onEditAdjustmentRecord,
  onDeleteAdjustmentRecord,
}: Props) {
  const [selectedStageOptionIds, setSelectedStageOptionIds] = useState<string[]>(initialSelectedStageOptionIds ?? []);
  const [, contextHolder] = message.useMessage();
  const [editingNodeRow, setEditingNodeRow] = useState<ProjectPayableActivityRow | null>(null);
  const [editingActualRow, setEditingActualRow] = useState<ActivityTableRow["sourceActualNode"] | null>(null);
  const [editingAdjustmentRow, setEditingAdjustmentRow] = useState<ActivityTableRow["sourceAdjustmentRecord"] | null>(null);
  const [nodeSubmitting, setNodeSubmitting] = useState(false);
  const [actualSubmitting, setActualSubmitting] = useState(false);
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const stageFilterOptions = useMemo(() => {
    const stageOptionIds = new Set(rows.map((row) => row.stageOptionId).filter(Boolean));
    return stageOptions.reduce<Array<{ text: string; value: string }>>((result, option) => {
      if (stageOptionIds.has(option.id)) result.push({ text: option.value, value: option.id });
      return result;
    }, []);
  }, [rows, stageOptions]);
  const dataSource = useMemo(
    () =>
      buildActivityRows(rows).filter(
        (row) =>
          selectedStageOptionIds.length === 0 ||
          selectedStageOptionIds.includes(row.stageOptionId),
      ),
    [rows, selectedStageOptionIds],
  );

  useEffect(() => {
    setSelectedStageOptionIds(initialSelectedStageOptionIds ?? []);
  }, [initialSelectedStageOptionIds]);

  const columns = useMemo<ColumnsType<ActivityTableRow>>(
    () => [
      {
        title: "日期",
        dataIndex: "eventAtText",
        width: 160,
        onHeaderCell: () => ({ style: { paddingLeft: 26 } }),
        onCell: () => ({ style: { paddingLeft: 26 } }),
        render: (value: string, _record, index) => (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 90, display: "flex", alignItems: "center" }}>{value}</div>
            <TimelineCell isFirst={index === 0} isLast={index === dataSource.length - 1} />
          </div>
        ),
      },
      {
        title: "所属节点",
        dataIndex: "stageText",
        width: 120,
        filters: stageFilterOptions,
        filterMultiple: true,
        filteredValue: selectedStageOptionIds.length > 0 ? selectedStageOptionIds : null,
        render: (value: string, record) => (
          <SelectOptionQuickEditTag field="project.payableNode.stage" disabled option={{ id: value, value, color: record.stageColor ?? undefined }} fallbackText="-" />
        ),
      },
      {
        title: "事件类型",
        dataIndex: "eventType",
        width: 140,
        render: (value: ActivityType) => {
          const config = getEventTypeConfig(value);
          return <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", background: config.color, fontSize: 9 }}>{config.icon}</span><span style={{ color: config.color, fontWeight: 600 }}>{config.text}</span></div>;
        },
      },
      {
        title: "事件详情",
        dataIndex: "detailText",
        width: 280,
        render: (value: string, record) => <span style={{ color: record.detailIsAlert ? "#BE2E2C" : "rgba(0,0,0,0.65)", fontSize: 13, whiteSpace: "pre-line" }}>{value}</span>,
      },
      {
        title: "金额（元）",
        dataIndex: "amountText",
        width: 120,
        render: (value: string, record) => <span style={{ color: record.amountColor, fontWeight: 600 }}>{value}</span>,
      },
      {
        title: "操作信息",
        dataIndex: "operatorName",
        width: 140,
        render: (_value: string, record) => <div style={{ fontSize: 13, lineHeight: 1.4, color: "rgba(0,0,0,0.65)" }}>{record.operatorName ? <div>{record.operatorName}</div> : null}{record.operationAtText ? <div>{record.operationAtText}</div> : null}</div>,
      },
      {
        title: "操作",
        key: "actions",
        width: 120,
        render: (_value, record) => (
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="link" size="small" icon={<EditOutlined />} disabled={!canManageProject} onClick={() => {
              if (record.eventType === "PAYABLE_NODE") setEditingNodeRow(record.sourceRow);
              if (record.eventType === "PAYMENT") setEditingActualRow(record.sourceActualNode ?? null);
              if (record.eventType === "ADJUSTMENT") setEditingAdjustmentRow(record.sourceAdjustmentRecord ?? null);
            }}>编辑</Button>
            <Popconfirm title="确认删除该条记录吗？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} disabled={!canManageProject} onConfirm={() => { void (async () => {
              if (record.eventType === "PAYABLE_NODE") await onDeleteNode?.(record.sourceRow.id);
              if (record.eventType === "PAYMENT" && record.sourceActualNode) await onDeleteActualNode?.(record.sourceActualNode.id);
              if (record.eventType === "ADJUSTMENT" && record.sourceAdjustmentRecord) await onDeleteAdjustmentRecord?.(record.sourceAdjustmentRecord.id);
            })(); }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={!canManageProject}>删除</Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [canManageProject, dataSource.length, onDeleteActualNode, onDeleteAdjustmentRecord, onDeleteNode, selectedStageOptionIds, stageFilterOptions],
  );

  if (dataSource.length === 0) return <div style={{ padding: 24 }}><Empty description="暂无付款动态" /></div>;

  return (
    <>
      {contextHolder}
      <Table<ActivityTableRow> style={{ marginTop: 1 }} rowKey="id" columns={columns} dataSource={dataSource} onChange={(_, filters) => {
        const nextStageOptionIds = Array.isArray(filters.stageText) ? filters.stageText.filter((value): value is string => typeof value === "string") : [];
        setSelectedStageOptionIds(nextStageOptionIds);
      }} pagination={false} size="small" scroll={{ x: "max-content" }} />
      <ProjectPayableNodeModal open={Boolean(editingNodeRow)} title="编辑付款节点" loading={nodeSubmitting} onCancel={() => setEditingNodeRow(null)} onSubmit={async (values) => {
        if (!editingNodeRow || !onEditNode) return;
        setNodeSubmitting(true);
        try { await onEditNode(editingNodeRow, values); setEditingNodeRow(null); } finally { setNodeSubmitting(false); }
      }} stageOptions={stageOptions} initialValues={editingNodeRow ? { stage: editingNodeRow.stageOption?.value ?? stageOptions.find((item) => item.id === editingNodeRow.stageOptionId)?.value ?? undefined, paymentCondition: editingNodeRow.paymentCondition, expectedAmountTaxIncluded: editingNodeRow.expectedAmountTaxIncluded, expectedDate: editingNodeRow.expectedDate ? dayjs(editingNodeRow.expectedDate) : undefined, remark: editingNodeRow.remark ?? undefined, remarkNeedsAttention: Boolean(editingNodeRow.remarkNeedsAttention) } : undefined} />
      <ProjectPayableActualNodeModal open={Boolean(editingActualRow)} title="修改实付" loading={actualSubmitting} onCancel={() => setEditingActualRow(null)} onSubmit={async (values) => {
        if (!editingActualRow) return;
        setActualSubmitting(true);
        try { await onEditActualNode?.(editingActualRow.id, values); setEditingActualRow(null); } finally { setActualSubmitting(false); }
      }} initialValues={editingActualRow ? { actualAmountTaxIncluded: editingActualRow.actualAmountTaxIncluded ?? undefined, actualDate: editingActualRow.actualDate ? dayjs(editingActualRow.actualDate) : undefined, remark: editingActualRow.remark ?? undefined, remarkNeedsAttention: Boolean(editingActualRow.remarkNeedsAttention) } : undefined} />
      <ProjectPayableAdjustmentRecordModal open={Boolean(editingAdjustmentRow)} title="编辑应付调整" loading={adjustmentSubmitting} onCancel={() => setEditingAdjustmentRow(null)} onSubmit={async (values) => {
        if (!editingAdjustmentRow) return;
        setAdjustmentSubmitting(true);
        try { await onEditAdjustmentRecord?.(editingAdjustmentRow.id, values); setEditingAdjustmentRow(null); } finally { setAdjustmentSubmitting(false); }
      }} initialValues={editingAdjustmentRow ? { type: editingAdjustmentRow.type, amountTaxIncluded: Number(editingAdjustmentRow.amountTaxIncluded ?? 0), occurredAt: editingAdjustmentRow.occurredAt ? dayjs(editingAdjustmentRow.occurredAt) : undefined, reason: editingAdjustmentRow.reason ?? undefined, remark: editingAdjustmentRow.remark ?? undefined } : undefined} />
    </>
  );
}
