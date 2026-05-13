"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Radio, Select, Space, Table, message } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import {
  calculateActualWorkdays,
  getActualWorkEntryHours,
  getActualWorkdayGroupKey,
} from "@/lib/actual-workdays";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { WorkdayAdjustment } from "@/types/workdayAdjustment";

type ActualWorkEntry = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  project?: {
    id: string;
    name: string;
  } | null;
  employee?: {
    id: string;
    name: string;
  } | null;
};

type Employee = {
  id: string;
  name: string;
  entryDate?: string | null;
  function?: string | null;
  salary?: string | number | null;
  socialSecurity?: string | number | null;
  providentFund?: string | number | null;
  workstationCost?: string | number | null;
  utilityCost?: string | number | null;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  functionOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  compensationHistories?: {
    id: string;
    salary?: string | number | null;
    socialSecurity?: string | number | null;
    providentFund?: string | number | null;
    workstationCost?: string | number | null;
    utilityCost?: string | number | null;
    effectiveDate: string;
  }[];
};

type ProjectColumn = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type RowData = {
  key: string;
  employeeId: string;
  employeeName: string;
  functionName: string;
  functionOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  humanCostWithRent: number;
  totalDays: number;
  workdayBaseInfo: {
    workdayDays: number;
    naturalDays: number;
    weekendDays: number;
    holidayDays: number;
    makeupWorkdayDays: number;
    entryDateText: string | null;
  };
  isSummary?: boolean;
  values: Record<
    string,
    {
      days: number;
      percent: number;
    }
  >;
};

type ProjectCostDetailRow = {
  key: string;
  humanCostWithRent: number;
  percent: number;
  projectCost: number;
};

type HumanCostBreakdownRow = {
  key: string;
  item: string;
  amount: number;
  isTotal?: boolean;
};

type PercentWorkdayRow = {
  key: string;
  item: string;
  days: number;
  isTotal?: boolean;
};

const formatNumber = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");
const FUNCTION_SORT_ORDER = ["设计组", "品牌组", "项目组", "新媒体"] as const;
const PLATFORM_STATS_COLUMN_ID = "__platform_stats__";
const PLATFORM_STATS_COLUMN_NAME = "中台";
const EMPTY_WORKDAY_BASE_INFO = {
  workdayDays: 0,
  naturalDays: 0,
  weekendDays: 0,
  holidayDays: 0,
  makeupWorkdayDays: 0,
  entryDateText: null,
} as const;
const toNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const isWeekendDay = (date: dayjs.Dayjs) => {
  const weekday = date.day();
  return weekday === 0 || weekday === 6;
};
const isClientProject = (project?: {
  type?: string | null;
  typeOption?: {
    value?: string | null;
  } | null;
} | null) => {
  const typeText = (
    project?.typeOption?.value ??
    project?.type ??
    ""
  )
    .trim()
    .toUpperCase();
  return typeText.includes("客户") || typeText === "CLIENT";
};
const formatCurrency = (value: number) => `¥${formatNumber(value)}`;
const isDepartedEmployee = (employee: Employee) => {
  const status = (
    employee.employmentStatusOption?.value ??
    employee.employmentStatus ??
    ""
  )
    .trim()
    .toUpperCase();
  return status.includes("离职") || status.includes("LEFT");
};

const getEmployeeCostSnapshotAtDate = (employee: Employee, targetDate: dayjs.Dayjs) => {
  const target = targetDate.startOf("day");
  const matched = [...(employee.compensationHistories ?? [])]
    .filter((history) => {
      const effective = dayjs(history.effectiveDate).startOf("day");
      return effective.isValid() && (effective.isBefore(target) || effective.isSame(target, "day"));
    })
    .sort((left, right) => {
      const leftTime = dayjs(left.effectiveDate).valueOf();
      const rightTime = dayjs(right.effectiveDate).valueOf();
      return rightTime - leftTime;
    })[0];

  return {
    salary: toNumber(matched?.salary ?? employee.salary),
    socialSecurity: toNumber(matched?.socialSecurity ?? employee.socialSecurity),
    providentFund: toNumber(matched?.providentFund ?? employee.providentFund),
    workstationCost: toNumber(matched?.workstationCost ?? employee.workstationCost),
    utilityCost: toNumber(matched?.utilityCost ?? employee.utilityCost),
  };
};

export default function WorkHoursAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const mountedRef = useRef(true);
  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1;
  const [viewMode, setViewMode] = useState<"records" | "analysis">("analysis");
  const [entries, setEntries] = useState<ActualWorkEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<
    Array<{
      id: string;
      name: string;
      type?: string | null;
      typeOption?: {
        id?: string;
        value?: string | null;
        color?: string | null;
      } | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const workdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.adjustments,
  );
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const [exporting, setExporting] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [projectEntriesModal, setProjectEntriesModal] = useState<{
    employeeId: string;
    employeeName: string;
    projectId: string;
    projectName: string;
  } | null>(null);
  const [employeeEntriesModal, setEmployeeEntriesModal] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [projectCostDetailModal, setProjectCostDetailModal] = useState<{
    projectName: string;
    humanCostWithRent: number;
    percent: number;
    projectCost: number;
  } | null>(null);
  const [humanCostDetailModal, setHumanCostDetailModal] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [percentDetailModal, setPercentDetailModal] = useState<{
    employeeName: string;
    projectName: string;
    days: number;
    customerProjectDays: number;
    isPlatform: boolean;
    workdayBaseInfo: RowData["workdayBaseInfo"];
  } | null>(null);
  const canViewProjectCost = useMemo(
    () =>
      roleCodes.includes("ADMIN") ||
      roleCodes.includes("HR") ||
      roleCodes.includes("FINANCE"),
    [roleCodes],
  );
  const canDownloadAnalysis = useMemo(
    () =>
      roleCodes.includes("ADMIN") ||
      roleCodes.includes("HR") ||
      roleCodes.includes("FINANCE"),
    [roleCodes],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [entriesRes, employeesRes, projectsRes] = await Promise.all([
          fetch("/api/actual-work-entries", { cache: "no-store" }),
          fetch("/api/employees?list=full", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);
        if (!mountedRef.current) return;
        const entriesData = entriesRes.ok ? await entriesRes.json() : [];
        const employeesData = employeesRes.ok ? await employeesRes.json() : [];
        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        if (!mountedRef.current) return;
        setEntries(Array.isArray(entriesData) ? entriesData : []);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setProjects(
          Array.isArray(projectsData)
            ? projectsData
                .filter(
                  (
                    project,
                  ): project is {
                    id: string;
                    name: string;
                    type?: string | null;
                    typeOption?: {
                      id?: string;
                      value?: string | null;
                      color?: string | null;
                    } | null;
                  } =>
                    typeof project?.id === "string" &&
                    typeof project?.name === "string",
                )
                .map((project) => ({
                  id: project.id,
                  name: project.name,
                  type:
                    typeof project.type === "string" ? project.type : null,
                  typeOption: project.typeOption ?? null,
                }))
            : [],
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    void fetchAdjustmentsFromStore();
  }, [fetchAdjustmentsFromStore]);

  const projectMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        type?: string | null;
        typeOption?: {
          id?: string;
          value?: string | null;
          color?: string | null;
        } | null;
      }
    >();
    for (const project of projects) {
      map.set(project.id, project);
    }
    return map;
  }, [projects]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    return map;
  }, [employees]);

  const selectedMonthAdjustmentTypeMap = useMemo(() => {
    const map = new Map<string, WorkdayAdjustment["changeType"]>();
    const monthStart = dayjs()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .startOf("month");
    const monthEnd = monthStart.endOf("month").startOf("day");

    for (const adjustment of workdayAdjustments) {
      if (!adjustment.changeType) continue;
      const adjustmentStart = dayjs(adjustment.startDate).startOf("day");
      const adjustmentEnd = dayjs(adjustment.endDate).startOf("day");
      if (!adjustmentStart.isValid() || !adjustmentEnd.isValid()) continue;

      const effectiveStart = adjustmentStart.isAfter(monthStart)
        ? adjustmentStart
        : monthStart;
      const effectiveEnd = adjustmentEnd.isBefore(monthEnd)
        ? adjustmentEnd
        : monthEnd;

      if (effectiveStart.isAfter(effectiveEnd)) continue;

      let cursor = effectiveStart;
      while (cursor.isBefore(effectiveEnd) || cursor.isSame(effectiveEnd, "day")) {
        map.set(cursor.format("YYYY-MM-DD"), adjustment.changeType);
        cursor = cursor.add(1, "day");
      }
    }

    return map;
  }, [selectedMonth, selectedYear, workdayAdjustments]);

  const buildWorkdayBaseInfo = useCallback(
    (entryDate?: string | null) => {
      const monthStart = dayjs()
        .year(selectedYear)
        .month(selectedMonth - 1)
        .startOf("month");
      const monthEnd = monthStart.endOf("month").startOf("day");

      let effectiveStart = monthStart;
      let entryDateText: string | null = null;

      if (entryDate) {
        const parsedEntryDate = dayjs(entryDate).startOf("day");
        if (
          parsedEntryDate.isValid() &&
          parsedEntryDate.year() === selectedYear &&
          parsedEntryDate.month() + 1 === selectedMonth
        ) {
          effectiveStart = parsedEntryDate.isAfter(monthStart)
            ? parsedEntryDate
            : monthStart;
          entryDateText = `${selectedMonth}月${parsedEntryDate.date()}日入职`;
        }
      }

      if (effectiveStart.isAfter(monthEnd)) {
        return {
          ...EMPTY_WORKDAY_BASE_INFO,
          entryDateText,
        };
      }

      let naturalDays = 0;
      let weekendDays = 0;
      let holidayDays = 0;
      let makeupWorkdayDays = 0;
      let cursor = effectiveStart;

      while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
        naturalDays += 1;
        const dateKey = cursor.format("YYYY-MM-DD");
        const adjustmentType = selectedMonthAdjustmentTypeMap.get(dateKey);
        const weekend = isWeekendDay(cursor);

        if (weekend) {
          weekendDays += 1;
          if (adjustmentType === "上班") {
            makeupWorkdayDays += 1;
          }
        } else if (adjustmentType === "休息") {
          holidayDays += 1;
        }

        cursor = cursor.add(1, "day");
      }

      return {
        workdayDays:
          naturalDays - weekendDays - holidayDays + makeupWorkdayDays,
        naturalDays,
        weekendDays,
        holidayDays,
        makeupWorkdayDays,
        entryDateText,
      };
    },
    [selectedMonth, selectedMonthAdjustmentTypeMap, selectedYear],
  );

  const employeeWorkdayBaseInfoMap = useMemo(() => {
    const map = new Map<string, RowData["workdayBaseInfo"]>();
    for (const employee of employees) {
      map.set(employee.id, buildWorkdayBaseInfo(employee.entryDate ?? null));
    }
    return map;
  }, [buildWorkdayBaseInfo, employees]);

  const employeeHumanCostMap = useMemo(() => {
    const map = new Map<string, number>();
    const monthStart = dayjs()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .startOf("month");
    const monthEnd = monthStart.endOf("month").startOf("day");

    for (const employee of employees) {
      let cursor = monthStart;
      let days = 0;
      let totalCost = 0;
      while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
        const snapshot = getEmployeeCostSnapshotAtDate(employee, cursor);
        totalCost +=
          snapshot.salary +
          snapshot.socialSecurity +
          snapshot.providentFund +
          snapshot.workstationCost +
          snapshot.utilityCost;
        days += 1;
        cursor = cursor.add(1, "day");
      }
      map.set(employee.id, days > 0 ? totalCost / days : 0);
    }
    return map;
  }, [employees, selectedMonth, selectedYear]);

  const employeeMonthlyCostBreakdownMap = useMemo(() => {
    const map = new Map<
      string,
      {
        salary: number;
        socialSecurity: number;
        providentFund: number;
        workstationCost: number;
        utilityCost: number;
      }
    >();
    const monthStart = dayjs()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .startOf("month");
    const monthEnd = monthStart.endOf("month").startOf("day");
    for (const employee of employees) {
      let cursor = monthStart;
      let days = 0;
      let salarySum = 0;
      let socialSecuritySum = 0;
      let providentFundSum = 0;
      let workstationCostSum = 0;
      let utilityCostSum = 0;
      while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
        const snapshot = getEmployeeCostSnapshotAtDate(employee, cursor);
        salarySum += snapshot.salary;
        socialSecuritySum += snapshot.socialSecurity;
        providentFundSum += snapshot.providentFund;
        workstationCostSum += snapshot.workstationCost;
        utilityCostSum += snapshot.utilityCost;
        days += 1;
        cursor = cursor.add(1, "day");
      }
      map.set(employee.id, {
        salary: days > 0 ? salarySum / days : 0,
        socialSecurity: days > 0 ? socialSecuritySum / days : 0,
        providentFund: days > 0 ? providentFundSum / days : 0,
        workstationCost: days > 0 ? workstationCostSum / days : 0,
        utilityCost: days > 0 ? utilityCostSum / days : 0,
      });
    }
    return map;
  }, [employees, selectedMonth, selectedYear]);

  const humanCostDetailRows = useMemo<HumanCostBreakdownRow[]>(() => {
    if (!humanCostDetailModal) return [];
    const breakdown = employeeMonthlyCostBreakdownMap.get(
      humanCostDetailModal.employeeId,
    );
    const salary = breakdown?.salary ?? 0;
    const socialSecurity = breakdown?.socialSecurity ?? 0;
    const providentFund = breakdown?.providentFund ?? 0;
    const workstationCost = breakdown?.workstationCost ?? 0;
    const utilityCost = breakdown?.utilityCost ?? 0;
    const total =
      salary + socialSecurity + providentFund + workstationCost + utilityCost;
    return [
      { key: "salary", item: "薪资", amount: salary },
      { key: "socialSecurity", item: "社保", amount: socialSecurity },
      { key: "providentFund", item: "公积金", amount: providentFund },
      { key: "workstationCost", item: "工位费", amount: workstationCost },
      { key: "utilityCost", item: "水电", amount: utilityCost },
      { key: "total", item: "合计", amount: total, isTotal: true },
    ];
  }, [employeeMonthlyCostBreakdownMap, humanCostDetailModal]);

  const employeeOptions = useMemo(
    () =>
      employees
        .map((employee) => ({
          label: `${employee.name}${isDepartedEmployee(employee) ? "（离职）" : ""}`,
          value: employee.id,
          departed: isDepartedEmployee(employee),
          name: employee.name,
        }))
        .sort((left, right) => {
          if (left.departed !== right.departed) {
            return left.departed ? 1 : -1;
          }
          return left.name.localeCompare(right.name, "zh-CN");
        })
        .map(({ label, value }) => ({ label, value })),
    [employees],
  );

  const filteredEntriesForRecords = useMemo(() => {
    const hasEmployeeFilter = selectedEmployeeIds.length > 0;

    return entries.filter((entry) => {
      if (!entry.employee?.id) return false;

      if (hasEmployeeFilter && !selectedEmployeeIds.includes(entry.employee.id)) {
        return false;
      }

      const entryStart = dayjs(entry.startDate);
      if (!entryStart.isValid()) return false;
      if (entryStart.year() !== selectedYear) return false;
      if (entryStart.month() + 1 !== selectedMonth) return false;

      return true;
    });
  }, [entries, selectedEmployeeIds, selectedYear, selectedMonth]);

  const filteredEntries = useMemo(
    () => filteredEntriesForRecords.filter((entry) => Boolean(entry.project?.id)),
    [filteredEntriesForRecords],
  );

  const employeeFilterOptions = useMemo(
    () =>
      employeeOptions.map((item) => ({
        label: item.label,
        value: item.label.includes("（离职）")
          ? item.label.replace("（离职）", "")
          : item.label,
      })),
    [employeeOptions],
  );

  const selectedProjectEntries = useMemo(() => {
    if (!projectEntriesModal) return [];
    return filteredEntriesForRecords
      .filter(
        (entry) =>
          entry.employee?.id === projectEntriesModal.employeeId &&
          entry.project?.id === projectEntriesModal.projectId,
      )
      .sort((left, right) => {
        const startCompare =
          dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf();
        if (startCompare !== 0) return startCompare;
        return dayjs(right.endDate).valueOf() - dayjs(left.endDate).valueOf();
      });
  }, [filteredEntriesForRecords, projectEntriesModal]);

  const selectedEmployeeEntries = useMemo(() => {
    if (!employeeEntriesModal) return [];
    return filteredEntriesForRecords
      .filter((entry) => {
        if (entry.employee?.id !== employeeEntriesModal.employeeId) return false;
        if (!entry.project?.id) return false;
        const projectMeta = projectMap.get(entry.project.id);
        return isClientProject(projectMeta);
      })
      .sort((left, right) => {
        const startCompare =
          dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf();
        if (startCompare !== 0) return startCompare;
        return dayjs(right.endDate).valueOf() - dayjs(left.endDate).valueOf();
      });
  }, [employeeEntriesModal, filteredEntriesForRecords, projectMap]);

  const filteredDailyHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of filteredEntriesForRecords) {
      const employeeId = entry.employee?.id;
      if (!employeeId) continue;
      const key = getActualWorkdayGroupKey(employeeId, entry.startDate);
      const hours = getActualWorkEntryHours(entry.startDate, entry.endDate);
      map.set(key, (map.get(key) ?? 0) + hours);
    }
    return map;
  }, [filteredEntriesForRecords]);

  const projectFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredEntriesForRecords
            .map((entry) => entry.project?.name?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      )
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
        .map((value) => ({ label: value, value })),
    [filteredEntriesForRecords],
  );

  const projectColumns = useMemo<ProjectColumn[]>(() => {
    const map = new Map<string, ProjectColumn>();
    for (const entry of filteredEntries) {
      if (!entry.project?.id || !entry.project?.name) continue;
      const projectMeta = projectMap.get(entry.project.id);
      if (!isClientProject(projectMeta)) continue;
      map.set(entry.project.id, {
        id: entry.project.id,
        name: entry.project.name,
        type: projectMeta?.type ?? null,
        typeOption: projectMeta?.typeOption ?? null,
      });
    }
    return Array.from(map.values()).sort((left, right) => {
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [filteredEntries, projectMap]);

  const tableData = useMemo<RowData[]>(() => {
    const rows = new Map<string, RowData>();
    const employeeDailyHours = new Map<string, number>();

    for (const entry of filteredEntries) {
      const employeeId = entry.employee?.id;
      if (!employeeId) continue;
      const hours = getActualWorkEntryHours(entry.startDate, entry.endDate);
      const key = getActualWorkdayGroupKey(employeeId, entry.startDate);
      employeeDailyHours.set(key, (employeeDailyHours.get(key) ?? 0) + hours);
    }

    for (const entry of filteredEntries) {
      const employeeId = entry.employee?.id;
      const employeeName = entry.employee?.name ?? "-";
      const projectId = entry.project?.id;
      if (!employeeId || !projectId) continue;
      const projectMeta = projectMap.get(projectId);
      if (!isClientProject(projectMeta)) continue;

      const employee = employeeMap.get(employeeId);
      const functionName =
        employee?.functionOption?.value?.trim() ||
        employee?.function?.trim() ||
        "未设置";
      const workdayBaseInfo =
        employeeWorkdayBaseInfoMap.get(employeeId) ?? EMPTY_WORKDAY_BASE_INFO;

      const hours = getActualWorkEntryHours(entry.startDate, entry.endDate);
      const dailyHours =
        employeeDailyHours.get(getActualWorkdayGroupKey(employeeId, entry.startDate)) ??
        hours;
      const days = calculateActualWorkdays(hours, dailyHours);
      const percent =
        workdayBaseInfo.workdayDays > 0
          ? (days / workdayBaseInfo.workdayDays) * 100
          : 0;

      const existing =
        rows.get(employeeId) ??
        ({
          key: employeeId,
          employeeId,
          employeeName,
          functionName,
          functionOption: employee?.functionOption ?? null,
          humanCostWithRent: employeeHumanCostMap.get(employeeId) ?? 0,
          totalDays: 0,
          workdayBaseInfo,
          values: {},
        } as RowData);

      existing.totalDays += days;
      const cell = existing.values[projectId] ?? { days: 0, percent: 0 };
      cell.days += days;
      cell.percent += percent;
      existing.values[projectId] = cell;
      rows.set(employeeId, existing);
    }

    return Array.from(rows.values())
      .sort((left, right) => {
        const leftFunctionRank = FUNCTION_SORT_ORDER.indexOf(
          left.functionName as (typeof FUNCTION_SORT_ORDER)[number],
        );
        const rightFunctionRank = FUNCTION_SORT_ORDER.indexOf(
          right.functionName as (typeof FUNCTION_SORT_ORDER)[number],
        );
        const normalizedLeftRank =
          leftFunctionRank === -1 ? FUNCTION_SORT_ORDER.length : leftFunctionRank;
        const normalizedRightRank =
          rightFunctionRank === -1
            ? FUNCTION_SORT_ORDER.length
            : rightFunctionRank;
        const byFunction = normalizedLeftRank - normalizedRightRank;
        if (byFunction !== 0) return byFunction;
        return left.employeeName.localeCompare(right.employeeName, "zh-CN");
      });
  }, [
    employeeHumanCostMap,
    employeeMap,
    employeeWorkdayBaseInfoMap,
    filteredEntries,
    projectMap,
  ]);

  const summaryData = useMemo(() => {
    const daysByProject: Record<string, number> = {};
    const costByProject: Record<string, number> = {};
    let totalDays = 0;

    for (const row of tableData) {
      totalDays += row.totalDays;
      const customerProjectPercentSum = projectColumns.reduce((sum, project) => {
        const cell = row.values[project.id] ?? { days: 0, percent: 0 };
        return sum + cell.percent;
      }, 0);

      for (const project of projectColumns) {
        const cell = row.values[project.id] ?? { days: 0, percent: 0 };
        daysByProject[project.id] = (daysByProject[project.id] ?? 0) + cell.days;
        const projectCost = (cell.percent / 100) * row.humanCostWithRent;
        costByProject[project.id] = (costByProject[project.id] ?? 0) + projectCost;
      }

      const platformPercent = Math.max(0, 100 - customerProjectPercentSum);
      costByProject[PLATFORM_STATS_COLUMN_ID] =
        (costByProject[PLATFORM_STATS_COLUMN_ID] ?? 0) +
        (platformPercent / 100) * row.humanCostWithRent;
    }

    return {
      totalDays,
      daysByProject,
      costByProject,
    };
  }, [projectColumns, tableData]);

  const dataSourceWithSummary = useMemo<RowData[]>(() => {
    const summaryRow: RowData = {
      key: "__summary__",
      employeeId: "__summary__",
      employeeName: "汇总",
      functionName: "汇总",
      humanCostWithRent: tableData.reduce(
        (sum, row) => sum + row.humanCostWithRent,
        0,
      ),
      totalDays: summaryData.totalDays,
      workdayBaseInfo: buildWorkdayBaseInfo(null),
      isSummary: true,
      values: Object.fromEntries(
        projectColumns.map((project) => [
          project.id,
          {
            days: summaryData.daysByProject[project.id] ?? 0,
            percent: 0,
          },
        ]),
      ),
    };

    return [...tableData, summaryRow];
  }, [
    buildWorkdayBaseInfo,
    projectColumns,
    summaryData.daysByProject,
    summaryData.totalDays,
    tableData,
  ]);

  const getProjectPercentValue = useMemo(
    () =>
      (row: RowData, projectId: string) => {
        const cell = row.values[projectId] ?? { days: 0, percent: 0 };
        if (projectId === PLATFORM_STATS_COLUMN_ID) {
          return Math.max(
            0,
            100 - projectColumns.reduce((sum, currentProject) => {
              const currentCell = row.values[currentProject.id] ?? {
                days: 0,
                percent: 0,
              };
              return sum + currentCell.percent;
            }, 0),
          );
        }
        return cell.percent;
      },
    [projectColumns],
  );

  const getProjectDaysDisplay = useMemo(
    () =>
      (row: RowData, projectId: string) => {
        if (projectId === PLATFORM_STATS_COLUMN_ID) return "";
        if (row.isSummary) {
          const totalDays = summaryData.daysByProject[projectId] ?? 0;
          return `${formatNumber(totalDays)}d`;
        }
        const cell = row.values[projectId] ?? { days: 0, percent: 0 };
        if (cell.days === 0) return "-";
        return `${formatNumber(cell.days)}d`;
      },
    [summaryData.daysByProject],
  );

  const getProjectPercentDisplay = useMemo(
    () =>
      (row: RowData, projectId: string) => {
        if (row.isSummary) return "";
        const cell = row.values[projectId] ?? { days: 0, percent: 0 };
        const percent = getProjectPercentValue(row, projectId);
        if (projectId !== PLATFORM_STATS_COLUMN_ID && cell.days === 0) return "-";
        if (projectId === PLATFORM_STATS_COLUMN_ID && percent === 0) return "0%";
        return `${formatNumber(percent)}%`;
      },
    [getProjectPercentValue],
  );

  const projectCostDetailRows = useMemo<ProjectCostDetailRow[]>(
    () =>
      projectCostDetailModal
        ? [
            {
              key: "current",
              humanCostWithRent: projectCostDetailModal.humanCostWithRent,
              percent: projectCostDetailModal.percent,
              projectCost: projectCostDetailModal.projectCost,
            },
          ]
        : [],
    [projectCostDetailModal],
  );

  const getProjectCostDisplay = useMemo(
    () =>
      (row: RowData, projectId: string) => {
        if (row.isSummary) {
          const totalCost = summaryData.costByProject[projectId] ?? 0;
          return formatCurrency(totalCost);
        }
        const cell = row.values[projectId] ?? { days: 0, percent: 0 };
        const percent = getProjectPercentValue(row, projectId);
        if (projectId !== PLATFORM_STATS_COLUMN_ID && cell.days === 0) return "-";
        if (projectId === PLATFORM_STATS_COLUMN_ID && percent === 0) {
          return formatCurrency(0);
        }
        const projectCost = (percent / 100) * row.humanCostWithRent;
        return formatCurrency(projectCost);
      },
    [getProjectPercentValue, summaryData.costByProject],
  );

  const columns = useMemo<ProColumns<RowData>[]>(() => {
    const fixedColumnSpan = canViewProjectCost ? 4 : 3;
    const fixedColumns: ProColumns<RowData>[] = [
      {
        title: "职能",
        dataIndex: "functionName",
        width: 84,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: fixedColumnSpan,
                style: { fontWeight: 700 },
              }
            : {},
        render: (_value, row) => {
          if (row.isSummary) return "汇总";
          return (
            <SelectOptionQuickEditTag
              field="employee.function"
              option={
                row.functionOption?.id && row.functionOption.value
                  ? {
                      id: row.functionOption.id,
                      value: row.functionOption.value,
                      color: row.functionOption.color ?? null,
                    }
                  : null
              }
              fallbackText={row.functionName || "未设置"}
              modalTitle="修改职能"
              optionValueLabel="职能"
              saveSuccessText="职能已保存"
              onSaveSelection={async (nextOption) => {
                const res = await fetch(`/api/employees/${row.employeeId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ function: nextOption.value }),
                });
                if (!res.ok) {
                  throw new Error((await res.text()) || "更新职能失败");
                }
                setEmployees((prev) =>
                  prev.map((employee) =>
                    employee.id === row.employeeId
                      ? {
                          ...employee,
                          function: nextOption.value,
                          functionOption: {
                            id: nextOption.id,
                            value: nextOption.value,
                            color: nextOption.color ?? null,
                          },
                        }
                      : employee,
                  ),
                );
              }}
            />
          );
        },
      },
      {
        title: "人员",
        dataIndex: "employeeName",
        width: 60,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: 0,
              }
            : {},
      },
      ...(canViewProjectCost
        ? [
            {
              title: (
                <span>
                  <div>人力成本总计</div>
                  <div>(含租金成本)</div>
                </span>
              ),
              dataIndex: "humanCostWithRent",
              width: 110,
              fixed: "left" as const,
              align: "right" as const,
              onCell: (row: RowData) =>
                row.isSummary
                  ? {
                      colSpan: 0,
                    }
                  : {},
              render: (_dom: unknown, row: RowData) => {
                if (row.isSummary) return null;
                return (
                  <Button
                    type="link"
                    size="small"
                    style={{ paddingInline: 0, height: "auto" }}
                    onClick={() =>
                      setHumanCostDetailModal({
                        employeeId: row.employeeId,
                        employeeName: row.employeeName,
                      })
                    }
                  >
                    {formatCurrency(row.humanCostWithRent)}
                  </Button>
                );
              },
            } satisfies ProColumns<RowData>,
          ]
        : []),
      {
        title: "项目工时总数",
        dataIndex: "totalDays",
        width: 80,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: 0,
              }
            : {},
        render: (_dom, row) =>
          row.isSummary ? null : (
            <Button
              type="link"
              size="small"
              style={{ paddingInline: 0, height: "auto" }}
              onClick={() =>
                setEmployeeEntriesModal({
                  employeeId: row.employeeId,
                  employeeName: row.employeeName,
                })
              }
            >
              {`${formatNumber(row.totalDays)}d`}
            </Button>
          ),
      },
    ];

    const dynamicColumns: ProColumns<RowData>[] = [
      ...projectColumns,
      {
        id: PLATFORM_STATS_COLUMN_ID,
        name: PLATFORM_STATS_COLUMN_NAME,
      },
    ].map((project) => {
      const isPlatform = project.id === PLATFORM_STATS_COLUMN_ID;
      const groupChildren: ProColumns<RowData>[] = [
        {
          title: "占比",
          key: `${project.id}-percent`,
          width: 68,
          align: "right",
          render: (_value, row) => {
            const percentText = getProjectPercentDisplay(row, project.id);
            if (!percentText) return percentText;
            const percent = getProjectPercentValue(row, project.id);
            const isOverLimit = percent > 100;
            const days =
              project.id === PLATFORM_STATS_COLUMN_ID
                ? (percent / 100) * row.workdayBaseInfo.workdayDays
                : row.values[project.id]?.days ?? 0;
            const customerProjectDays = projectColumns.reduce((sum, currentProject) => {
              const currentCell = row.values[currentProject.id] ?? {
                days: 0,
                percent: 0,
              };
              return sum + currentCell.days;
            }, 0);
            return (
              <Button
                type="link"
                size="small"
                style={{
                  paddingInline: 0,
                  height: "auto",
                  color: isOverLimit ? "#ff4d4f" : undefined,
                  fontWeight: isOverLimit ? 700 : undefined,
                }}
                onClick={() =>
                  setPercentDetailModal({
                    employeeName: row.employeeName,
                    projectName: project.name,
                    days,
                    customerProjectDays,
                    isPlatform: project.id === PLATFORM_STATS_COLUMN_ID,
                    workdayBaseInfo: row.workdayBaseInfo,
                  })
                }
              >
                {percentText}
              </Button>
            );
          },
        },
      ];

      if (!isPlatform) {
        groupChildren.unshift({
          title: "工时",
          key: `${project.id}-days`,
          width: 68,
          align: "right",
          render: (_value, row) => {
            const daysText = getProjectDaysDisplay(row, project.id);
            if (row.isSummary || daysText === "-") {
              return daysText;
            }
            return (
              <Button
                type="link"
                size="small"
                style={{ paddingInline: 0, height: "auto" }}
                onClick={() =>
                  setProjectEntriesModal({
                    employeeId: row.employeeId,
                    employeeName: row.employeeName,
                    projectId: project.id,
                    projectName: project.name,
                  })
                }
              >
                {daysText}
              </Button>
            );
          },
        });
      }

      if (canViewProjectCost) {
        groupChildren.push({
          title: "项目成本",
          key: `${project.id}-cost`,
          width: 80,
          align: "right",
          render: (_value, row) => {
            const costText = getProjectCostDisplay(row, project.id);
            if (
              row.isSummary ||
              costText === "-"
            ) {
              return costText;
            }
            return (
              <Button
                type="link"
                size="small"
                style={{ paddingInline: 0, height: "auto" }}
                onClick={() =>
                  setProjectCostDetailModal({
                    projectName: project.name,
                    humanCostWithRent: row.humanCostWithRent,
                    percent: getProjectPercentValue(row, project.id),
                    projectCost:
                      (getProjectPercentValue(row, project.id) / 100) *
                      row.humanCostWithRent,
                  })
                }
              >
                {costText}
              </Button>
            );
          },
        });
      }

      return {
        title: project.name,
        key: project.id,
        children: groupChildren,
      };
    });

    return [...fixedColumns, ...dynamicColumns];
  }, [
    canViewProjectCost,
    getProjectCostDisplay,
    getProjectDaysDisplay,
    getProjectPercentDisplay,
    getProjectPercentValue,
    projectColumns,
    setEmployeeEntriesModal,
    setHumanCostDetailModal,
    setPercentDetailModal,
    setProjectCostDetailModal,
    setProjectEntriesModal,
  ]);

  const downloadAnalysisXlsx = async () => {
    try {
      setExporting(true);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("工时分析");

      const topHeader: string[] = [];
      const subHeader: string[] = [];
      const mergeRanges: Array<{
        fromRow: number;
        fromCol: number;
        toRow: number;
        toCol: number;
      }> = [];
      const columnWidths: number[] = [];

      const pushFixedHeader = (title: string, width: number) => {
        const col = topHeader.length + 1;
        topHeader.push(title);
        subHeader.push("");
        columnWidths.push(width);
        mergeRanges.push({
          fromRow: 1,
          fromCol: col,
          toRow: 2,
          toCol: col,
        });
      };

      pushFixedHeader("职能", 12);
      pushFixedHeader("人员", 10);
      if (canViewProjectCost) {
        pushFixedHeader("人力成本总计(含租金成本)", 16);
      }
      pushFixedHeader("工时总数(天)", 12);

      for (const project of projectColumns) {
        const displayName = project.name;
        const childTitles = [
          "工时",
          "占比",
          ...(canViewProjectCost ? ["项目成本"] : []),
        ];
        const startCol = topHeader.length + 1;
        topHeader.push(displayName, ...Array(Math.max(childTitles.length - 1, 0)).fill(""));
        subHeader.push(...childTitles);
        columnWidths.push(
          ...childTitles.map((title) => {
            if (title === "项目成本") return 14;
            if (title === "占比") return 10;
            return 10;
          }),
        );
        mergeRanges.push({
          fromRow: 1,
          fromCol: startCol,
          toRow: 1,
          toCol: startCol + childTitles.length - 1,
        });
      }
      const platformChildTitles = [
        "占比",
        ...(canViewProjectCost ? ["项目成本"] : []),
      ];
      const platformStartCol = topHeader.length + 1;
      topHeader.push(
        PLATFORM_STATS_COLUMN_NAME,
        ...Array(Math.max(platformChildTitles.length - 1, 0)).fill(""),
      );
      subHeader.push(...platformChildTitles);
      columnWidths.push(
        ...platformChildTitles.map((title) => (title === "项目成本" ? 14 : 10)),
      );
      mergeRanges.push({
        fromRow: 1,
        fromCol: platformStartCol,
        toRow: 1,
        toCol: platformStartCol + platformChildTitles.length - 1,
      });

      worksheet.addRow(topHeader);
      worksheet.addRow(subHeader);

      mergeRanges.forEach((range) => {
        worksheet.mergeCells(
          range.fromRow,
          range.fromCol,
          range.toRow,
          range.toCol,
        );
      });

      for (const row of dataSourceWithSummary) {
        const rowValues: Array<string | number> = [
          row.functionName,
          row.employeeName,
          ...(canViewProjectCost
            ? [row.isSummary ? "" : formatCurrency(row.humanCostWithRent)]
            : []),
          row.isSummary ? "" : `${formatNumber(row.totalDays)}d`,
        ];
        for (const project of projectColumns) {
          rowValues.push(getProjectDaysDisplay(row, project.id));
          rowValues.push(getProjectPercentDisplay(row, project.id));
          if (canViewProjectCost) {
            rowValues.push(getProjectCostDisplay(row, project.id));
          }
        }
        rowValues.push(getProjectPercentDisplay(row, PLATFORM_STATS_COLUMN_ID));
        if (canViewProjectCost) {
          rowValues.push(getProjectCostDisplay(row, PLATFORM_STATS_COLUMN_ID));
        }
        worksheet.addRow(rowValues);
      }

      [1, 2].forEach((rowNumber) => {
        const row = worksheet.getRow(rowNumber);
        row.font = { bold: true };
        row.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });
      worksheet.columns.forEach((column, index) => {
        column.width = columnWidths[index] ?? 14;
      });
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal:
              rowNumber <= 2 ? "center" : typeof cell.value === "string" && cell.value.startsWith("¥")
                ? "right"
                : "left",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD9D9D9" } },
            left: { style: "thin", color: { argb: "FFD9D9D9" } },
            bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
            right: { style: "thin", color: { argb: "FFD9D9D9" } },
          };
        });
      });
      worksheet.views = [{ state: "frozen", xSplit: 4, ySplit: 2 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const now = dayjs().format("YYYYMMDD_HHmmss");
      anchor.href = url;
      anchor.download = `工时分析_${now}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      if (mountedRef.current) {
        messageApi.success("开始下载表格");
      }
    } catch (error) {
      console.error(error);
      if (mountedRef.current) {
        messageApi.error("下载失败");
      }
    } finally {
      if (mountedRef.current) {
        setExporting(false);
      }
    }
  };

  const recordsRequestData = async (params: {
    current: number;
    pageSize: number;
    filters: {
      title?: string;
      employeeName?: string;
      projectName?: string;
      startDate?: string;
      startDateFrom?: string;
      startDateTo?: string;
    };
  }) => {
    const normalizedTitle = params.filters.title?.trim() ?? "";
    const normalizedEmployee = params.filters.employeeName?.trim() ?? "";
    const normalizedProject = params.filters.projectName?.trim() ?? "";
    const normalizedDate = params.filters.startDate?.trim() ?? "";
    const normalizedDateFrom = params.filters.startDateFrom?.trim() ?? "";
    const normalizedDateTo = params.filters.startDateTo?.trim() ?? "";

    const filtered = filteredEntriesForRecords
      .filter((row) => {
        if (normalizedTitle && !(row.title ?? "").includes(normalizedTitle)) {
          return false;
        }
        if (
          normalizedEmployee &&
          (row.employee?.name ?? "").trim() !== normalizedEmployee
        ) {
          return false;
        }
        if (
          normalizedProject &&
          (row.project?.name ?? "").trim() !== normalizedProject
        ) {
          return false;
        }
        if (
          normalizedDate &&
          dayjs(row.startDate).format("YYYY-MM-DD") !== normalizedDate
        ) {
          return false;
        }
        if (normalizedDateFrom || normalizedDateTo) {
          const rowDate = dayjs(row.startDate);
          if (normalizedDateFrom) {
            const from = dayjs(normalizedDateFrom).startOf("day");
            if (rowDate.isBefore(from)) return false;
          }
          if (normalizedDateTo) {
            const to = dayjs(normalizedDateTo).endOf("day");
            if (rowDate.isAfter(to)) return false;
          }
        }
        return true;
      })
      .sort(
        (left, right) =>
          dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf(),
      );

    const start = Math.max((params.current - 1) * params.pageSize, 0);
    const end = start + params.pageSize;
    const data = filtered.slice(start, end) as ActualWorkEntryRow[];
    return {
      data,
      total: filtered.length,
    };
  };

  const toolbarFilters = (
    <Space key="filters" size={8}>
      {viewMode === "analysis" && canDownloadAnalysis ? (
        <Button onClick={() => void downloadAnalysisXlsx()} loading={exporting}>
          下载表格
        </Button>
      ) : null}
      <Radio.Group
        value={viewMode}
        onChange={(event) => setViewMode(event.target.value)}
        options={[
          { label: "工时记录", value: "records" },
          { label: "工时分析", value: "analysis" },
        ]}
        optionType="button"
      />
      <Select
        mode="multiple"
        allowClear
        placeholder="筛选人员"
        style={{ width: 140 }}
        options={employeeOptions}
        value={selectedEmployeeIds}
        onChange={(value) => setSelectedEmployeeIds(value)}
      />
      <Select
        style={{ width: 120 }}
        value={selectedYear}
        options={Array.from(
          { length: Math.max(currentYear - 2025 + 1, 1) },
          (_, index) => {
            const year = 2025 + index;
            return { label: `${year}年`, value: year };
          },
        )}
        onChange={(value) => setSelectedYear(value)}
      />
      <Select
        style={{ width: 100 }}
        value={selectedMonth}
        options={Array.from({ length: 12 }, (_, index) => ({
          label: `${index + 1}月`,
          value: index + 1,
        }))}
        onChange={(value) => setSelectedMonth(value)}
      />
    </Space>
  );

  return (
    <ListPageContainer>
      {contextHolder}
      {viewMode === "records" ? (
        <ActualWorkEntriesTable
          requestData={recordsRequestData}
          headerTitle={<ProTableHeaderTitle>工时分析</ProTableHeaderTitle>}
          toolbarActions={[toolbarFilters]}
          showTableOptions={false}
          employeeFilterOptions={employeeFilterOptions}
          projectFilterOptions={projectFilterOptions}
          enableStartDateFilter={false}
          columnKeys={["title", "employeeName", "projectName", "startDate", "workDay"]}
        />
      ) : (
        <ProTable<RowData>
          rowKey="key"
          bordered
          size="small"
          loading={loading}
          search={false}
          options={false}
          cardBordered={false}
          columns={columns}
          dataSource={dataSourceWithSummary}
          pagination={false}
          scroll={{ x: "max-content" }}
          headerTitle={<ProTableHeaderTitle>工时分析</ProTableHeaderTitle>}
          toolBarRender={() => [toolbarFilters]}
        />
      )}
      <Modal
        title={`${selectedMonth}月工作日天数`}
        open={Boolean(percentDetailModal)}
        onCancel={() => setPercentDetailModal(null)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {percentDetailModal ? (
          <>
            <Table<PercentWorkdayRow>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={[
                {
                  key: "naturalDays",
                  item: "自然天",
                  days: percentDetailModal.workdayBaseInfo.naturalDays,
                },
                {
                  key: "weekendDays",
                  item: "周末",
                  days: -percentDetailModal.workdayBaseInfo.weekendDays,
                },
                {
                  key: "holidayDays",
                  item: "放假",
                  days: -percentDetailModal.workdayBaseInfo.holidayDays,
                },
                {
                  key: "makeupWorkdayDays",
                  item: "调休",
                  days: percentDetailModal.workdayBaseInfo.makeupWorkdayDays,
                },
                {
                  key: "workdayDays",
                  item: "汇总",
                  days: percentDetailModal.workdayBaseInfo.workdayDays,
                  isTotal: true,
                },
              ]}
              rowClassName={(record) =>
                record.isTotal ? "percent-workday-total-row" : ""
              }
              columns={[
                {
                  title: "项目",
                  dataIndex: "item",
                  key: "item",
                  width: 180,
                },
                {
                  title: "天数",
                  dataIndex: "days",
                  key: "days",
                  align: "right",
                  render: (value: number) => formatNumber(value),
                },
              ]}
            />
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 6,
                color: "rgba(0,0,0,0.88)",
              }}
            >
              占比计算公式：工时(
              {percentDetailModal.isPlatform
                ? `${formatNumber(
                    percentDetailModal.workdayBaseInfo.workdayDays,
                  )}-${formatNumber(percentDetailModal.customerProjectDays)}=${formatNumber(
                    percentDetailModal.days,
                  )}d`
                : `${formatNumber(percentDetailModal.days)}d`}
              ) / 工作日基数({formatNumber(percentDetailModal.workdayBaseInfo.workdayDays)}d) ={" "}
              {formatNumber(
                percentDetailModal.workdayBaseInfo.workdayDays > 0
                  ? (percentDetailModal.days /
                      percentDetailModal.workdayBaseInfo.workdayDays) *
                      100
                  : 0,
              )}
              %
              {percentDetailModal.workdayBaseInfo.entryDateText ? (
                <div style={{ marginTop: 6 }}>
                  {percentDetailModal.workdayBaseInfo.entryDateText}
                </div>
              ) : null}
            </div>
            <style>{`
              .percent-workday-total-row > td {
                font-weight: 700;
              }
            `}</style>
          </>
        ) : null}
      </Modal>
      <Modal
        title={
          humanCostDetailModal
            ? `${humanCostDetailModal.employeeName} - 人力成本总计明细`
            : "人力成本总计明细"
        }
        open={Boolean(humanCostDetailModal)}
        onCancel={() => setHumanCostDetailModal(null)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Table<HumanCostBreakdownRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={humanCostDetailRows}
          rowClassName={(record) => (record.isTotal ? "human-cost-total-row" : "")}
          columns={[
            {
              title: "项目",
              dataIndex: "item",
              key: "item",
              width: 180,
            },
            {
              title: "金额",
              dataIndex: "amount",
              key: "amount",
              align: "right",
              render: (value: number) => formatCurrency(value),
            },
          ]}
        />
        <style>{`
          .human-cost-total-row > td {
            font-weight: 700;
          }
        `}</style>
      </Modal>
      <Modal
        title={
          projectCostDetailModal
            ? `${projectCostDetailModal.projectName} - 项目成本详情`
            : "项目成本详情"
        }
        open={Boolean(projectCostDetailModal)}
        onCancel={() => setProjectCostDetailModal(null)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <Table<ProjectCostDetailRow>
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={projectCostDetailRows}
          columns={[
            {
              title: "人力成本总计",
              dataIndex: "humanCostWithRent",
              key: "humanCostWithRent",
              width: 180,
              render: (value: number) => formatCurrency(value),
            },
            {
              title: "占比",
              dataIndex: "percent",
              key: "percent",
              width: 120,
              render: (value: number) => `${formatNumber(value)}%`,
            },
            {
              title: "项目成本",
              dataIndex: "projectCost",
              key: "projectCost",
              width: 180,
              render: (value: number) => formatCurrency(value),
            },
          ]}
        />
      </Modal>
      <Modal
        title={
          employeeEntriesModal
            ? `${employeeEntriesModal.employeeName} - 工时明细`
            : "工时明细"
        }
        open={Boolean(employeeEntriesModal)}
        onCancel={() => setEmployeeEntriesModal(null)}
        footer={null}
        width={1080}
        destroyOnHidden
        styles={{
          body: {
            maxHeight: "72vh",
            overflow: "hidden",
          },
        }}
      >
        <ActualWorkEntriesTable
          requestData={async (params) => {
            const normalizedTitle = params.filters.title?.trim() ?? "";
            const normalizedDate = params.filters.startDate?.trim() ?? "";
            const normalizedDateFrom = params.filters.startDateFrom?.trim() ?? "";
            const normalizedDateTo = params.filters.startDateTo?.trim() ?? "";

            const filtered = selectedEmployeeEntries.filter((row) => {
              if (normalizedTitle && !(row.title ?? "").includes(normalizedTitle)) {
                return false;
              }
              if (
                normalizedDate &&
                dayjs(row.startDate).format("YYYY-MM-DD") !== normalizedDate
              ) {
                return false;
              }
              if (normalizedDateFrom || normalizedDateTo) {
                const rowDate = dayjs(row.startDate);
                if (normalizedDateFrom) {
                  const from = dayjs(normalizedDateFrom).startOf("day");
                  if (rowDate.isBefore(from)) return false;
                }
                if (normalizedDateTo) {
                  const to = dayjs(normalizedDateTo).endOf("day");
                  if (rowDate.isAfter(to)) return false;
                }
              }
              return true;
            });

            return {
              data: filtered as ActualWorkEntryRow[],
              total: filtered.length,
            };
          }}
          headerTitle={false}
          columnKeys={["projectName", "title", "startDate", "workDay"]}
          compactHorizontalPadding
          enableStartDateFilter={false}
          pagination={false}
          tableScrollY={520}
          workDayPrecision={3}
          getDailyTotalHours={(row) => {
            const employeeId = row.employee?.id;
            if (!employeeId) return undefined;
            return filteredDailyHoursMap.get(
              getActualWorkdayGroupKey(employeeId, row.startDate),
            );
          }}
        />
      </Modal>
      <Modal
        title={
          projectEntriesModal
            ? `${projectEntriesModal.employeeName} - ${projectEntriesModal.projectName} 实际工时`
            : "实际工时"
        }
        open={Boolean(projectEntriesModal)}
        onCancel={() => setProjectEntriesModal(null)}
        footer={null}
        width={960}
        destroyOnHidden
        styles={{
          body: {
            maxHeight: "72vh",
            overflow: "hidden",
          },
        }}
      >
        <ActualWorkEntriesTable
          requestData={async (params) => {
            const normalizedTitle = params.filters.title?.trim() ?? "";
            const normalizedDate = params.filters.startDate?.trim() ?? "";
            const normalizedDateFrom = params.filters.startDateFrom?.trim() ?? "";
            const normalizedDateTo = params.filters.startDateTo?.trim() ?? "";

            const filtered = selectedProjectEntries.filter((row) => {
              if (normalizedTitle && !(row.title ?? "").includes(normalizedTitle)) {
                return false;
              }
              if (
                normalizedDate &&
                dayjs(row.startDate).format("YYYY-MM-DD") !== normalizedDate
              ) {
                return false;
              }
              if (normalizedDateFrom || normalizedDateTo) {
                const rowDate = dayjs(row.startDate);
                if (normalizedDateFrom) {
                  const from = dayjs(normalizedDateFrom).startOf("day");
                  if (rowDate.isBefore(from)) return false;
                }
                if (normalizedDateTo) {
                  const to = dayjs(normalizedDateTo).endOf("day");
                  if (rowDate.isAfter(to)) return false;
                }
              }
              return true;
            });

            return {
              data: filtered as ActualWorkEntryRow[],
              total: filtered.length,
            };
          }}
          headerTitle={false}
          columnKeys={["title", "startDate", "workDay"]}
          compactHorizontalPadding
          enableStartDateFilter={false}
          pagination={false}
          tableScrollY={520}
          workDayPrecision={3}
          getDailyTotalHours={(row) => {
            const employeeId = row.employee?.id;
            if (!employeeId) return undefined;
            return filteredDailyHoursMap.get(
              getActualWorkdayGroupKey(employeeId, row.startDate),
            );
          }}
        />
      </Modal>
    </ListPageContainer>
  );
}
