"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Card, Empty, Progress, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import ProjectReimbursementCreateAction from "@/components/project-detail/ProjectReimbursementCreateAction";
import ProjectPeriodValue from "@/components/project-detail/ProjectPeriodValue";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

type Props = {
  projectId: string;
  projectName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  adjustments?: WorkdayAdjustmentRange[];
  canManageProject?: boolean;
};

type ExecutionCostItem = {
  costTypeOptionId: string;
  budgetAmount: number | null;
  costTypeOption?: {
    id: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type ReimbursementRow = {
  amount: number | string | null;
  categoryOption?: {
    id: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type TableRow = {
  key: string;
  costTypeOptionId: string;
  costTypeOption?: ExecutionCostItem["costTypeOption"];
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercent: number;
  statusLabel: "正常" | "预警" | "超支";
  statusColor: string;
  statusTextColor: string;
};

const toMoneyNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatMoney = (value: number) => {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const FIRST_COL_PADDING = 24;

const resolveUsageStatus = (budgetAmount: number, usedAmount: number) => {
  const usagePercent =
    budgetAmount > 0
      ? (usedAmount / budgetAmount) * 100
      : usedAmount > 0
        ? 101
        : 0;

  if (usagePercent <= 80) {
    return {
      usagePercent,
      statusLabel: "正常" as const,
      statusColor: "#6F9838",
      statusTextColor: "#6F9838",
    };
  }

  if (usagePercent <= 100) {
    return {
      usagePercent,
      statusLabel: "预警" as const,
      statusColor: "#E4A344",
      statusTextColor: "#815723",
    };
  }

  return {
    usagePercent,
    statusLabel: "超支" as const,
    statusColor: "#D15651",
    statusTextColor: "#983B37",
  };
};

const ProjectExecutionCostMonitoringCard = ({
  projectId,
  projectName,
  startDate,
  endDate,
  adjustments = [],
  canManageProject = false,
}: Props) => {
  const normalizedProjectName = projectName || "未命名项目";
  const [loading, setLoading] = useState(false);
  const [executionCostItems, setExecutionCostItems] = useState<
    ExecutionCostItem[]
  >([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRow[]>([]);

  const fetchExecutionCostItems = useCallback(async () => {
    const res = await fetch(
      `/api/project-financial-structures?projectId=${projectId}`,
      { cache: "no-store" },
    );
    const data = res.ok ? await res.json() : [];
    const structure = Array.isArray(data) ? data[0] : null;
    const items = Array.isArray(structure?.executionCostItems)
      ? (structure.executionCostItems as ExecutionCostItem[])
      : [];
    setExecutionCostItems(items);
  }, [projectId]);

  const fetchReimbursements = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/reimbursements`, {
      cache: "no-store",
    });
    const data = res.ok ? await res.json() : [];
    setReimbursements(Array.isArray(data) ? (data as ReimbursementRow[]) : []);
  }, [projectId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchExecutionCostItems(), fetchReimbursements()]);
    } finally {
      setLoading(false);
    }
  }, [fetchExecutionCostItems, fetchReimbursements]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId !== projectId) return;
      void fetchReimbursements();
    };
    window.addEventListener(
      "project-reimbursements-updated",
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "project-reimbursements-updated",
        handler as EventListener,
      );
    };
  }, [fetchReimbursements, projectId]);

  const usedByOptionId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of reimbursements) {
      const optionId = row?.categoryOption?.id;
      if (!optionId) continue;
      const next = (map.get(optionId) ?? 0) + toMoneyNumber(row.amount);
      map.set(optionId, next);
    }
    return map;
  }, [reimbursements]);

  const rows = useMemo<TableRow[]>(() => {
    return (executionCostItems ?? [])
      .filter((item) => item?.costTypeOptionId)
      .map((item) => {
        const budgetAmount = toMoneyNumber(item.budgetAmount);
        const usedAmount = usedByOptionId.get(item.costTypeOptionId) ?? 0;
        const remainingAmount = budgetAmount - usedAmount;
        const usage = resolveUsageStatus(budgetAmount, usedAmount);

        return {
          key: item.costTypeOptionId,
          costTypeOptionId: item.costTypeOptionId,
          costTypeOption: item.costTypeOption ?? null,
          budgetAmount,
          usedAmount,
          remainingAmount,
          usagePercent: Math.round(usage.usagePercent),
          statusLabel: usage.statusLabel,
          statusColor: usage.statusColor,
          statusTextColor: usage.statusTextColor,
        };
      });
  }, [executionCostItems, usedByOptionId]);

  const columns = useMemo<ColumnsType<TableRow>>(
    () => [
      {
        title: "费用类型",
        dataIndex: "costTypeOption",
        key: "costTypeOption",
        onHeaderCell: () => ({ style: { paddingLeft: FIRST_COL_PADDING } }),
        onCell: () => ({ style: { paddingLeft: FIRST_COL_PADDING } }),
        render: (value: TableRow["costTypeOption"]) => value?.value || "-",
      },
      {
        title: "预算金额",
        dataIndex: "budgetAmount",
        key: "budgetAmount",
        render: (value: number) => `¥${formatMoney(value)}`,
      },
      {
        title: "已报销",
        dataIndex: "usedAmount",
        key: "usedAmount",
        render: (value: number) => `¥${formatMoney(value)}`,
      },
      {
        title: "剩余额度",
        dataIndex: "remainingAmount",
        key: "remainingAmount",
        render: (value: number, record) => (
          <span
            style={{
              color: record.statusTextColor,
              fontWeight: record.statusLabel === "超支" ? 700 : undefined,
            }}
          >
            ¥{formatMoney(value)}
          </span>
        ),
      },
      {
        title: "使用进度",
        dataIndex: "usagePercent",
        key: "usagePercent",
        width: 220,
        render: (value: number, record) => (
          <Progress
            percent={Math.max(0, Math.min(100, value))}
            strokeColor={record.statusColor}
            size="small"
            showInfo
            format={() => `${value}%`}
          />
        ),
      },
      {
        title: "状态",
        key: "status",
        width: 120,
        render: (_value, record) => (
          <Badge
            color={record.statusColor}
            text={
              <span style={{ color: record.statusTextColor, fontWeight: 700 }}>
                {record.statusLabel}
              </span>
            }
          />
        ),
      },
    ],
    [],
  );

  return (
    <Card
      title={
        <div style={{ marginTop: 14, marginBottom: 8 }}>
          <AppLink href={`/projects/${projectId}?step=4&tab=realtime-cost`}>
            {normalizedProjectName}
          </AppLink>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            项目周期：
            <ProjectPeriodValue
              startDate={startDate}
              endDate={endDate}
              adjustments={adjustments}
            />
          </div>
        </div>
      }
      extra={
        <ProjectReimbursementCreateAction
          projectId={projectId}
          projectName={normalizedProjectName}
          canManageProject={canManageProject}
          buttonType="default"
          onCreated={() => {
            void fetchReimbursements();
          }}
        />
      }
      styles={{ body: { padding: "0 0 4px" } }}
      style={{ boxShadow: "none", backgroundColor: "#fff" }}
      loading={loading}
    >
      {rows.length > 0 ? (
        <>
          <style jsx global>{`
            .execution-cost-table .ant-table-tbody > tr.execution-cost-last-row > td {
              border-bottom: none !important;
            }
          `}</style>
          <Table<TableRow>
            className="execution-cost-table"
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            rowClassName={(_record, index) =>
              index === rows.length - 1 ? "execution-cost-last-row" : ""
            }
            pagination={false}
          />
        </>
      ) : (
        <Empty description="未配置执行费用成本" />
      )}
    </Card>
  );
};

export default ProjectExecutionCostMonitoringCard;
