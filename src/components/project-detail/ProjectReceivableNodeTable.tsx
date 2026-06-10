"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  MoneyCollectOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { formatBadDebtSignedAmount } from "@/lib/format-bad-debt-amount";
import EllipsisPopoverText from "@/components/EllipsisPopoverText";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectReceivableActualNodeModal, {
  type ProjectReceivableActualNodeFormValues,
} from "@/components/project-detail/ProjectReceivableActualNodeModal";
import ProjectReceivableBadDebtRecordModal, {
  type ProjectReceivableBadDebtRecordFormValues,
} from "@/components/project-detail/ProjectReceivableBadDebtRecordModal";
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
  expectedAmountTaxIncluded: number | null;
  expectedDate: string | null;
  expectedDateChangeCount: number;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    reason?: string | null;
    remark?: string | null;
    changedAt?: string;
    changedByEmployee?: {
      id: string;
      name: string;
    } | null;
  }>;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded?: number | null;
    actualDate?: string | null;
    invoiceDate?: string | null;
    remark?: string | null;
    remarkNeedsAttention?: boolean;
  }>;
  badDebtRecords?: Array<{
    id: string;
    actualNodeId?: string | null;
    type: "WRITE_OFF" | "RECOVERY";
    amountTaxIncluded?: number | string | null;
    occurredAt?: string | null;
    reason?: string | null;
    remark?: string | null;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
    createdAt?: string;
  }>;
  receivableAmountTaxIncluded?: number;
  actualAmountTotal?: number;
  badDebtWriteOffAmountTotal?: number;
  badDebtRecoveryAmountTotal?: number;
  badDebtAmountTotal?: number;
  actualBadDebtAmount?: number;
  pendingAmount?: number;
  collectionProgressPercent?: number;
  isCollectionAmountMatched?: boolean;
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
  originalExpectedDate?: string;
  delayedExpectedDate: Dayjs;
  delayReason: string;
  delayRemark?: string;
};

type ReceivableDelayHistoryEditFormValues = {
  originalExpectedDate?: string;
  updatedExpectedDate?: string;
  reason: string;
  remark?: string;
};

type Props = {
  title?: string;
  rows: ProjectReceivableNodeRow[];
  stageOptions: StageOption[];
  canManageProject: boolean;
  canManageBadDebtRecords?: boolean;
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
  onCreateBadDebtRecord?: (
    row: ProjectReceivableNodeRow,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => void | Promise<void>;
  onEditBadDebtRecord?: (
    badDebtRecordId: string,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => void | Promise<void>;
  onDeleteBadDebtRecord?: (badDebtRecordId: string) => void | Promise<void>;
  onHistoryChanged?: () => void | Promise<void>;
  onViewDetails?: (row: ProjectReceivableNodeRow) => void;
};

const toAmountNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toPercentNumber = (value: unknown) => {
  const amount = toAmountNumber(value);
  if (amount === null) return 0;
  return Math.max(0, Math.min(100, amount));
};

const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("zh-CN")} 元`;
};

const getBarPercent = (value: number) => Math.max(0, Math.min(100, value));
const toCentAmount = (value: number) => Math.round(value * 100);

const getExpectedDateTs = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return Number.POSITIVE_INFINITY;
  return parsed.valueOf();
};

type InvoiceStatus = {
  color: string;
  text: "未开票" | "部分开票" | "已开票";
};

const getActualReceivableAmount = (row: ProjectReceivableNodeRow) => {
  const receivableAmount = toAmountNumber(row.receivableAmountTaxIncluded);
  if (receivableAmount !== null) return Math.max(receivableAmount, 0);

  const expectedAmount = toAmountNumber(row.expectedAmountTaxIncluded) ?? 0;
  const writeOffAmount = toAmountNumber(row.badDebtWriteOffAmountTotal) ?? 0;
  const recoveryAmount = toAmountNumber(row.badDebtRecoveryAmountTotal) ?? 0;
  return Math.max(expectedAmount - writeOffAmount + recoveryAmount, 0);
};

const getRemainingReceivableAmount = (row: ProjectReceivableNodeRow) =>
  Math.max(
    getActualReceivableAmount(row) - (toAmountNumber(row.actualAmountTotal) ?? 0),
    0,
  );

const getInvoiceAmountTotal = (row: ProjectReceivableNodeRow) =>
  (row.actualNodes ?? []).reduce((sum, actualNode) => {
    if (!actualNode.invoiceDate) return sum;
    return sum + (toAmountNumber(actualNode.actualAmountTaxIncluded) ?? 0);
  }, 0);

const getInvoiceStatus = (row: ProjectReceivableNodeRow): InvoiceStatus => {
  const actualNodes = row.actualNodes ?? [];
  const invoiceAmountTotal = getInvoiceAmountTotal(row);
  const actualReceivableAmount = getActualReceivableAmount(row);

  if (
    actualNodes.length === 0 ||
    toCentAmount(invoiceAmountTotal) <= 0
  ) {
    return { text: "未开票", color: "default" };
  }

  if (toCentAmount(invoiceAmountTotal) < toCentAmount(actualReceivableAmount)) {
    return { text: "部分开票", color: "processing" };
  }

  return { text: "已开票", color: "success" };
};

const isFullyBadDebtRow = (row: ProjectReceivableNodeRow) => {
  const expectedAmount = toAmountNumber(row.expectedAmountTaxIncluded) ?? 0;
  const actualAmount = toAmountNumber(row.actualAmountTotal) ?? 0;
  const writeOffAmount = toAmountNumber(row.badDebtWriteOffAmountTotal) ?? 0;
  const recoveryAmount = toAmountNumber(row.badDebtRecoveryAmountTotal) ?? 0;
  const badDebtAmount = Math.max(writeOffAmount - recoveryAmount, 0);

  if (toCentAmount(expectedAmount) <= 0) return false;

  return (
    toCentAmount(actualAmount) <= 0 &&
    toCentAmount(badDebtAmount) >= toCentAmount(expectedAmount)
  );
};

const isCollectionAmountMatched = (row: ProjectReceivableNodeRow) => {
  const actualReceivableAmount = getActualReceivableAmount(row);
  const actualAmount = toAmountNumber(row.actualAmountTotal) ?? 0;

  return (
    toCentAmount(actualReceivableAmount) > 0 &&
    toCentAmount(actualAmount) >= toCentAmount(actualReceivableAmount)
  );
};

const ProjectReceivableNodeTable = ({
  title,
  rows,
  stageOptions,
  canManageProject,
  canManageBadDebtRecords = false,
  onAddNode,
  onDeleteNode,
  onEditNode,
  onCollectNode,
  onEditActualNode,
  onDelayNode,
  onCreateBadDebtRecord,
  onEditBadDebtRecord,
  onHistoryChanged,
  onViewDetails,
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
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delaying, setDelaying] = useState(false);
  const [delayTargetRow, setDelayTargetRow] =
    useState<ProjectReceivableNodeRow | null>(null);
  const [delayForm] = Form.useForm<ReceivableNodeDelayFormValues>();
  const [badDebtModalOpen, setBadDebtModalOpen] = useState(false);
  const [badDebtSubmitting, setBadDebtSubmitting] = useState(false);
  const [badDebtTargetRow, setBadDebtTargetRow] =
    useState<ProjectReceivableNodeRow | null>(null);
  const [editingBadDebtRecord, setEditingBadDebtRecord] = useState<
    NonNullable<ProjectReceivableNodeRow["badDebtRecords"]>[number] | null
  >(null);
  const [historyEditModalOpen, setHistoryEditModalOpen] = useState(false);
  const [historyEditSubmitting, setHistoryEditSubmitting] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyEditForm] =
    Form.useForm<ReceivableDelayHistoryEditFormValues>();

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
      const byDate =
        getExpectedDateTs(left.expectedDate) -
        getExpectedDateTs(right.expectedDate);
      if (byDate !== 0) return byDate;

      const leftSortOrder = Number(left.sortOrder ?? 0);
      const rightSortOrder = Number(right.sortOrder ?? 0);
      if (leftSortOrder !== rightSortOrder)
        return leftSortOrder - rightSortOrder;

      return String(left.id).localeCompare(String(right.id));
    });
  }, [rows]);

  const columns = useMemo<ProColumns<ProjectReceivableNodeRow>[]>(
    () => [
      {
        title: "收款阶段",
        dataIndex: "stageOptionId",
        fixed: "left",
        width: 100,
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
          rules: [{ required: true, message: "请选择收款阶段" }],
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
        width: 220,
        editable: false,
        render: (_dom, row) => {
          const actualAmount = toAmountNumber(row.actualAmountTotal) ?? 0;
          const expectedAmount =
            toAmountNumber(row.expectedAmountTaxIncluded) ?? 0;
          const writeOffAmount =
            toAmountNumber(row.badDebtWriteOffAmountTotal) ?? 0;
          const recoveryAmount =
            toAmountNumber(row.badDebtRecoveryAmountTotal) ?? 0;
          const badDebtAmount = writeOffAmount - recoveryAmount;
          const hasBadDebtAmount = badDebtAmount !== 0;
          const actualPercent =
            expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0;
          const badDebtPercent =
            expectedAmount > 0 ? (badDebtAmount / expectedAmount) * 100 : 0;
          const actualBarPercent = getBarPercent(actualPercent);
          const badDebtBarPercent = getBarPercent(
            Math.min(100 - actualBarPercent, badDebtPercent),
          );
          const receivableBarPercent = getBarPercent(
            Math.max(100 - actualBarPercent - badDebtBarPercent, 0),
          );
          const actualBarColor =
            actualBarPercent + badDebtBarPercent >= 100 && badDebtAmount <= 0
              ? "#52c41a"
              : "#1677ff";

          return (
            <div style={{ minWidth: 140, lineHeight: 1.1 }}>
              <Typography.Text
                style={{
                  display: "block",
                  marginBottom: 0,
                  fontSize: 12,
                  lineHeight: 1.1,
                }}
              >{`实收 ${actualAmount.toLocaleString("zh-CN")} / 预收 ${expectedAmount.toLocaleString("zh-CN")} 元`}</Typography.Text>
              <div
                style={{
                  position: "relative",
                  height: 6,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.06)",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${actualBarPercent}%`,
                    background: actualBarColor,
                    borderRadius:
                      badDebtBarPercent > 0 || receivableBarPercent > 0
                        ? "999px 0 0 999px"
                        : "999px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${actualBarPercent}%`,
                    width: `${badDebtBarPercent}%`,
                    background: "#BE2E2C",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${actualBarPercent + badDebtBarPercent}%`,
                    width: `${receivableBarPercent}%`,
                    background: "rgba(0,0,0,0.25)",
                    borderRadius:
                      actualBarPercent > 0 || badDebtBarPercent > 0
                        ? "0 999px 999px 0"
                        : "999px",
                  }}
                />
              </div>
              {hasBadDebtAmount ? (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: "#BE2E2C",
                    fontWeight: 600,
                  }}
                >
                  <span>
                    坏账 {formatBadDebtSignedAmount("WRITE_OFF", badDebtAmount)} 元
                  </span>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        valueType: "date",
        width: 110,
        render: (_dom, row) => {
          const dateText = row.expectedDate
            ? dayjs(row.expectedDate).format("YYYY-MM-DD")
            : "-";
          const delayCount = Array.isArray(row.expectedDateHistories)
            ? row.expectedDateHistories.length
            : 0;

          return (
            <div style={{ lineHeight: 1.25 }}>
              <div>{dateText}</div>
              {delayCount > 0 ? (
                <div
                  style={{
                    marginTop: 2,
                    color: "#BE2E2C",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {`已变动${delayCount}次`}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "开票状态",
        dataIndex: "invoiceStatus",
        width: 120,
        editable: false,
        render: (_dom, row) => {
          const invoiceStatus = getInvoiceStatus(row);
          const invoiceAmountTotal = getInvoiceAmountTotal(row);

          return (
            <div style={{ lineHeight: 1.3 }}>
              <Tag color={invoiceStatus.color}>{invoiceStatus.text}</Tag>
              {invoiceStatus.text !== "未开票" ? (
                <div
                  style={{
                    marginTop: 2,
                    color: "#1677ff",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {`已开票 ${formatAmount(invoiceAmountTotal)}`}
                </div>
              ) : null}
            </div>
          );
        },
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
                  ? "#BE2E2C"
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
        width: 180,
        render: (_text, row) => {
          const isCollectionCompleted =
            toPercentNumber(row.collectionProgressPercent) >= 100;

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
                      key: "collect",
                      label: "新增收款记录",
                      icon: <MoneyCollectOutlined />,
                      disabled: !canManageProject || isCollectionCompleted,
                    },
                    {
                      key: "badDebt",
                      label: "登记坏账",
                      icon: <WarningOutlined />,
                      disabled: !canManageBadDebtRecords,
                    },
                    {
                      key: "delay",
                      label: "修改预收日期",
                      icon: <CalendarOutlined />,
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
                    if (key === "collect") {
                      setCurrentCollectRow(row);
                      setActualModalOpen(true);
                      return;
                    }
                    if (key === "badDebt") {
                      setBadDebtTargetRow(row);
                      setBadDebtModalOpen(true);
                      return;
                    }
                    if (key === "delay") {
                      setDelayTargetRow(row);
                      setDelayModalOpen(true);
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
                {canManageProject || canManageBadDebtRecords ? (
                  <Button
                    variant="text"
                    color="primary"
                    style={{ paddingInline: 4 }}
                  >
                    更多操作
                  </Button>
                ) : (
                  <Button
                    variant="text"
                    color="primary"
                    style={{ paddingInline: 4 }}
                    disabled
                  >
                    更多操作
                  </Button>
                )}
              </Dropdown>
            </Space>
          );
        },
      },
    ],
    [
      canManageBadDebtRecords,
      canManageProject,
      onDeleteNode,
      onViewDetails,
      stageOptions,
      stageValueEnum,
    ],
  );

  return (
    <>
      <Card
        title={title}
        type="inner"
        styles={{ body: { padding: 0 } }}
      >
        <ProTable<ProjectReceivableNodeRow>
          style={{ marginTop: 1 }}
          rowKey="id"
          columns={columns}
          dataSource={sortedRows}
          search={false}
          options={false}
          pagination={false}
          toolBarRender={false}
          scroll={{ x: "max-content" }}
          rowClassName={(record) => {
            if (isFullyBadDebtRow(record)) {
              return "receivable-node-row-bad-debt";
            }
            if (isCollectionAmountMatched(record)) {
              return "receivable-node-row-complete";
            }
            return "";
          }}
        />
        <style jsx global>{`
          .receivable-node-row-bad-debt > td.ant-table-cell {
            background: rgba(190, 46, 44, 0.1) !important;
          }
          .receivable-node-row-complete > td.ant-table-cell {
            background: #eff6e6 !important;
          }
        `}</style>

        <div style={{ marginTop: 8, paddingInline: 16, paddingBottom: 16 }}>
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
      </Card>

      <ProjectReceivableActualNodeModal
        open={actualModalOpen}
        loading={collecting}
        maxAmountTaxIncluded={
          editingActualNode || !currentCollectRow
            ? undefined
            : getRemainingReceivableAmount(currentCollectRow)
        }
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
        title={editingActualNode ? "编辑收款记录" : "新增收款记录"}
        initialValues={
          editingActualNode
            ? {
                actualAmountTaxIncluded:
                  editingActualNode.actualAmountTaxIncluded ?? undefined,
                actualDate: editingActualNode.actualDate
                  ? dayjs(editingActualNode.actualDate)
                  : undefined,
                invoiceDate: editingActualNode.invoiceDate
                  ? dayjs(editingActualNode.invoiceDate)
                  : undefined,
                remark: editingActualNode.remark ?? undefined,
                remarkNeedsAttention: Boolean(
                  editingActualNode.remarkNeedsAttention,
                ),
              }
            : currentCollectRow
              ? {
                  actualAmountTaxIncluded:
                    getRemainingReceivableAmount(currentCollectRow),
                }
              : undefined
        }
      />
      <ProjectReceivableBadDebtRecordModal
        open={badDebtModalOpen}
        loading={badDebtSubmitting}
        onCancel={() => {
          setBadDebtModalOpen(false);
          setBadDebtTargetRow(null);
          setEditingBadDebtRecord(null);
        }}
        onSubmit={async (values) => {
          if (
            editingBadDebtRecord &&
            onEditBadDebtRecord
          ) {
            try {
              setBadDebtSubmitting(true);
              await onEditBadDebtRecord(editingBadDebtRecord.id, values);
              setBadDebtModalOpen(false);
              setEditingBadDebtRecord(null);
            } finally {
              setBadDebtSubmitting(false);
            }
            return;
          }
          if (!badDebtTargetRow || !onCreateBadDebtRecord) return;
          try {
            setBadDebtSubmitting(true);
            await onCreateBadDebtRecord(badDebtTargetRow, values);
            setBadDebtModalOpen(false);
            setBadDebtTargetRow(null);
          } finally {
            setBadDebtSubmitting(false);
          }
        }}
        title={editingBadDebtRecord ? "编辑坏账记录" : "坏账记录"}
        initialValues={
          editingBadDebtRecord
            ? {
                createActualNode: Boolean(editingBadDebtRecord.actualNodeId),
                type: editingBadDebtRecord.type,
                amountTaxIncluded:
                  toAmountNumber(editingBadDebtRecord.amountTaxIncluded) ??
                  undefined,
                occurredAt: editingBadDebtRecord.occurredAt
                  ? dayjs(editingBadDebtRecord.occurredAt)
                  : undefined,
                reason: editingBadDebtRecord.reason ?? undefined,
                remark: editingBadDebtRecord.remark ?? undefined,
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
        title="编辑收款延后记录"
        open={historyEditModalOpen}
        width={780}
        forceRender
        confirmLoading={historyEditSubmitting}
        destroyOnHidden
        onCancel={() => {
          setHistoryEditModalOpen(false);
          setEditingHistoryId(null);
          historyEditForm.resetFields();
        }}
        onOk={() => {
          void (async () => {
            if (!editingHistoryId) return;
            const values = await historyEditForm.validateFields();
            setHistoryEditSubmitting(true);
            try {
              const response = await fetch(
                `/api/project-receivable-node-expected-date-histories/${editingHistoryId}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reason: values.reason?.trim() || null,
                    remark: values.remark?.trim() || null,
                  }),
                },
              );
              if (!response.ok) return;
              setHistoryEditModalOpen(false);
              setEditingHistoryId(null);
              historyEditForm.resetFields();
              await onHistoryChanged?.();
            } finally {
              setHistoryEditSubmitting(false);
            }
          })();
        }}
      >
        <Form form={historyEditForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="原预收日期"
                name="originalExpectedDate"
                required
                rules={[
                  { required: true, message: "原预收日期不能为空" },
                  {
                    validator: async (_, value: string | undefined) => {
                      if (!value || !String(value).trim()) {
                        throw new Error("原预收日期不能为空");
                      }
                    },
                  },
                ]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="修改后日期"
                name="updatedExpectedDate"
                required
                rules={[
                  { required: true, message: "修改后日期不能为空" },
                  {
                    validator: async (_, value: string | undefined) => {
                      if (!value || !String(value).trim()) {
                        throw new Error("修改后日期不能为空");
                      }
                    },
                  },
                ]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="原因"
                name="reason"
                required
                rules={[{ required: true, message: "请输入原因" }]}
              >
                <Input.TextArea rows={3} placeholder="请输入原因" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={3} placeholder="请输入备注（选填）" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      <Modal
        title="收款变动"
        open={delayModalOpen}
        width={780}
        forceRender
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
            let values: ReceivableNodeDelayFormValues;
            try {
              values = await delayForm.validateFields();
            } catch {
              return;
            }
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
              originalExpectedDate: delayTargetRow?.expectedDate
                ? dayjs(delayTargetRow.expectedDate).format("YYYY-MM-DD")
                : undefined,
              delayedExpectedDate: delayTargetRow?.expectedDate
                ? dayjs(delayTargetRow.expectedDate)
                : undefined,
              delayReason: undefined,
              delayRemark: undefined,
            });
            return;
          }
          delayForm.resetFields();
        }}
      >
        <Form form={delayForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="原预收日期"
                name="originalExpectedDate"
                required
                rules={[
                  { required: true, message: "原预收日期不能为空" },
                  {
                    validator: async (_, value: string | undefined) => {
                      if (!value || !String(value).trim()) {
                        throw new Error("原预收日期不能为空");
                      }
                    },
                  },
                ]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="现预收日期"
                name="delayedExpectedDate"
                required
                rules={[
                  { required: true, message: "请选择现预收日期" },
                  {
                    validator: async (_, value: Dayjs | undefined) => {
                      if (!value || !delayTargetRow?.expectedDate) return;
                      const current = dayjs(delayTargetRow.expectedDate);
                      if (!current.isValid()) return;
                      if (value.isSame(current, "day")) {
                        throw new Error("现预收日期不能与原预收日期相同");
                      }
                    },
                  },
                ]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="变动原因"
                name="delayReason"
                required
                rules={[{ required: true, message: "请输入变动原因" }]}
              >
                <Input.TextArea rows={3} placeholder="请输入变动原因" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="备注" name="delayRemark">
                <Input.TextArea rows={3} placeholder="请输入备注（选填）" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectReceivableNodeTable;
