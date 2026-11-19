"use client";

import { Space } from "antd";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { formatProjectOutsourceItemsText, getProjectOutsourceTotal } from "@/lib/project-outsource";
import type { Project } from "@/types/projectDetail";
import InfoGrid from "./InfoGrid";

type Estimation = NonNullable<Project["latestCostEstimation"]>;

type Props = {
  estimation: Estimation;
  agencyFeeAmount?: number | null;
};

const formatAmount = (value: number) =>
  value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default function ProjectCostFeesInfo({ estimation, agencyFeeAmount }: Props) {
  const hasOtherExecutionCostType =
    typeof estimation.hasOtherExecutionCostType === "boolean"
      ? estimation.hasOtherExecutionCostType
      : (estimation.executionCostTypes ?? []).some(
          (item) => item?.value?.trim() === "其他",
        );
  const executionCostOptions = (estimation.executionCostTypes ?? []).filter(
    (option) => Boolean(option?.value),
  );
  const requestedAmountsByOptionId = new Map(
    (estimation.executionCostItems ?? []).map((item) => [
      item.costTypeOptionId,
      item.requestedAmount,
    ]),
  );
  const requestedAmounts = executionCostOptions.map((option) =>
    requestedAmountsByOptionId.get(option.id ?? ""),
  );
  const executionCostTotal =
    requestedAmounts.length > 0 &&
    requestedAmounts.every((amount): amount is number =>
      typeof amount === "number" && Number.isFinite(amount),
    )
      ? requestedAmounts.reduce((total, amount) => total + amount, 0)
      : null;

  return (
    <InfoGrid
      style={{ marginBottom: 12 }}
      rows={[
        {
          columns: 3,
          title: (
            <span style={{ display: "grid", gridTemplateColumns: "1fr 2fr" }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 24px" }}>
                <span>中介费用</span>
                <span style={{ fontWeight: 700 }}>
                  费率 {typeof estimation.agencyFeeRate === "number"
                    ? `${formatAmount(estimation.agencyFeeRate)}%`
                    : "-"}
                </span>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 24px", borderLeft: "1px solid #e5e5e5" }}>
                <span>外包费用</span>
                {(estimation.outsourceItems?.length ?? 0) > 0 ? (
                  <span style={{ fontWeight: 700 }}>
                    合计 {formatAmount(getProjectOutsourceTotal(estimation.outsourceItems))} 元
                  </span>
                ) : null}
              </span>
            </span>
          ),
          titleStyle: { padding: 0 },
          items: [
            {
              title: null,
              value: typeof agencyFeeAmount === "number"
                ? `按最终报价计算：${formatAmount(agencyFeeAmount)} 元`
                : "按最终报价计算",
            },
            {
              title: null,
              cornerTag: "明细",
              style: { whiteSpace: "pre-line" },
              value: estimation.outsourceInfo?.trim()
                ? estimation.outsourceInfo
                : (estimation.outsourceItems?.length ?? 0) > 0
                  ? formatProjectOutsourceItemsText(estimation.outsourceItems)
                  : "-",
            },
            {
              title: null,
              cornerTag: "备注",
              value: estimation.outsourceRemark?.trim() || "-",
            },
          ],
        },
        {
          columns: hasOtherExecutionCostType ? 2 : 1,
          title: (
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span>执行费用</span>
              {executionCostTotal !== null ? (
                <span style={{ fontWeight: 700 }}>
                  合计 {formatAmount(executionCostTotal)} 元
                </span>
              ) : null}
            </span>
          ),
          items: [
            {
              title: null,
              value: executionCostOptions.length > 0 ? (
                <Space size={[8, 8]} wrap>
                  {executionCostOptions.map((option) => {
                    const amount = requestedAmountsByOptionId.get(option.id ?? "");
                    return (
                      <SelectOptionQuickEditTag
                        key={option.id ?? option.value}
                        field="projectCostEstimation.executionCostType"
                        option={option}
                        tagSuffix={typeof amount === "number" ? (
                          <span style={{ borderLeft: "1px solid currentColor", marginLeft: 10, paddingLeft: 10, fontWeight: 400 }}>
                            {formatAmount(amount)} 元
                          </span>
                        ) : undefined}
                      />
                    );
                  })}
                </Space>
              ) : "-",
            },
            ...(hasOtherExecutionCostType ? [{
              title: "其他执行费用备注",
              value: estimation.otherExecutionCostRemark?.trim() || "-",
            }] : []),
          ],
        },
      ]}
    />
  );
}
