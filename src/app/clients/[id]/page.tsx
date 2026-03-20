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

const ClientDetailPage = () => {
  const params = useParams();
  const router = useRouter();
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
  const [contactSorting, setContactSorting] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const { canManageCrm } = useCrmPermission();
  const { canManageProject } = useProjectPermission();
  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_OPTIONS,
  );
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );

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

      const res = await fetch(`/api/clients/${clientId}/contacts`);
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
      const res = await fetch(`/api/clients/${clientId}/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setProjectLoading(false);
    }
  }, [clientId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await fetchEmployeesFromStore();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  }, [fetchEmployeesFromStore]);

  const fetchWorkdayAdjustments = useCallback(async () => {
    try {
      const data = await fetchAdjustmentsFromStore();
      setWorkdayAdjustments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch workday adjustments:", error);
      setWorkdayAdjustments([]);
    }
  }, [fetchAdjustmentsFromStore]);

  const handleDeleteContact = async (id: string) => {
    if (!canManageCrm) return;
    await fetch(`/api/client-contacts/${id}`, {
      method: "DELETE",
    });

    await fetchContacts();
  };

  const handleEditContact = (record: Contact) => {
    if (!canManageCrm) return;
    setEditingContact(record);
    setContactModalOpen(true);
  };

  const handleCreateContact = () => {
    if (!canManageCrm) return;
    setEditingContact(null);
    setContactModalOpen(true);
  };

  const handleDragSortContacts = async (
    _beforeIndex: number,
    afterIndex: number,
    newDataSource: Contact[],
  ) => {
    if (contactSorting) return;
    const moved = newDataSource[afterIndex];
    if (!moved?.id) return;

    const previousContacts = contacts;
    setContacts(newDataSource);
    setContactSorting(true);

    const res = await fetch(`/api/clients/${clientId}/contacts/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movedId: moved.id,
        orderedIds: newDataSource.map((item) => item.id),
      }),
    });

    if (!res.ok) {
      setContacts(previousContacts);
      setContactSorting(false);
      messageApi.error("排序失败，已恢复原顺序");
      await fetchContacts();
      return;
    }

    setContactSorting(false);
    void fetchContacts();
  };

  const handleDeleteClient = async () => {
    if (!clientId) return;
    if (!canManageCrm) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("删除失败");
      }

      messageApi.success("删除成功");
      router.push("/clients");
    } catch (error) {
      console.error("删除客户失败:", error);
      messageApi.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      await fetchClient();
      await fetchContacts();
      await fetchProjects();
      await fetchEmployees();
      await fetchWorkdayAdjustments();
    })();
  }, [
    clientId,
    fetchClient,
    fetchContacts,
    fetchProjects,
    fetchEmployees,
    fetchWorkdayAdjustments,
  ]);

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Card
          title={client?.name ?? "客户详情"}
          loading={loading}
          extra={
            <TableActions
              onEdit={() => setOpen(true)}
              onDelete={handleDeleteClient}
              editDisabled={!canManageCrm}
              deleteDisabled={!canManageCrm}
              deleteLoading={deleting}
              deleteTitle={`确定删除客户「${client?.name ?? ""}」？`}
              deleteText="删除"
            />
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="行业">
              <SelectOptionTag
                option={client?.industryOption}
                fallbackText="-"
                successMessage="行业标签已更新"
                onUpdated={async () => {
                  await fetchClient();
                  await fetchAllOptions(true);
                }}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card styles={{ body: { padding: 2 } }}>
          <ClientContactTable
            headerTitle={<h4 style={{ margin: 0 }}>客户人员</h4>}
            toolbarActions={[
              <Button
                key="create-contact"
                type="primary"
                icon={<PlusOutlined />}
                disabled={!canManageCrm}
                onClick={handleCreateContact}
              >
                新建人员
              </Button>,
            ]}
            enableColumnSetting
            columnsStatePersistenceKey="client-detail-contacts-table-columns-state"
            enableDragSort={canManageCrm}
            onDragSortEnd={canManageCrm ? handleDragSortContacts : undefined}
            contacts={contacts}
            loading={contactLoading || contactSorting}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            actionsDisabled={!canManageCrm}
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
            defaultVisibleColumnKeys={["name", "title", "scope", "actions"]}
            pagination={false}
          />
        </Card>

        <Card styles={{ body: { padding: 2 } }}>
          <ProjectsTable
            headerTitle={<h4 style={{ margin: 0 }}>合作项目</h4>}
            toolbarActions={[
              <Button
                key="create-project"
                type="primary"
                icon={<PlusOutlined />}
                disabled={!canManageProject}
                onClick={() => {
                  if (!canManageProject) return;
                  setProjectModalOpen(true);
                }}
              >
                新建项目
              </Button>,
            ]}
            enableColumnSetting
            columnsStatePersistenceKey="client-detail-projects-table-columns-state"
            projects={projects}
            loading={projectLoading}
            workdayAdjustments={workdayAdjustments}
            onOptionUpdated={fetchProjects}
            columnKeys={[
              "name",
              "type",
              "status",
              "owner",
              "period",
            ]}
            defaultVisibleColumnKeys={["name", "status", "period"]}
          />
        </Card>
      </Space>

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

      <ContactFormModal
        open={contactModalOpen}
        clientId={clientId}
        clientEditable={false}
        clientOptions={client ? [{ id: client.id, name: client.name }] : []}
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

      <ProjectFormModal
        open={projectModalOpen}
        initialValues={{
          type: "CLIENT",
          clientId,
        }}
        projectType="CLIENT"
        clientEditable={false}
        clients={client ? [{ id: client.id, name: client.name }] : []}
        employees={employees}
        onCancel={() => setProjectModalOpen(false)}
        onSuccess={async () => {
          setProjectModalOpen(false);
          await fetchProjects();
        }}
      />
    </>
  );
};

export default ClientDetailPage;
