"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, Descriptions, Modal, Popconfirm, Space, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { DEFAULT_COLOR } from "@/lib/constants";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import EmployeeFunctionValue from "@/components/employee/EmployeeFunctionValue";
import PlannedWorkEntryForm, { PlannedWorkEntryFormPayload } from "@/components/project-detail/PlannedWorkEntryForm";
import SelectOptionTag from "@/components/SelectOptionTag";
import type { NullableSelectOptionValue } from "@/types/selectOption";

dayjs.extend(isoWeek);

const toSelectOptionTagOption = (
  option: NullableSelectOptionValue,
): { id: string; value: string; color?: string | null } | null => {
  if (!option?.id || !option.value) return null;
  return {
    id: option.id,
    value: option.value,
    color: option.color ?? null,
  };
};

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
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    { id: string; name: string; projectId: string; segmentId?: string; segmentName?: string }[]
  >([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

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

  const cb = (checked: boolean) => <Checkbox checked={checked} onChange={() => {}} style={{ pointerEvents: "none" }} />;
  const yearText = data?.yearOption?.value ?? (data?.year !== null && data?.year !== undefined ? String(data.year) : null);
  const weekText =
    data?.weekNumberOption?.value ??
    (data?.weekNumber !== null && data?.weekNumber !== undefined
      ? String(data.weekNumber)
      : null);
  const weekDateRange = (() => {
    const year = Number(yearText);
    const week = Number(weekText);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return "-";
    const weekStart = dayjs(`${year}-01-04`).startOf("isoWeek").add(week - 1, "week");
    const weekEnd = weekStart.add(6, "day");
    return `${weekStart.format("YYYY/MM/DD")} - ${weekEnd.format("YYYY/MM/DD")}`;
  })();

  const onSubmit = async (payload: PlannedWorkEntryFormPayload) => {
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
    setDeleting(true);
    const res = await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/planned-work-entries");
  };

  const onOpenEdit = async () => {
    try {
      await fetchOptions();
      setOpen(true);
    } catch {
      messageApi.error("加载项目和任务失败");
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
            <Button icon={<EditOutlined />} onClick={() => void onOpenEdit()} loading={optionsLoading}>
              编辑
            </Button>
            <Popconfirm
              title="确定删除这条计划工时记录？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void onDelete()}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger loading={deleting}>
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
                <Descriptions.Item label="环节状态">
                  <SelectOptionTag
                    option={toSelectOptionTagOption(data.task?.segment?.statusOption ?? null)}
                  />
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
                  <EmployeeFunctionValue
                    functionOption={data.task?.owner?.functionOption}
                  />
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <h4 style={{ margin: "0 0 12px" }}>日期</h4>
              <Descriptions column={3} size="small">
                <Descriptions.Item label="年份">
                  {data.yearOption?.value ? (
                    <SelectOptionTag
                      option={{
                        id: data.yearOption.id ?? "",
                        value: data.yearOption.value,
                        color: data.yearOption.color ?? null,
                      }}
                    />
                  ) : data.year !== null && data.year !== undefined ? (
                    String(data.year)
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="第n周">
                  {weekText ? (
                    <SelectOptionTag
                      option={
                        data.weekNumberOption?.value
                          ? {
                              id: data.weekNumberOption.id ?? "",
                              value: data.weekNumberOption.value,
                              color: data.weekNumberOption.color ?? null,
                            }
                          : {
                              id: "",
                              value: weekText,
                              color: DEFAULT_COLOR,
                            }
                      }
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
                <Descriptions.Item label="周一">{cb(data.monday)}</Descriptions.Item>
                <Descriptions.Item label="周二">{cb(data.tuesday)}</Descriptions.Item>
                <Descriptions.Item label="周三">{cb(data.wednesday)}</Descriptions.Item>
                <Descriptions.Item label="周四">{cb(data.thursday)}</Descriptions.Item>
                <Descriptions.Item label="周五">{cb(data.friday)}</Descriptions.Item>
                <Descriptions.Item label="周六">{cb(data.saturday)}</Descriptions.Item>
                <Descriptions.Item label="周天">{cb(data.sunday)}</Descriptions.Item>
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

      <Modal title="编辑计划工时" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <PlannedWorkEntryForm
          projectOptions={projects}
          selectedProjectId={data?.task?.segment?.project?.id}
          disableProjectSelect
          taskOptions={tasks}
          initialValues={
            {
              id: data.id,
              taskId: data.task?.id ?? "",
              yearOption: data.yearOption?.value ?? String(data.year ?? ""),
              weekNumberOption:
                data.weekNumberOption?.value ?? String(data.weekNumber ?? ""),
              plannedDays: data.plannedDays,
              monday: data.monday,
              tuesday: data.tuesday,
              wednesday: data.wednesday,
              thursday: data.thursday,
              friday: data.friday,
              saturday: data.saturday,
              sunday: data.sunday,
            }
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </DetailPageContainer>
  );
}
