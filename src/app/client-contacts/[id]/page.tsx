// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Popconfirm, Space, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import ContactFormModal from "@/components/ContactFormModal";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type Contact = {
  id: string;
  name: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  clientId: string;
  client?: {
    id: string;
    name: string;
  } | null;
};

const ClientContactDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { canManageCrm } = useCrmPermission();

  const fetchContact = useCallback(async () => {
    if (!contactId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/client-contacts/${contactId}`);
      const data = await res.json();
      setContact(data);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void fetchContact();
  }, [fetchContact]);

  const handleDelete = async () => {
    if (!contactId) return;
    if (!canManageCrm) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/client-contacts/${contactId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      message.success("删除成功");
      router.push("/client-contacts");
    } catch (error) {
      console.error("删除客户人员失败:", error);
      message.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      <Card
        title={contact?.name || "客户人员详情"}
        loading={loading}
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => setModalOpen(true)}
              disabled={!canManageCrm}
            >
              编辑
            </Button>
            <Popconfirm
              title={`确定删除客户人员「${contact?.name ?? ""}」？`}
              okText="删除"
              cancelText="取消"
              onConfirm={handleDelete}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger loading={deleting} disabled={!canManageCrm}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        {contact && (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="所属客户">
              {contact.client ? (
                <AppLink href={`/clients/${contact.client.id}`}>
                  {contact.client.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="职位">
              {contact.title ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="职责范围">
              {contact.scope ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="偏好">
              {contact.preference ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="联系方式" loading={loading}>
        {contact && (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="电话">
              {contact.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {contact.email ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="微信">
              {contact.wechat ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {contact.address ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <ContactFormModal
        open={modalOpen}
        clientEditable={true}
        initialValues={contact}
        onCancel={() => setModalOpen(false)}
        onSuccess={async () => {
          setModalOpen(false);
          await fetchContact();
        }}
      />
    </Space>
  );
};

export default ClientContactDetailPage;
