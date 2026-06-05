"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import {
  DeleteOutlined,
  DiffOutlined,
  EditOutlined,
  PayCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Modal,
  Progress,
  Space,
  Typography,
} from "antd";
import EllipsisPopoverText from "@/components/EllipsisPopoverText";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectPayableActualNodeModal, {
  type ProjectPayableActualNodeFormValues,
} from "@/components/project-detail/ProjectPayableActualNodeModal";
import ProjectPayableAdjustmentRecordModal, {
  type ProjectPayableAdjustmentRecordFormValues,
} from "@/components/project-detail/ProjectPayableAdjustmentRecordModal";
import ProjectPayableNodeModal, {
  type ProjectPayableNodeFormValues,
} from "@/components/project-detail/ProjectPayableNodeModal";

export type ProjectPayableNodeRow = {
  id: string;
  planId: string;
  stageOptionId: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  sortOrder: number;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded?: number | null;
    actualDate?: string | null;
    remark?: string | null;
    remarkNeedsAttention?: boolean;
    createdAt?: string | null;
  }>;
  adjustmentRecords?: Array<{
    id: string;
    type: "REDUCTION" | "INCREASE" | "REDUCTION_REVERSAL";
    amountTaxIncluded?: number | null;
    occurredAt?: string | null;
    reason?: string | null;
    remark?: string | null;
    createdAt?: string | null;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
  }>;
  payableAmountTaxIncluded?: number | string | null;
  actualAmountTotal?: number | string | null;
  paymentProgressPercent?: number | string | null;
};

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type ActualNodeRow = NonNullable<ProjectPayableNodeRow["actualNodes"]>[number];

type Props = {
  title?: string;
  rows: ProjectPayableNodeRow[];
  stageOptions: StageOption[];
  canManageProject: boolean;
  onAddNode: () => void;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onEditNode: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableNodeFormValues,
  ) => Promise<void>;
  onDragSortNodes: (
    nextRows: ProjectPayableNodeRow[],
  ) => void | Promise<void>;
  onPayNode?: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableActualNodeFormValues,
  ) => void | Promise<void>;
  onCreateAdjustmentRecord?: (
    row: ProjectPayableNodeRow,
    values: ProjectPayableAdjustmentRecordFormValues,
  ) => void | Promise<void>;
  onViewDetails?: (row: ProjectPayableNodeRow) => void;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectPayableActualNodeFormValues,
  ) => void | Promise<void>;
  onDeleteActualNode?: (actualNodeId: string) => void | Promise<void>;
};

const getActualAmountSum = (row: ProjectPayableNodeRow) => {
  const computedAmount = Number(row.actualAmountTotal);
  if (Number.isFinite(computedAmount)) return computedAmount;

  return (row.actualNodes ?? []).reduce((sum, item) => {
    const value = Number(item.actualAmountTaxIncluded ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
};

const getPayableAmount = (row: ProjectPayableNodeRow) => {
  const payableAmount = Number(row.payableAmountTaxIncluded);
  if (Number.isFinite(payableAmount)) return payableAmount;
  const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
  return Number.isFinite(expectedAmount) ? expectedAmount : 0;
};

const getPaymentProgressPercent = (row: ProjectPayableNodeRow) => {
  const computedPercent = Number(row.paymentProgressPercent);
  if (Number.isFinite(computedPercent)) return computedPercent;

  const expectedAmount = getPayableAmount(row);
  const actualAmount = getActualAmountSum(row);
  if (expectedAmount === 0) return 0;
  const rawPercent = (actualAmount / expectedAmount) * 100;
  if (!Number.isFinite(rawPercent)) return 0;
  return Math.min(100, Math.round(Math.abs(rawPercent)));
};

const getSignedAdjustmentAmount = (row: ProjectPayableNodeRow) =>
  (row.adjustmentRecords ?? []).reduce((sum, record) => {
    const amount = Number(record.amountTaxIncluded ?? 0);
    if (!Number.isFinite(amount)) return sum;
    if (record.type === "REDUCTION") return sum - amount;
    if (record.type === "INCREASE") return sum + amount;
    if (record.type === "REDUCTION_REVERSAL") return sum + amount;
    return sum;
  }, 0);

const getExpectedDateTs = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return Number.POSITIVE_INFINITY;
  return parsed.valueOf();
};

const ProjectPayableNodeTable = ({
  title,
  rows,
  stageOptions,
  canManageProject,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onPayNode,
  onCreateAdjustmentRecord,
  onViewDetails,
  onEditActualNode,
}: Props) => {
  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingRow, setEditingRow] = useState<ProjectPayableNodeRow | null>(
    null,
  );
  const [currentCollectRow, setCurrentCollectRow] =
    useState<ProjectPayableNodeRow | null>(null);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [currentAdjustmentRow, setCurrentAdjustmentRow] =
    useState<ProjectPayableNodeRow | null>(null);
  const [editingActualNode, setEditingActualNode] =
    useState<ActualNodeRow | null>(null);

  const stageValueEnum = useMemo(() => {
    return stageOptions.reduce<Record<string, { text: string }>>(
      (acc, option) => {
        acc[option.id] = { text: option.value };
        return acc;
      },
      {},
    );
  }, [stageOptions]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const dateDiff =
        getExpectedDateTs(left.expectedDate) -
        getExpectedDateTs(right.expectedDate);
      if (dateDiff !== 0) return dateDiff;
      return left.sortOrder - right.sortOrder;
    });
  }, [rows]);

  const columns = useMemo<ProColumns<ProjectPayableNodeRow>[]>(
    () => [
      {
        title: "付款阶段",
        dataIndex: "stageOptionId",
        fixed: "left",
        width: 120,
        onHeaderCell: () => ({
          style: { paddingLeft: 24 },
        }),
        valueType: "select",
        valueEnum: stageValueEnum,
        fieldProps: {
          showSearch: true,
          options: stageOptions.map((item) => ({
            label: item.value,
            value: item.id,
          })),
          optionFilterProp: "label",
        },
        formItemProps: {
          rules: [{ required: true, message: "请选择付款阶段" }],
        },
        render: (_dom, row) => {
          const matched = stageOptions.find(
            (item) => item.id === row.stageOptionId,
          );
          return (
            <div style={{ paddingLeft: 24 }}>
              <SelectOptionTag
                option={
                  row.stageOption
                    ? {
                        id: row.stageOption.id,
                        value: row.stageOption.value,
                        color: row.stageOption.color ?? undefined,
                      }
                    : matched
                      ? { id: matched.id, value: matched.value }
                      : null
                }
              />
            </div>
          );
        },
      },
      {
        title: "付款条件",
        dataIndex: "paymentCondition",
        valueType: "text",
        width: 160,
        ellipsis: true,
        render: (_dom, row) => (
          <EllipsisPopoverText
            text={row.paymentCondition}
            minWidth={60}
            maxWidth={160}
          />
        ),
        formItemProps: {
          rules: [{ required: true, message: "请输入付款条件" }],
        },
      },
      {
        title: "付款进度",
        dataIndex: "collectionProgress",
        width: 240,
        editable: false,
        render: (_dom, row) => {
          const actualAmount = getActualAmountSum(row);
          const expectedAmount = getPayableAmount(row);
          const percent = getPaymentProgressPercent(row);
          const adjustmentAmount = getSignedAdjustmentAmount(row);
          const hasPositiveAdjustment = adjustmentAmount > 0;
          const hasNegativeAdjustment = adjustmentAmount < 0;

          return (
            <div style={{ minWidth: 140, lineHeight: 1.1 }}>
              <Typography.Text
                style={{ display: "block", marginBottom: 0, fontSize: 12, lineHeight: 1.1 }}
              >{`实付 ${actualAmount.toLocaleString("zh-CN")} / 预付 ${expectedAmount.toLocaleString("zh-CN")} 元`}</Typography.Text>
              <Progress percent={percent} showInfo={false} size="small" />
              {adjustmentAmount !== 0 ? (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: hasNegativeAdjustment
                      ? "#BE2E2C"
                      : hasPositiveAdjustment
                        ? "#387E22"
                        : undefined,
                    fontWeight: 600,
                  }}
                >
                  {`应付调整 ${
                    hasPositiveAdjustment ? "+" : ""
                  }${adjustmentAmount.toLocaleString("zh-CN")} 元`}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "预付日期",
        dataIndex: "expectedDate",
        valueType: "date",
        formItemProps: {
          rules: [{ required: true, message: "请选择预付日期" }],
        },
      },
      {
        title: "备注",
        dataIndex: "remark",
        valueType: "textarea",
        width: 120,
        ellipsis: true,
        render: (_dom, row) => {
          const value = row.remark?.trim() ?? "";
          if (!value) return <span>-</span>;
          return (
            <span
              style={
                Boolean(row.remarkNeedsAttention)
                  ? { color: "#ff4d4f" }
                  : undefined
              }
            >
              {value}
            </span>
          );
        },
      },
      {
        title: "操作",
        valueType: "option",
        fixed: "right",
        width: 180,
        render: (_text, row) => {
          const isPaymentCompleted = getPaymentProgressPercent(row) >= 100;

          return (
            <Space size={4} wrap={false}>
              <Button
                variant="text"
                color="primary"
                style={{ paddingInline: 4 }}
                onClick={() => {
                  onViewDetails?.(row);
                }}
              >
                查看详情
              </Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "pay",
                      label: "新增付款",
                      icon: <PayCircleOutlined />,
                      disabled: !canManageProject || isPaymentCompleted,
                    },
                    {
                      key: "adjustment",
                      label: "应付调整",
                      icon: <DiffOutlined />,
                      disabled: !canManageProject,
                    },
                    {
                      type: "divider",
                    },
                    {
                      key: "edit",
                      label: "编辑节点",
                      icon: <EditOutlined />,
                      disabled: !canManageProject,
                    },
                    {
                      type: "divider",
                    },
                    {
                      key: "delete",
                      label: "删除节点",
                      icon: <DeleteOutlined />,
                      disabled: !canManageProject,
                      danger: true,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === "pay") {
                      setCurrentCollectRow(row);
                      setActualModalOpen(true);
                      return;
                    }
                    if (key === "adjustment") {
                      setCurrentAdjustmentRow(row);
                      setAdjustmentModalOpen(true);
                      return;
                    }
                    if (key === "edit") {
                      setEditingRow(row);
                      setEditModalOpen(true);
                      return;
                    }
                    if (key === "delete") {
                      Modal.confirm({
                        title: "确定删除该记录？",
                        okText: "确认",
                        cancelText: "取消",
                        okButtonProps: { danger: true },
                        onOk: async () => {
                          await onDeleteNode(row.id);
                        },
                      });
                    }
                  },
                }}
                trigger={["click"]}
              >
                <Button
                  variant="text"
                  color="primary"
                  style={{ paddingInline: 4 }}
                  disabled={!canManageProject}
                >
                  更多操作
                </Button>
              </Dropdown>
            </Space>
          );
        },
      },
    ],
    [onDeleteNode, canManageProject, onViewDetails, stageOptions, stageValueEnum],
  );

  return (
    <>
      <ProTable<ProjectPayableNodeRow>
        style={{ marginTop: 1 }}
        rowKey="id"
        columns={
          title
            ? ([
                {
                  title,
                  children: columns,
                },
              ] as ProColumns<ProjectPayableNodeRow>[])
            : columns
        }
        dataSource={sortedRows}
        search={false}
        options={false}
        pagination={false}
        toolBarRender={false}
        scroll={{ x: "max-content" }}
        rowClassName={(record) =>
          getPaymentProgressPercent(record) === 100
            ? "payable-node-row-complete"
            : ""
        }
      />
      <style jsx global>{`
        .payable-node-row-complete > td.ant-table-cell {
          background: #eff6e6 !important;
        }
      `}</style>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Button
          type="dashed"
          block
          disabled={!canManageProject}
          onClick={onAddNode}
        >
          新增节点
        </Button>
      </div>

      <ProjectPayableActualNodeModal
        open={actualModalOpen}
        loading={collecting}
        onCancel={() => {
          setActualModalOpen(false);
          setCurrentCollectRow(null);
          setEditingActualNode(null);
        }}
        onSubmit={async (values) => {
          try {
            if (editingActualNode && onEditActualNode) {
              setCollecting(true);
              await onEditActualNode(editingActualNode.id, values);
            } else if (currentCollectRow && onPayNode) {
              setCollecting(true);
              await onPayNode(currentCollectRow, values);
            }
          } finally {
            setCollecting(false);
          }
          setActualModalOpen(false);
          setCurrentCollectRow(null);
          setEditingActualNode(null);
        }}
        title={editingActualNode ? "修改实付" : "新增实付"}
        initialValues={
          editingActualNode
            ? {
                actualAmountTaxIncluded:
                  editingActualNode.actualAmountTaxIncluded ?? undefined,
                actualDate: editingActualNode.actualDate
                  ? dayjs(editingActualNode.actualDate)
                  : undefined,
                remark: editingActualNode.remark ?? undefined,
                remarkNeedsAttention: Boolean(
                  editingActualNode.remarkNeedsAttention,
                ),
              }
            : currentCollectRow
            ? {
                actualAmountTaxIncluded: getPayableAmount(currentCollectRow),
                actualDate: currentCollectRow.expectedDate
                  ? dayjs(currentCollectRow.expectedDate)
                  : undefined,
              }
            : undefined
        }
      />

      <ProjectPayableNodeModal
        open={editModalOpen}
        title="编辑付款节点"
        loading={editing}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingRow(null);
        }}
        onSubmit={async (values) => {
          if (!editingRow) return;
          setEditing(true);
          try {
            await onEditNode(editingRow, values);
            setEditModalOpen(false);
            setEditingRow(null);
          } finally {
            setEditing(false);
          }
        }}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        initialValues={
          editingRow
            ? {
                stage:
                  editingRow.stageOption?.value ??
                  stageOptions.find(
                    (item) => item.id === editingRow.stageOptionId,
                  )?.value ??
                  undefined,
                paymentCondition: editingRow.paymentCondition,
                expectedAmountTaxIncluded: editingRow.expectedAmountTaxIncluded,
                expectedDate: editingRow.expectedDate
                  ? dayjs(editingRow.expectedDate)
                  : undefined,
                remark: editingRow.remark ?? undefined,
                remarkNeedsAttention: editingRow.remarkNeedsAttention,
              }
            : undefined
        }
      />

      <ProjectPayableAdjustmentRecordModal
        open={adjustmentModalOpen}
        loading={adjusting}
        onCancel={() => {
          setAdjustmentModalOpen(false);
          setCurrentAdjustmentRow(null);
        }}
        onSubmit={async (values) => {
          if (!currentAdjustmentRow || !onCreateAdjustmentRecord) return;
          setAdjusting(true);
          try {
            await onCreateAdjustmentRecord(currentAdjustmentRow, values);
            setAdjustmentModalOpen(false);
            setCurrentAdjustmentRow(null);
          } finally {
            setAdjusting(false);
          }
        }}
      />
    </>
  );
};

export default ProjectPayableNodeTable;
