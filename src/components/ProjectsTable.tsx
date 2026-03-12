"use client";

import { Table, Tag } from "antd";
import TableActions from "@/components/TableActions";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

export type Project = {
  id: string;
  name: string;
  type: string;
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
};

type ColumnKey =
  | "name"
  | "type"
  | "client"
  | "status"
  | "owner"
  | "startDate"
  | "endDate"
  | "actions";

interface ProjectsTableProps {
  projects: Project[];
  loading?: boolean;
  columnKeys?: ColumnKey[];
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
}

const ProjectsTable = ({
  projects,
  loading = false,
  columnKeys = [
    "name",
    "type",
    "client",
    "status",
    "owner",
    "startDate",
    "endDate",
    "actions",
  ],
  onEdit,
  onDelete,
}: ProjectsTableProps) => {
  const projectTypeOptions = {
    CLIENT: "客户项目",
    INTERNAL: "内部项目",
  };

  const projectStatusOptions = {
    PLANNING: "规划中",
    IN_PROGRESS: "进行中",
    COMPLETED: "已完成",
    PAUSED: "已暂停",
  };

  const statusColors = {
    PLANNING: "default",
    IN_PROGRESS: "processing",
    COMPLETED: "success",
    PAUSED: "warning",
  };

  const allColumns = {
    name: {
      title: "项目名称",
      dataIndex: "name",
      width: 180,
      ellipsis: true,
      filters: projects.map((p) => ({
        text: p.name,
        value: p.name,
      })),
      filterSearch: true,
      onFilter: (value: any, record: Project) =>
        record.name.includes(value as string),
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      render: (value: string, record: Project) => (
        <AppLink href={`/projects/${record.id}`}>
          {value}
        </AppLink>
      ),
    },
    type: {
      title: "项目类型",
      dataIndex: "type",
      width: 120,
      filters: Object.entries(projectTypeOptions).map(([key, value]) => ({
        text: value,
        value: key,
      })),
      onFilter: (value: any, record: Project) => record.type === value,
      render: (value: string) => (
        <Tag
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 500,
          }}
        >
          {projectTypeOptions[value as keyof typeof projectTypeOptions] ||
            value}
        </Tag>
      ),
    },
    client: {
      title: "所属客户",
      dataIndex: ["client", "name"],
      render: (value: string, record: Project) => value || "-",
    },
    status: {
      title: "项目状态",
      dataIndex: "status",
      width: 100,
      filters: Object.entries(projectStatusOptions).map(([key, value]) => ({
        text: value,
        value: key,
      })),
      onFilter: (value: any, record: Project) => record.status === value,
      render: (value: string | null) => {
        if (!value) return "-";
        return (
          <Tag
            color={statusColors[value as keyof typeof statusColors] || "default"}
          >
            {projectStatusOptions[
              value as keyof typeof projectStatusOptions
            ] || value}
          </Tag>
        );
      },
    },
    owner: {
      title: "项目负责人",
      dataIndex: ["owner", "name"],
      render: (value: string) => value || "-",
    },
    startDate: {
      title: "开始日期",
      dataIndex: "startDate",
      width: 120,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
      sorter: (a: Project, b: Project) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    endDate: {
      title: "结束日期",
      dataIndex: "endDate",
      width: 120,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
      sorter: (a: Project, b: Project) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    actions: {
      title: "操作",
      width: 200,
      fixed: "right" as const,
      render: (_: any, record: Project) => (
        <TableActions
          onEdit={() => onEdit?.(record)}
          onDelete={() => onDelete?.(record.id)}
          deleteTitle="确定删除这个项目？"
        />
      ),
    },
  };

  const columns = columnKeys.map(
    (key) =>
      allColumns[key as keyof typeof allColumns] as Record<string, any>
  );

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={projects}
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ProjectsTable;
