"use client";

import { Button } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { PlusOutlined } from "@ant-design/icons";
import AppLink from "@/components/AppLink";
import PlannedWorkScheduleValue from "@/components/project-detail/PlannedWorkScheduleValue";
import PlannedWorkWeekValue from "@/components/project-detail/PlannedWorkWeekValue";
import PlannedWorkYearValue from "@/components/project-detail/PlannedWorkYearValue";
import ProjectSegmentStatusValue from "@/components/project-detail/ProjectSegmentStatusValue";
import TableActions from "@/components/TableActions";
import { formatDate } from "@/lib/date";
import { DATE_FORMAT } from "@/lib/constants";

type OptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
} | null;

export type ProjectProgressPlannedEntryRow = {
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
};

export type ProjectProgressTaskRow = {
  id: string;
  segmentId: string;
  segmentName: string;
  name: string;
  status?: string | null;
  ownerName: string;
  ownerId?: string | null;
  dueDate?: string | null;
  plannedEntries?: ProjectProgressPlannedEntryRow[];
};

export type ProjectProgressSegmentRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: OptionValue;
  ownerName: string;
  ownerId?: string | null;
  dueDate?: string | null;
  tasks: ProjectProgressTaskRow[];
};

type Props = {
  data: ProjectProgressSegmentRow[];
  segmentHeaderTitle?: string;
  emptyText?: string;
  pageSize?: number;
  plannedYearOptionMap?: Map<
    string,
    { id: string; value: string; color?: string | null }
  >;
  plannedWeekOptionMap?: Map<
    string,
    { id: string; value: string; color?: string | null }
  >;
  onAddTask?: (segment: ProjectProgressSegmentRow) => void;
  onEditSegment?: (segment: ProjectProgressSegmentRow) => void;
  onDeleteSegment?: (segment: ProjectProgressSegmentRow) => void;
  onAddPlannedWork?: (task: ProjectProgressTaskRow) => void;
  onEditTask?: (task: ProjectProgressTaskRow) => void;
  onDeleteTask?: (task: ProjectProgressTaskRow) => void;
  onEditPlannedWork?: (entry: ProjectProgressPlannedEntryRow) => void;
  onDeletePlannedWork?: (entry: ProjectProgressPlannedEntryRow) => void;
  actionsDisabled?: boolean;
};

const formatDateOrEmpty = (value?: string | null) => {
  return formatDate(value, DATE_FORMAT, "").replaceAll("-", "/");
};

const toDisplayDays = (value: number) => `${Number(value.toFixed(2))}天`;

const ProjectProgressNestedTable = ({
  data,
  segmentHeaderTitle = "项目环节",
  emptyText = "暂无项目环节",
  pageSize = 8,
  plannedYearOptionMap = new Map(),
  plannedWeekOptionMap = new Map(),
  onAddTask,
  onEditSegment,
  onDeleteSegment,
  onAddPlannedWork,
  onEditTask,
  onDeleteTask,
  onEditPlannedWork,
  onDeletePlannedWork,
  actionsDisabled = false,
}: Props) => {
  const segmentColumns: ProColumns<ProjectProgressSegmentRow>[] = [
    {
      title: segmentHeaderTitle,
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 220 } }),
      render: (_value, row) => (
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
          <AppLink href={`/project-segments/${row.id}`}>{row.name}</AppLink>
        </span>
      ),
    },
    {
      title: "环节状态",
      dataIndex: "status",
      width: 170,
      defaultSortOrder: "ascend",
      sorter: (left, right) => {
        const leftStatus = left.status ?? "";
        const rightStatus = right.status ?? "";
        const isLeftDone = leftStatus.includes("完成");
        const isRightDone = rightStatus.includes("完成");
        if (isLeftDone !== isRightDone) return isLeftDone ? 1 : -1;
        return leftStatus.localeCompare(rightStatus, "zh-CN");
      },
      render: (_value, row) => (
        <ProjectSegmentStatusValue
          status={row.status}
          statusOption={row.statusOption}
        />
      ),
    },
    {
      title: "环节负责人",
      dataIndex: "ownerName",
      width: 160,
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
      width: 160,
      render: (_dom, row) => formatDateOrEmpty(row.dueDate),
    },
    {
      title: "操作",
      key: "actions",
      width: 300,
      onCell: () => ({ style: { whiteSpace: "nowrap", overflow: "visible" } }),
      render: (_value, row) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            disabled={actionsDisabled}
            onClick={() => onAddTask?.(row)}
          >
            添加任务
          </Button>
          <TableActions
            onEdit={() => onEditSegment?.(row)}
            onDelete={() => onDeleteSegment?.(row)}
            disabled={actionsDisabled}
            deleteTitle="确定删除该环节？"
          />
        </div>
      ),
    },
  ];

  const taskColumns: ProColumns<ProjectProgressTaskRow>[] = [
    {
      title: "任务名称",
      dataIndex: "name",
      width: 220,
      ellipsis: true,
      onCell: () => ({ style: { maxWidth: 220 } }),
      render: (_value, row) => (
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
      ),
    },
    {
      title: "任务负责人",
      dataIndex: "ownerName",
      width: 160,
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
      width: 160,
      render: (_dom, row) => formatDateOrEmpty(row.dueDate),
    },
    {
      title: "操作",
      key: "actions",
      width: 280,
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
            onEdit={() => onEditTask?.(row)}
            onDelete={() => onDeleteTask?.(row)}
            disabled={actionsDisabled}
            deleteTitle="确定删除该任务？"
          />
        </div>
      ),
    },
  ];

  const plannedColumns: ProColumns<ProjectProgressPlannedEntryRow>[] = [
    {
      title: "年份",
      dataIndex: "year",
      width: 90,
      render: (_dom, row) => (
        <PlannedWorkYearValue year={row.year} optionMap={plannedYearOptionMap} />
      ),
    },
    {
      title: "周数",
      dataIndex: "weekNumber",
      width: 90,
      render: (_dom, row) => (
        <PlannedWorkWeekValue weekNumber={row.weekNumber} optionMap={plannedWeekOptionMap} />
      ),
    },
    {
      title: "计划天数",
      dataIndex: "plannedDays",
      width: 110,
      render: (_dom, row) => toDisplayDays(row.plannedDays),
    },
    {
      title: "时间安排",
      key: "timeArrangement",
      width: 280,
      render: (_value, row) => (
        <PlannedWorkScheduleValue
          entryId={row.id}
          weekNumber={row.weekNumber}
          monday={row.monday}
          tuesday={row.tuesday}
          wednesday={row.wednesday}
          thursday={row.thursday}
          friday={row.friday}
          saturday={row.saturday}
          sunday={row.sunday}
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      onCell: () => ({ style: { whiteSpace: "nowrap", overflow: "visible" } }),
      render: (_value, row) => (
        <TableActions
          onEdit={() => onEditPlannedWork?.(row)}
          onDelete={() => onDeletePlannedWork?.(row)}
          disabled={actionsDisabled}
          deleteTitle="确定删除该计划工时？"
        />
      ),
    },
  ];

  return (
    <div style={{ width: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
      <ProTable<ProjectProgressSegmentRow>
        rowKey="id"
        columns={segmentColumns}
        dataSource={data}
        search={false}
        options={false}
        toolBarRender={false}
        pagination={{ pageSize, placement: ["bottomEnd"] }}
        cardBordered={false}
        size="small"
        scroll={{ x: 1200 }}
        locale={{ emptyText }}
        expandable={{
          rowExpandable: (record) => record.tasks.length > 0,
          expandedRowRender: (record) => (
            <div style={{ width: "100%", minWidth: 0, overflowX: "auto" }}>
              <ProTable<ProjectProgressTaskRow>
                rowKey="id"
                columns={taskColumns}
                dataSource={record.tasks}
                search={false}
                options={false}
                toolBarRender={false}
                pagination={false}
                cardBordered={false}
                size="small"
                scroll={{ x: 1000 }}
                locale={{ emptyText: "暂无任务" }}
                expandable={{
                  rowExpandable: (task) => (task.plannedEntries?.length ?? 0) > 0,
                  expandedRowRender: (task) => (
                    <div style={{ width: "100%", minWidth: 0, overflowX: "auto" }}>
                      <ProTable<ProjectProgressPlannedEntryRow>
                        rowKey="id"
                        columns={plannedColumns}
                        dataSource={task.plannedEntries ?? []}
                        search={false}
                        options={false}
                        toolBarRender={false}
                        pagination={false}
                        cardBordered={false}
                        size="small"
                        scroll={{ x: 900 }}
                        locale={{ emptyText: "暂无计划工时" }}
                      />
                    </div>
                  ),
                }}
              />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default ProjectProgressNestedTable;
