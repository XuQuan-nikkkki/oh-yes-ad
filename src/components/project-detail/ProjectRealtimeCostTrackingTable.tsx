"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  Modal,
  Progress,
  Spin,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { calculateWorkdays } from "@/lib/workday";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project, WorkdayAdjustment } from "@/types/projectDetail";
import ProjectDetailTableContainer from "@/components/project-detail/ProjectDetailTableContainer";
import {
  FINANCIAL_METRIC_BAR_COLORS,
  FINANCIAL_METRIC_COLORS,
} from "@/lib/financial-metric-colors";

type Props = {
  projectId: string;
  projectName: string;
  startDate?: string | null;
  endDate?: string | null;
  costSourceMode?: Project["costSourceMode"];
  manualCost?: Project["manualCost"];
  latestInitiation?: Project["latestInitiation"];
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
  executionCost?: number | null;
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
  nodes?: Array<{
    actualNodes?: Array<{
      actualAmountTaxIncluded?: number | string | null;
      actualDate?: string | null;
    }>;
  }>;
};

type PayablePlan = {
  id: string;
  contractAmount?: number | null;
  nodes?: Array<{
    payableAmountTaxIncluded?: number | string | null;
    actualNodes?: Array<{
      actualAmountTaxIncluded?: number | string | null;
    }>;
  }>;
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
  remark?: string;
  note?: string; // when present, render as a full-width note row
  isSection?: boolean;
  isCostDetail?: boolean;
};

type LaborDetailRow = {
  key: string;
  indexLabel: string;
  name: string;
  functionName: string;
  functionColor?: string;
  workdays: number;
  cost: number;
  remark: string;
};

type RentDetailRow = {
  key: string;
  indexLabel: string;
  name: string;
  functionName: string;
  functionColor?: string;
  workdays: number;
  cost: number;
  remark: string;
};

type ActualWorkEntryEmployeeWithFunction = NonNullable<
  NonNullable<Project["actualWorkEntries"]>[number]["employee"]
> & {
  function?: string | null;
  functionOption?: {
    value?: string | null;
    color?: string | null;
  } | null;
};

type CompensationHistoryLite = {
  effectiveDate: string;
  salary?: string | number | null;
  socialSecurity?: string | number | null;
  providentFund?: string | number | null;
  workstationCost?: string | number | null;
  utilityCost?: string | number | null;
  changeReason?: string | null;
};

type EmployeeCompSegment = {
  start: Date;
  end: Date;
  monthlyHumanCost: number;
  reasonLabel?: string;
};

const getCompensationAtDate = (
  employee: ActualWorkEntryEmployeeWithFunction,
  targetDate: Date,
) => {
  const targetTime = getStartOfDay(targetDate).getTime();
  const histories = (employee.compensationHistories ?? [])
    .filter((history) => {
      const effectiveTime = getStartOfDay(new Date(history.effectiveDate)).getTime();
      return Number.isFinite(effectiveTime) && effectiveTime <= targetTime;
    })
    .sort((left, right) => {
      const leftTime = getStartOfDay(new Date(left.effectiveDate)).getTime();
      const rightTime = getStartOfDay(new Date(right.effectiveDate)).getTime();
      return rightTime - leftTime;
    });
  const matched = histories[0] as CompensationHistoryLite | undefined;
  return {
    salary: toNumber(matched?.salary ?? employee.salary),
    socialSecurity: toNumber(matched?.socialSecurity ?? employee.socialSecurity),
    providentFund: toNumber(matched?.providentFund ?? employee.providentFund),
    workstationCost: toNumber(
      matched?.workstationCost ?? employee.workstationCost,
    ),
    utilityCost: toNumber(matched?.utilityCost ?? employee.utilityCost),
  };
};

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

const getPayablePlanActualAmount = (plan: PayablePlan) =>
  (plan.nodes ?? []).reduce(
    (nodeSum, node) =>
      nodeSum +
      (node.actualNodes ?? []).reduce(
        (actualSum, actual) =>
          actualSum + toNumber(actual.actualAmountTaxIncluded),
        0,
      ),
    0,
  );

const getPayablePlanPayableAmount = (plan: PayablePlan) =>
  (plan.nodes ?? []).reduce(
    (nodeSum, node) =>
      nodeSum + toNumber(node.payableAmountTaxIncluded),
    0,
  );

const getReceivablePlanActualAmount = (plan: ReceivablePlan) =>
  (plan.nodes ?? []).reduce(
    (nodeSum, node) =>
      nodeSum +
      (node.actualNodes ?? []).reduce(
        (actualSum, actual) =>
          actual.actualDate
            ? actualSum + toNumber(actual.actualAmountTaxIncluded)
            : actualSum,
        0,
      ),
    0,
  );

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(2)).toString();
};

const formatYuanText = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(2));
  return rounded.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const REALTIME_TAX_RATE = 0.01;

const getPreTaxIncomeFromTaxIncludedIncome = (taxIncludedIncome: number) => {
  if (!Number.isFinite(taxIncludedIncome) || taxIncludedIncome <= 0) return 0;
  return taxIncludedIncome / (1 + REALTIME_TAX_RATE);
};

const calculateRealtimeTax = (taxIncludedIncome: number) => {
  const preTaxIncome = getPreTaxIncomeFromTaxIncludedIncome(taxIncludedIncome);
  return preTaxIncome * REALTIME_TAX_RATE;
};

const formatRatio = (value: number | null) =>
  value === null ? "-" : `${(value * 100).toFixed(2)}%`;
const formatRatioPercentText = (value: number | null) =>
  value === null || !Number.isFinite(value)
    ? "-"
    : `${(value * 100).toFixed(1)}%`;

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

const normalizeNegativeZero = (value: number) =>
  Object.is(value, -0) ? 0 : value;

const getStartOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const getMonthStart = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const getMonthEnd = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0);

const getMonthKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;

const splitDateRangeByMonth = (start: Date, end: Date) => {
  const slices: Array<{ start: Date; end: Date }> = [];
  let cursor = getStartOfDay(start);
  const rangeEnd = getStartOfDay(end);
  while (cursor <= rangeEnd) {
    const monthEnd = getMonthEnd(cursor);
    const sliceEnd = monthEnd < rangeEnd ? monthEnd : rangeEnd;
    slices.push({ start: cursor, end: sliceEnd });
    cursor = addDays(sliceEnd, 1);
  }
  return slices;
};

const formatSignedAmountText = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  const rounded = normalizeNegativeZero(Number(value.toFixed(2)));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return normalized.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const renderCostRemark = (value: string) => {
  const renderFormulaWithOperatorTags = (formula: string) => {
    const parts = formula.split(/(\/|\*)/g);
    return parts.map((part, index) => {
      if (part === "/" || part === "*") {
        return <span key={`op-${index}`}>{part === "/" ? "÷" : "x"}</span>;
      }
      return <span key={`txt-${index}`}>{part}</span>;
    });
  };

  const text = (value || "").trim();
  if (!text) return <div>-</div>;
  const lines = text.split("\n").map((item) => item.trim()).filter(Boolean);
  const monthHeaderPattern = /^\d+月：/;
  const groups: Array<{ stage: string; formulas: string[] }> = [];
  for (const line of lines) {
    if (monthHeaderPattern.test(line)) {
      groups.push({ stage: line, formulas: [] });
      continue;
    }
    const current = groups[groups.length - 1];
    if (current) {
      current.formulas.push(line);
    } else {
      return <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{text}</div>;
    }
  }
  if (groups.length > 0) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {groups.map((group) => {
          const [stageLabel, changeHint] = group.stage.split("@@");
          return (
          <div key={group.stage} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Tag
                color="orange"
                style={{
                  marginInlineEnd: 0,
                  color: "rgba(0,0,0,0.65)",
                  display: "inline-flex",
                  width: "fit-content",
                }}
              >
                {stageLabel}
              </Tag>
              {changeHint ? (
                <Tag
                  color="default"
                  style={{
                    marginInlineEnd: 0,
                    display: "inline-flex",
                    width: "fit-content",
                    color: "rgba(0,0,0,0.65)",
                  }}
                >
                  {changeHint}
                </Tag>
              ) : null}
            </div>
            {group.formulas.map((formula) => (
              <div key={`${group.stage}-${formula}`} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {renderFormulaWithOperatorTags(formula)}
              </div>
            ))}
          </div>
        )})}
      </div>
    );
  }
  return <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{text}</div>;
};

const getEntryHours = (start: string, end: string) =>
  Math.max((new Date(end).getTime() - new Date(start).getTime()) / 36e5, 0);

const getDateKey = (value: string) => value.slice(0, 10);
const formatMonthDayText = (value: Date) =>
  `${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}`;
const getTodayStartOfDay = () => getStartOfDay(new Date());

const getHistoryReasonLabel = (
  reason: string | null | undefined,
  fallback: string,
) => {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  return trimmed || fallback;
};

const calcEntryWorkdays = (hours: number, total: number) => {
  if (hours === 0) return 0;
  return total > 7.5 ? hours / total : hours / 7.5;
};

const getMonthlyHumanCost = (
  snapshot: Pick<
    CompensationHistoryLite,
    "salary" | "socialSecurity" | "providentFund"
  >,
) =>
  toNumber(snapshot.salary) +
  toNumber(snapshot.socialSecurity) +
  toNumber(snapshot.providentFund);

const getMonthlyRentCost = (
  snapshot: Pick<CompensationHistoryLite, "workstationCost" | "utilityCost">,
) => toNumber(snapshot.workstationCost) + toNumber(snapshot.utilityCost);

const isSameMonthlyHumanCost = (left: number, right: number) =>
  Math.abs(left - right) < 0.0001;

const getEmployeeCompSegments = (
  employee: ActualWorkEntryEmployeeWithFunction,
  rangeStart: Date,
  rangeEnd: Date,
) => {
  const sortedHistories = [...(employee.compensationHistories ?? [])].sort(
    (left, right) =>
      getStartOfDay(new Date(left.effectiveDate)).getTime() -
      getStartOfDay(new Date(right.effectiveDate)).getTime(),
  );
  const changePoints = sortedHistories
    .map((history, index) => {
      const current = getMonthlyHumanCost(history);
      const previous = index > 0 ? getMonthlyHumanCost(sortedHistories[index - 1]) : current;
      return {
        effectiveDate: getStartOfDay(new Date(history.effectiveDate)),
        monthlyHumanCost: current,
        reasonLabel: getHistoryReasonLabel(history.changeReason, "薪酬变动"),
        changed: !isSameMonthlyHumanCost(current, previous),
      };
    })
    .filter(
      (item) =>
        item.changed &&
        item.effectiveDate > rangeStart &&
        item.effectiveDate <= rangeEnd,
    );

  if (changePoints.length === 0) return [];

  return changePoints
    .map((point, index) => {
      const next = changePoints[index + 1];
      const start = point.effectiveDate;
      const end = next ? addDays(next.effectiveDate, -1) : rangeEnd;
      return {
        start,
        end,
        monthlyHumanCost: point.monthlyHumanCost,
        reasonLabel: point.reasonLabel,
      };
    })
    .filter((item) => item.start <= item.end);
};

const getEmployeeRentSegments = (
  employee: ActualWorkEntryEmployeeWithFunction,
  rangeStart: Date,
  rangeEnd: Date,
) => {
  const sortedHistories = [...(employee.compensationHistories ?? [])].sort(
    (left, right) =>
      getStartOfDay(new Date(left.effectiveDate)).getTime() -
      getStartOfDay(new Date(right.effectiveDate)).getTime(),
  );
  const changePoints = sortedHistories
    .map((history, index) => {
      const current = getMonthlyRentCost(history);
      const previous =
        index > 0 ? getMonthlyRentCost(sortedHistories[index - 1]) : current;
      return {
        effectiveDate: getStartOfDay(new Date(history.effectiveDate)),
        monthlyRentCost: current,
        reasonLabel: getHistoryReasonLabel(history.changeReason, "租金变动"),
        changed: !isSameMonthlyHumanCost(current, previous),
      };
    })
    .filter(
      (item) =>
        item.changed &&
        item.effectiveDate > rangeStart &&
        item.effectiveDate <= rangeEnd,
    );

  if (changePoints.length === 0) return [];

  return changePoints
    .map((point, index) => {
      const next = changePoints[index + 1];
      const start = point.effectiveDate;
      const end = next ? addDays(next.effectiveDate, -1) : rangeEnd;
      return {
        start,
        end,
        monthlyRentCost: point.monthlyRentCost,
        reasonLabel: point.reasonLabel,
      };
    })
    .filter((item) => item.start <= item.end);
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

const getProjectLevelTagColor = (level: string) => {
  if (level === "A") return "#52C41A";
  if (level === "B") return "#1677FF";
  return "#FA8C16";
};

const ProjectRealtimeCostTrackingTable = ({
  projectId,
  projectName,
  startDate,
  endDate,
  costSourceMode,
  manualCost,
  latestInitiation,
  members = [],
  actualWorkEntries = [],
  workdayAdjustments = [],
  onDownloadReady,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const downloadTableRef = useRef<(() => Promise<void>) | null>(null);
  const [laborDetailOpen, setLaborDetailOpen] = useState(false);
  const [rentDetailOpen, setRentDetailOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const canViewLaborDetail = useMemo(() => {
    const roleCodes = getRoleCodesFromUser(currentUser);
    return roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE");
  }, [currentUser]);
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
  const isManualCostMode = costSourceMode === "MANUAL";
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const refreshTokenRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    void fetchSystemSettings(true);
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
        Array.isArray(receivableRows)
          ? (receivableRows as ReceivablePlan[])
          : [],
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
    const effectiveEndDate = endDate ? new Date(endDate) : new Date();
    return calculateWorkdays(
      new Date(startDate),
      effectiveEndDate,
      workdayAdjustments,
    );
  }, [endDate, startDate, workdayAdjustments]);

  const monthlyWorkdayBase = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
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
  const projectFundAmount = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingProjectFundAmount,
      ),
    [systemSettings],
  );
  const middleOfficeDailyCost = useMemo(() => {
    if (middleOfficeBaseDays <= 0) return 0;
    return middleOfficeMonthlyCost / middleOfficeBaseDays;
  }, [middleOfficeBaseDays, middleOfficeMonthlyCost]);

  const expectedWorkdays = latestInitiation?.estimatedDuration ?? 0;

  const laborBreakdown = useMemo(() => {
    const today = getTodayStartOfDay();
    const monthlyBaseCache = new Map<string, number>();
    const getRealMonthlyWorkdayBase = (date: Date) => {
      const monthKey = getMonthKey(date);
      const cached = monthlyBaseCache.get(monthKey);
      if (cached !== undefined) return cached;
      const monthStart = getMonthStart(date);
      const monthEnd = getMonthEnd(date);
      const realBase = calculateWorkdays(monthStart, monthEnd, workdayAdjustments);
      const normalized = realBase > 0 ? realBase : monthlyWorkdayBase;
      monthlyBaseCache.set(monthKey, normalized);
      return normalized;
    };
    const getFunctionMeta = (candidate: {
      function?: string | null;
      functionOption?: { value?: string | null; color?: string | null } | null;
    }) => ({
      functionName:
        candidate.functionOption?.value?.trim() ||
        candidate.function?.trim() ||
        "未设置",
      functionColor: candidate.functionOption?.color?.trim() || undefined,
    });
    const memberFunctionById = new Map<string, { functionName: string; functionColor?: string }>();
    const memberFunctionByName = new Map<string, { functionName: string; functionColor?: string }>();
    for (const member of members) {
      const meta = getFunctionMeta(member);
      memberFunctionById.set(member.id, meta);
      const memberName = member.name?.trim();
      if (memberName) memberFunctionByName.set(memberName, meta);
    }
    for (const initiationMember of latestInitiation?.members ?? []) {
      const employee = initiationMember.employee;
      if (!employee?.id) continue;
      const meta = getFunctionMeta(employee);
      if (!memberFunctionById.has(employee.id)) {
        memberFunctionById.set(employee.id, meta);
      }
      const employeeName = employee.name?.trim();
      if (employeeName && !memberFunctionByName.has(employeeName)) {
        memberFunctionByName.set(employeeName, meta);
      }
    }
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
      {
        name: string;
        functionName: string;
        functionColor?: string;
        workdays: number;
        cost: number;
        remark: string;
        entries: Array<{
          date: Date;
          workdays: number;
          cost: number;
          monthlyHumanCost: number;
        }>;
        employee: ActualWorkEntryEmployeeWithFunction;
      }
    >();

    actualWorkEntries.forEach((entry) => {
      const employee = entry.employee as
        | ActualWorkEntryEmployeeWithFunction
        | undefined;
      if (!employee?.id) return;
      const compensation = getCompensationAtDate(
        employee,
        new Date(entry.startDate),
      );
      const monthlyHumanCost =
        compensation.salary +
        compensation.socialSecurity +
        compensation.providentFund;
      const hours = getEntryHours(entry.startDate, entry.endDate);
      const total =
        groupedHours.get(`${employee.id}__${getDateKey(entry.startDate)}`) ??
        hours;
      const entryWorkdays = calcEntryWorkdays(hours, total);
      const monthBase = getRealMonthlyWorkdayBase(new Date(entry.startDate));
      const cost = monthBase > 0 ? (monthlyHumanCost / monthBase) * entryWorkdays : 0;
      const employeeName = employee.name?.trim() || "";
      const functionMeta =
        memberFunctionById.get(employee.id) ||
        (employeeName ? memberFunctionByName.get(employeeName) : undefined);
      const fallbackFunctionName =
        employee.functionOption?.value?.trim() ||
        employee.function?.trim() ||
        "未设置";
      const fallbackFunctionColor = employee.functionOption?.color?.trim() || undefined;
      const prev = byEmployee.get(employee.id) ?? {
        name: employee.name ?? "-",
        functionName: functionMeta?.functionName ?? fallbackFunctionName,
        functionColor: functionMeta?.functionColor ?? fallbackFunctionColor,
        workdays: 0,
        cost: 0,
        remark: "-",
        entries: [],
        employee,
      };
      prev.entries.push({
        date: getStartOfDay(new Date(entry.startDate)),
        workdays: entryWorkdays,
        cost,
        monthlyHumanCost,
      });
      byEmployee.set(employee.id, {
        name: prev.name,
        functionName: prev.functionName,
        functionColor: prev.functionColor,
        workdays: prev.workdays + entryWorkdays,
        cost: prev.cost + cost,
        remark: prev.remark,
        entries: prev.entries,
        employee: prev.employee,
      });
    });

    const rows = Array.from(byEmployee.entries()).map(
      ([employeeId, value]) => {
        const validDates = value.entries
          .map((item) => item.date)
          .filter((date) => Number.isFinite(date.getTime()))
          .sort((left, right) => left.getTime() - right.getTime());
        const rangeStart = validDates[0];
        const rangeEnd = validDates[validDates.length - 1];
        const parsedProjectStart = startDate ? getStartOfDay(new Date(startDate)) : null;
        const projectRangeStart =
          parsedProjectStart && Number.isFinite(parsedProjectStart.getTime())
            ? parsedProjectStart
            : null;
        const effectiveRangeStart =
          projectRangeStart && projectRangeStart <= rangeEnd
            ? projectRangeStart
            : rangeStart;
        const changeSegments =
          effectiveRangeStart && rangeEnd
            ? getEmployeeCompSegments(value.employee, effectiveRangeStart, rangeEnd)
            : [];
        let remark = "-";
        if (effectiveRangeStart && rangeEnd) {
          const segments: EmployeeCompSegment[] = [];
          const firstChangeStart = changeSegments[0]?.start;
          const beforeFirstChangeCost = firstChangeStart
            ? getCompensationAtDate(value.employee, addDays(firstChangeStart, -1))
            : null;
          if (firstChangeStart && beforeFirstChangeCost) {
            const beforeEnd = addDays(firstChangeStart, -1);
            if (effectiveRangeStart <= beforeEnd) {
              segments.push({
                start: effectiveRangeStart,
                end: beforeEnd,
                monthlyHumanCost:
                  beforeFirstChangeCost.salary +
                  beforeFirstChangeCost.socialSecurity +
                  beforeFirstChangeCost.providentFund,
              });
            }
          }
          if (changeSegments.length > 0) {
            segments.push(...changeSegments);
          } else {
            const baseComp = getCompensationAtDate(value.employee, effectiveRangeStart);
            segments.push({
              start: effectiveRangeStart,
              end: rangeEnd,
              monthlyHumanCost:
                baseComp.salary +
                baseComp.socialSecurity +
                baseComp.providentFund,
            });
          }
          const monthSlices = splitDateRangeByMonth(effectiveRangeStart, rangeEnd);
          const lines = monthSlices
            .map((monthSlice, monthIndex) => {
              const monthBase = getRealMonthlyWorkdayBase(monthSlice.start);
              const monthSegments = segments.reduce<
                Array<{
                  start: Date;
                  end: Date;
                  sourceStart: Date;
                  monthlyCost: number;
                  reasonLabel?: string;
                }>
              >((acc, segment) => {
                const start =
                  segment.start > monthSlice.start ? segment.start : monthSlice.start;
                const end = segment.end < monthSlice.end ? segment.end : monthSlice.end;
                if (start > end) return acc;
                acc.push({
                  start,
                  end,
                  sourceStart: segment.start,
                  monthlyCost: segment.monthlyHumanCost,
                  reasonLabel: segment.reasonLabel,
                });
                return acc;
              }, []);
              const formulas = monthSegments.reduce<
                Array<{
                  reasonLabel?: string;
                  formula: string;
                }>
              >((acc, segment) => {
                const workdays = value.entries.reduce((sum, item) => {
                  if (item.date < segment.start || item.date > segment.end) return sum;
                  return sum + item.workdays;
                }, 0);
                if (workdays <= 0) return acc;
                const subtotal =
                  monthBase > 0 ? (segment.monthlyCost / monthBase) * workdays : 0;
                acc.push({
                  reasonLabel: segment.reasonLabel,
                  formula: `¥${formatYuanText(segment.monthlyCost)} / ${formatAmount(
                    monthBase,
                  )}d * ${formatAmount(workdays)}d = ¥${formatYuanText(subtotal)}`,
                });
                return acc;
              }, []);
              if (formulas.length === 0) return null;
              const isFirstMonth = monthIndex === 0;
              const isLastMonth = monthIndex === monthSlices.length - 1;
              const startLabel =
                isFirstMonth && monthSlice.start.getDate() !== 1
                  ? `${formatMonthDayText(monthSlice.start)}(项目开始)`
                  : formatMonthDayText(monthSlice.start);
              const endLabel = isLastMonth
                ? `${formatMonthDayText(today)}(至今)`
                : formatMonthDayText(monthSlice.end);
              const monthStartChangeHint =
                formulas.length === 1 &&
                monthSlice.start.getDate() === 1 &&
                monthSegments[0]?.reasonLabel &&
                monthSegments[0].sourceStart.getTime() === monthSlice.start.getTime()
                  ? ` ${formatMonthDayText(monthSlice.start)} ${monthSegments[0].reasonLabel}`
                  : "";
              const changeHint =
                formulas.length > 1
                  ? ` ${formatMonthDayText(monthSegments[1]?.start ?? monthSlice.start)} ${
                      formulas[1]?.reasonLabel ?? "变动"
                    }`
                  : monthStartChangeHint;
              const header = `${monthSlice.start.getMonth() + 1}月：${startLabel}-${endLabel}${
                changeHint ? `@@${changeHint.trim()}` : ""
              }`;
              if (formulas.length === 1) {
                return `${header}\n${formulas[0]?.formula ?? "-"}`;
              }
              const firstChangeReason = formulas[1]?.reasonLabel ?? "变动";
              const formulaLines = formulas.map((item, index) => {
                const phaseLabel =
                  index === 0
                    ? `${firstChangeReason}前`
                    : `${item.reasonLabel ?? "变动"}后`;
                return `${phaseLabel}：${item.formula}`;
              });
              return `${header}\n${formulaLines.join("\n")}`;
            })
            .filter((line): line is string => Boolean(line));
          if (lines.length > 0) {
            remark = lines.join("\n");
          }
        }
        return {
          employeeId,
          name: value.name,
          functionName: value.functionName,
          functionColor: value.functionColor,
          workdays: value.workdays,
          cost: value.cost,
          remark,
        };
      },
    );
    rows.sort((a, b) => {
      const functionCompare = (a.functionName || "").localeCompare(
        b.functionName || "",
        "zh-CN",
      );
      if (functionCompare !== 0) return functionCompare;
      return (a.name || "").localeCompare(b.name || "", "zh-CN");
    });
    return rows;
  }, [
    actualWorkEntries,
    latestInitiation?.members,
    members,
    monthlyWorkdayBase,
    startDate,
    workdayAdjustments,
  ]);

  const actualLaborCost = useMemo(
    () => laborBreakdown.reduce((sum, item) => sum + toNumber(item.cost), 0),
    [laborBreakdown],
  );
  const laborDetailRows = useMemo<LaborDetailRow[]>(() => {
    const totalWorkdays = laborBreakdown.reduce(
      (sum, item) => sum + toNumber(item.workdays),
      0,
    );
    const detailRows = laborBreakdown.map((item, index) => ({
      key: item.employeeId,
      indexLabel: String(index + 1),
      name: item.name,
      functionName: item.functionName,
      functionColor: item.functionColor,
      workdays: toNumber(item.workdays),
      cost: toNumber(item.cost),
      remark: item.remark ?? "-",
    }));
    return [
      ...detailRows,
      {
        key: "summary",
        indexLabel: "汇总",
        name: "",
        functionName: "",
        functionColor: undefined,
        workdays: totalWorkdays,
        cost: actualLaborCost,
        remark: "-",
      },
    ];
  }, [actualLaborCost, laborBreakdown]);

  const rentBreakdown = useMemo(() => {
    const today = getTodayStartOfDay();
    const monthlyBaseCache = new Map<string, number>();
    const getRealMonthlyWorkdayBase = (date: Date) => {
      const monthKey = getMonthKey(date);
      const cached = monthlyBaseCache.get(monthKey);
      if (cached !== undefined) return cached;
      const monthStart = getMonthStart(date);
      const monthEnd = getMonthEnd(date);
      const realBase = calculateWorkdays(monthStart, monthEnd, workdayAdjustments);
      const normalized = realBase > 0 ? realBase : monthlyWorkdayBase;
      monthlyBaseCache.set(monthKey, normalized);
      return normalized;
    };
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
      {
        name: string;
        functionName: string;
        functionColor?: string;
        workdays: number;
        cost: number;
        remark: string;
        entries: Array<{
          date: Date;
          workdays: number;
          cost: number;
          monthlyRentCost: number;
        }>;
        employee: ActualWorkEntryEmployeeWithFunction;
      }
    >();
    for (const entry of actualWorkEntries) {
      const employee = entry.employee as
        | ActualWorkEntryEmployeeWithFunction
        | undefined;
      if (!employee?.id) continue;
      const compensation = getCompensationAtDate(employee, new Date(entry.startDate));
      const monthlyRentCost = compensation.workstationCost + compensation.utilityCost;
      if (monthlyRentCost <= 0) continue;
      const hours = getEntryHours(entry.startDate, entry.endDate);
      const total =
        groupedHours.get(`${employee.id}__${getDateKey(entry.startDate)}`) ??
        hours;
      const entryWorkdays = calcEntryWorkdays(hours, total);
      const monthBase = getRealMonthlyWorkdayBase(new Date(entry.startDate));
      const cost = monthBase > 0 ? (monthlyRentCost / monthBase) * entryWorkdays : 0;
      const functionName = employee.functionOption?.value?.trim() || "未设置";
      const functionColor = employee.functionOption?.color?.trim() || undefined;
      const prev = byEmployee.get(employee.id) ?? {
        name: employee.name ?? "-",
        functionName,
        functionColor,
        workdays: 0,
        cost: 0,
        remark: "-",
        entries: [],
        employee,
      };
      prev.entries.push({
        date: getStartOfDay(new Date(entry.startDate)),
        workdays: entryWorkdays,
        cost,
        monthlyRentCost,
      });
      byEmployee.set(employee.id, {
        ...prev,
        workdays: prev.workdays + entryWorkdays,
        cost: prev.cost + cost,
      });
    }
    const rows = Array.from(byEmployee.entries()).map(([employeeId, value]) => {
      const validDates = value.entries
        .map((item) => item.date)
        .filter((date) => Number.isFinite(date.getTime()))
        .sort((left, right) => left.getTime() - right.getTime());
      const rangeStart = validDates[0];
      const rangeEnd = validDates[validDates.length - 1];
      const parsedProjectStart = startDate ? getStartOfDay(new Date(startDate)) : null;
      const projectRangeStart =
        parsedProjectStart && Number.isFinite(parsedProjectStart.getTime())
          ? parsedProjectStart
          : null;
      const effectiveRangeStart =
        projectRangeStart && projectRangeStart <= rangeEnd
          ? projectRangeStart
          : rangeStart;
      const changeSegments =
        effectiveRangeStart && rangeEnd
          ? getEmployeeRentSegments(value.employee, effectiveRangeStart, rangeEnd)
          : [];
      let remark = "-";
      if (effectiveRangeStart && rangeEnd) {
        const segments: Array<{
          start: Date;
          end: Date;
          monthlyRentCost: number;
          reasonLabel?: string;
        }> = [];
        const firstChangeStart = changeSegments[0]?.start;
        const beforeFirstChangeCost = firstChangeStart
          ? getCompensationAtDate(value.employee, addDays(firstChangeStart, -1))
          : null;
        if (firstChangeStart && beforeFirstChangeCost) {
          const beforeEnd = addDays(firstChangeStart, -1);
          if (effectiveRangeStart <= beforeEnd) {
            segments.push({
              start: effectiveRangeStart,
              end: beforeEnd,
              monthlyRentCost:
                beforeFirstChangeCost.workstationCost +
                beforeFirstChangeCost.utilityCost,
              reasonLabel: undefined,
            });
          }
        }
        if (changeSegments.length > 0) {
          segments.push(...changeSegments);
        } else {
          const baseComp = getCompensationAtDate(value.employee, effectiveRangeStart);
          segments.push({
            start: effectiveRangeStart,
            end: rangeEnd,
            monthlyRentCost: baseComp.workstationCost + baseComp.utilityCost,
            reasonLabel: undefined,
          });
        }
        const monthSlices = splitDateRangeByMonth(effectiveRangeStart, rangeEnd);
        const lines = monthSlices
          .map((monthSlice, monthIndex) => {
            const monthBase = getRealMonthlyWorkdayBase(monthSlice.start);
            const monthSegments = segments.reduce<
              Array<{
                start: Date;
                end: Date;
                sourceStart: Date;
                monthlyCost: number;
                reasonLabel?: string;
              }>
            >((acc, segment) => {
              const start =
                segment.start > monthSlice.start ? segment.start : monthSlice.start;
              const end = segment.end < monthSlice.end ? segment.end : monthSlice.end;
              if (start > end) return acc;
              acc.push({
                start,
                end,
                sourceStart: segment.start,
                monthlyCost: segment.monthlyRentCost,
                reasonLabel: segment.reasonLabel,
              });
              return acc;
            }, []);
            const formulas = monthSegments.reduce<
              Array<{
                reasonLabel?: string;
                formula: string;
              }>
            >((acc, segment) => {
              const workdays = value.entries.reduce((sum, item) => {
                if (item.date < segment.start || item.date > segment.end) return sum;
                return sum + item.workdays;
              }, 0);
              if (workdays <= 0) return acc;
              const subtotal =
                monthBase > 0 ? (segment.monthlyCost / monthBase) * workdays : 0;
              acc.push({
                reasonLabel: segment.reasonLabel,
                formula: `¥${formatYuanText(segment.monthlyCost)} / ${formatAmount(
                  monthBase,
                )}d * ${formatAmount(workdays)}d = ¥${formatYuanText(subtotal)}`,
              });
              return acc;
            }, []);
            if (formulas.length === 0) return null;
            const isFirstMonth = monthIndex === 0;
            const isLastMonth = monthIndex === monthSlices.length - 1;
            const startLabel =
              isFirstMonth && monthSlice.start.getDate() !== 1
                ? `${formatMonthDayText(monthSlice.start)}(项目开始)`
                : formatMonthDayText(monthSlice.start);
            const endLabel = isLastMonth
              ? `${formatMonthDayText(today)}(至今)`
              : formatMonthDayText(monthSlice.end);
            const monthStartChangeHint =
              formulas.length === 1 &&
              monthSlice.start.getDate() === 1 &&
              monthSegments[0]?.reasonLabel &&
              monthSegments[0].sourceStart.getTime() === monthSlice.start.getTime()
                ? ` ${formatMonthDayText(monthSlice.start)} ${monthSegments[0].reasonLabel}`
                : "";
            const changeHint =
              formulas.length > 1
                ? ` ${formatMonthDayText(monthSegments[1]?.start ?? monthSlice.start)} ${
                    formulas[1]?.reasonLabel ?? "变动"
                  }`
                : monthStartChangeHint;
            const header = `${monthSlice.start.getMonth() + 1}月：${startLabel}-${endLabel}${
              changeHint ? `@@${changeHint.trim()}` : ""
            }`;
            if (formulas.length === 1) {
              return `${header}\n${formulas[0]?.formula ?? "-"}`;
            }
            const firstChangeReason = formulas[1]?.reasonLabel ?? "变动";
            const formulaLines = formulas.map((item, index) => {
              const phaseLabel =
                index === 0 ? `${firstChangeReason}前` : `${item.reasonLabel ?? "变动"}后`;
              return `${phaseLabel}：${item.formula}`;
            });
            return `${header}\n${formulaLines.join("\n")}`;
          })
          .filter((line): line is string => Boolean(line));
        if (lines.length > 0) {
          remark = lines.join("\n");
        }
      }
      return {
        employeeId,
        name: value.name,
        functionName: value.functionName,
        functionColor: value.functionColor,
        workdays: value.workdays,
        cost: value.cost,
        remark,
      };
    });
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-CN"));
    return rows;
  }, [actualWorkEntries, monthlyWorkdayBase, startDate, workdayAdjustments]);

  const rentCost = useMemo(
    () => rentBreakdown.reduce((sum, item) => sum + toNumber(item.cost), 0),
    [rentBreakdown],
  );

  const rentDetailRows = useMemo<RentDetailRow[]>(() => {
    const totalWorkdays = rentBreakdown.reduce(
      (sum, item) => sum + toNumber(item.workdays),
      0,
    );
    const detailRows = rentBreakdown.map((item, index) => ({
      key: item.employeeId,
      indexLabel: String(index + 1),
      name: item.name,
      functionName: item.functionName,
      functionColor: item.functionColor,
      workdays: toNumber(item.workdays),
      cost: toNumber(item.cost),
      remark: item.remark ?? "-",
    }));
    return [
      ...detailRows,
      {
        key: "summary",
        indexLabel: "汇总",
        name: "",
        functionName: "",
        functionColor: undefined,
        workdays: totalWorkdays,
        cost: rentCost,
        remark: "-",
      },
    ];
  }, [rentBreakdown, rentCost]);

  const income = useMemo(
    () =>
      (receivablePlans ?? []).reduce(
        (sum, plan) => sum + getReceivablePlanActualAmount(plan),
        0,
      ),
    [receivablePlans],
  );
  // 税费按项目不含税收入的 1% 实时计算。
  const tax = useMemo(() => calculateRealtimeTax(income), [income]);
  const taxBreakdown = useMemo(() => {
    const plans = receivablePlans ?? [];
    const total = income;
    if (plans.length === 0 || total <= 0 || tax <= 0) {
      return plans.map((plan) => ({
        id: plan.id,
        serviceContent: plan.serviceContent,
        tax: 0,
        actualAmount: getReceivablePlanActualAmount(plan),
      }));
    }
    return plans.map((plan) => {
      const actualAmount = getReceivablePlanActualAmount(plan);
      const ratio = actualAmount > 0 ? actualAmount / total : 0;
      return {
        id: plan.id,
        serviceContent: plan.serviceContent,
        tax: tax * ratio,
        actualAmount,
      };
    });
  }, [income, receivablePlans, tax]);
  const netIncome = income - tax;
  const autoAgencyFee =
    income > 0
      ? (income * toNumber(financialStructure?.agencyFeeRate)) / 100
      : 0;
  const autoOutsourceCost = useMemo(
    () =>
      (payablePlans ?? []).reduce(
        (sum, plan) => sum + getPayablePlanActualAmount(plan),
        0,
      ),
    [payablePlans],
  );
  const autoExecutionRemark = useMemo(() => {
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
  const autoExecutionCost = useMemo(
    () =>
      reimbursementRows.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [reimbursementRows],
  );
  const executionCostBudget = useMemo(
    () => toNumber(financialStructure?.executionCost),
    [financialStructure?.executionCost],
  );
  const autoMiddleOfficeCost = middleOfficeDailyCost * elapsedWorkdays;
  const agencyFee = isManualCostMode
    ? toNumber(manualCost?.agencyFeeAmount)
    : autoAgencyFee;
  const outsourceCost = isManualCostMode
    ? toNumber(manualCost?.outsourceAmount)
    : autoOutsourceCost;
  const laborCost = isManualCostMode
    ? toNumber(manualCost?.laborAmount)
    : actualLaborCost;
  const effectiveRentCost = isManualCostMode
    ? toNumber(manualCost?.rentAmount)
    : rentCost;
  const executionCost = isManualCostMode
    ? toNumber(manualCost?.executionAmount)
    : autoExecutionCost;
  const middleOfficeCost = isManualCostMode
    ? toNumber(manualCost?.middleOfficeAmount)
    : autoMiddleOfficeCost;
  const totalCost =
    agencyFee +
    outsourceCost +
    laborCost +
    effectiveRentCost +
    executionCost +
    middleOfficeCost;
  const projectProfit = income - totalCost;
  const totalCostRatio = income > 0 ? totalCost / income : null;
  const projectLevel = getProjectLevel(totalCostRatio ?? 1);
  const bonusRatio = getBonusRatio(projectLevel);
  const projectBonus = projectProfit * bonusRatio;
  const finalProfit = projectProfit - projectBonus - projectFundAmount;

  const incomeRemarkText = useMemo(() => {
    const plans = receivablePlans ?? [];
    if (!plans.length) return "-";
    if (
      plans.length === 1 &&
      Math.abs(getReceivablePlanActualAmount(plans[0]) - income) < 0.0001
    ) {
      return "-";
    }
    const remarkLines = plans
      .map((plan) => {
        const content = plan.serviceContent?.trim() || "未填写服务内容";
        const amount = getReceivablePlanActualAmount(plan);
        return `${content}(${formatYuanText(amount)} 元)`;
      })
      .filter((item) => !item.endsWith("(0 元)"));
    if (remarkLines.length === 0) return "-";
    return remarkLines.join(" + ");
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
    if (isManualCostMode) {
      return manualCost?.outsourceRemark?.trim() || "-";
    }
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
        const amount = getPayablePlanPayableAmount(plan);
        return `${vendorName}-${content}(${formatYuanText(amount)} 元)`;
      })
      .join("\n");
  }, [isManualCostMode, manualCost?.outsourceRemark, payablePlans]);
  const agencyFeeRemarkText = useMemo(
    () =>
      isManualCostMode
        ? manualCost?.agencyFeeRemark?.trim() || "-"
        : `中介费率 ${financialStructure?.agencyFeeRate ?? 0}%`,
    [
      financialStructure?.agencyFeeRate,
      isManualCostMode,
      manualCost?.agencyFeeRemark,
    ],
  );
  const middleOfficeRemarkText = useMemo(() => {
    if (isManualCostMode) {
      return manualCost?.middleOfficeRemark?.trim() || "-";
    }
    if (middleOfficeBaseDays <= 0) return "-";
    return `中台均值 / 基准天数 * 实际工作日 = ${formatYuanText(
      middleOfficeMonthlyCost,
    )} / ${formatAmount(middleOfficeBaseDays)} * ${elapsedWorkdays}`;
  }, [
    elapsedWorkdays,
    isManualCostMode,
    manualCost?.middleOfficeRemark,
    middleOfficeBaseDays,
    middleOfficeMonthlyCost,
  ]);
  const laborRemarkText = isManualCostMode
    ? manualCost?.laborRemark?.trim() || "-"
    : "-";
  const rentRemarkText = isManualCostMode
    ? manualCost?.rentRemark?.trim() || "-"
    : "-";
  const executionRemarkText = isManualCostMode
    ? manualCost?.executionRemark?.trim() || "-"
    : autoExecutionRemark || "-";

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
        amount: formatAmount(laborCost),
        ratio: formatRatio(income > 0 ? laborCost / income : null),
        remark: laborRemarkText,
      },
      {
        key: "rentCost",
        category: "租金成本",
        amount: formatAmount(effectiveRentCost),
        ratio: formatRatio(income > 0 ? effectiveRentCost / income : null),
        remark: rentRemarkText,
      },
      {
        key: "executionCost",
        category: "执行费用成本",
        amount: formatAmount(executionCost),
        ratio: formatRatio(income > 0 ? executionCost / income : null),
        remark: executionRemarkText,
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
        amount: formatAmount(projectFundAmount),
        ratio: formatRatio(income > 0 ? projectFundAmount / income : null),
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
      agencyFee,
      bonusRatio,
      laborCost,
      executionCost,
      executionRemarkText,
      effectiveRentCost,
      finalProfit,
      financialStructure?.agencyFeeRate,
      income,
      laborRemarkText,
      middleOfficeCost,
      netIncome,
      outsourceCost,
      projectBonus,
      projectLevel,
      projectProfit,
      rentRemarkText,
      tax,
      totalCost,
      totalCostRatio,
      projectFundAmount,
    ],
  );

  const breakdownRows = useMemo<BreakdownRow[]>(() => {
    const incomeBase = income > 0 ? income : 0;

    const incomeRemark = incomeRemarkText;
    const taxRemark = taxRemarkText;
    const outsourceRemark = outsourceRemarkText;
    const agencyFeeRemark = agencyFeeRemarkText;
    const bonusRemark = `级别：${projectLevel} · 奖金比例：${Math.round(
      bonusRatio * 100,
    )}%`;

    const buildRatio = (signedAmount: number) =>
      incomeBase > 0 ? signedAmount / incomeBase : null;

    const rows: BreakdownRow[] = [
      {
        key: "income-detail-section",
        label: "收入明细",
        note: "收入明细",
        isSection: true,
      },
      {
        key: "income",
        label: "收入",
        indent: 1,
        amountValue: incomeBase,
        ratioValue: incomeBase > 0 ? 1 : 0,
        tone: "neutral",
        bold: true,
        barColor: "#4F88D7",
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
        remark: taxRemark,
      },
      {
        key: "netIncome",
        label: "净收入",
        indent: 1,
        amountValue: netIncome,
        ratioValue: buildRatio(netIncome),
        tone: "neutral",
        bold: true,
        barColor: "#4F88D7",
        remark: "-",
      },
      {
        key: "cost-detail-section",
        label: `成本明细（${isManualCostMode ? "人工录入" : "系统自动计算"}）`,
        note: `成本明细（${isManualCostMode ? "人工录入" : "系统自动计算"}）`,
        isSection: true,
      },
      {
        key: "agencyFee",
        label: "中介费",
        indent: 1,
        isCostDetail: true,
        amountValue: -agencyFee,
        ratioValue: buildRatio(-agencyFee),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: agencyFeeRemark,
      },
      {
        key: "outsourceCost",
        label: "外包成本",
        indent: 1,
        isCostDetail: true,
        amountValue: -outsourceCost,
        ratioValue: buildRatio(-outsourceCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: outsourceRemark,
      },
      {
        key: "laborCost",
        label: "人力成本",
        indent: 1,
        isCostDetail: true,
        amountValue: -laborCost,
        ratioValue: buildRatio(-laborCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: laborRemarkText,
      },
      {
        key: "rentCost",
        label: "租金成本",
        indent: 1,
        isCostDetail: true,
        amountValue: -effectiveRentCost,
        ratioValue: buildRatio(-effectiveRentCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: rentRemarkText,
      },
      {
        key: "middleOfficeCost",
        label: "中台成本",
        indent: 1,
        isCostDetail: true,
        amountValue: -middleOfficeCost,
        ratioValue: buildRatio(-middleOfficeCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: middleOfficeRemarkText,
      },
      {
        key: "executionCost",
        label: "执行费用成本",
        indent: 1,
        isCostDetail: true,
        amountValue: -executionCost,
        ratioValue: buildRatio(-executionCost),
        tone: "neutral",
        bold: true,
        barColor: "#D15651",
        remark: executionRemarkText,
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
        key: "profit-allocation-section",
        label: "利润分配",
        note: "利润分配",
        isSection: true,
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
        amountValue: -projectFundAmount,
        ratioValue: buildRatio(-projectFundAmount),
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
    agencyFee,
    agencyFeeRemarkText,
    bonusRatio,
    executionCost,
    executionRemarkText,
    effectiveRentCost,
    finalProfit,
    income,
    laborCost,
    laborRemarkText,
    middleOfficeCost,
    netIncome,
    outsourceCost,
    projectBonus,
    projectLevel,
    projectProfit,
    rentRemarkText,
    tax,
    totalCost,
    projectFundAmount,
    middleOfficeRemarkText,
    financialStructure?.agencyFeeRate,
  ]);

  const breakdownColumns = useMemo<ColumnsType<BreakdownRow>>(() => {
    const incomeBase = income > 0 ? income : 0;
    const hiddenBarRowKeys = new Set([
      "income",
      "tax",
      "netIncome",
      "agencyFee",
      "outsourceCost",
      "laborCost",
      "rentCost",
      "middleOfficeCost",
      "executionCost",
      "projectBonus",
      "fund",
    ]);
    const hiddenRatioRowKeys = new Set(["income", "tax", "netIncome"]);

    return [
      {
        title: "类别",
        dataIndex: "label",
        key: "label",
        width: 160,
        onHeaderCell: () => ({ style: { paddingLeft: 24 } }),
        onCell: (row) => {
          if (row.note) {
            return {
              colSpan: 5,
              style: row.isSection
                ? { background: "#fafafa", paddingLeft: 24 }
                : { paddingLeft: 24 },
            };
          }
          return { style: { paddingLeft: 24 } };
        },
        render: (_value, row) => {
          if (row.note) {
            if (row.isSection) {
              return (
                <span
                  style={{
                    color: "rgba(0,0,0,0.45)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {row.note}
                </span>
              );
            }
            return (
              <span style={{ color: "rgba(0,0,0,0.45)" }}>{row.note}</span>
            );
          }
          const isSubItem = Boolean(row.indent);
          const text = (
            <span
              style={{
                display: "inline-flex",
                gap: 6,
                color: isSubItem ? "rgba(0,0,0,0.65)" : undefined,
              }}
            >
              {isSubItem ? (
                <span style={{ marginRight: 2, color: "#bfbfbf" }}>•</span>
              ) : null}
              <span>{row.label}</span>
            </span>
          );
          return row.bold ? <strong>{text}</strong> : text;
        },
      },
      {
        title: "金额",
        dataIndex: "amountValue",
        key: "amountValue",
        width: 120,
        align: "right",
        onHeaderCell: () => ({ style: { paddingRight: 24 } }),
        onCell: (row) =>
          row.note ? { colSpan: 0 } : { style: { paddingRight: 24 } },
        render: (_value, row) => {
          const isSubItem = Boolean(row.indent);
          const amount = normalizeNegativeZero(Number(row.amountValue ?? 0));
          const isNegative = amount < 0;
          const isProfit = row.tone === "green";
          const color = isSubItem
            ? "rgba(0,0,0,0.65)"
            : isProfit
              ? "#6F9838"
              : row.isCostDetail
                ? "#9A3F3B"
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
        title: "占比",
        dataIndex: "ratioValue",
        key: "ratioValue",
        width: 120,
        align: "right",
        onHeaderCell: () => ({ style: { paddingRight: 24 } }),
        onCell: (row) =>
          row.note ? { colSpan: 0 } : { style: { paddingRight: 24 } },
        render: (_value, row) => {
          if (hiddenRatioRowKeys.has(row.key)) {
            return null;
          }
          const isSubItem = Boolean(row.indent);
          const text = formatSignedPercentText(row.ratioValue);
          const ratioValue = normalizeNegativeZero(Number(row.ratioValue ?? 0));
          const isNegative = ratioValue < 0;
          const isProfit = row.tone === "green";
          const color = isSubItem
            ? "rgba(0,0,0,0.65)"
            : isProfit
              ? "#6F9838"
              : row.isCostDetail
                ? "#9A3F3B"
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
        title: `金额占比（相对收入${formatYuanText(incomeBase)}）`,
        dataIndex: "bar",
        key: "bar",
        onHeaderCell: () => ({
          style: { paddingLeft: 24, paddingRight: 24, maxWidth: 300 },
        }),
        onCell: (row) =>
          row.note
            ? { colSpan: 0 }
            : {
                style: {
                  minWidth: 180,
                  maxWidth: 300,
                  paddingLeft: 24,
                  paddingRight: 24,
                },
              },
        render: (_value, row) => {
          if (hiddenBarRowKeys.has(row.key)) {
            return null;
          }
          const amount = Number(row.amountValue ?? 0);
          const ratio =
            incomeBase > 0 ? Math.min(1, Math.abs(amount) / incomeBase) : 0;
          const progressPercent = Math.max(0, Math.min(100, ratio * 100));
          const barColor = row.barColor || "rgba(0,0,0,0.25)";

          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <Progress
                percent={progressPercent}
                showInfo={false}
                strokeColor={barColor}
                railColor="#f3f1e6"
                strokeWidth={6}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          );
        },
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        onHeaderCell: () => ({ style: { minWidth: 220, paddingRight: 24 } }),
        onCell: (row) =>
          row.note
            ? { colSpan: 0 }
            : { style: { minWidth: 220, paddingRight: 24 } },
        render: (_value, row) => {
          const value = String(row.remark ?? "").trim();
          if (
            (row.key === "income" ||
              row.key === "tax" ||
              row.key === "netIncome" ||
              row.key === "totalCost" ||
              row.key === "fund" ||
              row.key === "finalProfit") &&
            value === "-"
          ) {
            return null;
          }
          if (!value) return <span>-</span>;
          if (row.key === "executionCost" && !isManualCostMode) {
            const detailLines = value
              .split("\n")
              .map((item) => item.trim())
              .filter((item) => item && item !== "-");
            const exceeded = executionCost > executionCostBudget;

            return (
              <span
                style={{ whiteSpace: "pre-line", color: "rgba(0,0,0,0.65)" }}
              >
                {detailLines.length > 0 ? `${detailLines.join("\n")}\n` : null}
                <span
                  style={{
                    color: exceeded ? "#ff4d4f" : undefined,
                    fontWeight: exceeded ? 700 : undefined,
                  }}
                >
                  共计 {formatYuanText(executionCost)} 元
                </span>
                <span> / 预算 {formatYuanText(executionCostBudget)} 元</span>
              </span>
            );
          }
          if (row.key === "projectBonus") {
            return (
              <Tag
                color={getProjectLevelTagColor(projectLevel)}
                style={{ marginInlineEnd: 0 }}
              >
                {value}
              </Tag>
            );
          }
          if (row.key === "laborCost") {
            if (!canViewLaborDetail || isManualCostMode) {
              return (
                <span style={{ whiteSpace: "pre-line", color: "rgba(0,0,0,0.65)" }}>
                  {value}
                </span>
              );
            }
            return (
              <Button
                type="link"
                size="small"
                style={{
                  padding: 0,
                  height: "auto",
                  color: "rgba(0,0,0,0.5)",
                  textDecoration: "underline",
                }}
                onClick={() => setLaborDetailOpen(true)}
              >
                查看详情
              </Button>
            );
          }
          if (row.key === "rentCost") {
            if (!canViewLaborDetail || isManualCostMode) {
              return (
                <span style={{ whiteSpace: "pre-line", color: "rgba(0,0,0,0.65)" }}>
                  {value}
                </span>
              );
            }
            return (
              <Button
                type="link"
                size="small"
                style={{
                  padding: 0,
                  height: "auto",
                  color: "rgba(0,0,0,0.5)",
                  textDecoration: "underline",
                }}
                onClick={() => setRentDetailOpen(true)}
              >
                查看详情
              </Button>
            );
          }
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
    executionCost,
    executionCostBudget,
    canViewLaborDetail,
    isManualCostMode,
    setRentDetailOpen,
    projectLevel,
  ]);

  const overdueDays = Math.max(0, elapsedWorkdays - expectedWorkdays);
  const projectProfitRatio = income > 0 ? projectProfit / income : null;
  const finalProfitRatio = income > 0 ? finalProfit / income : null;
  const renderRatioBarDescription = (
    ratio: number | null,
    barColor: string,
    textColor: string,
  ) => {
    const ratioPercent = Number.isFinite(ratio ?? null)
      ? (ratio ?? 0) * 100
      : 0;
    const widthPercent = `${Math.max(0, Math.min(100, ratioPercent))}%`;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              width: widthPercent,
              height: "100%",
              background: barColor,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            color: textColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {formatRatioPercentText(ratio)}
        </span>
      </div>
    );
  };
  const overdueSuffix =
    overdueDays > 0 ? (
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

      const omitRemarkKeys = isManualCostMode
        ? new Set(["income", "tax"])
        : new Set(["income", "tax", "rentCost", "middleOfficeCost"]);
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
    }
  }, [app, isManualCostMode, messageApi, projectName, rows, tableTitleText]);

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
      <Modal
        title="人力成本详情"
        open={laborDetailOpen}
        onCancel={() => setLaborDetailOpen(false)}
        footer={null}
        width={980}
        style={{ maxWidth: "95vw", top: 24 }}
        styles={{
          body: {
            maxHeight: "80vh",
            overflowY: "auto",
          },
        }}
      >
        <Table<LaborDetailRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={laborDetailRows}
          rowClassName={(record) =>
            record.key === "summary" ? "labor-detail-summary-row" : ""
          }
          columns={[
            {
              title: "序号",
              dataIndex: "indexLabel",
              key: "indexLabel",
              width: 80,
              align: "center",
            },
            {
              title: "姓名",
              dataIndex: "name",
              key: "name",
              width: 80,
              render: (value: string) => (
                <span
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {value || "-"}
                </span>
              ),
            },
            {
              title: "职能",
              dataIndex: "functionName",
              key: "functionName",
              width: 80,
              render: (value: string, record: LaborDetailRow) =>
                record.key === "summary" ? (
                  ""
                ) : (
                  <Tag color={record.functionColor}>{value}</Tag>
                ),
            },
            {
              title: "工时（天）",
              dataIndex: "workdays",
              key: "workdays",
              width: 80,
              align: "right",
              render: (value: number) => `${formatAmount(value)}d`,
            },
            {
              title: "折合人力成本",
              dataIndex: "cost",
              key: "cost",
              width: 140,
              align: "right",
              render: (value: number) => `¥${formatYuanText(value)}`,
            },
            {
              title: "计算公式：人力成本 ÷ 月工作日基数 * 工时(天)",
              dataIndex: "remark",
              key: "remark",
              render: (value: string) => renderCostRemark(value),
            },
          ]}
        />
      </Modal>
      <Modal
        title="租金成本详情"
        open={rentDetailOpen}
        onCancel={() => setRentDetailOpen(false)}
        footer={null}
        width={980}
        style={{ maxWidth: "95vw", top: 24 }}
        styles={{
          body: {
            maxHeight: "80vh",
            overflowY: "auto",
          },
        }}
      >
        <Table<RentDetailRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={rentDetailRows}
          rowClassName={(record) =>
            record.key === "summary" ? "labor-detail-summary-row" : ""
          }
          columns={[
            {
              title: "序号",
              dataIndex: "indexLabel",
              key: "indexLabel",
              width: 80,
              align: "center",
            },
            {
              title: "姓名",
              dataIndex: "name",
              key: "name",
              width: 80,
              render: (value: string) => (
                <span
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {value || "-"}
                </span>
              ),
            },
            {
              title: "职能",
              dataIndex: "functionName",
              key: "functionName",
              width: 80,
              render: (value: string, record: RentDetailRow) =>
                record.key === "summary" ? (
                  ""
                ) : (
                  <Tag color={record.functionColor}>{value}</Tag>
                ),
            },
            {
              title: "工时（天）",
              dataIndex: "workdays",
              key: "workdays",
              width: 80,
              align: "right",
              render: (value: number) => `${formatAmount(value)}d`,
            },
            {
              title: "折合租金成本",
              dataIndex: "cost",
              key: "cost",
              width: 140,
              align: "right",
              render: (value: number) => `¥${formatYuanText(value)}`,
            },
            {
              title: "计算公式：租金成本 ÷ 月工作日基数 * 工时(天)",
              dataIndex: "remark",
              key: "remark",
              render: (value: string) => renderCostRemark(value),
            },
          ]}
        />
      </Modal>
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
            .realtime-cost-table-wrap .ant-table,
            .realtime-cost-table-wrap .ant-table-container,
            .realtime-cost-table-wrap .ant-table-content,
            .realtime-cost-table-wrap .ant-table-content > table {
              width: 100% !important;
            }
            .labor-detail-summary-row > td {
              font-weight: 700;
            }
          `}</style>
          <ProjectDetailTableContainer marginBottom={12}>
            <div
              style={{
                padding: "14px 16px",
                background: "#fafafa",
                borderBottom: "1px solid #f0f0f0",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.88)",
                }}
              >
                {projectName || "未命名项目"}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: "rgba(0,0,0,0.45)",
                  fontWeight: 600,
                }}
              >
                预计工作日：{expectedWorkdays || 0} 天 | 实际工作日：
                {actualDurationNode} 天
                {overdueSuffix ? <> {overdueSuffix}</> : null}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                background: "#f0f0f0",
                gap: 1,
              }}
            >
              <div style={{ background: "#fafafa", padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.65)",
                    marginBottom: 6,
                  }}
                >
                  收入
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: FINANCIAL_METRIC_COLORS.income,
                    fontWeight: 700,
                  }}
                >
                  {`${formatYuanText(income)} 元`}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "rgba(0,0,0,0.45)",
                    fontWeight: 600,
                  }}
                >
                  税费 {formatYuanText(tax)} 元
                </div>
              </div>

              <div style={{ background: "#fafafa", padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.65)",
                    marginBottom: 6,
                  }}
                >
                  总费用
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: FINANCIAL_METRIC_COLORS.cost,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {`${formatYuanText(totalCost)} 元`}
                </div>
                {renderRatioBarDescription(
                  totalCostRatio,
                  FINANCIAL_METRIC_BAR_COLORS.cost,
                  FINANCIAL_METRIC_COLORS.cost,
                )}
              </div>

              <div style={{ background: "#fafafa", padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.65)",
                    marginBottom: 6,
                  }}
                >
                  项目利润
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: FINANCIAL_METRIC_COLORS.profit,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {`${formatYuanText(projectProfit)} 元`}
                </div>
                {renderRatioBarDescription(
                  projectProfitRatio,
                  FINANCIAL_METRIC_BAR_COLORS.profit,
                  FINANCIAL_METRIC_COLORS.profit,
                )}
              </div>

              <div style={{ background: "#fafafa", padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.65)",
                  }}
                >
                  最终利润
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: FINANCIAL_METRIC_COLORS.profit,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {`${formatYuanText(finalProfit)} 元`}
                </div>
                {renderRatioBarDescription(
                  finalProfitRatio,
                  FINANCIAL_METRIC_BAR_COLORS.profit,
                  FINANCIAL_METRIC_COLORS.profit,
                )}
              </div>
            </div>
            <div
              className="realtime-cost-table-wrap"
              style={{
                overflow: "hidden",
                background: "#fff",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Table<BreakdownRow>
                rowKey="key"
                pagination={false}
                columns={breakdownColumns}
                dataSource={breakdownRows}
                size="small"
                tableLayout="auto"
                style={{ width: "100%" }}
                onRow={(record) => {
                  if (record.note) {
                    return {
                      style: {
                        background: record.isSection ? "#fafafa" : "#fff",
                        color: "rgba(0,0,0,0.45)",
                      },
                    };
                  }
                  if (record.key === "totalCost") {
                    return { style: { background: "#fafafa" } };
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
          </ProjectDetailTableContainer>

          <div style={{ height: 16 }} />
        </div>
      </div>
    </>
  );
};

export default ProjectRealtimeCostTrackingTable;
