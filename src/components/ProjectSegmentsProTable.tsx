"use client";

import type { ReactNode } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";
import { DATE_FORMAT } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import type { NullableSelectOptionValue } from "@/types/selectOption";

export type ProjectSegmentsProTableRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: NullableSelectOptionValue;
  dueDate?: string | null;
  project?: { id: string; name: string } | null;
  owner?: { id: string; name: string } | null;
};

type ColumnKey = "name" | "project" | "owner" | "status" | "dueDate" | "actions";

type Props = {
  rows: ProjectSegmentsProTableRow[];
  loading?: boolean;
  columnKeys?: ColumnKey[];
  defaultVisibleColumnKeys?: ColumnKey[];
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  enableColumnSetting?: boolean;
  columnsStatePersistenceKey?: string;
  onEdit: (row: ProjectSegmentsProTableRow) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
};

const ProjectSegmentsProTable = ({
  rows,
  loading = false,
  columnKeys = ["name", "project", "owner", "status", "dueDate", "actions"],
  defaultVisibleColumnKeys,
  headerTitle,
  toolbarActions = [],
  enableColumnSetting = true,
  columnsStatePersistenceKey = "project-segments-pro-table-columns-state",
  onEdit,
  onDelete,
  actionsDisabled = false,
}: Props) => {
  const nameFilters = Array.from(
    new Set(rows.map((row) => row.name).filter((value): value is string => Boolean(value))),
  ).map((value) => ({ text: value, value }));

  const projectFilters = Array.from(
    new Set(
      rows
        .map((row) => row.project?.name)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const ownerFilters = Array.from(
    new Set(
      rows
        .map((row) => row.owner?.name)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const statusFilters = Array.from(
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

  const allColumns: Record<ColumnKey, ProColumns<ProjectSegmentsProTableRow>> = {
    name: {
      title: "环节名称",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 220 } }),
      filters: nameFilters,
      filterSearch: true,
      onFilter: (value, record) => record.name === String(value),
      render: (_value, record) => (
        <AppLink href={`/project-segments/${record.id}`}>{record.name}</AppLink>
      ),
    },
    project: {
      title: "所属项目",
      key: "project",
      width: 240,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 240 } }),
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.project?.name ?? "") === String(value),
      render: (_value, record) =>
        record.project ? (
          <AppLink href={`/projects/${record.project.id}`}>{record.project.name}</AppLink>
        ) : (
          "-"
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
    status: {
      title: "状态",
      key: "status",
      filters: statusFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.statusOption?.value ?? record.status ?? "") === String(value),
      render: (_value, record) =>
        record.statusOption?.value ? (
          <SelectOptionTag
            option={{
              id: record.statusOption.id ?? "",
              value: record.statusOption.value,
              color: record.statusOption.color ?? null,
            }}
          />
        ) : (
          record.status ?? "-"
        ),
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
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
          disabled={actionsDisabled}
          deleteTitle={`确定删除环节「${record.name}」？`}
        />,
      ],
    },
  };

  const columns = columnKeys.map((key) => allColumns[key]);
  const visibleColumnKeys = defaultVisibleColumnKeys ?? columnKeys;
  const columnsStateDefaultValue = Object.fromEntries(
    columnKeys.map((key) => [key, { show: visibleColumnKeys.includes(key) }]),
  );

  return (
    <ProTable<ProjectSegmentsProTableRow>
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
      locale={{ emptyText: "暂无项目环节" }}
    />
  );
};

export default ProjectSegmentsProTable;
