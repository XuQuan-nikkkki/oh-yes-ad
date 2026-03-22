"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import ProjectTasksListTable, {
  type ProjectTaskListRow,
} from "@/components/ProjectTasksListTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectTasksStore } from "@/stores/projectTasksStore";

type Row = ProjectTaskListRow;
const EMPTY_ROWS: Row[] = [];

type FormValues = {
  name: string;
  segmentId: string;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectTasksPage() {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { canManageProject } = useProjectPermission();
  const rowsByKey = useProjectTasksStore((state) => state.tasksByKey);
  const rows = (rowsByKey["owner:all"] ?? EMPTY_ROWS) as Row[];
  const rowsLoading = useProjectTasksStore(
    (state) => Boolean(state.loadingByKey["owner:all"]),
  );
  const fetchTasksFromStore = useProjectTasksStore((state) => state.fetchTasks);
  const upsertTasks = useProjectTasksStore((state) => state.upsertTasks);
  const removeTask = useProjectTasksStore((state) => state.removeTask);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  const fetchBaseData = useCallback(async () => {
    const [taskRows, employeeRows] = await Promise.all([
      fetchTasksFromStore(),
      fetchEmployeesFromStore(),
    ]);
    if (Array.isArray(taskRows) && taskRows.length > 0) {
      upsertTasks(taskRows);
    }
    setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
  }, [fetchEmployeesFromStore, fetchTasksFromStore, upsertTasks]);

  const segments = useMemo(() => {
    const segmentMap = new Map<
      string,
      { id: string; name: string; project?: { name: string } }
    >();
    for (const row of rows) {
      const segmentId = row.segment?.id;
      const segmentName = row.segment?.name;
      if (!segmentId || !segmentName) continue;
      if (segmentMap.has(segmentId)) continue;
      segmentMap.set(segmentId, {
        id: segmentId,
        name: segmentName,
        project: row.segment?.project
          ? { name: row.segment.project.name }
          : undefined,
      });
    }
    return Array.from(segmentMap.values()).sort((left, right) =>
      `${left.project?.name ?? ""}-${left.name}`.localeCompare(
        `${right.project?.name ?? ""}-${right.name}`,
        "zh-CN",
      ),
    );
  }, [rows]);

  useEffect(() => {
    (async () => {
      await fetchBaseData();
    })();
  }, [fetchBaseData]);

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
    const res = await fetch(`/api/project-tasks/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeTask(id);
  };

  const onSubmit = async (values: FormValues) => {
    if (!canManageProject) return;
    const payload = {
      name: values.name,
      segmentId: values.segmentId,
      ownerId: values.ownerId ?? null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };
    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/project-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    if (!res.ok) {
      await fetchTasksFromStore({ force: true });
      return;
    }
    const next = (await res.json()) as Row | null;
    if (next?.id) {
      upsertTasks([next]);
      return;
    }
    await fetchTasksFromStore({ force: true });
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
    <ListPageContainer>
      <ProjectTasksListTable
        rows={rows}
        loading={rowsLoading}
        headerTitle={<ProTableHeaderTitle>项目任务</ProTableHeaderTitle>}
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
    </ListPageContainer>
  );
}
