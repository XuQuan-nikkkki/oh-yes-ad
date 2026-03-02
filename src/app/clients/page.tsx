"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import Link from "next/link";
import TableActions from "@/components/TableActions";

type Client = {
  id: string;
  name: string;
  industry: string;
  remark?: string | null;
};

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const industryOptions = Array.from(new Set(clients.map((c) => c.industry)));

  const fetchClients = async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadClients = async () => {
      await fetchClients();
    };
    loadClients();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchClients();
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      width: 300,
      ellipsis: true,
      filters: clients.map((c) => ({
        text: c.name,
        value: c.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string, record: Client) => (
        <Link href={`/clients/${record.id}`} style={{ color: "#1677ff" }}>
          {value}
        </Link>
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
      render: (_: any, record: Client) => (
        <TableActions
          onEdit={() => {
            setEditingClient(record);
            setOpen(true);
          }}
          onDelete={() => handleDelete(record.id)}
          deleteTitle="确定删除这个客户？"
        />
      ),
    },
  ];

  return (
    <Card
      title={<h3>客户管理</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingClient(null);
            setOpen(true);
          }}
        >
          新建客户
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={clients}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <ClientFormModal
        open={open}
        initialValues={editingClient}
        onCancel={() => {
          setOpen(false);
          setEditingClient(null);
        }}
        onSuccess={async () => {
          setOpen(false);
          setEditingClient(null);
          await fetchClients();
        }}
        industryOptions={industryOptions}
      />
    </Card>
  );
};

export default ClientsPage;
