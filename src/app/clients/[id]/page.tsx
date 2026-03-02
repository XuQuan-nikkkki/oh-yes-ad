"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Descriptions, Table, Button } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import ClientFormModal from "@/components/ClientFormModal";

type Client = {
  id: string;
  name: string;
  industry: string;
  remark?: string | null;
};

type Contact = {
  id: string;
  name: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
};

const ClientDetailPage = () => {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    setClient(data);
    setLoading(false);
  }, [clientId]);

  const fetchContacts = useCallback(async () => {
    const res = await fetch(`/api/client-contacts?clientId=${clientId}`);
    const data = await res.json();
    setContacts(data);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      await fetchClient();
      await fetchContacts();
    })();
  }, [clientId, fetchClient, fetchContacts]);

  const contactColumns = [
    { title: "姓名", dataIndex: "name" },
    { title: "职位", dataIndex: "title" },
    { title: "电话", dataIndex: "phone" },
    { title: "邮箱", dataIndex: "email" },
  ];

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      <Card
        title="基础信息"
        loading={loading}
        extra={
          <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
            编辑
          </Button>
        }
      >
        {client && (
          <Descriptions column={3} size="small">
            <Descriptions.Item label="名称">{client.name}</Descriptions.Item>
            <Descriptions.Item label="行业">
              {client.industry}
            </Descriptions.Item>
            <Descriptions.Item label="备注">
              {client.remark ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card
        title="客户人员"
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            新建人员
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={contactColumns}
          dataSource={contacts}
          pagination={false}
        />
      </Card>

      <Card title="合作项目">
        <p>项目部分待开发</p>
      </Card>

      <ClientFormModal
        open={open}
        initialValues={client}
        onCancel={() => setOpen(false)}
        onSuccess={async () => {
          setOpen(false);
          await fetchClient();
        }}
      />
    </Space>
  );
};

export default ClientDetailPage;
