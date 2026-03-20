"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
};

const InternalProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { canManageProject } = useProjectPermission();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);

  const fetchProjects = async (force = false) => {
    setLoading(true);
    const data = await fetchProjectsFromStore({ type: "内部项目", force });
    setProjects(Array.isArray(data) ? (data as Project[]) : []);
    setLoading(false);
  };

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  };

  const fetchEmployees = async () => {
    try {
      const data = await fetchEmployeesFromStore();
      setEmployees(data);
    } catch {
      console.log("Employees API not available yet");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchProjects(), fetchClients(), fetchEmployees()]);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!canManageProject) return;
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchProjects(true);
  };

  return (
    <Card styles={{ body: { padding: 12 } }}>
      <ProjectsTable
        headerTitle={<h3 style={{ margin: 0 }}>内部项目</h3>}
        toolbarActions={[
          <Button
            key="create-internal-project"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canManageProject}
            onClick={() => {
              setEditingProject(null);
              setOpen(true);
            }}
          >
            新建内部项目
          </Button>,
        ]}
        enableColumnSetting
        columnsStatePersistenceKey="internal-projects-table-columns-state"
        projects={projects}
        loading={loading}
        columnKeys={["name", "owner", "isArchived", "actions"]}
        defaultVisibleColumnKeys={["name", "owner", "isArchived", "actions"]}
        onOptionUpdated={fetchProjects}
        actionsDisabled={!canManageProject}
        onEdit={(project) => {
          setEditingProject(project);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />
      <ProjectFormModal
        open={open}
        initialValues={editingProject ? { ...editingProject, type: "内部项目" } : { type: "内部项目" }}
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
        employees={employees}
        projectType="内部项目"
      />
    </Card>
  );
};

export default InternalProjectsPage;
