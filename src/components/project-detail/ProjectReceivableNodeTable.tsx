"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { DragSortTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { PayCircleOutlined } from "@ant-design/icons";
import { Button, Progress, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import BooleanTag from "@/components/BooleanTag";
import EllipsisPopoverText from "@/components/EllipsisPopoverText";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
import ProjectReceivableActualNodeModal, {
  type ProjectReceivableActualNodeFormValues,
} from "@/components/project-detail/ProjectReceivableActualNodeModal";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";

export type ProjectReceivableNodeRow = {
  id: string;
  planId: string;
  stageOptionId: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  sortOrder: number;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  expectedDateChangeCount: number;
  hasVendorPayment: boolean;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded?: number | null;
    actualDate?: string | null;
    remark?: string | null;
    remarkNeedsAttention?: boolean;
  }>;
};

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type ActualNodeRow = NonNullable<
  ProjectReceivableNodeRow["actualNodes"]
>[number];

type Props = {
  title?: string;
  rows: ProjectReceivableNodeRow[];
  stageOptions: StageOption[];
  canManageProject: boolean;
  onAddNode: () => void;
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
};

const getActualAmountSum = (row: ProjectReceivableNodeRow) =>
  (row.actualNodes ?? []).reduce((sum, item) => {
    const value = Number(item.actualAmountTaxIncluded ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

const getCollectionProgressPercent = (row: ProjectReceivableNodeRow) => {
  const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
  const actualAmount = getActualAmountSum(row);
  if (expectedAmount <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((actualAmount / expectedAmount) * 100)),
  );
};

const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("zh-CN")} 元`;
};

const ProjectReceivableNodeTable = ({
  title,
  rows,
  stageOptions,
  canManageProject,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onDragSortNodes,
  onCollectNode,
  onEditActualNode,
  onDeleteActualNode,
}: Props) => {
  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingRow, setEditingRow] = useState<ProjectReceivableNodeRow | null>(
    null,
  );
  const [currentCollectRow, setCurrentCollectRow] =
    useState<ProjectReceivableNodeRow | null>(null);
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

  const columns = useMemo<ProColumns<ProjectReceivableNodeRow>[]>(
    () => [
      {
        title: "",
        dataIndex: "sortOrder",
        fixed: "left",
        width: 10,
        editable: false,
        render: () => null,
        onHeaderCell: () => ({
          style: { paddingInline: 4 },
        }),
        onCell: () => ({
          style: { paddingInline: 4 },
        }),
      },
      {
        title: "收款阶段",
        dataIndex: "stageOptionId",
        fixed: "left",
        width: 120,
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
          rules: [{ required: true, message: "请选择收款阶段" }],
        },
        render: (_dom, row) => {
          const matched = stageOptions.find(
            (item) => item.id === row.stageOptionId,
          );
          return (
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
          );
        },
      },
      {
        title: "关键交付物",
        dataIndex: "keyDeliverable",
        valueType: "text",
        width: 160,
        ellipsis: true,
        render: (_dom, row) => (
          <EllipsisPopoverText
            text={row.keyDeliverable}
            minWidth={60}
            maxWidth={160}
          />
        ),
        formItemProps: {
          rules: [{ required: true, message: "请输入关键交付物" }],
        },
      },
      {
        title: "收款进度",
        dataIndex: "collectionProgress",
        width: 160,
        editable: false,
        render: (_dom, row) => {
          const actualAmount = getActualAmountSum(row);
          const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
          const percent = getCollectionProgressPercent(row);

          return (
            <div style={{ minWidth: 140, lineHeight: 1.1 }}>
              <Typography.Text
                style={{
                  display: "block",
                  marginBottom: 0,
                  fontSize: 12,
                  lineHeight: 1.1,
                }}
              >{`${actualAmount.toLocaleString("zh-CN")} / ${expectedAmount.toLocaleString("zh-CN")}`}</Typography.Text>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          );
        },
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        valueType: "date",
        formItemProps: {
          rules: [{ required: true, message: "请选择预收日期" }],
        },
      },
      {
        title: (
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              lineHeight: 1.2,
            }}
          >
            有供应商付款
          </span>
        ),
        dataIndex: "hasVendorPayment",
        valueType: "switch",
        render: (_dom, row) => (
          <BooleanTag value={Boolean(row.hasVendorPayment)} />
        ),
      },
      {
        title: "备注",
        dataIndex: "remark",
        valueType: "textarea",
        ellipsis: true,
        render: (_dom, row) => {
          const value = row.remark?.trim() ?? "";
          if (!value) return <span>-</span>;
          return (
            <div
              style={{
                color: Boolean(row.remarkNeedsAttention)
                  ? "#ff4d4f"
                  : undefined,
                minWidth: 120,
              }}
            >
              {value}
            </div>
          );
        },
      },
      {
        title: "操作",
        valueType: "option",
        fixed: "right",
        width: 160,
        render: (_text, row) => (
          <Space size={4} wrap={false}>
            <Button
              variant="text"
              color="primary"
              style={{ paddingInline: 4 }}
              disabled={!canManageProject}
              icon={<PayCircleOutlined />}
              onClick={() => {
                setCurrentCollectRow(row);
                setActualModalOpen(true);
              }}
            >
              收款
            </Button>
            <TableActions
              disabled={!canManageProject}
              gap={0}
              buttonStyle={{ paddingInline: 4 }}
              onEdit={() => {
                setEditingRow(row);
                setEditModalOpen(true);
              }}
              onDelete={() => {
                void onDeleteNode(row.id);
              }}
            />
          </Space>
        ),
      },
    ],
    [onDeleteNode, canManageProject, stageOptions, stageValueEnum],
  );

  const actualColumns = useMemo<ColumnsType<ActualNodeRow>>(
    () => [
      {
        title: (
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              lineHeight: 1.2,
            }}
          >
            <span>实收金额</span>
            <span>（含税）</span>
          </span>
        ),
        dataIndex: "actualAmountTaxIncluded",
        width: 130,
        render: (_dom, row) => formatAmount(row.actualAmountTaxIncluded),
      },
      {
        title: "实收日期",
        dataIndex: "actualDate",
        width: 140,
        render: (_dom, row) =>
          row.actualDate ? String(row.actualDate).slice(0, 10) : "-",
      },
      {
        title: "备注",
        dataIndex: "remark",
        width: 180,
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
        key: "actions",
        width: 180,
        render: (_dom, row) => (
          <TableActions
            disabled={!canManageProject}
            editText="修改"
            gap={10}
            buttonStyle={{ paddingInline: 4 }}
            onEdit={() => {
              setEditingActualNode(row);
              setActualModalOpen(true);
            }}
            onDelete={() => {
              void onDeleteActualNode?.(row.id);
            }}
          />
        ),
      },
    ],
    [canManageProject, onDeleteActualNode],
  );

  return (
    <>
      <DragSortTable<ProjectReceivableNodeRow>
        style={{ marginTop: 0 }}
        rowKey="id"
        columns={
          title
            ? ([
                {
                  title,
                  children: columns,
                },
              ] as ProColumns<ProjectReceivableNodeRow>[])
            : columns
        }
        dragSortKey="sortOrder"
        dataSource={rows}
        onDragSortEnd={(
          _beforeIndex: number,
          _afterIndex: number,
          nextRows: ProjectReceivableNodeRow[],
        ) => {
          void onDragSortNodes(nextRows);
        }}
        search={false}
        options={false}
        pagination={false}
        toolBarRender={false}
        scroll={{ x: "max-content" }}
        expandable={{
          columnWidth: 28,
          rowExpandable: (record) => (record.actualNodes?.length ?? 0) > 0,
          expandedRowRender: (record) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={actualColumns}
              dataSource={record.actualNodes ?? []}
            />
          ),
        }}
        onRow={(record) => ({
          style:
            getCollectionProgressPercent(record) === 100
              ? { background: "#f5f5f5" }
              : undefined,
        })}
      />

      <div style={{ marginTop: 8, textAlign: "center" }}>
        <Button
          type="text"
          disabled={!canManageProject}
          onClick={onAddNode}
          style={{ fontWeight: 600, color: "rgba(0,0,0,0.45)" }}
        >
          + 新增节点
        </Button>
      </div>

      <ProjectReceivableActualNodeModal
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
            } else if (currentCollectRow && onCollectNode) {
              setCollecting(true);
              await onCollectNode(currentCollectRow, values);
            }
          } finally {
            setCollecting(false);
          }
          setActualModalOpen(false);
          setCurrentCollectRow(null);
          setEditingActualNode(null);
        }}
        title={editingActualNode ? "修改实收" : "新增实收"}
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
                  actualAmountTaxIncluded:
                    currentCollectRow.expectedAmountTaxIncluded,
                  actualDate: dayjs(currentCollectRow.expectedDate),
                }
              : undefined
        }
      />

      <ProjectReceivableNodeModal
        open={editModalOpen}
        title="编辑收款节点"
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
                keyDeliverable: editingRow.keyDeliverable,
                expectedAmountTaxIncluded: editingRow.expectedAmountTaxIncluded,
                expectedDate: dayjs(editingRow.expectedDate),
                hasVendorPayment: editingRow.hasVendorPayment,
                remark: editingRow.remark ?? undefined,
                remarkNeedsAttention: editingRow.remarkNeedsAttention,
              }
            : undefined
        }
      />
    </>
  );
};

export default ProjectReceivableNodeTable;
