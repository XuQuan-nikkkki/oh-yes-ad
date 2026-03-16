"use client";

import type { ReactNode } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

export type ProjectTasksProTableRow = {
  id: string;
  name: string;
  dueDate?: string | null;
  owner?: { id: string; name: string } | null;
};

type ColumnKey = "name" | "owner" | "dueDate" | "actions";

type Props = {
  rows: ProjectTasksProTableRow[];
  loading?: boolean;
  columnKeys?: ColumnKey[];
  defaultVisibleColumnKeys?: ColumnKey[];
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  enableColumnSetting?: boolean;
  columnsStatePersistenceKey?: string;
  onEdit?: (row: ProjectTasksProTableRow) => void;
  onDelete?: (id: string) => void;
};

const ProjectTasksProTable = ({
  rows,
  loading = false,
  columnKeys = ["name", "owner", "dueDate", "actions"],
  defaultVisibleColumnKeys,
  headerTitle,
  toolbarActions = [],
  enableColumnSetting = true,
  columnsStatePersistenceKey = "project-tasks-pro-table-columns-state",
  onEdit,
  onDelete,
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

  const dueDateFilters = Array.from(
    new Set(
      rows
        .map((row) => (row.dueDate ? dayjs(row.dueDate).format("YYYY-MM-DD") : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

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
        <AppLink href={`/project-tasks/${record.id}`}>{record.name}</AppLink>
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
        (record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "") === String(value),
      render: (_value, record) =>
        record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "-",
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
          deleteTitle={`确定删除任务「${record.name}」？`}
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
