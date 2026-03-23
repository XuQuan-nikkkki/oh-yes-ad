"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import PlannedWorkEntriesTable, {
  type PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import ProjectTaskForm, {
  type ProjectTaskFormPayload,
} from "@/components/project-detail/ProjectTaskForm";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectTasksStore } from "@/stores/projectTasksStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";
import { DEFAULT_COLOR } from "@/lib/constants";

type Detail = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
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

type PlannedEntryInitialValues = PlannedWorkEntryFormPayload & { id: string };

export default function ProjectTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [segments, setSegments] = useState<
    { id: string; name: string; project?: { id?: string; name: string } }[]
  >([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustmentRange[]
  >([]);
  const [plannedOpen, setPlannedOpen] = useState(false);
  const [editingPlanned, setEditingPlanned] =
    useState<PlannedEntryInitialValues | null>(null);
  const [plannedRefreshKey, setPlannedRefreshKey] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const fetchEmployeesFromStore = useEmployeesStore(
    (state) => state.fetchEmployees,
  );
  const removeTaskFromStore = useProjectTasksStore((state) => state.removeTask);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/project-tasks/${id}`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [id]);

  const fetchOptions = useCallback(async () => {
    const [employeesData, adjustmentsData] = await Promise.all([
      fetchEmployeesFromStore(),
      fetchAdjustmentsFromStore(),
    ]);
    setEmployees(Array.isArray(employeesData) ? employeesData : []);
    setWorkdayAdjustments(
      Array.isArray(adjustmentsData) ? adjustmentsData : [],
    );
  }, [fetchEmployeesFromStore, fetchAdjustmentsFromStore]);

  const fetchSegments = useCallback(async () => {
    const projectId = data?.segment?.project?.id;
    if (!projectId) {
      setSegments([]);
      return;
    }
    const projectRes = await fetch(`/api/projects/${projectId}`);
    if (!projectRes.ok) {
      setSegments([]);
      return;
    }
    const project = (await projectRes.json()) as {
      name?: string | null;
      segments?: { id: string; name: string }[];
    };
    setSegments(
      (project.segments ?? []).map((segment) => ({
        id: segment.id,
        name: segment.name,
        project: { id: projectId, name: project.name ?? "" },
      })),
    );
  }, [data?.segment?.project?.id]);

  const ensureSegmentsLoaded = useCallback(async () => {
    if (segments.length > 0) return;
    if (!data?.segment?.project?.id) return;
    await fetchSegments();
  }, [data?.segment?.project?.id, fetchSegments, segments.length]);

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
    void (async () => {
      await ensureSegmentsLoaded();
      setOpen(true);
    })();
  };

  const onSubmit = async (payload: ProjectTaskFormPayload) => {
    if (!canManageProject) return;
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
    removeTaskFromStore(id);
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

  const refreshPlannedEntries = useCallback(() => {
    setPlannedRefreshKey((prev) => prev + 1);
  }, []);

  const updatePlannedEntryOption = useCallback(
    async (
      entryId: string,
      field: "yearOption" | "weekNumberOption",
      nextOption: { id: string; value: string; color: string },
    ) => {
      const res = await fetch(`/api/planned-work-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: nextOption.value,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "更新计划工时失败");
      }
    },
    [],
  );

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

  if (loading) {
    return (
      <DetailPageContainer>
        <Card title="任务详情" loading />
      </DetailPageContainer>
    );
  }

  if (!data) {
    return (
      <DetailPageContainer>
        <Card title="任务详情">任务不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={data.name}
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
              disabled={!canManageProject}
            >
              编辑
            </Button>
            <Popconfirm
              title={`确定删除任务「${data.name}」？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => void onDelete()}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!canManageProject}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
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
                <Tag color={data.owner?.functionOption?.color ?? "default"}>
                  {data.owner?.functionOption?.value ?? "-"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>时间安排</h4>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="任务状态">
                <Tag color={data.statusOption?.color ?? "default"}>
                  {data.statusOption?.value ?? data.status ?? "-"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="截止日期">
                {data.dueDate ? dayjs(data.dueDate).format("YYYY-MM-DD") : "-"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </Space>
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
          renderYearCell={(row) => (
            <SelectOptionQuickEditTag
              field="plannedWorkEntry.year"
              option={
                row.yearOption?.value
                  ? {
                      id: row.yearOption.id ?? "",
                      value: row.yearOption.value,
                      color: row.yearOption.color ?? DEFAULT_COLOR,
                    }
                  : null
              }
              fallbackText={
                row.year !== null && row.year !== undefined
                  ? String(row.year)
                  : "-"
              }
              disabled={!canManageProject}
              modalTitle="修改年份"
              modalDescription="勾选只会暂存年份切换。点击保存后会一并保存选项改动、排序和当前计划工时的年份。"
              optionValueLabel="年份"
              saveSuccessText="年份已保存"
              onSaveSelection={async (nextOption) => {
                await updatePlannedEntryOption(
                  row.id,
                  "yearOption",
                  nextOption,
                );
              }}
              onUpdated={refreshPlannedEntries}
            />
          )}
          monthTitle="第 n 周"
          renderMonthCell={(row) => (
            <SelectOptionQuickEditTag
              field="plannedWorkEntry.weekNumber"
              optionSortMode="numeric"
              option={
                row.weekNumberOption?.value
                  ? {
                      id: row.weekNumberOption.id ?? "",
                      value: row.weekNumberOption.value,
                      color: row.weekNumberOption.color ?? DEFAULT_COLOR,
                    }
                  : null
              }
              fallbackText={
                row.weekNumber !== null && row.weekNumber !== undefined
                  ? String(row.weekNumber)
                  : "-"
              }
              disabled={!canManageProject}
              modalTitle="修改周数"
              modalDescription="勾选只会暂存周数切换。点击保存后会一并保存选项改动、排序和当前计划工时的周数。"
              optionValueLabel="周数"
              saveSuccessText="周数已保存"
              onSaveSelection={async (nextOption) => {
                await updatePlannedEntryOption(
                  row.id,
                  "weekNumberOption",
                  nextOption,
                );
              }}
              onUpdated={refreshPlannedEntries}
            />
          )}
          workdayAdjustments={workdayAdjustments}
          refreshKey={plannedRefreshKey}
          columnKeys={[
            "name",
            "year",
            "month",
            "weekNumber",
            "plannedDays",
            "actions",
          ]}
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
        destroyOnHidden
        width={860}
      >
        <ProjectTaskForm
          segmentOptions={segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            projectId: segment.project?.id,
            projectName: segment.project?.name,
          }))}
          employees={employees}
          initialValues={
            data
              ? {
                  id: data.id,
                  name: data.name,
                  segmentId: data.segment?.id,
                  status: data.status ?? null,
                  statusOption: data.statusOption ?? null,
                  owner: data.owner ?? null,
                  dueDate: data.dueDate ?? null,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </DetailPageContainer>
  );
}
