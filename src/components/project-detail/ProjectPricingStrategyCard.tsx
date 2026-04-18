"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Empty, Space, Spin, message } from "antd";
import ProjectPricingStrategyModal from "@/components/project-detail/ProjectPricingStrategyModal";
import ProjectPricingStrategyRangeTable from "@/components/project-detail/pricing-strategy/ProjectPricingStrategyRangeTable";
import ProjectPricingStrategyTargetTable from "@/components/project-detail/pricing-strategy/ProjectPricingStrategyTargetTable";
import type { ProjectPricingStrategy } from "@/components/project-detail/pricing-strategy/types";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/projectDetail";

type Props = {
  projectId: string;
  projectName: string;
  latestCostEstimation?: Project["latestCostEstimation"];
  mode?: "full" | "actions" | "content";
};

const PRICING_STRATEGY_UPDATED_EVENT = "project-pricing-strategy-updated";

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

const formatRate = (numerator: number, denominator: number) => {
  if (!denominator) return "-";
  const value = (numerator / denominator) * 100;
  return `${value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
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

const formatExecutionCostRemarkText = (pricingStrategy: ProjectPricingStrategy) => {
  const validItems = (pricingStrategy.costItems ?? []).filter(
    (item) => typeof item.budgetAmount === "number" && item.costTypeOption?.value,
  );
  if (validItems.length === 0) return "-";
  return validItems
    .map((item) => `${item.costTypeOption?.value}：${formatAmount(item.budgetAmount)}`)
    .join("\n");
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
  const [pricingStrategy, setPricingStrategy] = useState<ProjectPricingStrategy | null>(
    null,
  );
  const [pricingLoading, setPricingLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

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
      const res = await fetch(`/api/project-pricing-strategies?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setPricingStrategy(null);
        return;
      }
      const rows = (await res.json()) as ProjectPricingStrategy[];
      setPricingStrategy(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
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
        const customerBudget = toMoney(latestCostEstimation?.clientBudget ?? null);
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
          ((pricingStrategy.agencyFeeRate ?? 0) * pricingStrategy.targetPrice) / 100;
        const breakEvenCustomer =
          getProjectOutsourceTotal(pricingStrategy.outsourceItems) +
          pricingStrategy.plannedLaborCost +
          pricingStrategy.plannedMiddleOfficeCost +
          customerBudgetAgencyFee +
          pricingStrategy.rentCost +
          (pricingStrategy.plannedExecutionCost ?? 0);
        const breakEvenSuggested =
          getProjectOutsourceTotal(pricingStrategy.outsourceItems) +
          pricingStrategy.plannedLaborCost +
          pricingStrategy.plannedMiddleOfficeCost +
          suggestedAgencyFee +
          pricingStrategy.rentCost +
          (pricingStrategy.plannedExecutionCost ?? 0);
        const laborRateCustomer = customerBudgetValue
          ? formatRate(pricingStrategy.plannedLaborCost, customerBudgetValue)
          : "-";
        const laborRateSuggested = pricingStrategy.targetPrice
          ? formatRate(pricingStrategy.plannedLaborCost, pricingStrategy.targetPrice)
          : "-";
        const totalCostRateCustomer = customerBudgetValue
          ? formatRate(breakEvenCustomer, customerBudgetValue)
          : "-";
        const totalCostRateSuggested = pricingStrategy.targetPrice
          ? formatRate(breakEvenSuggested, pricingStrategy.targetPrice)
          : "-";
        const costBenchmarkReference = customerBudgetValue
          ? formatAmount(customerBudgetValue * 0.53)
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
            formatAmount(getProjectOutsourceTotal(pricingStrategy.outsourceItems)),
            "",
            formatProjectOutsourceItemsText(pricingStrategy.outsourceItems),
          ],
          ["人力成本", formatAmount(pricingStrategy.plannedLaborCost), "", "-"],
          ["人力成本率", laborRateCustomer, laborRateSuggested, "-"],
          [
            "中介费",
            formatAmount(customerBudgetAgencyFee),
            formatAmount(suggestedAgencyFee),
            pricingStrategy.agencyFeeRate ? `费率：${pricingStrategy.agencyFeeRate}%` : "-",
          ],
          ["租金成本", formatAmount(pricingStrategy.rentCost), "", "-"],
          [
            "执行费用成本",
            formatAmount(pricingStrategy.plannedExecutionCost),
            "",
            executionRemark,
          ],
          ["中台成本", formatAmount(pricingStrategy.plannedMiddleOfficeCost), "", "-"],
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
          ((pricingStrategy.agencyFeeRate ?? 0) * pricingStrategy.bottomLinePrice) / 100;
        const targetAgencyFee =
          ((pricingStrategy.agencyFeeRate ?? 0) * pricingStrategy.targetPrice) / 100;
        const plannedBreakEven =
          getProjectOutsourceTotal(pricingStrategy.outsourceItems) +
          pricingStrategy.plannedLaborCost +
          pricingStrategy.plannedMiddleOfficeCost +
          bottomAgencyFee +
          pricingStrategy.rentCost +
          (pricingStrategy.plannedExecutionCost ?? 0);
        const suggestedBreakEven =
          getProjectOutsourceTotal(pricingStrategy.outsourceItems) +
          pricingStrategy.suggestedLaborCost +
          pricingStrategy.suggestedMiddleOfficeCost +
          targetAgencyFee +
          pricingStrategy.rentCost +
          (pricingStrategy.plannedExecutionCost ?? 0);
        const laborRateTarget = pricingStrategy.targetPrice
          ? formatRate(pricingStrategy.suggestedLaborCost, pricingStrategy.targetPrice)
          : "-";
        const laborRateBottom = pricingStrategy.bottomLinePrice
          ? formatRate(pricingStrategy.plannedLaborCost, pricingStrategy.bottomLinePrice)
          : "-";
        const totalCostRateTarget = pricingStrategy.targetPrice
          ? formatRate(suggestedBreakEven, pricingStrategy.targetPrice)
          : "-";
        const totalCostRateBottom = pricingStrategy.bottomLinePrice
          ? formatRate(plannedBreakEven, pricingStrategy.bottomLinePrice)
          : "-";
        const costBenchmarkReference =
          typeof pricingStrategy.targetPrice === "number"
            ? formatAmount(pricingStrategy.targetPrice * 0.53)
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
            formatAmount(getProjectOutsourceTotal(pricingStrategy.outsourceItems)),
            "",
            formatProjectOutsourceItemsText(pricingStrategy.outsourceItems),
          ],
          ["人力成本", formatAmount(pricingStrategy.suggestedLaborCost), formatAmount(pricingStrategy.plannedLaborCost), "-"],
          ["人力成本率", laborRateTarget, laborRateBottom, "-"],
          [
            "中介费",
            formatAmount(targetAgencyFee),
            formatAmount(bottomAgencyFee),
            pricingStrategy.agencyFeeRate ? `费率：${pricingStrategy.agencyFeeRate}%` : "-",
          ],
          ["租金成本", formatAmount(pricingStrategy.rentCost), "", "-"],
          ["执行费用成本", formatAmount(pricingStrategy.plannedExecutionCost), "", executionRemark],
          ["中台成本", formatAmount(pricingStrategy.suggestedMiddleOfficeCost), formatAmount(pricingStrategy.plannedMiddleOfficeCost), "-"],
          ["盈亏平衡", formatAmount(suggestedBreakEven), formatAmount(plannedBreakEven), "-"],
          ["总费用占比", totalCostRateTarget, totalCostRateBottom, "-"],
        ];
        rows.forEach((row) => worksheet.addRow(row));
        worksheet.mergeCells("B4:C4");
        worksheet.mergeCells("B7:C7");
        worksheet.mergeCells("B8:C8");
        worksheet.mergeCells("B9:C9");
      }

      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(2).font = { bold: true };
      worksheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };
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

  const contentNode = pricingLoading ? (
    <div style={{ width: "100%", padding: "24px 0", textAlign: "center" }}>
      <Spin />
    </div>
  ) : pricingStrategy ? (
    pricingStrategy.mode === "target" ? (
      <ProjectPricingStrategyTargetTable
        pricingStrategy={pricingStrategy}
        projectName={projectName}
        clientBudget={latestCostEstimation?.clientBudget}
      />
    ) : (
      <ProjectPricingStrategyRangeTable
        pricingStrategy={pricingStrategy}
        projectName={projectName}
      />
    )
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
