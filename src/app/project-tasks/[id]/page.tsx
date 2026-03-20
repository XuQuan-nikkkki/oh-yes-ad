"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  message,
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import PlannedWorkEntriesTable, {
  type PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";

type Detail = {
  id: string;
  name: string;
  dueDate?: string | null;
  segment?: {
    id: string;
    name: string;
    project?: { id: string; name: string };
  };
  owner?: {
    id: string;
    name: string;
    functionOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
  } | null;
  creator?: { id: string; name: string } | null;
};

type FormValues = {
  name: string;
  segmentId: string;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type PlannedEntryInitialValues = PlannedWorkEntryFormPayload & { id: string };

export default function ProjectTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [segments, setSegments] = useState<
    { id: string; name: string; project?: { name: string } }[]
  >([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    Array<{ startDate: string; endDate: string; changeType?: string | null }>
  >([]);
  const [plannedOpen, setPlannedOpen] = useState(false);
  const [editingPlanned, setEditingPlanned] =
    useState<PlannedEntryInitialValues | null>(null);
  const [plannedRefreshKey, setPlannedRefreshKey] = useState(0);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/project-tasks/${id}`);
    if (!res.ok) {
      setData(null);
      return;
    }
    setData(await res.json());
  }, [id]);

  const fetchOptions = useCallback(async () => {
    const [segmentsRes, employeesData, adjustmentsData] = await Promise.all([
      fetch("/api/project-segments"),
      fetchEmployeesFromStore(),
      fetchAdjustmentsFromStore(),
    ]);
    setSegments(await segmentsRes.json());
    setEmployees(Array.isArray(employeesData) ? employeesData : []);
    setWorkdayAdjustments(
      Array.isArray(adjustmentsData) ? adjustmentsData : [],
    );
  }, [fetchEmployeesFromStore, fetchAdjustmentsFromStore]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      await fetchDetail();
      await fetchOptions();
    })();
  }, [id, fetchDetail, fetchOptions]);

  const onEdit = () => {
    if (!canManageProject) return;
    if (!data) return;
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !data) return;
    form.setFieldsValue({
      name: data.name,
      segmentId: data.segment?.id,
      ownerId: data.owner?.id,
      dueDate: data.dueDate ? dayjs(data.dueDate) : undefined,
    });
  }, [data, form, open]);

  const onSubmit = async (values: FormValues) => {
    if (!canManageProject) return;
    const payload = {
      name: values.name,
      segmentId: values.segmentId,
      ownerId: values.ownerId ?? null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };
    const res = await fetch(`/api/project-tasks/${id}`, {
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
    setDeleting(true);
    const res = await fetch(`/api/project-tasks/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/project-tasks");
  };

  const requestPlannedEntries = useCallback(
    async (params: {
      current: number;
      pageSize: number;
      filters: {
        projectName?: string;
        segmentName?: string;
        taskName?: string;
        ownerName?: string;
        year?: string;
        weekNumber?: string;
      };
    }) => {
      const qs = new URLSearchParams({
        page: String(params.current),
        pageSize: String(params.pageSize),
        taskId: id,
      });

      if (params.filters.projectName)
        qs.set("projectName", params.filters.projectName);
      if (params.filters.segmentName)
        qs.set("segmentName", params.filters.segmentName);
      if (params.filters.taskName) qs.set("taskName", params.filters.taskName);
      if (params.filters.ownerName)
        qs.set("ownerName", params.filters.ownerName);
      if (params.filters.year) qs.set("year", params.filters.year);
      if (params.filters.weekNumber)
        qs.set("weekNumber", params.filters.weekNumber);

      const res = await fetch(`/api/planned-work-entries?${qs.toString()}`);
      if (!res.ok) {
        return { data: [], total: 0 };
      }
      const payload = (await res.json()) as {
        data?: PlannedWorkEntryRow[];
        total?: number;
      };
      return {
        data: Array.isArray(payload.data) ? payload.data : [],
        total: typeof payload.total === "number" ? payload.total : 0,
      };
    },
    [id],
  );

  const toPlannedInitialValues = (
    row: PlannedWorkEntryRow,
  ): PlannedEntryInitialValues => ({
    id: row.id,
    taskId: row.task?.id ?? id,
    yearOption:
      row.yearOption?.value ??
      (row.year !== null && row.year !== undefined ? String(row.year) : ""),
    weekNumberOption:
      row.weekNumberOption?.value ??
      (row.weekNumber !== null && row.weekNumber !== undefined
        ? String(row.weekNumber)
        : ""),
    plannedDays: row.plannedDays,
    monday: Boolean(row.monday),
    tuesday: Boolean(row.tuesday),
    wednesday: Boolean(row.wednesday),
    thursday: Boolean(row.thursday),
    friday: Boolean(row.friday),
    saturday: Boolean(row.saturday),
    sunday: Boolean(row.sunday),
  });

  const handleCreatePlannedEntry = () => {
    if (!canManageProject) return;
    setEditingPlanned(null);
    setPlannedOpen(true);
  };

  const handleEditPlannedEntry = (row: PlannedWorkEntryRow) => {
    if (!canManageProject) return;
    setEditingPlanned(toPlannedInitialValues(row));
    setPlannedOpen(true);
  };

  const handleDeletePlannedEntry = async (entryId: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/planned-work-entries/${entryId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    setPlannedRefreshKey((prev) => prev + 1);
  };

  const handleSubmitPlannedEntry = async (
    payload: PlannedWorkEntryFormPayload,
  ) => {
    if (!canManageProject) return;
    const url = editingPlanned
      ? `/api/planned-work-entries/${editingPlanned.id}`
      : "/api/planned-work-entries";
    const method = editingPlanned ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      messageApi.error(editingPlanned ? "更新失败" : "创建失败");
      return;
    }

    messageApi.success(editingPlanned ? "更新成功" : "创建成功");
    setPlannedOpen(false);
    setEditingPlanned(null);
    setPlannedRefreshKey((prev) => prev + 1);
  };

  const plannedProjectOptions = data?.segment?.project
    ? [{ id: data.segment.project.id, name: data.segment.project.name }]
    : [];

  const plannedTaskOptions = data?.segment
    ? [
        {
          id,
          name: data.name,
          projectId: data.segment.project?.id ?? "",
          segmentId: data.segment.id,
          segmentName: data.segment.name,
        },
      ]
    : [];

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {contextHolder}
      <Card
        title={data?.name || "任务详情"}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={onEdit} disabled={!canManageProject}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除任务「${data?.name ?? ""}」？`}
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
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="所属项目">
                {data.segment?.project ? (
                  <AppLink href={`/projects/${data.segment.project.id}`}>
                    {data.segment.project.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="所属环节">
                {data.segment ? (
                  <AppLink href={`/project-segments/${data.segment.id}`}>
                    {data.segment.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h4 style={{ margin: "0 0 12px" }}>人员配置</h4>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="负责人">
                  {data.owner ? (
                    <AppLink href={`/employees/${data.owner.id}`}>
                      {data.owner.name}
                    </AppLink>
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="负责人职能">
                  {data.owner?.functionOption?.value ? (
                    <SelectOptionTag
                      option={{
                        id: data.owner.functionOption.id ?? "",
                        value: data.owner.functionOption.value,
                        color: data.owner.functionOption.color ?? null,
                      }}
                    />
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
            <div>
              <h4 style={{ margin: "0 0 12px" }}>时间安排</h4>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="截止日期">
                  {data.dueDate
                    ? dayjs(data.dueDate).format("YYYY-MM-DD")
                    : "-"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Space>
        )}
      </Card>

      <Card styles={{ body: { padding: 2 } }}>
        <PlannedWorkEntriesTable
          requestData={requestPlannedEntries}
          onEdit={handleEditPlannedEntry}
          onDelete={(entryId) => {
            void handleDeletePlannedEntry(entryId);
          }}
          headerTitle={<h4 style={{ margin: 0 }}>计划工时记录</h4>}
          toolbarActions={[
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              disabled={!canManageProject}
              onClick={handleCreatePlannedEntry}
            >
              新增计划工时
            </Button>,
          ]}
          workdayAdjustments={workdayAdjustments}
          refreshKey={plannedRefreshKey}
          columnKeys={["name", "year", "weekNumber", "plannedDays", "actions"]}
          actionsDisabled={!canManageProject}
        />
      </Card>

      <Modal
        title={editingPlanned ? "编辑计划工时" : "新增计划工时"}
        open={plannedOpen}
        onCancel={() => {
          setPlannedOpen(false);
          setEditingPlanned(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {data?.segment ? (
          <PlannedWorkEntryForm
            projectOptions={plannedProjectOptions}
            selectedProjectId={data.segment.project?.id}
            disableProjectSelect
            disableSegmentSelect
            disableTaskSelect
            defaultSegmentId={data.segment.id}
            defaultTaskId={id}
            taskOptions={plannedTaskOptions}
            initialValues={editingPlanned}
            onSubmit={async (payload) => {
              await handleSubmitPlannedEntry({
                ...payload,
                taskId: id,
              });
            }}
          />
        ) : null}
      </Modal>

      <Modal
        title="编辑任务"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={(values) => void onSubmit(values)}
        >
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="所属环节"
            name="segmentId"
            rules={[{ required: true }]}
          >
            <Select
              options={segments.map((segment) => ({
                label: `${segment.project?.name ?? ""}-${segment.name}`,
                value: segment.id,
              }))}
            />
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
    </Space>
  );
}
