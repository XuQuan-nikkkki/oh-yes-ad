"use client";

import { useState } from "react";
import ClientFormModal from "@/components/ClientFormModal";
import ClientTable, { Client } from "@/components/ClientTable";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useFetch } from "@/hooks/useFetch";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import CreateButton from "@/components/actions/CreateButton";
import ListPageContainer from "@/components/ListPageContainer";

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
  const { canManageCrm } = useCrmPermission();
  const { data, loading, refetch } = useFetch<Client>("/api/clients");
  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_OPTIONS,
  );
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );

  const handleDelete = async (id: string) => {
    if (!canManageCrm) return;
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    refetch();
  };

  const renderCreateClientBtn = () => (
    <CreateButton
      key="create-client"
      disabled={!canManageCrm}
      onClick={() => {
        setEditingClient(null);
        setOpen(true);
      }}
      btnText="新建客户"
    />
  );

  const onReset = () => {
    setOpen(false);
    setEditingClient(null);
  };

  return (
    <ListPageContainer>
      <ClientTable
        headerTitle={<h3 style={{ margin: 0 }}>客户管理</h3>}
        toolbarActions={[renderCreateClientBtn()]}
        clients={data}
        loading={loading}
        actionsDisabled={!canManageCrm}
        onEdit={(client) => {
          setEditingClient(client);
          setOpen(true);
        }}
        onDelete={handleDelete}
        onIndustryOptionUpdated={async () => {
          await refetch();
          await fetchAllOptions(true);
        }}
      />
      <ClientFormModal
        open={open}
        initialValues={editingClient}
        onCancel={onReset}
        onSuccess={async () => {
          onReset();
          await refetch();
        }}
        industryOptions={industryOptions}
      />
    </ListPageContainer>
  );
};

export default ClientsPage;
