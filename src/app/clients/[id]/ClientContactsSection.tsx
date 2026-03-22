"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ClientContactTable from "@/components/ClientContactTable";
import ContactFormModal from "@/components/ContactFormModal";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import type { SimpleClient } from "@/types/client";

type Contact = {
  id: string;
  name: string;
  order?: number;
  clientId?: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  client?: {
    id: string;
    name: string;
  };
};

interface ClientContactsSectionProps {
  clientId: string;
  client: SimpleClient | null;
}

const ClientContactsSection = ({
  clientId,
  client,
}: ClientContactsSectionProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSorting, setContactSorting] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageCrm } = useCrmPermission();

  const fetchContacts = useCallback(async () => {
    if (!clientId) return;

    try {
      setContactLoading(true);

      const res = await fetch(`/api/clients/${clientId}/contacts`);
      const data = await res.json();
      setContacts(data);
    } finally {
      setContactLoading(false);
    }
  }, [clientId]);

  const handleDeleteContact = async (id: string) => {
    if (!canManageCrm) return;
    await fetch(`/api/client-contacts/${id}`, {
      method: "DELETE",
    });

    await fetchContacts();
  };

  const handleEditContact = (record: Contact) => {
    if (!canManageCrm) return;
    setEditingContact(record);
    setContactModalOpen(true);
  };

  const handleCreateContact = () => {
    if (!canManageCrm) return;
    setEditingContact(null);
    setContactModalOpen(true);
  };

  const handleDragSortContacts = async (
    _beforeIndex: number,
    afterIndex: number,
    newDataSource: Contact[],
  ) => {
    if (contactSorting) return;
    const moved = newDataSource[afterIndex];
    if (!moved?.id) return;

    const previousContacts = contacts;
    setContacts(newDataSource);
    setContactSorting(true);

    const res = await fetch(`/api/clients/${clientId}/contacts/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movedId: moved.id,
        orderedIds: newDataSource.map((item) => item.id),
      }),
    });

    if (!res.ok) {
      setContacts(previousContacts);
      setContactSorting(false);
      messageApi.error("排序失败，已恢复原顺序");
      await fetchContacts();
      return;
    }

    setContactSorting(false);
    void fetchContacts();
  };

  useEffect(() => {
    if (!clientId) return;
    fetchContacts();
  }, [clientId, fetchContacts]);

  return (
    <>
      {contextHolder}
      <Card styles={{ body: { padding: 2 } }}>
        <ClientContactTable
          headerTitle={<h4 style={{ margin: 0 }}>客户人员</h4>}
          toolbarActions={[
            <Button
              key="create-contact"
              type="primary"
              icon={<PlusOutlined />}
              disabled={!canManageCrm}
              onClick={handleCreateContact}
            >
              新建人员
            </Button>,
          ]}
          enableColumnSetting
          columnsStatePersistenceKey="client-detail-contacts-table-columns-state"
          onDragSortEnd={handleDragSortContacts}
          contacts={contacts}
          loading={contactLoading || contactSorting}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
          actionsDisabled={!canManageCrm}
          columnKeys={[
            "name",
            "title",
            "scope",
            "preference",
            "phone",
            "email",
            "wechat",
            "address",
            "actions",
          ]}
          defaultVisibleColumnKeys={["name", "title", "scope", "actions"]}
          pagination={false}
        />
      </Card>

      <ContactFormModal
        open={contactModalOpen}
        clientId={clientId}
        clientEditable={false}
        clientOptions={client ? [{ id: client.id, name: client.name }] : []}
        initialValues={editingContact}
        onCancel={() => {
          setContactModalOpen(false);
          setEditingContact(null);
        }}
        onSuccess={async () => {
          setContactModalOpen(false);
          setEditingContact(null);
          await fetchContacts();
        }}
      />
    </>
  );
};

export default ClientContactsSection;
