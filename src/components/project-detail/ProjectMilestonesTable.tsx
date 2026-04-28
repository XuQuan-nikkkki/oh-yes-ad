"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import TableActions from "@/components/TableActions";
import TimeRangeValue from "@/components/TimeRangeValue";

type Participant = {
  id: string;
  name: string;
};

export type ProjectMilestoneRow = {
  id: string;
  name: string;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
  type?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME" | null;
  date?: string | null;
  location?: string | null;
  detail?: string | null;
  method?: string | null;
  internalParticipants?: Participant[];
  clientParticipants?: Participant[];
  vendorParticipants?: Participant[];
};

type Props = {
  data: ProjectMilestoneRow[];
  onEdit: (record: ProjectMilestoneRow) => void;
  onDelete: (record: ProjectMilestoneRow) => void;
  columnKeys?: ColumnKey[];
};

type ColumnKey =
  | "name"
  | "type"
  | "date"
  | "internalParticipants"
  | "clientParticipants"
  | "vendorParticipants"
  | "location"
  | "method"
  | "actions";

const ProjectMilestonesTable = ({
  data,
  onEdit,
  onDelete,
  columnKeys = [
    "name",
    "type",
    "date",
    "internalParticipants",
    "clientParticipants",
    "vendorParticipants",
    "location",
    "method",
    "actions",
  ],
}: Props) => {
  const allColumns: Record<ColumnKey, ColumnsType<ProjectMilestoneRow>[number]> = {
    name: {
      title: "里程碑名称",
      dataIndex: "name",
      width: "15%",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    type: {
      title: "类型",
      dataIndex: "type",
      width: "10%",
      render: (value: string | null | undefined) =>
        value || "-",
    },
    date: {
      title: "截止日期",
      dataIndex: "date",
      width: "12%",
      sorter: (a, b) =>
        (a.startAt ?? a.date ?? "").localeCompare(b.startAt ?? b.date ?? ""),
      render: (_value, record) => (
        <TimeRangeValue
          start={record.startAt ?? record.date}
          end={record.endAt}
          datePrecision={record.datePrecision}
        />
      ),
    },
    internalParticipants: {
      title: "内部参与人员",
      dataIndex: "internalParticipants",
      width: "13%",
      render: (participants: Participant[] | undefined) =>
        participants && participants.length > 0
          ? participants.map((p) => p.name).join(", ")
          : "-",
    },
    clientParticipants: {
      title: "客户参与人员",
      dataIndex: "clientParticipants",
      width: "13%",
      render: (participants: Participant[] | undefined) =>
        participants && participants.length > 0
          ? participants.map((p) => p.name).join(", ")
          : "-",
    },
    vendorParticipants: {
      title: "供应商",
      dataIndex: "vendorParticipants",
      width: "9%",
      render: (vendors: Participant[] | undefined) =>
        vendors && vendors.length > 0
          ? vendors.map((v) => v.name).join(", ")
          : "-",
    },
    location: {
      title: "地点",
      dataIndex: "location",
      width: "12%",
      render: (value: string | null | undefined) => value ?? "-",
    },
    method: {
      title: "方式",
      dataIndex: "method",
      width: "10%",
      render: (value: string | null | undefined) =>
        value || "-",
    },
    actions: {
      title: "操作",
      render: (_value, record) => (
        <TableActions
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record)}
          deleteTitle={`确定删除里程碑「${record.name}」？`}
        />
      ),
    },
  };
  const columns: ColumnsType<ProjectMilestoneRow> = columnKeys.map(
    (key) => allColumns[key],
  );

  return (
    <Table tableLayout="auto"
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
