"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Project } from "@/types/projectDetail";
import ProjectFinancialStructureModal, {
  type ImportedFinancialStructurePrefill,
} from "@/components/project-detail/ProjectFinancialStructureModal";
import ProjectDetailTitledTableCard from "@/components/project-detail/ProjectDetailTitledTableCard";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import CompositionRatioBar, {
  type CompositionRatioItem,
} from "@/components/CompositionRatioBar";
import { COST_COMPOSITION_COLORS } from "@/lib/cost-composition-colors";
import {
  FINANCIAL_METRIC_BAR_COLORS,
  FINANCIAL_METRIC_COLORS,
} from "@/lib/financial-metric-colors";
import { DEFAULT_COLOR } from "@/lib/constants";

type Props = {
  projectId: string;
  projectName: string;
  canManageProject: boolean;
  latestInitiation?: Project["latestInitiation"];
  mode?: "full" | "actions" | "content";
  refreshKey?: number;
  onSaved?: () => void | Promise<void>;
};

type ProjectFinancialStructure = {
  id: string;
  projectId: string;
  estimationId?: string | null;
  contractAmountTaxIncluded?: number | null;
  laborCost: number;
  rentCost: number;
  middleOfficeCost: number;
  executionCost: number;
  agencyFeeRate: number;
  totalCost: number;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
  outsourceRemark?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
  estimation?: {
    id: string;
    projectId: string;
    version: number;
    type: "planning" | "baseline";
  } | null;
  executionCostItems?: Array<{
    id: string;
    costTypeOptionId: string;
    budgetAmount: number;
    remark?: string | null;
    costTypeOption?: {
      id?: string;
      value?: string | null;
    } | null;
  }>;
};

type FinancialStructurePreviewRow = {
  key: string;
  type: "section" | "item";
  name: string;
  amount?: string;
  remark?: React.ReactNode;
  emphasizeAmountColor?: string;
  withDot?: boolean;
};

type ParsedWorksheetCell = {
  text: string;
  numberValue: number | null;
};

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const previewSectionRowStyle = {
  borderInlineEnd: "none",
  background: "#fafafa",
  fontSize: 12,
  color: "rgba(0,0,0,0.45)",
} as const;

const formatAmountPlain = (value?: number | null) => formatAmount(value);

const toMoney = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").replaceAll("，", "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeWorksheetText = (value: string) =>
  value.trim().replace(/\s+/g, "").replace(/[：:]/g, "").toLowerCase();

const extractNumberFromText = (value: string) => {
  const matched = value.match(/-?\d+(?:,\d{3})*(?:\.\d+)?/);
  if (!matched) return null;
  const parsed = Number(matched[0].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWorksheetCellValue = (value: unknown): ParsedWorksheetCell => {
  if (value === null || value === undefined) {
    return { text: "", numberValue: null };
  }
  if (typeof value === "number") {
    return {
      text: String(value),
      numberValue: Number.isFinite(value) ? value : null,
    };
  }
  if (typeof value === "string") {
    return { text: value.trim(), numberValue: extractNumberFromText(value) };
  }
  if (typeof value === "boolean") {
    return { text: value ? "TRUE" : "FALSE", numberValue: null };
  }
  if (value instanceof Date) {
    return { text: value.toISOString(), numberValue: null };
  }
  if (typeof value === "object" && value) {
    const asRecord = value as Record<string, unknown>;
    const richText = asRecord.richText;
    if (Array.isArray(richText)) {
      const text = richText
        .map((item) =>
          typeof item === "object" && item && "text" in item
            ? String((item as Record<string, unknown>).text ?? "")
            : "",
        )
        .join("")
        .trim();
      return { text, numberValue: extractNumberFromText(text) };
    }
    if (typeof asRecord.text === "string") {
      const text = asRecord.text.trim();
      return { text, numberValue: extractNumberFromText(text) };
    }
    if (typeof asRecord.result === "number") {
      return { text: String(asRecord.result), numberValue: asRecord.result };
    }
    if (typeof asRecord.result === "string") {
      const text = asRecord.result.trim();
      return { text, numberValue: extractNumberFromText(text) };
    }
  }

  const fallbackText = String(value).trim();
  return {
    text: fallbackText,
    numberValue: extractNumberFromText(fallbackText),
  };
};

const getRowFirstNumberAfterColumn = (
  rowCells: ParsedWorksheetCell[],
  startColumn: number,
) => {
  for (
    let colIndex = startColumn + 1;
    colIndex < rowCells.length;
    colIndex += 1
  ) {
    const amount = rowCells[colIndex]?.numberValue;
    if (typeof amount === "number" && Number.isFinite(amount)) {
      return amount;
    }
  }
  return null;
};

const findRowCellByLabel = (
  rows: ParsedWorksheetCell[][],
  labels: string[],
) => {
  const normalizedLabels = labels.map(normalizeWorksheetText);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const normalizedCellText = normalizeWorksheetText(
        row[colIndex]?.text ?? "",
      );
      if (!normalizedCellText) continue;
      if (normalizedLabels.includes(normalizedCellText)) {
        return { rowIndex, colIndex };
      }
    }
  }
  return null;
};

const parseFinancialStructurePrefillFromWorksheet = (
  worksheetRows: ParsedWorksheetCell[][],
): ImportedFinancialStructurePrefill => {
  const findRowAmount = (labels: string[]) => {
    const located = findRowCellByLabel(worksheetRows, labels);
    if (!located) return null;
    return getRowFirstNumberAfterColumn(
      worksheetRows[located.rowIndex] ?? [],
      located.colIndex,
    );
  };

  const incomePos = findRowCellByLabel(worksheetRows, ["收入"]);
  let incomeTaxIncluded: number | undefined;
  if (incomePos) {
    const incomeRow = worksheetRows[incomePos.rowIndex] ?? [];
    for (
      let colIndex = incomePos.colIndex + 1;
      colIndex < incomeRow.length;
      colIndex += 1
    ) {
      const cell = incomeRow[colIndex];
      if (!cell?.text.includes("含税")) continue;
      if (typeof cell.numberValue === "number") {
        incomeTaxIncluded = cell.numberValue;
        break;
      }
    }
    if (typeof incomeTaxIncluded !== "number") {
      const fallbackAmount = getRowFirstNumberAfterColumn(
        incomeRow,
        incomePos.colIndex,
      );
      if (typeof fallbackAmount === "number")
        incomeTaxIncluded = fallbackAmount;
    }
  }

  const outsourceAmount = findRowAmount(["外包成本"]);
  const laborCost = findRowAmount(["人力成本"]);
  const rentCost = findRowAmount(["租金成本"]);
  const middleOfficeCost = findRowAmount(["中台成本", "中台"]);

  const executionCostItems: Array<{ label: string; amount: number }> = [];
  const executionDetailPos = findRowCellByLabel(worksheetRows, [
    "费用成本明细",
  ]);
  if (executionDetailPos) {
    let emptyRows = 0;
    for (
      let rowIndex = executionDetailPos.rowIndex + 1;
      rowIndex < worksheetRows.length;
      rowIndex += 1
    ) {
      const row = worksheetRows[rowIndex] ?? [];
      const firstNonEmptyIndex = row.findIndex(
        (cell) => cell.text.trim() !== "",
      );
      if (firstNonEmptyIndex < 0) {
        emptyRows += 1;
        if (emptyRows >= 2) break;
        continue;
      }
      emptyRows = 0;
      const label = row[firstNonEmptyIndex]?.text.trim() ?? "";
      if (!label) continue;
      const normalizedLabel = normalizeWorksheetText(label);
      if (["合计", "总计", "费用成本合计"].includes(normalizedLabel)) break;
      const amount = getRowFirstNumberAfterColumn(row, firstNonEmptyIndex);
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        continue;
      }
      executionCostItems.push({ label, amount });
    }
  }

  return {
    incomeTaxIncluded,
    outsourceAmount:
      typeof outsourceAmount === "number" && outsourceAmount > 0
        ? outsourceAmount
        : undefined,
    laborCost: typeof laborCost === "number" ? laborCost : undefined,
    rentCost: typeof rentCost === "number" ? rentCost : undefined,
    middleOfficeCost:
      typeof middleOfficeCost === "number" ? middleOfficeCost : undefined,
    executionCostItems,
  };
};

const ProjectFinancialStructureCard = ({
  projectId,
  projectName,
  canManageProject,
  latestInitiation,
  mode = "full",
  refreshKey = 0,
  onSaved,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importedPrefill, setImportedPrefill] =
    useState<ImportedFinancialStructurePrefill | null>(null);
  const [financialStructure, setFinancialStructure] =
    useState<ProjectFinancialStructure | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageFinancialStructureActions =
    roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE");

  const fetchFinancialStructure = useCallback(async () => {
    if (!projectId) {
      setFinancialStructure(null);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({ projectId });
      if (latestInitiation?.id) {
        query.set("estimationId", latestInitiation.id);
      }

      const res = await fetch(
        `/api/project-financial-structures?${query.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        setFinancialStructure(null);
        return;
      }
      const rows = (await res.json()) as ProjectFinancialStructure[];
      setFinancialStructure(
        Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
      );
    } catch {
      setFinancialStructure(null);
    } finally {
      setLoading(false);
    }
  }, [latestInitiation?.id, projectId]);

  useEffect(() => {
    void fetchFinancialStructure();
  }, [fetchFinancialStructure, refreshKey]);

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
  const projectTaxRate = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingProjectTaxRate,
      ),
    [systemSettings],
  );

  const financialSummary = useMemo(() => {
    if (!financialStructure) return null;
    const projectAmount =
      (typeof financialStructure.contractAmountTaxIncluded === "number"
        ? financialStructure.contractAmountTaxIncluded
        : null) ??
      (typeof latestInitiation?.contractAmount === "number"
        ? latestInitiation.contractAmount
        : null) ??
      toMoney(latestInitiation?.clientBudget);
    const outsourceCost = getProjectOutsourceTotal(
      financialStructure.outsourceItems,
    );
    const agencyFeeAmount =
      typeof projectAmount === "number"
        ? (projectAmount * (financialStructure.agencyFeeRate ?? 0)) / 100
        : null;
    const recomputedTotalCost =
      (agencyFeeAmount ?? 0) +
      outsourceCost +
      financialStructure.laborCost +
      financialStructure.rentCost +
      financialStructure.middleOfficeCost +
      financialStructure.executionCost;
    const projectAmountExcludingTax =
      typeof projectAmount === "number" && Number.isFinite(projectTaxRate)
        ? (() => {
            const denominator = 1 + projectTaxRate / 100;
            if (!Number.isFinite(denominator) || denominator <= 0) return null;
            return projectAmount / denominator;
          })()
        : null;
    const benchmarkAmount =
      typeof projectAmountExcludingTax === "number"
        ? projectAmountExcludingTax * (projectCostBaselineRatio / 100)
        : null;
    const totalCostRatio =
      typeof projectAmount === "number" && projectAmount > 0
        ? Math.round((recomputedTotalCost / projectAmount) * 100)
        : null;
    const laborCostRatio =
      typeof projectAmount === "number" && projectAmount > 0
        ? Math.round((financialStructure.laborCost / projectAmount) * 100)
        : null;
    const profit =
      typeof projectAmount === "number"
        ? projectAmount - recomputedTotalCost
        : null;
    const profitRatio =
      typeof projectAmount === "number" && projectAmount > 0
        ? (profit ?? 0) / projectAmount
        : null;

    const executionCostItems = financialStructure.executionCostItems ?? [];
    const outsourceItems = financialStructure.outsourceItems ?? [];

    const ratioBase = recomputedTotalCost > 0 ? recomputedTotalCost : 0;
    const costCompositionItems: CompositionRatioItem[] = ratioBase
      ? [
          {
            text: "外包",
            percent: (outsourceCost / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.outsource,
          },
          {
            text: "人力",
            percent: (financialStructure.laborCost / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.labor,
          },
          {
            text: "租金",
            percent: (financialStructure.rentCost / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.rent,
          },
          {
            text: "中台",
            percent: (financialStructure.middleOfficeCost / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.middleOffice,
          },
          {
            text: "执行",
            percent: (financialStructure.executionCost / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.execution,
          },
          {
            text: "中介",
            percent: ((agencyFeeAmount ?? 0) / ratioBase) * 100,
            color: COST_COMPOSITION_COLORS.agency,
          },
        ]
      : [];

    return {
      projectAmount,
      projectAmountExcludingTax,
      outsourceCost,
      agencyFeeAmount,
      recomputedTotalCost,
      benchmarkAmount,
      totalCostRatio,
      laborCostRatio,
      profit,
      profitRatio,
      executionCostItems,
      outsourceItems,
      costCompositionItems,
    };
  }, [
    financialStructure,
    latestInitiation?.clientBudget,
    latestInitiation?.contractAmount,
    projectCostBaselineRatio,
    projectTaxRate,
  ]);

  const previewRows = useMemo<FinancialStructurePreviewRow[]>(() => {
    if (!financialStructure || !financialSummary) return [];

    const outsourceRemarkText = financialStructure.outsourceRemark?.trim();
    const otherExecutionCostRemark =
      latestInitiation?.otherExecutionCostRemark?.trim();
    const hasOutsourceItems = financialSummary.outsourceItems.length > 0;
    const outsourceRemarkNode =
      hasOutsourceItems || outsourceRemarkText ? (
        <div style={{ lineHeight: 1.8 }}>
          {financialSummary.outsourceItems.map((item) => (
            <div key={item.id}>
              {`${item.type}：${formatAmount(item.amount)}元`}
            </div>
          ))}
          {outsourceRemarkText ? (
            <div style={{ marginTop: 6 }}>
              <Tag color="default">{outsourceRemarkText}</Tag>
            </div>
          ) : null}
        </div>
      ) : (
        "-"
      );

    const executionRemarkNode =
      financialSummary.executionCostItems.length > 0 ? (
        <div style={{ lineHeight: 1.8 }}>
          {financialSummary.executionCostItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>{`${item.costTypeOption?.value ?? "未命名费用类型"}：${formatAmount(item.budgetAmount)}元`}</span>
              {item.costTypeOption?.value?.trim() === "其他" &&
              otherExecutionCostRemark ? (
                <Tag color={DEFAULT_COLOR}>{otherExecutionCostRemark}</Tag>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        "-"
      );

    return [
      { key: "income-section", type: "section", name: "收入" },
      {
        key: "income",
        type: "item",
        name: "收入(含税)",
        amount: formatAmount(financialSummary.projectAmount),
        remark:
          typeof financialSummary.projectAmountExcludingTax === "number"
            ? `不含税：${formatAmount(financialSummary.projectAmountExcludingTax)} 元`
            : "-",
        emphasizeAmountColor: FINANCIAL_METRIC_COLORS.income,
      },
      { key: "cost-section", type: "section", name: "成本明细" },
      {
        key: "agency",
        type: "item",
        withDot: true,
        name: "中介费",
        amount: formatAmount(financialSummary.agencyFeeAmount),
        remark:
          typeof financialSummary.projectAmount === "number" &&
          typeof financialStructure.agencyFeeRate === "number"
            ? `合同金额（含税）${formatAmount(financialSummary.projectAmount)} 元 * 费率 ${formatAmount(financialStructure.agencyFeeRate)}%`
            : "-",
      },
      {
        key: "outsource",
        type: "item",
        withDot: true,
        name: "外包成本",
        amount: formatAmount(financialSummary.outsourceCost),
        remark: outsourceRemarkNode,
      },
      {
        key: "labor",
        type: "item",
        withDot: true,
        name: "人力成本",
        amount: formatAmount(financialStructure.laborCost),
        remark:
          typeof financialSummary.laborCostRatio === "number"
            ? `人力成本率 ${financialSummary.laborCostRatio}%`
            : "-",
      },
      {
        key: "rent",
        type: "item",
        withDot: true,
        name: "租金成本",
        amount: formatAmount(financialStructure.rentCost),
        remark: "-",
      },
      {
        key: "middle",
        type: "item",
        withDot: true,
        name: "中台成本",
        amount: formatAmount(financialStructure.middleOfficeCost),
        remark: "-",
      },
      {
        key: "execution",
        type: "item",
        withDot: true,
        name: "执行费用成本",
        amount: formatAmount(financialStructure.executionCost),
        remark: executionRemarkNode,
      },
      {
        key: "total",
        type: "item",
        name: "成本合计",
        amount: formatAmount(financialSummary.recomputedTotalCost),
      },
    ];
  }, [
    financialStructure,
    financialSummary,
    latestInitiation?.otherExecutionCostRemark,
  ]);

  const previewColumns = useMemo<ColumnsType<FinancialStructurePreviewRow>>(
    () => [
      {
        title: "名称",
        dataIndex: "name",
        key: "name",
        width: 280,
        onHeaderCell: () => ({
          style: { borderInlineEnd: "none", paddingLeft: 20 },
        }),
        onCell: (row) =>
          row.type === "section"
            ? {
                colSpan: 3,
                style: {
                  ...previewSectionRowStyle,
                  paddingLeft: 24,
                  paddingRight: 24,
                },
              }
            : {
                style: {
                  borderInlineEnd: "none",
                  paddingLeft: 24,
                  ...(row.key === "total"
                    ? { background: "#fafafa", fontWeight: 700 }
                    : null),
                },
              },
        render: (value, row) =>
          row.type === "section" ? (
            <span
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: "rgba(0,0,0,0.45)",
              }}
            >
              {value}
            </span>
          ) : (
            <span style={{ fontWeight: row.key === "total" ? 700 : 500 }}>
              {row.withDot ? (
                <span style={{ marginRight: 8, color: "#bfbfbf" }}>•</span>
              ) : null}
              {value}
            </span>
          ),
      },
      {
        title: "金额 (元)",
        dataIndex: "amount",
        key: "amount",
        width: 180,
        onHeaderCell: () => ({
          style: {
            textAlign: "right",
            paddingRight: 28,
            borderInlineEnd: "none",
          },
        }),
        onCell: (row) =>
          row.type === "section"
            ? { colSpan: 0 }
            : {
                style: {
                  textAlign: "right",
                  paddingRight: 28,
                  borderInlineEnd: "none",
                  ...(row.key === "total"
                    ? { background: "#fafafa", fontWeight: 700 }
                    : null),
                },
              },
        render: (value, row) => (
          <span
            style={{
              color: row.emphasizeAmountColor,
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
        onHeaderCell: () => ({
          style: { paddingLeft: 24, paddingRight: 24 },
        }),
        onCell: (row) =>
          row.type === "section"
            ? { colSpan: 0 }
            : {
                style: {
                  color: "rgba(0,0,0,0.65)",
                  paddingLeft: 24,
                  paddingRight: 24,
                  ...(row.key === "total"
                    ? { background: "#fafafa", fontWeight: 700 }
                    : null),
                },
              },
      },
    ],
    [],
  );

  const downloadFinancialStructureTable = useCallback(async () => {
    if (!financialStructure) return;

    const projectAmount =
      (typeof financialStructure.contractAmountTaxIncluded === "number"
        ? financialStructure.contractAmountTaxIncluded
        : null) ??
      (typeof latestInitiation?.contractAmount === "number"
        ? latestInitiation.contractAmount
        : null) ??
      toMoney(latestInitiation?.clientBudget);
    const outsourceCost = getProjectOutsourceTotal(
      financialStructure.outsourceItems,
    );
    const agencyFeeAmount =
      typeof projectAmount === "number"
        ? (projectAmount * (financialStructure.agencyFeeRate ?? 0)) / 100
        : null;
    const recomputedTotalCost =
      (agencyFeeAmount ?? 0) +
      outsourceCost +
      financialStructure.laborCost +
      financialStructure.rentCost +
      financialStructure.middleOfficeCost +
      financialStructure.executionCost;
    const benchmarkRemark =
      typeof financialSummary?.projectAmountExcludingTax === "number"
        ? `成本基准参考：${formatAmount(
            financialSummary.projectAmountExcludingTax *
              (projectCostBaselineRatio / 100),
          )}`
        : "成本基准参考：-";
    const totalCostRatioRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `${Math.round((recomputedTotalCost / projectAmount) * 100)}%`
        : "-";
    const laborCostRateRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `人力成本率 ${Math.round((financialStructure.laborCost / projectAmount) * 100)}%`
        : "-";
    const executionCostRemark =
      (financialStructure.executionCostItems?.length ?? 0) > 0
        ? (financialStructure.executionCostItems ?? [])
            .map(
              (item) =>
                `${item.costTypeOption?.value ?? "未命名费用类型"}：${formatAmountPlain(item.budgetAmount)}`,
            )
            .join("\n")
        : "-";
    const outsourceRemarkText = (() => {
      const lines: string[] = [];
      if ((financialStructure.outsourceItems?.length ?? 0) > 0) {
        lines.push(
          ...(financialStructure.outsourceItems ?? []).map(
            (item) => `${item.type}：${formatAmountPlain(item.amount)}`,
          ),
        );
      }
      const remark = financialStructure.outsourceRemark?.trim();
      if (remark) {
        if (lines.length > 0) lines.push("");
        lines.push(remark);
      }
      return lines.join("\n") || "-";
    })();

    const exportRows: Array<[string, string, string]> = [
      ["收入", formatAmountPlain(projectAmount), benchmarkRemark],
      [
        "中介费",
        formatAmountPlain(agencyFeeAmount),
        typeof financialStructure.agencyFeeRate === "number"
          ? `费率：${formatAmount(financialStructure.agencyFeeRate)}%`
          : "-",
      ],
      ["外包成本", formatAmountPlain(outsourceCost), outsourceRemarkText],
      [
        "人力成本",
        formatAmountPlain(financialStructure.laborCost),
        laborCostRateRemark,
      ],
      ["租金成本", formatAmountPlain(financialStructure.rentCost), "-"],
      ["中台成本", formatAmountPlain(financialStructure.middleOfficeCost), "-"],
      [
        "执行费用成本",
        formatAmountPlain(financialStructure.executionCost),
        executionCostRemark,
      ],
      [
        "成本合计",
        formatAmountPlain(recomputedTotalCost),
        totalCostRatioRemark,
      ],
    ];

    setDownloading(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("项目财务结构");
      const tableTitle = `【${projectName || "未命名项目"}】${
        latestInitiation?.estimatedDuration ?? "-"
      }个工作日财务结构`;

      worksheet.addRow([tableTitle, "", ""]);
      worksheet.mergeCells("A1:C1");
      worksheet.addRow(["名称", "金额", "备注"]);
      exportRows.forEach((row) => worksheet.addRow(row));

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

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "top",
            horizontal: rowNumber <= 2 ? "center" : "left",
            wrapText: true,
          };
        });
      });

      const lastRow = worksheet.rowCount;
      for (let rowIndex = 1; rowIndex <= lastRow; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= 3; columnIndex += 1) {
          const cell = worksheet.getCell(rowIndex, columnIndex);
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
      }

      worksheet.columns = [{ width: 22 }, { width: 32 }, { width: 44 }];

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
      link.download = `${projectName || "项目"}-财务结构-${yyyy}${mm}${dd}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (typeof app?.message?.success === "function") {
        app.message.success("开始下载表格");
      } else {
        void messageApi.success("开始下载表格");
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
    financialStructure,
    financialSummary,
    latestInitiation,
    messageApi,
    projectCostBaselineRatio,
    projectName,
  ]);

  const openFinancialStructureModal = useCallback(
    (prefill?: ImportedFinancialStructurePrefill | null) => {
      setImportedPrefill(prefill ?? null);
      setModalOpen(true);
    },
    [],
  );

  const handleFinancialStructureImport = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const fileBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error("MISSING_WORKSHEET");
        }

        let maxColumnCount = 0;
        worksheet.eachRow((row) => {
          if (row.cellCount > maxColumnCount) {
            maxColumnCount = row.cellCount;
          }
        });

        const worksheetRows: ParsedWorksheetCell[][] = [];
        for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
          const rowCells: ParsedWorksheetCell[] = [];
          for (let colIndex = 1; colIndex <= maxColumnCount; colIndex += 1) {
            const cellValue = worksheet.getCell(rowIndex, colIndex).value;
            rowCells.push(parseWorksheetCellValue(cellValue));
          }
          worksheetRows.push(rowCells);
        }

        const parsed =
          parseFinancialStructurePrefillFromWorksheet(worksheetRows);
        const hasAnyParsedValue =
          typeof parsed.incomeTaxIncluded === "number" ||
          typeof parsed.outsourceAmount === "number" ||
          typeof parsed.laborCost === "number" ||
          typeof parsed.rentCost === "number" ||
          typeof parsed.middleOfficeCost === "number" ||
          (parsed.executionCostItems?.length ?? 0) > 0;
        if (!hasAnyParsedValue) {
          if (typeof app?.message?.error === "function") {
            app.message.error("未识别到可导入的数据，请检查 Excel 模板内容");
          } else {
            void messageApi.error(
              "未识别到可导入的数据，请检查 Excel 模板内容",
            );
          }
          return;
        }

        openFinancialStructureModal(parsed);
        if (typeof app?.message?.success === "function") {
          app.message.success("已解析 Excel，已为你预填财务结构");
        } else {
          void messageApi.success("已解析 Excel，已为你预填财务结构");
        }
      } catch (error) {
        console.error(error);
        if (typeof app?.message?.error === "function") {
          app.message.error("导入失败，请确认文件为可读取的 Excel（.xlsx）");
        } else {
          void messageApi.error(
            "导入失败，请确认文件为可读取的 Excel（.xlsx）",
          );
        }
      } finally {
        setImporting(false);
      }
    },
    [app, messageApi, openFinancialStructureModal],
  );

  const actionsNode = canManageFinancialStructureActions ? (
    <Space>
      {!financialStructure ? (
        <Button
          onClick={() => importFileInputRef.current?.click()}
          loading={importing}
          disabled={!canManageProject}
        >
          导入财务结构
        </Button>
      ) : null}
      <Button
        onClick={() => void downloadFinancialStructureTable()}
        disabled={!financialStructure}
        loading={downloading}
      >
        下载表格
      </Button>
      <Button
        type="primary"
        onClick={() => openFinancialStructureModal(null)}
        disabled={!canManageProject}
      >
        {financialStructure ? "更新财务结构" : "新增财务结构"}
      </Button>
    </Space>
  ) : null;

  const contentNode = loading ? (
    <div style={{ width: "100%", padding: "24px 0", textAlign: "center" }}>
      <Spin />
    </div>
  ) : financialStructure ? (
    <div style={{ overflowY: "hidden" }}>
      <div style={{ width: "100%", margin: "0 auto" }}>
        <ProjectDetailTitledTableCard
          projectName={projectName}
          titleSuffix="财务结构"
          estimatedDuration={latestInitiation?.estimatedDuration}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <div
              style={{ padding: "16px 20px", borderRight: "1px solid #f0f0f0" }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(0,0,0,0.65)",
                  marginBottom: 6,
                }}
              >
                合同金额（含税）
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: FINANCIAL_METRIC_COLORS.income,
                  marginBottom: 6,
                }}
              >
                {`${formatAmount(financialSummary?.projectAmount)}元`}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(0,0,0,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <span>
                  成本基准参考
                  <Tooltip
                    title={
                      typeof financialSummary?.projectAmountExcludingTax ===
                      "number"
                        ? `不含税金额 ${formatAmount(financialSummary.projectAmountExcludingTax)} 元 * 成本基准参考系数 ${formatAmount(projectCostBaselineRatio)}% = ${formatAmount(financialSummary.benchmarkAmount)} 元`
                        : "不含税金额 - 元 * 成本基准参考系数 -% = - 元"
                    }
                  >
                    <InfoCircleOutlined
                      style={{ marginLeft: 4, color: "rgba(0,0,0,0.45)" }}
                    />
                  </Tooltip>
                </span>
                <span>
                  ：{formatAmount(financialSummary?.benchmarkAmount)}元
                </span>
              </div>
            </div>

            <div
              style={{ padding: "16px 20px", borderRight: "1px solid #f0f0f0" }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(0,0,0,0.65)",
                  marginBottom: 6,
                }}
              >
                费用
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: FINANCIAL_METRIC_COLORS.cost,
                  marginBottom: 8,
                }}
              >
                {`-${formatAmount(financialSummary?.recomputedTotalCost)}元`}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "nowrap",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: "#d9d9d9",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, financialSummary?.totalCostRatio ?? 0),
                      )}%`,
                      height: "100%",
                      background: FINANCIAL_METRIC_BAR_COLORS.cost,
                    }}
                  />
                </div>
                <span
                  style={{
                    color: FINANCIAL_METRIC_COLORS.cost,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {typeof financialSummary?.totalCostRatio === "number"
                    ? `${financialSummary.totalCostRatio}%`
                    : "-"}
                </span>
              </div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(0,0,0,0.65)",
                  marginBottom: 6,
                }}
              >
                利润
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: FINANCIAL_METRIC_COLORS.profit,
                  marginBottom: 8,
                }}
              >
                {typeof financialSummary?.profit === "number"
                  ? `${financialSummary.profit >= 0 ? "+" : ""}${formatAmount(
                      financialSummary.profit,
                    )}元`
                  : "-"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "nowrap",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: "#d9d9d9",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          typeof financialSummary?.profitRatio === "number"
                            ? financialSummary.profitRatio * 100
                            : 0,
                        ),
                      )}%`,
                      height: "100%",
                      background: FINANCIAL_METRIC_BAR_COLORS.profit,
                    }}
                  />
                </div>
                <span
                  style={{
                    color: FINANCIAL_METRIC_COLORS.profit,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {typeof financialSummary?.profitRatio === "number"
                    ? `${(financialSummary.profitRatio * 100).toFixed(1)}%`
                    : "-"}
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
            }}
          >
            <CompositionRatioBar
              title="成本构成（占总成本比）"
              items={financialSummary?.costCompositionItems ?? []}
              barOpacity={0.6}
              legendColumns={6}
            />
          </div>
          <Table<FinancialStructurePreviewRow>
            rowKey="key"
            pagination={false}
            className="financial-structure-preview-table"
            columns={previewColumns}
            dataSource={previewRows}
            size="small"
            tableLayout="fixed"
            style={{ width: "100%", borderRadius: 0 }}
          />
        </ProjectDetailTitledTableCard>
      </div>
    </div>
  ) : (
    <Empty description="暂无项目财务结构数据" />
  );

  return (
    <>
      {contextHolder}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          event.currentTarget.value = "";
          if (!selectedFile) return;
          void handleFinancialStructureImport(selectedFile);
        }}
      />
      {mode === "full" ? (
        <Card
          title="项目财务结构"
          extra={actionsNode}
          styles={{ body: { overflowY: "hidden" } }}
        >
          {contentNode}
        </Card>
      ) : null}
      {mode === "actions" ? actionsNode : null}
      {mode === "content" ? contentNode : null}

      <style jsx global>{`
        .financial-structure-preview-table.ant-table-wrapper
          .ant-table-container
          table
          > thead
          > tr:first-child
          > *:first-child {
        }
        .financial-structure-preview-table.ant-table-wrapper
          .ant-table-container
          table
          > thead
          > tr:first-child
          > *:last-child {
        }
      `}</style>

      {mode !== "content" ? (
        <ProjectFinancialStructureModal
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setImportedPrefill(null);
          }}
          projectId={projectId}
          estimation={latestInitiation}
          existingStructure={financialStructure}
          importedPrefill={importedPrefill}
          onSaved={async () => {
            await fetchFinancialStructure();
            await onSaved?.();
          }}
        />
      ) : null}
    </>
  );
};

export default ProjectFinancialStructureCard;
