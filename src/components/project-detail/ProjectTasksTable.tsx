"use client";

import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import TableActions from "@/components/TableActions";

export type ProjectTaskRow = {
  id: string;
  name: string;
  status?: string | null;
  dueDate?: string | null;
  segmentId: string;
  segmentName: string;
  owner?: {
    id: string;
    name: string;
  } | null;
};

export type ProjectTaskSegmentGroup = {
  id: string;
  name: string;
  status?: string | null;
  dueDate?: string | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  projectTasks?: {
    id: string;
    name: string;
    status?: string | null;
    dueDate?: string | null;
    segmentId: string;
    owner?: {
      id: string;
      name: string;
    } | null;
  }[];
};

type TaskTreeRow = {
  key: string;
  nodeType: "segment" | "task";
  id: string;
  name: string;
  status?: string | null;
  dueDate?: string | null;
  segmentId?: string;
  segmentName?: string;
  owner?: {
    id: string;
    name: string;
  } | null;
  children?: TaskTreeRow[];
};

type Props = {
  data: ProjectTaskSegmentGroup[];
  onAddTask: (segment: { id: string; name: string }) => void;
  onEditSegment: (segment: {
    id: string;
    name: string;
    status?: string | null;
    dueDate?: string | null;
    owner?: { id: string; name: string } | null;
  }) => void;
  onDeleteSegment: (segment: { id: string; name: string }) => void;
  onEdit: (record: ProjectTaskRow) => void;
  onDelete: (record: ProjectTaskRow) => void;
};

const ProjectTasksTable = ({
  data,
  onAddTask,
  onEditSegment,
  onDeleteSegment,
  onEdit,
  onDelete,
}: Props) => {
  const treeData: TaskTreeRow[] = data.map((segment) => ({
    key: `segment-${segment.id}`,
    nodeType: "segment",
    id: segment.id,
    name: segment.name,
    status: segment.status ?? null,
    dueDate: segment.dueDate ?? null,
    owner: segment.owner ?? null,
    children: (segment.projectTasks ?? []).map((task) => ({
      key: `task-${task.id}`,
      nodeType: "task",
      id: task.id,
      name: task.name,
      status: task.status ?? null,
      dueDate: task.dueDate ?? null,
      segmentId: segment.id,
      segmentName: segment.name,
      owner: task.owner ?? null,
    })),
  }));

  const columns: ColumnsType<TaskTreeRow> = [
    {
      title: "项目环节 / 任务",
      dataIndex: "name",
      width: "35%",
      render: (value: string, record) =>
        record.nodeType === "segment" ? <strong>{value}</strong> : value,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: "12%",
      render: (value: string | null | undefined) => value ?? "-",
    },
    {
      title: "负责人",
      dataIndex: ["owner", "name"],
      width: "14%",
      render: (_value, record) => record.owner?.name ?? "-",
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: "19%",
      sorter: (a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""),
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
    {
      title: "操作",
      width: "20%",
      render: (_value, record) =>
        record.nodeType === "task" ? (
          <TableActions
            onEdit={() =>
              onEdit({
                id: record.id,
                name: record.name,
                status: record.status,
                dueDate: record.dueDate,
                segmentId: record.segmentId as string,
                segmentName: record.segmentName as string,
                owner: record.owner ?? null,
              })
            }
            onDelete={() =>
              onDelete({
                id: record.id,
                name: record.name,
                status: record.status,
                dueDate: record.dueDate,
                segmentId: record.segmentId as string,
                segmentName: record.segmentName as string,
                owner: record.owner ?? null,
              })
            }
            deleteTitle={`确定删除任务「${record.name}」？`}
          />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="text"
              color="primary"
              icon={<PlusOutlined />}
              onClick={() => onAddTask({ id: record.id, name: record.name })}
            >
              添加任务
            </Button>
            <TableActions
              onEdit={() =>
                onEditSegment({
                  id: record.id,
                  name: record.name,
                  status: record.status,
                  dueDate: record.dueDate,
                  owner: record.owner ?? null,
                })
              }
              onDelete={() =>
                onDeleteSegment({
                  id: record.id,
                  name: record.name,
                })
              }
              deleteTitle={`确定删除环节「${record.name}」？`}
            />
          </div>
        ),
    },
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={treeData}
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: "暂无任务" }}
      expandable={{
        defaultExpandAllRows: true,
      }}
    />
  );
};

export default ProjectTasksTable;
