"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

type Row = {
  id: string;
  name: string;
  status?: string | null;
  dueDate?: string | null;
  project?: { id: string; name: string };
  owner?: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

type FormValues = {
  name: string;
  projectId: string;
  ownerId?: string;
  status?: string;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectSegmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();

  const fetchData = async () => {
    const [segmentsRes, projectsRes, employeesRes] = await Promise.all([
      fetch("/api/project-segments"),
      fetch("/api/projects?type=%E5%86%85%E9%83%A8%E9%A1%B9%E7%9B%AE"),
      fetch("/api/employees"),
    ]);
    setRows(await segmentsRes.json());
    setProjects((await projectsRes.json()).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    setEmployees((await employeesRes.json()).map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const onEdit = (row: Row) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      projectId: row.project?.id,
      ownerId: row.owner?.id,
      status: row.status ?? undefined,
      dueDate: row.dueDate ? dayjs(row.dueDate) : undefined,
    });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/project-segments/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      projectId: values.projectId,
      ownerId: values.ownerId ?? null,
      status: values.status ?? null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };

    if (editing) {
      await fetch(`/api/project-segments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/project-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setOpen(false);
    await fetchData();
  };

  return (
    <Card
      title="项目环节"
      extra={<Button type="primary" onClick={onCreate}>新增环节</Button>}
    >
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "环节名称",
            dataIndex: "name",
            render: (value: string, record: Row) => (
              <AppLink href={`/project-segments/${record.id}`}>{value}</AppLink>
            ),
          },
          { title: "所属项目", dataIndex: ["project", "name"], render: (v: string | null) => v ?? "-" },
          { title: "负责人", dataIndex: ["owner", "name"], render: (v: string | null) => v ?? "-" },
          { title: "状态", dataIndex: "status", render: (v: string | null) => v ?? "-" },
          {
            title: "截止日期",
            dataIndex: "dueDate",
            render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
          },
          {
            title: "操作",
            render: (_: unknown, record: Row) => (
              <TableActions
                onEdit={() => onEdit(record)}
                onDelete={() => onDelete(record.id)}
                deleteTitle={`确定删除环节「${record.name}」？`}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "编辑环节" : "新增环节"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item label="环节名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}>
            <Select options={projects.map((p) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item label="负责人" name="ownerId">
            <Select allowClear options={employees.map((e) => ({ label: e.name, value: e.id }))} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Input />
          </Form.Item>
          <Form.Item label="截止日期" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Button block type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
    </Card>
  );
}
