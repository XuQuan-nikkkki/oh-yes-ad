"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";

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

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch("/api/projects?type=%E5%86%85%E9%83%A8%E9%A1%B9%E7%9B%AE");
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  };

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
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

    fetchProjects();
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
          await fetchProjects();
        }}
        clients={clients}
        employees={employees}
        projectType="内部项目"
      />
    </Card>
  );
};

export default InternalProjectsPage;
