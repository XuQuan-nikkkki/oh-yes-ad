"use client";

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  formatAmount,
  formatExecutionCostRemark,
  formatOutsourceRemark,
  getOutsourceAmount,
  type ProjectPricingStrategy,
} from "@/components/project-detail/pricing-strategy/types";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";

type Props = {
  pricingStrategy: ProjectPricingStrategy;
  projectName: string;
  clientBudget?: number | null;
};

type PricingTableRow = {
  key: string;
  category: string;
  customerBudgetValue: string;
  suggestedQuoteValue: string;
  remark: ReactNode;
};

const toMoney = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").replaceAll("，", "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const ProjectPricingStrategyTargetTable = ({
  pricingStrategy,
  projectName,
  clientBudget,
}: Props) => {
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  const projectCostBaselineRatio = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingProjectCostBaselineRatio,
      ),
    [systemSettings],
  );
  const formatRate = (numerator: number, denominator: number) => {
    if (!denominator) return "-";
    const value = (numerator / denominator) * 100;
    return `${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
  };

  const agencyFeeRate = pricingStrategy.agencyFeeRate ?? 0;
  const executionCostRemark = useMemo(
    () => formatExecutionCostRemark(pricingStrategy),
    [pricingStrategy],
  );

  const customerBudgetAmount = useMemo(() => {
    const value = toMoney(clientBudget);
    if (value > 0) return value;
    const fallback = toMoney(pricingStrategy.bottomLinePrice);
    return fallback > 0 ? fallback : null;
  }, [clientBudget, pricingStrategy.bottomLinePrice]);

  const customerBudgetAgencyFeeAmount = useMemo(() => {
    if (!customerBudgetAmount) return 0;
    return (customerBudgetAmount * agencyFeeRate) / 100;
  }, [agencyFeeRate, customerBudgetAmount]);

  const suggestedAgencyFeeAmount = useMemo(
    () => (pricingStrategy.targetPrice * agencyFeeRate) / 100,
    [agencyFeeRate, pricingStrategy.targetPrice],
  );

  const customerBudgetBreakEven = useMemo(
    () =>
      getOutsourceAmount(pricingStrategy) +
      pricingStrategy.plannedLaborCost +
      pricingStrategy.plannedMiddleOfficeCost +
      customerBudgetAgencyFeeAmount +
      pricingStrategy.rentCost +
      (pricingStrategy.executionCost ?? 0),
    [customerBudgetAgencyFeeAmount, pricingStrategy],
  );

  const suggestedBreakEven = useMemo(
    () =>
      getOutsourceAmount(pricingStrategy) +
      pricingStrategy.plannedLaborCost +
      pricingStrategy.plannedMiddleOfficeCost +
      suggestedAgencyFeeAmount +
      pricingStrategy.rentCost +
      (pricingStrategy.executionCost ?? 0),
    [pricingStrategy, suggestedAgencyFeeAmount],
  );

  const laborCostRateByCustomerBudget = useMemo(() => {
    if (!customerBudgetAmount) return "-";
    return formatRate(pricingStrategy.plannedLaborCost, customerBudgetAmount);
  }, [customerBudgetAmount, pricingStrategy.plannedLaborCost]);

  const laborCostRateBySuggestedQuote = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return formatRate(pricingStrategy.plannedLaborCost, pricingStrategy.targetPrice);
  }, [pricingStrategy.plannedLaborCost, pricingStrategy.targetPrice]);

  const totalCostRateByCustomerBudget = useMemo(() => {
    if (!customerBudgetAmount) return "-";
    return formatRate(customerBudgetBreakEven, customerBudgetAmount);
  }, [customerBudgetAmount, customerBudgetBreakEven]);

  const totalCostRateBySuggestedQuote = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return formatRate(suggestedBreakEven, pricingStrategy.targetPrice);
  }, [pricingStrategy.targetPrice, suggestedBreakEven]);

  const costBenchmarkRemark = useMemo(() => {
    if (!customerBudgetAmount) return "成本基准参考：-";
    return `成本基准参考：${formatAmount(
      customerBudgetAmount * (projectCostBaselineRatio / 100),
    )}`;
  }, [customerBudgetAmount, projectCostBaselineRatio]);

  const tableRows = useMemo<PricingTableRow[]>(
    () => [
      {
        key: "income",
        category: "收入",
        customerBudgetValue: customerBudgetAmount
          ? formatAmount(customerBudgetAmount)
          : "-",
        suggestedQuoteValue: formatAmount(pricingStrategy.targetPrice),
        remark: "-",
      },
      {
        key: "outsource",
        category: "外包成本",
        customerBudgetValue: formatAmount(getOutsourceAmount(pricingStrategy)),
        suggestedQuoteValue: formatAmount(getOutsourceAmount(pricingStrategy)),
        remark: formatOutsourceRemark(pricingStrategy),
      },
      {
        key: "labor",
        category: "人力成本",
        customerBudgetValue: formatAmount(pricingStrategy.plannedLaborCost),
        suggestedQuoteValue: formatAmount(pricingStrategy.plannedLaborCost),
        remark: "-",
      },
      {
        key: "laborRate",
        category: "人力成本率",
        customerBudgetValue: laborCostRateByCustomerBudget,
        suggestedQuoteValue: laborCostRateBySuggestedQuote,
        remark: "-",
      },
      {
        key: "agencyFee",
        category: "中介费",
        customerBudgetValue: formatAmount(customerBudgetAgencyFeeAmount),
        suggestedQuoteValue: formatAmount(suggestedAgencyFeeAmount),
        remark: agencyFeeRate > 0 ? `费率：${agencyFeeRate}%` : "-",
      },
      {
        key: "rent",
        category: "租金成本",
        customerBudgetValue: formatAmount(pricingStrategy.rentCost),
        suggestedQuoteValue: formatAmount(pricingStrategy.rentCost),
        remark: "-",
      },
      {
        key: "execution",
        category: "执行费用成本",
        customerBudgetValue: formatAmount(pricingStrategy.executionCost),
        suggestedQuoteValue: formatAmount(pricingStrategy.executionCost),
        remark: executionCostRemark,
      },
      {
        key: "middleOffice",
        category: "中台成本",
        customerBudgetValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
        suggestedQuoteValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
        remark: "-",
      },
      {
        key: "breakEven",
        category: "盈亏平衡",
        customerBudgetValue: formatAmount(customerBudgetBreakEven),
        suggestedQuoteValue: formatAmount(suggestedBreakEven),
        remark: costBenchmarkRemark,
      },
      {
        key: "totalCostRate",
        category: "总费用占比",
        customerBudgetValue: totalCostRateByCustomerBudget,
        suggestedQuoteValue: totalCostRateBySuggestedQuote,
        remark: "-",
      },
    ],
    [
      costBenchmarkRemark,
      customerBudgetAmount,
      customerBudgetAgencyFeeAmount,
      customerBudgetBreakEven,
      executionCostRemark,
      laborCostRateByCustomerBudget,
      laborCostRateBySuggestedQuote,
      pricingStrategy,
      suggestedAgencyFeeAmount,
      suggestedBreakEven,
      agencyFeeRate,
      totalCostRateByCustomerBudget,
      totalCostRateBySuggestedQuote,
    ],
  );

  const columns = useMemo<ColumnsType<PricingTableRow>>(
    () => [
      {
        title: "类别",
        dataIndex: "category",
        key: "category",
        width: 160,
        align: "center",
      },
      {
        title: "客户报价(不含税)",
        dataIndex: "customerBudgetValue",
        key: "customerBudgetValue",
        width: 220,
        align: "center",
        onCell: (record) =>
          record.key === "outsource" ||
          record.key === "labor" ||
          record.key === "rent" ||
          record.key === "execution" ||
          record.key === "middleOffice" ||
          record.key === "breakEven"
            ? { colSpan: 2 }
            : {},
      },
      {
        title: "建议报价",
        dataIndex: "suggestedQuoteValue",
        key: "suggestedQuoteValue",
        width: 220,
        align: "center",
        onCell: (record) =>
          record.key === "outsource" ||
          record.key === "labor" ||
          record.key === "rent" ||
          record.key === "execution" ||
          record.key === "middleOffice" ||
          record.key === "breakEven"
            ? { colSpan: 0 }
            : {},
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 300,
        align: "center",
      },
    ],
    [],
  );

  const tableTitle = `【${projectName || "未命名项目"}】${pricingStrategy.estimatedDuration}个工作日报价参考`;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ width: 900, margin: "0 auto" }}>
        <Table<PricingTableRow>
          rowKey="key"
          pagination={false}
          bordered
          columns={columns}
          dataSource={tableRows}
          size="small"
          tableLayout="fixed"
          style={{ width: 900 }}
          title={() => (
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              {tableTitle}
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default ProjectPricingStrategyTargetTable;
