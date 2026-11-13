"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
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
import InfoGrid from "./InfoGrid";
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

const formatYuan = (amount: number | null) =>
  amount === null ? "—" : `¥${formatAmount(amount)}`;

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
}: {
  quote: number | null;
}) => (
  <StyledStatisticCard
    statistic={{
      title: "最低报价（不含税）",
      value: quote ?? "—",
      suffix: quote === null ? undefined : "元",
      description: (
        <span style={{ color: "rgba(0,0,0,0.45)" }}>
          系统推算
        </span>
      ),
    }}
  />
);

export const ProjectMinimumQuoteDetails = ({
  estimate,
  costBaselineRatio,
  agencyFeeRate,
}: {
  estimate: MinimumQuoteResult;
  costBaselineRatio: number;
  agencyFeeRate?: number | null;
}) => {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const hasAgencyFeeRate =
    typeof agencyFeeRate === "number" && agencyFeeRate > 0;
  const actualCostRate =
    estimate.quote !== null &&
    estimate.quote > 0 &&
    estimate.totalCost !== null
      ? (estimate.totalCost / estimate.quote) * 100
      : null;
  const isWithinCostLimit =
    actualCostRate !== null && actualCostRate <= costBaselineRatio;
  const costRateDifference =
    actualCostRate === null
      ? null
      : Math.abs(costBaselineRatio - actualCostRate);
  const agencyFeeFormula = hasAgencyFeeRate
    ? estimate.quote !== null && estimate.agencyFee !== null
      ? `${formatYuan(estimate.quote)} × ${formatAmount(agencyFeeRate)}% = ${formatYuan(estimate.agencyFee)}`
      : "—"
    : "0 元";
  const totalCostFormula =
    estimate.baseCost !== null &&
    estimate.agencyFee !== null &&
    estimate.totalCost !== null
      ? `${formatYuan(estimate.baseCost)} + ${formatYuan(estimate.agencyFee)} = ${formatYuan(estimate.totalCost)}`
      : "—";
  const actualCostRateFormula =
    estimate.totalCost !== null && estimate.quote !== null && actualCostRate !== null
      ? `${formatYuan(estimate.totalCost)} ÷ ${formatYuan(estimate.quote)} = ${formatAmount(actualCostRate)}%`
      : "—";

  return (
    <InfoGrid
      rows={[
        {
          columns: 2,
          items: [
            {
              title: "最低报价",
              value: (
                <div>
                  <div className={styles.quoteAmount}>
                    {formatCurrency(estimate.quote)}
                  </div>
                  <div className={styles.featuredNote}>
                    按成本率上限倒推，向上取整至万元
                  </div>
                </div>
              ),
            },
            {
              title: "报价对应成本率",
              value: (
                <div>
                  <div className={styles.rateAmount}>
                    {actualCostRate === null ? "-" : `${formatAmount(actualCostRate)}%`}
                  </div>
                  <div className={styles.featuredNote}>
                    {costRateDifference === null
                      ? `成本率上限 ${formatAmount(costBaselineRatio)}%，暂无成本率数据`
                      : `成本率上限 ${formatAmount(costBaselineRatio)}%，${isWithinCostLimit ? "低于" : "高于"}上限 ${formatAmount(costRateDifference)} 个百分点`}
                  </div>
                </div>
              ),
            },
          ],
        },
        {
          columns: 1,
          items: [
            {
              title: null,
              value: (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 14 }}>总成本：</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {formatCurrency(estimate.totalCost)}
                      </span>
                    </span>
                    <Button
                      type="text"
                      size="small"
                      aria-expanded={showCalculationDetails}
                      onClick={() => setShowCalculationDetails((visible) => !visible)}
                    >
                      {showCalculationDetails ? "收起计算明细" : "查看计算明细"}
                      {showCalculationDetails ? <UpOutlined /> : <DownOutlined />}
                    </Button>
                  </div>
                  {showCalculationDetails ? (
                    <div className={styles.calculationDetails}>
                      <div className={styles.calculationSteps}>
                        <h6 className={styles.calculationColumnTitle}>最低报价计算方式</h6>
                        <div className={styles.calculationRow}>
                          <span>① 基础成本（含 10% 人力超期成本预留）</span>
                          <strong>{formatYuan(estimate.baseCost)}</strong>
                        </div>
                        <div className={styles.calculationRow}>
                          <span>
                            {hasAgencyFeeRate
                              ? `② 按 ${formatAmount(costBaselineRatio)}% 成本率上限及 ${formatAmount(agencyFeeRate)}% 中介率倒推`
                              : `② 按 ${formatAmount(costBaselineRatio)}% 的上限倒推`}
                          </span>
                          <strong>{formatYuan(estimate.unroundedQuote)}</strong>
                        </div>
                        <div className={styles.calculationRow}>
                          <span>③ 向上取整至万元</span>
                          <strong>{formatYuan(estimate.quote)}</strong>
                        </div>
                      </div>
                      <div className={styles.calculationResults}>
                        <h6 className={styles.calculationColumnTitle}>对应成本率计算方式</h6>
                        <div className={styles.calculationRow}>
                          <span>① 中介费（报价 × 费率）</span>
                          <span>{agencyFeeFormula}</span>
                        </div>
                        <div className={styles.calculationRow}>
                          <span>② 总成本（基础成本 + 中介费）</span>
                          <span>{totalCostFormula}</span>
                        </div>
                        <div className={styles.calculationRow}>
                          <span>③ 报价对应成本率（总成本 ÷ 报价）</span>
                          <span>{actualCostRateFormula}</span>
                        </div>
                      </div>
                      <p className={styles.calculationRule}>
                        {hasAgencyFeeRate
                          ? `计算规则：最低报价须满足（基础成本 + 报价 × 中介费率）÷ 报价 ≤ ${formatAmount(costBaselineRatio)}%。计算后向上取整至万元。`
                          : `计算规则：最低报价须满足基础成本 ÷ 报价 ≤ ${formatAmount(costBaselineRatio)}%。计算后向上取整至万元。`}
                      </p>
                    </div>
                  ) : null}
                </div>
              ),
            },
          ],
        },
      ]}
    />
  );
};
