"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";

type Row = {
  id: string;
  name: string;
  dueDate?: string | null;
  segment?: { id: string; name: string; project?: { id: string; name: string } };
  owner?: { id: string; name: string } | null;
};

type FormValues = {
  name: string;
  segmentId: string;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectTasksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<{ id: string; name: string; project?: { name: string } }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();

  const fetchData = async () => {
    const [tasksRes, segmentsRes, employeesRes] = await Promise.all([
      fetch("/api/project-tasks"),
      fetch("/api/project-segments"),
      fetch("/api/employees"),
    ]);
    setRows(await tasksRes.json());
    setSegments(await segmentsRes.json());
    setEmployees(await employeesRes.json());
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
      segmentId: row.segment?.id,
      ownerId: row.owner?.id,
      dueDate: row.dueDate ? dayjs(row.dueDate) : undefined,
    });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/project-tasks/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      segmentId: values.segmentId,
      ownerId: values.ownerId ?? null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };
    if (editing) {
      await fetch(`/api/project-tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/project-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    await fetchData();
  };

  return (
    <Card title="项目任务" extra={<Button type="primary" onClick={onCreate}>新增任务</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "任务名称", dataIndex: "name", render: (v: string, r: Row) => <AppLink href={`/project-tasks/${r.id}`}>{v}</AppLink> },
          { title: "所属项目", render: (_: unknown, r: Row) => r.segment?.project?.name ?? "-" },
          { title: "所属环节", dataIndex: ["segment", "name"], render: (v: string | null) => v ?? "-" },
          { title: "负责人", dataIndex: ["owner", "name"], render: (v: string | null) => v ?? "-" },
          { title: "截止日期", dataIndex: "dueDate", render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : "-") },
          {
            title: "操作",
            render: (_: unknown, r: Row) => (
              <TableActions
                onEdit={() => onEdit(r)}
                onDelete={() => onDelete(r.id)}
                deleteTitle={`确定删除任务「${r.name}」？`}
              />
            ),
          },
        ]}
      />

      <Modal title={editing ? "编辑任务" : "新增任务"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="所属环节" name="segmentId" rules={[{ required: true }]}>
            <Select options={segments.map((s) => ({ label: `${s.project?.name ?? ""}-${s.name}`, value: s.id }))} />
          </Form.Item>
          <Form.Item label="负责人" name="ownerId">
            <Select allowClear options={employees.map((e) => ({ label: e.name, value: e.id }))} />
          </Form.Item>
          <Form.Item label="截止日期" name="dueDate"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Button block type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
    </Card>
  );
}
