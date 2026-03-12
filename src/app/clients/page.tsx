"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import ClientTable, { Client } from "@/components/ClientTable";

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
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    fetchClients();
  };

  const industryOptions = Array.from(new Set(clients.map((c) => c.industry)));

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
      <ClientTable
        clients={clients}
        loading={loading}
        onEdit={(client) => {
          setEditingClient(client);
          setOpen(true);
        }}
        onDelete={handleDelete}
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
