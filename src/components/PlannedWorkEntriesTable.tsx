"use client";

import type { Key } from "react";
import { ProTable } from "@ant-design/pro-components";
import { buildPlannedWorkColumns } from "./planned-work-entries-table/columns";
import { normalizeFilterOptions } from "./planned-work-entries-table/utils";
import type { PlannedWorkEntriesTableProps } from "./planned-work-entries-table/types";

export type { PlannedWorkEntryRow } from "./planned-work-entries-table/types";

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
  projectFilterOptions = [],
  segmentFilterOptions = [],
  taskFilterOptions = [],
  ownerFilterOptions = [],
  yearFilterOptions = [],
  weekNumberFilterOptions = [],
  columnKeys = [
    "name",
    "projectName",
    "segmentName",
    "taskName",
    "ownerName",
    "year",
    "month",
    "weekNumber",
    "plannedDays",
    "actions",
  ],
  renderYearCell,
  monthTitle = "月份",
  renderMonthCell,
}: PlannedWorkEntriesTableProps) => {
  const columns = buildPlannedWorkColumns({
    columnKeys,
    normalizedProjectFilterOptions: normalizeFilterOptions(projectFilterOptions),
    normalizedSegmentFilterOptions: normalizeFilterOptions(segmentFilterOptions),
    normalizedTaskFilterOptions: normalizeFilterOptions(taskFilterOptions),
    normalizedOwnerFilterOptions: normalizeFilterOptions(ownerFilterOptions),
    normalizedYearFilterOptions: normalizeFilterOptions(yearFilterOptions),
    normalizedWeekNumberFilterOptions: normalizeFilterOptions(weekNumberFilterOptions),
    workdayAdjustments,
    actionsDisabled,
    onEdit,
    onDelete,
    renderYearCell,
    monthTitle,
    renderMonthCell,
  });

  const getSingleFilterValue = (filter: Record<string, Key[] | null>, key: string) =>
    Array.isArray(filter[key]) ? String((filter[key] as Key[])[0] ?? "") : undefined;

  return (
    <ProTable
      rowKey="id"
      columns={columns}
      request={async (params, _sort, filter) => {
        const f = filter as Record<string, Key[] | null>;
        const result = await requestData({
          current: params.current ?? 1,
          pageSize: params.pageSize ?? 10,
          filters: {
            projectName: getSingleFilterValue(f, "projectName"),
            segmentName: getSingleFilterValue(f, "segmentName"),
            taskName: getSingleFilterValue(f, "taskName"),
            ownerName: getSingleFilterValue(f, "ownerName"),
            year: getSingleFilterValue(f, "year"),
            weekNumber:
              getSingleFilterValue(f, "month") ?? getSingleFilterValue(f, "weekNumber"),
          },
        });
        return { data: result.data, total: result.total, success: true };
      }}
      search={false}
      headerTitle={headerTitle}
      options={
        showTableOptions
          ? { reload: false, density: false, fullScreen: false }
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
