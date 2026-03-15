"use client";

import { useState } from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";

export type Client = {
  id: string;
  name: string;
  industryOptionId: string;
  industryOption?: {
    id: string;
    field: string;
    value: string;
    color?: string | null;
    order?: number | null;
  } | null;
  remark?: string | null;
};

type Props = {
  clients: Client[];
  loading?: boolean;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
};

const ClientTable = ({ clients, loading = false, onEdit, onDelete }: Props) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const industryOptions = Array.from(
    new Set(clients.map((c) => c.industryOption?.value).filter(Boolean)),
  ) as string[];

  const columns: ColumnsType<Client> = [
    {
      title: "名称",
      dataIndex: "name",
      ellipsis: true,
      filters: clients.map((c) => ({
        text: c.name,
        value: c.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(String(value)),
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string, record) => (
        <AppLink href={`/clients/${record.id}`}>{value}</AppLink>
      ),
    },
    {
      title: "行业",
      dataIndex: ["industryOption", "value"],
      filters: industryOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record) =>
        (record.industryOption?.value ?? "-") === value,
      sorter: (a, b) =>
        (a.industryOption?.value ?? "").localeCompare(
          b.industryOption?.value ?? "",
        ),
      render: (_value: string | undefined, record) => (
        <Tag
          color={record.industryOption?.color ?? "#8c8c8c"}
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 500,
          }}
        >
          {record.industryOption?.value ?? "-"}
        </Tag>
      ),
    },
    {
      title: "备注",
      dataIndex: "remark",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "操作",
      width: 300,
      render: (_value, record) => (
        <TableActions
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
          deleteTitle="确定删除这个客户？"
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={clients}
      loading={loading}
      pagination={{
        current,
        pageSize,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        showTotal: (total) => `共 ${total} 条`,
        onChange: (nextPage, nextPageSize) => {
          setCurrent(nextPage);
          setPageSize(nextPageSize);
        },
      }}
    />
  );
};

export default ClientTable;
