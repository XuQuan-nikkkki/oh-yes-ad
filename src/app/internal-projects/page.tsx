"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import TableActions from "@/components/TableActions";
import dayjs from "dayjs";

type Project = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  stage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
};

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

  const projectStatusOptions = {
    PLANNING: "规划中",
    IN_PROGRESS: "进行中",
    COMPLETED: "已完成",
    PAUSED: "已暂停",
  };
  
  const projectTypeLabel = "内部项目";

  const statusColors = {
    PLANNING: "default",
    IN_PROGRESS: "processing",
    COMPLETED: "success",
    PAUSED: "warning",
  };

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

  const columns = [
    {
      title: "项目名称",
      dataIndex: "name",
      width: 180,
      ellipsis: true,
      filters: projects.map((p) => ({
        text: p.name,
        value: p.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "操作",
      width: 200,
      fixed: "right" as const,
      render: (_: any, record: Project) => (
        <TableActions
          onEdit={() => {
            setEditingProject(record);
            setOpen(true);
          }}
          onDelete={() => handleDelete(record.id)}
          deleteTitle="确定删除这个项目？"
        />
      ),
    },
  ];

  return (
    <Card
      title={<h3>内部项目</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProject(null);
            setOpen(true);
          }}
        >
          新建内部项目
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        pagination={{ pageSize: 10 }}
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
