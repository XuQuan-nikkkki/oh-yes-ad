"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Card, Spin, Table, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { InfoCircleOutlined } from "@ant-design/icons";
import { StatisticCard } from "@ant-design/pro-components";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { calculateWorkdays } from "@/lib/workday";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project, WorkdayAdjustment } from "@/types/projectDetail";

type Props = {
  projectId: string;
  projectName: string;
  startDate?: string | null;
  latestBaselineCostEstimation?: Project["latestBaselineCostEstimation"];
  members?: Project["members"];
  actualWorkEntries?: Project["actualWorkEntries"];
  workdayAdjustments?: WorkdayAdjustment[];
  onDownloadReady?: ((downloadFn: (() => void) | null) => void) | undefined;
};

type ClientContract = {
  id: string;
  contractAmount?: number | null;
  taxAmount?: number | null;
};

type FinancialStructure = {
  id: string;
  agencyFeeRate?: number | null;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
};

type ReceivablePlan = {
  id: string;
  contractAmount?: number | null;
  serviceContent?: string | null;
};

type PayablePlan = {
  id: string;
  contractAmount?: number | null;
  vendorContract?: {
    serviceContent?: string | null;
    vendor?: {
      id: string;
      name?: string | null;
      fullName?: string | null;
    } | null;
  } | null;
};

type ReimbursementRow = {
  id: string;
  applicantEmployee?: {
    id: string;
    name: string;
  } | null;
  amount: number | string | null;
  categoryOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type CostRow = {
  key: string;
  category: string;
  amount: string;
  ratio: string;
  remark: string;
  bold?: boolean;
};

type BreakdownRowTone = "neutral" | "beige" | "green";

type BreakdownRow = {
  key: string;
  label: string;
  indent?: number;
  amountValue?: number | null;
  ratioValue?: number | null; // relative to income, signed (- for deductions)
  tone?: BreakdownRowTone;
  bold?: boolean;
  barColor?: string;
  showTooltip?: boolean;
  remark?: string;
  note?: string; // when present, render as a full-width note row
};

const FUND_AMOUNT = 10000;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(
      value.trim().replaceAll(",", "").replaceAll("，", ""),
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(4)).toString();
};

const formatYuanText = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(4));
  return rounded.toLocaleString("zh-CN", { maximumFractionDigits: 4 });
};

const buildTooltipContent = (lines: string[]) => (
  <div style={{ whiteSpace: "pre-line" }}>{lines.join("\n")}</div>
);

const formatRatio = (value: number | null) =>
  value === null ? "-" : `${(value * 100).toFixed(2)}%`;

const formatSignedPercentText = (ratioValue?: number | null) => {
  if (ratioValue === null || ratioValue === undefined) return "-";
  if (!Number.isFinite(ratioValue)) return "-";
  const percent = ratioValue * 100;
  const abs = Math.abs(percent);
  if (abs < 0.0005) return "0%";
  if (abs < 0.05) return "≈0%";
  // Prefer 0 decimals for near-integers, otherwise 1 decimal.
  const rounded0 = Math.round(percent);
  if (Math.abs(percent - rounded0) < 0.05) return `${rounded0}%`;
  return `${percent.toFixed(1)}%`;
};

const formatSignedAmountText = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value);
  return rounded.toLocaleString("zh-CN");
};

const getEntryHours = (start: string, end: string) =>
  Math.max((new Date(end).getTime() - new Date(start).getTime()) / 36e5, 0);

const getDateKey = (value: string) => value.slice(0, 10);

const calcEntryWorkdays = (hours: number, total: number) => {
  if (hours === 0) return 0;
  return total > 7.5 ? hours / total : hours / 7.5;
};

const getProjectLevel = (costRatio: number) => {
  if (costRatio < 0.55) return "A";
  if (costRatio < 0.6) return "B";
  return "C";
};

const getBonusRatio = (level: string) => {
  if (level === "A") return 0.15;
  if (level === "B") return 0.1;
  return 0.08;
};

const ProjectRealtimeCostTrackingTable = ({
  projectId,
  projectName,
  startDate,
  latestBaselineCostEstimation,
  members = [],
  actualWorkEntries = [],
  workdayAdjustments = [],
  onDownloadReady,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const downloadTableRef = useRef<(() => Promise<void>) | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canViewLaborCost =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const [loading, setLoading] = useState(true);
  const [clientContract, setClientContract] = useState<ClientContract | null>(
    null,
  );
  const [financialStructure, setFinancialStructure] =
    useState<FinancialStructure | null>(null);
  const [receivablePlans, setReceivablePlans] = useState<ReceivablePlan[]>([]);
  const [payablePlans, setPayablePlans] = useState<PayablePlan[]>([]);
  const [reimbursementRows, setReimbursementRows] = useState<
    ReimbursementRow[]
  >([]);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const refreshTokenRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    const token = ++refreshTokenRef.current;
    setLoading(true);
    try {
      const [
        contractRes,
        structureRes,
        reimbursementRes,
        receivableRes,
        payableRes,
      ] = await Promise.all([
        fetch(`/api/client-contracts?projectId=${projectId}`, {
          cache: "no-store",
        }),
        fetch(`/api/project-financial-structures?projectId=${projectId}`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/reimbursements`, {
          cache: "no-store",
        }),
        fetch(`/api/project-receivable-plans?projectId=${projectId}`, {
          cache: "no-store",
        }),
        fetch(`/api/project-payable-plans?projectId=${projectId}`, {
          cache: "no-store",
        }),
      ]);

      const [
        contractRows,
        structureRows,
        reimbursements,
        receivableRows,
        payableRows,
      ] = await Promise.all([
        contractRes.ok ? ((await contractRes.json()) as ClientContract[]) : [],
        structureRes.ok
          ? ((await structureRes.json()) as FinancialStructure[])
          : [],
        reimbursementRes.ok
          ? ((await reimbursementRes.json()) as ReimbursementRow[])
          : [],
        receivableRes.ok
          ? ((await receivableRes.json()) as ReceivablePlan[])
          : [],
        payableRes.ok ? ((await payableRes.json()) as PayablePlan[]) : [],
      ]);

      if (!mountedRef.current) return;
      if (token !== refreshTokenRef.current) return;

      setClientContract(
        Array.isArray(contractRows) && contractRows[0] ? contractRows[0] : null,
      );
      setFinancialStructure(
        Array.isArray(structureRows) && structureRows[0]
          ? structureRows[0]
          : null,
      );
      setReimbursementRows(Array.isArray(reimbursements) ? reimbursements : []);
      setReceivablePlans(
        Array.isArray(receivableRows) ? (receivableRows as ReceivablePlan[]) : [],
      );
      setPayablePlans(
        Array.isArray(payableRows) ? (payableRows as PayablePlan[]) : [],
      );
    } catch {
      if (!mountedRef.current) return;
      if (token !== refreshTokenRef.current) return;
      setClientContract(null);
      setFinancialStructure(null);
      setReimbursementRows([]);
      setReceivablePlans([]);
      setPayablePlans([]);
    } finally {
      if (mountedRef.current && token === refreshTokenRef.current) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { projectId?: string }
        | undefined;
      if (!detail?.projectId || detail.projectId !== projectId) return;
      void fetchData();
    };
    window.addEventListener("project-reimbursements-updated", handler);
    return () => {
      window.removeEventListener("project-reimbursements-updated", handler);
    };
  }, [fetchData, projectId]);

  const elapsedWorkdays = useMemo(() => {
    if (!startDate) return 0;
    return calculateWorkdays(
      new Date(startDate),
      new Date(),
      workdayAdjustments,
    );
  }, [startDate, workdayAdjustments]);

  const monthlyWorkdayBase = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
      ),
    [systemSettings],
  );
  const defaultMonthlyRentCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultWorkstationCost,
      ) +
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultUtilityCost,
      ),
    [systemSettings],
  );
  const middleOfficeMonthlyCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost,
      ),
    [systemSettings],
  );
  const middleOfficeBaseDays = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays,
      ),
    [systemSettings],
  );
  const middleOfficeDailyCost = useMemo(() => {
    if (middleOfficeBaseDays <= 0) return 0;
    return middleOfficeMonthlyCost / middleOfficeBaseDays;
  }, [middleOfficeBaseDays, middleOfficeMonthlyCost]);

  const expectedWorkdays = latestBaselineCostEstimation?.estimatedDuration ?? 0;

  const laborBreakdown = useMemo(() => {
    const groupedHours = new Map<string, number>();
    actualWorkEntries.forEach((entry) => {
      const employeeId = entry.employee?.id ?? "";
      if (!employeeId) return;
      const key = `${employeeId}__${getDateKey(entry.startDate)}`;
      groupedHours.set(
        key,
        (groupedHours.get(key) ?? 0) +
          getEntryHours(entry.startDate, entry.endDate),
      );
    });

    const byEmployee = new Map<
      string,
      { name: string; workdays: number; cost: number }
    >();

    actualWorkEntries.forEach((entry) => {
      const employee = entry.employee;
      if (!employee?.id) return;
      const monthlyHumanCost =
        toNumber(employee.salary) +
        toNumber(employee.socialSecurity) +
        toNumber(employee.providentFund);
      const hours = getEntryHours(entry.startDate, entry.endDate);
      const total =
        groupedHours.get(`${employee.id}__${getDateKey(entry.startDate)}`) ??
        hours;
      const entryWorkdays = calcEntryWorkdays(hours, total);
      const cost = (monthlyHumanCost / monthlyWorkdayBase) * entryWorkdays;
      const prev = byEmployee.get(employee.id) ?? {
        name: employee.name ?? "-",
        workdays: 0,
        cost: 0,
      };
      byEmployee.set(employee.id, {
        name: prev.name,
        workdays: prev.workdays + entryWorkdays,
        cost: prev.cost + cost,
      });
    });

    const rows = Array.from(byEmployee.entries()).map(
      ([employeeId, value]) => ({
        employeeId,
        name: value.name,
        workdays: value.workdays,
        cost: value.cost,
      }),
    );
    rows.sort((a, b) => b.workdays - a.workdays);
    return rows;
  }, [actualWorkEntries, monthlyWorkdayBase]);

  const actualLaborCost = useMemo(
    () => laborBreakdown.reduce((sum, item) => sum + toNumber(item.cost), 0),
    [laborBreakdown],
  );

  const rentCost = useMemo(
    () =>
      members.reduce(
        (sum) =>
          sum + (defaultMonthlyRentCost / monthlyWorkdayBase) * elapsedWorkdays,
        0,
      ),
    [defaultMonthlyRentCost, elapsedWorkdays, members, monthlyWorkdayBase],
  );

  const income = useMemo(
    () =>
      (receivablePlans ?? []).reduce(
        (sum, plan) => sum + toNumber(plan.contractAmount),
        0,
      ),
    [receivablePlans],
  );
  const taxTotal = toNumber(clientContract?.taxAmount);
  // Allocate total tax across receivable plans by contractAmount proportion.
  const taxBreakdown = useMemo(() => {
    const plans = receivablePlans ?? [];
    const total = income;
    if (plans.length === 0 || total <= 0 || taxTotal <= 0) {
      return plans.map((plan) => ({
        id: plan.id,
        serviceContent: plan.serviceContent,
        tax: 0,
        contractAmount: toNumber(plan.contractAmount),
      }));
    }
    return plans.map((plan) => {
      const contractAmount = toNumber(plan.contractAmount);
      const ratio = contractAmount > 0 ? contractAmount / total : 0;
      return {
        id: plan.id,
        serviceContent: plan.serviceContent,
        tax: taxTotal * ratio,
        contractAmount,
      };
    });
  }, [income, receivablePlans, taxTotal]);
  const tax = taxTotal;
  const netIncome = income - tax;
  const agencyFee =
    income > 0
      ? (income * toNumber(financialStructure?.agencyFeeRate)) / 100
      : 0;
  const outsourceCost = useMemo(
    () =>
      (payablePlans ?? []).reduce(
        (sum, plan) => sum + toNumber(plan.contractAmount),
        0,
      ),
    [payablePlans],
  );
  const executionRemark = useMemo(() => {
    const groups = new Map<string, number>();

    reimbursementRows.forEach((item) => {
      const category = item.categoryOption?.value?.trim() || "未分类";
      const amount = toNumber(item.amount);

      groups.set(category, (groups.get(category) ?? 0) + amount);
    });

    const lines: string[] = [];
    for (const [category, amount] of groups) {
      lines.push(`${category}：${formatAmount(amount)}`);
    }

    return lines.length ? lines.join("\n") : "-";
  }, [reimbursementRows]);
  const executionCost = useMemo(
    () =>
      reimbursementRows.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [reimbursementRows],
  );
  const middleOfficeCost = middleOfficeDailyCost * elapsedWorkdays;
  const totalCost =
    agencyFee +
    outsourceCost +
    actualLaborCost +
    rentCost +
    executionCost +
    middleOfficeCost;
  const projectProfit = income - totalCost;
  const totalCostRatio = income > 0 ? totalCost / income : null;
  const projectLevel = getProjectLevel(totalCostRatio ?? 1);
  const bonusRatio = getBonusRatio(projectLevel);
  const projectBonus = projectProfit * bonusRatio;
  const finalProfit = projectProfit - projectBonus - FUND_AMOUNT;

  const incomeTooltipLines = useMemo(() => {
    const plans = receivablePlans ?? [];
    const lines: string[] = [];
    lines.push(`项目包含 ${plans.length} 个收款计划：`);
    plans.forEach((plan) => {
      const content = plan.serviceContent?.trim() || "未填写服务内容";
      const amount = toNumber(plan.contractAmount);
      lines.push(`${content}： ${formatYuanText(amount)} 元`);
    });
    lines.push(`共计 ${formatYuanText(income)} 元`);
    return lines;
  }, [income, receivablePlans]);

  const taxTooltipLines = useMemo(() => {
    const plans = receivablePlans ?? [];
    const lines: string[] = [];
    lines.push(`项目包含 ${plans.length} 个收款计划，税费分别是：`);
    taxBreakdown.forEach((item) => {
      const content = item.serviceContent?.trim() || "未填写服务内容";
      lines.push(`${content}： ${formatYuanText(toNumber(item.tax))} 元`);
    });
    lines.push(`共计 ${formatYuanText(tax)} 元`);
    return lines;
  }, [receivablePlans, tax, taxBreakdown]);

  const outsourceTooltipLines = useMemo(() => {
    const plans = payablePlans ?? [];
    const lines: string[] = [];
    lines.push(`项目包含 ${plans.length} 个付款计划：`);
    plans.forEach((plan) => {
      const vendorName =
        plan.vendorContract?.vendor?.fullName?.trim() ||
        plan.vendorContract?.vendor?.name?.trim() ||
        "未选择供应商";
      const content =
        plan.vendorContract?.serviceContent?.trim() || "未填写服务内容";
      const amount = toNumber(plan.contractAmount);
      lines.push(`${vendorName}-${content}： ${formatYuanText(amount)} 元`);
    });
    lines.push(`共计 ${formatYuanText(outsourceCost)} 元`);
    return lines;
  }, [outsourceCost, payablePlans]);

  const laborTooltipLines = useMemo(() => {
    const totalWorkdays = laborBreakdown.reduce(
      (sum, item) => sum + toNumber(item.workdays),
      0,
    );
    const memberCount = laborBreakdown.filter(
      (item) => toNumber(item.workdays) > 0,
    ).length;
    const lines: string[] = [];
    lines.push(
      `项目共有 ${memberCount} 个成员投入 ${formatYuanText(totalWorkdays)} 个工作日：`,
    );
    laborBreakdown.forEach((item) => {
      lines.push(
        `${item.name}：已登记工时 ${formatYuanText(
          toNumber(item.workdays),
        )}d，折合 ${formatYuanText(toNumber(item.cost))} 元`,
      );
    });
    lines.push(`共计 ${formatYuanText(actualLaborCost)} 元`);
    return lines;
  }, [actualLaborCost, laborBreakdown]);

  const incomeRemarkText = useMemo(() => {
    const plans = receivablePlans ?? [];
    if (!plans.length) return "-";
    if (
      plans.length === 1 &&
      Math.abs(toNumber(plans[0]?.contractAmount) - income) < 0.0001
    ) {
      return "-";
    }
    return plans
      .map((plan) => {
        const content = plan.serviceContent?.trim() || "未填写服务内容";
        const amount = toNumber(plan.contractAmount);
        return `${content}(${formatYuanText(amount)} 元)`;
      })
      .join(" + ");
  }, [income, receivablePlans]);

  const taxRemarkText = useMemo(() => {
    if (!taxBreakdown.length) return "-";
    const plans = receivablePlans ?? [];
    if (
      plans.length === 1 &&
      taxBreakdown.length === 1 &&
      Math.abs(toNumber(taxBreakdown[0]?.tax) - tax) < 0.0001
    ) {
      return "-";
    }
    return taxBreakdown
      .map((item) => {
        const content = item.serviceContent?.trim() || "未填写服务内容";
        const amount = toNumber(item.tax);
        return `${content}(${formatYuanText(amount)} 元)`;
      })
      .join(" + ");
  }, [receivablePlans, tax, taxBreakdown]);

  const outsourceRemarkText = useMemo(() => {
    const plans = payablePlans ?? [];
    if (!plans.length) return "-";
    return plans
      .map((plan) => {
        const vendorName =
          plan.vendorContract?.vendor?.fullName?.trim() ||
          plan.vendorContract?.vendor?.name?.trim() ||
          "未选择供应商";
        const content =
          plan.vendorContract?.serviceContent?.trim() || "未填写服务内容";
        const amount = toNumber(plan.contractAmount);
        return `${vendorName}-${content}(${formatYuanText(amount)} 元)`;
      })
      .join(" + ");
  }, [payablePlans]);
  const agencyFeeRemarkText = useMemo(
    () => `中介费率 ${financialStructure?.agencyFeeRate ?? 0}%`,
    [financialStructure?.agencyFeeRate],
  );
  const rentRemarkText = useMemo(() => {
    if (monthlyWorkdayBase <= 0) return "-";
    const memberCount = members.length;
    return `(月工位费+月水电费) / 月工作日基数 * 实际工作日 * 成员数 = ${formatYuanText(
      defaultMonthlyRentCost,
    )} / ${formatAmount(monthlyWorkdayBase)} * ${elapsedWorkdays} * ${memberCount}`;
  }, [
    defaultMonthlyRentCost,
    elapsedWorkdays,
    members.length,
    monthlyWorkdayBase,
  ]);

  const middleOfficeRemarkText = useMemo(() => {
    if (middleOfficeBaseDays <= 0) return "-";
    return `中台均值 / 基准天数 * 实际工作日 = ${formatYuanText(
      middleOfficeMonthlyCost,
    )} / ${formatAmount(middleOfficeBaseDays)} * ${elapsedWorkdays}`;
  }, [elapsedWorkdays, middleOfficeBaseDays, middleOfficeMonthlyCost]);

  const rows = useMemo<CostRow[]>(
    () => [
      {
        key: "income",
        category: "收入",
        amount: formatAmount(income),
        ratio: "",
        remark: incomeRemarkText,
      },
      {
        key: "tax",
        category: "税费",
        amount: formatAmount(tax),
        ratio: "",
        remark: taxRemarkText,
      },
      {
        key: "netIncome",
        category: "净收入",
        amount: formatAmount(netIncome),
        ratio: "",
        remark: "-",
      },
      {
        key: "agencyFee",
        category: "中介费",
        amount: formatAmount(agencyFee),
        ratio: formatRatio(income > 0 ? agencyFee / income : null),
        remark: agencyFeeRemarkText,
      },
      {
        key: "outsourceCost",
        category: "外包成本",
        amount: formatAmount(outsourceCost),
        ratio: "",
        remark: outsourceRemarkText,
      },
      {
        key: "laborCost",
        category: "人力成本",
        amount: formatAmount(actualLaborCost),
        ratio: formatRatio(income > 0 ? actualLaborCost / income : null),
        remark: "-",
      },
      {
        key: "rentCost",
        category: "租金成本",
        amount: formatAmount(rentCost),
        ratio: formatRatio(income > 0 ? rentCost / income : null),
        remark: rentRemarkText,
      },
      {
        key: "executionCost",
        category: "执行费用成本",
        amount: formatAmount(executionCost),
        ratio: formatRatio(income > 0 ? executionCost / income : null),
        remark: executionRemark || "-",
      },
      {
        key: "middleOfficeCost",
        category: "中台成本",
        amount: formatAmount(middleOfficeCost),
        ratio: formatRatio(income > 0 ? middleOfficeCost / income : null),
        remark: middleOfficeRemarkText,
      },
      {
        key: "totalCost",
        category: "总费用成本",
        amount: formatAmount(totalCost),
        ratio: formatRatio(totalCostRatio),
        remark: "-",
        bold: true,
      },
      {
        key: "projectProfit",
        category: "项目利润",
        amount: formatAmount(projectProfit),
        ratio: formatRatio(income > 0 ? projectProfit / income : null),
        remark: "-",
      },
      {
        key: "projectLevel",
        category: "项目级别",
        amount: projectLevel,
        ratio: "",
        remark: "-",
      },
      {
        key: "bonusRatio",
        category: "奖金比例",
        amount: formatRatio(bonusRatio),
        ratio: "",
        remark: "-",
      },
      {
        key: "projectBonus",
        category: "项目奖金",
        amount: formatAmount(projectBonus),
        ratio: formatRatio(income > 0 ? projectBonus / income : null),
        remark: "-",
      },
      {
        key: "fund",
        category: "基金",
        amount: formatAmount(FUND_AMOUNT),
        ratio: formatRatio(income > 0 ? FUND_AMOUNT / income : null),
        remark: "-",
      },
      {
        key: "finalProfit",
        category: "利润",
        amount: formatAmount(finalProfit),
        ratio: formatRatio(income > 0 ? finalProfit / income : null),
        remark: "-",
      },
    ],
    [
      actualLaborCost,
      agencyFee,
      bonusRatio,
      executionCost,
      executionRemark,
      finalProfit,
      financialStructure?.agencyFeeRate,
      income,
      middleOfficeCost,
      netIncome,
      outsourceCost,
      projectBonus,
      projectLevel,
      projectProfit,
      rentCost,
      tax,
      totalCost,
      totalCostRatio,
    ],
  );

  const columns = useMemo<ColumnsType<CostRow>>(
    () => [
      {
        title: "类别",
        dataIndex: "category",
        key: "category",
        width: 160,
        onHeaderCell: () => ({ style: { paddingLeft: 24 } }),
        onCell: () => ({ style: { paddingLeft: 24 } }),
        render: (value, row) => {
          const label = String(value ?? "");
          const tooltip =
            row.key === "laborCost"
              ? buildTooltipContent(laborTooltipLines)
              : null;

          const content = (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>{label}</span>
              {tooltip ? (
                <Tooltip title={tooltip} placement="top">
                  <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.45)" }} />
                </Tooltip>
              ) : null}
            </span>
          );
          return row.bold ? <strong>{content}</strong> : content;
        },
      },
      {
        title: "金额",
        dataIndex: "amount",
        key: "amount",
        width: 220,
        render: (value, row) => (row.bold ? <strong>{value}</strong> : value),
      },
      {
        title: "占比",
        dataIndex: "ratio",
        key: "ratio",
        width: 220,
        render: (value, row) => (row.bold ? <strong>{value}</strong> : value),
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 300,
        onHeaderCell: () => ({ style: { paddingRight: 24 } }),
        onCell: () => ({ style: { paddingRight: 24 } }),
        render: (value, row) =>
          row.bold ? (
            <strong style={{ whiteSpace: "pre-line" }}>{value}</strong>
          ) : (
            <span style={{ whiteSpace: "pre-line" }}>{value}</span>
          ),
      },
    ],
    [
      agencyFeeRemarkText,
      incomeTooltipLines,
      incomeRemarkText,
      laborTooltipLines,
      outsourceTooltipLines,
      outsourceRemarkText,
      taxRemarkText,
      taxTooltipLines,
    ],
  );

  const breakdownRows = useMemo<BreakdownRow[]>(() => {
    const incomeBase = income > 0 ? income : 0;

    const incomeRemark = incomeRemarkText;
    const taxRemark = taxRemarkText;
    const outsourceRemark = outsourceRemarkText;
    const agencyFeeRemark = `中介费率 ${financialStructure?.agencyFeeRate ?? 0}%`;
    const bonusRemark = `项目级别：${projectLevel}，奖金比例：${Math.round(
      bonusRatio * 100,
    )}%`;

    const buildRatio = (signedAmount: number) =>
      incomeBase > 0 ? signedAmount / incomeBase : null;

    const rows: BreakdownRow[] = [
      {
        key: "income",
        label: "收入",
        amountValue: incomeBase,
        ratioValue: incomeBase > 0 ? 1 : 0,
        tone: "beige",
        bold: true,
        barColor: "#4F88D7",
        showTooltip: false,
        remark: incomeRemark,
      },
      {
        key: "tax",
        label: "税费",
        indent: 1,
        amountValue: -tax,
        ratioValue: buildRatio(-tax),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        showTooltip: false,
        remark: taxRemark,
      },
      {
        key: "netIncome",
        label: "净收入",
        amountValue: netIncome,
        ratioValue: buildRatio(netIncome),
        tone: "beige",
        bold: true,
        barColor: "#4F88D7",
        remark: "-",
      },
      {
        key: "agencyFee",
        label: "中介费",
        indent: 1,
        amountValue: -agencyFee,
        ratioValue: buildRatio(-agencyFee),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        showTooltip: false,
        remark: agencyFeeRemark,
      },
      {
        key: "outsourceCost",
        label: "外包成本",
        indent: 1,
        amountValue: -outsourceCost,
        ratioValue: buildRatio(-outsourceCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        showTooltip: false,
        remark: outsourceRemark,
      },
      {
        key: "laborCost",
        label: "人力成本",
        indent: 1,
        amountValue: -actualLaborCost,
        ratioValue: buildRatio(-actualLaborCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        showTooltip: true,
        remark: "-",
      },
      {
        key: "rentCost",
        label: "租金成本",
        indent: 1,
        amountValue: -rentCost,
        ratioValue: buildRatio(-rentCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: rentRemarkText,
      },
      {
        key: "executionCost",
        label: "执行费用成本",
        indent: 1,
        amountValue: -executionCost,
        ratioValue: buildRatio(-executionCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: executionRemark?.trim() ? executionRemark : "-",
      },
      {
        key: "middleOfficeCost",
        label: "中台成本",
        indent: 1,
        amountValue: -middleOfficeCost,
        ratioValue: buildRatio(-middleOfficeCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: middleOfficeRemarkText,
      },
      {
        key: "totalCost",
        label: "总费用成本",
        amountValue: -totalCost,
        ratioValue: buildRatio(-totalCost),
        tone: "beige",
        bold: true,
        barColor: "#D15651",
        remark: "-",
      },
      {
        key: "projectProfit",
        label: "项目利润",
        amountValue: projectProfit,
        ratioValue: buildRatio(projectProfit),
        tone: "green",
        bold: true,
        barColor: "#6F9838",
        remark: "-",
      },
      {
        key: "projectBonus",
        label: "项目奖金",
        indent: 1,
        amountValue: -projectBonus,
        ratioValue: buildRatio(-projectBonus),
        tone: "neutral",
        bold: true,
        barColor: "#E4A344",
        remark: bonusRemark,
      },
      {
        key: "fund",
        label: "基金",
        indent: 1,
        amountValue: -FUND_AMOUNT,
        ratioValue: buildRatio(-FUND_AMOUNT),
        tone: "neutral",
        bold: true,
        barColor: "#E4A344",
        remark: "-",
      },
      {
        key: "finalProfit",
        label: "最终利润",
        amountValue: finalProfit,
        ratioValue: buildRatio(finalProfit),
        tone: "green",
        bold: true,
        barColor: "#6F9838",
        remark: "-",
      },
    ];

    return rows;
  }, [
    actualLaborCost,
    agencyFee,
    bonusRatio,
    executionCost,
    finalProfit,
    income,
    middleOfficeCost,
    netIncome,
    outsourceCost,
    projectBonus,
    projectLevel,
    projectProfit,
    rentCost,
    tax,
    totalCost,
    laborTooltipLines,
    outsourceTooltipLines,
    incomeTooltipLines,
    taxTooltipLines,
    rentRemarkText,
    middleOfficeRemarkText,
    financialStructure?.agencyFeeRate,
  ]);

  const breakdownColumns = useMemo<ColumnsType<BreakdownRow>>(() => {
    const incomeBase = income > 0 ? income : 0;

    const getTooltipForKey = (row: BreakdownRow) => {
      if (!row.showTooltip) return null;
      return row.key === "laborCost"
        ? canViewLaborCost
          ? buildTooltipContent(laborTooltipLines)
          : null
        : null;
    };

    const renderNoteCell = (row: BreakdownRow) => {
      return {
        children: <span style={{ color: "rgba(0,0,0,0.45)" }}>{row.note}</span>,
        props: { colSpan: 5 as const },
      };
    };

    const renderHiddenCell = () => ({
      children: null,
      props: { colSpan: 0 as const },
    });

    return [
      {
        title: "类别",
        dataIndex: "label",
        key: "label",
        width: 180,
        onHeaderCell: () => ({ style: { paddingLeft: 24 } }),
        onCell: () => ({ style: { paddingLeft: 24 } }),
        render: (_value, row) => {
          if (row.note) return renderNoteCell(row);
          const tooltip = getTooltipForKey(row);
          const indent = row.indent ? 24 : 0;
          const isSubItem = Boolean(row.indent);
          const subItemColor = "#4F504D";
          const text = (
            <span
              style={{
                paddingLeft: indent,
                display: "inline-flex",
                gap: 6,
                color: isSubItem ? subItemColor : undefined,
              }}
            >
              {isSubItem ? (
                <span style={{ color: subItemColor }}>-</span>
              ) : null}
              <span>{row.label}</span>
              {tooltip ? (
                <Tooltip title={tooltip} placement="top">
                  <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.45)" }} />
                </Tooltip>
              ) : null}
            </span>
          );
          return row.bold ? <strong>{text}</strong> : text;
        },
      },
      {
        title: `金额占比（相对收入${formatYuanText(incomeBase)}）`,
        dataIndex: "bar",
        key: "bar",
        width: 360,
        render: (_value, row) => {
          if (row.note) return renderHiddenCell();
          const amount = Number(row.amountValue ?? 0);
          const ratio =
            incomeBase > 0 ? Math.min(1, Math.abs(amount) / incomeBase) : 0;
          const widthPercent = `${Math.max(0, Math.min(100, ratio * 100))}%`;
          const barColor = row.barColor || "rgba(0,0,0,0.25)";
          return (
            <div
              style={{
                height: 10,
                background: "#f3f1e6",
                borderRadius: 999,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {ratio > 0 ? (
                <div
                  style={{
                    height: "100%",
                    width: widthPercent,
                    background: barColor,
                    borderRadius: 999,
                  }}
                />
              ) : null}
            </div>
          );
        },
      },
      {
        title: "占比",
        dataIndex: "ratioValue",
        key: "ratioValue",
        width: 80,
        align: "right",
        render: (_value, row) => {
          if (row.note) return renderHiddenCell();
          const text = formatSignedPercentText(row.ratioValue);
          const isNegative = (row.ratioValue ?? 0) < 0;
          const isProfit = row.tone === "green";
          const color = isProfit
            ? "#6F9838"
            : isNegative
              ? "#9A3F3B"
              : "rgba(0,0,0,0.65)";
          return (
            <span style={{ color, fontWeight: row.bold ? 700 : 600 }}>
              {text}
            </span>
          );
        },
      },
      {
        title: "金额",
        dataIndex: "amountValue",
        key: "amountValue",
        width: 120,
        align: "right",
        onHeaderCell: () => ({ style: { paddingRight: 24 } }),
        onCell: () => ({ style: { paddingRight: 24 } }),
        render: (_value, row) => {
          if (row.note) return renderHiddenCell();
          const amount = Number(row.amountValue ?? 0);
          const isNegative = amount < 0;
          const isProfit = row.tone === "green";
          const color = isProfit
            ? "#6F9838"
            : isNegative
              ? "#9A3F3B"
              : "rgba(0,0,0,0.88)";
          return (
            <span style={{ color, fontWeight: row.bold ? 700 : 600 }}>
              {formatSignedAmountText(amount)}
            </span>
          );
        },
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 220,
        onHeaderCell: () => ({ style: { paddingRight: 24 } }),
        onCell: () => ({ style: { paddingRight: 24 } }),
        render: (_value, row) => {
          if (row.note) return renderHiddenCell();
          const value = String(row.remark ?? "").trim();
          if (!value) return <span>-</span>;
          return (
            <span style={{ whiteSpace: "pre-line", color: "rgba(0,0,0,0.65)" }}>
              {value}
            </span>
          );
        },
      },
    ];
  }, [
    income,
    incomeTooltipLines,
    laborTooltipLines,
    outsourceTooltipLines,
    taxTooltipLines,
    agencyFee,
    canViewLaborCost,
    executionRemark,
    financialStructure?.agencyFeeRate,
  ]);

  const overdueDays = Math.max(0, elapsedWorkdays - expectedWorkdays);
  const overdueSuffix = overdueDays > 0 ? (
    <span style={{ color: "#ff4d4f", fontWeight: 700 }}>
      （已超期 {overdueDays} 天）
    </span>
  ) : null;

  const actualDurationNode =
    expectedWorkdays > 0 && elapsedWorkdays > expectedWorkdays ? (
      <span style={{ color: "#ff4d4f", fontWeight: 700 }}>
        {elapsedWorkdays}
      </span>
    ) : (
      <span>{elapsedWorkdays}</span>
    );

  const tableTitleText = `${projectName || "未命名项目"} - （预计:${
    expectedWorkdays || 0
  } | 实际:${elapsedWorkdays}）个工作日`;

  const downloadTable = useCallback(async () => {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("项目成本追踪");

      const omitRemarkKeys = new Set([
        "income",
        "tax",
        "rentCost",
        "middleOfficeCost",
      ]);
      const exportRows = rows.map((row) =>
        omitRemarkKeys.has(row.key) ? { ...row, remark: "" } : row,
      );

      worksheet.addRow([tableTitleText, "", "", ""]);
      worksheet.mergeCells("A1:D1");
      worksheet.addRow(["类别", "金额", "占比", "备注"]);
      exportRows.forEach((row) => {
        worksheet.addRow([row.category, row.amount, row.ratio, row.remark]);
      });

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
            vertical: "middle",
            horizontal: rowNumber <= 2 ? "center" : "left",
            wrapText: true,
          };
          // Use black borders for better readability (matches other exports).
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
          if (rowNumber > 2) {
            const matchedRow = exportRows[rowNumber - 3];
            if (matchedRow?.bold) {
              cell.font = { bold: true };
            }
          }
        });
      });

      worksheet.columns = [
        { width: 18 },
        { width: 16 },
        { width: 12 },
        { width: 30 },
      ];

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
      link.download = `${projectName || "项目"}-项目成本追踪-${yyyy}${mm}${dd}.xlsx`;
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
    }
  }, [app, messageApi, projectName, rows, tableTitleText]);

  useEffect(() => {
    downloadTableRef.current = downloadTable;
  }, [downloadTable]);

  useEffect(() => {
    if (!onDownloadReady) return;
    onDownloadReady(() => {
      void downloadTableRef.current?.();
    });
    return () => {
      onDownloadReady(null);
    };
  }, [onDownloadReady]);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      {contextHolder}
      <div style={{ overflowX: "auto" }}>
        <div style={{ width: "100%" }}>
          <style>{`
            /* Keep only horizontal separators; remove vertical dividers. */
            .realtime-cost-table-wrap .ant-table-thead > tr > th,
            .realtime-cost-table-wrap .ant-table-tbody > tr > td {
              border-bottom: 1px solid #f0f0f0 !important;
            }
            .realtime-cost-table-wrap .ant-table-thead > tr > th::before {
              display: none !important;
            }
            .realtime-cost-table-wrap .ant-table-cell {
              border-inline-end: none !important;
            }
            .realtime-cost-table-wrap .ant-table-container::before,
            .realtime-cost-table-wrap .ant-table-container::after {
              display: none !important;
            }
          `}</style>
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {projectName || "未命名项目"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "rgba(0,0,0,0.45)",
                fontWeight: 700,
              }}
            >
              预计工作日：{expectedWorkdays || 0} 天 | 实际工作日:{" "}
              {actualDurationNode} 天{overdueSuffix ? <> {overdueSuffix}</> : null}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <StatisticCard
              style={{ background: "#f7f5ea" }}
              statistic={{
                title: "收入",
                value: income,
                valueStyle: { fontSize: 18, color: "#4F88D7", fontWeight: 700 },
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#f7f5ea" }}
              statistic={{
                title: "总费用成本",
                value: totalCost,
                valueStyle: { fontSize: 18, color: "#8B5A2B", fontWeight: 700 },
                description: (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.45)",
                      fontWeight: 600,
                    }}
                  >
                    占比 {formatRatio(income > 0 ? totalCost / income : null)}
                  </span>
                ),
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#f7f5ea" }}
              statistic={{
                title: "项目利润",
                value: projectProfit,
                valueStyle: { fontSize: 18, color: "#6F9838", fontWeight: 700 },
                description: (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.45)",
                      fontWeight: 600,
                    }}
                  >
                    占比 {formatRatio(income > 0 ? projectProfit / income : null)}
                  </span>
                ),
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#f7f5ea" }}
              statistic={{
                title: "最终利润",
                value: finalProfit,
                valueStyle: { fontSize: 18, color: "#6F9838", fontWeight: 700 },
                description: (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.45)",
                      fontWeight: 600,
                    }}
                  >
                    占比 {formatRatio(income > 0 ? finalProfit / income : null)}
                  </span>
                ),
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
          </div>
          <div
            style={{
              marginBottom: 8,
              color: "rgba(0,0,0,0.45)",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            收入 &gt; 利润 分解
          </div>
          <div
            className="realtime-cost-table-wrap"
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <Table<BreakdownRow>
              rowKey="key"
              pagination={false}
              columns={breakdownColumns}
              dataSource={breakdownRows}
              size="small"
              tableLayout="fixed"
              style={{ width: "100%" }}
              onRow={(record) => {
                if (record.note) {
                  return {
                    style: {
                      background: "#fff",
                      color: "rgba(0,0,0,0.45)",
                    },
                  };
                }
                if (record.tone === "beige") {
                  return { style: { background: "#f7f5ea" } };
                }
                if (record.tone === "green") {
                  return { style: { background: "#eaf4df" } };
                }
                return { style: { background: "#fff" } };
              }}
            />
          </div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              paddingLeft: 4,
              color: "rgba(0,0,0,0.65)",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "#4F88D7",
                  display: "inline-block",
                }}
              />
              <span>收入基数</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "#D15651",
                  display: "inline-block",
                }}
              />
              <span>成本扣减</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "#E4A344",
                  display: "inline-block",
                }}
              />
              <span>分配扣减</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "#6F9838",
                  display: "inline-block",
                }}
              />
              <span>利润留存</span>
            </span>
          </div>

          <div style={{ height: 16 }} />
        </div>
      </div>
    </>
  );
};

export default ProjectRealtimeCostTrackingTable;
