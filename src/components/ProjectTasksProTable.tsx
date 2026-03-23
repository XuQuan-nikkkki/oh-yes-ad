"use client";

import type { ReactNode } from "react";
import { Popover } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
import { DATE_FORMAT } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import type { NullableSelectOptionValue } from "@/types/selectOption";

export type ProjectTasksProTableRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: NullableSelectOptionValue;
  dueDate?: string | null;
  owner?: { id: string; name: string } | null;
};

type ColumnKey = "name" | "status" | "owner" | "dueDate" | "actions";

type Props = {
  rows: ProjectTasksProTableRow[];
  loading?: boolean;
  columnKeys?: ColumnKey[];
  defaultVisibleColumnKeys?: ColumnKey[];
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  enableColumnSetting?: boolean;
  columnsStatePersistenceKey?: string;
  statusFilterOptions?: { text: string; value: string }[];
  onEdit?: (row: ProjectTasksProTableRow) => void;
  onDelete?: (id: string) => void;
  actionsDisabled?: boolean;
  renderStatusOption?: (row: ProjectTasksProTableRow) => ReactNode;
};

const ProjectTasksProTable = ({
  rows,
  loading = false,
  columnKeys = ["name", "status", "owner", "dueDate", "actions"],
  defaultVisibleColumnKeys,
  headerTitle,
  toolbarActions = [],
  enableColumnSetting = true,
  columnsStatePersistenceKey = "project-tasks-pro-table-columns-state",
  statusFilterOptions,
  onEdit,
  onDelete,
  actionsDisabled = false,
  renderStatusOption,
}: Props) => {
  const nameFilters = Array.from(
    new Set(rows.map((row) => row.name).filter((value): value is string => Boolean(value))),
  ).map((value) => ({ text: value, value }));

  const ownerFilters = Array.from(
    new Set(
      rows
        .map((row) => row.owner?.name)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const statusFilters =
    statusFilterOptions && statusFilterOptions.length > 0
      ? statusFilterOptions
      : Array.from(
          new Set(
            rows
              .map((row) => row.statusOption?.value ?? row.status)
              .filter((value): value is string => Boolean(value)),
          ),
        ).map((value) => ({ text: value, value }));

  const dueDateFilters = Array.from(
    new Set(
      rows
        .map((row) => formatDate(row.dueDate, DATE_FORMAT, ""))
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const effectiveColumnKeys = actionsDisabled
    ? columnKeys.filter((key) => key !== "actions")
    : columnKeys;

  const allColumns: Record<ColumnKey, ProColumns<ProjectTasksProTableRow>> = {
    name: {
      title: "任务名称",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 220 } }),
      filters: nameFilters,
      filterSearch: true,
      onFilter: (value, record) => record.name === String(value),
      render: (_value, record) => (
        <Popover content={record.name}>
          <span
            style={{
              display: "inline-block",
              maxWidth: 220,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              verticalAlign: "bottom",
            }}
          >
            <AppLink href={`/project-tasks/${record.id}`}>{record.name}</AppLink>
          </span>
        </Popover>
      ),
    },
    status: {
      title: "任务状态",
      key: "status",
      filters: statusFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.statusOption?.value ?? record.status ?? "") === String(value),
      render: (_value, record) =>
        renderStatusOption ? (
          renderStatusOption(record)
        ) : record.statusOption?.value ? (
          <SelectOptionTag option={record.statusOption} />
        ) : (
          record.status ?? "-"
        ),
    },
    owner: {
      title: "负责人",
      key: "owner",
      filters: ownerFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.owner?.name ?? "") === String(value),
      render: (_value, record) =>
        record.owner ? <AppLink href={`/employees/${record.owner.id}`}>{record.owner.name}</AppLink> : "-",
    },
    dueDate: {
      title: "截止日期",
      dataIndex: "dueDate",
      filters: dueDateFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        formatDate(record.dueDate, DATE_FORMAT, "") === String(value),
      render: (_value, record) => formatDate(record.dueDate, DATE_FORMAT),
      sorter: (a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
    },
    actions: {
      title: "操作",
      key: "actions",
      hideInSetting: true,
      valueType: "option",
      render: (_value, record) => [
        <TableActions
          key={record.id}
          onEdit={onEdit ? () => onEdit(record) : undefined}
          onDelete={onDelete ? () => onDelete(record.id) : undefined}
          disabled={actionsDisabled}
          deleteTitle={`确定删除任务「${record.name}」？`}
        />,
      ],
    },
  };

  const columns = effectiveColumnKeys.map((key) => allColumns[key]);
  const visibleColumnKeys = defaultVisibleColumnKeys ?? effectiveColumnKeys;
  const columnsStateDefaultValue = Object.fromEntries(
    effectiveColumnKeys.map((key) => [key, { show: visibleColumnKeys.includes(key) }]),
  );

  return (
    <ProTable<ProjectTasksProTableRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      options={{
        reload: false,
        density: false,
        fullScreen: false,
        setting: enableColumnSetting
          ? {
              draggable: true,
            }
          : false,
      }}
      columnsState={
        enableColumnSetting
          ? {
              defaultValue: columnsStateDefaultValue,
              persistenceKey: columnsStatePersistenceKey,
              persistenceType: "localStorage",
            }
          : undefined
      }
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        showTotal: (total) => `共 ${total} 条`,
      }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
      locale={{ emptyText: "暂无任务" }}
    />
  );
};

export default ProjectTasksProTable;
