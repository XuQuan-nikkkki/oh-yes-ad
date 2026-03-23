"use client";

import { useMemo } from "react";
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

type Props = {
  pricingStrategy: ProjectPricingStrategy;
  projectName: string;
  clientBudget?: string | null;
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
      (pricingStrategy.plannedExecutionCost ?? 0),
    [customerBudgetAgencyFeeAmount, pricingStrategy],
  );

  const suggestedBreakEven = useMemo(
    () =>
      getOutsourceAmount(pricingStrategy) +
      pricingStrategy.plannedLaborCost +
      pricingStrategy.plannedMiddleOfficeCost +
      suggestedAgencyFeeAmount +
      pricingStrategy.rentCost +
      (pricingStrategy.plannedExecutionCost ?? 0),
    [pricingStrategy, suggestedAgencyFeeAmount],
  );

  const laborCostRateByCustomerBudget = useMemo(() => {
    if (!customerBudgetAmount) return "-";
    return `${Math.round(
      (pricingStrategy.plannedLaborCost / customerBudgetAmount) * 100,
    )}%`;
  }, [customerBudgetAmount, pricingStrategy.plannedLaborCost]);

  const laborCostRateBySuggestedQuote = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return `${Math.round(
      (pricingStrategy.plannedLaborCost / pricingStrategy.targetPrice) * 100,
    )}%`;
  }, [pricingStrategy.plannedLaborCost, pricingStrategy.targetPrice]);

  const totalCostRateByCustomerBudget = useMemo(() => {
    if (!customerBudgetAmount) return "-";
    return `${Math.round((customerBudgetBreakEven / customerBudgetAmount) * 100)}%`;
  }, [customerBudgetAmount, customerBudgetBreakEven]);

  const totalCostRateBySuggestedQuote = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return `${Math.round((suggestedBreakEven / pricingStrategy.targetPrice) * 100)}%`;
  }, [pricingStrategy.targetPrice, suggestedBreakEven]);

  const costBenchmarkRemark = useMemo(() => {
    if (!customerBudgetAmount) return "成本基准参考：-";
    return `成本基准参考：${formatAmount(
      Math.round(customerBudgetAmount * 0.53),
    )}`;
  }, [customerBudgetAmount]);

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
        customerBudgetValue: formatAmount(pricingStrategy.plannedExecutionCost),
        suggestedQuoteValue: formatAmount(pricingStrategy.plannedExecutionCost),
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
        width: 180,
        align: "center",
      },
      {
        title: "客户报价(不含税)",
        dataIndex: "customerBudgetValue",
        key: "customerBudgetValue",
        width: 260,
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
        width: 260,
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
    <Table<PricingTableRow>
      rowKey="key"
      pagination={false}
      bordered
      columns={columns}
      dataSource={tableRows}
      size="small"
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
  );
};

export default ProjectPricingStrategyTargetTable;
