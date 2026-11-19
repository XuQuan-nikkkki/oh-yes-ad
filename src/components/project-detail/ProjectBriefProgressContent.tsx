"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  DownOutlined,
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  Collapse,
  Divider,
  Dropdown,
  Tooltip,
  Empty,
  Flex,
  Modal,
  Space,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { reconcileWorkItemDisplayOrder } from "@/lib/work-item-display-order";
import AppLink from "@/components/AppLink";
import PlannedWorkEntriesTable, {
  type PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import PlannedWorkEntryCreateAction from "@/components/project-detail/PlannedWorkEntryCreateAction";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import {
  WorkItemAssignmentHistory,
  WorkItemAssignmentModal,
  type WorkItemAssignmentChangeItem,
} from "@/components/project-detail/WorkItemAssignmentChange";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useAuthStore } from "@/stores/authStore";
import {
  useWorkItemSubmissionManager,
  type WorkItemSubmission,
} from "@/components/project-detail/WorkItemSubmissions";

export type ProjectBriefWorkItem = {
  submissionEnabled?: boolean;
  sourceFilePolicy?: "REQUIRED" | "OPTIONAL";
  id: string;
  type: "DESIGN" | "COPY" | string;
  status: "pending" | "in_progress" | "completed" | "paused" | string;
  title: string;
  description: string;
  specification?: string | null;
  firstDraftAt?: string | null;
  revisionAt?: string | null;
  finalAt: string;
  reviewer?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
  assignmentChanges?: WorkItemAssignmentChangeItem[];
  formatOptions?: Array<{
    option: { id: string; value: string; color?: string | null };
  }>;
  categoryOrSceneOptions?: Array<{
    option: { id: string; value: string; color?: string | null };
  }>;
  plannedWorkEntries?: Array<{
    id: string;
    yearOption?: { id?: string; value?: string | null; color?: string | null } | null;
    weekNumberOption?: { id?: string; value?: string | null; color?: string | null } | null;
    plannedDays: number;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    updatedAt?: string;
  }>;
  submissions?: WorkItemSubmission[];
};

export type ProjectBrief = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  owner?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  workItems?: ProjectBriefWorkItem[];
};

type Props = {
  briefs?: ProjectBrief[];
  project?: { id: string; name: string };
  canManagePlannedWork?: boolean;
  onEditBrief?: (brief: ProjectBrief) => void;
  onDeleteBrief?: (brief: ProjectBrief) => void;
  onEditWorkItem?: (workItem: ProjectBriefWorkItem) => void;
  onDeleteWorkItem?: (workItem: ProjectBriefWorkItem) => void;
  onAddWorkItem?: (brief: ProjectBrief) => void;
  onAfterPlannedWorkChange?: () => Promise<void> | void;
  onAfterAssignmentChange?: () => Promise<void> | void;
  onAfterSubmissionChange?: () => Promise<void> | void;
  onAfterStatusChange?: () => Promise<void> | void;
  initialExpandedWorkItemId?: string;
  includeCompletedWorkItems?: boolean;
};

const briefStatusMeta: Record<
  string,
  { label: string; color: string; rail: string }
> = {
  waiting_assignment: { label: "待分配任务", color: "orange", rail: "#fa8c16" },
  in_progress: { label: "进行中", color: "green", rail: "#22c55e" },
  paused: { label: "暂停", color: "gold", rail: "#eab308" },
  completed: { label: "已完成", color: "blue", rail: "#1677ff" },
};

const workItemStatusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: "待推进", color: "default" },
  in_progress: { label: "进行中", color: "green" },
  completed: { label: "已完成", color: "blue" },
  paused: { label: "暂停", color: "gold" },
};

const briefStatusOrder: Record<string, number> = {
  in_progress: 0,
  waiting_assignment: 1,
  paused: 2,
  completed: 3,
};

const formatDate = (value?: string | null) =>
  value && dayjs(value).isValid() ? dayjs(value).format("MM/DD") : "-";

const WorkItemDetails = ({
  item,
  plannedWorkSection,
  plannedWorkAction,
  totalPlannedDays,
  onAssignment,
  canManage,
  canSubmit,
  onSubmissionChange,
}: {
  item: ProjectBriefWorkItem;
  plannedWorkSection?: ReactNode;
  plannedWorkAction?: ReactNode;
  totalPlannedDays: number;
  onAssignment?: () => void;
  canManage: boolean;
  canSubmit?: boolean;
  onSubmissionChange?: () => Promise<void> | void;
}) => {
  const [selectedTab, setActiveTab] = useState("submissions");
  const submissionEnabled = item.submissionEnabled !== false;
  const showProperties = submissionEnabled && Boolean(
    item.formatOptions?.length || item.categoryOrSceneOptions?.length || item.specification?.trim(),
  );
  const activeTab = !submissionEnabled && selectedTab === "submissions" ? "planned-work" : selectedTab;
  const submissions = useWorkItemSubmissionManager({
    workItem: item,
    canManage,
    canSubmit,
    onChanged: onSubmissionChange,
  });
  return (
    <>
    <div className="brief-work-item-detail" data-has-properties={showProperties}>
      <div className="brief-work-item-section brief-work-item-fields">
        <Typography.Text className="brief-work-item-section-title">
          工作描述
        </Typography.Text>
        <div className="brief-work-item-description">
          <Typography.Paragraph style={{ margin: 0 }}>
            {item.description}
          </Typography.Paragraph>
        </div>
      </div>
      <div className="brief-work-item-section brief-work-item-properties" hidden={!showProperties}>
        <Typography.Text className="brief-work-item-section-title">
          工作属性
        </Typography.Text>
        <div className="brief-work-item-meta">
          <div>
            <Typography.Text type="secondary">格式</Typography.Text>
            <Flex gap={6} align="center" wrap>
              {item.formatOptions?.length ? (
                item.formatOptions.map(({ option }) => (
                  <Tag key={option.id} color={option.color ?? undefined}>
                    {option.value}
                  </Tag>
                ))
              ) : (
                <Typography.Text>-</Typography.Text>
              )}
            </Flex>
          </div>
          <div>
            <Typography.Text type="secondary">类别/场景</Typography.Text>
            <Flex gap={6} align="center" wrap>
              {item.categoryOrSceneOptions?.length ? (
                item.categoryOrSceneOptions.map(({ option }) => (
                  <Tag key={option.id} color={option.color ?? undefined}>
                    {option.value}
                  </Tag>
                ))
              ) : (
                <Typography.Text>-</Typography.Text>
              )}
            </Flex>
          </div>
          <div>
            <Typography.Text type="secondary">规格</Typography.Text>
            <Typography.Text>{item.specification || "-"}</Typography.Text>
          </div>
        </div>
      </div>
      <div className="brief-work-item-section brief-work-item-plan">
        <Typography.Text className="brief-work-item-section-title">
          {submissionEnabled ? "计划交付时间" : "截止时间"}
        </Typography.Text>
        <div className="brief-work-item-dates">
          {(submissionEnabled ? [
            ["初稿", item.firstDraftAt],
            ["修改", item.revisionAt],
            ["定稿", item.finalAt],
          ] : [["截止", item.finalAt]]).map(([label, value]) => (
            <div key={label}>
              <Typography.Text type="secondary">{label}</Typography.Text>
              <Typography.Text>{formatDate(value)}</Typography.Text>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="brief-work-item-records">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={activeTab === "submissions" ? submissions.extra :
          activeTab === "planned-work" ? plannedWorkAction :
          activeTab === "assignment" && onAssignment ? (
            <Button variant="text" color="primary" icon={<SwapOutlined />} onClick={onAssignment}>
              {item.assignee ? "交接执行人" : "指派执行人"}
            </Button>
          ) : null}
        items={[
          {
            key: "submissions",
            label: `提交与反馈${item.submissions?.length ? ` · ${item.submissions.length}版` : ""}`,
            children: submissions.content,
          },
          { key: "planned-work", label: `计划工时 · ${Number(totalPlannedDays.toFixed(4))}d`, children: plannedWorkSection },
          {
            key: "assignment",
            label: `执行人指派与交接 · ${item.assignmentChanges?.length ?? 0}条`,
            children: (
              <div className="brief-work-item-assignment-panel">
                {item.assignmentChanges?.length ? (
                  <WorkItemAssignmentHistory changes={item.assignmentChanges} variant="detail" />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行人指派与交接记录" />
                )}
              </div>
            ),
          },
        ].filter((tab) => submissionEnabled || tab.key !== "submissions")}
      />
    </div>
    {submissionEnabled ? submissions.modal : null}
    </>
  );
};

const ProjectBriefProgressContent = ({
  briefs = [],
  project,
  canManagePlannedWork = false,
  onEditBrief,
  onDeleteBrief,
  onEditWorkItem,
  onDeleteWorkItem,
  onAddWorkItem,
  onAfterPlannedWorkChange,
  onAfterAssignmentChange,
  onAfterSubmissionChange,
  onAfterStatusChange,
  initialExpandedWorkItemId,
  includeCompletedWorkItems = false,
}: Props) => {
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const [messageApi, contextHolder] = message.useMessage();
  const [workItemDisplayOrder, setWorkItemDisplayOrder] = useState<Record<string, string[]>>({});
  const displayOrder = reconcileWorkItemDisplayOrder(workItemDisplayOrder, briefs);
  if (displayOrder !== workItemDisplayOrder) setWorkItemDisplayOrder(displayOrder);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const changeBriefStatus = async (brief: ProjectBrief, status: string) => {
    if (!onEditBrief || savingStatusId || status === brief.status) return;
    setSavingStatusId(brief.id);
    try {
      const response = await fetch(`/api/briefs/${brief.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error((await response.text()) || "需求单状态保存失败");
      messageApi.success("需求单状态已更新");
      try {
        await onAfterStatusChange?.();
      } catch {
        messageApi.warning("状态已保存，列表刷新失败，请刷新页面");
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "状态保存失败，请重试");
    } finally {
      setSavingStatusId(null);
    }
  };
  const changeWorkItemStatus = async (item: ProjectBriefWorkItem, status: string) => {
    if (!onEditWorkItem || savingStatusId || status === item.status) return;
    setSavingStatusId(item.id);
    try {
      const response = await fetch(`/api/work-items/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error((await response.text()) || "状态保存失败");
      messageApi.success(status === "completed" && !includeCompletedWorkItems ? "已完成，已从当前列表隐藏" : "状态已更新");
      try {
        await onAfterStatusChange?.();
      } catch {
        messageApi.warning("状态已保存，列表刷新失败，请刷新页面");
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "状态保存失败，请重试");
    } finally {
      setSavingStatusId(null);
    }
  };
  const [modal, modalContextHolder] = Modal.useModal();
  const [plannedWorkModal, setPlannedWorkModal] = useState<{
    brief: ProjectBrief;
    workItem: ProjectBriefWorkItem;
    entry?: PlannedWorkEntryRow;
  } | null>(null);
  const [assignmentWorkItem, setAssignmentWorkItem] = useState<ProjectBriefWorkItem | null>(null);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);
  const workdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.adjustments,
  );
  const fetchWorkdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const sortedBriefs = useMemo(
    () =>
      [...briefs].sort((left, right) => {
        const statusDifference =
          (briefStatusOrder[left.status] ?? 1) -
          (briefStatusOrder[right.status] ?? 1);
        if (statusDifference !== 0) return statusDifference;
        return dayjs(right.createdAt).valueOf() - dayjs(left.createdAt).valueOf();
      }),
    [briefs],
  );

  const workItemKeys = JSON.stringify(
    sortedBriefs.map((brief) => [brief.id, (brief.workItems ?? []).map((item) => item.id)]),
  );
  const [expansion, setExpansion] = useState<{
    snapshot: string;
    known: Record<string, string[]>;
    workItems: Record<string, string[]>;
    briefs: Record<string, string[]>;
  }>({ snapshot: "", known: {}, workItems: {}, briefs: {} });

  if (expansion.snapshot !== workItemKeys) {
    const known: Record<string, string[]> = {};
    const expandedWorkItems: Record<string, string[]> = {};
    const expandedBriefs: Record<string, string[]> = {};
    sortedBriefs.forEach((brief, index) => {
      const ids = (brief.workItems ?? []).map((item) => item.id);
      const previousIds = expansion.known[brief.id];
      const added = previousIds ? ids.filter((id) => !previousIds.includes(id)) : [];
      const newestId = added.at(-1);
      known[brief.id] = ids;
      expandedWorkItems[brief.id] = newestId
        ? [newestId]
        : previousIds
          ? (expansion.workItems[brief.id] ?? []).filter((id) => ids.includes(id))
          : initialExpandedWorkItemId && ids.includes(initialExpandedWorkItemId)
            ? [initialExpandedWorkItemId]
            : ids.slice(0, 1);
      expandedBriefs[brief.id] = newestId
        ? [brief.id]
        : expansion.briefs[brief.id] ?? (index === 0 ? [brief.id] : []);
    });
    setExpansion({ snapshot: workItemKeys, known, workItems: expandedWorkItems, briefs: expandedBriefs });
  }

  useEffect(() => {
    void fetchWorkdayAdjustments();
  }, [fetchWorkdayAdjustments]);

  if (briefs.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无需求单" />
    );
  }

  const handleDeletePlannedWork = async (
    workItem: ProjectBriefWorkItem,
    entryId: string,
  ) => {
    const response = await fetch(
      `/api/work-items/${workItem.id}/planned-work-entries/${entryId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      messageApi.error((await response.text()) || "删除计划工时失败");
      return;
    }
    messageApi.success("计划工时已删除");
    await onAfterPlannedWorkChange?.();
  };

  return (
    <>
    {contextHolder}
    {modalContextHolder}
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      {sortedBriefs.map((brief) => {
        const workItems = brief.workItems ?? [];
        const workItemsById = new Map(workItems.map((item) => [item.id, item]));
        const visibleWorkItems = (displayOrder[brief.id] ?? [])
          .map((id) => workItemsById.get(id))
          .filter((item): item is ProjectBriefWorkItem => Boolean(item && (includeCompletedWorkItems || item.status !== "completed")));
        const assignedCount = workItems.filter(
          (item) => item.assignee,
        ).length;
        const statusMeta = briefStatusMeta[brief.status] ?? {
          label: brief.status,
          color: "default",
          rail: "#d9d9d9",
        };

        return (
          <Collapse
            key={brief.id}
            className="brief-display-card"
            style={
              { "--brief-status-rail": statusMeta.rail } as CSSProperties
            }
            activeKey={expansion.briefs[brief.id] ?? []}
            onChange={(keys) => setExpansion((current) => ({
              ...current,
              briefs: { ...current.briefs, [brief.id]: Array.isArray(keys) ? keys : [keys] },
            }))}
            items={[
              {
                key: brief.id,
                label: (
                  <div className="brief-display-heading">
                    <Tooltip title={brief.title}>
                      <AppLink className="brief-display-title" href={`/project-briefs/${brief.id}`} onClick={(event) => event.stopPropagation()}>
                        {brief.title}
                      </AppLink>
                    </Tooltip>
                    {onEditBrief ? (
                      <Dropdown
                        trigger={["click"]}
                        disabled={savingStatusId !== null}
                        menu={{
                          selectable: true,
                          selectedKeys: [brief.status],
                          items: ["waiting_assignment", "in_progress", "completed", "paused"].map((status) => ({
                            key: status,
                            label: (
                              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 112, paddingBlock: 2, fontSize: 13, color: "var(--ant-color-text)" }}>
                                <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, backgroundColor: briefStatusMeta[status].rail }} />
                                <span>{briefStatusMeta[status].label}</span>
                                {status === brief.status && <CheckOutlined style={{ marginInlineStart: "auto", color: "#1677ff", fontSize: 12 }} />}
                              </span>
                            ),
                          })),
                          onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();
                            void changeBriefStatus(brief, key);
                          },
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          aria-label={`修改需求单状态：${statusMeta.label}`}
                          loading={savingStatusId === brief.id}
                          disabled={savingStatusId !== null}
                          style={{ padding: 0, height: "auto" }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Tag color={statusMeta.color} style={{ marginInlineEnd: 0, cursor: "pointer" }}>
                            {statusMeta.label} <DownOutlined style={{ fontSize: 10 }} />
                          </Tag>
                        </Button>
                      </Dropdown>
                    ) : <Tag color={statusMeta.color}>{statusMeta.label}</Tag>}
                  </div>
                ),
                extra: (
                  <div className="brief-display-header-extra" onClick={(event) => event.stopPropagation()}>
                    <Tooltip title={`负责人：${brief.owner?.name ?? "-"}`}>
                      <Typography.Text type="secondary" className="brief-display-owner">
                        负责人：{brief.owner?.name ?? "-"}
                      </Typography.Text>
                    </Tooltip>
                    <Tooltip title={`已分配执行人：${assignedCount} / ${workItems.length} 个工作项`}>
                      <Typography.Text type="secondary" className="brief-display-assignment-summary">
                        <span className="brief-display-assignment-label">已指派 </span>
                        <strong>{assignedCount}</strong> / {workItems.length}
                      </Typography.Text>
                    </Tooltip>
                    <Tooltip trigger={["hover", "click", "focus"]} title={<div>
                      <div>创建人：{brief.creator?.name ?? "-"}</div>
                      <div>创建日期：{dayjs(brief.createdAt).format("YYYY-MM-DD")}</div>
                    </div>}>
                      <Button type="text" size="small" aria-label="需求单信息" icon={<InfoCircleOutlined />} />
                    </Tooltip>
                    <Button
                      variant="text"
                      color="primary"
                      icon={<PlusOutlined />}
                      aria-label="添加工作项"
                      onClick={() => onAddWorkItem?.(brief)}
                      className="brief-display-add"
                    >
                      <span className="brief-display-add-label">添加工作项</span>
                    </Button>
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          { key: "edit", label: "修改需求", icon: <EditOutlined />, disabled: !onEditBrief },
                          { key: "delete", label: "删除需求", icon: <DeleteOutlined />, danger: true, disabled: !onDeleteBrief },
                        ],
                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();
                          if (key === "edit") onEditBrief?.(brief);
                          if (key === "delete") modal.confirm({
                            title: `确定删除需求单“${brief.title}”？`,
                            okText: "确认删除",
                            cancelText: "取消",
                            okButtonProps: { danger: true },
                            onOk: () => onDeleteBrief?.(brief),
                          });
                        },
                      }}
                    >
                      <Button type="text" aria-label="更多需求单操作" icon={<MoreOutlined />} />
                    </Dropdown>
                  </div>
                ),
                children: (
                  <div className="brief-display-body">
                    <div className="brief-display-summary">
                      <div className="brief-display-description">
                        <Typography.Text strong style={{ fontSize: 16 }}>
                          需求描述
                        </Typography.Text>
                        <Typography.Paragraph style={{ margin: "8px 0 0" }}>
                          {brief.description}
                        </Typography.Paragraph>
                      </div>
                      <Divider orientation="vertical" className="brief-display-summary-divider" />
                      <div className="brief-display-counts">
                        <div>
                          <strong>{workItems.length}</strong>
                          <Typography.Text type="secondary">工作项</Typography.Text>
                        </div>
                        <div>
                          <strong style={{ color: "#1677ff" }}>
                            {assignedCount} / {workItems.length}
                          </strong>
                          <Typography.Text type="secondary">已分配执行人</Typography.Text>
                        </div>
                      </div>
                    </div>
                    <div className="brief-display-work-items">
                      {visibleWorkItems.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="暂无未完成的工作项"
                        />
                      ) : (
                        <div className="brief-work-item-table">
                          <Collapse
                            bordered={false}
                            activeKey={expansion.workItems[brief.id] ?? []}
                            onChange={(keys) => setExpansion((current) => ({
                              ...current,
                              workItems: { ...current.workItems, [brief.id]: Array.isArray(keys) ? keys : [keys] },
                            }))}
                            items={visibleWorkItems.map((item, itemIndex) => {
                              const itemStatusMeta = workItemStatusMeta[item.status] ?? {
                                label: item.status || "未设置",
                                color: "default",
                              };
                              const typeMeta = {
                                DESIGN: { label: "设计", color: "blue" },
                                COPY: { label: "文案", color: "orange" },
                                PROJECT_MANAGEMENT: { label: "项目管理", color: "purple" },
                                NEW_MEDIA: { label: "新媒体", color: "cyan" },
                              }[item.type] ?? { label: item.type, color: "default" };
                              const plannedEntries = item.plannedWorkEntries ?? [];
                              const totalPlannedDays = plannedEntries.reduce(
                                (total, entry) => total + entry.plannedDays,
                                0,
                              );
                              return {
                                key: item.id,
                                label: (
                                  <div className="brief-work-item-row">
                                    <div className="brief-work-item-title">
                                      <span className="brief-work-item-index">
                                        {itemIndex + 1}
                                      </span>
                                      <Typography.Text strong>
                                        <AppLink href={`/brief-work-items/${item.id}`} onClick={(event) => event.stopPropagation()}>
                                          {item.title}
                                        </AppLink>
                                      </Typography.Text>
                                      <Tag color={typeMeta.color}>
                                        {typeMeta.label}
                                      </Tag>
                                    </div>
                                    <Space
                                      className="brief-work-item-row-meta"
                                      size={8}
                                      separator={<Divider orientation="vertical" />}
                                      wrap
                                    >
                                      <Typography.Text type="secondary">
                                        状态：
                                        {onEditWorkItem ? (
                                          <Dropdown
                                            trigger={["click"]}
                                            disabled={savingStatusId !== null}
                                            menu={{
                                              selectable: true,
                                              selectedKeys: [item.status],
                                              items: ["pending", "in_progress", "completed", "paused"].map((status) => ({
                                                key: status,
                                                label: (
                                                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 112, paddingBlock: 2, fontSize: 13, color: "var(--ant-color-text)" }}>
                                                    <span aria-hidden style={{
                                                      width: 7,
                                                      height: 7,
                                                      borderRadius: "50%",
                                                      flexShrink: 0,
                                                      backgroundColor: { pending: "#bfbfbf", in_progress: "#52c41a", paused: "#faad14", completed: "#1677ff" }[status],
                                                    }} />
                                                    <span>{workItemStatusMeta[status].label}</span>
                                                    {status === item.status && <CheckOutlined style={{ marginInlineStart: "auto", color: "#1677ff", fontSize: 12 }} />}
                                                  </span>
                                                ),
                                              })),
                                              onClick: ({ key, domEvent }) => {
                                                domEvent.stopPropagation();
                                                void changeWorkItemStatus(item, key);
                                              },
                                            }}
                                          >
                                            <Button
                                              type="text"
                                              size="small"
                                              aria-label={`修改工作项状态：${itemStatusMeta.label}`}
                                              loading={savingStatusId === item.id}
                                              disabled={savingStatusId !== null}
                                              style={{ padding: 0, height: "auto" }}
                                              onClick={(event) => event.stopPropagation()}
                                            >
                                              <Tag color={itemStatusMeta.color} style={{ marginInlineEnd: 0, cursor: "pointer" }}>
                                                {itemStatusMeta.label} <DownOutlined style={{ fontSize: 10 }} />
                                              </Tag>
                                            </Button>
                                          </Dropdown>
                                        ) : (
                                          <Tag color={itemStatusMeta.color} style={{ marginInlineEnd: 0 }}>
                                            {itemStatusMeta.label}
                                          </Tag>
                                        )}
                                      </Typography.Text>
                                      <Typography.Text type="secondary">
                                        审核人：
                                        {item.reviewer?.name ?? "-"}
                                      </Typography.Text>
                                      <Typography.Text>
                                        <Typography.Text type="secondary">
                                          执行人：
                                        </Typography.Text>
                                        {item.assignee ? (
                                          <Typography.Text type="secondary">
                                            {item.assignee.name}
                                          </Typography.Text>
                                        ) : (
                                          <Tag
                                            color="error"
                                            icon={
                                              <ExclamationCircleOutlined />
                                            }
                                            style={{ marginInlineEnd: 0 }}
                                          >
                                            待指派执行人
                                          </Tag>
                                        )}
                                      </Typography.Text>
                                      <Typography.Text type="secondary">
                                        计划工时：
                                        <strong style={{ color: "#1677ff" }}>
                                          {plannedEntries.length
                                            ? `${totalPlannedDays}d`
                                            : "-"}
                                        </strong>
                                      </Typography.Text>
                                      <Dropdown
                                        trigger={["click"]}
                                        menu={{
                                          items: [
                                            { key: "edit", label: "修改工作项", icon: <EditOutlined />, disabled: !onEditWorkItem },
                                            { key: "delete", label: "删除工作项", icon: <DeleteOutlined />, danger: true, disabled: !onDeleteWorkItem },
                                          ],
                                          onClick: ({ key, domEvent }) => {
                                            domEvent.stopPropagation();
                                            if (key === "edit") onEditWorkItem?.(item);
                                            if (key === "delete") modal.confirm({
                                              title: `确定删除工作项“${item.title}”？`,
                                              okText: "确认删除",
                                              cancelText: "取消",
                                              okButtonProps: { danger: true },
                                              onOk: () => onDeleteWorkItem?.(item),
                                            });
                                          },
                                        }}
                                      >
                                        <Button
                                          type="text"
                                          aria-label="更多工作项操作"
                                          icon={<MoreOutlined />}
                                          onClick={(event) => event.stopPropagation()}
                                        />
                                      </Dropdown>
                                    </Space>
                                  </div>
                                ),
                                children: (
                                  <WorkItemDetails
                                    item={item}
                                    canManage={canManagePlannedWork}
                                    canSubmit={canManagePlannedWork || item.assignee?.id === currentUserId}
                                    onSubmissionChange={onAfterSubmissionChange}
                                    totalPlannedDays={totalPlannedDays}
                                    plannedWorkAction={canManagePlannedWork && project ? (
                                      <PlannedWorkEntryCreateAction
                                        key={item.id}
                                        workItemContext={{
                                          id: item.id,
                                          title: item.title,
                                          briefId: brief.id,
                                          briefTitle: brief.title,
                                          projectId: project.id,
                                          projectName: project.name,
                                          assigneeId: item.assignee?.id,
                                          assigneeName: item.assignee?.name,
                                        }}
                                        onSaved={onAfterPlannedWorkChange}
                                      />
                                    ) : null}
                                    onAssignment={onAfterAssignmentChange ? () => {
                                      setAssignmentWorkItem(item);
                                      void fetchEmployees();
                                    } : undefined}
                                    plannedWorkSection={
                                      <div className="brief-work-item-planned-work">
                                        <PlannedWorkEntriesTable
                                          compact
                                          requestData={async () => ({
                                            data: plannedEntries,
                                            total: plannedEntries.length,
                                          })}
                                          onEdit={(entry) =>
                                            setPlannedWorkModal({
                                              brief,
                                              workItem: item,
                                              entry,
                                            })
                                          }
                                          onDelete={(entryId) => {
                                            void handleDeletePlannedWork(
                                              item,
                                              entryId,
                                            );
                                          }}
                                          headerTitle={false}
                                          workdayAdjustments={workdayAdjustments}
                                          refreshKey={plannedEntries.reduce(
                                            (latest, entry) =>
                                              Math.max(
                                                latest,
                                                entry.updatedAt
                                                  ? dayjs(entry.updatedAt).valueOf()
                                                  : 0,
                                              ),
                                            plannedEntries.length,
                                          )}
                                          actionsDisabled={!canManagePlannedWork}
                                          columnKeys={[
                                            "year",
                                            "weekNumber",
                                            "plannedDays",
                                            "actions",
                                          ]}
                                        />
                                      </div>
                                    }
                                  />
                                ),
                              };
                            })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        );
      })}
    </Space>
      <WorkItemAssignmentModal
        workItem={assignmentWorkItem}
        onClose={() => setAssignmentWorkItem(null)}
        onSaved={async () => { await onAfterAssignmentChange?.(); }}
      />
      <Modal
        title={plannedWorkModal?.entry ? "编辑计划工时" : "新增计划工时"}
        open={Boolean(plannedWorkModal)}
        onCancel={() => setPlannedWorkModal(null)}
        footer={null}
        destroyOnHidden
        width={680}
      >
        {plannedWorkModal && project ? (
          <PlannedWorkEntryForm
            initialValues={
              plannedWorkModal.entry
                ? {
                    ...plannedWorkModal.entry,
                    yearOption:
                      plannedWorkModal.entry.yearOption?.value ?? "",
                    weekNumberOption:
                      plannedWorkModal.entry.weekNumberOption?.value ?? "",
                  }
                : null
            }
            workItemContext={{
              id: plannedWorkModal.workItem.id,
              title: plannedWorkModal.workItem.title,
              briefId: plannedWorkModal.brief.id,
              briefTitle: plannedWorkModal.brief.title,
              projectId: project.id,
              projectName: project.name,
              assigneeId: plannedWorkModal.workItem.assignee?.id,
              assigneeName: plannedWorkModal.workItem.assignee?.name,
            }}
            onSubmit={async (
              payload: PlannedWorkEntryFormPayload,
            ) => {
              const entryId = plannedWorkModal.entry?.id;
              const endpoint = entryId
                ? `/api/work-items/${payload.workItemId}/planned-work-entries/${entryId}`
                : `/api/work-items/${payload.workItemId}/planned-work-entries`;
              const response = await fetch(endpoint, {
                method: entryId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                throw new Error(
                  (await response.text()) || "保存计划工时失败",
                );
              }
              messageApi.success(
                entryId ? "计划工时已更新" : "计划工时已添加",
              );
              setPlannedWorkModal(null);
              await onAfterPlannedWorkChange?.();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
};

export default ProjectBriefProgressContent;
