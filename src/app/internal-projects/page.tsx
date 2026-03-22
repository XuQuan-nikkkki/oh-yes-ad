"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ListPageContainer from "@/components/ListPageContainer";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import type { SimpleEmployee } from "@/types/employee";

const InternalProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
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
      await Promise.all([fetchProjects(), fetchEmployees()]);
    };
    void loadData();
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
    <ListPageContainer>
      <ProjectsTable
        headerTitle={<ProTableHeaderTitle>内部项目</ProTableHeaderTitle>}
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
        clients={[]}
        employees={employees}
        projectType="内部项目"
      />
    </ListPageContainer>
  );
};

export default InternalProjectsPage;
