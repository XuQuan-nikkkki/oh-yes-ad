"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
import { DragSortTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Progress, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
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
  expectedDate: string | null;
  expectedDateChangeCount: number;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    reason?: string | null;
    changedAt?: string;
  }>;
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

export type ReceivableNodeDelayFormValues = {
  delayedExpectedDate: Dayjs;
  delayReason: string;
};

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
  onDelayNode?: (
    row: ProjectReceivableNodeRow,
    values: ReceivableNodeDelayFormValues,
  ) => void | Promise<void>;
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
  onDelayNode,
}: Props) => {
  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [editingRow, setEditingRow] = useState<ProjectReceivableNodeRow | null>(
    null,
  );
  const [currentCollectRow, setCurrentCollectRow] =
    useState<ProjectReceivableNodeRow | null>(null);
  const [editingActualNode, setEditingActualNode] =
    useState<ActualNodeRow | null>(null);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delaying, setDelaying] = useState(false);
  const [delayTargetRow, setDelayTargetRow] = useState<ProjectReceivableNodeRow | null>(null);
  const [delayForm] = Form.useForm<ReceivableNodeDelayFormValues>();

  useEffect(() => {
    const validIdSet = new Set(rows.map((row) => row.id));
    setExpandedRowKeys((prev) => prev.filter((key) => validIdSet.has(String(key))));
  }, [rows]);

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
        title: "预收延后",
        dataIndex: "expectedDateHistories",
        width: 160,
        editable: false,
        render: (_dom, row) => {
          const histories = Array.isArray(row.expectedDateHistories)
            ? row.expectedDateHistories
            : [];
          return (
            <Space size={4} align="center">
              <BooleanTag value={histories.length > 0} />
              <Tooltip
                title={
                  histories.length > 0 ? (
                    <div>
                      {histories.map((history) => {
                        const from = dayjs(history.fromExpectedDate).isValid()
                          ? dayjs(history.fromExpectedDate).format("YYYY/MM/DD")
                          : "-";
                        const to = dayjs(history.toExpectedDate).isValid()
                          ? dayjs(history.toExpectedDate).format("YYYY/MM/DD")
                          : "-";
                        const reason = String(history.reason ?? "").trim();
                        return (
                          <div key={history.id}>
                            {`${from} -> ${to}${reason ? ` ${reason}` : ""}`}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    "暂无延后历史"
                  )
                }
              >
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.45)" }} />
              </Tooltip>
            </Space>
          );
        },
      },
      {
        title: "操作",
        valueType: "option",
        fixed: "right",
        width: 220,
        render: (_text, row) => (
          <Space size={4} wrap={false}>
            <Button
              variant="text"
              color="primary"
              style={{ paddingInline: 4 }}
              disabled={!canManageProject}
              onClick={() => {
                setCurrentCollectRow(row);
                setActualModalOpen(true);
              }}
            >
              收款
            </Button>
            <Button
              variant="text"
              color="primary"
              style={{ paddingInline: 4 }}
              disabled={!canManageProject}
              onClick={() => {
                setDelayTargetRow(row);
                setDelayModalOpen(true);
              }}
            >
              延迟收款
            </Button>
            <TableActions
              disabled={!canManageProject}
              gap={0}
              buttonStyle={{ paddingInline: 4 }}
              showIcons={false}
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
        rowClassName={(record) =>
          getCollectionProgressPercent(record) === 100
            ? "receivable-node-row-complete"
            : ""
        }
        expandable={{
          columnWidth: 28,
          expandRowByClick: false,
          expandedRowKeys,
          onExpandedRowsChange: (keys) => {
            setExpandedRowKeys(keys as Key[]);
          },
          rowExpandable: (record) => (record.actualNodes?.length ?? 0) > 0,
          expandedRowRender: (record) => (
            <div
              style={{ paddingLeft: 32 }}
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
      />
      <style jsx global>{`
        .receivable-node-row-complete > td.ant-table-cell {
          background: #EFF6E6 !important;
        }
      `}</style>

      <div style={{ marginTop: 8, textAlign: "center" }}>
        <Button
          type="dashed"
          block
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
                  actualDate: currentCollectRow.expectedDate
                    ? dayjs(currentCollectRow.expectedDate)
                    : undefined,
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
                expectedDate: editingRow.expectedDate
                  ? dayjs(editingRow.expectedDate)
                  : undefined,
                remark: editingRow.remark ?? undefined,
                remarkNeedsAttention: editingRow.remarkNeedsAttention,
              }
            : undefined
        }
      />
      <Modal
        title="延迟收款"
        open={delayModalOpen}
        confirmLoading={delaying}
        destroyOnHidden
        onCancel={() => {
          setDelayModalOpen(false);
          setDelayTargetRow(null);
          delayForm.resetFields();
        }}
        onOk={() => {
          void (async () => {
            if (!delayTargetRow) return;
            const values = await delayForm.validateFields();
            if (!onDelayNode) return;
            setDelaying(true);
            try {
              await onDelayNode(delayTargetRow, values);
              setDelayModalOpen(false);
              setDelayTargetRow(null);
              delayForm.resetFields();
            } finally {
              setDelaying(false);
            }
          })();
        }}
        afterOpenChange={(nextOpen) => {
          if (nextOpen) {
            delayForm.setFieldsValue({
              delayedExpectedDate: delayTargetRow?.expectedDate
                ? dayjs(delayTargetRow.expectedDate)
                : undefined,
              delayReason: undefined,
            });
            return;
          }
          delayForm.resetFields();
        }}
      >
        <Form form={delayForm} layout="vertical">
          <Form.Item label="原预收日期">
            <Input
              value={
                delayTargetRow?.expectedDate
                  ? dayjs(delayTargetRow.expectedDate).format("YYYY-MM-DD")
                  : "-"
              }
              disabled
            />
          </Form.Item>
          <Form.Item
            label="延后日期"
            name="delayedExpectedDate"
            rules={[
              { required: true, message: "请选择延后日期" },
              {
                validator: async (_, value: Dayjs | undefined) => {
                  if (!value || !delayTargetRow?.expectedDate) return;
                  const current = dayjs(delayTargetRow.expectedDate);
                  if (!current.isValid()) return;
                  if (!value.isAfter(current, "day")) {
                    throw new Error("延后日期需晚于原预收日期");
                  }
                },
              },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="延后原因"
            name="delayReason"
            rules={[{ required: true, message: "请输入延后原因" }]}
          >
            <Input.TextArea rows={3} placeholder="请输入延后原因" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectReceivableNodeTable;
