"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import ListPageContainer from "@/components/ListPageContainer";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useClientsStore } from "@/stores/clientsStore";
import { useProjectsStore } from "@/stores/projectsStore";

const CLIENT_PROJECT_TYPE = "客户项目";
const CLIENT_PROJECT_QUERY_KEY = JSON.stringify({
  type: CLIENT_PROJECT_TYPE,
  ownerId: "",
  clientId: "",
  vendorId: "",
});

const ClientProjectsPage = () => {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { canManageProject } = useProjectPermission();
  const storeClients = useClientsStore((state) => state.clients);
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);
  const projectsById = useProjectsStore((state) => state.byId);
  const projectIds = useProjectsStore(
    (state) => state.queryState[CLIENT_PROJECT_QUERY_KEY]?.ids,
  );
  const loading = useProjectsStore(
    (state) => state.queryState[CLIENT_PROJECT_QUERY_KEY]?.loading ?? false,
  );
  const loaded = useProjectsStore(
    (state) => state.queryState[CLIENT_PROJECT_QUERY_KEY]?.loaded ?? false,
  );
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const clients = storeClients
    .filter(
      (
        item,
      ): item is {
        id: string;
        name: string;
      } => typeof item.id === "string" && typeof item.name === "string",
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
    }));
  const projects = useMemo(
    () =>
      (projectIds ?? [])
        .map((id) => projectsById[id])
        .filter((item): item is Project => Boolean(item)),
    [projectIds, projectsById],
  );

  const fetchProjects = useCallback(
    async (force = false) => {
      await fetchProjectsFromStore({ type: CLIENT_PROJECT_TYPE, force });
    },
    [fetchProjectsFromStore],
  );

  const ensureClientsLoaded = useCallback(async () => {
    if (clients.length > 0) return;
    await fetchClientsFromStore();
  }, [clients.length, fetchClientsFromStore]);

  useEffect(() => {
    if (loaded) return;
    void fetchProjects();
  }, [fetchProjects, loaded]);

  const handleDelete = async (id: string) => {
    if (!canManageProject) return;
    const res = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    await fetchProjects(true);
  };

  return (
    <ListPageContainer>
      <ProjectsTable
        headerTitle={<ProTableHeaderTitle>客户项目</ProTableHeaderTitle>}
        toolbarActions={[
          <Button
            key="create-client-project"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageProject}
            onClick={() => {
              void ensureClientsLoaded();
              setEditingProject(null);
              setOpen(true);
            }}
          >
            新建客户项目
          </Button>,
        ]}
        enableColumnSetting
        columnsStatePersistenceKey="client-projects-table-columns-state"
        projects={projects}
        loading={loading}
        columnKeys={["name", "client", "status", "stage", "owner", "isArchived", "actions"]}
        defaultVisibleColumnKeys={["name", "client", "status", "stage", "owner", "isArchived", "actions"]}
        onOptionUpdated={fetchProjects}
        onEdit={(project) => {
          void ensureClientsLoaded();
          setEditingProject(project);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />
      <ProjectFormModal
        open={open}
        initialValues={
          editingProject
            ? { ...editingProject, type: CLIENT_PROJECT_TYPE }
            : { type: CLIENT_PROJECT_TYPE }
        }
        onCancel={() => {
          setOpen(false);
          setEditingProject(null);
        }}
        onSuccess={async () => {
          setOpen(false);
          setEditingProject(null);
          await fetchProjects(true);
        }}
        clients={clients}
        projectType={CLIENT_PROJECT_TYPE}
      />
    </ListPageContainer>
  );
};

export default ClientProjectsPage;
