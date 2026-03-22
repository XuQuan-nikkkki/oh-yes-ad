"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Spin } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import { formatDate } from "@/lib/date";
import { formatProjectPeriod } from "@/lib/workday";
import type { ProjectTaskListRow } from "@/components/ProjectTasksListTable";
import { useAuthStore } from "@/stores/authStore";
import { useProjectTasksStore } from "@/stores/projectTasksStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { Project } from "@/types/project";
import type { SelectOptionValue } from "@/types/selectOption";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

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
  active?: boolean;
};

const HomeParticipationNestedTable = ({
  active = false,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const fetchTasksFromStore = useProjectTasksStore((state) => state.fetchTasks);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskListRow[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustmentRange[]
  >([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const inflightUserIdRef = useRef<string | null>(null);
  const shouldShowLoading =
    active &&
    Boolean(currentUser?.id) &&
    loadedUserId !== currentUser?.id;

  useEffect(() => {
    if (!active) return;

    const userId = currentUser?.id;
    if (!userId) {
      setProjects([]);
      setTasks([]);
      setWorkdayAdjustments([]);
      setLoadedUserId(null);
      return;
    }

    if (loadedUserId === userId) return;
    if (inflightUserIdRef.current === userId) return;

    inflightUserIdRef.current = userId;
    setLoading(true);
    void (async () => {
      try {
        const [tasksData, adjustmentsData] = await Promise.all([
          fetchTasksFromStore({ ownerId: userId }),
          fetchAdjustmentsFromStore(),
        ]);
        const nextTasks = Array.isArray(tasksData)
          ? (tasksData as ProjectTaskListRow[])
          : [];
        const projectMap = new Map<string, Project>();
        for (const task of nextTasks) {
          const project = task.segment?.project;
          if (!project?.id || !project?.name) continue;
          if (projectMap.has(project.id)) continue;
          projectMap.set(project.id, {
            id: project.id,
            name: project.name,
          });
        }
        setTasks(nextTasks);
        setProjects(Array.from(projectMap.values()));
        setWorkdayAdjustments(
          Array.isArray(adjustmentsData) ? adjustmentsData : [],
        );
        setLoadedUserId(userId);
      } finally {
        if (inflightUserIdRef.current === userId) {
          inflightUserIdRef.current = null;
        }
        setLoading(false);
      }
    })();
  }, [
    active,
    currentUser?.id,
    fetchAdjustmentsFromStore,
    fetchTasksFromStore,
    loadedUserId,
  ]);

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
        return formatDate(row.dueDate, undefined, "");
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
      render: (_value, row) => formatProjectPeriod(row.startDate, row.endDate, workdayAdjustments),
    },
  ];

  return shouldShowLoading ? (
    <Card loading />
  ) : (
    <Spin spinning={loading}>
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
    </Spin>
  );
};

export default HomeParticipationNestedTable;
