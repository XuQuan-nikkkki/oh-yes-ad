"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Popover, Radio, Select, Space, message } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import {
  calculateActualWorkdays,
  getActualWorkEntryHours,
  getActualWorkdayGroupKey,
} from "@/lib/actual-workdays";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
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
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
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
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  useEffect(() => {
    void fetchAdjustmentsFromStore();
  }, [fetchAdjustmentsFromStore]);

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
    for (const employee of employees) {
      const totalHumanCost =
        toNumber(employee.salary) +
        toNumber(employee.socialSecurity) +
        toNumber(employee.providentFund) +
        defaultMonthlyRentCost;
      map.set(employee.id, totalHumanCost);
    }
    return map;
  }, [defaultMonthlyRentCost, employees]);

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
          humanCostWithRent: employeeHumanCostMap.get(employeeId) ?? 0,
          totalDays: 0,
          workdayBaseInfo,
          values: {},
        } as RowData);

      const projectMeta = projectMap.get(projectId);
      if (isClientProject(projectMeta)) {
        existing.totalDays += days;
        const cell = existing.values[projectId] ?? { days: 0, percent: 0 };
        cell.days += days;
        cell.percent += percent;
        existing.values[projectId] = cell;
      }
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

  const getProjectPercentFormula = useCallback(
    (row: RowData, projectId: string) => {
      const percent = getProjectPercentValue(row, projectId);
      const { workdayBaseInfo } = row;
      const days =
        projectId === PLATFORM_STATS_COLUMN_ID
          ? (percent / 100) * workdayBaseInfo.workdayDays
          : row.values[projectId]?.days ?? 0;
      const workdayDetailParts = [
        `${workdayBaseInfo.naturalDays}天`,
        `-${workdayBaseInfo.weekendDays}天周末`,
        ...(workdayBaseInfo.holidayDays > 0
          ? [`-${workdayBaseInfo.holidayDays}天放假`]
          : []),
        ...(workdayBaseInfo.makeupWorkdayDays > 0
          ? [`+${workdayBaseInfo.makeupWorkdayDays}天调休`]
          : []),
      ];

      return (
        <div>
          <div>
            计算公式：{formatNumber(days)}d / {formatNumber(workdayBaseInfo.workdayDays)}d
          </div>
          <div style={{ marginTop: 8 }}>
            {selectedMonth}月工作日天数：{workdayDetailParts.join("")}=
            {formatNumber(workdayBaseInfo.workdayDays)}个工作日
          </div>
          {workdayBaseInfo.entryDateText ? (
            <div style={{ marginTop: 4 }}>{workdayBaseInfo.entryDateText}</div>
          ) : null}
        </div>
      );
    },
    [getProjectPercentValue, selectedMonth],
  );

  const getPlatformPercentBreakdownContent = useCallback(
    (row: RowData) => {
      const items = projectColumns
        .map((project) => ({
          name: project.name,
          percent: getProjectPercentValue(row, project.id),
        }))
        .filter((item) => item.percent > 0);
      const totalPercent = items.reduce((sum, item) => sum + item.percent, 0);

      return (
        <div>
          {items.map((item) => (
            <div key={item.name}>
              {item.name}: {formatNumber(item.percent)}%
            </div>
          ))}
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            项目总占比：{formatNumber(totalPercent)}%
          </div>
        </div>
      );
    },
    [getProjectPercentValue, projectColumns],
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

  const getTotalDaysBreakdownContent = useCallback(
    (row: RowData) => {
      const items = projectColumns
        .map((project) => ({
          name: project.name,
          days: row.values[project.id]?.days ?? 0,
        }))
        .filter((item) => item.days > 0);

      if (items.length === 0) {
        return "暂无项目工时";
      }

      return (
        <div>
          {items.map((item) => (
            <div key={item.name}>
              {item.name}: {formatNumber(item.days)}d
            </div>
          ))}
        </div>
      );
    },
    [projectColumns],
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
        render: (_value, row) => (row.isSummary ? "汇总" : row.functionName),
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
                  <div>人力成本</div>
                  <div>(含租金成本)</div>
                </span>
              ),
              dataIndex: "humanCostWithRent",
              width: 100,
              fixed: "left" as const,
              align: "right" as const,
              onCell: (row: RowData) =>
                row.isSummary
                  ? {
                      colSpan: 0,
                    }
                  : {},
              render: (_dom: unknown, row: RowData) =>
                row.isSummary ? null : formatCurrency(row.humanCostWithRent),
            } satisfies ProColumns<RowData>,
          ]
        : []),
      {
        title: "工时总数",
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
            <Popover content={getTotalDaysBreakdownContent(row)}>
              <span>{`${formatNumber(row.totalDays)}d`}</span>
            </Popover>
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
            return (
              <Popover
                content={
                  project.id === PLATFORM_STATS_COLUMN_ID
                    ? getPlatformPercentBreakdownContent(row)
                    : getProjectPercentFormula(row, project.id)
                }
              >
                <span
                  style={
                    isOverLimit
                      ? { color: "#ff4d4f", fontWeight: 700 }
                      : undefined
                  }
                >
                  {percentText}
                </span>
              </Popover>
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
          render: (_value, row) => getProjectCostDisplay(row, project.id),
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
    getTotalDaysBreakdownContent,
    getProjectCostDisplay,
    getProjectDaysDisplay,
    getProjectPercentDisplay,
    getProjectPercentFormula,
    getPlatformPercentBreakdownContent,
    getProjectPercentValue,
    projectColumns,
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
        pushFixedHeader("人力成本(含租金成本)", 16);
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
            height: 560,
            overflowY: "auto",
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

            const start = Math.max((params.current - 1) * params.pageSize, 0);
            const end = start + params.pageSize;
            return {
              data: filtered.slice(start, end) as ActualWorkEntryRow[],
              total: filtered.length,
            };
          }}
          headerTitle={false}
          columnKeys={["title", "startDate", "workDay"]}
          compactHorizontalPadding
          enableStartDateFilter={false}
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
