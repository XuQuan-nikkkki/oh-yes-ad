"use client";

import { Button, DatePicker, Popover, Space } from "antd";
import dayjs from "dayjs";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import type { Key } from "react";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import TimeRangeValue from "@/components/TimeRangeValue";
import { InfoCircleOutlined } from "@ant-design/icons";
import { DEFAULT_COLOR } from "@/lib/constants";
import {
  calculateActualWorkdays,
  getActualWorkEntryHours,
  getActualWorkdayGroupKey,
} from "@/lib/actual-workdays";

export type ActualWorkEntryRow = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
  project?: { id: string; name: string };
};

type ColumnKey =
  | "title"
  | "employeeName"
  | "projectName"
  | "startDate"
  | "workDay"
  | "actions";

type Props = {
  requestData: (params: {
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
  }) => Promise<{ data: ActualWorkEntryRow[]; total: number }>;
  onEdit?: (row: ActualWorkEntryRow) => void;
  onDelete?: (id: string, title: string) => void;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
  refreshKey?: number;
  columnKeys?: ColumnKey[];
  showTableOptions?: boolean;
  compactHorizontalPadding?: boolean;
  employeeFilterOptions?: { text?: string; label?: string; value: string }[];
  projectFilterOptions?: { text?: string; label?: string; value: string }[];
  enableStartDateFilter?: boolean;
  canManageRow?: (row: ActualWorkEntryRow) => boolean;
  getDailyTotalHours?: (row: ActualWorkEntryRow) => number | undefined;
  workDayPrecision?: number;
};

const ActualWorkEntriesTable = ({
  requestData,
  onEdit,
  onDelete,
  headerTitle = "实际工时",
  toolbarActions = [],
  refreshKey = 0,
  columnKeys = [
    "title",
    "employeeName",
    "projectName",
    "startDate",
    "workDay",
    "actions",
  ],
  showTableOptions = false,
  compactHorizontalPadding = false,
  employeeFilterOptions = [],
  projectFilterOptions = [],
  enableStartDateFilter = true,
  canManageRow,
  getDailyTotalHours,
  workDayPrecision = 2,
}: Props) => {
  type TableRow = ActualWorkEntryRow & {
    __hours?: number;
    __baseHours?: number;
    __workDays?: number;
  };
  const normalizedEmployeeFilterOptions = employeeFilterOptions.map((item) => ({
    text: item.text ?? item.label ?? item.value,
    value: item.value,
  }));
  const normalizedProjectFilterOptions = projectFilterOptions.map((item) => ({
    text: item.text ?? item.label ?? item.value,
    value: item.value,
  }));
  const getSingleFilterValue = (
    value: Key[] | string | number | undefined,
  ) =>
    Array.isArray(value)
      ? String(value[0] ?? "")
      : typeof value === "string" || typeof value === "number"
        ? String(value)
        : undefined;
  const getFirstAvailableFilterValue = (
    filter: Record<string, Key[] | string | number | undefined>,
    keys: string[],
  ) => {
    for (const key of keys) {
      const value = getSingleFilterValue(filter[key]);
      if (value !== undefined && value.trim()) {
        return value;
      }
    }
    return undefined;
  };

  const fmtNum = (num: number, precision = 2) => num.toFixed(precision);
  const allColumns: Record<ColumnKey, ProColumns<TableRow>> = {
    title: {
      key: "title",
      title: "事件",
      dataIndex: "title",
      width: 200,
      render: (_, row) => (
        <Popover content={row.title}>
          <span
            style={{
              display: "inline-block",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              verticalAlign: "bottom",
            }}
          >
            <AppLink href={`/actual-work-entries/${row.id}`}>{row.title}</AppLink>
          </span>
        </Popover>
      ),
    },
    employeeName: {
      key: "employeeName",
      title: "人员",
      dataIndex: ["employee", "name"],
      filters: normalizedEmployeeFilterOptions,
      filterSearch: true,
      render: (_, row) => (
        <AppLink href={`/employees/${row.employee?.id}`}>
          {row.employee?.name ?? "-"}
        </AppLink>
      ),
    },
    projectName: {
      key: "projectName",
      title: "所属项目",
      filters: normalizedProjectFilterOptions,
      filterSearch: true,
      render: (_, row) =>
        row.project ? (
          <AppLink href={`/projects/${row.project.id}`}>
            {row.project.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    startDate: {
      key: "startDate",
      title: "时间",
      filterDropdown: enableStartDateFilter
        ? ({
            selectedKeys,
            setSelectedKeys,
            confirm,
            clearFilters,
          }) => (
            <div style={{ padding: 8 }}>
              <DatePicker.RangePicker
                value={
                  selectedKeys.length >= 2
                    ? [
                        dayjs(String(selectedKeys[0])),
                        dayjs(String(selectedKeys[1])),
                      ]
                    : null
                }
                onChange={(dates) => {
                  if (!dates || !dates[0] || !dates[1]) {
                    setSelectedKeys([]);
                    return;
                  }
                  setSelectedKeys([
                    dates[0].format("YYYY-MM-DD"),
                    dates[1].format("YYYY-MM-DD"),
                  ]);
                }}
                style={{ width: 260, marginBottom: 8, display: "block" }}
              />
              <Space>
                <Button type="primary" size="small" onClick={() => confirm()}>
                  确定
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    clearFilters?.();
                    confirm();
                  }}
                >
                  重置
                </Button>
              </Space>
            </div>
          )
        : undefined,
      render: (_, row) => (
        <TimeRangeValue
          start={row.startDate}
          end={row.endDate}
          datePrecision="DATETIME"
          compactEndTime
          showDayOffset
        />
      ),
    },
    workDay: {
      key: "workDay",
      title: "工时(天)",
      render: (_, row) => {
        const hours =
          typeof row.__hours === "number"
            ? row.__hours
            : getActualWorkEntryHours(row.startDate, row.endDate);
        const base =
          typeof row.__baseHours === "number"
            ? row.__baseHours
            : Math.max(hours, 0);
        const workDays =
          typeof row.__workDays === "number"
            ? row.__workDays
            : Number(calculateActualWorkdays(hours, base).toFixed(workDayPrecision));
        const text = `记录时长 ${fmtNum(hours)}h，当天总工时 ${fmtNum(base)}h，折合 ${fmtNum(workDays, workDayPrecision)}d`;
        return (
          <Space size={4}>
            <span>{fmtNum(workDays, workDayPrecision)}d</span>
            <Popover content={text}>
              <InfoCircleOutlined style={{ color: DEFAULT_COLOR }} />
            </Popover>
          </Space>
        );
      },
    },
    actions: {
      title: "操作",
      key: "actions",
      valueType: "option",
      render: (_, row) => [
        <TableActions
          key={row.id}
          onEdit={() => onEdit?.(row)}
          onDelete={() => onDelete?.(row.id, row.title)}
          disabled={typeof canManageRow === "function" ? !canManageRow(row) : false}
          deleteTitle={`确定删除实际工时「${row.title}」？`}
        />,
      ],
    },
  };
  const columns: ProColumns<TableRow>[] = columnKeys.map(
    (key) => allColumns[key],
  );

  return (
    <ProTable<TableRow>
      rowKey="id"
      columns={columns}
      request={async (params, _sort, filter) => {
        const normalizedFilter = filter as Record<
          string,
          Key[] | string | number | undefined
        >;
        const startDateFilter = normalizedFilter.startDate;
        const startDateValues = Array.isArray(startDateFilter)
          ? startDateFilter.map((value: Key) => String(value)).filter(Boolean)
          : (typeof startDateFilter === "string" ||
              typeof startDateFilter === "number") &&
            String(startDateFilter).trim()
            ? startDateFilter
                .toString()
                .split(",")
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [];
        const result = await requestData({
          current: params.current ?? 1,
          pageSize: params.pageSize ?? 10,
          filters: {
            title: getFirstAvailableFilterValue(normalizedFilter, ["title"]),
            employeeName: getFirstAvailableFilterValue(normalizedFilter, [
              "employeeName",
              "employee.name",
              "employee",
            ]),
            projectName: getFirstAvailableFilterValue(normalizedFilter, [
              "projectName",
              "project.name",
              "project",
            ]),
            startDate:
              startDateValues.length === 1 ? startDateValues[0] : undefined,
            startDateFrom:
              startDateValues.length >= 2 ? startDateValues[0] : undefined,
            startDateTo:
              startDateValues.length >= 2 ? startDateValues[1] : undefined,
          },
        });
        const groupHours = new Map<string, number>();
        result.data.forEach((row) => {
          const employeeId = row.employee?.id;
          if (!employeeId) return;
          const key = getActualWorkdayGroupKey(employeeId, row.startDate);
          groupHours.set(
            key,
            (groupHours.get(key) ?? 0) +
              getActualWorkEntryHours(row.startDate, row.endDate),
          );
        });
        const tableData: TableRow[] = result.data.map((row) => {
          const hours = getActualWorkEntryHours(row.startDate, row.endDate);
          const key = row.employee?.id
            ? getActualWorkdayGroupKey(row.employee.id, row.startDate)
            : "";
          const total = getDailyTotalHours?.(row) ?? groupHours.get(key) ?? hours;
          const workDays = Number(
            calculateActualWorkdays(hours, total).toFixed(workDayPrecision),
          );
          return {
            ...row,
            __hours: hours,
            __baseHours: total,
            __workDays: workDays,
          };
        });
        return {
          data: tableData,
          total: result.total,
          success: true,
        };
      }}
      search={false}
      headerTitle={headerTitle}
      options={
        showTableOptions
          ? {
              reload: false,
              density: false,
              fullScreen: false,
            }
          : false
      }
      cardProps={
        compactHorizontalPadding
          ? {
              bodyStyle: { paddingInline: 0, paddingTop: 0 },
            }
          : undefined
      }
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "暂无实际工时" }}
      toolBarRender={() => toolbarActions}
      params={{ refreshKey }}
    />
  );
};

export default ActualWorkEntriesTable;
