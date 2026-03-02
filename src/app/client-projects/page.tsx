"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import TableActions from "@/components/TableActions";
import dayjs from "dayjs";
import Link from "next/link";

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

const ClientProjectsPage = () => {
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
  
  const projectTypeLabel = "客户项目";

  const statusColors = {
    PLANNING: "default",
    IN_PROGRESS: "processing",
    COMPLETED: "success",
    PAUSED: "warning",
  };

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch("/api/projects?type=%E5%AE%A2%E6%88%B7%E9%A1%B9%E7%9B%AE");
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
      width: 260,
      ellipsis: true,
      className: "name-col",
      filters: projects.map((p) => ({
        text: p.name,
        value: p.name,
      })),
      filterSearch: true,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "所属客户",
      dataIndex: ["client", "name"],
      width: 180,
      filters: Array.from(new Set(projects.map((p) => p.client?.name).filter(Boolean))).map(
        (name) => ({
          text: name,
          value: name,
        })
      ),
      onFilter: (value, record) => record.client?.name === value,
      render: (value: string, record: Project) =>
        record.client ? (
          <Link href={`/clients/${record.client.id}`} style={{ color: "#1677ff" }}>
            {value}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      title: "项目状态",
      dataIndex: "status",
      width: 150,
      filters: Object.entries(projectStatusOptions).map(([key, value]) => ({
        text: value,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
      render: (value: string | null) => {
        if (!value) return "-";
        return (
          <Tag
            color={statusColors[value as keyof typeof statusColors] || "default"}
          >
            {projectStatusOptions[value as keyof typeof projectStatusOptions] || value}
          </Tag>
        );
      },
    },
    {
      title: "操作",
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
      title={<h3>客户项目</h3>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProject(null);
            setOpen(true);
          }}
        >
          新建客户项目
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
        initialValues={editingProject ? { ...editingProject, type: "客户项目" } : { type: "客户项目" }}
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
        projectType="客户项目"
      />
    </Card>
  );
};

export default ClientProjectsPage;
