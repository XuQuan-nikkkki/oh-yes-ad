"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

type Row = {
  id: string;
  name: string;
  type?: string | null;
  date?: string | null;
  location?: string | null;
  method?: string | null;
  project?: { id: string; name: string };
};

type FormValues = {
  name: string;
  projectId: string;
  type?: string;
  date?: dayjs.Dayjs;
  location?: string;
  method?: string;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();

  const fetchData = async () => {
    const [res1, res2] = await Promise.all([
      fetch("/api/project-milestones"),
      fetch("/api/projects?type=%E5%86%85%E9%83%A8%E9%A1%B9%E7%9B%AE"),
    ]);
    setRows(await res1.json());
    setProjects(await res2.json());
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const onEdit = (r: Row) => {
    setEditing(r);
    form.setFieldsValue({
      name: r.name,
      projectId: r.project?.id,
      type: r.type ?? undefined,
      date: r.date ? dayjs(r.date) : undefined,
      location: r.location ?? undefined,
      method: r.method ?? undefined,
    });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/project-milestones/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name,
      projectId: v.projectId,
      type: v.type ?? null,
      date: v.date ? v.date.toISOString() : null,
      location: v.location ?? null,
      method: v.method ?? null,
    };
    if (editing) {
      await fetch(`/api/project-milestones/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/project-milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setOpen(false);
    setEditing(null);
    await fetchData();
  };

  return (
    <Card title="项目里程碑" extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增里程碑</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "名称", dataIndex: "name", render: (v: string, r: Row) => <AppLink href={`/project-milestones/${r.id}`}>{v}</AppLink> },
          { title: "所属项目", dataIndex: ["project", "name"], render: (v: string | null) => v ?? "-" },
          { title: "类型", dataIndex: "type", render: (v: string | null) => v ?? "-" },
          { title: "日期", dataIndex: "date", render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : "-") },
          { title: "地点", dataIndex: "location", render: (v: string | null) => v ?? "-" },
          { title: "方式", dataIndex: "method", render: (v: string | null) => v ?? "-" },
          { title: "操作", render: (_: unknown, r: Row) => <TableActions onEdit={() => onEdit(r)} onDelete={() => onDelete(r.id)} deleteTitle={`确定删除里程碑「${r.name}」？`} /> },
        ]}
      />

      <Modal title={editing ? "编辑里程碑" : "新增里程碑"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}><Select options={projects.map((p) => ({ label: p.name, value: p.id }))} /></Form.Item>
          <Form.Item label="类型" name="type"><Input /></Form.Item>
          <Form.Item label="日期" name="date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="地点" name="location"><Input /></Form.Item>
          <Form.Item label="方式" name="method"><Input /></Form.Item>
          <Button block type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
    </Card>
  );
}
