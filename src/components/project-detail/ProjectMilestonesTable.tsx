"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import TableActions from "@/components/TableActions";

type Participant = {
  id: string;
  name: string;
};

export type ProjectMilestoneRow = {
  id: string;
  name: string;
  type?: string | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  internalParticipants?: Participant[];
  clientParticipants?: Participant[];
  vendorParticipants?: Participant[];
};

type Props = {
  data: ProjectMilestoneRow[];
  onEdit: (record: ProjectMilestoneRow) => void;
  onDelete: (record: ProjectMilestoneRow) => void;
};

const ProjectMilestonesTable = ({ data, onEdit, onDelete }: Props) => {
  const columns: ColumnsType<ProjectMilestoneRow> = [
    {
      title: "里程碑名称",
      dataIndex: "name",
      width: "15%",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "类型",
      dataIndex: "type",
      width: "10%",
      render: (value: string | null | undefined) => value ?? "-",
    },
    {
      title: "截止日期",
      dataIndex: "date",
      width: "12%",
      sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
      render: (value: string | null | undefined) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
    },
    {
      title: "内部参与人员",
      dataIndex: "internalParticipants",
      width: "13%",
      render: (participants: Participant[] | undefined) =>
        participants && participants.length > 0
          ? participants.map((p) => p.name).join(", ")
          : "-",
    },
    {
      title: "客户参与人员",
      dataIndex: "clientParticipants",
      width: "13%",
      render: (participants: Participant[] | undefined) =>
        participants && participants.length > 0
          ? participants.map((p) => p.name).join(", ")
          : "-",
    },
    {
      title: "供应商",
      dataIndex: "vendorParticipants",
      width: "9%",
      render: (vendors: Participant[] | undefined) =>
        vendors && vendors.length > 0
          ? vendors.map((v) => v.name).join(", ")
          : "-",
    },
    {
      title: "地点",
      dataIndex: "location",
      width: "12%",
      render: (value: string | null | undefined) => value ?? "-",
    },
    {
      title: "方式",
      dataIndex: "method",
      width: "10%",
      render: (value: string | null | undefined) => value ?? "-",
    },
    {
      title: "操作",
      width: 160,
      render: (_value, record) => (
        <TableActions
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record)}
          deleteTitle={`确定删除里程碑「${record.name}」？`}
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: "暂无里程碑" }}
      scroll={{ x: 1700 }}
    />
  );
};

export default ProjectMilestonesTable;
