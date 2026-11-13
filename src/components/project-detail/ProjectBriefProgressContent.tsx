"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  CheckOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Collapse,
  Divider,
  Empty,
  Flex,
  Modal,
  Progress,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import TableActions from "@/components/TableActions";
import AppLink from "@/components/AppLink";
import PlannedWorkEntriesTable, {
  type PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import PlannedWorkEntryForm, {
  type PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";

export type ProjectBriefDeliverable = {
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
};

export type ProjectBrief = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  owner?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  deliverables?: ProjectBriefDeliverable[];
};

type Props = {
  briefs?: ProjectBrief[];
  project?: { id: string; name: string };
  canManagePlannedWork?: boolean;
  onEditBrief?: (brief: ProjectBrief) => void;
  onDeleteBrief?: (brief: ProjectBrief) => void;
  onEditDeliverable?: (deliverable: ProjectBriefDeliverable) => void;
  onDeleteDeliverable?: (deliverable: ProjectBriefDeliverable) => void;
  onAddDeliverable?: (brief: ProjectBrief) => void;
  onAfterPlannedWorkChange?: () => Promise<void> | void;
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

const formatDate = (value?: string | null) =>
  value && dayjs(value).isValid() ? dayjs(value).format("MM/DD") : "-";

const DeliverableTimeline = ({ item }: { item: ProjectBriefDeliverable }) => {
  const today = dayjs().startOf("day");
  const dates = [item.firstDraftAt, item.revisionAt, item.finalAt].map(dayjs);
  const nextIndex = dates.findIndex((date) => !date.isBefore(today, "day"));
  const activeIndex = nextIndex === -1 ? 2 : nextIndex;
  const nodes = [
    { label: "初稿", value: item.firstDraftAt },
    { label: "修改", value: item.revisionAt },
    { label: "定稿", value: item.finalAt },
  ];

  return (
    <div className="brief-deliverable-timeline">
      {nodes.map((node, index) => (
        <div key={node.label} className="brief-deliverable-timeline-node">
          {index > 0 ? (
            <span
              className={`brief-deliverable-timeline-line${index <= activeIndex ? " is-active" : ""}`}
            />
          ) : null}
          <i className={index <= activeIndex ? "is-active" : ""}>
            {index < activeIndex ? <CheckOutlined /> : null}
          </i>
          <Typography.Text
            style={{ color: index === activeIndex ? "#1677ff" : undefined }}
          >
            {node.label}
          </Typography.Text>
          <Typography.Text type="secondary">
            {formatDate(node.value)}
          </Typography.Text>
        </div>
      ))}
    </div>
  );
};

const DeliverableDetails = ({
  item,
  plannedWorkSection,
}: {
  item: ProjectBriefDeliverable;
  plannedWorkSection?: ReactNode;
}) => {
  return (
    <>
    <div className="brief-deliverable-detail">
      <div className="brief-deliverable-section brief-deliverable-fields">
        <Typography.Text className="brief-deliverable-section-title">
          交付描述
        </Typography.Text>
        <div className="brief-deliverable-description">
          <Typography.Paragraph style={{ margin: 0 }}>
            {item.description}
          </Typography.Paragraph>
        </div>
      </div>
      <div className="brief-deliverable-section brief-deliverable-properties">
        <Typography.Text className="brief-deliverable-section-title">
          交付属性
        </Typography.Text>
        <div className="brief-deliverable-meta">
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
      <div className="brief-deliverable-section brief-deliverable-plan">
        <Typography.Text className="brief-deliverable-section-title">
          交付时间
        </Typography.Text>
        <DeliverableTimeline item={item} />
      </div>
    </div>
    {plannedWorkSection}
    </>
  );
};

const ProjectBriefProgressContent = ({
  briefs = [],
  project,
  canManagePlannedWork = false,
  onEditBrief,
  onDeleteBrief,
  onEditDeliverable,
  onDeleteDeliverable,
  onAddDeliverable,
  onAfterPlannedWorkChange,
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [plannedWorkModal, setPlannedWorkModal] = useState<{
    brief: ProjectBrief;
    deliverable: ProjectBriefDeliverable;
    entry?: PlannedWorkEntryRow;
  } | null>(null);
  const workdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.adjustments,
  );
  const fetchWorkdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  useEffect(() => {
    void fetchWorkdayAdjustments();
  }, [fetchWorkdayAdjustments]);

  if (briefs.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无需求单" />
    );
  }

  const handleDeletePlannedWork = async (
    deliverable: ProjectBriefDeliverable,
    entryId: string,
  ) => {
    const response = await fetch(
      `/api/deliverables/${deliverable.id}/planned-work-entries/${entryId}`,
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
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      {briefs.map((brief, briefIndex) => {
        const deliverables = brief.deliverables ?? [];
        const assignedCount = deliverables.filter(
          (item) => item.assignee,
        ).length;
        const waitingCount = deliverables.length - assignedCount;
        const progress = deliverables.length
          ? Math.round((assignedCount / deliverables.length) * 100)
          : 0;
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
            defaultActiveKey={briefIndex === 0 ? [brief.id] : []}
            items={[
              {
                key: brief.id,
                label: (
                  <Flex align="center" gap={10} wrap>
                    <Typography.Text strong style={{ fontSize: 17 }}>
                      <AppLink href={`/project-briefs/${brief.id}`} onClick={(event) => event.stopPropagation()}>
                        {brief.title}
                      </AppLink>
                    </Typography.Text>
                    <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                  </Flex>
                ),
                extra: (
                  <Space
                    size={8}
                    separator={<Divider orientation="vertical" />}
                    wrap
                  >
                    <Typography.Text type="secondary">
                      负责人：{brief.owner?.name ?? "-"}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      创建人：{brief.creator?.name ?? "-"}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      创建日期：
                      {dayjs(brief.createdAt).format("YYYY-MM-DD")}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className="brief-display-assignment-summary"
                    >
                      指派进度：<strong>{assignedCount}</strong>
                       / {deliverables.length} 个交付物
                    </Typography.Text>
                    <div className="brief-display-actions">
                      <TableActions
                        onEdit={() => onEditBrief?.(brief)}
                        onDelete={() => onDeleteBrief?.(brief)}
                        editText="修改需求"
                        deleteText="删除需求"
                        middleAction={
                          <Button
                            variant="text"
                            color="primary"
                            icon={<PlusOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddDeliverable?.(brief);
                            }}
                            styles={{ root: { padding: 6 } }}
                          >
                            添加交付物
                          </Button>
                        }
                        deleteTitle={`确定删除需求单“${brief.title}”？`}
                      />
                    </div>
                  </Space>
                ),
                children: (
                  <div className="brief-display-body">
                    <div className="brief-display-summary">
                      <div>
                        <Typography.Text strong style={{ fontSize: 16 }}>
                          需求描述
                        </Typography.Text>
                        <Typography.Paragraph style={{ margin: "8px 0 0" }}>
                          {brief.description}
                        </Typography.Paragraph>
                      </div>
                      <div className="brief-display-progress">
                        <Flex
                          justify="space-around"
                          style={{ textAlign: "center" }}
                        >
                          <div>
                            <Typography.Text type="secondary">
                              交付物
                            </Typography.Text>
                            <strong>{deliverables.length}</strong>
                          </div>
                          <div>
                            <Typography.Text type="secondary">
                              已分配
                            </Typography.Text>
                            <strong style={{ color: "#1677ff" }}>
                              {assignedCount}
                            </strong>
                          </div>
                          <div>
                            <Typography.Text type="secondary">
                              待指派执行人
                            </Typography.Text>
                            <strong style={{ color: "#fa8c16" }}>
                              {waitingCount}
                            </strong>
                          </div>
                        </Flex>
                        <Progress
                          percent={progress}
                          strokeColor="#1677ff"
                          railColor="#e8ebf0"
                        />
                      </div>
                    </div>
                    <div className="brief-display-deliverables">
                      {deliverables.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="暂无交付物"
                        />
                      ) : (
                        <div className="brief-deliverable-table">
                          <Collapse
                            bordered={false}
                            defaultActiveKey={[deliverables[0]?.id]}
                            items={deliverables.map((item, itemIndex) => {
                              // TODO: 在交付物展示模块中展示 status 状态标签。
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
                                  <div className="brief-deliverable-row">
                                    <div className="brief-deliverable-title">
                                      <span className="brief-deliverable-index">
                                        {itemIndex + 1}
                                      </span>
                                      <Typography.Text strong>
                                        <AppLink href={`/brief-deliverables/${item.id}`} onClick={(event) => event.stopPropagation()}>
                                          {item.title}
                                        </AppLink>
                                      </Typography.Text>
                                      <Tag color={typeMeta.color}>
                                        {typeMeta.label}
                                      </Tag>
                                    </div>
                                    <Space
                                      className="brief-deliverable-row-meta"
                                      size={8}
                                      separator={<Divider orientation="vertical" />}
                                      wrap
                                    >
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
                                      <TableActions
                                        onEdit={() =>
                                          onEditDeliverable?.(item)
                                        }
                                        onDelete={() =>
                                          onDeleteDeliverable?.(item)
                                        }
                                        editText="修复交付物"
                                        deleteText="删除交付物"
                                        deleteTitle={`确定删除交付物“${item.title}”？`}
                                      />
                                    </Space>
                                  </div>
                                ),
                                children: (
                                  <DeliverableDetails
                                    item={item}
                                    plannedWorkSection={
                                      <div className="brief-deliverable-planned-work">
                                        <PlannedWorkEntriesTable
                                          compact
                                          requestData={async () => ({
                                            data: plannedEntries,
                                            total: plannedEntries.length,
                                          })}
                                          onEdit={(entry) =>
                                            setPlannedWorkModal({
                                              brief,
                                              deliverable: item,
                                              entry,
                                            })
                                          }
                                          onDelete={(entryId) => {
                                            void handleDeletePlannedWork(
                                              item,
                                              entryId,
                                            );
                                          }}
                                          headerTitle={
                                            <Space size={8}>
                                              <Typography.Text className="brief-deliverable-section-title">
                                                计划工时
                                              </Typography.Text>
                                              <Typography.Text type="secondary">
                                                合计 {totalPlannedDays}d
                                              </Typography.Text>
                                            </Space>
                                          }
                                          toolbarActions={
                                            canManagePlannedWork
                                              ? [
                                                  <Button
                                                    key="add"
                                                    variant="text"
                                                    color="primary"
                                                    icon={<PlusOutlined />}
                                                    styles={{ root: { padding: 6 } }}
                                                    onClick={() =>
                                                      setPlannedWorkModal({
                                                        brief,
                                                        deliverable: item,
                                                      })
                                                    }
                                                  >
                                                    新增计划工时
                                                  </Button>,
                                                ]
                                              : []
                                          }
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
            deliverableContext={{
              id: plannedWorkModal.deliverable.id,
              title: plannedWorkModal.deliverable.title,
              briefId: plannedWorkModal.brief.id,
              briefTitle: plannedWorkModal.brief.title,
              projectId: project.id,
              projectName: project.name,
              assigneeId: plannedWorkModal.deliverable.assignee?.id,
              assigneeName: plannedWorkModal.deliverable.assignee?.name,
            }}
            onSubmit={async (
              payload: PlannedWorkEntryFormPayload,
            ) => {
              const entryId = plannedWorkModal.entry?.id;
              const endpoint = entryId
                ? `/api/deliverables/${payload.deliverableId}/planned-work-entries/${entryId}`
                : `/api/deliverables/${payload.deliverableId}/planned-work-entries`;
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
