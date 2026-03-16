// @ts-nocheck
"use client";

import { Button, Space } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import AppLink from "@/components/AppLink";
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

type Props = {
  data: ProjectTaskSegmentGroup[];
  segmentCount?: number;
  taskCount?: number;
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
  columnKeys?: ColumnKey[];
};

type ColumnKey = "name" | "status" | "owner" | "dueDate" | "actions";

const ProjectTasksTable = ({
  data,
  segmentCount,
  taskCount,
  onAddTask,
  onEditSegment,
  onDeleteSegment,
  onEdit,
  onDelete,
  columnKeys = ["name", "status", "owner", "dueDate", "actions"],
}: Props) => {
  const SEGMENT_NAME_WIDTH = 360;
  const SEGMENT_STATUS_WIDTH = 160;
  const SEGMENT_OWNER_WIDTH = 180;
  const SEGMENT_DUE_DATE_WIDTH = 180;
  const SEGMENT_ACTIONS_WIDTH = 360;
  const SEGMENT_SCROLL_X =
    SEGMENT_NAME_WIDTH +
    SEGMENT_STATUS_WIDTH +
    SEGMENT_OWNER_WIDTH +
    SEGMENT_DUE_DATE_WIDTH +
    SEGMENT_ACTIONS_WIDTH +
    80;

  const TASK_NAME_WIDTH = 360;
  const TASK_STATUS_WIDTH = 160;
  const TASK_OWNER_WIDTH = 180;
  const TASK_DUE_DATE_WIDTH = 180;
  const TASK_ACTIONS_WIDTH = 300;
  const TASK_SCROLL_X =
    TASK_NAME_WIDTH +
    TASK_STATUS_WIDTH +
    TASK_OWNER_WIDTH +
    TASK_DUE_DATE_WIDTH +
    TASK_ACTIONS_WIDTH +
    48;

  type SegmentRow = {
    id: string;
    name: string;
    status?: string | null;
    dueDate?: string | null;
    owner?: {
      id: string;
      name: string;
    } | null;
    projectTasks?: ProjectTaskSegmentGroup["projectTasks"];
  };

  const segmentRows: SegmentRow[] = data.map((segment) => ({
    id: segment.id,
    name: segment.name,
    status: segment.status ?? null,
    dueDate: segment.dueDate ?? null,
    owner: segment.owner ?? null,
    projectTasks: segment.projectTasks ?? [],
  }));

  const resolvedSegmentCount = segmentCount ?? segmentRows.length;
  const resolvedTaskCount =
    taskCount ??
    segmentRows.reduce(
      (sum, segment) => sum + (segment.projectTasks?.length ?? 0),
      0,
    );

  const allColumns: Record<ColumnKey, ProColumns<SegmentRow>> = {
    name: {
      title: `项目环节（${resolvedSegmentCount}）/任务（${resolvedTaskCount}）`,
      dataIndex: "name",
      width: SEGMENT_NAME_WIDTH,
      ellipsis: true,
      render: (value: string, record) => (
        <AppLink href={`/project-segments/${record.id}`}>
          <strong>{value}</strong>
        </AppLink>
      ),
    },
    status: {
      title: "状态",
      dataIndex: "status",
      width: SEGMENT_STATUS_WIDTH,
      render: (value: string | null | undefined) => value ?? "-",
    },
    owner: {
      title: "负责人",
      dataIndex: ["owner", "name"],
      width: SEGMENT_OWNER_WIDTH,
      render: (_value, record) => record.owner?.name ?? "-",
    },
    dueDate: {
      title: "截止日期",
      dataIndex: "dueDate",
      width: SEGMENT_DUE_DATE_WIDTH,
      sorter: (a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""),
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
    actions: {
      title: "操作",
      width: SEGMENT_ACTIONS_WIDTH,
      valueType: "option",
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="link"
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
        </Space>
      ),
    },
  };
  const columns: ProColumns<SegmentRow>[] = columnKeys.map(
    (key) => allColumns[key],
  );

  const taskColumns: ProColumns<ProjectTaskRow>[] = [
    {
      title: "任务名称",
      dataIndex: "name",
      width: TASK_NAME_WIDTH,
      ellipsis: true,
      render: (_value, row) => (
        <AppLink href={`/project-tasks/${row.id}`}>{row.name}</AppLink>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: TASK_STATUS_WIDTH,
      render: (value: string | null | undefined) => value ?? "-",
    },
    {
      title: "负责人",
      key: "owner",
      width: TASK_OWNER_WIDTH,
      render: (_value, row) =>
        row.owner ? <AppLink href={`/employees/${row.owner.id}`}>{row.owner.name}</AppLink> : "-",
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: TASK_DUE_DATE_WIDTH,
      sorter: (a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""),
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
    {
      title: "操作",
      key: "actions",
      width: TASK_ACTIONS_WIDTH,
      valueType: "option",
      render: (_value, row) => (
        <TableActions
          onEdit={() => onEdit(row)}
          onDelete={() => onDelete(row)}
          deleteTitle={`确定删除任务「${row.name}」？`}
        />
      ),
    },
  ];

  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
      <ProTable<SegmentRow>
        rowKey="id"
        columns={columns}
        dataSource={segmentRows}
        search={false}
        options={false}
        pagination={{ pageSize: 10 }}
        tableLayout="fixed"
        scroll={{ x: SEGMENT_SCROLL_X }}
        style={{ width: "100%", maxWidth: "100%" }}
        locale={{ emptyText: "暂无任务" }}
        expandable={{
          defaultExpandAllRows: true,
          expandedRowRender: (segment) => {
            const tasks: ProjectTaskRow[] = (segment.projectTasks ?? []).map(
              (task) => ({
                id: task.id,
                name: task.name,
                status: task.status ?? null,
                dueDate: task.dueDate ?? null,
                segmentId: segment.id,
                segmentName: segment.name,
                owner: task.owner ?? null,
              }),
            );

            return (
              <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
                <ProTable<ProjectTaskRow>
                  rowKey="id"
                  columns={taskColumns}
                  dataSource={tasks}
                  search={false}
                  options={false}
                  pagination={false}
                  tableLayout="fixed"
                  scroll={{ x: TASK_SCROLL_X }}
                  style={{ width: "100%", maxWidth: "100%" }}
                  locale={{ emptyText: "暂无任务" }}
                />
              </div>
            );
          },
        }}
      />
    </div>
  );
};

export default ProjectTasksTable;
