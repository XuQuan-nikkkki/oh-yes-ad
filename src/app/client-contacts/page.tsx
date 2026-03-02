"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ContactFormModal from "@/components/ContactFormModal";
import ClientContactTable from "@/components/ClientContactTable";

type Contact = {
  id: string;
  name: string;
  title?: string | null;
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
    await fetch("/api/client-contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchContacts();
  };

  return (
    <Card
      title={<h3>客户人员管理</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingContact(null);
            setOpen(true);
          }}
        >
          新建人员
        </Button>
      }
    >
      <ClientContactTable
        contacts={contacts}
        loading={loading}
        onEdit={(record) => {
          setEditingContact(record);
          setOpen(true);
        }}
        onDelete={handleDelete}
        showClientColumn
      />
      <ContactFormModal
        open={open}
        clientEditable={true}
        initialValues={editingContact}
        onCancel={() => {
          setOpen(false);
          setEditingContact(null);
        }}
        onSuccess={async () => {
          setOpen(false);
          setEditingContact(null);
          await fetchContacts();
        }}
      />
    </Card>
  );
};

export default ClientContactsPage;
