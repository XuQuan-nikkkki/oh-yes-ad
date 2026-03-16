// @ts-nocheck
"use client";

import { Button, Input, Space, Tag } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export type PlannedWorkEntryRow = {
  id: string;
  year?: number | null;
  weekNumber?: number | null;
  yearOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  weekNumberOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  task?: {
    id: string;
    name: string;
    owner?: { id: string; name: string } | null;
    segment?: { id: string; name: string; project?: { id: string; name: string } };
  };
};

type Props = {
  requestData: (params: {
    current: number;
    pageSize: number;
    filters: {
      projectName?: string;
      segmentName?: string;
      taskName?: string;
      ownerName?: string;
      year?: string;
      weekNumber?: string;
    };
  }) => Promise<{ data: PlannedWorkEntryRow[]; total: number }>;
  onEdit: (row: PlannedWorkEntryRow) => void;
  onDelete: (id: string) => void;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
  workdayAdjustments?: Array<{
    startDate: string;
    endDate: string;
    changeType?: string | null;
  }>;
  refreshKey?: number;
  showTableOptions?: boolean;
  actionsDisabled?: boolean;
  columnKeys?: Array<
    | "name"
    | "projectName"
    | "segmentName"
    | "taskName"
    | "ownerName"
    | "year"
    | "weekNumber"
    | "plannedDays"
    | "actions"
  >;
};

const PlannedWorkEntriesTable = ({
  requestData,
  onEdit,
  onDelete,
  headerTitle = "计划工时",
  toolbarActions = [],
  workdayAdjustments = [],
  refreshKey = 0,
  showTableOptions = false,
  actionsDisabled = false,
  columnKeys = [
    "name",
    "projectName",
    "segmentName",
    "taskName",
    "ownerName",
    "year",
    "weekNumber",
    "plannedDays",
    "actions",
  ],
}: Props) => {
  const renderTextFilterDropdown = (
    placeholder: string,
    selectedKeys: (string | number)[],
    setSelectedKeys: (keys: (string | number)[]) => void,
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

  const getNumericYear = (row: PlannedWorkEntryRow) => {
    const raw = row.yearOption?.value ?? (row.year !== null && row.year !== undefined ? String(row.year) : "");
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const getNumericWeek = (row: PlannedWorkEntryRow) => {
    const raw =
      row.weekNumberOption?.value ??
      (row.weekNumber !== null && row.weekNumber !== undefined ? String(row.weekNumber) : "");
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const isDateInRange = (date: dayjs.Dayjs, startDate: string, endDate: string) => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");
    return date.isAfter(start.subtract(1, "millisecond")) && date.isBefore(end.add(1, "millisecond"));
  };
  const isWorkdayByAdjustments = (date: dayjs.Dayjs) => {
    let isWorkday = date.day() >= 1 && date.day() <= 5;
    workdayAdjustments.forEach((item) => {
      if (!isDateInRange(date, item.startDate, item.endDate)) return;
      if (item.changeType === "上班") isWorkday = true;
      if (item.changeType === "休假" || item.changeType === "调休") isWorkday = false;
    });
    return isWorkday;
  };
  const dayMeta = [
    { key: "monday", label: "一", offset: 0 },
    { key: "tuesday", label: "二", offset: 1 },
    { key: "wednesday", label: "三", offset: 2 },
    { key: "thursday", label: "四", offset: 3 },
    { key: "friday", label: "五", offset: 4 },
    { key: "saturday", label: "六", offset: 5 },
    { key: "sunday", label: "日", offset: 6 },
  ] as const;
  const now = dayjs();
  const currentWeekYear = now.isoWeekYear();
  const currentWeekNumber = now.isoWeek();
  const renderTime = (row: PlannedWorkEntryRow) => {
    const year = getNumericYear(row);
    const week = getNumericWeek(row);
    if (year === null || week === null) return "-";
    const weekStart = dayjs(`${year}-01-04`).startOf("isoWeek").add(week - 1, "week");
    const isCurrentWeek = year === currentWeekYear && week === currentWeekNumber;
    return (
      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
        <Tag
          color={isCurrentWeek ? "#ff4d4f" : "#d9d9d9"}
          style={{ marginInlineEnd: 0, fontWeight: 600 }}
        >
          {`W${week}`}
        </Tag>
        {dayMeta.map((item) => {
          const date = weekStart.add(item.offset, "day");
          const checked = Boolean(row[item.key]);
          const requiredWorkday = isWorkdayByAdjustments(date);
          const shouldShowWeekend = item.key === "saturday" || item.key === "sunday";
          const visible = shouldShowWeekend ? requiredWorkday || checked : requiredWorkday;
          if (!visible) return null;
          return (
            <Tag
              key={`${row.id}-${item.key}`}
              color={checked ? "#52c41a" : "#d9d9d9"}
              style={{ marginInlineEnd: 0, fontWeight: 600 }}
            >
              {item.label}
            </Tag>
          );
        })}
      </span>
    );
  };
  const getNameText = (row: PlannedWorkEntryRow) => {
    const week =
      row.weekNumberOption?.value ??
      (row.weekNumber !== null && row.weekNumber !== undefined
        ? String(row.weekNumber)
        : "");
    const ownerName = row.task?.owner?.name ?? "";
    if (!week || !ownerName) return "-";
    return `W${week} 工时记录@${ownerName}`;
  };

  const allColumns: Record<
    NonNullable<Props["columnKeys"]>[number],
    ProColumns<PlannedWorkEntryRow>
  > = {
    name: {
      title: "名称",
      key: "name",
      render: (_, row) => {
        const text = getNameText(row);
        return text === "-" ? (
          "-"
        ) : (
          <AppLink href={`/planned-work-entries/${row.id}`}>{text}</AppLink>
        );
      },
    },
    projectName: {
      key: "projectName",
      title: "所属项目",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
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
        row.task?.segment?.project ? (
          <AppLink href={`/projects/${row.task.segment.project.id}`}>
            {row.task.segment.project.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    segmentName: {
      key: "segmentName",
      title: "所属环节",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选环节",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) =>
        row.task?.segment ? (
          <AppLink href={`/project-segments/${row.task.segment.id}`}>
            {row.task.segment.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    taskName: {
      key: "taskName",
      title: "任务",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选任务",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) =>
        row.task ? <AppLink href={`/planned-work-entries/${row.id}`}>{row.task.name}</AppLink> : "-",
    },
    ownerName: {
      key: "ownerName",
      title: "任务责任人",
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选责任人",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) => row.task?.owner?.name ?? "-",
    },
    year: {
      key: "year",
      title: "年份",
      dataIndex: "yearOption",
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选年份",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) =>
        row.yearOption?.value ? (
          <SelectOptionTag
            option={{
              id: row.yearOption.id ?? "",
              value: row.yearOption.value,
              color: row.yearOption.color ?? null,
            }}
          />
        ) : row.year !== null && row.year !== undefined ? (
          String(row.year)
        ) : (
          "-"
        ),
    },
    weekNumber: {
      key: "weekNumber",
      title: "时间",
      dataIndex: "weekNumberOption",
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) =>
        renderTextFilterDropdown(
          "筛选周数",
          selectedKeys,
          setSelectedKeys,
          confirm,
          clearFilters,
        ),
      render: (_, row) => renderTime(row),
    },
    plannedDays: {
      title: "计划天数",
      key: "plannedDays",
      dataIndex: "plannedDays",
      render: (value: number | null | undefined) =>
        typeof value === "number" ? `${value}d` : "-",
    },
    actions: {
      title: "操作",
      key: "actions",
      valueType: "option",
      render: (_, row) => [
        <TableActions
          key={row.id}
          onEdit={() => onEdit(row)}
          onDelete={() => onDelete(row.id)}
          editDisabled={actionsDisabled}
          deleteDisabled={actionsDisabled}
          deleteTitle="确定删除该条计划工时？"
        />,
      ],
    },
  };
  const columns: ProColumns<PlannedWorkEntryRow>[] = columnKeys.map(
    (key) => allColumns[key],
  );

  return (
    <ProTable<PlannedWorkEntryRow>
      rowKey="id"
      columns={columns}
      request={async (params, _sort, filter) => {
        const result = await requestData({
          current: params.current ?? 1,
          pageSize: params.pageSize ?? 10,
          filters: {
            projectName: Array.isArray(filter.projectName)
              ? String(filter.projectName[0] ?? "")
              : undefined,
            segmentName: Array.isArray(filter.segmentName)
              ? String(filter.segmentName[0] ?? "")
              : undefined,
            taskName: Array.isArray(filter.taskName)
              ? String(filter.taskName[0] ?? "")
              : undefined,
            ownerName: Array.isArray(filter.ownerName)
              ? String(filter.ownerName[0] ?? "")
              : undefined,
            year: Array.isArray(filter.year)
              ? String(filter.year[0] ?? "")
              : undefined,
            weekNumber: Array.isArray(filter.weekNumber)
              ? String(filter.weekNumber[0] ?? "")
              : undefined,
          },
        });
        return {
          data: result.data,
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
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "暂无计划工时" }}
      toolBarRender={() => toolbarActions}
      params={{ refreshKey }}
    />
  );
};

export default PlannedWorkEntriesTable;
