"use client";

import { useMemo } from "react";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import type { Project } from "@/components/ProjectsTable";
import type { ProjectTaskListRow } from "@/components/ProjectTasksListTable";

type WorkdayAdjustment = {
  startDate: string;
  endDate: string;
  changeType: string;
};

type SelectOptionValue = {
  id?: string;
  value?: string | null;
  color?: string | null;
};

type ProjectNestedRow = {
  id: string;
  name: string;
  tasksCount: number;
  status?: string | null;
  stage?: string | null;
  statusOption?: SelectOptionValue | null;
  stageOption?: SelectOptionValue | null;
  startDate?: string | null;
  endDate?: string | null;
  tasks: ProjectTaskListRow[];
};

type Props = {
  loading?: boolean;
  projects: Project[];
  tasks: ProjectTaskListRow[];
  workdayAdjustments?: WorkdayAdjustment[];
};

const HomeParticipationNestedTable = ({
  loading = false,
  projects,
  tasks,
  workdayAdjustments = [],
}: Props) => {
  const calculateWorkdays = (
    startDate: Date,
    endDate: Date,
    adjustments: WorkdayAdjustment[],
  ): number => {
    let workdays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split("T")[0];

      const adjustment = adjustments.find((adj) => {
        const adjStart = new Date(adj.startDate).toISOString().split("T")[0];
        const adjEnd = new Date(adj.endDate).toISOString().split("T")[0];
        return dateStr >= adjStart && dateStr <= adjEnd;
      });

      if (adjustment) {
        if (adjustment.changeType === "上班") {
          workdays++;
        }
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workdays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workdays;
  };

  const formatPeriod = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate) return "-";
    const start = new Date(startDate);
    const today = new Date();
    const effectiveEnd = endDate ? new Date(endDate) : today;
    const naturalDays =
      Math.floor(
        (effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const workdays = calculateWorkdays(start, effectiveEnd, workdayAdjustments);
    const startStr = dayjs(start).format("YYYY/MM/DD");
    const endStr = endDate ? dayjs(endDate).format("YYYY/MM/DD") : "至今";
    return `${startStr} - ${endStr} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;
  };

  const rows = useMemo<ProjectNestedRow[]>(() => {
    const availableProjects = projects.filter(
      (project) =>
        !project.isArchived && !(project.name ?? "").includes("中台项目"),
    );
    const availableProjectIds = new Set(availableProjects.map((item) => item.id));

    const projectMap = new Map<string, ProjectNestedRow>();

    for (const project of availableProjects) {
      if (!project?.id) continue;
      projectMap.set(project.id, {
        id: project.id,
        name: project.name,
        tasksCount: 0,
        status: project.status,
        stage: project.stage,
        statusOption: project.statusOption ?? null,
        stageOption: project.stageOption ?? null,
        startDate: project.startDate,
        endDate: project.endDate,
        tasks: [],
      });
    }

    for (const task of tasks) {
      const project = task.segment?.project;
      if (!project?.id) continue;
      if (!availableProjectIds.has(project.id)) continue;
      if ((project.name ?? "").includes("中台项目")) continue;

      const projectRow =
        projectMap.get(project.id) ?? {
          id: project.id,
          name: project.name,
          tasksCount: 0,
          status: null,
          stage: null,
          statusOption: null,
          stageOption: null,
          startDate: null,
          endDate: null,
          tasks: [],
        };

      projectRow.tasks.push(task);

      projectRow.tasksCount += 1;
      projectMap.set(project.id, projectRow);
    }

    return Array.from(projectMap.values())
      .map((projectRow) => ({
        ...projectRow,
        tasks: [...projectRow.tasks].sort((left, right) =>
          (left.name ?? "").localeCompare(right.name ?? "", "zh-CN"),
        ),
      }))
      .sort((left, right) => {
        const leftStatus = (left.statusOption?.value ?? left.status ?? "").trim();
        const rightStatus = (right.statusOption?.value ?? right.status ?? "").trim();
        const statusCompare = leftStatus.localeCompare(rightStatus, "zh-CN");
        if (statusCompare !== 0) return statusCompare;

        const leftStart = left.startDate ? dayjs(left.startDate).valueOf() : -Infinity;
        const rightStart = right.startDate ? dayjs(right.startDate).valueOf() : -Infinity;
        return rightStart - leftStart;
      });
  }, [projects, tasks]);

  const taskColumns: ProColumns<ProjectTaskListRow>[] = [
    {
      title: "任务名称",
      dataIndex: "name",
      width: 280,
      render: (_value, row) => <AppLink href={`/project-tasks/${row.id}`}>{row.name}</AppLink>,
    },
    {
      title: "所属环节",
      dataIndex: "segment",
      width: 220,
      render: (_value, row) =>
        row.segment?.id ? (
          <AppLink href={`/project-segments/${row.segment.id}`}>{row.segment.name}</AppLink>
        ) : (
          ""
        ),
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 160,
      render: (_dom, row) => {
        const value = row.dueDate;
        if (!value) return "";
        const parsed = dayjs(String(value));
        return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
      },
    },
  ];

  const projectColumns: ProColumns<ProjectNestedRow>[] = [
    {
      title: "项目名称",
      dataIndex: "name",
      width: 360,
      render: (_value, row) => <AppLink href={`/projects/${row.id}`}>{row.name}</AppLink>,
    },
    {
      title: "项目状态",
      dataIndex: "status",
      width: 160,
      render: (_value, row) =>
        row.statusOption?.value ? (
          <SelectOptionTag
            option={{
              id: row.statusOption.id ?? "",
              value: row.statusOption.value,
              color: row.statusOption.color ?? null,
            }}
            fallbackText={row.status || "-"}
          />
        ) : (
          row.status || "-"
        ),
    },
    {
      title: "项目阶段",
      dataIndex: "stage",
      width: 160,
      render: (_value, row) =>
        row.stageOption?.value ? (
          <SelectOptionTag
            option={{
              id: row.stageOption.id ?? "",
              value: row.stageOption.value,
              color: row.stageOption.color ?? null,
            }}
            fallbackText={row.stage || "-"}
          />
        ) : (
          row.stage || "-"
        ),
    },
    {
      title: "项目周期",
      key: "period",
      width: 340,
      render: (_value, row) => formatPeriod(row.startDate, row.endDate),
    },
  ];

  return (
    <ProTable<ProjectNestedRow>
      rowKey="id"
      loading={loading}
      search={false}
      options={false}
      columns={projectColumns}
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      tableLayout="auto"
      scroll={{ x: "max-content" }}
      headerTitle={null}
      locale={{ emptyText: "暂无项目或任务" }}
      expandable={{
        rowExpandable: (projectRow) => projectRow.tasks.length > 0,
        expandedRowRender: (projectRow) => (
          <ProTable<ProjectTaskListRow>
            rowKey="id"
            search={false}
            options={false}
            columns={taskColumns}
            dataSource={projectRow.tasks}
            pagination={false}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            headerTitle={null}
          />
        ),
      }}
    />
  );
};

export default HomeParticipationNestedTable;
