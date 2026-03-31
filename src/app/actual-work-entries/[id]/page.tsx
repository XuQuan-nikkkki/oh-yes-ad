"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Modal, Popconfirm, Space, Tooltip, message } from "antd";
import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import ActualWorkEntryForm, { ActualWorkEntryFormPayload } from "@/components/project-detail/ActualWorkEntryForm";
import { DATE_FORMAT, DEFAULT_COLOR } from "@/lib/constants";
import { formatDate, formatDateRange } from "@/lib/date";
import { canManageProjectResources } from "@/lib/role-permissions";
import { useActualWorkEntriesStore } from "@/stores/actualWorkEntriesStore";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string; employmentStatus?: string }[]>([]);
  const [dayTotalHours, setDayTotalHours] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageAnyActualWorkEntry = canManageProjectResources(roleCodes);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const clearEntriesCache = useActualWorkEntriesStore(
    (state) => state.clearEntriesCache,
  );
  const getWorkDateKey = (start: string) => formatDate(start, DATE_FORMAT, "");

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/actual-work-entries/${id}?projectType=all`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    const detail = (await res.json()) as Detail;
    setData(detail);

    if (!detail.employee?.id || !detail.startDate) {
      setDayTotalHours(0);
      setLoading(false);
      return;
    }

    const dayKey = getWorkDateKey(detail.startDate);
    const listRes = await fetch(
      `/api/actual-work-entries?projectType=all&employeeId=${detail.employee.id}&startDate=${dayKey}`,
    );
    if (!listRes.ok) {
      setDayTotalHours(0);
      setLoading(false);
      return;
    }
    const list = (await listRes.json()) as ActualWorkEntryRow[];
    const total = list.reduce((sum, item) => {
        const hours = Math.max(dayjs(item.endDate).diff(dayjs(item.startDate), "minute") / 60, 0);
        return sum + hours;
      }, 0);
    setDayTotalHours(total);
    setLoading(false);
  }, [id]);

  const fetchEmployees = async () => {
    const employeesData = await fetchEmployeesFromStore();
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
    const timer = window.setTimeout(() => {
      void fetchDetail();
    }, 0);
    return () => window.clearTimeout(timer);
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
    clearEntriesCache();
    messageApi.success("删除成功");
    router.push("/actual-work-entries");
  };

  const handleOpenEdit = async () => {
    await fetchEmployees();
    setOpen(true);
  };

  const formatTimeRange = (startDate: string, endDate: string) => {
    return formatDateRange({
      start: startDate,
      end: endDate,
      withTime: true,
      separator: " - ",
      compactEndTimeOnSameDay: true,
      showDayOffset: true,
    });
  };

  const actualHours =
    data && data.startDate && data.endDate
      ? Math.max(dayjs(data.endDate).diff(dayjs(data.startDate), "minute") / 60, 0)
      : 0;
  const workdayDenominator = dayTotalHours > 7.5 ? dayTotalHours : 7.5;
  const actualWorkdays = workdayDenominator > 0 ? actualHours / workdayDenominator : 0;
  const formatNumber = (value: number, fractionDigits: number) =>
    Number(value.toFixed(fractionDigits)).toString();
  const canManageEntry =
    canManageAnyActualWorkEntry ||
    (Boolean(currentUser?.id) && data?.employee?.id === currentUser?.id);

  if (loading) {
    return (
      <DetailPageContainer>
        <Card title="实际工时详情" loading />
      </DetailPageContainer>
    );
  }

  if (!data) {
    return (
      <DetailPageContainer>
        <Card title="实际工时详情">实际工时记录不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={data.title}
        extra={
          canManageEntry ? (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => void handleOpenEdit()}>
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
          ) : null
        }
      >
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
                  <InfoCircleOutlined style={{ color: DEFAULT_COLOR }} />
                </Tooltip>
              </Space>
            </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal title="编辑实际工时" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <ActualWorkEntryForm
          projectOptions={data?.project ? [{ id: data.project.id, name: data.project.name }] : []}
          selectedProjectId={data?.project?.id}
          disableProjectSelect
          employees={employees}
          initialValues={
            data.project?.id && data.employee?.id
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
    </DetailPageContainer>
  );
}
