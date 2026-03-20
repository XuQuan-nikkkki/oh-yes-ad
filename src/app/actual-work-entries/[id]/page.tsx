"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Modal, Popconfirm, Space, Tooltip, message } from "antd";
import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import ActualWorkEntryForm, { ActualWorkEntryFormPayload } from "@/components/project-detail/ActualWorkEntryForm";
import { useEmployeesStore } from "@/stores/employeesStore";

type Detail = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  project?: { id: string; name: string };
  employee?: { id: string; name: string };
};

type ActualWorkEntryRow = {
  id: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string };
};

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; employmentStatus?: string }[]>([]);
  const [dayTotalHours, setDayTotalHours] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const getWorkDateKey = (start: string) => dayjs(start).format("YYYY-MM-DD");

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/actual-work-entries/${id}?projectType=all`);
    if (!res.ok) return setData(null);
    const detail = (await res.json()) as Detail;
    setData(detail);

    if (!detail.employee?.id || !detail.startDate) {
      setDayTotalHours(0);
      return;
    }

    const dayKey = getWorkDateKey(detail.startDate);
    const listRes = await fetch(
      `/api/actual-work-entries?projectType=all&employeeId=${detail.employee.id}&startDate=${dayKey}`,
    );
    if (!listRes.ok) {
      setDayTotalHours(0);
      return;
    }
    const list = (await listRes.json()) as ActualWorkEntryRow[];
    const total = list.reduce((sum, item) => {
        const hours = Math.max(dayjs(item.endDate).diff(dayjs(item.startDate), "minute") / 60, 0);
        return sum + hours;
      }, 0);
    setDayTotalHours(total);
  }, [id]);

  const fetchOptions = async () => {
    const [projectsRes, employeesData] = await Promise.all([
      fetch("/api/projects"),
      fetchEmployeesFromStore(),
    ]);
    setProjects(await projectsRes.json());
    setEmployees(
      Array.isArray(employeesData)
        ? employeesData.map((row) => ({
            id: row.id,
            name: row.name,
            employmentStatus: row.employmentStatus ?? undefined,
          }))
        : [],
    );
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchDetail();
      await fetchOptions();
    })();
  }, [id, fetchDetail]);

  const onSubmit = async (payload: ActualWorkEntryFormPayload) => {
    const res = await fetch(`/api/actual-work-entries/${id}?projectType=all`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        projectType: "all",
      }),
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
    const res = await fetch(`/api/actual-work-entries/${id}?projectType=all`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/actual-work-entries");
  };

  const formatTimeRange = (startDate: string, endDate: string) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (start.isSame(end, "day")) {
      return `${start.format("YYYY-MM-DD HH:mm")}-${end.format("HH:mm")}`;
    }
    const dayDiff = end.startOf("day").diff(start.startOf("day"), "day");
    const daySuffix = dayDiff > 0 ? `(+${dayDiff})` : "";
    return `${start.format("YYYY-MM-DD HH:mm")} - ${end.format("HH:mm")}${daySuffix}`;
  };

  const actualHours =
    data && data.startDate && data.endDate
      ? Math.max(dayjs(data.endDate).diff(dayjs(data.startDate), "minute") / 60, 0)
      : 0;
  const workdayDenominator = dayTotalHours > 7.5 ? dayTotalHours : 7.5;
  const actualWorkdays = workdayDenominator > 0 ? actualHours / workdayDenominator : 0;
  const formatNumber = (value: number, fractionDigits: number) =>
    Number(value.toFixed(fractionDigits)).toString();

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {contextHolder}
      <Card
        title={data?.title || "实际工时详情"}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
              编辑
            </Button>
            <Popconfirm
              title="确定删除这条实际工时记录？"
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
          <Descriptions column={3} size="small">
            <Descriptions.Item label="所属项目">{data.project ? <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink> : "-"}</Descriptions.Item>
            <Descriptions.Item label="人员">
              {data.employee ? (
                <AppLink href={`/employees/${data.employee.id}`}>{data.employee.name}</AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="时间">{formatTimeRange(data.startDate, data.endDate)}</Descriptions.Item>
            <Descriptions.Item
              label="工时(小时)"
            >
              <span>{formatNumber(actualHours, 1)}h</span>
            </Descriptions.Item>
            <Descriptions.Item
              label="工时(天)"
            >
              <Space size={4}>
                <span>{formatNumber(actualWorkdays, 2)}d</span>
                <Tooltip
                  title={`记录时长 ${formatNumber(actualHours, 2)}h，当天总工时 ${formatNumber(workdayDenominator, 2)}h，折合 ${formatNumber(actualWorkdays, 2)}d`}
                >
                  <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Modal title="编辑实际工时" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <ActualWorkEntryForm
          projectOptions={projects}
          employees={employees}
          initialValues={
            data && data.project?.id && data.employee?.id
              ? {
                  id: data.id,
                  projectId: data.project.id,
                  title: data.title,
                  employeeId: data.employee.id,
                  startDate: data.startDate,
                  endDate: data.endDate,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </Space>
  );
}
