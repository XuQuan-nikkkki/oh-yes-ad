// @ts-nocheck
"use client";

import { useMemo } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";

type SelectOptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null;

export type ProjectMilestoneRow = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: SelectOptionValue;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME" | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  methodOption?: SelectOptionValue;
  project?: { id: string; name: string; client?: { id: string; name: string } | null } | null;
};

const formatMilestoneDate = (row: ProjectMilestoneRow) => {
  const start = row.startAt ?? row.date ?? null;
  const end = row.endAt ?? null;
  if (!start) return "-";
  const startAt = dayjs(start);
  const withTime = row.datePrecision === "DATETIME";
  const fmt = withTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD";
  const startText = startAt.format(fmt);
  if (!end) return startText;

  const endAt = dayjs(end);
  if (endAt.valueOf() === startAt.valueOf()) return startText;

  if (withTime && endAt.isSame(startAt, "day")) {
    return `${startAt.format("YYYY-MM-DD HH:mm")} ~ ${endAt.format("HH:mm")}`;
  }

  if (!withTime && endAt.isSame(startAt, "day")) return startText;
  return `${startText} ~ ${endAt.format(fmt)}`;
};

type Props = {
  rows: ProjectMilestoneRow[];
  onEdit: (row: ProjectMilestoneRow) => void;
  onDelete: (id: string) => void;
  actionsDisabled?: boolean;
  headerTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode[];
};

const ProjectMilestonesTable = ({
  rows,
  onEdit,
  onDelete,
  actionsDisabled = false,
  headerTitle = <h3 style={{ margin: 0 }}>项目里程碑</h3>,
  toolbarActions = [],
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
              row.startAt ?? row.date
                ? dayjs(row.startAt ?? row.date).format("YYYY-MM-DD")
                : null,
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
        record.typeOption?.value ? (
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
        (record.startAt ?? record.date
          ? dayjs(record.startAt ?? record.date).format("YYYY-MM-DD")
          : "") ===
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
        record.methodOption?.value ? (
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
      render: (value: string | null | undefined) => value ?? "-",
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
          editDisabled={actionsDisabled}
          deleteDisabled={actionsDisabled}
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
