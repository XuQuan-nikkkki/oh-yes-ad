"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { DragSortTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { PayCircleOutlined } from "@ant-design/icons";
import { Button, Progress, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import EllipsisPopoverText from "@/components/EllipsisPopoverText";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
import ProjectPayableActualNodeModal, {
  type ProjectPayableActualNodeFormValues,
} from "@/components/project-detail/ProjectPayableActualNodeModal";
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
  }>;
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
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectPayableActualNodeFormValues,
  ) => void | Promise<void>;
  onDeleteActualNode?: (actualNodeId: string) => void | Promise<void>;
};

const getActualAmountSum = (row: ProjectPayableNodeRow) =>
  (row.actualNodes ?? []).reduce((sum, item) => {
    const value = Number(item.actualAmountTaxIncluded ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

const getPaymentProgressPercent = (row: ProjectPayableNodeRow) => {
  const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
  const actualAmount = getActualAmountSum(row);
  if (expectedAmount === 0) return 0;
  const rawPercent = (actualAmount / expectedAmount) * 100;
  if (!Number.isFinite(rawPercent)) return 0;
  return Math.min(100, Math.round(Math.abs(rawPercent)));
};

const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("zh-CN")} 元`;
};

const ProjectPayableNodeTable = ({
  title,
  rows,
  stageOptions,
  canManageProject,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onDragSortNodes,
  onPayNode,
  onEditActualNode,
  onDeleteActualNode,
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

  const columns = useMemo<ProColumns<ProjectPayableNodeRow>[]>(
    () => [
      {
        title: "",
        dataIndex: "sortOrder",
        width: 28,
        fixed: "left",
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
        title: "付款阶段",
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
          rules: [{ required: true, message: "请选择付款阶段" }],
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
        width: 160,
        editable: false,
        render: (_dom, row) => {
          const actualAmount = getActualAmountSum(row);
          const expectedAmount = Number(row.expectedAmountTaxIncluded ?? 0);
          const percent = getPaymentProgressPercent(row);

          return (
            <div style={{ minWidth: 140, lineHeight: 1.1 }}>
              <Typography.Text
                style={{ display: "block", marginBottom: 0, fontSize: 12, lineHeight: 1.1 }}
              >{`${actualAmount.toLocaleString("zh-CN")} / ${expectedAmount.toLocaleString("zh-CN")}`}</Typography.Text>
              <Progress percent={percent} showInfo={false} size="small" />
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
              付款
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
            <span>实付金额</span>
            <span>（含税）</span>
          </span>
        ),
        dataIndex: "actualAmountTaxIncluded",
        width: 130,
        render: (_dom, row) => formatAmount(row.actualAmountTaxIncluded),
      },
      {
        title: "实付日期",
        dataIndex: "actualDate",
        width: 140,
        render: (_dom, row) =>
          row.actualDate ? dayjs(row.actualDate).format("YYYY-MM-DD") : "-",
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
      <DragSortTable<ProjectPayableNodeRow>
        style={{ marginTop: 24 }}
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
        dragSortKey="sortOrder"
        dataSource={rows}
        onDragSortEnd={(
          _beforeIndex: number,
          _afterIndex: number,
          nextRows: ProjectPayableNodeRow[],
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
          expandRowByClick: false,
          rowExpandable: (record) => (record.actualNodes?.length ?? 0) > 0,
          expandedRowRender: (record) => (
            <div
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={actualColumns}
                dataSource={record.actualNodes ?? []}
                onRow={() => ({
                  onClick: (event) => {
                    event.stopPropagation();
                  },
                })}
              />
            </div>
          ),
        }}
        onRow={(record) => ({
          style:
            getPaymentProgressPercent(record) === 100
              ? { background: "#f5f5f5" }
              : undefined,
        })}
      />

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
                actualAmountTaxIncluded:
                  currentCollectRow.expectedAmountTaxIncluded,
                actualDate: dayjs(currentCollectRow.expectedDate),
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
                expectedDate: dayjs(editingRow.expectedDate),
                remark: editingRow.remark ?? undefined,
                remarkNeedsAttention: editingRow.remarkNeedsAttention,
              }
            : undefined
        }
      />
    </>
  );
};

export default ProjectPayableNodeTable;
