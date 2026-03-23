"use client";

import { useMemo } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";
import { formatDate, formatDateRange } from "@/lib/date";
import type { NullableSelectOptionValue } from "@/types/selectOption";

export type ProjectMilestoneRow = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: NullableSelectOptionValue;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME" | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  methodOption?: NullableSelectOptionValue;
  project?: { id: string; name: string; client?: { id: string; name: string } | null } | null;
};

const formatMilestoneDate = (row: ProjectMilestoneRow) => {
  return formatDateRange({
    start: row.startAt ?? row.date ?? null,
    end: row.endAt ?? null,
    withTime: row.datePrecision === "DATETIME",
    separator: " ~ ",
  });
};

type Props = {
  rows: ProjectMilestoneRow[];
  loading?: boolean;
  onEdit: (row: ProjectMilestoneRow) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
  renderTypeOption?: (row: ProjectMilestoneRow) => React.ReactNode;
  renderMethodOption?: (row: ProjectMilestoneRow) => React.ReactNode;
};

const ProjectMilestonesTable = ({
  rows,
  loading = false,
  onEdit,
  onDelete,
  actionsDisabled = false,
  headerTitle = <ProTableHeaderTitle>项目里程碑</ProTableHeaderTitle>,
  toolbarActions = [],
  renderTypeOption,
  renderMethodOption,
}: Props) => {
  const nameFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.name).filter((value): value is string => Boolean(value))),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const projectFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.project?.name)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const typeFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.typeOption?.value ?? row.type)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const dateFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) =>
              formatDate(row.startAt ?? row.date, undefined, ""),
            )
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const locationFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.location)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );
  const methodFilters = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.methodOption?.value ?? row.method)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ text: value, value })),
    [rows],
  );

  const columns: ProColumns<ProjectMilestoneRow>[] = [
    {
      title: "名称",
      dataIndex: "name",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: nameFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.name ?? "") === String(value),
      render: (_, record) => (
        <AppLink href={`/project-milestones/${record.id}`}>{record.name}</AppLink>
      ),
    },
    {
      title: "所属项目",
      key: "projectName",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      filters: projectFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.project?.name ?? "") === String(value),
      render: (_, record) =>
        record.project ? (
          <AppLink href={`/projects/${record.project.id}`}>{record.project.name}</AppLink>
        ) : (
          "-"
        ),
    },
    {
      title: "类型",
      key: "type",
      filters: typeFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.typeOption?.value ?? record.type ?? "") === String(value),
      render: (_, record) =>
        renderTypeOption ? renderTypeOption(record) : record.typeOption?.value ? (
          <SelectOptionTag
            option={{
              id: record.typeOption.id ?? "",
              value: record.typeOption.value,
              color: record.typeOption.color ?? null,
            }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "日期",
      dataIndex: "date",
      filters: dateFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        formatDate(record.startAt ?? record.date, undefined, "") ===
        String(value),
      render: (_value, record) => formatMilestoneDate(record),
    },
    {
      title: "方式",
      key: "method",
      filters: methodFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.methodOption?.value ?? record.method ?? "") === String(value),
      render: (_, record) =>
        renderMethodOption ? renderMethodOption(record) : record.methodOption?.value ? (
          <SelectOptionTag
            option={{
              id: record.methodOption.id ?? "",
              value: record.methodOption.value,
              color: record.methodOption.color ?? null,
            }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "地点",
      dataIndex: "location",
      filters: locationFilters,
      filterSearch: true,
      onFilter: (value, record) => (record.location ?? "") === String(value),
      render: (_dom, record) => record.location ?? "-",
    },
    {
      title: "操作",
      key: "actions",
      valueType: "option",
      render: (_, record) => [
        <TableActions
          key={record.id}
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
          disabled={actionsDisabled}
          deleteTitle={`确定删除里程碑「${record.name}」？`}
        />,
      ],
    },
  ];

  return (
    <ProTable<ProjectMilestoneRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      search={false}
      headerTitle={headerTitle}
      pagination={{ pageSize: 10 }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
      options={false}
      locale={{ emptyText: "暂无项目里程碑" }}
    />
  );
};

export default ProjectMilestonesTable;
