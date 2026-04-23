"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Table,
  Tooltip,
  message,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import ProjectPricingStrategyModal from "@/components/project-detail/ProjectPricingStrategyModal";
import ProjectDetailTitledTableCard from "@/components/project-detail/ProjectDetailTitledTableCard";
import CompositionRatioBar, {
  type CompositionRatioItem,
} from "@/components/CompositionRatioBar";
import { COST_COMPOSITION_COLORS } from "@/lib/cost-composition-colors";
import {
  FINANCIAL_METRIC_BAR_COLORS,
  FINANCIAL_METRIC_COLORS,
} from "@/lib/financial-metric-colors";
import type { ProjectPricingStrategy } from "@/components/project-detail/pricing-strategy/types";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project } from "@/types/projectDetail";

type Props = {
  projectId: string;
  projectName: string;
  latestCostEstimation?: Project["latestCostEstimation"];
  mode?: "full" | "actions" | "content";
};

type PricingPreviewRow = {
  key: string;
  type: "section" | "item";
  category: string;
  leftValue?: React.ReactNode;
  rightValue?: React.ReactNode;
  remark?: React.ReactNode;
  withDot?: boolean;
  emphasizeLeftColor?: string;
  emphasizeRightColor?: string;
};

const PRICING_STRATEGY_UPDATED_EVENT = "project-pricing-strategy-updated";
const COST_VALUE_COLOR = FINANCIAL_METRIC_COLORS.cost;
const COST_BAR_COLOR = FINANCIAL_METRIC_BAR_COLORS.cost;

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

const formatPercent = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
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

const formatExecutionCostRemarkText = (
  pricingStrategy: ProjectPricingStrategy,
) => {
  const validItems = (pricingStrategy.executionCostItems ?? []).filter(
    (item) =>
      typeof item.budgetAmount === "number" && item.costTypeOption?.value,
  );
  if (validItems.length === 0) return "-";
  return validItems
    .map(
      (item) =>
        `${item.costTypeOption?.value}：${formatAmount(item.budgetAmount)}`,
    )
    .join("\n");
};

const computeBreakEvenFallback = ({
  pricingStrategy,
  quotePrice,
  laborCost,
  middleOfficeCost,
}: {
  pricingStrategy: ProjectPricingStrategy;
  quotePrice: number;
  laborCost: number;
  middleOfficeCost: number;
}) => {
  const outsourceAmount = getProjectOutsourceTotal(
    pricingStrategy.outsourceItems,
  );
  const agencyFeeAmount =
    ((pricingStrategy.agencyFeeRate ?? 0) * quotePrice) / 100;
  return (
    outsourceAmount +
    laborCost +
    middleOfficeCost +
    agencyFeeAmount +
    pricingStrategy.rentCost +
    (pricingStrategy.executionCost ?? 0)
  );
};

const ProjectPricingStrategyCard = ({
  projectId,
  projectName,
  latestCostEstimation,
  mode = "full",
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingStrategy, setPricingStrategy] =
    useState<ProjectPricingStrategy | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );

  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canCreateQuoteReference =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");

  const fetchPricingStrategy = useCallback(async () => {
    if (!projectId || !latestCostEstimation?.id) {
      setPricingStrategy(null);
      return;
    }
    setPricingLoading(true);
    try {
      const query = new URLSearchParams({
        projectId,
        estimationId: latestCostEstimation.id,
      });
      const res = await fetch(
        `/api/project-pricing-strategies?${query.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        setPricingStrategy(null);
        return;
      }
      const rows = (await res.json()) as ProjectPricingStrategy[];
      setPricingStrategy(
        Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
      );
    } catch {
      setPricingStrategy(null);
    } finally {
      setPricingLoading(false);
    }
  }, [projectId, latestCostEstimation?.id]);

  useEffect(() => {
    void fetchPricingStrategy();
  }, [fetchPricingStrategy]);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        projectId?: string;
        estimationId?: string;
      }>;
      const payload = customEvent.detail;
      if (!payload?.projectId || payload.projectId !== projectId) return;
      if (
        payload.estimationId &&
        latestCostEstimation?.id &&
        payload.estimationId !== latestCostEstimation.id
      ) {
        return;
      }
      setRefreshVersion((prev) => prev + 1);
    };

    window.addEventListener(
      PRICING_STRATEGY_UPDATED_EVENT,
      handleUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        PRICING_STRATEGY_UPDATED_EVENT,
        handleUpdated as EventListener,
      );
    };
  }, [latestCostEstimation?.id, projectId]);

  useEffect(() => {
    if (refreshVersion === 0) return;
    void fetchPricingStrategy();
  }, [fetchPricingStrategy, refreshVersion]);

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

  const downloadPricingTable = useCallback(async () => {
    if (!pricingStrategy) return;
    setDownloading(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("报价参考");
      const executionRemark = formatExecutionCostRemarkText(pricingStrategy);
      const tableTitle = `【${projectName || "未命名项目"}】${
        latestCostEstimation?.estimatedDuration ?? "-"
      }个工作日报价参考`;

      worksheet.addRow([tableTitle, "", "", ""]);
      worksheet.mergeCells("A1:D1");

      if (pricingStrategy.mode === "target") {
        const customerBudget = toMoney(
          latestCostEstimation?.clientBudget ?? null,
        );
        const customerBudgetValue =
          customerBudget > 0
            ? customerBudget
            : pricingStrategy.bottomLinePrice > 0
              ? pricingStrategy.bottomLinePrice
              : null;
        const customerBudgetAgencyFee =
          customerBudgetValue !== null
            ? ((pricingStrategy.agencyFeeRate ?? 0) * customerBudgetValue) / 100
            : 0;
        const suggestedAgencyFee =
          ((pricingStrategy.agencyFeeRate ?? 0) * pricingStrategy.targetPrice) /
          100;
        const breakEvenCustomer =
          customerBudgetValue !== null && customerBudgetValue > 0
            ? (pricingStrategy.plannedBreakEvenAtCustomerBudget ??
              computeBreakEvenFallback({
                pricingStrategy,
                quotePrice: customerBudgetValue,
                laborCost: pricingStrategy.plannedLaborCost,
                middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
              }))
            : null;
        const breakEvenSuggested =
          pricingStrategy.plannedBreakEvenAtTarget ??
          computeBreakEvenFallback({
            pricingStrategy,
            quotePrice: pricingStrategy.targetPrice,
            laborCost: pricingStrategy.plannedLaborCost,
            middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
          });
        const laborRateCustomer = customerBudgetValue
          ? formatPercent(
              pricingStrategy.plannedSummaryAtCustomerBudget?.laborCostRate ??
                (customerBudgetValue > 0
                  ? (pricingStrategy.plannedLaborCost / customerBudgetValue) *
                    100
                  : null),
            )
          : "-";
        const laborRateSuggested = pricingStrategy.targetPrice
          ? formatPercent(
              pricingStrategy.plannedSummaryAtTarget?.laborCostRate ??
                (pricingStrategy.targetPrice > 0
                  ? (pricingStrategy.plannedLaborCost /
                      pricingStrategy.targetPrice) *
                    100
                  : null),
            )
          : "-";
        const totalCostRateCustomer = customerBudgetValue
          ? formatPercent(
              pricingStrategy.plannedSummaryAtCustomerBudget?.costRate ??
                (breakEvenCustomer !== null && customerBudgetValue > 0
                  ? (breakEvenCustomer / customerBudgetValue) * 100
                  : null),
            )
          : "-";
        const totalCostRateSuggested = pricingStrategy.targetPrice
          ? formatPercent(
              pricingStrategy.plannedSummaryAtTarget?.costRate ??
                (pricingStrategy.targetPrice > 0
                  ? (breakEvenSuggested / pricingStrategy.targetPrice) * 100
                  : null),
            )
          : "-";
        const costBenchmarkReference = customerBudgetValue
          ? formatAmount(customerBudgetValue * (projectCostBaselineRatio / 100))
          : "-";

        worksheet.addRow(["类别", "客户报价(不含税)", "建议报价", "备注"]);
        const rows: Array<[string, string, string, string]> = [
          [
            "收入",
            customerBudgetValue ? formatAmount(customerBudgetValue) : "-",
            formatAmount(pricingStrategy.targetPrice),
            "-",
          ],
          [
            "外包成本",
            formatAmount(
              getProjectOutsourceTotal(pricingStrategy.outsourceItems),
            ),
            "",
            formatProjectOutsourceItemsText(pricingStrategy.outsourceItems),
          ],
          ["人力成本", formatAmount(pricingStrategy.plannedLaborCost), "", "-"],
          ["人力成本率", laborRateCustomer, laborRateSuggested, "-"],
          [
            "中介费",
            formatAmount(customerBudgetAgencyFee),
            formatAmount(suggestedAgencyFee),
            pricingStrategy.agencyFeeRate
              ? `费率：${pricingStrategy.agencyFeeRate}%`
              : "-",
          ],
          ["租金成本", formatAmount(pricingStrategy.rentCost), "", "-"],
          [
            "执行费用成本",
            formatAmount(pricingStrategy.executionCost),
            "",
            executionRemark,
          ],
          [
            "中台成本",
            formatAmount(pricingStrategy.plannedMiddleOfficeCost),
            "",
            "-",
          ],
          [
            "盈亏平衡",
            formatAmount(breakEvenCustomer),
            formatAmount(breakEvenSuggested),
            `成本基准参考：${costBenchmarkReference}`,
          ],
          ["总费用占比", totalCostRateCustomer, totalCostRateSuggested, "-"],
        ];
        rows.forEach((row) => worksheet.addRow(row));
        worksheet.mergeCells("B4:C4");
        worksheet.mergeCells("B5:C5");
        worksheet.mergeCells("B7:C7");
        worksheet.mergeCells("B8:C8");
        worksheet.mergeCells("B9:C9");
        worksheet.mergeCells("B10:C10");
        worksheet.mergeCells("B11:C11");
      } else {
        const bottomAgencyFee =
          ((pricingStrategy.agencyFeeRate ?? 0) *
            pricingStrategy.bottomLinePrice) /
          100;
        const targetAgencyFee =
          ((pricingStrategy.agencyFeeRate ?? 0) * pricingStrategy.targetPrice) /
          100;
        const plannedBreakEven =
          pricingStrategy.plannedBreakEvenAtBottomLine ??
          computeBreakEvenFallback({
            pricingStrategy,
            quotePrice: pricingStrategy.bottomLinePrice,
            laborCost: pricingStrategy.plannedLaborCost,
            middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
          });
        const suggestedBreakEven =
          pricingStrategy.suggestedBreakEvenAtTarget ??
          computeBreakEvenFallback({
            pricingStrategy,
            quotePrice: pricingStrategy.targetPrice,
            laborCost: pricingStrategy.suggestedLaborCost,
            middleOfficeCost: pricingStrategy.suggestedMiddleOfficeCost,
          });
        const laborRateTarget = pricingStrategy.targetPrice
          ? formatPercent(
              pricingStrategy.suggestedSummaryAtTarget?.laborCostRate ??
                (pricingStrategy.targetPrice > 0
                  ? (pricingStrategy.suggestedLaborCost /
                      pricingStrategy.targetPrice) *
                    100
                  : null),
            )
          : "-";
        const laborRateBottom = pricingStrategy.bottomLinePrice
          ? formatPercent(
              pricingStrategy.plannedSummaryAtBottomLine?.laborCostRate ??
                (pricingStrategy.bottomLinePrice > 0
                  ? (pricingStrategy.plannedLaborCost /
                      pricingStrategy.bottomLinePrice) *
                    100
                  : null),
            )
          : "-";
        const totalCostRateTarget = pricingStrategy.targetPrice
          ? formatPercent(
              pricingStrategy.suggestedSummaryAtTarget?.costRate ??
                (pricingStrategy.targetPrice > 0
                  ? (suggestedBreakEven / pricingStrategy.targetPrice) * 100
                  : null),
            )
          : "-";
        const totalCostRateBottom = pricingStrategy.bottomLinePrice
          ? formatPercent(
              pricingStrategy.plannedSummaryAtBottomLine?.costRate ??
                (pricingStrategy.bottomLinePrice > 0
                  ? (plannedBreakEven / pricingStrategy.bottomLinePrice) * 100
                  : null),
            )
          : "-";
        const costBenchmarkReference =
          typeof pricingStrategy.targetPrice === "number"
            ? formatAmount(
                pricingStrategy.targetPrice * (projectCostBaselineRatio / 100),
              )
            : "-";

        worksheet.addRow(["类别", "理想报价", "最低报价", "备注"]);
        const rows: Array<[string, string, string, string]> = [
          [
            "收入",
            formatAmount(pricingStrategy.targetPrice),
            formatAmount(pricingStrategy.bottomLinePrice),
            `成本基准参考：${costBenchmarkReference}`,
          ],
          [
            "外包成本",
            formatAmount(
              getProjectOutsourceTotal(pricingStrategy.outsourceItems),
            ),
            "",
            formatProjectOutsourceItemsText(pricingStrategy.outsourceItems),
          ],
          [
            "人力成本",
            formatAmount(pricingStrategy.suggestedLaborCost),
            formatAmount(pricingStrategy.plannedLaborCost),
            "-",
          ],
          ["人力成本率", laborRateTarget, laborRateBottom, "-"],
          [
            "中介费",
            formatAmount(targetAgencyFee),
            formatAmount(bottomAgencyFee),
            pricingStrategy.agencyFeeRate
              ? `费率：${pricingStrategy.agencyFeeRate}%`
              : "-",
          ],
          ["租金成本", formatAmount(pricingStrategy.rentCost), "", "-"],
          [
            "执行费用成本",
            formatAmount(pricingStrategy.executionCost),
            "",
            executionRemark,
          ],
          [
            "中台成本",
            formatAmount(pricingStrategy.suggestedMiddleOfficeCost),
            formatAmount(pricingStrategy.plannedMiddleOfficeCost),
            "-",
          ],
          [
            "盈亏平衡",
            formatAmount(suggestedBreakEven),
            formatAmount(plannedBreakEven),
            "-",
          ],
          ["总费用占比", totalCostRateTarget, totalCostRateBottom, "-"],
        ];
        rows.forEach((row) => worksheet.addRow(row));
        worksheet.mergeCells("B4:C4");
        worksheet.mergeCells("B7:C7");
        worksheet.mergeCells("B8:C8");
        worksheet.mergeCells("B9:C9");
      }

      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(2).font = { bold: true };
      worksheet.getRow(2).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      const lastRow = worksheet.rowCount;
      for (let rowIndex = 1; rowIndex <= lastRow; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= 4; columnIndex += 1) {
          const cell = worksheet.getCell(rowIndex, columnIndex);
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
      }
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "top",
            horizontal: row.number <= 2 ? "center" : "center",
            wrapText: true,
          };
        });
      });
      worksheet.columns.forEach((column, index) => {
        column.width = index === 0 ? 18 : 24;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      link.href = url;
      link.download = `${projectName || "项目"}-报价参考-${yyyy}${mm}${dd}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (typeof app?.message?.success === "function") {
        app.message.success("表格已下载");
      } else {
        void messageApi.success("表格已下载");
      }
    } catch (error) {
      console.error(error);
      if (typeof app?.message?.error === "function") {
        app.message.error("下载失败，请稍后重试");
      } else {
        void messageApi.error("下载失败，请稍后重试");
      }
    } finally {
      setDownloading(false);
    }
  }, [
    app,
    latestCostEstimation?.clientBudget,
    latestCostEstimation?.estimatedDuration,
    messageApi,
    projectCostBaselineRatio,
    pricingStrategy,
    projectName,
  ]);

  const actionsNode = canCreateQuoteReference ? (
    <Space>
      <Button
        onClick={() => void downloadPricingTable()}
        disabled={!pricingStrategy}
        loading={downloading}
      >
        下载表格
      </Button>
      <Button
        onClick={() => setPricingModalOpen(true)}
        disabled={!latestCostEstimation}
        type="primary"
      >
        {pricingStrategy ? "更新报价参考" : "新建报价参考"}
      </Button>
    </Space>
  ) : null;

  const pricingSummaryPanels = useMemo(() => {
    if (!pricingStrategy) return [];

    const buildPanel = (
      label: string,
      summary?: {
        quote: number;
        totalCost: number;
        costRate: number | null;
        profit: number;
        profitRate: number | null;
      } | null,
      fallback?: {
        quoteIncome?: number | null;
        totalCost?: number | null;
      },
    ) => {
      const summaryQuote =
        typeof summary?.quote === "number" && Number.isFinite(summary.quote)
          ? summary.quote
          : null;
      const summaryTotalCost =
        typeof summary?.totalCost === "number" &&
        Number.isFinite(summary.totalCost)
          ? summary.totalCost
          : null;
      const income =
        summaryQuote ??
        (typeof fallback?.quoteIncome === "number" &&
        Number.isFinite(fallback.quoteIncome)
          ? fallback.quoteIncome
          : null);
      const cost =
        summaryTotalCost ??
        (typeof fallback?.totalCost === "number" &&
        Number.isFinite(fallback.totalCost)
          ? fallback.totalCost
          : null);
      const profit =
        typeof summary?.profit === "number" && Number.isFinite(summary.profit)
          ? summary.profit
          : income !== null && cost !== null
            ? income - cost
            : null;
      const costRatio =
        typeof summary?.costRate === "number" &&
        Number.isFinite(summary.costRate)
          ? summary.costRate
          : income && income > 0 && cost !== null
            ? (cost / income) * 100
            : null;
      const profitRatio =
        typeof summary?.profitRate === "number" &&
        Number.isFinite(summary.profitRate)
          ? summary.profitRate
          : income && income > 0 && typeof profit === "number"
            ? (profit / income) * 100
            : null;

      return { label, income, cost, costRatio, profit, profitRatio };
    };

    if (pricingStrategy.mode === "target") {
      const customerBudget = toMoney(
        latestCostEstimation?.clientBudget ?? null,
      );
      const customerBudgetAmount =
        customerBudget > 0
          ? customerBudget
          : pricingStrategy.bottomLinePrice > 0
            ? pricingStrategy.bottomLinePrice
            : null;
      const customerBudgetBreakEven =
        customerBudgetAmount && customerBudgetAmount > 0
          ? (pricingStrategy.plannedBreakEvenAtCustomerBudget ??
            computeBreakEvenFallback({
              pricingStrategy,
              quotePrice: customerBudgetAmount,
              laborCost: pricingStrategy.plannedLaborCost,
              middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
            }))
          : null;

      const suggestedBreakEven =
        pricingStrategy.plannedBreakEvenAtTarget ??
        computeBreakEvenFallback({
          pricingStrategy,
          quotePrice: pricingStrategy.targetPrice,
          laborCost: pricingStrategy.plannedLaborCost,
          middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
        });

      return [
        {
          ...buildPanel(
            "客户报价(不含税)",
            pricingStrategy.plannedSummaryAtCustomerBudget,
            {
              quoteIncome: customerBudgetAmount,
              totalCost: customerBudgetBreakEven,
            },
          ),
        },
        {
          ...buildPanel("建议报价", pricingStrategy.plannedSummaryAtTarget, {
            quoteIncome: pricingStrategy.targetPrice,
            totalCost: suggestedBreakEven,
          }),
        },
      ];
    }

    const plannedBreakEven =
      pricingStrategy.plannedBreakEvenAtBottomLine ??
      computeBreakEvenFallback({
        pricingStrategy,
        quotePrice: pricingStrategy.bottomLinePrice,
        laborCost: pricingStrategy.plannedLaborCost,
        middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
      });
    const suggestedBreakEven =
      pricingStrategy.suggestedBreakEvenAtTarget ??
      computeBreakEvenFallback({
        pricingStrategy,
        quotePrice: pricingStrategy.targetPrice,
        laborCost: pricingStrategy.suggestedLaborCost,
        middleOfficeCost: pricingStrategy.suggestedMiddleOfficeCost,
      });

    return [
      {
        ...buildPanel("理想报价", pricingStrategy.suggestedSummaryAtTarget, {
          quoteIncome: pricingStrategy.targetPrice,
          totalCost: suggestedBreakEven,
        }),
      },
      {
        ...buildPanel("最低报价", pricingStrategy.plannedSummaryAtBottomLine, {
          quoteIncome: pricingStrategy.bottomLinePrice,
          totalCost: plannedBreakEven,
        }),
      },
    ];
  }, [latestCostEstimation?.clientBudget, pricingStrategy]);

  const pricingCompositionComparison = useMemo(() => {
    if (!pricingStrategy) return null;

    const agencyFeeRate = pricingStrategy.agencyFeeRate ?? 0;
    const outsource = getProjectOutsourceTotal(pricingStrategy.outsourceItems);
    const rent = pricingStrategy.rentCost ?? 0;
    const execution = pricingStrategy.executionCost ?? 0;

    const buildItems = (
      labor: number,
      middleOffice: number,
      agency: number,
    ) => {
      const items: CompositionRatioItem[] = [
        {
          text: "外包",
          percent: outsource,
          color: COST_COMPOSITION_COLORS.outsource,
        },
        { text: "人力", percent: labor, color: COST_COMPOSITION_COLORS.labor },
        {
          text: "中介",
          percent: agency,
          color: COST_COMPOSITION_COLORS.agency,
        },
        { text: "租金", percent: rent, color: COST_COMPOSITION_COLORS.rent },
        {
          text: "执行",
          percent: execution,
          color: COST_COMPOSITION_COLORS.execution,
        },
        {
          text: "中台",
          percent: middleOffice,
          color: COST_COMPOSITION_COLORS.middleOffice,
        },
      ];
      const total = items.reduce((sum, item) => sum + (item.percent || 0), 0);
      return { total, items };
    };

    if (pricingStrategy.mode === "target") {
      const customerBudget = toMoney(
        latestCostEstimation?.clientBudget ?? null,
      );
      const customerBudgetAmount =
        customerBudget > 0
          ? customerBudget
          : pricingStrategy.bottomLinePrice > 0
            ? pricingStrategy.bottomLinePrice
            : 0;
      const customerAgency = (customerBudgetAmount * agencyFeeRate) / 100;
      const suggestedAgency =
        (pricingStrategy.targetPrice * agencyFeeRate) / 100;

      return {
        title: "成本构成对比（各项占总成本比）",
        left: buildItems(
          pricingStrategy.plannedLaborCost,
          pricingStrategy.plannedMiddleOfficeCost,
          customerAgency,
        ),
        right: buildItems(
          pricingStrategy.plannedLaborCost,
          pricingStrategy.plannedMiddleOfficeCost,
          suggestedAgency,
        ),
      };
    }

    const targetAgency = (pricingStrategy.targetPrice * agencyFeeRate) / 100;
    const bottomAgency =
      (pricingStrategy.bottomLinePrice * agencyFeeRate) / 100;

    return {
      title: "成本构成对比（各项占总成本比）",
      left: buildItems(
        pricingStrategy.suggestedLaborCost,
        pricingStrategy.suggestedMiddleOfficeCost,
        targetAgency,
      ),
      right: buildItems(
        pricingStrategy.plannedLaborCost,
        pricingStrategy.plannedMiddleOfficeCost,
        bottomAgency,
      ),
    };
  }, [latestCostEstimation?.clientBudget, pricingStrategy]);

  const pricingPreviewTable = useMemo(() => {
    if (!pricingStrategy) return null;

    const agencyFeeRate = pricingStrategy.agencyFeeRate ?? 0;
    const outsourceAmount = getProjectOutsourceTotal(
      pricingStrategy.outsourceItems,
    );
    const executionCost = pricingStrategy.executionCost ?? 0;
    const outsourceRemarkText = formatProjectOutsourceItemsText(
      pricingStrategy.outsourceItems,
    );
    const outsourceRemark = pricingStrategy.outsourceRemark?.trim();
    const executionRemarkText = formatExecutionCostRemarkText(pricingStrategy);

    const renderLaborValue = (cost: number, ratio: string) => (
      <div style={{ lineHeight: 1.4 }}>
        <div>{formatAmount(cost)}</div>
        <div style={{ marginTop: 4, color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
          {ratio}
        </div>
      </div>
    );

    const renderRemarkBlock = (lines: string[]) => {
      const validLines = lines.filter((line) => line && line.trim().length > 0);
      if (validLines.length === 0) return "-";
      return (
        <div
          style={{
            lineHeight: 1.6,
            color: "rgba(0,0,0,0.65)",
            whiteSpace: "pre-wrap",
          }}
        >
          {validLines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      );
    };

    if (pricingStrategy.mode === "target") {
      const customerBudget = toMoney(
        latestCostEstimation?.clientBudget ?? null,
      );
      const customerBudgetAmount =
        customerBudget > 0
          ? customerBudget
          : pricingStrategy.bottomLinePrice > 0
            ? pricingStrategy.bottomLinePrice
            : 0;
      const customerAgencyFee = (customerBudgetAmount * agencyFeeRate) / 100;
      const suggestedAgencyFee =
        (pricingStrategy.targetPrice * agencyFeeRate) / 100;
      const leftCostTotal =
        pricingStrategy.plannedSummaryAtCustomerBudget?.totalCost ??
        pricingStrategy.plannedBreakEvenAtCustomerBudget ??
        computeBreakEvenFallback({
          pricingStrategy,
          quotePrice: customerBudgetAmount,
          laborCost: pricingStrategy.plannedLaborCost,
          middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
        });
      const rightCostTotal =
        pricingStrategy.plannedSummaryAtTarget?.totalCost ??
        pricingStrategy.plannedBreakEvenAtTarget ??
        computeBreakEvenFallback({
          pricingStrategy,
          quotePrice: pricingStrategy.targetPrice,
          laborCost: pricingStrategy.plannedLaborCost,
          middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
        });

      const rows: PricingPreviewRow[] = [
        { key: "income-section", type: "section", category: "收入" },
        {
          key: "income",
          type: "item",
          category: "报价",
          leftValue: formatAmount(customerBudgetAmount),
          rightValue: formatAmount(pricingStrategy.targetPrice),
          remark: "-",
          emphasizeLeftColor: FINANCIAL_METRIC_COLORS.income,
          emphasizeRightColor: FINANCIAL_METRIC_COLORS.income,
        },
        { key: "cost-section", type: "section", category: "成本明细" },
        {
          key: "agency",
          type: "item",
          category: "中介费",
          withDot: true,
          leftValue: formatAmount(customerAgencyFee),
          rightValue: formatAmount(suggestedAgencyFee),
          remark: agencyFeeRate > 0 ? `费率：${agencyFeeRate}%` : "-",
        },
        {
          key: "outsource",
          type: "item",
          category: "外包成本",
          withDot: true,
          leftValue: formatAmount(outsourceAmount),
          rightValue: formatAmount(outsourceAmount),
          remark: renderRemarkBlock([
            outsourceRemarkText === "-" ? "" : outsourceRemarkText,
            outsourceRemark ?? "",
          ]),
        },
        {
          key: "labor",
          type: "item",
          category: "人力成本",
          withDot: true,
          leftValue: renderLaborValue(
            pricingStrategy.plannedLaborCost,
            customerBudgetAmount
              ? formatPercent(
                  pricingStrategy.plannedSummaryAtCustomerBudget
                    ?.laborCostRate ??
                    (customerBudgetAmount > 0
                      ? (pricingStrategy.plannedLaborCost /
                          customerBudgetAmount) *
                        100
                      : null),
                )
              : "-",
          ),
          rightValue: renderLaborValue(
            pricingStrategy.plannedLaborCost,
            pricingStrategy.targetPrice
              ? formatPercent(
                  pricingStrategy.plannedSummaryAtTarget?.laborCostRate ??
                    (pricingStrategy.targetPrice > 0
                      ? (pricingStrategy.plannedLaborCost /
                          pricingStrategy.targetPrice) *
                        100
                      : null),
                )
              : "-",
          ),
          remark: "-",
        },
        {
          key: "rent",
          type: "item",
          category: "租金成本",
          withDot: true,
          leftValue: formatAmount(pricingStrategy.rentCost),
          rightValue: formatAmount(pricingStrategy.rentCost),
          remark: "-",
        },
        {
          key: "middle-office",
          type: "item",
          category: "中台成本",
          withDot: true,
          leftValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
          rightValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
          remark: "-",
        },
        {
          key: "execution",
          type: "item",
          category: "执行费用成本",
          withDot: true,
          leftValue: formatAmount(executionCost),
          rightValue: formatAmount(executionCost),
          remark: renderRemarkBlock(
            executionRemarkText === "-" ? [] : executionRemarkText.split("\n"),
          ),
        },
        {
          key: "total",
          type: "item",
          category: "成本合计",
          leftValue: formatAmount(leftCostTotal),
          rightValue: formatAmount(rightCostTotal),
          remark: "-",
        },
      ];

      return {
        leftTitle: "客户报价(不含税)",
        rightTitle: "建议报价",
        rows,
      };
    }

    const targetAgencyFee = (pricingStrategy.targetPrice * agencyFeeRate) / 100;
    const bottomAgencyFee =
      (pricingStrategy.bottomLinePrice * agencyFeeRate) / 100;
    const leftCostTotal =
      pricingStrategy.suggestedSummaryAtTarget?.totalCost ??
      pricingStrategy.suggestedBreakEvenAtTarget ??
      computeBreakEvenFallback({
        pricingStrategy,
        quotePrice: pricingStrategy.targetPrice,
        laborCost: pricingStrategy.suggestedLaborCost,
        middleOfficeCost: pricingStrategy.suggestedMiddleOfficeCost,
      });
    const rightCostTotal =
      pricingStrategy.plannedSummaryAtBottomLine?.totalCost ??
      pricingStrategy.plannedBreakEvenAtBottomLine ??
      computeBreakEvenFallback({
        pricingStrategy,
        quotePrice: pricingStrategy.bottomLinePrice,
        laborCost: pricingStrategy.plannedLaborCost,
        middleOfficeCost: pricingStrategy.plannedMiddleOfficeCost,
      });

    const rows: PricingPreviewRow[] = [
      { key: "income-section", type: "section", category: "收入" },
      {
        key: "income",
        type: "item",
        category: "报价",
        leftValue: formatAmount(pricingStrategy.targetPrice),
        rightValue: formatAmount(pricingStrategy.bottomLinePrice),
        remark: "-",
        emphasizeLeftColor: FINANCIAL_METRIC_COLORS.income,
        emphasizeRightColor: FINANCIAL_METRIC_COLORS.income,
      },
      { key: "cost-section", type: "section", category: "成本明细" },
      {
        key: "agency",
        type: "item",
        category: "中介费",
        withDot: true,
        leftValue: formatAmount(targetAgencyFee),
        rightValue: formatAmount(bottomAgencyFee),
        remark: agencyFeeRate > 0 ? `费率：${agencyFeeRate}%` : "-",
      },
      {
        key: "outsource",
        type: "item",
        category: "外包成本",
        withDot: true,
        leftValue: formatAmount(outsourceAmount),
        rightValue: formatAmount(outsourceAmount),
        remark: renderRemarkBlock([
          outsourceRemarkText === "-" ? "" : outsourceRemarkText,
          outsourceRemark ?? "",
        ]),
      },
      {
        key: "labor",
        type: "item",
        category: "人力成本",
        withDot: true,
        leftValue: renderLaborValue(
          pricingStrategy.suggestedLaborCost,
          pricingStrategy.targetPrice
            ? formatPercent(
                pricingStrategy.suggestedSummaryAtTarget?.laborCostRate ??
                  (pricingStrategy.targetPrice > 0
                    ? (pricingStrategy.suggestedLaborCost /
                        pricingStrategy.targetPrice) *
                      100
                    : null),
              )
            : "-",
        ),
        rightValue: renderLaborValue(
          pricingStrategy.plannedLaborCost,
          pricingStrategy.bottomLinePrice
            ? formatPercent(
                pricingStrategy.plannedSummaryAtBottomLine?.laborCostRate ??
                  (pricingStrategy.bottomLinePrice > 0
                    ? (pricingStrategy.plannedLaborCost /
                        pricingStrategy.bottomLinePrice) *
                      100
                    : null),
              )
            : "-",
        ),
        remark: "-",
      },
      {
        key: "rent",
        type: "item",
        category: "租金成本",
        withDot: true,
        leftValue: formatAmount(pricingStrategy.rentCost),
        rightValue: formatAmount(pricingStrategy.rentCost),
        remark: "-",
      },
      {
        key: "middle-office",
        type: "item",
        category: "中台成本",
        withDot: true,
        leftValue: formatAmount(pricingStrategy.suggestedMiddleOfficeCost),
        rightValue: formatAmount(pricingStrategy.plannedMiddleOfficeCost),
        remark: "-",
      },
      {
        key: "execution",
        type: "item",
        category: "执行费用成本",
        withDot: true,
        leftValue: formatAmount(executionCost),
        rightValue: formatAmount(executionCost),
        remark: renderRemarkBlock(
          executionRemarkText === "-" ? [] : executionRemarkText.split("\n"),
        ),
      },
      {
        key: "total",
        type: "item",
        category: "成本合计",
        leftValue: formatAmount(leftCostTotal),
        rightValue: formatAmount(rightCostTotal),
        remark: "-",
      },
    ];

    return {
      leftTitle: "理想报价",
      rightTitle: "最低报价",
      rows,
    };
  }, [latestCostEstimation?.clientBudget, pricingStrategy]);

  const pricingPreviewColumns = useMemo<ColumnsType<PricingPreviewRow>>(
    () => [
      {
        title: "类别",
        dataIndex: "category",
        key: "category",
        width: "16.67%",
        onHeaderCell: () => ({
          style: { borderInlineEnd: "none", paddingLeft: 24 },
        }),
        onCell: (row) =>
          row.type === "section"
            ? {
                colSpan: 4,
                style: {
                  background: "#fafafa",
                  color: "rgba(0,0,0,0.45)",
                  fontSize: 12,
                  fontWeight: 600,
                  borderInlineEnd: "none",
                  paddingLeft: 24,
                },
              }
            : {
                style:
                  row.key === "total"
                    ? {
                        background: "#fafafa",
                        fontWeight: 700,
                        borderInlineEnd: "none",
                        paddingLeft: 24,
                      }
                    : { borderInlineEnd: "none", paddingLeft: 24 },
              },
        render: (value, row) =>
          row.type === "section" ? (
            value
          ) : (
            <div>
              <span style={{ fontWeight: row.key === "total" ? 700 : 500 }}>
                {row.withDot ? (
                  <span style={{ marginRight: 8, color: "#bfbfbf" }}>•</span>
                ) : null}
                {value}
              </span>
              {row.key === "labor" ? (
                <div
                  style={{
                    marginTop: 4,
                    marginLeft: row.withDot ? 16 : 0,
                    color: "rgba(0,0,0,0.45)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  人力成本率
                </div>
              ) : null}
            </div>
          ),
      },
      {
        title: pricingPreviewTable?.leftTitle ?? "左侧报价",
        dataIndex: "leftValue",
        key: "leftValue",
        width: "16.67%",
        align: "right",
        onHeaderCell: () => ({
          style: {
            borderInlineEnd: "none",
            textAlign: "right",
            paddingRight: 28,
          },
        }),
        onCell: (row) =>
          row.type === "section"
            ? { colSpan: 0 }
            : {
                style:
                  row.key === "total"
                    ? {
                        background: "#fafafa",
                        fontWeight: 700,
                        borderInlineEnd: "none",
                        textAlign: "right",
                        paddingRight: 28,
                      }
                    : {
                        borderInlineEnd: "none",
                        textAlign: "right",
                        paddingRight: 28,
                      },
              },
        render: (value, row) => (
          <span
            style={{
              color: row.emphasizeLeftColor,
              fontWeight: row.key === "total" ? 700 : 600,
            }}
          >
            {value ?? "-"}
          </span>
        ),
      },
      {
        title: pricingPreviewTable?.rightTitle ?? "右侧报价",
        dataIndex: "rightValue",
        key: "rightValue",
        width: "16.66%",
        align: "right",
        onHeaderCell: () => ({
          style: {
            borderInlineEnd: "none",
            textAlign: "right",
            paddingRight: 28,
          },
        }),
        onCell: (row) =>
          row.type === "section"
            ? { colSpan: 0 }
            : {
                style:
                  row.key === "total"
                    ? {
                        background: "#fafafa",
                        fontWeight: 700,
                        borderInlineEnd: "none",
                        textAlign: "right",
                        paddingRight: 28,
                      }
                    : {
                        borderInlineEnd: "none",
                        textAlign: "right",
                        paddingRight: 28,
                      },
              },
        render: (value, row) => (
          <span
            style={{
              color: row.emphasizeRightColor,
              fontWeight: row.key === "total" ? 700 : 600,
            }}
          >
            {value ?? "-"}
          </span>
        ),
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: "50%",
        onHeaderCell: () => ({
          style: { borderInlineEnd: "none", paddingLeft: 36 },
        }),
        onCell: (row) =>
          row.type === "section"
            ? { colSpan: 0 }
            : {
                style:
                  row.key === "total"
                    ? {
                        background: "#fafafa",
                        fontWeight: 700,
                        borderInlineEnd: "none",
                        color: "rgba(0,0,0,0.65)",
                        paddingLeft: 36,
                      }
                    : {
                        borderInlineEnd: "none",
                        color: "rgba(0,0,0,0.65)",
                        paddingLeft: 36,
                      },
              },
      },
    ],
    [pricingPreviewTable?.leftTitle, pricingPreviewTable?.rightTitle],
  );

  const contentNode = pricingLoading ? (
    <div style={{ width: "100%", padding: "24px 0", textAlign: "center" }}>
      <Spin />
    </div>
  ) : pricingStrategy ? (
    <div style={{ width: "100%" }}>
      <ProjectDetailTitledTableCard
        projectName={projectName}
        titleSuffix="报价参考"
        estimatedDuration={
          pricingStrategy.estimatedDuration ??
          latestCostEstimation?.estimatedDuration
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          {pricingSummaryPanels.map((panel, index) => (
            <div
              key={panel.label}
              style={{
                padding: "16px 20px",
                borderRight:
                  index === pricingSummaryPanels.length - 1
                    ? "none"
                    : "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(0,0,0,0.65)",
                  fontWeight: 600,
                  textAlign: "center",
                  paddingTop: 0,
                  paddingRight: 20,
                  paddingBottom: 10,
                  paddingLeft: 20,
                  margin: "0 -20px 12px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {panel.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.75)",
                      marginBottom: 6,
                    }}
                  >
                    报价
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      color: FINANCIAL_METRIC_COLORS.income,
                      fontWeight: 700,
                    }}
                  >
                    {typeof panel.income === "number"
                      ? `${formatAmount(panel.income)}元`
                      : "-"}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "rgba(0,0,0,0.45)",
                    }}
                  >
                    {typeof panel.income === "number" ? (
                      <span>
                        成本基准参考
                        <Tooltip
                          title={`报价 ${formatAmount(panel.income)} * 成本基准参考率 ${formatAmount(projectCostBaselineRatio)}% = ${formatAmount(
                            panel.income * (projectCostBaselineRatio / 100),
                          )} 元`}
                        >
                          <InfoCircleOutlined
                            style={{ marginLeft: 4, color: "rgba(0,0,0,0.45)" }}
                          />
                        </Tooltip>
                        {`：${formatAmount(
                          panel.income * (projectCostBaselineRatio / 100),
                        )}元`}
                      </span>
                    ) : (
                      "成本基准参考：-"
                    )}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.75)",
                      marginBottom: 6,
                    }}
                  >
                    费用
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      color: COST_VALUE_COLOR,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    {typeof panel.cost === "number"
                      ? `${formatAmount(panel.cost)}元`
                      : "-"}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background: "#d9d9d9",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, panel.costRatio ?? 0))}%`,
                          height: "100%",
                          background: COST_BAR_COLOR,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: COST_VALUE_COLOR,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {formatPercent(panel.costRatio)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {pricingCompositionComparison ? (
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(0,0,0,0.65)",
                textAlign: "center",
                paddingTop: 0,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
                margin: "0 -20px 12px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              {pricingCompositionComparison.title}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 1px minmax(0, 1fr)",
                gap: 0,
                alignItems: "stretch",
              }}
            >
              <div style={{ paddingRight: 12 }}>
                <CompositionRatioBar
                  items={pricingCompositionComparison.left.items}
                  barOpacity={0.6}
                  legendColumns={3}
                />
              </div>
              <div style={{ background: "#f0f0f0" }} />
              <div style={{ paddingLeft: 12 }}>
                <CompositionRatioBar
                  items={pricingCompositionComparison.right.items}
                  barOpacity={0.6}
                  legendColumns={3}
                />
              </div>
            </div>
          </div>
        ) : null}
        {pricingPreviewTable ? (
          <Table<PricingPreviewRow>
            rowKey="key"
            pagination={false}
            columns={pricingPreviewColumns}
            dataSource={pricingPreviewTable.rows}
            bordered
            size="small"
            tableLayout="fixed"
            style={{ width: "100%" }}
          />
        ) : null}
      </ProjectDetailTitledTableCard>
    </div>
  ) : (
    <Empty description="暂无项目报价参考" />
  );

  return (
    <>
      {contextHolder}
      {mode === "full" ? (
        <Card title="项目报价参考" extra={actionsNode}>
          {contentNode}
        </Card>
      ) : null}
      {mode === "actions" ? actionsNode : null}
      {mode === "content" ? contentNode : null}

      {mode !== "content" ? (
        <ProjectPricingStrategyModal
          open={pricingModalOpen}
          onCancel={() => setPricingModalOpen(false)}
          projectId={projectId}
          estimation={latestCostEstimation}
          existingStrategy={pricingStrategy}
          onCreated={async () => {
            await fetchPricingStrategy();
            window.dispatchEvent(
              new CustomEvent(PRICING_STRATEGY_UPDATED_EVENT, {
                detail: {
                  projectId,
                  estimationId: latestCostEstimation?.id,
                },
              }),
            );
          }}
        />
      ) : null}
    </>
  );
};

export default ProjectPricingStrategyCard;
