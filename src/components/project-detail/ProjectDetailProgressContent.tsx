"use client";

import { useMemo, useState } from "react";
import { Button, Collapse, Empty, Popover } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import AppLink from "@/components/AppLink";
import PlannedWorkScheduleValue from "@/components/project-detail/PlannedWorkScheduleValue";
import ProjectTaskStatusQuickEditTag from "@/components/project-detail/ProjectTaskStatusQuickEditTag";
import ProjectTaskStepFormModal from "@/components/project-detail/ProjectTaskStepFormModal";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import TableActions from "@/components/TableActions";
import {
  DATE_FORMAT,
  PROJECT_TASK_STATUS_FIELD,
  PROJECT_TASK_STATUS_OPTIONS,
} from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type {
  ProjectProgressSegmentRow,
  ProjectProgressTaskRow,
} from "@/types/projectProgress";

dayjs.extend(isoWeek);

type Props = {
  projectId: string;
  projectName?: string;
  data: ProjectProgressSegmentRow[];
  segmentCount: number;
  taskCount: number;
  pageSize?: number;
  hideCompletedItems?: boolean;
  showPlannedDaysForCurrentWeekOnly?: boolean;
  actionsDisabled?: boolean;
  employees?: Array<{
    id: string;
    name: string;
    employmentStatus?: string | null;
  }>;
  onAddTask?: (segment: ProjectProgressSegmentRow) => void;
  onEditSegment?: (segment: ProjectProgressSegmentRow) => void;
  onUpdateSegmentStatus?: (
    segment: ProjectProgressSegmentRow,
    nextOption: { id: string; value: string; color: string },
  ) => Promise<void> | void;
  onAfterDeleteSegment?: () => Promise<void> | void;
  onAddPlannedWork?: (task: ProjectProgressTaskRow) => void;
  onAfterUpdateTask?: () => Promise<void> | void;
  onAfterDeleteTask?: () => Promise<void> | void;
  onEditPlannedWork?: (entry: {
    id: string;
    taskId: string;
    year: number;
    weekNumber: number;
    plannedDays: number;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }) => void;
  onAfterDeletePlannedWork?: () => Promise<void> | void;
};

type PaginationState = {
  current: number;
  pageSize: number;
};

const formatDateOrEmpty = (value?: string | null) => {
  return formatDate(value, DATE_FORMAT, "").replaceAll("-", "/");
};

const getTaskStatusSortValue = (
  task: ProjectProgressTaskRow,
  statusOrderMap: Map<string, number>,
) => {
  const statusValue = task.statusOption?.value ?? task.status ?? "";
  return statusOrderMap.get(statusValue) ?? Number.MAX_SAFE_INTEGER;
};

const ProjectDetailProgressContent = ({
  projectId,
  projectName = "",
  data,
  pageSize = 20,
  hideCompletedItems = false,
  showPlannedDaysForCurrentWeekOnly = false,
  actionsDisabled = false,
  employees = [],
  onAddTask,
  onAddPlannedWork,
  onUpdateSegmentStatus,
  onAfterUpdateTask,
  onAfterDeleteTask,
}: Props) => {
  const [paginationBySegment, setPaginationBySegment] = useState<
    Record<string, PaginationState>
  >({});
  const [editingTask, setEditingTask] = useState<ProjectProgressTaskRow | null>(null);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const currentIsoWeek = dayjs().isoWeek();
  const currentIsoWeekYear = dayjs().isoWeekYear();
  const taskStatusOrderMap = useMemo(() => {
    const options = optionsByField[PROJECT_TASK_STATUS_FIELD] ?? [];
    if (options.length === 0) {
      return new Map(
        PROJECT_TASK_STATUS_OPTIONS.map((item, index) => [item.value, index + 1]),
      );
    }

    return new Map(
      [...options]
        .sort((left, right) => {
          const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.value.localeCompare(right.value, "zh-CN");
        })
        .map((item, index) => [item.value, index + 1]),
    );
  }, [optionsByField]);
  const taskStatusOrderSignature = useMemo(
    () => JSON.stringify(Array.from(taskStatusOrderMap.entries())),
    [taskStatusOrderMap],
  );
  const sortedSegments = useMemo(() => {
    return [...data].sort((left, right) => {
      const leftStatus = left.status ?? "";
      const rightStatus = right.status ?? "";
      const isLeftDone = leftStatus.includes("完成");
      const isRightDone = rightStatus.includes("完成");
      if (isLeftDone !== isRightDone) return isLeftDone ? 1 : -1;
      const statusCompare = leftStatus.localeCompare(rightStatus, "zh-CN");
      if (statusCompare !== 0) return statusCompare;
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [data]);
  const visibleSegments = useMemo(() => {
    if (!hideCompletedItems) return sortedSegments;
    return sortedSegments
      .filter((segment) => !(segment.status ?? "").includes("完成"))
      .map((segment) => ({
        ...segment,
        tasks: (segment.tasks ?? []).filter(
          (task) => !(task.status ?? "").includes("完成"),
        ),
      }));
  }, [hideCompletedItems, sortedSegments]);
  const sortedVisibleSegments = useMemo(
    () =>
      visibleSegments.map((segment) => ({
        ...segment,
        tasks: [...(segment.tasks ?? [])].sort((left, right) => {
          const statusCompare =
            getTaskStatusSortValue(left, taskStatusOrderMap) -
            getTaskStatusSortValue(right, taskStatusOrderMap);
          if (statusCompare !== 0) return statusCompare;
          return left.name.localeCompare(right.name, "zh-CN");
        }),
      })),
    [taskStatusOrderMap, visibleSegments],
  );

  const taskColumns: ProColumns<ProjectProgressTaskRow>[] = [
    {
      title: "任务名称",
      dataIndex: "name",
      width: 200,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 200 } }),
      render: (_value, row) => (
        <Popover content={row.name} trigger="hover">
          <span
            style={{
              display: "inline-block",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              verticalAlign: "bottom",
            }}
            title={row.name}
          >
            <AppLink href={`/project-tasks/${row.id}`}>{row.name}</AppLink>
          </span>
        </Popover>
      ),
    },
    {
      title: "任务状态",
      dataIndex: "status",
      width: 90,
      sorter: (left, right) =>
        getTaskStatusSortValue(left, taskStatusOrderMap) -
        getTaskStatusSortValue(right, taskStatusOrderMap),
      defaultSortOrder: "ascend",
      render: (_value, row) => (
        <ProjectTaskStatusQuickEditTag
          projectId={projectId}
          taskId={row.id}
          option={
            row.statusOption ??
            (row.status ? { value: row.status, color: null } : null)
          }
          disabled={actionsDisabled}
          onUpdated={onAfterUpdateTask}
        />
      ),
    },
    {
      title: "负责人",
      dataIndex: "ownerName",
      width: 80,
      render: (_value, row) =>
        row.ownerId ? (
          <AppLink href={`/employees/${row.ownerId}`}>{row.ownerName}</AppLink>
        ) : (
          "-"
        ),
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 80,
      render: (_value, row) => formatDateOrEmpty(row.dueDate),
    },
    {
      title: "工时分布",
      key: "plannedSchedules",
      width: 320,
      render: (_value, row) => {
        const entries = [...(row.plannedEntries ?? [])].sort((left, right) => {
          if (left.year !== right.year) return right.year - left.year;
          if (left.weekNumber !== right.weekNumber) return right.weekNumber - left.weekNumber;
          return left.id.localeCompare(right.id, "zh-CN");
        });

        if (entries.length === 0) return "-";

        return (
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry) => (
              <PlannedWorkScheduleValue
                key={entry.id}
                entryId={entry.id}
                weekNumber={entry.weekNumber}
                isCurrentWeek={
                  entry.year === currentIsoWeekYear &&
                  entry.weekNumber === currentIsoWeek
                }
                plannedDays={
                  showPlannedDaysForCurrentWeekOnly &&
                  !(
                    entry.year === currentIsoWeekYear &&
                    entry.weekNumber === currentIsoWeek
                  )
                    ? undefined
                    : entry.plannedDays
                }
                monday={entry.monday}
                tuesday={entry.tuesday}
                wednesday={entry.wednesday}
                thursday={entry.thursday}
                friday={entry.friday}
                saturday={entry.saturday}
                sunday={entry.sunday}
              />
            ))}
          </div>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      onCell: () => ({ style: { whiteSpace: "nowrap", overflow: "visible" } }),
      render: (_value, row) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            disabled={actionsDisabled}
            onClick={() => onAddPlannedWork?.(row)}
          >
            添加工时
          </Button>
          <TableActions
            onEdit={() => {
              if (actionsDisabled) return;
              setEditingTask(row);
            }}
            onDelete={async () => {
              if (actionsDisabled) return;
              await fetch(`/api/projects/${projectId}/tasks/${row.id}`, {
                method: "DELETE",
              });
              await onAfterDeleteTask?.();
            }}
            disabled={actionsDisabled}
            deleteTitle="确定删除该任务？"
          />
        </div>
      ),
    },
  ];

  return (
    sortedVisibleSegments.length === 0 ? (
      <div style={{ padding: "32px 0" }}>
        <Empty description="暂无项目环节" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    ) : (
      <>
        <Collapse
          style={{ width: "100%", overflowX: "auto" }}
          items={sortedVisibleSegments.map((segment) => {
            const pagination = paginationBySegment[segment.id] ?? {
              current: 1,
              pageSize,
            };

            return {
              key: segment.id,
              label: (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      verticalAlign: "bottom",
                      maxWidth: 320,
                    }}
                    title={segment.name}
                  >
                    <AppLink href={`/project-segments/${segment.id}`}>{segment.name}</AppLink>
                  </span>
                  <SelectOptionQuickEditTag
                    field="projectSegment.status"
                    option={
                      segment.statusOption ??
                      (segment.status ? { value: segment.status, color: null } : null)
                    }
                    disabled={actionsDisabled}
                    modalTitle="修改环节状态"
                    modalDescription="勾选只会暂存状态切换。点击保存后会一并保存选项改动、排序和环节状态。"
                    optionValueLabel="状态值"
                    saveSuccessText="环节状态已保存"
                    onSaveSelection={async (nextOption) => {
                      await onUpdateSegmentStatus?.(segment, nextOption);
                    }}
                    onUpdated={onAfterUpdateTask}
                  />
                  <span style={{ color: "rgba(0,0,0,0.65)", whiteSpace: "nowrap" }}>
                    截止日期：{formatDateOrEmpty(segment.dueDate) || "-"}
                  </span>
                </div>
              ),
              extra: (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={actionsDisabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddTask?.(segment);
                  }}
                >
                  新建任务
                </Button>
              ),
              children: (
                <div style={{ width: "100%", minWidth: 0, overflowX: "auto" }}>
                  <ProTable<ProjectProgressTaskRow>
                    key={`${segment.id}-${taskStatusOrderSignature}`}
                    rowKey="id"
                    columns={taskColumns}
                    dataSource={segment.tasks}
                    tableLayout="fixed"
                    search={false}
                    options={false}
                    toolBarRender={false}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      placement: ["bottomEnd"],
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50", "100"],
                      onChange: (nextPage, nextPageSize) => {
                        setPaginationBySegment((prev) => ({
                          ...prev,
                          [segment.id]: {
                            current: nextPage,
                            pageSize: nextPageSize ?? pagination.pageSize,
                          },
                        }));
                      },
                    }}
                    cardBordered={false}
                    size="small"
                    rowClassName={() => "project-progress-task-row-compact"}
                    scroll={{ x: "max-content" }}
                    locale={{ emptyText: "暂无任务" }}
                    tableStyle={{
                      fontSize: 12,
                    }}
                    tableRender={(_, dom) => (
                      <>
                        <style>{`
                          .project-progress-task-row-compact td.ant-table-cell {
                            padding-top: 8px !important;
                            padding-bottom: 8px !important;
                          }
                          .project-progress-task-row-compact td.ant-table-cell .ant-btn {
                            padding-top: 0;
                            padding-bottom: 0;
                          }
                        `}</style>
                        {dom}
                      </>
                    )}
                  />
                </div>
              ),
            };
          })}
        />
        <ProjectTaskStepFormModal
          open={Boolean(editingTask)}
          projectId={projectId}
          projectName={projectName}
          data={sortedVisibleSegments}
          task={editingTask}
          employees={employees}
          onCancel={() => setEditingTask(null)}
          onSuccess={async () => {
            setEditingTask(null);
            await onAfterUpdateTask?.();
          }}
        />
      </>
    )
  );
};

export default ProjectDetailProgressContent;
