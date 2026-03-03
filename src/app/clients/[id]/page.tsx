"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Descriptions, Button } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import ClientFormModal from "@/components/ClientFormModal";
import ClientContactTable from "@/components/ClientContactTable";
import ContactFormModal from "@/components/ContactFormModal";
import ProjectsTable, { Project } from "@/components/ProjectsTable";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    setClient(data);
    setLoading(false);
  }, [clientId]);

  const fetchContacts = useCallback(async () => {
    if (!clientId) return;

    try {
      setContactLoading(true);

      const res = await fetch(`/api/client-contacts?clientId=${clientId}`);
      const data = await res.json();
      setContacts(data);
    } finally {
      setContactLoading(false);
    }
  }, [clientId]);

  const fetchProjects = useCallback(async () => {
    if (!clientId) return;

    try {
      setProjectLoading(true);
      const res = await fetch(`/api/projects?clientId=${clientId}`);
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setProjectLoading(false);
    }
  }, [clientId]);

  const handleDeleteContact = async (id: string) => {
    await fetch(`/api/client-contacts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await fetchContacts();
  };

  const handleEditContact = (record: Contact) => {
    setEditingContact(record);
    setContactModalOpen(true);
  };

  const handleCreateContact = () => {
    setEditingContact(null);
    setContactModalOpen(true);
  };

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      await fetchClient();
      await fetchContacts();
      await fetchProjects();
    })();
  }, [clientId, fetchClient, fetchContacts, fetchProjects]);

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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateContact}
          >
            新建人员
          </Button>
        }
      >
        <ClientContactTable
          contacts={contacts}
          loading={contactLoading}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
        />{" "}
      </Card>

      <Card title="合作项目">
        <ProjectsTable
          projects={projects}
          loading={projectLoading}
          columnKeys={["name", "status", "startDate", "endDate"]}
        />
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

      <ContactFormModal
        open={contactModalOpen}
        clientId={clientId}
        clientEditable={false}
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
    </Space>
  );
};

export default ClientDetailPage;
