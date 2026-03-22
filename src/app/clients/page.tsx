"use client";

import { useEffect, useState } from "react";
import ClientFormModal from "@/components/ClientFormModal";
import ClientTable, { Client } from "@/components/ClientTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useClientsStore } from "@/stores/clientsStore";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import CreateButton from "@/components/actions/CreateButton";
import ListPageContainer from "@/components/ListPageContainer";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";

const ClientsPage = () => {
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { canManageCrm } = useCrmPermission();
  const data = useClientsStore((state) => state.clients);
  const loading = useClientsStore((state) => state.loading);
  const fetchClients = useClientsStore((state) => state.fetchClients);
  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_SELECT_OPTIONS,
  );
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const normalizedClients = data.flatMap((item) => {
    if (typeof item?.id !== "string" || typeof item?.name !== "string") {
      return [];
    }
    return [
      {
        id: item.id,
        name: item.name,
        industryOptionId:
          typeof item.industryOptionId === "string"
            ? item.industryOptionId
            : "",
        industryOption: item.industryOption
          ? {
              id:
                typeof item.industryOption.id === "string"
                  ? item.industryOption.id
                  : "",
              field: "client.industry",
              value:
                typeof item.industryOption.value === "string"
                  ? item.industryOption.value
                  : "",
              color:
                typeof item.industryOption.color === "string"
                  ? item.industryOption.color
                  : null,
              order: null,
            }
          : null,
      },
    ];
  });

  const handleDelete = async (id: string) => {
    if (!canManageCrm) return;
    await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    await fetchClients(true);
  };

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

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
        headerTitle={<ProTableHeaderTitle>客户管理</ProTableHeaderTitle>}
        toolbarActions={[renderCreateClientBtn()]}
        clients={normalizedClients}
        loading={loading}
        actionsDisabled={!canManageCrm}
        onEdit={(client) => {
          setEditingClient(client);
          setOpen(true);
        }}
        onDelete={handleDelete}
        onIndustryOptionUpdated={async () => {
          await fetchClients(true);
          await fetchAllOptions(true);
        }}
      />
      <ClientFormModal
        open={open}
        initialValues={editingClient}
        onCancel={onReset}
        onSuccess={async () => {
          onReset();
          await fetchClients(true);
        }}
        industryOptions={industryOptions}
      />
    </ListPageContainer>
  );
};

export default ClientsPage;
