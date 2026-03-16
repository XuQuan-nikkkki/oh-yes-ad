// @ts-nocheck
"use client";

import { Button, Tag } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import { PlusOutlined } from "@ant-design/icons";
import AppLink from "@/components/AppLink";
import TableActions from "@/components/TableActions";
import SelectOptionTag from "@/components/SelectOptionTag";
import dayjs from "dayjs";

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
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY/MM/DD") : "";
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
        <SelectOptionTag
          option={
            row.statusOption?.value
              ? {
                  id: row.statusOption.id ?? "",
                  value: row.statusOption.value,
                  color: row.statusOption.color ?? null,
                }
              : null
          }
          fallbackText={row.status || "-"}
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
      render: (value) => formatDateOrEmpty(value),
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
            editDisabled={actionsDisabled}
            deleteDisabled={actionsDisabled}
            editText="编辑"
            deleteText="删除"
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
      render: (value) => formatDateOrEmpty(value),
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
            editDisabled={actionsDisabled}
            deleteDisabled={actionsDisabled}
            editText="编辑"
            deleteText="删除"
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
      render: (value: number) => {
        const text = String(value);
        const option = plannedYearOptionMap.get(text);
        return (
          <SelectOptionTag
            option={
              option
                ? { id: option.id, value: option.value, color: option.color ?? null }
                : { id: "", value: text, color: null }
            }
          />
        );
      },
    },
    {
      title: "周数",
      dataIndex: "weekNumber",
      width: 90,
      render: (value: number) => {
        const text = String(value);
        const option = plannedWeekOptionMap.get(text);
        return (
          <SelectOptionTag
            option={
              option
                ? { id: option.id, value: option.value, color: option.color ?? null }
                : { id: "", value: text, color: null }
            }
          />
        );
      },
    },
    {
      title: "计划天数",
      dataIndex: "plannedDays",
      width: 110,
      render: (value: number) => toDisplayDays(value),
    },
    {
      title: "时间安排",
      key: "timeArrangement",
      width: 280,
      render: (_value, row) => {
        const dayItems: Array<{
          key: keyof Pick<
            ProjectProgressPlannedEntryRow,
            | "monday"
            | "tuesday"
            | "wednesday"
            | "thursday"
            | "friday"
            | "saturday"
            | "sunday"
          >;
          label: string;
        }> = [
          { key: "monday", label: "一" },
          { key: "tuesday", label: "二" },
          { key: "wednesday", label: "三" },
          { key: "thursday", label: "四" },
          { key: "friday", label: "五" },
          { key: "saturday", label: "六" },
          { key: "sunday", label: "日" },
        ];

        const visibleDays = dayItems.filter((item) => {
          if (item.key === "saturday" || item.key === "sunday") {
            return Boolean(row[item.key]);
          }
          return true;
        });

        return (
          <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
            <Tag color="#d9d9d9" style={{ marginInlineEnd: 0, fontWeight: 600 }}>
              {`W${row.weekNumber}`}
            </Tag>
            {visibleDays.map((item) => (
              <Tag
                key={`${row.id}-${item.key}`}
                color={row[item.key] ? "#b7eb8f" : "#d9d9d9"}
                style={{
                  marginInlineEnd: 0,
                  fontWeight: 600,
                  color: row[item.key] ? "#389e0d" : "#8c8c8c",
                }}
              >
                {item.label}
              </Tag>
            ))}
          </span>
        );
      },
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
          editDisabled={actionsDisabled}
          deleteDisabled={actionsDisabled}
          editText="编辑"
          deleteText="删除"
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
