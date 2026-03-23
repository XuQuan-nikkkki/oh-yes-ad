import type { ReactNode } from "react";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";

export type ProjectPricingStrategy = {
  id: string;
  mode?: "range" | "target";
  estimatedDuration: number;
  outsourceCost?: number | null;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
  outsourceRemark?: string | null;
  rentCost: number;
  plannedLaborCost: number;
  suggestedLaborCost: number;
  plannedMiddleOfficeCost: number;
  suggestedMiddleOfficeCost: number;
  plannedExecutionCost?: number | null;
  agencyFeeRate?: number | null;
  bottomLinePrice: number;
  bottomLineProfit: number;
  targetPrice: number;
  targetProfit: number;
  costItems?: Array<{
    id: string;
    costTypeOptionId: string;
    budgetAmount?: number | null;
    costTypeOption?: {
      value?: string | null;
    } | null;
  }>;
};

export const QUOTE_SECTION_HEADER_KEY = "__quote_section_header__";

export const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatAmountWithUnit = (value?: number | null) => {
  const amount = formatAmount(value);
  return amount === "-" ? "-" : `${amount} 元`;
};

export const formatExecutionCostRemark = (
  strategy?: ProjectPricingStrategy | null,
): ReactNode => {
  const validItems = (strategy?.costItems ?? []).filter(
    (item) => typeof item.budgetAmount === "number" && item.costTypeOption?.value,
  );

  if (validItems.length === 0) return "-";

  return (
    <div style={{ lineHeight: 1.6, textAlign: "center" }}>
      {validItems.map((item) => (
        <div key={item.id}>{`${item.costTypeOption?.value}：${formatAmount(item.budgetAmount)}`}</div>
      ))}
    </div>
  );
};

export const formatOutsourceRemark = (
  strategy?: ProjectPricingStrategy | null,
): ReactNode => {
  const itemsText = formatProjectOutsourceItemsText(strategy?.outsourceItems);
  const remark = strategy?.outsourceRemark?.trim();
  if (!remark && itemsText === "-") return "-";
  if (!remark) {
    return (
      <div style={{ lineHeight: 1.6, textAlign: "center", whiteSpace: "pre-wrap" }}>
        {itemsText}
      </div>
    );
  }
  if (itemsText === "-") {
    return (
      <div style={{ lineHeight: 1.6, textAlign: "center", whiteSpace: "pre-wrap" }}>
        {remark}
      </div>
    );
  }
  return (
    <div style={{ lineHeight: 1.6, textAlign: "center" }}>
      <div style={{ whiteSpace: "pre-wrap" }}>{itemsText}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{remark}</div>
    </div>
  );
};

export const getOutsourceAmount = (strategy?: ProjectPricingStrategy | null) =>
  getProjectOutsourceTotal(strategy?.outsourceItems);
