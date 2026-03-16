// @ts-nocheck
"use client";

import type { ReactNode } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import TableActions from "@/components/TableActions";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";

export type Project = {
  id: string;
  name: string;
  type?: string | null;
  isArchived?: boolean | null;
  status?: string | null;
  stage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  statusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  typeOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
};

type ColumnKey =
  | "name"
  | "type"
  | "client"
  | "status"
  | "stage"
  | "owner"
  | "isArchived"
  | "period"
  | "startDate"
  | "endDate"
  | "actions";

type WorkdayAdjustment = {
  startDate: string;
  endDate: string;
  changeType: string;
};

interface ProjectsTableProps {
  projects: Project[];
  loading?: boolean;
  columnKeys?: ColumnKey[];
  defaultVisibleColumnKeys?: ColumnKey[];
  headerTitle?: ReactNode;
  toolbarActions?: ReactNode[];
  enableColumnSetting?: boolean;
  columnsStatePersistenceKey?: string;
  pagination?: boolean;
  compactHorizontalPadding?: boolean;
  workdayAdjustments?: WorkdayAdjustment[];
  onOptionUpdated?: () => void | Promise<void>;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  actionsDisabled?: boolean;
}

const ProjectsTable = ({
  projects,
  loading = false,
  columnKeys = [
    "name",
    "type",
    "client",
    "status",
    "stage",
    "owner",
    "isArchived",
    "startDate",
    "endDate",
    "actions",
  ],
  defaultVisibleColumnKeys,
  headerTitle,
  toolbarActions = [],
  enableColumnSetting = false,
  columnsStatePersistenceKey,
  pagination = true,
  compactHorizontalPadding = false,
  workdayAdjustments = [],
  onOptionUpdated,
  onEdit,
  onDelete,
  actionsDisabled = false,
}: ProjectsTableProps) => {
  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "-";
  };

  const projectTypeOptions = {
    CLIENT: "客户项目",
    INTERNAL: "内部项目",
    客户项目: "客户项目",
    内部项目: "内部项目",
  };

  const calculateWorkdays = (
    startDate: Date,
    endDate: Date,
    adjustments: WorkdayAdjustment[],
  ): number => {
    let workdays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0];

      const adjustment = adjustments.find((adj) => {
        const adjStart = new Date(adj.startDate).toISOString().split("T")[0];
        const adjEnd = new Date(adj.endDate).toISOString().split("T")[0];
        return dateStr >= adjStart && dateStr <= adjEnd;
      });

      if (adjustment) {
        if (adjustment.changeType === "上班") {
          workdays++;
        }
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workdays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workdays;
  };

  const formatPeriod = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate) return "-";
    const start = new Date(startDate);
    const today = new Date();
    const effectiveEnd = endDate ? new Date(endDate) : today;
    const naturalDays =
      Math.floor(
        (effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const workdays = calculateWorkdays(start, effectiveEnd, workdayAdjustments);
    const startStr = dayjs(start).format("YYYY/MM/DD");
    const endStr = endDate ? dayjs(endDate).format("YYYY/MM/DD") : "至今";
    const period = `${startStr} - ${endStr}`;
    return `${period} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;
  };
  const typeFilters = Array.from(
    new Set(
      projects
        .map((project) => project.typeOption?.value ?? project.type)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const statusFilters = Array.from(
    new Set(
      projects
        .map((project) => project.statusOption?.value ?? project.status)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));
  const stageFilters = Array.from(
    new Set(
      projects
        .map((project) => project.stageOption?.value ?? project.stage)
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => ({ text: value, value }));

  const allColumns = {
    name: {
      title: "项目名称",
      dataIndex: "name",
      ellipsis: true,
      maxWidth: 200,
      filters: projects.map((p) => ({
        text: p.name,
        value: p.name,
      })),
      filterSearch: true,
      onFilter: (value: string | number | boolean, record: Project) =>
        record.name.includes(value as string),
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      render: (_: unknown, record: Project) => (
        <AppLink href={`/projects/${record.id}`}>{record.name}</AppLink>
      ),
    },
    type: {
      title: "项目类型",
      dataIndex: "type",
      filters: typeFilters,
      onFilter: (value: string | number | boolean, record: Project) =>
        (record.typeOption?.value ?? record.type ?? "") === String(value),
      render: (value: string | null, record: Project) => {
        const optionValue =
          record.typeOption?.value ??
          (value
            ? projectTypeOptions[value as keyof typeof projectTypeOptions] ||
              value
            : null);
        if (!optionValue) return "-";
        return (
          <SelectOptionTag
            option={
              record.typeOption?.value
                ? {
                    id: record.typeOption.id ?? "",
                    value: record.typeOption.value,
                    color: record.typeOption.color ?? null,
                  }
                : {
                    id: "",
                    value: optionValue,
                    color: null,
                  }
            }
            onUpdated={onOptionUpdated}
          />
        );
      },
    },
    client: {
      title: "所属客户",
      dataIndex: ["client", "name"],
      render: (_value: string, record: Project) =>
        record.client ? (
          <AppLink href={`/clients/${record.client.id}`}>{record.client.name}</AppLink>
        ) : (
          "-"
        ),
    },
    status: {
      title: "项目状态",
      dataIndex: "status",
      filters: statusFilters,
      onFilter: (value: string | number | boolean, record: Project) =>
        (record.statusOption?.value ?? record.status ?? "") === String(value),
      render: (value: string | null, record: Project) => {
        if (!value) return "-";
        return (
          <SelectOptionTag
            option={
              record.statusOption?.value
                ? {
                    id: record.statusOption.id ?? "",
                    value: record.statusOption.value,
                    color: record.statusOption.color ?? null,
                  }
                : value
                  ? {
                      id: "",
                      value,
                      color: null,
                    }
                  : null
            }
            onUpdated={onOptionUpdated}
          />
        );
      },
    },
    stage: {
      title: "项目阶段",
      dataIndex: "stage",
      filters: stageFilters,
      onFilter: (value: string | number | boolean, record: Project) =>
        (record.stageOption?.value ?? record.stage ?? "") === String(value),
      render: (value: string | null, record: Project) => {
        if (!value) return "-";
        return (
          <SelectOptionTag
            option={
              record.stageOption?.value
                ? {
                    id: record.stageOption.id ?? "",
                    value: record.stageOption.value,
                    color: record.stageOption.color ?? null,
                  }
                : value
                  ? {
                      id: "",
                      value,
                      color: null,
                    }
                  : null
            }
            onUpdated={onOptionUpdated}
          />
        );
      },
    },
    owner: {
      title: "项目负责人",
      dataIndex: ["owner", "name"],
      render: (_value: string, record: Project) =>
        record.owner ? (
          <AppLink href={`/employees/${record.owner.id}`}>{record.owner.name}</AppLink>
        ) : (
          "-"
        ),
    },
    isArchived: {
      title: "已归档",
      dataIndex: "isArchived",
      filters: [
        { text: "是", value: "true" },
        { text: "否", value: "false" },
      ],
      onFilter: (value: string | number | boolean, record: Project) =>
        String(Boolean(record.isArchived)) === String(value),
      render: (value: boolean | null | undefined) => (value ? "是" : "否"),
    },
    period: {
      title: "项目周期",
      key: "period",
      render: (_value: unknown, record: Project) =>
        formatPeriod(record.startDate, record.endDate),
      sorter: (a: Project, b: Project) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    startDate: {
      title: "开始日期",
      dataIndex: "startDate",
      render: (value: string | null) => formatDate(value),
      sorter: (a: Project, b: Project) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    endDate: {
      title: "结束日期",
      dataIndex: "endDate",
      render: (value: string | null) => formatDate(value),
      sorter: (a: Project, b: Project) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    actions: {
      title: "操作",
      fixed: "right" as const,
      render: (_: unknown, record: Project) => (
        <TableActions
          onEdit={() => onEdit?.(record)}
          onDelete={() => onDelete?.(record.id)}
          editDisabled={actionsDisabled}
          deleteDisabled={actionsDisabled}
          deleteTitle="确定删除这个项目？"
        />
      ),
    },
  };

  const columns: ProColumns<Project>[] = columnKeys.map(
    (key) => allColumns[key as keyof typeof allColumns] as ProColumns<Project>,
  );
  const visibleColumnKeys = defaultVisibleColumnKeys ?? columnKeys;
  const columnsStateDefaultValue = Object.fromEntries(
    columnKeys.map((key) => [key, { show: visibleColumnKeys.includes(key) }]),
  );

  return (
    <ProTable<Project>
      rowKey="id"
      columns={columns}
      dataSource={projects}
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
      columnsState={
        enableColumnSetting
          ? {
              defaultValue: columnsStateDefaultValue,
              persistenceKey: columnsStatePersistenceKey,
              persistenceType: "localStorage",
            }
          : undefined
      }
      pagination={pagination ? { pageSize: 10 } : false}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      toolBarRender={() => toolbarActions}
    />
  );
};

export default ProjectsTable;
