"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { formatDateRange } from "@/lib/date";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { usePlannedWorkEntriesStore } from "@/stores/plannedWorkEntriesStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

dayjs.extend(isoWeek);

type Detail = {
  id: string;
  year?: number | null;
  weekNumber?: number | null;
  yearOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  weekNumberOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  task?: {
    id: string;
    name: string;
    status?: string | null;
    statusOption?: NullableSelectOptionValue;
    owner?: {
      id: string;
      name: string;
      functionOption?: NullableSelectOptionValue;
    } | null;
    segment?: {
      id: string;
      name: string;
      statusOption?: NullableSelectOptionValue;
      project?: { id: string; name: string };
    };
  };
};

type ProjectDetailForTasks = {
  id: string;
  name: string;
  segments?: {
    id: string;
    name: string;
    projectTasks?: {
      id: string;
      name: string;
    }[];
  }[];
};

export default function Page() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManagePlannedWork = useMemo(
    () => canManageProjectResources(roleCodes),
    [roleCodes],
  );
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    {
      id: string;
      name: string;
      projectId: string;
      segmentId?: string;
      segmentName?: string;
    }[]
  >([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const clearEntriesCache = usePlannedWorkEntriesStore(
    (state) => state.clearEntriesCache,
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/planned-work-entries/${id}`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [id]);

  const fetchOptions = useCallback(async () => {
    if (optionsLoaded || optionsLoading) return;
    setOptionsLoading(true);
    try {
      const projectId = data?.task?.segment?.project?.id;
      if (!projectId) {
        setProjects([]);
        setTasks([]);
        setOptionsLoaded(true);
        return;
      }

      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (!projectRes.ok) {
        setProjects([]);
        setTasks([]);
        return;
      }
      const project = (await projectRes.json()) as ProjectDetailForTasks;
      setProjects([{ id: project.id, name: project.name }]);
      const taskRows =
        project.segments?.flatMap((segment) =>
          (segment.projectTasks ?? []).map((task) => ({
            id: task.id,
            name: task.name,
            projectId: project.id,
            segmentId: segment.id,
            segmentName: segment.name,
          })),
        ) ?? [];
      setTasks(taskRows);
      setOptionsLoaded(true);
    } finally {
      setOptionsLoading(false);
    }
  }, [data?.task?.segment?.project?.id, optionsLoaded, optionsLoading]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchDetail();
    })();
  }, [id, fetchDetail]);

  const cb = (checked: boolean) => (
    <Checkbox
      checked={checked}
      onChange={() => {}}
      style={{ pointerEvents: "none" }}
    />
  );
  const yearText =
    data?.yearOption?.value ??
    (data?.year !== null && data?.year !== undefined
      ? String(data.year)
      : null);
  const weekText =
    data?.weekNumberOption?.value ??
    (data?.weekNumber !== null && data?.weekNumber !== undefined
      ? String(data.weekNumber)
      : null);
  const weekDateRange = (() => {
    const year = Number(yearText);
    const week = Number(weekText);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return "-";
    const weekStart = dayjs(`${year}-01-04`)
      .startOf("isoWeek")
      .add(week - 1, "week");
    const weekEnd = weekStart.add(6, "day");
    return formatDateRange({
      start: weekStart.toDate(),
      end: weekEnd.toDate(),
    });
  })();

  const onSubmit = async (payload: PlannedWorkEntryFormPayload) => {
    if (!canManagePlannedWork) return;
    const res = await fetch(`/api/planned-work-entries/${id}`, {
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
    if (!canManagePlannedWork) return;
    setDeleting(true);
    const res = await fetch(`/api/planned-work-entries/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    clearEntriesCache();
    messageApi.success("删除成功");
    router.push("/planned-work-entries");
  };

  const onOpenEdit = async () => {
    if (!canManagePlannedWork) return;
    try {
      await fetchOptions();
      setOpen(true);
    } catch {
      messageApi.error("加载项目和任务失败");
    }
  };

  const updatePlannedEntryYear = async (nextOption: {
    id: string;
    value: string;
    color: string;
  }) => {
    if (!canManagePlannedWork) return;
    const res = await fetch(`/api/planned-work-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yearOption: nextOption.value,
      }),
    });
    if (!res.ok) {
      throw new Error((await res.text()) || "更新年份失败");
    }
  };

  const updatePlannedEntryWeekNumber = async (nextOption: {
    id: string;
    value: string;
    color: string;
  }) => {
    if (!canManagePlannedWork) return;
    const res = await fetch(`/api/planned-work-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekNumberOption: nextOption.value,
      }),
    });
    if (!res.ok) {
      throw new Error((await res.text()) || "更新周数失败");
    }
  };

  if (loading) {
    return (
      <DetailPageContainer>
        <Card title="计划工时详情" loading />
      </DetailPageContainer>
    );
  }

  if (!data) {
    return (
      <DetailPageContainer>
        <Card title="计划工时详情">计划工时记录不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={data.task?.name || "计划工时详情"}
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => void onOpenEdit()}
              loading={optionsLoading}
              disabled={!canManagePlannedWork}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除这条计划工时记录？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void onDelete()}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger loading={deleting} disabled={!canManagePlannedWork}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Space orientation="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>任务信息</h4>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="所属项目">
                {data.task?.segment?.project ? (
                  <AppLink href={`/projects/${data.task.segment.project.id}`}>
                    {data.task.segment.project.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="所属环节">
                {data.task?.segment ? (
                  <AppLink href={`/project-segments/${data.task.segment.id}`}>
                    {data.task.segment.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="所属任务">
                {data.task ? (
                  <AppLink href={`/project-tasks/${data.task.id}`}>
                    {data.task.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="任务状态">
                <Tag color={data.task?.statusOption?.color ?? undefined}>
                  {data.task?.statusOption?.value ?? data.task?.status ?? "-"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div>
            <h4 style={{ margin: "0 0 12px" }}>任务负责人</h4>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="负责人">
                {data.task?.owner ? (
                  <AppLink href={`/employees/${data.task.owner.id}`}>
                    {data.task.owner.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="负责人职能">
                <Tag
                  color={data.task?.owner?.functionOption?.color ?? undefined}
                >
                  {data.task?.owner?.functionOption?.value ?? "-"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div>
            <h4 style={{ margin: "0 0 12px" }}>日期</h4>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="年份">
                {yearText ? (
                  <SelectOptionQuickEditTag
                    field="plannedWorkEntry.year"
                    option={
                      data.yearOption?.value
                        ? {
                            id: data.yearOption.id ?? "",
                            value: data.yearOption.value,
                            color: data.yearOption.color ?? null,
                          }
                        : null
                    }
                    fallbackText={yearText}
                    disabled={!canManagePlannedWork}
                    modalTitle="修改年份"
                    modalDescription="勾选只会暂存年份切换。点击保存后会一并保存选项改动、排序和当前计划工时的年份。"
                    optionValueLabel="年份"
                    saveSuccessText="年份已保存"
                    onSaveSelection={updatePlannedEntryYear}
                    onUpdated={fetchDetail}
                  />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="第n周">
                {weekText ? (
                  <SelectOptionQuickEditTag
                    field="plannedWorkEntry.weekNumber"
                    optionSortMode="numeric"
                    option={
                      data.weekNumberOption?.value
                        ? {
                            id: data.weekNumberOption.id ?? "",
                            value: data.weekNumberOption.value,
                            color: data.weekNumberOption.color ?? null,
                          }
                        : null
                    }
                    fallbackText={weekText}
                    disabled={!canManagePlannedWork}
                    modalTitle="修改周数"
                    modalDescription="勾选只会暂存周数切换。点击保存后会一并保存选项改动、排序和当前计划工时的周数。"
                    optionValueLabel="周数"
                    saveSuccessText="周数已保存"
                    onSaveSelection={updatePlannedEntryWeekNumber}
                    onUpdated={fetchDetail}
                  />
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="当周日期">{weekDateRange}</Descriptions.Item>
            </Descriptions>
          </div>

          <div>
            <h4 style={{ margin: "0 0 12px" }}>时间分配</h4>
            <Descriptions column={4} size="small">
              <Descriptions.Item label="周一">
                {cb(data.monday)}
              </Descriptions.Item>
              <Descriptions.Item label="周二">
                {cb(data.tuesday)}
              </Descriptions.Item>
              <Descriptions.Item label="周三">
                {cb(data.wednesday)}
              </Descriptions.Item>
              <Descriptions.Item label="周四">
                {cb(data.thursday)}
              </Descriptions.Item>
              <Descriptions.Item label="周五">
                {cb(data.friday)}
              </Descriptions.Item>
              <Descriptions.Item label="周六">
                {cb(data.saturday)}
              </Descriptions.Item>
              <Descriptions.Item label="周天">
                {cb(data.sunday)}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div>
            <h4 style={{ margin: "0 0 12px" }}>计划天数</h4>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="工时(天)">{`${data.plannedDays}d`}</Descriptions.Item>
            </Descriptions>
          </div>
        </Space>
      </Card>

      <Modal
        title="编辑计划工时"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <PlannedWorkEntryForm
          projectOptions={projects}
          selectedProjectId={data?.task?.segment?.project?.id}
          disableProjectSelect
          taskOptions={tasks}
          initialValues={{
            id: data.id,
            taskId: data.task?.id ?? "",
            yearOption: data.yearOption?.value ?? String(data.year ?? ""),
            weekNumberOption:
              data.weekNumberOption?.value ?? String(data.weekNumber ?? ""),
            year: data.year ?? undefined,
            weekNumber: data.weekNumber ?? undefined,
            plannedDays: data.plannedDays,
            monday: data.monday,
            tuesday: data.tuesday,
            wednesday: data.wednesday,
            thursday: data.thursday,
            friday: data.friday,
            saturday: data.saturday,
            sunday: data.sunday,
          }}
          onSubmit={onSubmit}
        />
      </Modal>
    </DetailPageContainer>
  );
}
