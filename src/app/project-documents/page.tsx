"use client";

import { useEffect, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Form, Input, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

type Row = {
  id: string;
  name: string;
  type?: string | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
  project?: { id: string; name: string };
};

type FormValues = {
  name: string;
  projectId: string;
  type?: string;
  date?: dayjs.Dayjs;
  isFinal?: boolean;
  internalLink?: string;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();

  const fetchData = async () => {
    const [res1, res2] = await Promise.all([
      fetch("/api/project-documents"),
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
      isFinal: r.isFinal,
      internalLink: r.internalLink ?? undefined,
    });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/project-documents/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name,
      projectId: v.projectId,
      type: v.type ?? null,
      date: v.date ? v.date.toISOString() : null,
      isFinal: Boolean(v.isFinal),
      internalLink: v.internalLink ?? null,
    };
    if (editing) {
      await fetch(`/api/project-documents/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/project-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setOpen(false);
    setEditing(null);
    await fetchData();
  };

  return (
    <Card title="项目资料" extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增资料</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "名称", dataIndex: "name", render: (v: string, r: Row) => <AppLink href={`/project-documents/${r.id}`}>{v}</AppLink> },
          { title: "所属项目", dataIndex: ["project", "name"], render: (v: string | null) => v ?? "-" },
          { title: "类型", dataIndex: "type", render: (v: string | null) => v ?? "-" },
          { title: "日期", dataIndex: "date", render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : "-") },
          { title: "是最终版", dataIndex: "isFinal", render: (v: boolean) => <Checkbox checked={v} onChange={() => {}} style={{ pointerEvents: "none" }} /> },
          {
            title: "内部链接",
            dataIndex: "internalLink",
            render: (v: string | null) => v ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a> : "-",
          },
          { title: "操作", render: (_: unknown, r: Row) => <TableActions onEdit={() => onEdit(r)} onDelete={() => onDelete(r.id)} deleteTitle={`确定删除资料「${r.name}」？`} /> },
        ]}
        scroll={{ x: "max-content" }}
      />

      <Modal title={editing ? "编辑资料" : "新增资料"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}><Select options={projects.map((p) => ({ label: p.name, value: p.id }))} /></Form.Item>
          <Form.Item label="类型" name="type"><Input /></Form.Item>
          <Form.Item label="日期" name="date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="内部链接" name="internalLink"><Input /></Form.Item>
          <Form.Item name="isFinal" valuePropName="checked"><Checkbox>是最终版</Checkbox></Form.Item>
          <Button block type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
    </Card>
  );
}
