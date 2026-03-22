"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, Descriptions } from "antd";
import { useParams } from "next/navigation";
import ClientFormModal from "@/components/ClientFormModal";
import DetailPageContainer from "@/components/DetailPageContainer";
import SelectOptionTag from "@/components/SelectOptionTag";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useSelectOptionsByField } from "@/hooks/useSelectOptions";
import { useClientsStore } from "@/stores/clientsStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { Client } from "@/types/client";
import ClientContactsSection from "./ClientContactsSection";
import ClientProjectsSection from "./ClientProjectsSection";
import ClientDetailActions from "./ClientDetailActions";

const ClientDetailPage = () => {
  const params = useParams();
  const clientId = params.id as string;
  const cachedClient = useClientsStore((state) => state.byId[clientId]);
  const upsertClients = useClientsStore((state) => state.upsertClients);

  const [client, setClient] = useState<Client | null>(
    (cachedClient as Client | undefined) ?? null,
  );
  const [loading, setLoading] = useState(!cachedClient);
  const bootstrappedClientIdRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const { canManageProject } = useProjectPermission();
  const industryOptions = useSelectOptionsByField("client.industry");
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );

  const fetchClient = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      setClient(data);
      if (data?.id) {
        upsertClients([data]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [clientId, upsertClients]);

  useEffect(() => {
    if (!clientId) return;
    if (bootstrappedClientIdRef.current === clientId) return;
    bootstrappedClientIdRef.current = clientId;

    if (cachedClient) {
      setClient(cachedClient as Client);
      setLoading(false);
      void fetchClient(false);
      return;
    }
    setClient(null);
    void fetchClient(true);
  }, [cachedClient, clientId, fetchClient]);

  const displayClient = client ?? ((cachedClient as Client | undefined) ?? null);

  if (loading && !displayClient) {
    return (
      <DetailPageContainer>
        <Card title="客户详情" loading />
      </DetailPageContainer>
    );
  }

  if (!displayClient) {
    return (
      <DetailPageContainer>
        <Card title="客户详情">客户不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <>
      <DetailPageContainer>
        <Card
          title={displayClient.name}
          extra={
            <ClientDetailActions
              clientId={clientId}
              clientName={displayClient.name}
              onEdit={() => setOpen(true)}
            />
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="行业">
              <SelectOptionTag
                option={displayClient.industryOption}
                fallbackText="-"
                successMessage="行业标签已更新"
                onUpdated={async () => {
                  await fetchClient(false);
                  await fetchAllOptions(true);
                }}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <ClientContactsSection
          clientId={clientId}
          client={displayClient}
        />
        <ClientProjectsSection
          clientId={clientId}
          client={displayClient}
          canManageProject={canManageProject}
        />
      </DetailPageContainer>
      <ClientFormModal
        open={open}
        initialValues={displayClient}
        industryOptions={industryOptions}
        onCancel={() => setOpen(false)}
        onSuccess={async () => {
          setOpen(false);
          await fetchClient(false);
        }}
      />
    </>
  );
};

export default ClientDetailPage;
