"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Progress,
  Row,
  Space,
  Timeline,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { formatBadDebtSignedAmount } from "@/lib/format-bad-debt-amount";
import EllipsisPopoverText from "@/components/EllipsisPopoverText";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
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
    remark?: string | null;
    remarkNeedsAttention?: boolean;
  }>;
  badDebtRecords?: Array<{
    id: string;
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

const getExpectedDateTs = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return Number.POSITIVE_INFINITY;
  return parsed.valueOf();
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
  onDeleteActualNode,
  onDelayNode,
  onCreateBadDebtRecord,
  onEditBadDebtRecord,
  onDeleteBadDebtRecord,
  onHistoryChanged,
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

  useEffect(() => {
    const validIdSet = new Set(rows.map((row) => row.id));
    setExpandedRowKeys((prev) =>
      prev.filter((key) => validIdSet.has(String(key))),
    );
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
          const actualAmount = toAmountNumber(row.actualAmountTotal) ?? 0;
          const expectedAmount =
            toAmountNumber(row.expectedAmountTaxIncluded) ?? 0;
          const percent = toPercentNumber(row.collectionProgressPercent);
          const isAmountMatched = Boolean(row.isCollectionAmountMatched);
          const writeOffAmount =
            toAmountNumber(row.badDebtWriteOffAmountTotal) ?? 0;
          const recoveryAmount =
            toAmountNumber(row.badDebtRecoveryAmountTotal) ?? 0;
          const pendingAmount = toAmountNumber(row.pendingAmount) ?? 0;

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
              <Progress
                percent={percent}
                showInfo={false}
                size="small"
                strokeColor={isAmountMatched ? "#52c41a" : undefined}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "2px 8px",
                  marginTop: 2,
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                <span style={{ color: "#BE2E2C" }}>
                  坏账核销{" "}
                  {formatBadDebtSignedAmount("WRITE_OFF", writeOffAmount)}
                </span>
                <span style={{ color: "#387E22" }}>
                  坏账收回{" "}
                  {formatBadDebtSignedAmount("RECOVERY", recoveryAmount)}
                </span>
                <span>待处理 {pendingAmount.toLocaleString("zh-CN")}</span>
              </div>
            </div>
          );
        },
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        valueType: "date",
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
        width: 220,
        render: (_text, row) => {
          const isCollectionCompleted =
            toPercentNumber(row.collectionProgressPercent) >= 100;
          const collectButton = (
            <Button
              variant="text"
              color="primary"
              style={{ paddingInline: 4 }}
              disabled={!canManageProject || isCollectionCompleted}
              onClick={() => {
                setCurrentCollectRow(row);
                setActualModalOpen(true);
              }}
            >
              收款
            </Button>
          );

          return (
            <Space size={4} wrap={false}>
              {isCollectionCompleted ? (
                <Popover content="该阶段已完成收款" trigger="hover">
                  <span style={{ display: "inline-block" }}>
                    {collectButton}
                  </span>
                </Popover>
              ) : (
                collectButton
              )}
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
                收款变动
              </Button>
              <Button
                variant="text"
                color="primary"
                style={{ paddingInline: 4 }}
                disabled={!canManageBadDebtRecords}
                onClick={() => {
                  setBadDebtTargetRow(row);
                  setBadDebtModalOpen(true);
                }}
              >
                坏账
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
          );
        },
      },
    ],
    [onDeleteNode, canManageProject, stageOptions, stageValueEnum],
  );

  const renderActualNodesTable = (record: ProjectReceivableNodeRow) => (
    <div>
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
        实收记录
      </div>
      <Divider style={{ margin: "8px 0" }} />
      <Timeline
        style={{ marginTop: 2 }}
        items={(record.actualNodes ?? []).map((actualNode) => {
          const actualDate = dayjs(actualNode.actualDate).isValid()
            ? dayjs(actualNode.actualDate).format("YYYY-MM-DD")
            : "-";
          const amount = formatAmount(actualNode.actualAmountTaxIncluded);
          const remark = String(actualNode.remark ?? "").trim();

          return {
            key: actualNode.id,
            content: (
              <div style={{ lineHeight: 1.45 }}>
                <div style={{ marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 500,
                    }}
                  >
                    {actualDate}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: "#1677ff",
                      fontWeight: 600,
                    }}
                  >
                    {amount}
                  </span>
                </div>
                {remark ? (
                  <div
                    style={{
                      marginBottom: 2,
                      fontSize: 13,
                      color: Boolean(actualNode.remarkNeedsAttention)
                        ? "#ff4d4f"
                        : "rgba(0,0,0,0.65)",
                    }}
                  >{`备注：${remark}`}</div>
                ) : null}
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                  <Space size={8}>
                    <Button
                      type="link"
                      size="small"
                      style={{
                        paddingInline: 0,
                        fontSize: 12,
                        height: "auto",
                        lineHeight: 1,
                      }}
                      disabled={!canManageProject}
                      onClick={() => {
                        setEditingActualNode(actualNode);
                        setActualModalOpen(true);
                      }}
                    >
                      修改
                    </Button>
                    <Popconfirm
                      title="确认删除该条实收记录吗？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={!canManageProject}
                      onConfirm={() => {
                        void onDeleteActualNode?.(actualNode.id);
                      }}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        style={{
                          paddingInline: 0,
                          height: "auto",
                          lineHeight: 1,
                          fontSize: 12,
                        }}
                        disabled={!canManageProject}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ),
          };
        })}
      />
    </div>
  );

  const renderBadDebtRecordsTimeline = (record: ProjectReceivableNodeRow) => (
    <div>
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
        坏账记录
      </div>
      <Divider style={{ margin: "8px 0" }} />
      <Timeline
        style={{ marginTop: 2 }}
        items={(record.badDebtRecords ?? []).map((badDebtRecord) => {
          const occurredAt = dayjs(badDebtRecord.occurredAt).isValid()
            ? dayjs(badDebtRecord.occurredAt).format("YYYY-MM-DD")
            : "-";
          const isRecovery = badDebtRecord.type === "RECOVERY";
          const typeText = isRecovery ? "坏账收回" : "坏账核销";
          const reason = String(badDebtRecord.reason ?? "").trim();
          const remark = String(badDebtRecord.remark ?? "").trim();
          const createdAt = dayjs(badDebtRecord.createdAt).isValid()
            ? dayjs(badDebtRecord.createdAt).format("YYYY-MM-DD")
            : "-";
          const createdBy =
            badDebtRecord.createdByEmployee?.name?.trim() || "-";

          return {
            key: badDebtRecord.id,
            color: isRecovery ? "green" : "red",
            content: (
              <div style={{ lineHeight: 1.45 }}>
                <div style={{ marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 500,
                    }}
                  >
                    {occurredAt}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: isRecovery ? "#387E22" : "#BE2E2C",
                      fontWeight: 600,
                    }}
                  >
                    {typeText}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: isRecovery ? "#387E22" : "#BE2E2C",
                      fontWeight: 600,
                    }}
                  >
                    {`${formatBadDebtSignedAmount(
                      badDebtRecord.type,
                      badDebtRecord.amountTaxIncluded,
                    )} 元`}
                  </span>
                </div>
                {reason ? (
                  <div
                    style={{
                      marginBottom: 2,
                      fontSize: 13,
                      color: "rgba(0,0,0,0.65)",
                    }}
                  >{`原因：${reason}`}</div>
                ) : null}
                {remark ? (
                  <div
                    style={{
                      marginBottom: 2,
                      fontSize: 13,
                      color: "rgba(0,0,0,0.65)",
                    }}
                  >{`备注：${remark}`}</div>
                ) : null}
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                  <span>{`${createdAt} · ${createdBy}`}</span>
                  <Space size={8} style={{ marginLeft: 8 }}>
                    <Button
                      type="link"
                      size="small"
                      style={{
                        paddingInline: 0,
                        fontSize: 12,
                        height: "auto",
                        lineHeight: 1,
                      }}
                      disabled={!canManageBadDebtRecords}
                      onClick={() => {
                        setEditingBadDebtRecord(badDebtRecord);
                        setBadDebtModalOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确认删除该条坏账记录吗？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={!canManageBadDebtRecords}
                      onConfirm={() => {
                        void onDeleteBadDebtRecord?.(badDebtRecord.id);
                      }}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        style={{
                          paddingInline: 0,
                          height: "auto",
                          lineHeight: 1,
                          fontSize: 12,
                        }}
                        disabled={!canManageBadDebtRecords}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ),
          };
        })}
      />
    </div>
  );

  const renderExpectedDateHistoryTimeline = (
    record: ProjectReceivableNodeRow,
  ) => {
    const histories = Array.isArray(record.expectedDateHistories)
      ? [...record.expectedDateHistories]
      : [];
    const sorted = histories.sort((left, right) => {
      const leftTs = dayjs(left.changedAt).isValid()
        ? dayjs(left.changedAt).valueOf()
        : Number.POSITIVE_INFINITY;
      const rightTs = dayjs(right.changedAt).isValid()
        ? dayjs(right.changedAt).valueOf()
        : Number.POSITIVE_INFINITY;
      return leftTs - rightTs;
    });

    return (
      <div>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          收款变动记录
        </div>
        <Divider style={{ margin: "8px 0" }} />
        <Timeline
          style={{ marginTop: 2 }}
          items={sorted.map((history) => {
            const fromDate = dayjs(history.fromExpectedDate).isValid()
              ? dayjs(history.fromExpectedDate).format("YYYY-MM-DD")
              : "-";
            const toDate = dayjs(history.toExpectedDate).isValid()
              ? dayjs(history.toExpectedDate).format("YYYY-MM-DD")
              : "-";
            const dateDiffDays =
              dayjs(history.fromExpectedDate).isValid() &&
              dayjs(history.toExpectedDate).isValid()
                ? dayjs(history.toExpectedDate)
                    .startOf("day")
                    .diff(dayjs(history.fromExpectedDate).startOf("day"), "day")
                : 0;
            const changeText =
              dateDiffDays > 0
                ? `延后${dateDiffDays}天`
                : dateDiffDays < 0
                  ? `提前${Math.abs(dateDiffDays)}天`
                  : "无变化";
            const reason = String(history.reason ?? "").trim() || "-";
            const remark = String(history.remark ?? "").trim();
            const changedAt = dayjs(history.changedAt).isValid()
              ? dayjs(history.changedAt).format("YYYY-MM-DD")
              : "-";
            const changedBy = history.changedByEmployee?.name?.trim() || "-";

            return {
              key: history.id,
              content: (
                <div style={{ lineHeight: 1.45 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(0,0,0,0.45)",
                        textDecoration: "line-through",
                        fontWeight: 500,
                      }}
                    >
                      {fromDate}
                    </span>
                    <span
                      style={{
                        margin: "0 6px",
                        color: "rgba(0,0,0,0.45)",
                        fontWeight: 500,
                      }}
                    >
                      -&gt;
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: dateDiffDays >= 0 ? "#BE2E2C" : "#387E22",
                        fontWeight: 600,
                      }}
                    >
                      {toDate}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: dateDiffDays >= 0 ? "#BE2E2C" : "#387E22",
                        fontWeight: 500,
                      }}
                    >
                      {changeText}
                    </span>
                  </div>
                  <div
                    style={{
                      marginBottom: 2,
                      fontSize: 13,
                      color: "rgba(0,0,0,0.65)",
                    }}
                  >{`原因：${reason}`}</div>
                  {remark ? (
                    <div
                      style={{
                        marginBottom: 2,
                        fontSize: 13,
                        color: "rgba(0,0,0,0.65)",
                      }}
                    >{`备注：${remark}`}</div>
                  ) : null}
                  <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                    <span>{`${changedAt} · ${changedBy}`}</span>
                    <Space size={8} style={{ marginLeft: 8 }}>
                      <Button
                        type="link"
                        size="small"
                        style={{
                          paddingInline: 0,
                          fontSize: 12,
                          height: "auto",
                          lineHeight: 1,
                        }}
                        disabled={!canManageProject}
                        onClick={() => {
                          setEditingHistoryId(history.id);
                          historyEditForm.setFieldsValue({
                            originalExpectedDate: dayjs(
                              history.fromExpectedDate,
                            ).isValid()
                              ? dayjs(history.fromExpectedDate).format(
                                  "YYYY-MM-DD",
                                )
                              : "-",
                            updatedExpectedDate: dayjs(
                              history.toExpectedDate,
                            ).isValid()
                              ? dayjs(history.toExpectedDate).format(
                                  "YYYY-MM-DD",
                                )
                              : "-",
                            reason:
                              String(history.reason ?? "").trim() || undefined,
                            remark:
                              String(history.remark ?? "").trim() || undefined,
                          });
                          setHistoryEditModalOpen(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除该条延后记录吗？"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        disabled={!canManageProject}
                        onConfirm={() => {
                          void (async () => {
                            const response = await fetch(
                              `/api/project-receivable-node-expected-date-histories/${history.id}`,
                              { method: "DELETE" },
                            );
                            if (!response.ok) return;
                            await onHistoryChanged?.();
                          })();
                        }}
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          style={{
                            paddingInline: 0,
                            height: "auto",
                            lineHeight: 1,
                            fontSize: 12,
                          }}
                          disabled={!canManageProject}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </div>
              ),
            };
          })}
        />
      </div>
    );
  };

  return (
    <>
      <ProTable<ProjectReceivableNodeRow>
        style={{ marginTop: 1 }}
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
        dataSource={sortedRows}
        search={false}
        options={false}
        pagination={false}
        toolBarRender={false}
        scroll={{ x: "max-content" }}
        rowClassName={(record) =>
          Boolean(record.isCollectionAmountMatched)
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
          rowExpandable: (record) =>
            (record.actualNodes?.length ?? 0) > 0 ||
            (record.expectedDateHistories?.length ?? 0) > 0 ||
            (record.badDebtRecords?.length ?? 0) > 0,
          expandedRowRender: (record) => (
            <div
              style={{ paddingLeft: 32 }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {(() => {
                const hasActualNodes = (record.actualNodes?.length ?? 0) > 0;
                const hasExpectedDateHistories =
                  (record.expectedDateHistories?.length ?? 0) > 0;
                const hasBadDebtRecords =
                  (record.badDebtRecords?.length ?? 0) > 0;
                if (
                  !hasActualNodes &&
                  !hasExpectedDateHistories &&
                  !hasBadDebtRecords
                ) {
                  return null;
                }

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      columnGap: 16,
                      alignItems: "stretch",
                    }}
                  >
                    <div>{renderActualNodesTable(record)}</div>
                    <div
                      style={{
                        borderLeft: "1px solid #f0f0f0",
                        paddingLeft: 16,
                      }}
                    >
                      {renderExpectedDateHistoryTimeline(record)}
                    </div>
                    <div
                      style={{
                        borderLeft: "1px solid #f0f0f0",
                        paddingLeft: 16,
                      }}
                    >
                      {renderBadDebtRecordsTimeline(record)}
                    </div>
                  </div>
                );
              })()}
            </div>
          ),
        }}
      />
      <style jsx global>{`
        .receivable-node-row-complete > td.ant-table-cell {
          background: #eff6e6 !important;
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
        maxAmountTaxIncluded={
          editingActualNode || !currentCollectRow
            ? undefined
            : Math.max(
                Number(currentCollectRow.expectedAmountTaxIncluded ?? 0) -
                  (toAmountNumber(currentCollectRow.actualAmountTotal) ?? 0),
                0,
              )
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
                    Math.max(
                      Number(currentCollectRow.expectedAmountTaxIncluded ?? 0) -
                        (toAmountNumber(currentCollectRow.actualAmountTotal) ??
                          0),
                      0,
                    ),
                  actualDate: currentCollectRow.expectedDate
                    ? dayjs(currentCollectRow.expectedDate)
                    : undefined,
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
