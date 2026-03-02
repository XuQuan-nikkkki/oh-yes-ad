"use client";

import { useEffect, useState } from "react";
import { Table, Button, Space, Card, Popconfirm, Tag, Typography } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import Link from "next/link";

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
      render: (value: string, record: Client) => (
        <Link href={`/clients/${record.id}`} style={{ color: "#1677ff" }}>{value}</Link>
      ),
    },
    {
      title: "行业",
      dataIndex: "industry",
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
      render: (_: any, record: Client) => (
        <Space size={12}>
          <Button
            variant="text"
            color="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingClient(record);
              setOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除这个客户？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button variant="text" color="danger" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
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
      />
    </Card>
  );
};

export default ClientsPage;
