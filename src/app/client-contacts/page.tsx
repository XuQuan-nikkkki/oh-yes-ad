"use client";

import { useEffect, useState } from "react";
import ContactFormModal from "@/components/ContactFormModal";
import ClientContactTable from "@/components/ClientContactTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import ListPageContainer from "@/components/ListPageContainer";
import CreateButton from "@/components/actions/CreateButton";
import { useClientContactsStore } from "@/stores/clientContactsStore";
import type { ClientContact } from "@/types/clientContact";

const ClientContactsPage = () => {
  const contacts = useClientContactsStore((state) => state.contacts);
  const loading = useClientContactsStore((state) => state.loading);
  const fetchContactsFromStore = useClientContactsStore((state) => state.fetchContacts);
  const upsertContacts = useClientContactsStore((state) => state.upsertContacts);
  const removeContact = useClientContactsStore((state) => state.removeContact);
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const { canManageCrm } = useCrmPermission();

  useEffect(() => {
    void fetchContactsFromStore();
  }, [fetchContactsFromStore]);

  const handleDelete = async (id: string) => {
    if (!canManageCrm) return;
    const res = await fetch(`/api/client-contacts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    removeContact(id);
  };

  return (
    <ListPageContainer>
      <ClientContactTable
        headerTitle={<ProTableHeaderTitle>客户人员管理</ProTableHeaderTitle>}
        toolbarActions={[
          <CreateButton
            key="create-contact"
            disabled={!canManageCrm}
            onClick={() => {
              setEditingContact(null);
              setOpen(true);
            }}
            btnText="新建人员"
          />,
        ]}
        enableColumnSetting
        columnsStatePersistenceKey="client-contacts-table-columns-state"
        contacts={contacts}
        loading={loading}
        actionsDisabled={!canManageCrm}
        onEdit={(record) => {
          setEditingContact({
            ...record,
            clientId: record.client?.id ?? "",
          });
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
          if (savedContact?.id) {
            upsertContacts([savedContact as ClientContact]);
            return;
          }
          if (isCreate) return;
          await fetchContactsFromStore(true);
        }}
      />
    </ListPageContainer>
  );
};

export default ClientContactsPage;
