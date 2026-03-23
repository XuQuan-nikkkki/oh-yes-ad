"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/zh-cn";
import { DEFAULT_COLOR } from "@/lib/constants";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import EmployeesTable, { type Employee } from "@/components/EmployeesTable";
import ClientContactTable from "@/components/ClientContactTable";
import VendorsTable, { type Vendor } from "@/components/VendorsTable";
import ProjectDocumentsTable, {
  type ProjectDocumentRow,
} from "@/components/ProjectDocumentsTable";
import ProjectDocumentForm, {
  type ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";
import type { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";

dayjs.extend(isoWeek);
dayjs.locale("zh-cn");

type ClientContact = {
  id: string;
  name: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
};

type MilestoneDetail = {
  id: string;
  name: string;
  typeOption?: NullableSelectOptionValue;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME" | null;
  type?: string | null;
  date?: string | null;
  location?: string | null;
  methodOption?: NullableSelectOptionValue;
  method?: string | null;
  project?: { id: string; name: string } | null;
  internalParticipants?: Employee[];
  vendorParticipants?: Vendor[];
  clientParticipants?: ClientContact[];
  documents?: ProjectDocumentRow[];
};

type FormValues = {
  name: string;
  projectId: string;
  type?: SelectOptionSelectorValue;
  includeTime?: boolean;
  isRange?: boolean;
  startAt?: dayjs.Dayjs;
  endAt?: dayjs.Dayjs;
  location?: string;
  method?: SelectOptionSelectorValue;
};

type ProjectContext = {
  members: Employee[];
  vendors: Vendor[];
  clientContacts: ClientContact[];
};

const EMPTY_CONTEXT: ProjectContext = {
  members: [],
  vendors: [],
  clientContacts: [],
};

const WEEKDAY_MAP = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const getCountdownWeekday = (target: dayjs.Dayjs) => {
  const now = dayjs();
  const weekday = WEEKDAY_MAP[target.day()] ?? "";
  const currentWeek = now.isoWeek();
  const currentWeekYear = now.isoWeekYear();
  const targetWeek = target.isoWeek();
  const targetWeekYear = target.isoWeekYear();

  if (targetWeekYear === currentWeekYear && targetWeek === currentWeek) {
    return `本${weekday}`;
  }
  const nextWeek = now.add(1, "week");
  if (
    targetWeekYear === nextWeek.isoWeekYear() &&
    targetWeek === nextWeek.isoWeek()
  ) {
    return `下${weekday}`;
  }
  return weekday;
};

const resolveStart = (milestone?: MilestoneDetail | null) =>
  milestone?.startAt ?? milestone?.date ?? null;
const resolveEnd = (milestone?: MilestoneDetail | null) =>
  milestone?.endAt ?? null;
const isRange = (start?: string | null, end?: string | null) =>
  Boolean(start && end && dayjs(start).valueOf() !== dayjs(end).valueOf());

const formatDateByPrecision = (milestone?: MilestoneDetail | null) => {
  const start = resolveStart(milestone);
  const end = resolveEnd(milestone);
  if (!start) return "-";
  const withTime = milestone?.datePrecision === "DATETIME";
  const fmt = withTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD";
  const startText = dayjs(start).format(fmt);
  if (!isRange(start, end)) return startText;
  return `${startText} ~ ${dayjs(end).format(fmt)}`;
};

const formatCountdown = (milestone?: MilestoneDetail | null) => {
  const start = resolveStart(milestone);
  const end = resolveEnd(milestone);
  if (!start) return { text: "-", color: "default" as const };

  const startTime = dayjs(start);
  if (!startTime.isValid()) return { text: "-", color: "default" as const };

  const withTime = milestone?.datePrecision === "DATETIME";
  const fmt = withTime ? "YYYY年MM月DD日 HH:mm" : "YYYY年MM月DD日";
  const rangeText = isRange(start, end)
    ? `${startTime.format(fmt)} ~ ${dayjs(end).format(fmt)}`
    : startTime.format(fmt);

  if (isRange(start, end) && end) {
    const endTime = dayjs(end);
    if (withTime) {
      if (dayjs().isAfter(endTime))
        return { text: rangeText, color: "default" as const };
      if (dayjs().isAfter(startTime))
        return { text: `${rangeText}，进行中`, color: "processing" as const };
      const dayDiff = startTime
        .startOf("day")
        .diff(dayjs().startOf("day"), "day");
      return {
        text: `${rangeText}，还有 ${dayDiff} 天`,
        color: dayDiff <= 3 ? "error" : ("success" as const),
      };
    }
    if (dayjs().startOf("day").isAfter(endTime.startOf("day"))) {
      return { text: rangeText, color: "default" as const };
    }
    if (!dayjs().startOf("day").isBefore(startTime.startOf("day"))) {
      return { text: `${rangeText}，进行中`, color: "processing" as const };
    }
    const dayDiff = startTime
      .startOf("day")
      .diff(dayjs().startOf("day"), "day");
    return {
      text: `${rangeText}，还有 ${dayDiff} 天`,
      color: dayDiff <= 3 ? "error" : ("success" as const),
    };
  }

  const dayDiff = startTime.startOf("day").diff(dayjs().startOf("day"), "day");
  const baseText = `${startTime.format(fmt)} ${getCountdownWeekday(startTime)}`;
  if (
    withTime
      ? startTime.isBefore(dayjs())
      : startTime.startOf("day").isBefore(dayjs().startOf("day"))
  ) {
    return { text: baseText, color: "default" as const };
  }
  return {
    text: `${baseText}，还有 ${dayDiff} 天`,
    color: dayDiff <= 3 ? "error" : ("success" as const),
  };
};

const normalizeTagOption = (option?: NullableSelectOptionValue) => {
  if (!option?.value) return null;
  return {
    id: option.id ?? "",
    value: option.value,
    color: option.color ?? null,
  };
};

const mapStoreMilestoneToDetail = (
  row: ProjectMilestoneRow,
): MilestoneDetail => ({
  id: row.id,
  name: row.name,
  typeOption: row.typeOption ?? null,
  startAt: row.startAt ?? null,
  endAt: row.endAt ?? null,
  datePrecision: row.datePrecision ?? null,
  type: row.type ?? null,
  date: row.date ?? null,
  location: row.location ?? null,
  methodOption: row.methodOption ?? null,
  method: row.method ?? null,
  project: row.project
    ? {
        id: row.project.id,
        name: row.project.name,
      }
    : null,
});

const isEmployeeActive = (employee: Employee) =>
  employee.employmentStatus !== "离职" &&
  employee.employmentStatusOption?.value !== "离职";

const getEmployeeFunctionName = (employee: Employee) =>
  employee.functionOption?.value?.trim() ||
  employee.function?.trim() ||
  "未设置职能";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const cachedMilestone = useProjectMilestonesStore((state) =>
    id ? state.byId[id] : undefined,
  );
  const removeMilestoneFromStore = useProjectMilestonesStore(
    (state) => state.removeMilestone,
  );

  const [data, setData] = useState<MilestoneDetail | null>(
    cachedMilestone ? mapStoreMilestoneToDetail(cachedMilestone) : null,
  );
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ProjectContext>(EMPTY_CONTEXT);
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);
  const [contextClientId, setContextClientId] = useState<string | null>(null);
  const [clientContactsProjectId, setClientContactsProjectId] = useState<
    string | null
  >(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [clientAddOpen, setClientAddOpen] = useState(false);
  const [vendorAddOpen, setVendorAddOpen] = useState(false);
  const [documentAddOpen, setDocumentAddOpen] = useState(false);

  const [pendingInternalIds, setPendingInternalIds] = useState<string[]>([]);
  const [pendingClientIds, setPendingClientIds] = useState<string[]>([]);
  const [pendingVendorIds, setPendingVendorIds] = useState<string[]>([]);
  const [savingRelation, setSavingRelation] = useState(false);
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorPageSize, setVendorPageSize] = useState(10);

  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );

  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectMilestone.type"] ?? [];
  const methodOptions = optionsByField["projectMilestone.method"] ?? [];

  const fetchDetail = useCallback(async () => {
    if (!id) return null;
    setLoading(true);
    try {
      const res = await fetch(`/api/project-milestones/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
        }
        return null;
      }
      const detail = (await res.json()) as MilestoneDetail;
      setData(detail);
      return detail;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchProjects = useCallback(async () => {
    const rows = await fetchProjectsFromStore();
    setProjects(
      Array.isArray(rows)
        ? rows.filter((item): item is { id: string; name: string } =>
            Boolean(item?.id && item?.name),
          )
        : [],
    );
  }, [fetchProjectsFromStore]);

  const refreshAll = useCallback(async () => {
    const detail = await fetchDetail();
    if (!detail?.project?.id) {
      setContext(EMPTY_CONTEXT);
      setContextProjectId(null);
      setContextClientId(null);
      setClientContactsProjectId(null);
    }
    await fetchAllOptions();
  }, [fetchAllOptions, fetchDetail]);

  useEffect(() => {
    if (!id) return;
    void refreshAll();
  }, [id, refreshAll]);

  useEffect(() => {
    if (!cachedMilestone) return;
    const seeded = mapStoreMilestoneToDetail(cachedMilestone);
    setData((previous) => {
      if (!previous) return seeded;
      if (previous.id !== seeded.id) return seeded;
      return {
        ...seeded,
        ...previous,
      };
    });
  }, [cachedMilestone]);

  useEffect(() => {
    setVendorPage(1);
  }, [data?.vendorParticipants?.length]);

  const updateMilestone = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/project-milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await refreshAll();
    },
    [id, refreshAll],
  );

  const onEdit = () => {
    if (!canManageProject) return;
    if (!data) return;
    if (projects.length === 0) {
      void fetchProjects();
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !data) return;
    const start = resolveStart(data);
    const end = resolveEnd(data);
    form.setFieldsValue({
      name: data.name,
      projectId: data.project?.id,
      type: data.typeOption?.value ?? data.type ?? undefined,
      includeTime: data.datePrecision === "DATETIME",
      isRange: isRange(start, end),
      startAt: start ? dayjs(start) : undefined,
      endAt: end ? dayjs(end) : undefined,
      location: data.location ?? undefined,
      method: data.methodOption?.value ?? data.method ?? undefined,
    });
  }, [data, form, open]);

  const ensureProjectContextLoaded = useCallback(async () => {
    const projectId = data?.project?.id;
    if (!projectId) return;
    if (contextProjectId === projectId) return;

    const projectRes = await fetch(`/api/projects/${projectId}`);
    if (!projectRes.ok) {
      setContext(EMPTY_CONTEXT);
      setContextProjectId(null);
      setContextClientId(null);
      setClientContactsProjectId(null);
      return;
    }

    const project = (await projectRes.json()) as {
      members?: Employee[];
      vendors?: Vendor[];
      client?: { id: string } | null;
    };
    setContext({
      members: project.members ?? [],
      vendors: project.vendors ?? [],
      clientContacts: [],
    });
    setContextProjectId(projectId);
    setContextClientId(project.client?.id ?? null);
    setClientContactsProjectId(null);
  }, [contextProjectId, data?.project?.id]);

  const ensureClientContactsLoaded = useCallback(async () => {
    const projectId = data?.project?.id;
    if (!projectId) return;

    await ensureProjectContextLoaded();

    if (clientContactsProjectId === projectId) return;
    if (!contextClientId) {
      setClientContactsProjectId(projectId);
      return;
    }

    const clientRes = await fetch(
      `/api/client-contacts?clientId=${contextClientId}`,
    );
    const clientContacts = clientRes.ok
      ? ((await clientRes.json()) as ClientContact[])
      : [];
    setContext((previous) => ({
      ...previous,
      clientContacts,
    }));
    setClientContactsProjectId(projectId);
  }, [
    clientContactsProjectId,
    contextClientId,
    data?.project?.id,
    ensureProjectContextLoaded,
  ]);

  const onSubmit = async (values: FormValues) => {
    try {
      const start = values.startAt;
      const end =
        values.isRange &&
        values.endAt &&
        !(values.startAt && values.startAt.valueOf() === values.endAt.valueOf())
          ? values.endAt
          : null;
      const toPayloadDate = (value?: dayjs.Dayjs | null) => {
        if (!value) return null;
        return values.includeTime
          ? value.toISOString()
          : value.format("YYYY-MM-DD");
      };
      await updateMilestone({
        name: values.name,
        projectId: values.projectId,
        type: values.type ?? null,
        startAt: toPayloadDate(start),
        endAt: toPayloadDate(end),
        datePrecision: values.includeTime ? "DATETIME" : "DATE",
        location: values.location ?? null,
        method: values.method ?? null,
      });
      await fetchAllOptions(true);
      messageApi.success("更新成功");
      setOpen(false);
    } catch {
      messageApi.error("更新失败");
    }
  };

  const onDelete = async () => {
    if (!canManageProject) return;
    setDeleting(true);
    const res = await fetch(`/api/project-milestones/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    removeMilestoneFromStore(id);
    messageApi.success("删除成功");
    router.push("/project-milestones");
  };

  const internalIds = useMemo(
    () => (data?.internalParticipants ?? []).map((item) => item.id),
    [data?.internalParticipants],
  );
  const clientIds = useMemo(
    () => (data?.clientParticipants ?? []).map((item) => item.id),
    [data?.clientParticipants],
  );
  const vendorIds = useMemo(
    () => (data?.vendorParticipants ?? []).map((item) => item.id),
    [data?.vendorParticipants],
  );

  const internalCandidates = useMemo(
    () =>
      context.members.filter(
        (item) => !internalIds.includes(item.id) && isEmployeeActive(item),
      ),
    [context.members, internalIds],
  );
  const internalCandidateGroupedOptions = useMemo(() => {
    const groups = new Map<string, Array<{ label: string; value: string }>>();
    for (const item of internalCandidates) {
      const groupLabel = getEmployeeFunctionName(item);
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }
      groups.get(groupLabel)?.push({
        label: item.name,
        value: item.id,
      });
    }
    return Array.from(groups.entries()).map(([label, options]) => ({
      label,
      options,
    }));
  }, [internalCandidates]);
  const clientCandidates = useMemo(
    () => context.clientContacts.filter((item) => !clientIds.includes(item.id)),
    [context.clientContacts, clientIds],
  );
  const vendorCandidates = useMemo(
    () => context.vendors.filter((item) => !vendorIds.includes(item.id)),
    [context.vendors, vendorIds],
  );
  const hasProjectVendors =
    (data?.vendorParticipants?.length ?? 0) > 0 ||
    context.vendors.length > 0 ||
    Boolean(data?.project?.id);
  const countdown = formatCountdown(data);

  const updateRelationWithLoading = async (task: () => Promise<void>) => {
    try {
      setSavingRelation(true);
      await task();
      messageApi.success("更新成功");
    } catch {
      messageApi.error("更新失败");
    } finally {
      setSavingRelation(false);
    }
  };

  const onCreateDocument = async (payload: ProjectDocumentFormPayload) => {
    if (!canManageProject) return;
    const projectId = data?.project?.id;
    if (!projectId) {
      messageApi.error("当前里程碑缺少所属项目");
      return;
    }
    const res = await fetch("/api/project-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        projectId,
        milestoneId: id,
        typeOption: payload.typeOption ?? null,
        date: payload.date ?? null,
        isFinal: Boolean(payload.isFinal),
        internalLink: payload.internalLink ?? null,
      }),
    });
    if (!res.ok) {
      messageApi.error("新建资料失败");
      return;
    }
    messageApi.success("新建资料成功");
    setDocumentAddOpen(false);
    await refreshAll();
  };

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        loading={loading && !data}
        title={data?.name || "里程碑详情"}
        extra={
          <Space>
            {canManageProject ? (
              <>
                <Button icon={<EditOutlined />} onClick={onEdit}>
                  编辑
                </Button>
                <Popconfirm
                  title={`确定删除里程碑「${data?.name ?? ""}」？`}
                  icon={<DeleteOutlined />}
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => void onDelete()}
                  okButtonProps={{ danger: true, loading: deleting }}
                >
                  <Button danger loading={deleting}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            ) : null}
          </Space>
        }
      >
        {data ? (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="项目">
              {data.project ? (
                <AppLink href={`/projects/${data.project.id}`}>
                  {data.project.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              <SelectOptionQuickEditTag
                field="projectMilestone.type"
                option={normalizeTagOption(data.typeOption)}
                disabled={!canManageProject}
                modalTitle="修改里程碑类型"
                modalDescription="勾选只会暂存类型切换。点击保存后会一并保存选项改动、排序和里程碑类型。"
                optionValueLabel="类型值"
                saveSuccessText="里程碑类型已保存"
                fallbackText={data.type ?? "-"}
                onSaveSelection={async (nextOption) => {
                  const res = await fetch(`/api/project-milestones/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: nextOption,
                    }),
                  });
                  if (!res.ok) {
                    throw new Error((await res.text()) || "更新里程碑类型失败");
                  }
                }}
                onUpdated={refreshAll}
              />
            </Descriptions.Item>
            <Descriptions.Item label="日期">
              {formatDateByPrecision(data)}
            </Descriptions.Item>
            <Descriptions.Item label="倒计时">
              <Tag color={countdown.color} style={{ margin: 0 }}>
                {countdown.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="方式">
              <SelectOptionQuickEditTag
                field="projectMilestone.method"
                option={normalizeTagOption(data.methodOption)}
                disabled={!canManageProject}
                modalTitle="修改里程碑方式"
                modalDescription="勾选只会暂存方式切换。点击保存后会一并保存选项改动、排序和里程碑方式。"
                optionValueLabel="方式值"
                saveSuccessText="里程碑方式已保存"
                fallbackText={data.method ?? "-"}
                onSaveSelection={async (nextOption) => {
                  const res = await fetch(`/api/project-milestones/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      method: nextOption,
                    }),
                  });
                  if (!res.ok) {
                    throw new Error((await res.text()) || "更新里程碑方式失败");
                  }
                }}
                onUpdated={refreshAll}
              />
            </Descriptions.Item>
            <Descriptions.Item label="地点">
              {data.location ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Card>

      <Card styles={{ body: { padding: 2 } }}>
        <EmployeesTable
          headerTitle={<h4 style={{ margin: 0 }}>内部参与人员</h4>}
          employees={data?.internalParticipants ?? []}
          roleOptions={[]}
          columnKeys={["name", "function", "actions"]}
          actionsDisabled={!canManageProject}
          loading={loading}
          onDelete={(employeeId) => {
            void updateRelationWithLoading(async () => {
              await updateMilestone({
                internalParticipantIds: internalIds.filter(
                  (item) => item !== employeeId,
                ),
              });
            });
          }}
          actionDeleteText="移除"
          actionDeleteTitle="确定移除该内部参与人员？"
          showColumnSetting={false}
          toolbarActions={[
            ...(canManageProject
              ? [
                  <Button
                    key="add-internal"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      void ensureProjectContextLoaded().then(() => {
                        setInternalAddOpen(true);
                      });
                    }}
                  >
                    添加
                  </Button>,
                ]
              : []),
          ]}
        />
      </Card>

      <Card styles={{ body: { padding: 2 } }}>
        <ClientContactTable
          contacts={data?.clientParticipants ?? []}
          loading={loading}
          onDelete={(contactId) => {
            void updateRelationWithLoading(async () => {
              await updateMilestone({
                clientParticipantIds: clientIds.filter(
                  (item) => item !== contactId,
                ),
              });
            });
          }}
          actionDeleteText="移除"
          actionDeleteTitle="确定移除该客户参与人员？"
          columnKeys={["name", "title", "scope", "preference", "actions"]}
          headerTitle={<h4 style={{ margin: 0 }}>客户参与人员</h4>}
          enableColumnSetting={false}
          toolbarActions={[
            ...(canManageProject
              ? [
                  <Button
                    key="add-client"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      void ensureClientContactsLoaded().then(() => {
                        setClientAddOpen(true);
                      });
                    }}
                  >
                    添加
                  </Button>,
                ]
              : []),
          ]}
        />
      </Card>

      {hasProjectVendors ? (
        <Card styles={{ body: { padding: 2 } }}>
          <VendorsTable
            headerTitle={<h4 style={{ margin: 0 }}>合作供应商</h4>}
            vendors={data?.vendorParticipants ?? []}
            loading={loading}
            current={vendorPage}
            pageSize={vendorPageSize}
            onPageChange={(nextPage, nextPageSize) => {
              setVendorPage(nextPage);
              setVendorPageSize(nextPageSize);
            }}
            onDelete={(vendorId) => {
              void updateRelationWithLoading(async () => {
                await updateMilestone({
                  vendorParticipantIds: vendorIds.filter(
                    (item) => item !== vendorId,
                  ),
                });
              });
            }}
            actionDeleteText="移除"
            actionDeleteTitle="确定移除该供应商？"
            columnKeys={[
              "name",
              "vendorType",
              "businessType",
              "serviceRange",
              "actions",
            ]}
            showColumnSetting={false}
            toolbarActions={[
              ...(canManageProject
                ? [
                    <Button
                      key="add-vendor"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        void ensureProjectContextLoaded().then(() => {
                          setVendorAddOpen(true);
                        });
                      }}
                    >
                      添加
                    </Button>,
                  ]
                : []),
            ]}
          />
        </Card>
      ) : null}

      <Card styles={{ body: { padding: 2 } }}>
        <ProjectDocumentsTable
          rows={data?.documents ?? []}
          loading={loading}
          actionsDisabled={!canManageProject}
          onDelete={(documentId) => {
            if (!canManageProject) return;
            void updateRelationWithLoading(async () => {
              const res = await fetch(`/api/project-documents/${documentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ milestoneId: null }),
              });
              if (!res.ok) {
                throw new Error("failed");
              }
              await refreshAll();
            });
          }}
          actionDeleteText="移除"
          actionDeleteTitle="确定移除该关联资料？"
          columnKeys={[
            "name",
            "type",
            "date",
            "isFinal",
            "internalLink",
            "actions",
          ]}
          headerTitle={<h4 style={{ margin: 0 }}>相关资料</h4>}
          showColumnSetting={false}
          toolbarActions={[
            ...(canManageProject
              ? [
                  <Button
                    key="add-document"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setDocumentAddOpen(true)}
                  >
                    新建资料
                  </Button>,
                ]
              : []),
          ]}
        />
      </Card>

      <Modal
        title="编辑里程碑"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          form={form}
          onValuesChange={(changedValues) => {
            if ("isRange" in changedValues && !changedValues.isRange) {
              form.setFieldValue("endAt", undefined);
            }
          }}
          onFinish={(values) => void onSubmit(values)}
        >
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="所属项目"
            name="projectId"
            rules={[{ required: true }]}
          >
            <Select
              options={projects.map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: "请选择类型" }]}
          >
            <SelectOptionSelector
              placeholder="请选择或新增类型"
              options={typeOptions.map((item) => ({
                label: item.value,
                value: item.value,
                color: item.color ?? DEFAULT_COLOR,
              }))}
            />
          </Form.Item>
          <Space style={{ marginBottom: 12 }}>
            <Form.Item name="includeTime" valuePropName="checked" noStyle>
              <Checkbox>包含时间</Checkbox>
            </Form.Item>
            <Form.Item name="isRange" valuePropName="checked" noStyle>
              <Checkbox>时间段</Checkbox>
            </Form.Item>
          </Space>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) =>
              prev.includeTime !== next.includeTime ||
              prev.isRange !== next.isRange
            }
          >
            {({ getFieldValue }) => {
              const includeTime = Boolean(getFieldValue("includeTime"));
              const isRangeValue = Boolean(getFieldValue("isRange"));
              const format = includeTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD";
              return (
                <>
                  <Form.Item
                    label="开始"
                    name="startAt"
                    rules={[{ required: true, message: "请选择开始时间" }]}
                  >
                    <DatePicker
                      showTime={includeTime}
                      format={format}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  {isRangeValue ? (
                    <Form.Item
                      label="结束"
                      name="endAt"
                      rules={[
                        { required: true, message: "请选择结束时间" },
                        ({ getFieldValue }) => ({
                          validator(_, value: dayjs.Dayjs | undefined) {
                            const startAt = getFieldValue("startAt") as
                              | dayjs.Dayjs
                              | undefined;
                            if (
                              !value ||
                              !startAt ||
                              !value.isBefore(startAt)
                            ) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error("结束时间不能早于开始时间"),
                            );
                          },
                        }),
                      ]}
                    >
                      <DatePicker
                        showTime={includeTime}
                        format={format}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  ) : null}
                </>
              );
            }}
          </Form.Item>
          <Form.Item label="方式" name="method">
            <SelectOptionSelector
              placeholder="请选择或新增方式"
              options={methodOptions.map((item) => ({
                label: item.value,
                value: item.value,
                color: item.color ?? DEFAULT_COLOR,
              }))}
            />
          </Form.Item>
          <Form.Item label="地点" name="location">
            <Input />
          </Form.Item>
          <Button block type="primary" htmlType="submit">
            保存
          </Button>
        </Form>
      </Modal>

      <Modal
        title="添加内部参与人员"
        open={internalAddOpen}
        onCancel={() => {
          setInternalAddOpen(false);
          setPendingInternalIds([]);
        }}
        onOk={() => {
          if (!canManageProject) return;
          if (pendingInternalIds.length === 0) return;
          void updateRelationWithLoading(async () => {
            await updateMilestone({
              internalParticipantIds: Array.from(
                new Set([...internalIds, ...pendingInternalIds]),
              ),
            });
            setInternalAddOpen(false);
            setPendingInternalIds([]);
          });
        }}
        okButtonProps={{
          disabled: !canManageProject || pendingInternalIds.length === 0,
          loading: savingRelation,
        }}
      >
        <Select
          style={{ width: "100%" }}
          mode="multiple"
          value={pendingInternalIds}
          onChange={(value) => setPendingInternalIds(value)}
          options={internalCandidateGroupedOptions}
          placeholder="请选择人员"
          showSearch
          optionFilterProp="label"
        />
      </Modal>

      <Modal
        title="添加客户参与人员"
        open={clientAddOpen}
        onCancel={() => {
          setClientAddOpen(false);
          setPendingClientIds([]);
        }}
        onOk={() => {
          if (!canManageProject) return;
          if (pendingClientIds.length === 0) return;
          void updateRelationWithLoading(async () => {
            await updateMilestone({
              clientParticipantIds: Array.from(
                new Set([...clientIds, ...pendingClientIds]),
              ),
            });
            setClientAddOpen(false);
            setPendingClientIds([]);
          });
        }}
        okButtonProps={{
          disabled: !canManageProject || pendingClientIds.length === 0,
          loading: savingRelation,
        }}
      >
        <Select
          style={{ width: "100%" }}
          mode="multiple"
          value={pendingClientIds}
          onChange={(value) => setPendingClientIds(value)}
          options={clientCandidates.map((item) => ({
            label: item.title ? `${item.name}(${item.title})` : item.name,
            value: item.id,
          }))}
          placeholder="请选择客户人员"
          showSearch
          optionFilterProp="label"
        />
      </Modal>

      <Modal
        title="添加供应商"
        open={vendorAddOpen}
        onCancel={() => {
          setVendorAddOpen(false);
          setPendingVendorIds([]);
        }}
        onOk={() => {
          if (!canManageProject) return;
          if (pendingVendorIds.length === 0) return;
          void updateRelationWithLoading(async () => {
            await updateMilestone({
              vendorParticipantIds: Array.from(
                new Set([...vendorIds, ...pendingVendorIds]),
              ),
            });
            setVendorAddOpen(false);
            setPendingVendorIds([]);
          });
        }}
        okButtonProps={{
          disabled: !canManageProject || pendingVendorIds.length === 0,
          loading: savingRelation,
        }}
      >
        <Select
          style={{ width: "100%" }}
          mode="multiple"
          value={pendingVendorIds}
          onChange={(value) => setPendingVendorIds(value)}
          options={vendorCandidates.map((item) => ({
            label: item.name,
            value: item.id,
          }))}
          placeholder="请选择供应商"
          showSearch
          optionFilterProp="label"
          notFoundContent="该项目没有合作供应商"
        />
      </Modal>

      {documentAddOpen ? (
        <Modal
          title="新建资料"
          open={documentAddOpen}
          onCancel={() => {
            setDocumentAddOpen(false);
          }}
          footer={null}
          width={860}
          destroyOnHidden
        >
          <ProjectDocumentForm
            showProjectField
            showMilestoneField
            disableProjectSelect
            disableMilestoneSelect
            projectOptions={
              data?.project
                ? [{ id: data.project.id, name: data.project.name }]
                : []
            }
            milestoneOptions={
              data
                ? [
                    {
                      id: data.id,
                      name: data.name,
                      projectId: data.project?.id ?? null,
                    },
                  ]
                : []
            }
            selectedProjectId={data?.project?.id}
            selectedMilestoneId={data?.id}
            onSubmit={onCreateDocument}
          />
        </Modal>
      ) : null}
    </DetailPageContainer>
  );
}
