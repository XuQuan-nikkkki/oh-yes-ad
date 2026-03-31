"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Collapse, Empty, Radio, Space, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ContactFormModal from "@/components/ContactFormModal";
import ClientContactTable from "@/components/ClientContactTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import ListPageContainer from "@/components/ListPageContainer";
import CreateButton from "@/components/actions/CreateButton";
import { useClientsStore } from "@/stores/clientsStore";
import { useClientContactsStore } from "@/stores/clientContactsStore";
import type { ClientContact } from "@/types/clientContact";

const ClientContactsPage = () => {
  const contacts = useClientContactsStore((state) => state.contacts);
  const loading = useClientContactsStore((state) => state.loading);
  const fetchContactsFromStore = useClientContactsStore((state) => state.fetchContacts);
  const upsertContacts = useClientContactsStore((state) => state.upsertContacts);
  const removeContact = useClientContactsStore((state) => state.removeContact);
  const clients = useClientsStore((state) => state.clients);
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [creatingClientId, setCreatingClientId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const { canManageCrm } = useCrmPermission();

  useEffect(() => {
    void fetchContactsFromStore();
    void fetchClientsFromStore();
  }, [fetchClientsFromStore, fetchContactsFromStore]);

  const handleDelete = async (id: string) => {
    if (!canManageCrm) return;
    const res = await fetch(`/api/client-contacts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    removeContact(id);
  };

  const toolbarNode = [
    <Space key="group-toggle" size={8}>
      <Radio.Group
        value={viewMode}
        onChange={(event) => {
          setViewMode(event.target.value as "flat" | "grouped");
        }}
        optionType="button"
        buttonStyle="solid"
        options={[
          { label: "平铺视图", value: "flat" },
          { label: "客户分组视图", value: "grouped" },
        ]}
      />
    </Space>,
    ...(viewMode === "flat"
      ? [
          <CreateButton
            key="create-contact"
            disabled={!canManageCrm}
            onClick={() => {
              setCreatingClientId(undefined);
              setEditingContact(null);
              setOpen(true);
            }}
            btnText="新建人员"
          />,
        ]
      : []),
  ];

  const clientMetaMap = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        industryValue?: string | null;
        industryColor?: string | null;
      }
    >();

    for (const client of clients) {
      if (!client?.id || !client?.name) continue;
      map.set(client.id, {
        name: client.name,
        industryValue:
          client.industryOption && typeof client.industryOption === "object"
            ? (client.industryOption.value ?? null)
            : null,
        industryColor:
          client.industryOption && typeof client.industryOption === "object"
            ? (client.industryOption.color ?? null)
            : null,
      });
    }

    for (const contact of contacts) {
      const relatedClients = contact.clients ?? (contact.client ? [contact.client] : []);
      for (const client of relatedClients) {
        if (!client?.id || !client?.name || map.has(client.id)) continue;
        map.set(client.id, {
          name: client.name,
          industryValue: null,
          industryColor: null,
        });
      }
    }

    return map;
  }, [clients, contacts]);

  const groupedContacts = useMemo(() => {
    const groups = new Map<string, { clientId: string; contacts: ClientContact[] }>();

    for (const contact of contacts) {
      const relatedClients = contact.clients ?? (contact.client ? [contact.client] : []);
      for (const client of relatedClients) {
        if (!client?.id) continue;
        const current = groups.get(client.id);
        if (current) {
          current.contacts.push(contact);
        } else {
          groups.set(client.id, {
            clientId: client.id,
            contacts: [contact],
          });
        }
      }
    }

    return Array.from(groups.values())
      .sort((left, right) => {
        const leftName = clientMetaMap.get(left.clientId)?.name ?? "";
        const rightName = clientMetaMap.get(right.clientId)?.name ?? "";
        return leftName.localeCompare(rightName, "zh-CN");
      })
      .map((group) => ({
        ...group,
        contacts: group.contacts.slice().sort((left, right) =>
          left.name.localeCompare(right.name, "zh-CN"),
        ),
      }));
  }, [clientMetaMap, contacts]);

  return (
    <ListPageContainer>
      {viewMode === "flat" ? (
        <ClientContactTable
          headerTitle={<ProTableHeaderTitle>客户人员管理</ProTableHeaderTitle>}
          toolbarActions={toolbarNode}
          enableColumnSetting
          columnsStatePersistenceKey="client-contacts-table-columns-state"
          contacts={contacts}
          loading={loading}
          actionsDisabled={!canManageCrm}
          onEdit={(record) => {
            setCreatingClientId(undefined);
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
      ) : (
        <Card
          title={<ProTableHeaderTitle>客户人员管理</ProTableHeaderTitle>}
          extra={<Space size={12} wrap>{toolbarNode}</Space>}
        >
          {groupedContacts.length === 0 ? (
            <Empty description="暂无客户人员" />
          ) : (
            <Collapse
              items={groupedContacts.map((group) => {
                const clientMeta = clientMetaMap.get(group.clientId);
                return {
                  key: group.clientId,
                  label: (
                    <Space size={8} wrap>
                      <span>{clientMeta?.name ?? "未命名客户"}</span>
                      {clientMeta?.industryValue ? (
                        <Tag color={clientMeta.industryColor ?? undefined}>
                          {clientMeta.industryValue}
                        </Tag>
                      ) : null}
                    </Space>
                  ),
                  extra: canManageCrm ? (
                    <Button
                      size="small"
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        setCreatingClientId(group.clientId);
                        setEditingContact(null);
                        setOpen(true);
                      }}
                    >
                      新增人员
                    </Button>
                  ) : null,
                  children: (
                    <ClientContactTable
                      headerTitle={null}
                      toolbarActions={[]}
                      contacts={group.contacts}
                      loading={loading}
                      actionsDisabled={!canManageCrm}
                      onEdit={(record) => {
                        setCreatingClientId(undefined);
                        setEditingContact(record);
                        setOpen(true);
                      }}
                      onDelete={handleDelete}
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
                      defaultVisibleColumnKeys={[
                        "name",
                        "title",
                        "scope",
                        "actions",
                      ]}
                    />
                  ),
                };
              })}
            />
          )}
        </Card>
      )}
      <ContactFormModal
        open={open}
        clientId={creatingClientId}
        clientEditable={true}
        initialValues={editingContact}
        onCancel={() => {
          setOpen(false);
          setCreatingClientId(undefined);
          setEditingContact(null);
        }}
        onSuccess={async (savedContact) => {
          setOpen(false);
          const isCreate = !editingContact;
          setCreatingClientId(undefined);
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
