"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, Descriptions, Modal, Popconfirm, Space, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import AppLink from "@/components/AppLink";
import PlannedWorkEntryForm, { PlannedWorkEntryFormPayload } from "@/components/project-detail/PlannedWorkEntryForm";
import SelectOptionTag from "@/components/SelectOptionTag";

dayjs.extend(isoWeek);

type SelectOptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null;

const toSelectOptionTagOption = (
  option: SelectOptionValue,
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
      functionOption?: SelectOptionValue;
    } | null;
    segment?: {
      id: string;
      name: string;
      statusOption?: SelectOptionValue;
      project?: { id: string; name: string };
    };
  };
};

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    { id: string; name: string; projectId: string; segmentId?: string; segmentName?: string }[]
  >([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/planned-work-entries/${id}`);
    if (!res.ok) return setData(null);
    setData(await res.json());
  }, [id]);

  const fetchOptions = useCallback(async () => {
    if (optionsLoaded || optionsLoading) return;
    setOptionsLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/project-tasks"),
      ]);
      const projectList = await projectsRes.json();
      const taskList = await tasksRes.json();
      setProjects(projectList);
      setTasks(
        taskList.map(
          (task: {
            id: string;
            name: string;
            segment?: { id?: string; name?: string; project?: { id: string } };
          }) => ({
            id: task.id,
            name: task.name,
            projectId: task.segment?.project?.id,
            segmentId: task.segment?.id,
            segmentName: task.segment?.name,
          }),
        ),
      );
      setOptionsLoaded(true);
    } finally {
      setOptionsLoading(false);
    }
  }, [optionsLoaded, optionsLoading]);

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
      message.error("更新失败");
      return;
    }
    message.success("更新成功");
    setOpen(false);
    await fetchDetail();
  };

  const onDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      message.error("删除失败");
      return;
    }
    message.success("删除成功");
    router.push("/planned-work-entries");
  };

  const onOpenEdit = async () => {
    try {
      await fetchOptions();
      setOpen(true);
    } catch {
      message.error("加载项目和任务失败");
    }
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card
        title={data?.task?.name || "计划工时详情"}
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
        {data && (
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
                  <SelectOptionTag
                    option={toSelectOptionTagOption(data.task?.owner?.functionOption ?? null)}
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
                              color: "#d9d9d9",
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
        )}
      </Card>

      <Modal title="编辑计划工时" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <PlannedWorkEntryForm
          projectOptions={projects}
          taskOptions={tasks}
          initialValues={
            data
              ? {
                  id: data.id,
                  taskId: data.task?.id ?? "",
                  yearOption: data.yearOption?.value ?? String(data.year ?? ""),
                  weekNumberOption: data.weekNumberOption?.value ?? String(data.weekNumber ?? ""),
                  plannedDays: data.plannedDays,
                  monday: data.monday,
                  tuesday: data.tuesday,
                  wednesday: data.wednesday,
                  thursday: data.thursday,
                  friday: data.friday,
                  saturday: data.saturday,
                  sunday: data.sunday,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </Space>
  );
}
