"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";

export type Client = {
  id: string;
  name: string;
  industry: string;
  remark?: string | null;
};

type Props = {
  clients: Client[];
  loading?: boolean;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
};

const ClientTable = ({ clients, loading = false, onEdit, onDelete }: Props) => {
  const industryOptions = Array.from(new Set(clients.map((c) => c.industry)));

  const columns: ColumnsType<Client> = [
    {
      title: "名称",
      dataIndex: "name",
      width: 160,
      ellipsis: true,
      filters: clients.map((c) => ({
        text: c.name,
        value: c.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(String(value)),
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string, record) => (
        <AppLink href={`/clients/${record.id}`}>
          {value}
        </AppLink>
      ),
    },
    {
      title: "行业",
      dataIndex: "industry",
      filters: industryOptions.map((item) => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record) => record.industry === value,
      sorter: (a, b) => a.industry.localeCompare(b.industry),
      render: (value: string) => (
        <Tag
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 500,
          }}
        >
          {value}
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
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ClientTable;
