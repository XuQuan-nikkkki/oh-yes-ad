"use client";

import { Button, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import TableActions from "@/components/TableActions";

export type ProjectSegmentRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  dueDate?: string | null;
  owner?: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  data: ProjectSegmentRow[];
  onAddTask: (record: ProjectSegmentRow) => void;
  onEdit: (record: ProjectSegmentRow) => void;
  onDelete: (record: ProjectSegmentRow) => void;
  columnKeys?: ColumnKey[];
};

type ColumnKey = "name" | "status" | "owner" | "dueDate" | "actions";

const ProjectSegmentsTable = ({
  data,
  onAddTask,
  onEdit,
  onDelete,
  columnKeys = ["name", "status", "owner", "dueDate", "actions"],
}: Props) => {
  const allColumns: Record<ColumnKey, ColumnsType<ProjectSegmentRow>[number]> = {
    name: {
      title: "环节名称",
      dataIndex: "name",
      width: "35%",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    status: {
      title: "状态",
      dataIndex: "status",
      width: "15%",
      render: (value: string | null | undefined) =>
        value || "-",
    },
    owner: {
      title: "负责人",
      dataIndex: ["owner", "name"],
      width: "15%",
      render: (_value, record) => record.owner?.name ?? "-",
    },
    dueDate: {
      title: "截止日期",
      dataIndex: "dueDate",
      width: "20%",
      sorter: (a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""),
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
    actions: {
      title: "操作",
      width: "15%",
      render: (_value, record) => (
        <Space size={8}>
          <Button
            variant="text"
            color="primary"
            icon={<PlusOutlined />}
            onClick={() => onAddTask(record)}
          >
            添加任务
          </Button>
          <TableActions
            onEdit={() => onEdit(record)}
            onDelete={() => onDelete(record)}
            deleteTitle={`确定删除环节「${record.name}」？`}
          />
        </Space>
      ),
    },
  };
  const columns: ColumnsType<ProjectSegmentRow> = columnKeys.map(
    (key) => allColumns[key],
  );

  return (
    <Table tableLayout="auto"
      rowKey="id"
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: "暂无环节" }}
    />
  );
};

export default ProjectSegmentsTable;
