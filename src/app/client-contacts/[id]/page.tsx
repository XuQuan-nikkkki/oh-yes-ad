"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Descriptions, message } from "antd";
import { useParams, useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import ContactFormModal from "@/components/ContactFormModal";
import DetailPageContainer from "@/components/DetailPageContainer";
import TableActions from "@/components/TableActions";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { useClientContactsStore } from "@/stores/clientContactsStore";
import type { ClientContact as Contact } from "@/types/clientContact";

const ClientContactDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const cachedContact = useClientContactsStore((state) => state.byId[contactId]);
  const upsertContacts = useClientContactsStore((state) => state.upsertContacts);
  const removeContact = useClientContactsStore((state) => state.removeContact);
  const initialCachedContactRef = useRef<Contact | null>(
    (cachedContact as Contact | undefined) ?? null,
  );

  const [contact, setContact] = useState<Contact | null>(
    initialCachedContactRef.current,
  );
  const [loading, setLoading] = useState(!initialCachedContactRef.current);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();

  const fetchContact = useCallback(async (showLoading = false) => {
    if (!contactId) return;

    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/client-contacts/${contactId}`);
      if (!res.ok) {
        setContact(null);
        return;
      }
      const data = await res.json();
      setContact(data);
      if (data?.id) {
        upsertContacts([data]);
      }
      return data as Contact;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
    return null;
  }, [contactId, upsertContacts]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const initialContact = initialCachedContactRef.current;
      setContact(initialContact);
      setLoading(!initialContact);

      const latest = await fetchContact(!initialContact);
      if (cancelled || !latest) return;

      setContact(latest);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [contactId, fetchContact]);

  useEffect(() => {
    if (cachedContact) {
      setContact(cachedContact as Contact);
    }
  }, [cachedContact]);

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

      removeContact(contactId);
      messageApi.success("删除成功");
      router.push("/client-contacts");
    } catch (error) {
      console.error("删除客户人员失败:", error);
      messageApi.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const displayContact = contact ?? ((cachedContact as Contact | undefined) ?? null);

  if (loading && !displayContact) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="客户人员详情" loading />
      </DetailPageContainer>
    );
  }

  if (!displayContact) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="客户人员详情">客户人员不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={displayContact.name || "客户人员详情"}
        extra={
          <TableActions
            onEdit={() => setModalOpen(true)}
            onDelete={handleDelete}
            disabled={!canManageCrm}
            deleteLoading={deleting}
            deleteTitle={`确定删除客户人员「${displayContact?.name ?? ""}」？`}
            disableTextVairant
          />
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="所属客户">
            {(displayContact.clients ?? []).length > 0
              ? (displayContact.clients ?? []).map((client, index) => (
                  <span key={client.id}>
                    {index > 0 ? "、" : ""}
                    <AppLink href={`/clients/${client.id}`}>{client.name}</AppLink>
                  </span>
                ))
              : displayContact.client
                ? (
                    <AppLink href={`/clients/${displayContact.client.id}`}>
                      {displayContact.client.name}
                    </AppLink>
                  )
                : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="职位">
            {displayContact.title ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="职责范围">
            {displayContact.scope ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="偏好">
            {displayContact.preference ?? "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="联系方式">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="电话">
            {displayContact.phone ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {displayContact.email ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="微信">
            {displayContact.wechat ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="地址">
            {displayContact.address ?? "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <ContactFormModal
        open={modalOpen}
        clientEditable={true}
        initialValues={displayContact}
        onCancel={() => setModalOpen(false)}
        onSuccess={async () => {
          setModalOpen(false);
          await fetchContact(false);
        }}
      />
    </DetailPageContainer>
  );
};

export default ClientContactDetailPage;
