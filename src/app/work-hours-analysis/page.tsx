"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Radio, Select, Space, message } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";

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
  totalDays: number;
  isSummary?: boolean;
  values: Record<
    string,
    {
      days: number;
      percent: number;
    }
  >;
};

const WORK_DAYS_BASE = 21.5;
const formatNumber = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");
const hoursToDays = (hours: number) => hours / 8;
const FUNCTION_SORT_ORDER = ["设计组", "品牌组", "项目组", "新媒体"] as const;
const toNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
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
  const [messageApi, contextHolder] = message.useMessage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const [exporting, setExporting] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
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
    (async () => {
      setLoading(true);
      try {
        const [entriesRes, employeesRes, projectsRes] = await Promise.all([
          fetch("/api/actual-work-entries", { cache: "no-store" }),
          fetchEmployeesFromStore({ full: true }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);
        const entriesData = entriesRes.ok ? await entriesRes.json() : [];
        const employeesData = Array.isArray(employeesRes) ? employeesRes : [];
        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        setEntries(Array.isArray(entriesData) ? entriesData : []);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const employeeHumanCostMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const employee of employees) {
      const totalHumanCost =
        toNumber(employee.salary) +
        toNumber(employee.socialSecurity) +
        toNumber(employee.providentFund) +
        toNumber(employee.workstationCost) +
        toNumber(employee.utilityCost);
      map.set(employee.id, totalHumanCost);
    }
    return map;
  }, [employees]);

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

  const projectColumns = useMemo<ProjectColumn[]>(() => {
    const map = new Map<string, ProjectColumn>();
    for (const entry of filteredEntries) {
      if (!entry.project?.id || !entry.project?.name) continue;
      const projectMeta = projectMap.get(entry.project.id);
      map.set(entry.project.id, {
        id: entry.project.id,
        name: entry.project.name,
        type: projectMeta?.type ?? null,
        typeOption: projectMeta?.typeOption ?? null,
      });
    }
    const getTypePriority = (project: ProjectColumn) => {
      const typeText =
        (project.typeOption?.value ?? project.type ?? "").trim().toUpperCase();
      if (typeText.includes("客户") || typeText === "CLIENT") return 0;
      if (typeText.includes("内部") || typeText === "INTERNAL") return 1;
      return 2;
    };
    return Array.from(map.values()).sort((left, right) => {
      const typeCompare = getTypePriority(left) - getTypePriority(right);
      if (typeCompare !== 0) return typeCompare;
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [filteredEntries, projectMap]);

  const tableData = useMemo<RowData[]>(() => {
    const rows = new Map<string, RowData>();

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

      const start = dayjs(entry.startDate);
      const end = dayjs(entry.endDate);
      const hours = Math.max(end.diff(start, "minute") / 60, 0);
      const days = hoursToDays(hours);
      const percent = (days / WORK_DAYS_BASE) * 100;

      const existing =
        rows.get(employeeId) ??
        ({
          key: employeeId,
          employeeId,
          employeeName,
          functionName,
          totalDays: 0,
          values: {},
        } as RowData);

      const cell = existing.values[projectId] ?? { days: 0, percent: 0 };
      cell.days += days;
      cell.percent += percent;
      existing.values[projectId] = cell;
      rows.set(employeeId, existing);
    }

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        totalDays: Object.values(row.values).reduce(
          (sum, cell) => sum + cell.days,
          0,
        ),
      }))
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
  }, [employeeMap, filteredEntries]);

  const summaryData = useMemo(() => {
    const daysByProject: Record<string, number> = {};
    const costByProject: Record<string, number> = {};
    let totalDays = 0;

    for (const row of tableData) {
      totalDays += row.totalDays;
      for (const project of projectColumns) {
        const cell = row.values[project.id] ?? { days: 0, percent: 0 };
        daysByProject[project.id] = (daysByProject[project.id] ?? 0) + cell.days;

        const humanCost = employeeHumanCostMap.get(row.employeeId) ?? 0;
        const projectCost = (cell.percent / 100) * humanCost;
        costByProject[project.id] = (costByProject[project.id] ?? 0) + projectCost;
      }
    }

    return {
      totalDays,
      daysByProject,
      costByProject,
    };
  }, [employeeHumanCostMap, projectColumns, tableData]);

  const dataSourceWithSummary = useMemo<RowData[]>(() => {
    const summaryRow: RowData = {
      key: "__summary__",
      employeeId: "__summary__",
      employeeName: "汇总",
      functionName: "汇总",
      totalDays: summaryData.totalDays,
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
  }, [projectColumns, summaryData.daysByProject, summaryData.totalDays, tableData]);

  const columns = useMemo<ProColumns<RowData>[]>(() => {
    const fixedColumns: ProColumns<RowData>[] = [
      {
        title: "职能",
        dataIndex: "functionName",
        width: 100,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: 3,
                style: { fontWeight: 700 },
              }
            : {},
        render: (_value, row) => (row.isSummary ? "汇总" : row.functionName),
      },
      {
        title: "人员",
        dataIndex: "employeeName",
        width: 100,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: 0,
              }
            : {},
      },
      {
        title: "工时总数",
        dataIndex: "totalDays",
        width: 120,
        fixed: "left",
        onCell: (row) =>
          row.isSummary
            ? {
                colSpan: 0,
              }
            : {},
        render: (_dom, row) =>
          row.isSummary ? null : `${formatNumber(row.totalDays)}d`,
      },
    ];

    const dynamicColumns: ProColumns<RowData>[] = projectColumns.map((project) => {
      const groupChildren: ProColumns<RowData>[] = [
        {
          title: "工时(天)",
          key: `${project.id}-days`,
          width: 120,
          align: "right",
          render: (_value, row) => {
            if (row.isSummary) {
              const totalDays = summaryData.daysByProject[project.id] ?? 0;
              return `${formatNumber(totalDays)}d`;
            }
            const cell = row.values[project.id] ?? { days: 0, percent: 0 };
            if (cell.days === 0) return "-";
            return `${formatNumber(cell.days)}d`;
          },
        },
        {
          title: "占比",
          key: `${project.id}-percent`,
          width: 120,
          align: "right",
          render: (_value, row) => {
            if (row.isSummary) return "";
            const cell = row.values[project.id] ?? { days: 0, percent: 0 };
            if (cell.days === 0) return "-";
            const isOverLimit = cell.percent > 100;
            return (
              <span
                style={
                  isOverLimit
                    ? { color: "#ff4d4f", fontWeight: 700 }
                    : undefined
                }
              >
                {`${formatNumber(cell.percent)}%`}
              </span>
            );
          },
        },
      ];

      if (canViewProjectCost) {
        groupChildren.push({
          title: "项目成本",
          key: `${project.id}-cost`,
          width: 140,
          align: "right",
          render: (_value, row) => {
            if (row.isSummary) {
              const totalCost = summaryData.costByProject[project.id] ?? 0;
              return `¥${formatNumber(totalCost)}`;
            }
            const cell = row.values[project.id] ?? { days: 0, percent: 0 };
            if (cell.days === 0) return "-";
            const humanCost = employeeHumanCostMap.get(row.employeeId) ?? 0;
            const projectCost = (cell.percent / 100) * humanCost;
            return `¥${formatNumber(projectCost)}`;
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
  }, [canViewProjectCost, employeeHumanCostMap, projectColumns, summaryData.costByProject, summaryData.daysByProject]);

  const downloadAnalysisXlsx = async () => {
    try {
      setExporting(true);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("工时分析");

      const headers = ["职能", "人员", "工时总数(天)"];
      for (const project of projectColumns) {
        headers.push(`${project.name}-工时(天)`);
        headers.push(`${project.name}-占比`);
        if (canViewProjectCost) {
          headers.push(`${project.name}-项目成本`);
        }
      }
      worksheet.addRow(headers);

      for (const row of tableData) {
        const rowValues: Array<string | number> = [
          row.functionName,
          row.employeeName,
          Number(formatNumber(row.totalDays)),
        ];
        for (const project of projectColumns) {
          const cell = row.values[project.id] ?? { days: 0, percent: 0 };
          rowValues.push(cell.days === 0 ? "-" : Number(formatNumber(cell.days)));
          rowValues.push(cell.days === 0 ? "-" : `${formatNumber(cell.percent)}%`);
          if (canViewProjectCost) {
            const humanCost = employeeHumanCostMap.get(row.employeeId) ?? 0;
            const projectCost = (cell.percent / 100) * humanCost;
            rowValues.push(cell.days === 0 ? "-" : Number(formatNumber(projectCost)));
          }
        }
        worksheet.addRow(rowValues);
      }

      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach((column) => {
        column.width = 16;
      });

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
      messageApi.success("表格已下载");
    } catch (error) {
      console.error(error);
      messageApi.error("下载失败");
    } finally {
      setExporting(false);
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
          !(row.employee?.name ?? "").includes(normalizedEmployee)
        ) {
          return false;
        }
        if (normalizedProject && !(row.project?.name ?? "").includes(normalizedProject)) {
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
    <Card styles={{ body: { padding: 12 } }}>
      {contextHolder}
      {viewMode === "records" ? (
        <ActualWorkEntriesTable
          requestData={recordsRequestData}
          headerTitle={<h3 style={{ margin: 0 }}>工时分析</h3>}
          toolbarActions={[toolbarFilters]}
          showTableOptions={false}
          employeeFilterOptions={employeeFilterOptions}
          columnKeys={["title", "employeeName", "projectName", "startDate", "workDay"]}
        />
      ) : (
        <ProTable<RowData>
          rowKey="key"
          bordered
          loading={loading}
          search={false}
          options={false}
          cardBordered={false}
          columns={columns}
          dataSource={dataSourceWithSummary}
          pagination={false}
          scroll={{ x: "max-content" }}
          headerTitle={<h3 style={{ margin: 0 }}>工时分析</h3>}
          toolBarRender={() => [toolbarFilters]}
        />
      )}
    </Card>
  );
}
