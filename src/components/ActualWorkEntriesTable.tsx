"use client";

import { Button, DatePicker, Input, Popover, Select, Space } from "antd";
import dayjs from "dayjs";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import type { Key } from "react";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import TimeRangeValue from "@/components/TimeRangeValue";
import { InfoCircleOutlined } from "@ant-design/icons";
import { DEFAULT_COLOR } from "@/lib/constants";

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
  employeeFilterOptions?: { label: string; value: string }[];
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
}: Props) => {
  type TableRow = ActualWorkEntryRow & {
    __hours?: number;
    __baseHours?: number;
    __workDays?: number;
  };
  const renderTextFilterDropdown = (
    placeholder: string,
    selectedKeys: Key[],
    setSelectedKeys: (keys: Key[]) => void,
    confirm: () => void,
    clearFilters?: () => void,
  ) => (
    <div style={{ padding: 8 }}>
      <Input
        allowClear
        placeholder={placeholder}
        value={selectedKeys[0] ? String(selectedKeys[0]) : ""}
        onChange={(e) => {
          const value = e.target.value;
          setSelectedKeys(value ? [value] : []);
        }}
        onPressEnter={() => confirm()}
        style={{ width: 220, marginBottom: 8, display: "block" }}
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
  );
  const renderSelectFilterDropdown = (
    placeholder: string,
    selectedKeys: Key[],
    setSelectedKeys: (keys: Key[]) => void,
    confirm: () => void,
    clearFilters: (() => void) | undefined,
    options: { label: string; value: string }[],
  ) => (
    <div style={{ padding: 8 }}>
      <Select
        className="table-filter-single-select"
        allowClear
        showSearch
        placeholder={placeholder}
        value={selectedKeys[0] ? String(selectedKeys[0]) : undefined}
        options={options}
        onChange={(value) => setSelectedKeys(value ? [value] : [])}
        style={{
          width: 220,
          marginBottom: 8,
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
        }}
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
  );

  const getHours = (start: string, end: string) =>
    Math.max(dayjs(end).diff(dayjs(start), "minute") / 60, 0);
  const getWorkDateKey = (start: string) => dayjs(start).format("YYYY-MM-DD");

  const calcWorkDay = (hours: number, total: number) => {
    if (hours === 0) return 0;
    if (total > 7.5) return hours / total;
    return hours / 7.5;
  };

  const fmtNum = (num: number) => num.toFixed(2);
  const allColumns: Record<ColumnKey, ProColumns<TableRow>> = {
    title: {
      key: "title",
      title: "事件",
      dataIndex: "title",
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "搜索事件",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) => (
        <AppLink href={`/actual-work-entries/${row.id}`}>{row.title}</AppLink>
      ),
    },
    employeeName: {
      key: "employeeName",
      title: "人员",
      dataIndex: ["employee", "name"],
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        employeeFilterOptions.length > 0
          ? renderSelectFilterDropdown(
              "筛选人员",
              selectedKeys,
              setSelectedKeys,
              confirm,
              clearFilters,
              employeeFilterOptions,
            )
          : renderTextFilterDropdown(
              "筛选人员",
              selectedKeys,
              setSelectedKeys,
              confirm,
              clearFilters,
            ),
      render: (_, row) => (
        <AppLink href={`/employees/${row.employee?.id}`}>
          {row.employee?.name ?? "-"}
        </AppLink>
      ),
    },
    projectName: {
      key: "projectName",
      title: "所属项目",
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选项目",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
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
      filterDropdown: ({
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
      ),
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
            : getHours(row.startDate, row.endDate);
        const base =
          typeof row.__baseHours === "number"
            ? row.__baseHours
            : Math.max(hours, 7.5);
        const workDays =
          typeof row.__workDays === "number"
            ? row.__workDays
            : Number(calcWorkDay(hours, base).toFixed(2));
        const text = `记录时长 ${fmtNum(hours)}h，当天总工时 ${fmtNum(base)}h，折合 ${fmtNum(workDays)}d`;
        return (
          <Space size={4}>
            <span>{fmtNum(workDays)}d</span>
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
        const startDateFilter = filter.startDate as Key[] | string | undefined;
        const startDateValues = Array.isArray(startDateFilter)
          ? startDateFilter.map((value: Key) => String(value)).filter(Boolean)
          : typeof startDateFilter === "string" && startDateFilter.trim()
            ? startDateFilter
                .split(",")
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [];
        const result = await requestData({
          current: params.current ?? 1,
          pageSize: params.pageSize ?? 10,
          filters: {
            title: Array.isArray(filter.title)
              ? String(filter.title[0] ?? "")
              : undefined,
            employeeName: Array.isArray(filter.employeeName)
              ? String(filter.employeeName[0] ?? "")
              : undefined,
            projectName: Array.isArray(filter.projectName)
              ? String(filter.projectName[0] ?? "")
              : undefined,
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
          const key = `${employeeId}__${getWorkDateKey(row.startDate)}`;
          groupHours.set(
            key,
            (groupHours.get(key) ?? 0) + getHours(row.startDate, row.endDate),
          );
        });
        const tableData: TableRow[] = result.data.map((row) => {
          const hours = getHours(row.startDate, row.endDate);
          const key = `${row.employee?.id ?? ""}__${getWorkDateKey(row.startDate)}`;
          const total = groupHours.get(key) ?? hours;
          const base = total > 7.5 ? total : 7.5;
          const workDays = Number(calcWorkDay(hours, total).toFixed(2));
          return {
            ...row,
            __hours: hours,
            __baseHours: base,
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
