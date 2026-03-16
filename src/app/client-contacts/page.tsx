// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ContactFormModal from "@/components/ContactFormModal";
import ClientContactTable from "@/components/ClientContactTable";
import { useCrmPermission } from "@/hooks/useCrmPermission";

type Contact = {
  id: string;
  name: string;
  clientId?: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  client: {
    id: string;
    name: string;
  };
};

const ClientContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { canManageCrm } = useCrmPermission();

  const fetchContacts = async () => {
    setLoading(true);
    const res = await fetch("/api/client-contacts");
    const data = await res.json();
    setContacts(data);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fetchContacts();
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!canManageCrm) return;
    await fetch(`/api/client-contacts/${id}`, {
      method: "DELETE",
    });

    fetchContacts();
  };

  return (
    <Card styles={{ body: { padding: 12 } }}>
      <ClientContactTable
        headerTitle={<h3 style={{ margin: 0 }}>客户人员管理</h3>}
        toolbarActions={[
          <Button
            key="create-contact"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageCrm}
            onClick={() => {
              setEditingContact(null);
              setOpen(true);
            }}
          >
            新建人员
          </Button>,
        ]}
        enableColumnSetting
        columnsStatePersistenceKey="client-contacts-table-columns-state"
        contacts={contacts}
        loading={loading}
        actionsDisabled={!canManageCrm}
        onEdit={(record) => {
          setEditingContact(record);
          setOpen(true);
        }}
        onDelete={handleDelete}
        defaultVisibleColumnKeys={[
          "name",
          "client",
          "title",
          "scope",
          "actions",
        ]}
      />
      <ContactFormModal
        open={open}
        clientEditable={true}
        initialValues={editingContact}
        onCancel={() => {
          setOpen(false);
          setEditingContact(null);
        }}
        onSuccess={async (savedContact) => {
          setOpen(false);
          const isCreate = !editingContact;
          setEditingContact(null);
          if (isCreate && savedContact?.id) {
            setContacts((prev) => [savedContact as Contact, ...prev]);
            return;
          }
          await fetchContacts();
        }}
      />
    </Card>
  );
};

export default ClientContactsPage;
