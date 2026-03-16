"use client";

import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import ProjectSegmentsProTable, {
  type ProjectSegmentsProTableRow,
} from "@/components/ProjectSegmentsProTable";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Row = ProjectSegmentsProTableRow;

type Option = { id: string; name: string };

type FormValues = {
  name: string;
  projectId: string;
  ownerId?: string;
  status?: SelectOptionSelectorValue;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectSegmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { canManageProject } = useProjectPermission();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["projectSegment.status"] ?? [];

  const fetchData = async () => {
    const [segmentsRes, projectsRes, employeesRes] = await Promise.all([
      fetch("/api/project-segments"),
      fetch("/api/projects"),
      fetch("/api/employees"),
    ]);
    setRows(await segmentsRes.json());
    setProjects((await projectsRes.json()).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    setEmployees((await employeesRes.json()).map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
  };

  useEffect(() => {
    (async () => {
      await fetchData();
      await fetchAllOptions();
    })();
  }, [fetchAllOptions]);

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({
      name: editing.name,
      projectId: editing.project?.id,
      ownerId: editing.owner?.id,
      status: editing.statusOption?.value ?? editing.status ?? undefined,
      dueDate: editing.dueDate ? dayjs(editing.dueDate) : undefined,
    });
  }, [editing, form, open]);

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
    await fetch(`/api/project-segments/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (values: FormValues) => {
    if (!canManageProject) return;
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
    <Card styles={{ body: { padding: 12 } }}>
      <ProjectSegmentsProTable
        rows={rows}
        headerTitle={<h3 style={{ margin: 0 }}>项目环节</h3>}
        columnsStatePersistenceKey="project-segments-table-columns-state"
        onEdit={onEdit}
        onDelete={(id) => void onDelete(id)}
        actionsDisabled={!canManageProject}
        toolbarActions={[
          <Button key="create" type="primary" onClick={onCreate} disabled={!canManageProject}>
            新增环节
          </Button>,
        ]}
      />

      <Modal
        title={editing ? "编辑环节" : "新增环节"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        forceRender
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
            <SelectOptionSelector
              placeholder="请选择或新增状态"
              options={statusOptions.map((item) => ({
                label: item.value,
                value: item.value,
                color: item.color ?? "#d9d9d9",
              }))}
            />
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
