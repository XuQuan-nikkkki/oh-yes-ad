"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import ProjectsTable, { Project } from "@/components/ProjectsTable";

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch("/api/projects");
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
    // 这个端点需要创建
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
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
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchProjects();
  };

  return (
    <Card
      title={<h3>项目管理</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProject(null);
            setOpen(true);
          }}
        >
          新建项目
        </Button>
      }
    >
      <ProjectsTable
        projects={projects}
        loading={loading}
        onEdit={(project) => {
          setEditingProject(project);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />
      <ProjectFormModal
        open={open}
        initialValues={editingProject}
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
      />
    </Card>
  );
};

export default ProjectsPage;
