"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import ProjectTasksListTable, {
  type ProjectTaskListRow,
} from "@/components/ProjectTasksListTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";

type Row = ProjectTaskListRow;

type FormValues = {
  name: string;
  segmentId: string;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectTasksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<
    { id: string; name: string; project?: { name: string } }[]
  >([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { canManageProject } = useProjectPermission();

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
    if (!canManageProject) return;
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (row: Row) => {
    if (!canManageProject) return;
    setEditing(row);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    await fetch(`/api/project-tasks/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (values: FormValues) => {
    if (!canManageProject) return;
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

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({
      name: editing.name,
      segmentId: editing.segment?.id,
      ownerId: editing.owner?.id,
      dueDate: editing.dueDate ? dayjs(editing.dueDate) : undefined,
    });
  }, [editing, form, open]);

  return (
    <Card styles={{ body: { padding: 12 } }}>
      <ProjectTasksListTable
        rows={rows}
        headerTitle={<h3 style={{ margin: 0 }}>项目任务</h3>}
        showTableOptions
        onEdit={(row) => onEdit(row)}
        onDelete={(id) => onDelete(id)}
        actionsDisabled={!canManageProject}
        toolbarActions={[
          <Button key="create" type="primary" onClick={onCreate} disabled={!canManageProject}>
            新增任务
          </Button>,
        ]}
      />

      <Modal
        title={editing ? "编辑任务" : "新增任务"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="所属环节"
            name="segmentId"
            rules={[{ required: true }]}
          >
            <Select
              options={segments.map((s) => ({
                label: `${s.project?.name ?? ""}-${s.name}`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="负责人" name="ownerId">
            <Select
              allowClear
              options={employees.map((e) => ({ label: e.name, value: e.id }))}
            />
          </Form.Item>
          <Form.Item label="截止日期" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Button block type="primary" htmlType="submit">
            保存
          </Button>
        </Form>
      </Modal>
    </Card>
  );
}
