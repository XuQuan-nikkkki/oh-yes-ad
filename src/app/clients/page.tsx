"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  Popconfirm,
  Tag,
  Select,
  Typography,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const industryOptions = Array.from(
    new Set(clients.map((c) => c.industry).filter(Boolean)),
  );

  const fetchClients = async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    if (editingId) {
      await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...values,
          industry: Array.isArray(values.industry)
            ? values.industry[0]
            : values.industry,
        }),
      });
    } else {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          industry: Array.isArray(values.industry)
            ? values.industry[0]
            : values.industry,
        }),
      });
    }

    form.resetFields();
    setEditingId(null);
    setOpen(false);
    await fetchClients();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchClients();
  };

  const handleEdit = (record: Client) => {
    form.setFieldsValue(record);
    setEditingId(record.id);
    setOpen(true);
  };

  useEffect(() => {
    (async () => {
      await fetchClients();
    })();
  }, []);

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      width: 300,
      ellipsis: true,
      filters: clients.map((c) => ({ text: c.name, value: c.name })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(value as string),
      render: (value: string, record: Client) => (
        <Typography.Link href={`/clients/${record.id}`}>
          {value}
        </Typography.Link>
      ),
    },
    {
      title: "行业",
      dataIndex: "industry",
      filters: industryOptions.map((item) => ({ text: item, value: item })),
      onFilter: (value, record) => record.industry === value,
      defaultSortOrder: "descend",
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
        <Space size={12}>
          <Button
            variant="text"
            color="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
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
      style={{ width: "100%" }}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            borderRadius: 8,
            padding: "0 18px",
          }}
          onClick={() => {
            form.resetFields();
            setEditingId(null);
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
        bordered={false}
        size="middle"
      />

      <Modal
        title={editingId ? "编辑客户" : "新建客户"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="行业"
            name="industry"
            rules={[{ required: true, message: "请输入行业" }]}
          >
            <Select
              mode="tags"
              maxCount={1}
              placeholder="选择或输入行业"
              options={industryOptions.map((item) => ({
                label: item,
                value: item,
              }))}
            />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            保存
          </Button>
        </Form>
      </Modal>
    </Card>
  );
};

export default ClientsPage;
