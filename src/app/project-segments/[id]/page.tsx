"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import ProjectSegmentStatusValue from "@/components/project-detail/ProjectSegmentStatusValue";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import ProjectTasksProTable, {
  type ProjectTasksProTableRow,
} from "@/components/ProjectTasksProTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Detail = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: NullableSelectOptionValue;
  dueDate?: string | null;
  project?: { id: string; name: string };
  owner?: { id: string; name: string } | null;
  projectTasks?: ProjectTasksProTableRow[];
};

type FormValues = {
  name: string;
  projectId: string;
  ownerId?: string;
  status?: SelectOptionSelectorValue;
  dueDate?: dayjs.Dayjs;
};

export default function ProjectSegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTasksProTableRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm<FormValues>();
  const [taskForm] = Form.useForm<{
    segmentId: string;
    name: string;
    ownerId?: string;
    dueDate?: dayjs.Dayjs;
  }>();
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["projectSegment.status"] ?? [];

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/project-segments/${id}`);
    if (!res.ok) {
      setData(null);
      return;
    }
    setData(await res.json());
  }, [id]);

  const fetchOptions = useCallback(async () => {
    const employeeRows = await fetchEmployeesFromStore();
    setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
    await fetchAllOptions();
  }, [fetchAllOptions, fetchEmployeesFromStore]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchDetail();
      await fetchOptions();
    })();
  }, [id, fetchDetail, fetchOptions]);

  useEffect(() => {
    if (!open || !data) return;
    form.setFieldsValue({
      name: data.name,
      projectId: data.project?.id,
      ownerId: data.owner?.id,
      status: data.statusOption?.value ?? data.status ?? undefined,
      dueDate: data.dueDate ? dayjs(data.dueDate) : undefined,
    });
  }, [data, form, open]);

  useEffect(() => {
    if (!taskOpen || !data) return;
    if (!editingTask) {
      taskForm.setFieldsValue({
        segmentId: data.id,
      });
      return;
    }
    taskForm.setFieldsValue({
      segmentId: data.id,
      name: editingTask.name,
      ownerId: editingTask.owner?.id,
      dueDate: editingTask.dueDate ? dayjs(editingTask.dueDate) : undefined,
    });
  }, [data, editingTask, taskForm, taskOpen]);

  const onEdit = () => {
    if (!canManageProject) return;
    if (!data) return;
    setOpen(true);
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
    const res = await fetch(`/api/project-segments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      messageApi.error("更新失败");
      return;
    }
    messageApi.success("更新成功");
    setOpen(false);
    await fetchDetail();
  };

  const onDelete = async () => {
    if (!canManageProject) return;
    if (!id) return;
    setDeleting(true);
    const res = await fetch(`/api/project-segments/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/project-segments");
  };

  const onDeleteTask = async (taskId: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/project-tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      messageApi.error("删除任务失败");
      return;
    }
    messageApi.success("删除任务成功");
    await fetchDetail();
  };

  const onEditTask = (task: ProjectTasksProTableRow) => {
    if (!canManageProject) return;
    setEditingTask(task);
    setTaskOpen(true);
  };

  const onSubmitTask = async (values: {
    segmentId: string;
    name: string;
    ownerId?: string;
    dueDate?: dayjs.Dayjs;
  }) => {
    if (!canManageProject) return;
    const payload = {
      name: values.name,
      segmentId: values.segmentId,
      ownerId: values.ownerId ?? null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };
    const res = editingTask
      ? await fetch(`/api/project-tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/project-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      messageApi.error(editingTask ? "更新任务失败" : "创建任务失败");
      return;
    }
    messageApi.success(editingTask ? "更新任务成功" : "创建任务成功");
    setTaskOpen(false);
    setEditingTask(null);
    await fetchDetail();
  };

  return (
    <>
      {contextHolder}
      <DetailPageContainer>
        <Card
          title={data?.name || "环节详情"}
          extra={
            <Space>
              <Button icon={<EditOutlined />} onClick={onEdit} disabled={!canManageProject}>
                编辑
              </Button>
              <Popconfirm
                title={`确定删除环节「${data?.name ?? ""}」？`}
                okText="删除"
                cancelText="取消"
                onConfirm={() => void onDelete()}
                okButtonProps={{ danger: true, loading: deleting }}
              >
                <Button danger loading={deleting} disabled={!canManageProject}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          {data && (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="项目">
                {data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="环节状态">
                <ProjectSegmentStatusValue
                  status={data.status}
                  statusOption={data.statusOption}
                />
              </Descriptions.Item>
              <Descriptions.Item label="环节负责人">{data.owner?.name ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="截止日期">
                {data.dueDate ? dayjs(data.dueDate).format("YYYY-MM-DD") : "-"}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Card styles={{ body: { padding: "6px 2px" } }}>
          <ProjectTasksProTable
            rows={data?.projectTasks ?? []}
            headerTitle={<h4 style={{ margin: 0 }}>任务列表</h4>}
            columnsStatePersistenceKey="project-segment-detail-tasks-table-columns-state"
            columnKeys={["name", "owner", "dueDate", "actions"]}
            onEdit={onEditTask}
            onDelete={(taskId) => void onDeleteTask(taskId)}
            toolbarActions={[
              <Button
                key="create-task"
                type="primary"
                disabled={!canManageProject}
                onClick={() => {
                  if (!canManageProject) return;
                  if (!data) return;
                  setEditingTask(null);
                  taskForm.setFieldsValue({
                    segmentId: data.id,
                    name: "",
                    ownerId: undefined,
                    dueDate: undefined,
                  });
                  setTaskOpen(true);
                }}
              >
                新建任务
              </Button>,
            ]}
          />
        </Card>

        <Modal
          title="编辑环节"
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          forceRender
          destroyOnHidden
        >
          <Form layout="vertical" form={form} onFinish={(values) => void onSubmit(values)}>
            <Form.Item label="环节名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}>
              <Select
                disabled
                options={
                  data?.project
                    ? [{ label: data.project.name, value: data.project.id }]
                    : []
                }
              />
            </Form.Item>
            <Form.Item label="负责人" name="ownerId">
              <Select allowClear options={employees.map((employee) => ({ label: employee.name, value: employee.id }))} />
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
            <Button block type="primary" htmlType="submit">
              保存
            </Button>
          </Form>
        </Modal>

        <Modal
          title={editingTask ? "编辑任务" : "新建任务"}
          open={taskOpen}
          onCancel={() => {
            setTaskOpen(false);
            setEditingTask(null);
          }}
          footer={null}
          forceRender
          destroyOnHidden
        >
          <Form
            layout="vertical"
            form={taskForm}
            onFinish={(values) => void onSubmitTask(values)}
          >
            <Form.Item
              label="所属环节"
              name="segmentId"
              rules={[{ required: true, message: "请选择所属环节" }]}
            >
              <Select
                disabled
                options={
                  data
                    ? [{ label: data.name, value: data.id }]
                    : []
                }
                placeholder="请选择所属环节"
              />
            </Form.Item>
            <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="负责人" name="ownerId">
              <Select
                allowClear
                options={employees.map((employee) => ({
                  label: employee.name,
                  value: employee.id,
                }))}
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
      </DetailPageContainer>
    </>
  );
}
