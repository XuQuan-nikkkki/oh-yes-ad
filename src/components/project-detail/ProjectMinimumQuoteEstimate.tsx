"use client";

import { useEffect, useMemo } from "react";
import type { Project } from "@/types/projectDetail";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import {
  calculateMinimumQuote,
  type MinimumQuoteResult,
} from "@/lib/project-minimum-quote";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import StyledStatisticCard from "./StyledStatisticCard";
import styles from "./ProjectMinimumQuoteEstimate.module.css";

const formatAmount = (amount: number | null) =>
  amount === null
    ? "—"
    : amount.toLocaleString("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

const formatCurrency = (amount: number | null) =>
  amount === null ? "—" : `${formatAmount(amount)} 元`;

export const useMinimumQuote = (
  estimation?: Project["latestPlanningCostEstimation"],
) => {
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );

  useEffect(() => {
    if (estimation) void fetchSystemSettings();
  }, [estimation, fetchSystemSettings]);

  const costBaselineRatio = getSystemSettingNumberFromRecords(
    systemSettings,
    SYSTEM_SETTING_KEYS.pricingProjectCostBaselineRatio,
  );
  const middleOfficeAverageMonthlyCost = getSystemSettingNumberFromRecords(
    systemSettings,
    SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost,
  );
  const middleOfficeBaseDays = getSystemSettingNumberFromRecords(
    systemSettings,
    SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays,
  );

  const estimate = useMemo(() => {
    if (!estimation) return null;
    const requestedAmountsByOptionId = new Map(
      (estimation.executionCostItems ?? []).map((item) => [
        item.costTypeOptionId,
        item.requestedAmount,
      ]),
    );
    return calculateMinimumQuote({
      outsourceCost: getProjectOutsourceTotal(estimation.outsourceItems),
      laborCostSnapshots: (estimation.members ?? []).map(
        (member) => member.laborCostSnapshot,
      ),
      rentCostSnapshots: (estimation.members ?? []).map(
        (member) => member.rentCostSnapshot,
      ),
      executionCostAmounts: (estimation.executionCostTypes ?? []).map(
        (option) => requestedAmountsByOptionId.get(option.id ?? ""),
      ),
      estimatedDuration: estimation.estimatedDuration,
      middleOfficeAverageMonthlyCost,
      middleOfficeBaseDays,
      agencyFeeRate: estimation.agencyFeeRate ?? 0,
      costBaselineRatio,
    });
  }, [
    estimation,
    middleOfficeAverageMonthlyCost,
    middleOfficeBaseDays,
    costBaselineRatio,
  ]);

  return { estimate, costBaselineRatio };
};

export const ProjectMinimumQuoteSummary = ({
  quote,
  costBaselineRatio,
}: {
  quote: number | null;
  costBaselineRatio: number;
}) => (
  <StyledStatisticCard
    statistic={{
      title: "预估最低报价（不含税）",
      value: quote ?? "—",
      suffix: quote === null ? undefined : "元",
      description: (
        <span style={{ color: "rgba(0,0,0,0.45)" }}>
          按 {formatAmount(costBaselineRatio)}% 成本基准率推算
        </span>
      ),
    }}
  />
);

export const ProjectMinimumQuoteDetails = ({
  estimate,
  costBaselineRatio,
}: {
  estimate: MinimumQuoteResult;
  costBaselineRatio: number;
}) => {
  const rows = [
    { label: "中介费", amount: estimate.agencyFee },
    { label: "外包成本", amount: estimate.outsourceCost },
    { label: "人力成本", amount: estimate.laborCost, note: "含 10% 工期预留" },
    { label: "租金成本", amount: estimate.rentCost },
    { label: "中台成本", amount: estimate.middleOfficeCost },
    { label: "执行费用成本", amount: estimate.executionCost },
  ];

  return (
    <div className={styles.details}>
      <div className={styles.detailsGrid}>
        {rows.map((row) => (
          <div className={styles.detailItem} key={row.label}>
            <span className={styles.detailLabel}>{row.label}</span>
            <div>
              <div className={styles.detailAmount}>
                {formatCurrency(row.amount)}
              </div>
              {row.note ? <div className={styles.detailNote}>{row.note}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.detailsFooter}>
        <span className={styles.totalLabel}>成本合计</span>
        <span className={styles.totalAmount}>
          {formatCurrency(estimate.totalCost)}
        </span>
        <span className={styles.ratioNote}>
          按 {formatAmount(costBaselineRatio)}% 成本基准率测算
        </span>
      </div>
    </div>
  );
};
