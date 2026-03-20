// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Space, Descriptions, Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import ClientFormModal from "@/components/ClientFormModal";
import ClientContactTable from "@/components/ClientContactTable";
import ContactFormModal from "@/components/ContactFormModal";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { Project } from "@/components/ProjectsTable";
import TableActions from "@/components/TableActions";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import SelectOptionTag from "@/components/SelectOptionTag";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
type Client = {
  id: string;
  name: string;
  industryOptionId: string;
  industryOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
};

type Contact = {
  id: string;
  name: string;
  order?: number;
  clientId?: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type WorkdayAdjustment = {
  id: string;
  changeType: string;
  startDate: string;
  endDate: string;
};

const EMPTY_OPTIONS: {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt: string;
}[] = [];

const ClientModal = () => {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);

  const [open, setOpen] = useState(false);

  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_OPTIONS,
  );
  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    setClient(data);
    setLoading(false);
  }, [clientId]);

  return (
    <ClientFormModal
      open={open}
      initialValues={client}
      industryOptions={industryOptions}
      onCancel={() => setOpen(false)}
      onSuccess={async () => {
        setOpen(false);
        await fetchClient();
      }}
    />
  );
};

export default ClientModal;
