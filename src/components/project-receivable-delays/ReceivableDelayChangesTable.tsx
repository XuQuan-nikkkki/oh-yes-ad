"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import { getSigningCompanyTagColor } from "@/lib/constants";

export type ReceivableDelayChangeRow = {
  key: string;
  nodeId: string;
  legalEntityId: string | null;
  accountName: string;
  projectId: string | null;
  projectName: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageName: string;
  keyDeliverable: string;
  expectedAmount: number;
  actualAmount: number;
  collectionProgressPercent: number;
  fromExpectedDate: string;
  fromExpectedDateTs: number;
  toExpectedDate: string;
  toExpectedDateTs: number;
  delayCount: number;
  createdDate: string;
  createdTs: number;
  createdBy: string;
  changeReason: string;
  changeRemark: string;
};

type ReceivableDelayChangesTableProps = {
  rows: ReceivableDelayChangeRow[];
  loading?: boolean;
  hideProjectDeliverableColumn?: boolean;
  hideStageColumn?: boolean;
  hideAmountColumn?: boolean;
  showDetailLink?: boolean;
  showDelayCount?: boolean;
  showIndexColumn?: boolean;
  sortByCreatedAt?: "asc" | "desc" | null;
  showOverdueHintInToDate?: boolean;
  showStatusBorderOnFirstCol?: boolean;
  onDetailClick?: (row: ReceivableDelayChangeRow) => void;
};

const formatAmountWithYen = (value?: number | null) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "-";
  return `¥${numberValue.toLocaleString("zh-CN")}`;
};

const renderAccountTag = (name: string) => (
  <Tag
    style={{
      marginInlineEnd: 0,
      border: "none",
      borderRadius: 999,
      paddingInline: 10,
      color: "rgba(0,0,0,0.88)",
      backgroundColor: getSigningCompanyTagColor(name),
    }}
  >
    {name || "-"}
  </Tag>
);

export default function ReceivableDelayChangesTable({
  rows,
  loading = false,
  hideProjectDeliverableColumn = false,
  hideStageColumn = false,
  hideAmountColumn = false,
  showDetailLink = true,
  showDelayCount = true,
  showIndexColumn = false,
  sortByCreatedAt = null,
  showOverdueHintInToDate = false,
  showStatusBorderOnFirstCol = false,
  onDetailClick,
}: ReceivableDelayChangesTableProps) {
  const sortedRows = useMemo(() => {
    if (!sortByCreatedAt) return rows;
    return rows.slice().sort((left, right) =>
      sortByCreatedAt === "asc"
        ? left.createdTs - right.createdTs
        : right.createdTs - left.createdTs,
    );
  }, [rows, sortByCreatedAt]);

  const columns: ColumnsType<ReceivableDelayChangeRow> = [];
  if (showIndexColumn) {
    columns.push({
      title: "序号",
      key: "index",
      width: 70,
      render: (_value, _row, index) => index + 1,
    });
  }
  columns.push({
      title: "原预收日期",
      dataIndex: "fromExpectedDate",
      width: 110,
      onCell: (row) => {
        if (!showStatusBorderOnFirstCol) return {};
        const toDate = dayjs(row.toExpectedDate);
        const isOverdue =
          toDate.isValid() && toDate.isBefore(dayjs().startOf("day"), "day");
        return {
          style: {
            borderLeft: `3px solid ${isOverdue ? "#BE2E2C" : "#387E22"}`,
          },
        };
      },
      render: (value, row) => (
        <div style={{ lineHeight: 1.3 }}>
          <div>{String(value || "-")}</div>
          {showDelayCount ? (
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                fontWeight: 500,
                color: "#BE2E2C",
              }}
            >
            <span>{`变动${row.delayCount}次`}</span>
              {showDetailLink && row.delayCount > 1 ? (
                <span
                  style={{
                    marginLeft: 6,
                    color: "#8C8C8C",
                    cursor: onDetailClick ? "pointer" : "default",
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDetailClick?.(row);
                  }}
                >
                  详情
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    });
  columns.push({
      title: "现预收日期",
      dataIndex: "toExpectedDate",
      width: 110,
      render: (value, row) => {
        const fromDate = dayjs(row.fromExpectedDate);
        const toDate = dayjs(row.toExpectedDate);
        const diffDays =
          fromDate.isValid() && toDate.isValid()
            ? toDate.startOf("day").diff(fromDate.startOf("day"), "day")
            : 0;
        const changeText =
          diffDays < 0 ? `提前${Math.abs(diffDays)}天` : `推迟${diffDays}天`;
        const changeColor = diffDays < 0 ? "#387E22" : "#BE2E2C";
        const overdueDays =
          showOverdueHintInToDate && toDate.isValid()
            ? dayjs().startOf("day").diff(toDate.startOf("day"), "day")
            : 0;
        return (
          <div style={{ lineHeight: 1.3 }}>
            <div>{String(value || "-")}</div>
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                fontWeight: 500,
                color: changeColor,
              }}
            >
              {changeText}
              {overdueDays > 0 ? (
                <span style={{ color: "#BE2E2C" }}>{` · 逾期${overdueDays}天`}</span>
              ) : null}
            </div>
          </div>
        );
      },
    });
  if (!hideProjectDeliverableColumn) {
    columns.push({
      title: "项目/关键交付物",
      dataIndex: "projectName",
      width: 200,
      render: (value, row) => {
        const projectName = value || "-";
        const deliverableText = row.keyDeliverable || "-";
        return (
          <div style={{ lineHeight: 1.3 }}>
            <div>
              {row.projectId ? (
                <AppLink href={`/projects/${row.projectId}`}>{projectName}</AppLink>
              ) : (
                <span>{projectName}</span>
              )}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: "#8C8C8C" }}>
              {deliverableText}
            </div>
          </div>
        );
      },
    });
  }
  if (!hideStageColumn) {
    columns.push({
      title: "阶段",
      dataIndex: "stageName",
      width: 100,
      render: (_value, row) => (
        <SelectOptionTag
          option={
            row.stageOption
              ? {
                  id: row.stageOption.id,
                  value: row.stageOption.value,
                  color: row.stageOption.color ?? undefined,
                }
              : row.stageName && row.stageName !== "-"
                ? { id: `${row.key}-stage`, value: row.stageName }
                : null
          }
        />
      ),
    });
  }
  if (!hideAmountColumn) {
    columns.push({
      title: "金额",
      dataIndex: "expectedAmount",
      width: 120,
      render: (value, row) => (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700 }}>
            {formatAmountWithYen(Number(value ?? 0))}
          </div>
          {row.actualAmount > 0 ? (
            <div style={{ marginTop: 2, fontSize: 12, color: "#8C8C8C" }}>
              {`已收${Number(row.actualAmount).toLocaleString("zh-CN")}元`}
            </div>
          ) : null}
        </div>
      ),
    });
  }
  columns.push({
      title: "原因/备注",
      key: "reasonRemark",
      render: (_value, row) => {
        const reasonText = String(row.changeReason || "-");
        const remarkText = String(row.changeRemark || "").trim();
        const hasRemark = remarkText.length > 0 && remarkText !== "-";
        return (
          <div style={{ lineHeight: 1.4 }}>
            <div>{`原因：${reasonText}`}</div>
            {hasRemark ? <div>{`备注：${remarkText}`}</div> : null}
          </div>
        );
      },
    });
  columns.push({
      title: "收款账户",
      dataIndex: "accountName",
      width: 110,
      render: (value) => renderAccountTag(String(value ?? "-")),
    });
  columns.push({
      title: "创建信息",
      key: "createdInfo",
      width: 140,
      render: (_value, row) => (
        <span style={{ fontSize: 12, color: "rgba(0, 0, 0, 0.65)" }}>
          {row.createdDate} · {row.createdBy}
        </span>
      ),
    });

  return (
    <Table
      rowKey="key"
      loading={loading}
      size="small"
      columns={columns}
      dataSource={sortedRows}
      pagination={false}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "暂无变动数据" }}
    />
  );
}
