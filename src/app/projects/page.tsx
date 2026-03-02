"use client";

import { useEffect, useState } from "react";
import { Table, Button, Card, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ProjectFormModal from "@/components/ProjectFormModal";
import Link from "next/link";
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

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projectTypeOptions = {
    CLIENT: "客户项目",
    INTERNAL: "内部项目",
  };

  const projectStatusOptions = {
    PLANNING: "规划中",
    IN_PROGRESS: "进行中",
    COMPLETED: "已完成",
    PAUSED: "已暂停",
  };

  const statusColors = {
    PLANNING: "default",
    IN_PROGRESS: "processing",
    COMPLETED: "success",
    PAUSED: "warning",
  };

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
      title: "项目类型",
      dataIndex: "type",
      width: 120,
      filters: Object.entries(projectTypeOptions).map(([key, value]) => ({
        text: value,
        value: key,
      })),
      onFilter: (value, record) => record.type === value,
      render: (value: string) => (
        <Tag
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 500,
          }}
        >
          {projectTypeOptions[value as keyof typeof projectTypeOptions] || value}
        </Tag>
      ),
    },
    {
      title: "所属客户",
      dataIndex: ["client", "name"],
      render: (value: string, record: Project) => value || "-",
    },
    {
      title: "项目状态",
      dataIndex: "status",
      width: 100,
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
      title: "项目负责人",
      dataIndex: ["owner", "name"],
      render: (value: string) => value || "-",
    },
    {
      title: "开始日期",
      dataIndex: "startDate",
      width: 120,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
      sorter: (a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      width: 120,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD") : "-",
      sorter: (a, b) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateA - dateB;
      },
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
      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        pagination={{ pageSize: 10 }}
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
