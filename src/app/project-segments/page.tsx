"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import ProjectSegmentsProTable, {
  type ProjectSegmentsProTableRow,
} from "@/components/ProjectSegmentsProTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useProjectSegmentsStore } from "@/stores/projectSegmentsStore";

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
  const [projects, setProjects] = useState<Option[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { canManageProject } = useProjectPermission();
  const rows = useProjectSegmentsStore((state) => state.rows);
  const rowsLoading = useProjectSegmentsStore((state) => state.loading);
  const fetchSegmentsFromStore = useProjectSegmentsStore(
    (state) => state.fetchSegments,
  );
  const upsertSegments = useProjectSegmentsStore((state) => state.upsertSegments);
  const removeSegment = useProjectSegmentsStore((state) => state.removeSegment);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["projectSegment.status"] ?? [];

  const fetchBaseData = useCallback(async () => {
    const employeeRows = await fetchEmployeesFromStore();
    await fetchSegmentsFromStore();
    setEmployees(
      (Array.isArray(employeeRows) ? employeeRows : []).map((e: { id: string; name: string }) => ({
        id: e.id,
        name: e.name,
      })),
    );
  }, [fetchEmployeesFromStore, fetchSegmentsFromStore]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    const data = await fetchProjectsFromStore();
    setProjects(
      (Array.isArray(data) ? data : [])
        .filter(
          (
            p,
          ): p is {
            id: string;
            name: string;
          } => typeof p?.id === "string" && typeof p?.name === "string",
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
        })),
    );
    setProjectsLoading(false);
  }, [fetchProjectsFromStore]);

  const ensureProjectsLoaded = useCallback(async () => {
    if (projects.length > 0) return;
    await fetchProjects();
  }, [fetchProjects, projects.length]);

  useEffect(() => {
    (async () => {
      await fetchBaseData();
      await fetchAllOptions();
    })();
  }, [fetchAllOptions, fetchBaseData]);

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
    void (async () => {
      await ensureProjectsLoaded();
      setEditing(null);
      setOpen(true);
    })();
  };

  const onEdit = (row: Row) => {
    if (!canManageProject) return;
    void (async () => {
      await ensureProjectsLoaded();
      setEditing(row);
      setOpen(true);
    })();
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/project-segments/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeSegment(id);
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

    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-segments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/project-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setOpen(false);
    if (!res.ok) {
      await fetchSegmentsFromStore(true);
      return;
    }
    const next = (await res.json()) as Row | null;
    if (next?.id) {
      upsertSegments([next]);
      return;
    }
    await fetchSegmentsFromStore(true);
  };

  return (
    <ListPageContainer>
      <ProjectSegmentsProTable
        rows={rows}
        loading={rowsLoading}
        headerTitle={<ProTableHeaderTitle>项目环节</ProTableHeaderTitle>}
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
            <Select
              loading={projectsLoading}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
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
                color: item.color ?? DEFAULT_COLOR,
              }))}
            />
          </Form.Item>
          <Form.Item label="截止日期" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Button block type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
    </ListPageContainer>
  );
}
