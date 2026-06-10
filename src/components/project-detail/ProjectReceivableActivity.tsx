"use client";

import dayjs from "dayjs";
import {
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileDoneOutlined,
  MinusOutlined,
  PlusOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Table,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectReceivableActualNodeModal, {
  type ProjectReceivableActualNodeFormValues,
} from "@/components/project-detail/ProjectReceivableActualNodeModal";
import ProjectReceivableBadDebtRecordModal, {
  type ProjectReceivableBadDebtRecordFormValues,
} from "@/components/project-detail/ProjectReceivableBadDebtRecordModal";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import TimelineCell from "@/components/project-detail/project-receivable-activity/TimelineCell";
import { buildActivityRows } from "@/components/project-detail/project-receivable-activity/buildActivityRows";
import type {
  ActivityTableRow,
  ActivityType,
  ProjectReceivableActivityRow,
} from "@/components/project-detail/project-receivable-activity/types";

type Props = {
  rows: ProjectReceivableActivityRow[];
  stageOptions: Array<{ id: string; value: string; color?: string | null }>;
  initialSelectedStageOptionIds?: string[];
  initialSelectedEventFilters?: ActivityEventFilterValue[];
  canManageProject: boolean;
  canManageBadDebtRecords?: boolean;
  onEditNode?: (
    row: ProjectReceivableActivityRow,
    values: ProjectReceivableNodeFormValues,
  ) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => Promise<void> | void;
  onEditActualNode?: (
    actualNodeId: string,
    values: ProjectReceivableActualNodeFormValues,
  ) => Promise<void> | void;
  onDeleteActualNode?: (actualNodeId: string) => Promise<void> | void;
  onEditBadDebtRecord?: (
    badDebtRecordId: string,
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => Promise<void> | void;
  onDeleteBadDebtRecord?: (badDebtRecordId: string) => Promise<void> | void;
  onHistoryChanged?: () => Promise<void> | void;
};

const getEventTypeConfig = (eventType: ActivityType) => {
  if (eventType === "RECEIVABLE_NODE") {
    return {
      icon: <WalletOutlined />,
      color: "#722ed1",
      text: "预收",
    };
  }
  if (eventType === "COLLECTION") {
    return {
      icon: <DollarOutlined />,
      color: "#1677ff",
      text: "收款",
    };
  }
  if (eventType === "INVOICE") {
    return {
      icon: <FileDoneOutlined />,
      color: "#13a8a8",
      text: "开票",
    };
  }
  if (eventType === "EXPECTED_DATE_CHANGE") {
    return {
      icon: <CalendarOutlined />,
      color: "#fa8c16",
      text: "计划收款日变更",
    };
  }
  if (eventType === "BAD_DEBT_RECOVERY") {
    return {
      icon: <PlusOutlined />,
      color: "#389e0d",
      text: "坏账收回",
    };
  }
  return {
    icon: <MinusOutlined />,
    color: "#ff4d4f",
    text: "坏账核销",
  };
};

type HistoryEditFormValues = {
  originalExpectedDate?: string;
  updatedExpectedDate?: string;
  reason: string;
};

type ActivityEventFilterValue =
  | "COLLECTION"
  | "EXPECTED_DATE_CHANGE"
  | "BAD_DEBT";

export default function ProjectReceivableActivity({
  rows,
  stageOptions,
  initialSelectedStageOptionIds,
  initialSelectedEventFilters,
  canManageProject,
  canManageBadDebtRecords = false,
  onEditNode,
  onDeleteNode,
  onEditActualNode,
  onDeleteActualNode,
  onEditBadDebtRecord,
  onDeleteBadDebtRecord,
  onHistoryChanged,
}: Props) {
  const [selectedStageOptionIds, setSelectedStageOptionIds] = useState<string[]>(
    initialSelectedStageOptionIds ?? [],
  );
  const [selectedEventFilters, setSelectedEventFilters] = useState<
    ActivityEventFilterValue[]
  >(initialSelectedEventFilters ?? []);
  const detailTextColor = "rgba(0,0,0,0.65)";
  const [messageApi, contextHolder] = message.useMessage();
  const [editingNodeRow, setEditingNodeRow] =
    useState<ProjectReceivableActivityRow | null>(null);
  const [editingActualRow, setEditingActualRow] =
    useState<ActivityTableRow["sourceActualNode"] | null>(null);
  const [editingBadDebtRow, setEditingBadDebtRow] =
    useState<ActivityTableRow["sourceBadDebtRecord"] | null>(null);
  const [editingHistoryRow, setEditingHistoryRow] =
    useState<ActivityTableRow["sourceHistory"] | null>(null);
  const [nodeSubmitting, setNodeSubmitting] = useState(false);
  const [actualSubmitting, setActualSubmitting] = useState(false);
  const [badDebtSubmitting, setBadDebtSubmitting] = useState(false);
  const [historySubmitting, setHistorySubmitting] = useState(false);
  const [historyForm] = Form.useForm<HistoryEditFormValues>();
  const stageFilterOptions = useMemo(
    () => {
      const stageOptionIds = new Set(
        rows.map((row) => row.stageOptionId).filter((value) => Boolean(value)),
      );

      return stageOptions.reduce<Array<{ text: string; value: string }>>(
        (result, option) => {
          if (!stageOptionIds.has(option.id)) {
            return result;
          }

          result.push({
            text: option.value,
            value: option.id,
          });
          return result;
        },
        [],
      );
    },
    [rows, stageOptions],
  );
  const dataSource = useMemo(() => {
    const activityRows = buildActivityRows(rows);

    return activityRows.filter((row) => {
      const matchesStage =
        selectedStageOptionIds.length === 0 ||
        selectedStageOptionIds.includes(row.stageOptionId);

      if (!matchesStage) {
        return false;
      }

      if (selectedEventFilters.length === 0) {
        return true;
      }

      return selectedEventFilters.some((filter) => {
        if (filter === "COLLECTION") {
          return (
            row.eventType === "RECEIVABLE_NODE" ||
            row.eventType === "INVOICE" ||
            row.eventType === "COLLECTION"
          );
        }

        if (filter === "EXPECTED_DATE_CHANGE") {
          return row.eventType === "EXPECTED_DATE_CHANGE";
        }

        return (
          row.eventType === "BAD_DEBT_RECOVERY" ||
          row.eventType === "BAD_DEBT_WRITE_OFF"
        );
      });
    });
  }, [rows, selectedEventFilters, selectedStageOptionIds]);

  useEffect(() => {
    setSelectedStageOptionIds(initialSelectedStageOptionIds ?? []);
  }, [initialSelectedStageOptionIds]);

  useEffect(() => {
    setSelectedEventFilters(initialSelectedEventFilters ?? []);
  }, [initialSelectedEventFilters]);

  const columns = useMemo<ColumnsType<ActivityTableRow>>(
    () => [
      {
        title: "日期",
        dataIndex: "eventAtText",
        width: 160,
        onHeaderCell: () => ({
          style: { paddingLeft: 26 },
        }),
        onCell: () => ({
          style: { paddingLeft: 26 },
        }),
        render: (value: string, _record, index) => {
          const isFirst = index === 0;
          const isLast = index === dataSource.length - 1;

          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 90, display: "flex", alignItems: "center" }}>
                {value}
              </div>
              <TimelineCell isFirst={isFirst} isLast={isLast} />
            </div>
          );
        },
      },
      {
        title: "所属节点",
        dataIndex: "stageText",
        width: 110,
        filters: stageFilterOptions,
        filterMultiple: true,
        filteredValue:
          selectedStageOptionIds.length > 0 ? selectedStageOptionIds : null,
        render: (value: string, record) => (
          <SelectOptionQuickEditTag
            field="project.receivableNode.stage"
            disabled
            option={{
              id: value,
              value,
              color: record.stageColor ?? undefined,
            }}
            fallbackText="-"
          />
        ),
      },
      {
        title: "事件类型",
        dataIndex: "eventType",
        width: 160,
        filters: [
          { text: "预收/开票/收款", value: "COLLECTION" },
          { text: "计划收款日变更", value: "EXPECTED_DATE_CHANGE" },
          { text: "坏账记录", value: "BAD_DEBT" },
        ],
        filterMultiple: true,
        filteredValue:
          selectedEventFilters.length > 0 ? selectedEventFilters : null,
        render: (value: ActivityType, record) => {
          const config = getEventTypeConfig(value);

          return (
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    background: config.color,
                    fontSize: 9,
                  }}
                >
                  {config.icon}
                </span>
                <span style={{ color: config.color, fontWeight: 600 }}>
                  {config.text}
                </span>
              </div>
              {record.collectionDateDelta ? (
                <div
                  style={{
                    color: record.collectionDateDelta.color,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}
                >
                  {record.collectionDateDelta.text}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "事件详情",
        dataIndex: "detailText",
        width: 260,
        render: (value: string, record) => {
          if (
            record.eventType === "EXPECTED_DATE_CHANGE" &&
            record.expectedDateChangeDetail
          ) {
            const {
              fromDate,
              toDate,
              deltaText,
              deltaColor,
              reason,
            } = record.expectedDateChangeDetail;

            return (
              <div>
                <div style={{ fontSize: 13 }}>
                  <span
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      textDecoration: "line-through",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {fromDate}
                  </span>
                  <span
                    style={{
                      margin: "0 4px",
                      color: "rgba(0,0,0,0.45)",
                      fontSize: 12,
                    }}
                  >
                    {"->"}
                  </span>
                  <span style={{ color: "#BE2E2C", fontSize: 12, fontWeight: 600 }}>
                    {toDate}
                  </span>
                </div>
                {deltaText ? (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: deltaColor,
                    }}
                  >
                    {deltaText}
                  </div>
                ) : null}
                {reason ? (
                  <div style={{ fontSize: 13, color: detailTextColor }}>{`原因：${reason}`}</div>
                ) : null}
              </div>
            );
          }

          return (
            <span
              style={{
                color: record.detailIsAlert ? "#BE2E2C" : detailTextColor,
                fontSize: 13,
                whiteSpace: "pre-line",
              }}
            >
              {value}
            </span>
          );
        },
      },
      {
        title: "金额（元）",
        dataIndex: "amountText",
        width: 120,
        render: (value: string, record) => (
          <span style={{ color: record.amountColor, fontWeight: 600 }}>{value}</span>
        ),
      },
      {
        title: "操作",
        key: "actions",
        width: 120,
        render: (_value, record) => {
          const canEdit =
            record.eventType === "BAD_DEBT_RECOVERY" ||
            record.eventType === "BAD_DEBT_WRITE_OFF"
              ? canManageBadDebtRecords
              : canManageProject;

          return (
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                disabled={!canEdit}
                onClick={() => {
                  if (record.eventType === "RECEIVABLE_NODE") {
                    setEditingNodeRow(record.sourceRow);
                    return;
                  }
                  if (
                    record.eventType === "INVOICE" ||
                    record.eventType === "COLLECTION"
                  ) {
                    setEditingActualRow(record.sourceActualNode ?? null);
                    return;
                  }
                  if (
                    record.eventType === "BAD_DEBT_RECOVERY" ||
                    record.eventType === "BAD_DEBT_WRITE_OFF"
                  ) {
                    setEditingBadDebtRow(record.sourceBadDebtRecord ?? null);
                    return;
                  }
                  if (record.eventType === "EXPECTED_DATE_CHANGE") {
                    setEditingHistoryRow(record.sourceHistory ?? null);
                    historyForm.setFieldsValue({
                      originalExpectedDate: record.sourceHistory?.fromExpectedDate
                        ? dayjs(record.sourceHistory.fromExpectedDate).format("YYYY-MM-DD")
                        : "-",
                      updatedExpectedDate: record.sourceHistory?.toExpectedDate
                        ? dayjs(record.sourceHistory.toExpectedDate).format("YYYY-MM-DD")
                        : "-",
                      reason:
                        String(record.sourceHistory?.reason ?? "").trim() || undefined,
                    });
                  }
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除该条记录吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                disabled={!canEdit}
                onConfirm={() => {
                  void (async () => {
                    if (record.eventType === "RECEIVABLE_NODE" && onDeleteNode) {
                      await onDeleteNode(record.sourceRow.id);
                      return;
                    }
                    if (
                      (record.eventType === "INVOICE" ||
                        record.eventType === "COLLECTION") &&
                      record.sourceActualNode
                    ) {
                      await onDeleteActualNode?.(record.sourceActualNode.id);
                      return;
                    }
                    if (
                      (record.eventType === "BAD_DEBT_RECOVERY" ||
                        record.eventType === "BAD_DEBT_WRITE_OFF") &&
                      record.sourceBadDebtRecord
                    ) {
                      await onDeleteBadDebtRecord?.(record.sourceBadDebtRecord.id);
                      return;
                    }
                    if (
                      record.eventType === "EXPECTED_DATE_CHANGE" &&
                      record.sourceHistory
                    ) {
                      const response = await fetch(
                        `/api/project-receivable-node-expected-date-histories/${record.sourceHistory.id}`,
                        { method: "DELETE" },
                      );
                      if (!response.ok) {
                        messageApi.error("删除收款延后记录失败");
                        return;
                      }
                      messageApi.success("删除收款延后记录成功");
                      await onHistoryChanged?.();
                    }
                  })();
                }}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!canEdit}
                >
                  删除
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ],
    [
      canManageBadDebtRecords,
      canManageProject,
      dataSource.length,
      historyForm,
      messageApi,
      onDeleteActualNode,
      onDeleteBadDebtRecord,
      onDeleteNode,
      onHistoryChanged,
      selectedEventFilters,
      selectedStageOptionIds,
      stageFilterOptions,
    ],
  );

  if (dataSource.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="暂无收款动态" />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <Table<ActivityTableRow>
        style={{ marginTop: 1 }}
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        onChange={(_, filters) => {
          const nextStageOptionIds = Array.isArray(filters.stageText)
            ? filters.stageText.filter(
                (value): value is string => typeof value === "string",
              )
            : [];
          const nextEventFilters = Array.isArray(filters.eventType)
            ? filters.eventType.filter(
                (value): value is ActivityEventFilterValue =>
                  value === "COLLECTION" ||
                  value === "EXPECTED_DATE_CHANGE" ||
                  value === "BAD_DEBT",
              )
            : [];

          setSelectedStageOptionIds(nextStageOptionIds);
          setSelectedEventFilters(nextEventFilters);
        }}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        rowClassName={(record) =>
          record.eventType === "RECEIVABLE_NODE"
            ? "project-receivable-activity-node-row"
            : ""
        }
      />
      <style jsx global>{`
        .project-receivable-activity-node-row > td.ant-table-cell {
          background: rgba(114, 46, 209, 0.08) !important;
        }
      `}</style>
      <ProjectReceivableNodeModal
        open={Boolean(editingNodeRow)}
        title="编辑收款节点"
        loading={nodeSubmitting}
        onCancel={() => setEditingNodeRow(null)}
        onSubmit={async (values) => {
          if (!editingNodeRow || !onEditNode) return;
          setNodeSubmitting(true);
          try {
            await onEditNode(editingNodeRow, values);
            setEditingNodeRow(null);
          } finally {
            setNodeSubmitting(false);
          }
        }}
        stageOptions={stageOptions}
        initialValues={
          editingNodeRow
            ? {
                stage:
                  editingNodeRow.stageOption?.value ??
                  stageOptions.find((item) => item.id === editingNodeRow.stageOptionId)
                    ?.value ??
                  undefined,
                keyDeliverable: editingNodeRow.keyDeliverable,
                expectedAmountTaxIncluded: editingNodeRow.expectedAmountTaxIncluded,
                expectedDate: editingNodeRow.expectedDate
                  ? dayjs(editingNodeRow.expectedDate)
                  : undefined,
                remark: editingNodeRow.remark ?? undefined,
                remarkNeedsAttention: Boolean(editingNodeRow.remarkNeedsAttention),
              }
            : undefined
        }
      />
      <ProjectReceivableActualNodeModal
        open={Boolean(editingActualRow)}
        title="编辑收款记录"
        loading={actualSubmitting}
        onCancel={() => setEditingActualRow(null)}
        onSubmit={async (values) => {
          if (!editingActualRow) return;
          setActualSubmitting(true);
          try {
            await onEditActualNode?.(editingActualRow.id, values);
            setEditingActualRow(null);
          } finally {
            setActualSubmitting(false);
          }
        }}
        initialValues={
          editingActualRow
            ? {
                actualAmountTaxIncluded:
                  editingActualRow.actualAmountTaxIncluded ?? undefined,
                actualDate: editingActualRow.actualDate
                  ? dayjs(editingActualRow.actualDate)
                  : undefined,
                invoiceDate: editingActualRow.invoiceDate
                  ? dayjs(editingActualRow.invoiceDate)
                  : undefined,
                remark: editingActualRow.remark ?? undefined,
                remarkNeedsAttention: Boolean(editingActualRow.remarkNeedsAttention),
              }
            : undefined
        }
      />
      <ProjectReceivableBadDebtRecordModal
        open={Boolean(editingBadDebtRow)}
        title={editingBadDebtRow ? "编辑坏账记录" : "坏账记录"}
        loading={badDebtSubmitting}
        onCancel={() => setEditingBadDebtRow(null)}
        onSubmit={async (values) => {
          if (!editingBadDebtRow) return;
          setBadDebtSubmitting(true);
          try {
            await onEditBadDebtRecord?.(editingBadDebtRow.id, values);
            setEditingBadDebtRow(null);
          } finally {
            setBadDebtSubmitting(false);
          }
        }}
        initialValues={
          editingBadDebtRow
            ? {
                createActualNode: Boolean(editingBadDebtRow.actualNodeId),
                type: editingBadDebtRow.type,
                amountTaxIncluded: Number(editingBadDebtRow.amountTaxIncluded ?? 0),
                occurredAt: editingBadDebtRow.occurredAt
                  ? dayjs(editingBadDebtRow.occurredAt)
                  : undefined,
                reason: editingBadDebtRow.reason ?? undefined,
                remark: editingBadDebtRow.remark ?? undefined,
              }
            : undefined
        }
      />
      <Modal
        title="编辑收款延后记录"
        open={Boolean(editingHistoryRow)}
        width={780}
        confirmLoading={historySubmitting}
        destroyOnHidden
        onCancel={() => {
          setEditingHistoryRow(null);
          historyForm.resetFields();
        }}
        onOk={() => {
          void (async () => {
            if (!editingHistoryRow) return;
            const values = await historyForm.validateFields();
            setHistorySubmitting(true);
            try {
              const response = await fetch(
                `/api/project-receivable-node-expected-date-histories/${editingHistoryRow.id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reason: values.reason?.trim() || null,
                  }),
                },
              );
              if (!response.ok) {
                messageApi.error("编辑收款延后记录失败");
                return;
              }
              messageApi.success("编辑收款延后记录成功");
              setEditingHistoryRow(null);
              historyForm.resetFields();
              await onHistoryChanged?.();
            } finally {
              setHistorySubmitting(false);
            }
          })();
        }}
      >
        <Form form={historyForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="原预收日期" name="originalExpectedDate">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="修改后日期" name="updatedExpectedDate">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="原因"
                name="reason"
                rules={[{ required: true, message: "请输入原因" }]}
              >
                <Input.TextArea rows={3} placeholder="请输入原因" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
