"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { Project } from "@/components/ProjectsTable";
import type { SimpleClient } from "@/types/client";

interface ClientProjectsSectionProps {
  clientId: string;
  client: SimpleClient | null;
  canManageProject: boolean;
}

const ClientProjectsSection = ({
  clientId,
  client,
  canManageProject,
}: ClientProjectsSectionProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

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

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      await fetchProjects();
    })();
  }, [clientId, fetchProjects]);

  return (
    <>
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
          onOptionUpdated={fetchProjects}
          columnKeys={["name", "type", "status", "owner", "period"]}
          defaultVisibleColumnKeys={["name", "status", "period"]}
        />
      </Card>

      <ProjectFormModal
        open={projectModalOpen}
        initialValues={{
          type: "CLIENT",
          clientId,
        }}
        projectType="CLIENT"
        clientEditable={false}
        clients={client ? [{ id: client.id, name: client.name }] : []}
        onCancel={() => setProjectModalOpen(false)}
        onSuccess={async () => {
          setProjectModalOpen(false);
          await fetchProjects();
        }}
      />
    </>
  );
};

export default ClientProjectsSection;
