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
};

type PricingTableRow = {
  key: string;
  category: string;
  targetValue: string;
  bottomValue: string;
  remark: ReactNode;
};

const ProjectPricingStrategyRangeTable = ({ pricingStrategy, projectName }: Props) => {
  const agencyFeeRate = pricingStrategy.agencyFeeRate ?? 0;
  const bottomAgencyFeeAmount = useMemo(
    () => (pricingStrategy.bottomLinePrice * agencyFeeRate) / 100,
    [agencyFeeRate, pricingStrategy.bottomLinePrice],
  );
  const targetAgencyFeeAmount = useMemo(
    () => (pricingStrategy.targetPrice * agencyFeeRate) / 100,
    [agencyFeeRate, pricingStrategy.targetPrice],
  );
  const executionCostRemark = useMemo(
    () => formatExecutionCostRemark(pricingStrategy),
    [pricingStrategy],
  );

  const plannedBreakEven = useMemo(
    () =>
      getOutsourceAmount(pricingStrategy) +
      pricingStrategy.plannedLaborCost +
      pricingStrategy.plannedMiddleOfficeCost +
      bottomAgencyFeeAmount +
      pricingStrategy.rentCost +
      (pricingStrategy.plannedExecutionCost ?? 0),
    [bottomAgencyFeeAmount, pricingStrategy],
  );

  const suggestedBreakEven = useMemo(
    () =>
      getOutsourceAmount(pricingStrategy) +
      pricingStrategy.suggestedLaborCost +
      pricingStrategy.suggestedMiddleOfficeCost +
      targetAgencyFeeAmount +
      pricingStrategy.rentCost +
      (pricingStrategy.plannedExecutionCost ?? 0),
    [pricingStrategy, targetAgencyFeeAmount],
  );

  const laborRateTarget = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return `${Math.round(
      (pricingStrategy.suggestedLaborCost / pricingStrategy.targetPrice) * 100,
    )}%`;
  }, [pricingStrategy.suggestedLaborCost, pricingStrategy.targetPrice]);

  const laborRateBottom = useMemo(() => {
    if (!pricingStrategy.bottomLinePrice) return "-";
    return `${Math.round(
      (pricingStrategy.plannedLaborCost / pricingStrategy.bottomLinePrice) * 100,
    )}%`;
  }, [pricingStrategy.plannedLaborCost, pricingStrategy.bottomLinePrice]);

  const totalCostRateTarget = useMemo(() => {
    if (!pricingStrategy.targetPrice) return "-";
    return `${Math.round((suggestedBreakEven / pricingStrategy.targetPrice) * 100)}%`;
  }, [pricingStrategy.targetPrice, suggestedBreakEven]);

  const totalCostRateBottom = useMemo(() => {
    if (!pricingStrategy.bottomLinePrice) return "-";
    return `${Math.round((plannedBreakEven / pricingStrategy.bottomLinePrice) * 100)}%`;
  }, [plannedBreakEven, pricingStrategy.bottomLinePrice]);

  const costBenchmarkRemark = useMemo(() => {
    if (typeof pricingStrategy.targetPrice !== "number") return "成本基准参考：-";
    return `成本基准参考：${formatAmount(
      Math.round(pricingStrategy.targetPrice * 0.53),
    )}`;
  }, [pricingStrategy.targetPrice]);

  const tableRows = useMemo<PricingTableRow[]>(
    () => [
      {
        key: "income",
        category: "收入",
        targetValue: formatAmount(pricingStrategy.targetPrice),
        bottomValue: formatAmount(pricingStrategy.bottomLinePrice),
        remark: "-",
      },
      {
        key: "outsource",
        category: "外包成本",
        targetValue: formatAmount(getOutsourceAmount(pricingStrategy)),
        bottomValue: formatAmount(getOutsourceAmount(pricingStrategy)),
        remark: formatOutsourceRemark(pricingStrategy),
      },
      {
        key: "labor",
        category: "人力成本",
        targetValue: formatAmount(pricingStrategy.suggestedLaborCost),
        bottomValue: formatAmount(pricingStrategy.plannedLaborCost),
        remark: "-",
      },
      {
        key: "laborRate",
        category: "人力成本率",
        targetValue: laborRateTarget,
        bottomValue: laborRateBottom,
        remark: "-",
      },
      {
        key: "agencyFee",
        category: "中介费",
        targetValue: formatAmount(targetAgencyFeeAmount),
        bottomValue: formatAmount(bottomAgencyFeeAmount),
        remark: agencyFeeRate > 0 ? `费率：${agencyFeeRate}%` : "-",
      },
      {
        key: "rent",
        category: "租金成本",
        targetValue: formatAmount(pricingStrategy.rentCost),
        bottomValue: formatAmount(pricingStrategy.rentCost),
        remark: "-",
      },
      {
        key: "execution",
        category: "执行费用成本",
        targetValue: formatAmount(pricingStrategy.plannedExecutionCost),
        bottomValue: formatAmount(pricingStrategy.plannedExecutionCost),
        remark: executionCostRemark,
      },
      {
        key: "middleOffice",
        category: "中台成本",
        targetValue: formatAmount(pricingStrategy.suggestedMiddleOfficeCost),
        bottomValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
        remark: "-",
      },
      {
        key: "breakEven",
        category: "盈亏平衡",
        targetValue: formatAmount(suggestedBreakEven),
        bottomValue: formatAmount(plannedBreakEven),
        remark: costBenchmarkRemark,
      },
      {
        key: "totalCostRatio",
        category: "总费用占比",
        targetValue: totalCostRateTarget,
        bottomValue: totalCostRateBottom,
        remark: "-",
      },
    ],
    [
      executionCostRemark,
      costBenchmarkRemark,
      laborRateBottom,
      laborRateTarget,
      plannedBreakEven,
      pricingStrategy,
      suggestedBreakEven,
      bottomAgencyFeeAmount,
      targetAgencyFeeAmount,
      agencyFeeRate,
      totalCostRateBottom,
      totalCostRateTarget,
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
        title: "理想报价",
        dataIndex: "targetValue",
        key: "targetValue",
        width: 220,
        align: "center",
        onCell: (record) =>
          record.key === "outsource" ||
          record.key === "rent" ||
          record.key === "execution"
            ? { colSpan: 2 }
            : {},
      },
      {
        title: "最低报价",
        dataIndex: "bottomValue",
        key: "bottomValue",
        width: 220,
        align: "center",
        onCell: (record) =>
          record.key === "outsource" ||
          record.key === "rent" ||
          record.key === "execution"
            ? { colSpan: 0 }
            : {},
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
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

export default ProjectPricingStrategyRangeTable;
