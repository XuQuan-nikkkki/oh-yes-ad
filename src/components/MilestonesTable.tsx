"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import { formatDate } from "@/lib/date";

export type MilestoneTableRow = {
  id: string;
  name: string;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  location?: string | null;
  methodOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type Props = {
  data: MilestoneTableRow[];
  pagination?: false | { pageSize?: number };
  emptyText?: string;
};

const MilestonesTable = ({
  data,
  pagination = { pageSize: 10 },
  emptyText = "暂无里程碑",
}: Props) => {
  const columns: ColumnsType<MilestoneTableRow> = [
    {
      title: "里程碑名称",
      dataIndex: "name",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      render: (value: string, record) => (
        <AppLink href={`/project-milestones/${record.id}`}>{value}</AppLink>
      ),
    },
    {
      title: "类型",
      dataIndex: "typeOption",
      sorter: (a, b) =>
        (a.typeOption?.value || "").localeCompare(b.typeOption?.value || ""),
      render: (option: MilestoneTableRow["typeOption"]) => (
        <SelectOptionTag
          option={
            option && option.value
              ? {
                  id: option.id ?? "",
                  value: option.value,
                  color: option.color ?? null,
                }
              : null
          }
        />
      ),
    },
    {
      title: "截止日期",
      dataIndex: "date",
      sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
      render: (value: string | null | undefined) => formatDate(value),
    },
    {
      title: "地点",
      dataIndex: "location",
      render: (value: string | null | undefined) => value || "-",
    },
    {
      title: "方式",
      dataIndex: "methodOption",
      sorter: (a, b) =>
        (a.methodOption?.value || "").localeCompare(b.methodOption?.value || ""),
      render: (option: MilestoneTableRow["methodOption"]) => (
        <SelectOptionTag
          option={
            option && option.value
              ? {
                  id: option.id ?? "",
                  value: option.value,
                  color: option.color ?? null,
                }
              : null
          }
        />
      ),
    },
  ];

  return (
    <Table
      tableLayout="auto"
      rowKey="id"
      columns={columns}
      dataSource={data}
      pagination={pagination}
      locale={{ emptyText }}
      scroll={{ x: "max-content" }}
    />
  );
};

export default MilestonesTable;
