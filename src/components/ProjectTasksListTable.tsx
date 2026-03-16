// @ts-nocheck
"use client";

import type { ReactNode } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

export type ProjectTaskListRow = {
  id: string;
  name: string;
  dueDate?: string | null;
  segment?: {
    id: string;
    name: string;
    project?: { id: string; name: string } | null;
  } | null;
  owner?: { id: string; name: string } | null;
};

type ColumnKey =
  | "name"
  | "project"
  | "segment"
  | "owner"
  | "dueDate"
  | "actions";

type Props = {
  rows: ProjectTaskListRow[];
  loading?: boolean;
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  showTableOptions?: boolean;
  compactHorizontalPadding?: boolean;
  columnKeys?: ColumnKey[];
  onEdit?: (row: ProjectTaskListRow) => void;
  onDelete?: (id: string, name: string) => void;
  actionsDisabled?: boolean;
};

const ProjectTasksListTable = ({
  rows,
  loading = false,
  headerTitle = <h3 style={{ margin: 0 }}>项目任务</h3>,
  toolbarActions = [],
  showTableOptions = false,
  compactHorizontalPadding = false,
  columnKeys = ["name", "project", "segment", "owner", "dueDate", "actions"],
  onEdit,
  onDelete,
  actionsDisabled = false,
}: Props) => {
  const taskNameFilters = Array.from(
    new Set(rows.map((item) => item.name).filter((value): value is string => Boolean(value))),
  ).map((value) => ({ text: value, value }));

  const projectFilters = Array.from(
    new Set(
      rows
        .map((item) => item.segment?.project?.name)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const segmentFilters = Array.from(
    new Set(rows.map((item) => item.segment?.name).filter((value): value is string => Boolean(value))),
  ).map((value) => ({ text: value, value }));

  const ownerFilters = Array.from(
    new Set(rows.map((item) => item.owner?.name).filter((value): value is string => Boolean(value))),
  ).map((value) => ({ text: value, value }));

  const dueDateFilters = Array.from(
    new Set(
      rows
        .map((item) => (item.dueDate ? dayjs(item.dueDate).format("YYYY-MM-DD") : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const allColumns: Record<ColumnKey, ProColumns<ProjectTaskListRow>> = {
    name: {
      title: "任务名称",
      dataIndex: "name",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: taskNameFilters,
      filterSearch: true,
      onFilter: (value, record) => record.name === String(value),
      render: (_dom, record) => (
        <AppLink href={`/project-tasks/${record.id}`}>{record.name}</AppLink>
      ),
    },
    project: {
      title: "所属项目",
      key: "project",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.segment?.project?.name ?? "") === String(value),
      render: (_dom, record) =>
        record.segment?.project ? (
          <AppLink href={`/projects/${record.segment.project.id}`}>
            {record.segment.project.name}
          </AppLink>
        ) : (
          "-"
        ),
    },
    segment: {
      title: "所属环节",
      key: "segment",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: segmentFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.segment?.name ?? "") === String(value),
      render: (_dom, record) =>
        record.segment ? (
          <AppLink href={`/project-segments/${record.segment.id}`}>
            {record.segment.name}
          </AppLink>
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
      render: (_dom, record) =>
        record.owner ? (
          <AppLink href={`/employees/${record.owner.id}`}>{record.owner.name}</AppLink>
        ) : (
          "-"
        ),
    },
    dueDate: {
      title: "截止日期",
      dataIndex: "dueDate",
      filters: dueDateFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "") ===
        String(value),
      render: (_dom, record) =>
        record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "-",
    },
    actions: {
      title: "操作",
      key: "actions",
      hideInSetting: true,
      valueType: "option",
      render: (_dom, record) =>
        onEdit && onDelete ? (
          <TableActions
            onEdit={() => onEdit(record)}
            onDelete={() => onDelete(record.id, record.name)}
            editDisabled={actionsDisabled}
            deleteDisabled={actionsDisabled}
            deleteTitle={`确定删除任务「${record.name}」？`}
          />
        ) : (
          "-"
        ),
    },
  };

  const columns = columnKeys.map((key) => allColumns[key]);

  return (
    <ProTable<ProjectTaskListRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      options={
        showTableOptions
          ? {
              reload: false,
              density: false,
              fullScreen: false,
              setting: {
                draggable: false,
              },
            }
          : false
      }
      cardProps={
        compactHorizontalPadding
          ? {
              styles: {
                body: {
                  paddingInline: 0,
                },
              },
              bodyStyle: { paddingInline: 0, paddingTop: 0 },
            }
          : undefined
      }
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      toolBarRender={() => toolbarActions}
      locale={{ emptyText: "暂无任务" }}
    />
  );
};

export default ProjectTasksListTable;
