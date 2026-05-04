"use client";

import type { ReactNode } from "react";
import { Tag } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";
import { DEFAULT_COLOR } from "@/lib/constants";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";
import type { PlannedWorkColumnKey, PlannedWorkEntryRow } from "./types";
import {
  getNumericYear,
  getNumericWeek,
  isWorkdayByAdjustments,
  renderMonth,
  getNameText,
} from "./utils";

dayjs.extend(isoWeek);

const dayMeta = [
  { key: "monday", label: "一", offset: 0 },
  { key: "tuesday", label: "二", offset: 1 },
  { key: "wednesday", label: "三", offset: 2 },
  { key: "thursday", label: "四", offset: 3 },
  { key: "friday", label: "五", offset: 4 },
  { key: "saturday", label: "六", offset: 5 },
  { key: "sunday", label: "日", offset: 6 },
] as const;

type NormalizedFilterOption = { text: string; value: string };

type ColumnContext = {
  columnKeys: PlannedWorkColumnKey[];
  normalizedProjectFilterOptions: NormalizedFilterOption[];
  normalizedSegmentFilterOptions: NormalizedFilterOption[];
  normalizedTaskFilterOptions: NormalizedFilterOption[];
  normalizedOwnerFilterOptions: NormalizedFilterOption[];
  normalizedYearFilterOptions: NormalizedFilterOption[];
  normalizedWeekNumberFilterOptions: NormalizedFilterOption[];
  workdayAdjustments: WorkdayAdjustmentRange[];
  actionsDisabled: boolean;
  onEdit: (row: PlannedWorkEntryRow) => void;
  onDelete: (id: string) => void;
  renderYearCell?: (row: PlannedWorkEntryRow) => ReactNode;
  monthTitle: ReactNode;
  renderMonthCell?: (row: PlannedWorkEntryRow) => ReactNode;
};

const createTimeRenderer = (workdayAdjustments: WorkdayAdjustmentRange[]) => {
  const now = dayjs();
  const currentWeekYear = now.isoWeekYear();
  const currentWeekNumber = now.isoWeek();

  const timeRenderer = (row: PlannedWorkEntryRow): ReactNode => {
    const year = getNumericYear(row);
    const week = getNumericWeek(row);
    if (year === null || week === null) return "-";
    const weekStart = dayjs(`${year}-01-04`).startOf("isoWeek").add(week - 1, "week");
    const isCurrentWeek = year === currentWeekYear && week === currentWeekNumber;
    return (
      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
        <Tag
          color={isCurrentWeek ? "#ff4d4f" : DEFAULT_COLOR}
          style={{ marginInlineEnd: 0, fontWeight: 600 }}
        >
          {`W${week}`}
        </Tag>
        {dayMeta.map((item) => {
          const date = weekStart.add(item.offset, "day");
          const checked = Boolean(row[item.key]);
          const requiredWorkday = isWorkdayByAdjustments(date, workdayAdjustments);
          const shouldShowWeekend = item.key === "saturday" || item.key === "sunday";
          const visible = shouldShowWeekend ? requiredWorkday || checked : requiredWorkday;
          if (!visible) return null;
          return (
            <Tag
              key={`${row.id}-${item.key}`}
              color={checked ? "#52c41a" : DEFAULT_COLOR}
              style={{ marginInlineEnd: 0, fontWeight: 600 }}
            >
              {item.label}
            </Tag>
          );
        })}
      </span>
    );
  };
  timeRenderer.displayName = 'TimeRenderer';
  return timeRenderer;
};

export const buildPlannedWorkColumns = ({
  columnKeys,
  normalizedProjectFilterOptions,
  normalizedSegmentFilterOptions,
  normalizedTaskFilterOptions,
  normalizedOwnerFilterOptions,
  normalizedYearFilterOptions,
  normalizedWeekNumberFilterOptions,
  workdayAdjustments,
  actionsDisabled,
  onEdit,
  onDelete,
  renderYearCell,
  monthTitle,
  renderMonthCell,
}: ColumnContext): ProColumns<PlannedWorkEntryRow>[] => {
  const renderTime = createTimeRenderer(workdayAdjustments);

  const allColumns: Record<PlannedWorkColumnKey, ProColumns<PlannedWorkEntryRow>> = {
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
      filters: normalizedProjectFilterOptions,
      filterSearch: true,
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
      filters: normalizedSegmentFilterOptions,
      filterSearch: true,
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
      filters: normalizedTaskFilterOptions,
      filterSearch: true,
      render: (_, row) =>
        row.task ? (
          <AppLink href={`/planned-work-entries/${row.id}`}>{row.task.name}</AppLink>
        ) : (
          "-"
        ),
    },
    ownerName: {
      key: "ownerName",
      title: "任务责任人",
      filters: normalizedOwnerFilterOptions,
      filterSearch: true,
      render: (_, row) => row.task?.owner?.name ?? "-",
    },
    year: {
      key: "year",
      title: "年份",
      dataIndex: "yearOption",
      filters: normalizedYearFilterOptions,
      filterSearch: true,
      render: (_, row) =>
        renderYearCell ? (
          renderYearCell(row)
        ) : row.yearOption?.value ? (
          <SelectOptionTag
            option={{
              id: row.yearOption.id ?? "",
              value: row.yearOption.value,
              color: row.yearOption.color ?? null,
            }}
          />
        ) : row.year != null ? (
          String(row.year)
        ) : (
          "-"
        ),
    },
    month: {
      key: "month",
      title: monthTitle,
      filters: normalizedWeekNumberFilterOptions,
      filterSearch: true,
      render: (_, row) => (renderMonthCell ? renderMonthCell(row) : renderMonth(row)),
    },
    weekNumber: {
      key: "weekNumber",
      title: "时间",
      dataIndex: "weekNumberOption",
      render: (_, row) => renderTime(row),
    },
    plannedDays: {
      title: "计划天数",
      key: "plannedDays",
      dataIndex: "plannedDays",
      render: (_dom, row) =>
        typeof row.plannedDays === "number" ? `${row.plannedDays}d` : "-",
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
          disabled={actionsDisabled}
          deleteTitle="确定删除该条计划工时？"
        />,
      ],
    },
  };

  return columnKeys.map((key) => allColumns[key]);
};
