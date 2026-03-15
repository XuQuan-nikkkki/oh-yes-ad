"use client";

import { useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import ClientTable, { Client } from "@/components/ClientTable";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useFetch } from "@/hooks/useFetch";

const EMPTY_OPTIONS: {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
}[] = [];

const ClientsPage = () => {
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { data, loading, refetch } = useFetch<Client>("/api/clients");
  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_OPTIONS,
  );

  const handleDelete = async (id: string) => {
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    refetch();
  };

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
        clients={data}
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
          await refetch();
        }}
        industryOptions={industryOptions}
      />
    </Card>
  );
};

export default ClientsPage;
