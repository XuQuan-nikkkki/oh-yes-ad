"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Card,
  Collapse,
  Empty,
  Modal,
  Segmented,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import SelectOptionTag from "@/components/SelectOptionTag";
import AppLink from "@/components/AppLink";
import ClientProjectSchedulePane from "@/components/schedule/ClientProjectSchedulePane";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { ProjectMilestoneFormPayload } from "@/components/project-detail/ProjectMilestoneForm";
import type { ProjectSegmentFormPayload } from "@/components/project-detail/ProjectSegmentForm";
import type { ProjectTaskFormPayload } from "@/components/project-detail/ProjectTaskForm";
import ProjectMilestoneFormModal from "@/components/project-detail/ProjectMilestoneFormModal";
import ProjectSegmentFormModal from "@/components/project-detail/ProjectSegmentFormModal";
import ProjectTaskFormModal from "@/components/project-detail/ProjectTaskFormModal";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import ProjectMilestoneSection from "@/components/project-detail/ProjectMilestoneSection";
import ProjectProgressNestedTable from "@/components/project-detail/ProjectProgressNestedTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { DEFAULT_COLOR } from "@/lib/constants";

dayjs.extend(isoWeek);

type ProjectListItem = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  status?: string | null;
  isArchived?: boolean | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type Participant = {
  id: string;
  name: string;
};

type EmployeeListItem = {
  id: string;
  name: string;
  function?: string | null;
  functionOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
};

type ClientParticipant = {
  id: string;
  name: string;
  title?: string | null;
  order?: number | null;
};

type PlannedWorkEntry = {
  id: string;
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

type WeeklyPlannedEntry = {
  id: string;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  year?: number | null;
  weekNumber?: number | null;
  task?: {
    id: string;
    name: string;
    owner?: {
      id: string;
      name: string;
    } | null;
    segment?: {
      id: string;
      name: string;
      project?: {
        id: string;
        name: string;
        client?: {
          id: string;
          name: string;
        } | null;
      } | null;
    } | null;
  } | null;
};

type ProjectDetail = {
  id: string;
  name: string;
  client?: {
    id: string;
    name: string;
  } | null;
  members?: {
    id: string;
    name: string;
    employmentStatus?: string | null;
  }[];
  vendors?: {
    id: string;
    name: string;
  }[];
  milestones?: {
    id: string;
    name: string;
    type?: string | null;
    typeOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    date?: string | null;
    internalParticipants?: Participant[];
    clientParticipants?: ClientParticipant[];
    vendorParticipants?: Participant[];
  }[];
  segments?: {
    id: string;
    name: string;
    status?: string | null;
    statusOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    dueDate?: string | null;
    owner?: {
      id: string;
      name: string;
    } | null;
    projectTasks?: {
      id: string;
      name: string;
      status?: string | null;
      dueDate?: string | null;
      owner?: {
        id: string;
        name: string;
      } | null;
      plannedWorkEntries?: PlannedWorkEntry[];
    }[];
  }[];
};

type SegmentRow = {
  id: string;
  name: string;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  ownerName: string;
  ownerId?: string | null;
  dueDate?: string | null;
  tasks: TaskRow[];
};

type TaskRow = {
  id: string;
  segmentId: string;
  segmentName: string;
  name: string;
  status?: string | null;
  ownerName: string;
  ownerId?: string | null;
  dueDate?: string | null;
  plannedEntries?: TaskPlannedRow[];
};

type TaskPlannedRow = {
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

type WeeklyTaskItem = {
  clientName: string;
  taskName: string;
};

type WeeklyProjectSummary = {
  projectId: string | null;
  projectName: string;
  days: number;
  tasks: Array<{
    taskId: string | null;
    taskName: string;
    days: number;
  }>;
};

type WeeklyEmployeeRow = {
  key: string;
  name: string;
  hasSchedule: boolean;
  totalDays: number;
  functionLabel: string;
  functionOption: EmployeeListItem["functionOption"];
  projectSummaries: WeeklyProjectSummary[];
  dailyMap: Record<
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday",
    WeeklyTaskItem[]
  >;
};

type WeeklyMetricRow = {
  key:
    | "function"
    | "totalDays"
    | "distribution"
    | "projectTaskDistribution"
    | "dailyTasks";
  metricLabel: string;
};

type ProjectTaskListRow = {
  id: string;
  name: string;
  segmentId: string;
  segmentName: string;
  ownerId?: string | null;
  ownerName: string;
  dueDate?: string | null;
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周日",
};
const WEEKEND_DAY_KEYS = new Set<(typeof DAY_KEYS)[number]>([
  "saturday",
  "sunday",
]);

const FUNCTION_GROUP_PRIORITY: Record<string, number> = {
  设计组: 1,
  品牌组: 2,
  项目组: 3,
};
const CONDITIONAL_VISIBLE_EMPLOYEES = new Set([
  "Johnny",
  "张弛",
  "小花",
  "Icy",
  "Dona",
]);
const SCHEDULE_TAB_KEYS = new Set([
  "weekly-tasks",
  "client-project-schedule",
  "internal-project-schedule",
]);

const toDisplayDays = (value: number) =>
  `${Number(value.toFixed(2)).toString().replace(/\.0$/, "")}天`;

function SchedulePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<
    Record<string, ProjectDetail>
  >({});
  const [projectDetailLoadingById, setProjectDetailLoadingById] = useState<
    Record<string, boolean>
  >({});
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [weeklyPlannedEntries, setWeeklyPlannedEntries] = useState<
    WeeklyPlannedEntry[]
  >([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [clientContacts, setClientContacts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(
    null,
  );
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [plannedWorkModalOpen, setPlannedWorkModalOpen] = useState(false);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);
  const [segmentSubmitting, setSegmentSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [plannedWorkSubmitting, setPlannedWorkSubmitting] = useState(false);
  const [projectProgressViewById, setProjectProgressViewById] = useState<
    Record<string, "progress" | "tasks">
  >({});
  const { canManageProject } = useProjectPermission();
  const employeesFromStore = useEmployeesStore((state) => state.employees);
  const employeesFullFromStore = useEmployeesStore((state) => state.employeesFull);
  const employeesLoaded = useEmployeesStore((state) => state.loaded);
  const employeesLoadedFull = useEmployeesStore((state) => state.loadedFull);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const [editingSegment, setEditingSegment] = useState<SegmentRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [editingPlannedEntry, setEditingPlannedEntry] =
    useState<TaskPlannedRow | null>(null);
  const [taskDefaultSegmentId, setTaskDefaultSegmentId] = useState<
    string | undefined
  >(undefined);
  const [plannedDefaultTaskId, setPlannedDefaultTaskId] = useState<
    string | undefined
  >(undefined);
  const [internalExpandedProjectIds, setInternalExpandedProjectIds] = useState<
    string[]
  >([]);
  const activeScheduleTab = useMemo(() => {
    const tab = searchParams.get("tab");
    if (tab && SCHEDULE_TAB_KEYS.has(tab)) {
      return tab;
    }
    return "client-project-schedule";
  }, [searchParams]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await fetchProjectsFromStore();
        setAllProjects(Array.isArray(data) ? (data as ProjectListItem[]) : []);
      } finally {
        setLoadingProjects(false);
      }
    };

    void fetchProjects();
  }, [fetchProjectsFromStore]);

  useEffect(() => {
    if (activeScheduleTab !== "weekly-tasks") return;
    const fetchWeeklyData = async () => {
      setLoadingWeekly(true);
      try {
        const now = dayjs();
        const currentYear = String(now.year());
        const currentWeek = String(now.isoWeek());

        const plannedPromise = fetch(
          `/api/planned-work-entries?page=1&pageSize=1000&year=${currentYear}&weekNumber=${currentWeek}`,
          { cache: "no-store" },
        );
        const employeesPromise =
          employeesLoaded && employeesFromStore.length > 0
            ? Promise.resolve(employeesFromStore)
            : employeesLoadedFull && employeesFullFromStore.length > 0
              ? Promise.resolve(employeesFullFromStore)
              : fetchEmployeesFromStore();

        const [employeesPayload, plannedRes] = await Promise.all([
          employeesPromise,
          plannedPromise,
        ]);

        const plannedPayload = await plannedRes.json();

        const nextEmployees = Array.isArray(employeesPayload)
          ? employeesPayload
          : [];
        const nextEntries = Array.isArray(plannedPayload?.data)
          ? plannedPayload.data
          : [];

        setEmployees(nextEmployees as EmployeeListItem[]);
        setWeeklyPlannedEntries(nextEntries as WeeklyPlannedEntry[]);
      } finally {
        setLoadingWeekly(false);
      }
    };

    void fetchWeeklyData();
  }, [
    activeScheduleTab,
    employeesFromStore,
    employeesFullFromStore,
    employeesLoaded,
    employeesLoadedFull,
    fetchEmployeesFromStore,
  ]);

  const visibleProjects = useMemo(
    () =>
      allProjects
        .filter((project) => {
          if (Boolean(project.isArchived)) return false;
          const typeValue =
            project.typeOption?.value?.trim() || project.type?.trim() || "";
          return typeValue !== "INTERNAL" && typeValue !== "内部项目";
        })
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
    [allProjects],
  );

  const internalVisibleProjects = useMemo(
    () =>
      allProjects
        .filter((project) => {
          if (Boolean(project.isArchived)) return false;
          const typeValue =
            project.typeOption?.value?.trim() || project.type?.trim() || "";
          if (typeValue !== "INTERNAL" && typeValue !== "内部项目") return false;
          if (project.name.includes("中台")) return false;
          return true;
        })
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
    [allProjects],
  );

  const groupedVisibleProjects = useMemo(() => {
    const statusOrderByValue = new Map<string, number>();
    for (const option of optionsByField["project.status"] ?? []) {
      const statusValue = (option.value ?? "").trim();
      if (!statusValue) continue;
      statusOrderByValue.set(
        statusValue,
        typeof option.order === "number"
          ? option.order
          : Number.MAX_SAFE_INTEGER,
      );
    }

    const groups = new Map<string, ProjectListItem[]>();
    for (const project of visibleProjects) {
      const status =
        project.statusOption?.value?.trim() ||
        project.status?.trim() ||
        "未设置状态";
      const list = groups.get(status) ?? [];
      list.push(project);
      groups.set(status, list);
    }

    return Array.from(groups.entries())
      .map(([status, projects]) => ({
        status,
        statusOption:
          (optionsByField["project.status"] ?? []).find(
            (option) => (option.value ?? "").trim() === status,
          ) ?? null,
        projects: [...projects].sort((left, right) =>
          left.name.localeCompare(right.name, "zh-CN"),
        ),
      }))
      .sort((left, right) => {
        const leftOrder =
          statusOrderByValue.get(left.status) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder =
          statusOrderByValue.get(right.status) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.status.localeCompare(right.status, "zh-CN");
      });
  }, [optionsByField, visibleProjects]);

  const plannedYearOptionMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; value: string; color?: string | null }
    >();
    for (const option of optionsByField["plannedWorkEntry.year"] ?? []) {
      map.set(option.value, {
        id: option.id,
        value: option.value,
        color: option.color ?? null,
      });
    }
    return map;
  }, [optionsByField]);

  const plannedWeekOptionMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; value: string; color?: string | null }
    >();
    for (const option of optionsByField["plannedWorkEntry.weekNumber"] ?? []) {
      map.set(option.value, {
        id: option.id,
        value: option.value,
        color: option.color ?? null,
      });
    }
    return map;
  }, [optionsByField]);

  const defaultClientProjectId = useMemo(() => {
    const inProgressGroup = groupedVisibleProjects.find(
      (group) => group.status === "推进中",
    );
    if (inProgressGroup?.projects?.length) {
      return inProgressGroup.projects[0].id;
    }
    return visibleProjects[0]?.id ?? null;
  }, [groupedVisibleProjects, visibleProjects]);

  const activeClientProjectId = useMemo(() => {
    const projectId = searchParams.get("projectId");
    if (
      projectId &&
      visibleProjects.some((project) => project.id === projectId)
    ) {
      return projectId;
    }
    if (projectId && loadingProjects) {
      return projectId;
    }
    return defaultClientProjectId;
  }, [defaultClientProjectId, loadingProjects, searchParams, visibleProjects]);

  const selectedClientProject = useMemo(
    () =>
      activeClientProjectId
        ? (visibleProjects.find(
            (project) => project.id === activeClientProjectId,
          ) ?? null)
        : null,
    [activeClientProjectId, visibleProjects],
  );

  const selectedClientProjectDetail = useMemo(
    () =>
      selectedClientProject
        ? (projectDetails[selectedClientProject.id] ?? null)
        : null,
    [projectDetails, selectedClientProject],
  );

  const activeMilestoneProjectId = useMemo(
    () => milestoneProjectId ?? selectedClientProject?.id ?? null,
    [milestoneProjectId, selectedClientProject?.id],
  );

  const activeMilestoneProjectDetail = useMemo(
    () =>
      activeMilestoneProjectId
        ? (projectDetails[activeMilestoneProjectId] ?? null)
        : null,
    [activeMilestoneProjectId, projectDetails],
  );

  const selectedProjectSegmentOptions = useMemo(
    () =>
      (selectedClientProjectDetail?.segments ?? []).map((segment) => ({
        id: segment.id,
        name: segment.name,
      })),
    [selectedClientProjectDetail],
  );

  const selectedProjectTaskOptions = useMemo(
    () =>
      (selectedClientProjectDetail?.segments ?? []).flatMap((segment) =>
        (segment.projectTasks ?? []).map((task) => ({
          id: task.id,
          projectId: selectedClientProject?.id ?? "",
          segmentId: segment.id,
          segmentName: segment.name,
          name: task.name,
        })),
      ),
    [selectedClientProject?.id, selectedClientProjectDetail],
  );

  useEffect(() => {
    if (!milestoneModalOpen) return;
    const clientId = activeMilestoneProjectDetail?.client?.id;
    if (!clientId) {
      setClientContacts([]);
      return;
    }
    const fetchClientContacts = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/contacts`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setClientContacts([]);
          return;
        }
        const data = await response.json();
        setClientContacts(Array.isArray(data) ? data : []);
      } catch {
        setClientContacts([]);
      }
    };
    void fetchClientContacts();
  }, [activeMilestoneProjectDetail?.client?.id, milestoneModalOpen]);

  useEffect(() => {
    if (loadingProjects) {
      return;
    }

    const currentProjectId = searchParams.get("projectId");
    const nextProjectId = selectedClientProject?.id ?? null;
    if ((currentProjectId ?? null) === nextProjectId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextProjectId) {
      params.set("projectId", nextProjectId);
    } else {
      params.delete("projectId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [loadingProjects, pathname, router, searchParams, selectedClientProject]);

  const fetchProjectDetailById = async (
    projectId: string,
    force = false,
  ) => {
    if (!projectId) return;
    if (!force && projectDetails[projectId]) return;
    setProjectDetailLoadingById((prev) => ({
      ...prev,
      [projectId]: true,
    }));
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const detail = (await response.json()) as ProjectDetail;
      setProjectDetails((prev) => ({
        ...prev,
        [projectId]: detail,
      }));
    } finally {
      setProjectDetailLoadingById((prev) => ({
        ...prev,
        [projectId]: false,
      }));
    }
  };

  useEffect(() => {
    if (activeScheduleTab === "client-project-schedule") {
      const projectId = selectedClientProject?.id;
      if (!projectId) return;
      void fetchProjectDetailById(projectId);
      return;
    }
    if (activeScheduleTab === "internal-project-schedule") {
      const projectIds = internalExpandedProjectIds;
      if (projectIds.length === 0) return;
      void Promise.all(projectIds.map((projectId) => fetchProjectDetailById(projectId)));
      return;
    }
    const projectId = activeMilestoneProjectId;
    if (!projectId) return;
    void fetchProjectDetailById(projectId);
  }, [
    activeMilestoneProjectId,
    activeScheduleTab,
    internalExpandedProjectIds,
    selectedClientProject?.id,
  ]);

  const refreshProjectDetails = (projectId?: string | null) => {
    if (!projectId) return;
    void fetchProjectDetailById(projectId, true);
  };

  const handleSubmitMilestone = async (
    payload: ProjectMilestoneFormPayload,
  ) => {
    if (!canManageProject) return;
    if (!activeMilestoneProjectId) {
      messageApi.error("未选择项目");
      return;
    }
    try {
      setMilestoneSubmitting(true);
      const res = await fetch(
        `/api/projects/${activeMilestoneProjectId}/milestones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存里程碑失败");
      }
      messageApi.success("里程碑已创建");
      setMilestoneModalOpen(false);
      setMilestoneProjectId(null);
      refreshProjectDetails(activeMilestoneProjectId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存里程碑失败";
      messageApi.error(text);
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const openEditSegmentModal = (segment: SegmentRow) => {
    if (!canManageProject) return;
    setEditingSegment(segment);
    setSegmentModalOpen(true);
  };

  const openCreateTaskModal = (defaultSegmentId?: string) => {
    if (!canManageProject) return;
    setEditingTask(null);
    setTaskDefaultSegmentId(defaultSegmentId);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskRow) => {
    if (!canManageProject) return;
    setEditingTask(task);
    setTaskDefaultSegmentId(undefined);
    setTaskModalOpen(true);
  };

  const openCreatePlannedWorkModal = (defaultTaskId?: string) => {
    setEditingPlannedEntry(null);
    setPlannedDefaultTaskId(defaultTaskId);
    setPlannedWorkModalOpen(true);
  };

  const openEditPlannedWorkModal = (entry: TaskPlannedRow) => {
    setEditingPlannedEntry(entry);
    setPlannedDefaultTaskId(undefined);
    setPlannedWorkModalOpen(true);
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!canManageProject) return;
    try {
      const res = await fetch(`/api/project-segments/${segmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除环节失败");
      }
      messageApi.success("环节已删除");
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除环节失败";
      messageApi.error(text);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!canManageProject) return;
    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除任务失败");
      }
      messageApi.success("任务已删除");
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除任务失败";
      messageApi.error(text);
    }
  };

  const handleDeletePlannedEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/api/planned-work-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除计划工时失败");
      }
      messageApi.success("计划工时已删除");
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除计划工时失败";
      messageApi.error(text);
    }
  };

  const handleSubmitSegment = async (payload: ProjectSegmentFormPayload) => {
    if (!canManageProject) return;
    if (!selectedClientProject?.id) {
      messageApi.error("未选择项目");
      return;
    }
    try {
      setSegmentSubmitting(true);
      const endpoint = editingSegment
        ? `/api/project-segments/${editingSegment.id}`
        : `/api/projects/${selectedClientProject.id}/segments`;
      const method = editingSegment ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          projectId: selectedClientProject.id,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存环节失败");
      }
      messageApi.success(editingSegment ? "环节已更新" : "环节已创建");
      setSegmentModalOpen(false);
      setEditingSegment(null);
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存环节失败";
      messageApi.error(text);
    } finally {
      setSegmentSubmitting(false);
    }
  };

  const handleSubmitTask = async (payload: ProjectTaskFormPayload) => {
    if (!canManageProject) return;
    if (!selectedClientProject?.id) {
      messageApi.error("未选择项目");
      return;
    }
    try {
      setTaskSubmitting(true);
      const endpoint = editingTask
        ? `/api/project-tasks/${editingTask.id}`
        : `/api/projects/${selectedClientProject.id}/tasks`;
      const method = editingTask ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存任务失败");
      }
      messageApi.success(editingTask ? "任务已更新" : "任务已创建");
      setTaskModalOpen(false);
      setEditingTask(null);
      setTaskDefaultSegmentId(undefined);
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存任务失败";
      messageApi.error(text);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleSubmitPlannedWork = async (
    payload: PlannedWorkEntryFormPayload,
  ) => {
    try {
      setPlannedWorkSubmitting(true);
      const endpoint = editingPlannedEntry
        ? `/api/planned-work-entries/${editingPlannedEntry.id}`
        : "/api/planned-work-entries";
      const method = editingPlannedEntry ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存计划工时失败");
      }
      messageApi.success(
        editingPlannedEntry ? "计划工时已更新" : "计划工时已创建",
      );
      setPlannedWorkModalOpen(false);
      setEditingPlannedEntry(null);
      setPlannedDefaultTaskId(undefined);
      refreshProjectDetails(selectedClientProject?.id);
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存计划工时失败";
      messageApi.error(text);
    } finally {
      setPlannedWorkSubmitting(false);
    }
  };

  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employmentStatus !== "离职" &&
          employee.employmentStatusOption?.value !== "离职",
      ),
    [employees],
  );

  const employeeFunctionById = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees) {
      const functionLabel =
        employee.functionOption?.value?.trim() || employee.function?.trim() || "";
      if (functionLabel) map.set(employee.id, functionLabel);
    }
    return map;
  }, [employees]);

  const weeklyEntriesByEmployee = useMemo(() => {
    const map = new Map<string, WeeklyPlannedEntry[]>();
    for (const entry of weeklyPlannedEntries) {
      const ownerId = entry.task?.owner?.id;
      if (!ownerId) continue;
      const list = map.get(ownerId) ?? [];
      list.push(entry);
      map.set(ownerId, list);
    }
    return map;
  }, [weeklyPlannedEntries]);

  const weeklyRows = useMemo(() => {
    const rows = activeEmployees
      .map((employee) => {
        const entries = weeklyEntriesByEmployee.get(employee.id) ?? [];
        const totalDays = entries.reduce(
          (sum, entry) => sum + (entry.plannedDays ?? 0),
          0,
        );
        const dailyMap: Record<(typeof DAY_KEYS)[number], WeeklyTaskItem[]> = {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
        const projectMap = new Map<string, WeeklyProjectSummary>();

        for (const entry of entries) {
          const clientName =
            entry.task?.segment?.project?.client?.name ?? "内部项目";
          const taskName = entry.task?.name ?? "未命名任务";
          const projectId =
            entry.task?.segment?.project?.id ?? "unknown-project";
          const projectName =
            entry.task?.segment?.project?.name ?? "未命名项目";
          const days = entry.plannedDays ?? 0;

          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              projectId: entry.task?.segment?.project?.id ?? null,
              projectName,
              days: 0,
              tasks: [],
            });
          }
          const projectSummary = projectMap.get(projectId)!;
          projectSummary.days += days;
          const taskId = entry.task?.id ?? null;
          const existingTask = projectSummary.tasks.find(
            (task) => task.taskId === taskId,
          );
          if (existingTask) {
            existingTask.days += days;
          } else {
            projectSummary.tasks.push({
              taskId,
              taskName,
              days,
            });
          }

          for (const dayKey of DAY_KEYS) {
            if (entry[dayKey]) {
              dailyMap[dayKey].push({ clientName, taskName });
            }
          }
        }

        const hasSchedule =
          totalDays > 0 ||
          DAY_KEYS.some((dayKey) => dailyMap[dayKey].length > 0);
        const functionLabel =
          employee.functionOption?.value?.trim() ||
          employee.function?.trim() ||
          "未设置职能";
        const projectSummaries = Array.from(projectMap.values()).sort(
          (left, right) => right.days - left.days,
        );

        return {
          key: employee.id,
          name: employee.name,
          hasSchedule,
          totalDays,
          functionLabel,
          functionOption: employee.functionOption ?? null,
          projectSummaries,
          dailyMap,
        } as WeeklyEmployeeRow;
      })
      .filter((row) => {
        const shouldHideWhenNoSchedule =
          CONDITIONAL_VISIBLE_EMPLOYEES.has(row.name) ||
          row.name.includes("外协");
        if (!shouldHideWhenNoSchedule) {
          return true;
        }
        return row.hasSchedule;
      });

    return rows.sort((left, right) => {
      const leftPriority = FUNCTION_GROUP_PRIORITY[left.functionLabel] ?? 999;
      const rightPriority = FUNCTION_GROUP_PRIORITY[right.functionLabel] ?? 999;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      const functionCompare = left.functionLabel.localeCompare(
        right.functionLabel,
        "zh-CN",
      );
      if (functionCompare !== 0) return functionCompare;

      if (left.hasSchedule !== right.hasSchedule) {
        return left.hasSchedule ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [activeEmployees, weeklyEntriesByEmployee]);

  const weeklyMetricRows: WeeklyMetricRow[] = [
    { key: "function", metricLabel: "职能" },
    { key: "totalDays", metricLabel: "总工时" },
    { key: "distribution", metricLabel: "工时分布" },
    { key: "projectTaskDistribution", metricLabel: "项目 & 任务分布" },
    { key: "dailyTasks", metricLabel: "每日任务情况" },
  ];

  const renderWeeklyEmployeeMetric = (
    employeeRow: WeeklyEmployeeRow,
    metricKey: WeeklyMetricRow["key"],
  ) => {
    if (metricKey === "function") {
      return (
        <SelectOptionTag
          option={
            employeeRow.functionOption?.id
              ? {
                  id: employeeRow.functionOption.id,
                  value: employeeRow.functionOption.value,
                  color: employeeRow.functionOption.color,
                }
              : null
          }
          fallbackText={employeeRow.functionLabel}
        />
      );
    }

    if (metricKey === "totalDays") {
      return employeeRow.hasSchedule ? (
        <Typography.Text style={{ fontSize: 12 }}>
          {toDisplayDays(employeeRow.totalDays)}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    if (metricKey === "distribution") {
      return employeeRow.hasSchedule ? (
        <Space wrap size={[4, 4]}>
          {DAY_KEYS.map((dayKey) => {
            const hasTasks = employeeRow.dailyMap[dayKey].length > 0;
            if (WEEKEND_DAY_KEYS.has(dayKey) && !hasTasks) {
              return null;
            }
            return (
              <Tag
                key={`${employeeRow.key}-${dayKey}`}
                color={hasTasks ? "green" : undefined}
                style={{
                  marginInlineEnd: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: "14px",
                  padding: "0 4px",
                  ...(hasTasks
                    ? {}
                    : {
                        color: DEFAULT_COLOR,
                        background: "#f5f5f5",
                        borderColor: "#f0f0f0",
                      }),
                }}
              >
                {DAY_LABELS[dayKey]}
              </Tag>
            );
          })}
        </Space>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    if (metricKey === "projectTaskDistribution") {
      return employeeRow.hasSchedule ? (
        employeeRow.projectSummaries.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            未安排任务
          </Typography.Text>
        ) : (
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            {employeeRow.projectSummaries.map((projectSummary) => (
              <div key={`${employeeRow.key}-${projectSummary.projectName}`}>
                <Space wrap size={[6, 6]}>
                  <Tag
                    color="default"
                    style={{
                      marginInlineEnd: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: "14px",
                      padding: "0 6px",
                    }}
                  >
                    {projectSummary.projectName}
                  </Tag>
                  <Tag
                    color="processing"
                    style={{
                      marginInlineEnd: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: "14px",
                      padding: "0 4px",
                    }}
                  >
                    {toDisplayDays(projectSummary.days)}
                  </Tag>
                </Space>
                <div style={{ marginTop: 1, lineHeight: "14px" }}>
                  {projectSummary.tasks.map((task) => (
                    <div key={task.taskId}>
                      <Typography.Text
                        style={{
                          fontSize: 12,
                          paddingLeft: 6,
                          fontWeight: 500,
                        }}
                      >
                        - {task.taskName}{" "}
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            fontSize: 10,
                            lineHeight: "14px",
                            padding: "0 4px",
                            fontWeight: 600,
                          }}
                          color="gold"
                        >
                          {toDisplayDays(task.days)}
                        </Tag>
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        )
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          -
        </Typography.Text>
      );
    }

    return employeeRow.hasSchedule ? (
      <div>
        {DAY_KEYS.filter((dayKey) => {
          const tasks = employeeRow.dailyMap[dayKey];
          return !(WEEKEND_DAY_KEYS.has(dayKey) && tasks.length === 0);
        }).map((dayKey) => {
          const tasks = employeeRow.dailyMap[dayKey];
          return (
            <div key={`${employeeRow.key}-daily-${dayKey}`}>
              <Tag
                color={tasks.length ? "green" : "default"}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {DAY_LABELS[dayKey]}
              </Tag>
              {tasks.length === 0 ? (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    - 未安排任务
                  </Typography.Text>
                </div>
              ) : (
                tasks.map((item, index) => (
                  <div
                    key={`${employeeRow.key}-${dayKey}-${item.clientName}-${item.taskName}-${index}`}
                    style={{ lineHeight: "14px" }}
                  >
                    <Typography.Text style={{ fontSize: 12 }}>
                      - [{item.clientName}] {item.taskName}
                    </Typography.Text>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <Typography.Text
        type="secondary"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        本周无安排
      </Typography.Text>
    );
  };

  const weeklyColumns: ColumnsType<WeeklyMetricRow> = [
    {
      title: "维度",
      dataIndex: "metricLabel",
      fixed: "left",
      width: 120,
      render: (value: string) => (
        <Typography.Text strong style={{ fontSize: 12 }}>
          {value}
        </Typography.Text>
      ),
    },
    ...weeklyRows.map((employeeRow) => ({
      title: employeeRow.name,
      dataIndex: employeeRow.key,
      key: employeeRow.key,
      width: 260,
      render: (_value: unknown, metricRow: WeeklyMetricRow) =>
        renderWeeklyEmployeeMetric(employeeRow, metricRow.key),
    })),
  ];

  const weeklyContent = (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {loadingWeekly ? (
        <Card>
          <Spin />
        </Card>
      ) : weeklyRows.length === 0 ? (
        <Card>
          <Empty description="暂无本周安排" />
        </Card>
      ) : (
        <Table
          rowKey="key"
          columns={weeklyColumns}
          dataSource={weeklyMetricRows}
          pagination={false}
          tableLayout="auto"
          scroll={{ x: "max-content" }}
        />
      )}
    </Space>
  );

  const renderProjectScheduleContent = (project: ProjectListItem) => {
    const detail = projectDetails[project.id];
    const detailLoading = Boolean(projectDetailLoadingById[project.id]);
    const progressView = projectProgressViewById[project.id] ?? "progress";

    if (!detail && detailLoading) {
      return (
        <Card>
          <Spin />
        </Card>
      );
    }

    if (!detail) {
      return (
        <Card>
          <Empty description="暂无项目详情" />
        </Card>
      );
    }

    const segmentRows: SegmentRow[] =
      detail?.segments
        ?.map((segment) => ({
          id: segment.id,
          name: segment.name,
          status: segment.status,
          statusOption: segment.statusOption ?? null,
          ownerName: segment.owner?.name ?? "-",
          ownerId: segment.owner?.id ?? null,
          dueDate: segment.dueDate,
          tasks: (segment.projectTasks ?? [])
            .filter((task) => !(task.status ?? "").includes("完成"))
            .map((task) => ({
              id: task.id,
              segmentId: segment.id,
              segmentName: segment.name,
              name: task.name,
              status: task.status,
              ownerName: task.owner?.name ?? "-",
              ownerId: task.owner?.id ?? null,
              dueDate: task.dueDate,
              plannedEntries: (task.plannedWorkEntries ?? [])
                .map((entry) => ({
                  id: entry.id,
                  taskId: task.id,
                  year: entry.year,
                  weekNumber: entry.weekNumber,
                  plannedDays: entry.plannedDays,
                  monday: entry.monday,
                  tuesday: entry.tuesday,
                  wednesday: entry.wednesday,
                  thursday: entry.thursday,
                  friday: entry.friday,
                  saturday: entry.saturday,
                  sunday: entry.sunday,
                }))
                .sort((left, right) => {
                  if (left.year !== right.year) return right.year - left.year;
                  return right.weekNumber - left.weekNumber;
                }),
            })),
        }))
        ?.sort((left, right) => {
          const isLeftDone = (left.status ?? "").includes("完成");
          const isRightDone = (right.status ?? "").includes("完成");
          if (isLeftDone !== isRightDone) {
            return isLeftDone ? 1 : -1;
          }
          return left.name.localeCompare(right.name, "zh-CN");
        }) ?? [];

    const designGroupTasks: ProjectTaskListRow[] =
      detail?.segments
        ?.flatMap((segment) =>
          (segment.projectTasks ?? [])
            .filter((task) => !(task.status ?? "").includes("完成"))
            .filter((task) => {
              const ownerId = task.owner?.id;
              if (!ownerId) return false;
              return employeeFunctionById.get(ownerId) === "设计组";
            })
            .map((task) => ({
              id: task.id,
              name: task.name,
              segmentId: segment.id,
              segmentName: segment.name,
              ownerId: task.owner?.id ?? null,
              ownerName: task.owner?.name ?? "-",
              dueDate: task.dueDate ?? null,
            })),
        )
        ?.sort((left, right) => {
          const leftDate = left.dueDate
            ? dayjs(left.dueDate).valueOf()
            : Number.MAX_SAFE_INTEGER;
          const rightDate = right.dueDate
            ? dayjs(right.dueDate).valueOf()
            : Number.MAX_SAFE_INTEGER;
          if (leftDate !== rightDate) return leftDate - rightDate;
          return left.name.localeCompare(right.name, "zh-CN");
        }) ?? [];

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <ProjectMilestoneSection
          milestones={detail?.milestones ?? []}
          showAddButton={canManageProject}
          onAdd={() => {
            if (!canManageProject) return;
            setMilestoneProjectId(project.id);
            setMilestoneModalOpen(true);
          }}
        />
        <Card
          title={
            <Segmented
              value={progressView}
              options={[
                { label: "项目进度", value: "progress" },
                { label: "项目任务", value: "tasks" },
              ]}
              onChange={(value) => {
                setProjectProgressViewById((previous) => ({
                  ...previous,
                  [project.id]: value as "progress" | "tasks",
                }));
              }}
            />
          }
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            overflow: "hidden",
          }}
          styles={{
            body: {
              width: "100%",
              minWidth: 0,
              overflowX: "hidden",
            },
          }}
        >
          {progressView === "progress" ? (
            <ProjectProgressNestedTable
              data={segmentRows}
              segmentHeaderTitle={`项目环节（${segmentRows.length}）/任务（${segmentRows.reduce(
                (sum, segment) => sum + segment.tasks.length,
                0,
              )}）`}
              pageSize={8}
              plannedYearOptionMap={plannedYearOptionMap}
              plannedWeekOptionMap={plannedWeekOptionMap}
              actionsDisabled={!canManageProject}
              onAddTask={(segment) => openCreateTaskModal(segment.id)}
              onEditSegment={(segment) => openEditSegmentModal(segment)}
              onDeleteSegment={(segment) => {
                void handleDeleteSegment(segment.id);
              }}
              onAddPlannedWork={(task) => openCreatePlannedWorkModal(task.id)}
              onEditTask={(task) => openEditTaskModal(task)}
              onDeleteTask={(task) => {
                void handleDeleteTask(task.id);
              }}
              onEditPlannedWork={(entry) => openEditPlannedWorkModal(entry)}
              onDeletePlannedWork={(entry) => {
                void handleDeletePlannedEntry(entry.id);
              }}
            />
          ) : (
            <Table<ProjectTaskListRow>
              rowKey="id"
              size="small"
              dataSource={designGroupTasks}
              pagination={{ pageSize: 8, position: ["bottomLeft"] }}
              locale={{ emptyText: "暂无符合条件的任务" }}
              columns={[
                {
                  title: "任务名称",
                  dataIndex: "name",
                  render: (_value, row) => (
                    <AppLink href={`/project-tasks/${row.id}`}>{row.name}</AppLink>
                  ),
                },
                {
                  title: "所属环节",
                  dataIndex: "segmentName",
                  render: (_value, row) => (
                    <AppLink href={`/project-segments/${row.segmentId}`}>
                      {row.segmentName}
                    </AppLink>
                  ),
                },
                {
                  title: "负责人",
                  dataIndex: "ownerName",
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
                  render: (value?: string | null) =>
                    value && dayjs(value).isValid()
                      ? dayjs(value).format("YYYY/MM/DD")
                      : "",
                },
              ]}
            />
          )}
        </Card>
      </div>
    );
  };

  const customerScheduleContent = loadingProjects ? (
    <Card>
      <Spin />
    </Card>
  ) : visibleProjects.length === 0 ? (
    <Card>
      <Empty description="暂无项目" />
    </Card>
  ) : !selectedClientProject ? (
    <Card>
      <Empty description="请选择项目" />
    </Card>
  ) : (
    renderProjectScheduleContent(selectedClientProject)
  );

  const internalScheduleContent = loadingProjects ? (
    <Card>
      <Spin />
    </Card>
  ) : internalVisibleProjects.length === 0 ? (
    <Card>
      <Empty description="暂无内部项目" />
    </Card>
  ) : (
    <Collapse
      ghost
      activeKey={internalExpandedProjectIds}
      onChange={(keys) => {
        const next = Array.isArray(keys) ? keys : [keys];
        setInternalExpandedProjectIds(
          next.filter((value): value is string => typeof value === "string"),
        );
      }}
      items={internalVisibleProjects.map((project) => ({
        key: project.id,
        label: <AppLink href={`/projects/${project.id}`}>{project.name}</AppLink>,
        children: renderProjectScheduleContent(project),
      }))}
    />
  );

  const handleScheduleTabChange = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const handleClientProjectSelect = (projectId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", projectId);
    params.set("tab", "client-project-schedule");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <>
      {contextHolder}
      <Card>
        <Tabs
          activeKey={activeScheduleTab}
          onChange={handleScheduleTabChange}
          items={[
            {
              key: "client-project-schedule",
              label: "客户项目排期",
              children: (
                <ClientProjectSchedulePane
                  visibleProjectCount={visibleProjects.length}
                  groupedVisibleProjects={groupedVisibleProjects}
                  selectedClientProject={selectedClientProject}
                  customerScheduleContent={customerScheduleContent}
                  onSelectProject={handleClientProjectSelect}
                />
              ),
            },
            {
              key: "internal-project-schedule",
              label: "内部项目排期",
              children: internalScheduleContent,
            },
            {
              key: "weekly-tasks",
              label: "本周任务安排",
              children: weeklyContent,
            },
          ]}
        />
      </Card>

      {segmentModalOpen ? (
        <ProjectSegmentFormModal
          title={editingSegment ? "编辑环节" : "新增环节"}
          open={segmentModalOpen}
          onCancel={() => {
            setSegmentModalOpen(false);
            setEditingSegment(null);
          }}
          confirmLoading={segmentSubmitting}
          initialValues={
            editingSegment
              ? {
                  id: editingSegment.id,
                  name: editingSegment.name,
                  status: editingSegment.status ?? null,
                  statusOption: editingSegment.statusOption ?? null,
                  dueDate: editingSegment.dueDate ?? null,
                  owner: editingSegment.ownerId
                    ? {
                        id: editingSegment.ownerId,
                        name: editingSegment.ownerName,
                      }
                    : null,
                  project: selectedClientProject
                    ? {
                        id: selectedClientProject.id,
                        name: selectedClientProject.name,
                      }
                    : null,
                }
              : null
          }
          projectOptions={
            selectedClientProject
              ? [
                  {
                    id: selectedClientProject.id,
                    name: selectedClientProject.name,
                  },
                ]
              : []
          }
          selectedProjectId={selectedClientProject?.id}
          disableProjectSelect
          employees={employees}
          onSubmit={handleSubmitSegment}
        />
      ) : null}

      {milestoneModalOpen ? (
        <ProjectMilestoneFormModal
          title="新增里程碑"
          open={milestoneModalOpen}
          onCancel={() => {
            setMilestoneModalOpen(false);
            setMilestoneProjectId(null);
          }}
          confirmLoading={milestoneSubmitting}
          projectMembers={activeMilestoneProjectDetail?.members ?? []}
          allEmployees={employees}
          clientParticipants={clientContacts}
          vendors={activeMilestoneProjectDetail?.vendors ?? []}
          projectOptions={
            activeMilestoneProjectId && activeMilestoneProjectDetail
              ? [
                  {
                    id: activeMilestoneProjectId,
                    name: activeMilestoneProjectDetail.name,
                  },
                ]
              : []
          }
          selectedProjectId={activeMilestoneProjectId ?? undefined}
          disableProjectSelect
          onSubmit={handleSubmitMilestone}
        />
      ) : null}

      {taskModalOpen ? (
        <ProjectTaskFormModal
          title={editingTask ? "编辑任务" : "新增任务"}
          open={taskModalOpen}
          onCancel={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
            setTaskDefaultSegmentId(undefined);
          }}
          confirmLoading={taskSubmitting}
          segmentOptions={selectedProjectSegmentOptions}
          defaultSegmentId={taskDefaultSegmentId}
          employees={employees}
          initialValues={
            editingTask
              ? {
                  id: editingTask.id,
                  name: editingTask.name,
                  segmentId: editingTask.segmentId,
                  segmentName: editingTask.segmentName,
                  status: editingTask.status ?? null,
                  dueDate: editingTask.dueDate ?? null,
                  owner: editingTask.ownerId
                    ? { id: editingTask.ownerId, name: editingTask.ownerName }
                    : null,
                }
              : null
          }
          onSubmit={handleSubmitTask}
        />
      ) : null}

      {plannedWorkModalOpen ? (
        <Modal
          title={editingPlannedEntry ? "编辑计划工时" : "新增计划工时"}
          open={plannedWorkModalOpen}
          onCancel={() => {
            setPlannedWorkModalOpen(false);
            setEditingPlannedEntry(null);
            setPlannedDefaultTaskId(undefined);
          }}
          footer={null}
          confirmLoading={plannedWorkSubmitting}
          destroyOnHidden
        >
          <PlannedWorkEntryForm
            projectOptions={
              selectedClientProject
                ? [
                    {
                      id: selectedClientProject.id,
                      name: selectedClientProject.name,
                    },
                  ]
                : []
            }
            selectedProjectId={selectedClientProject?.id}
            disableProjectSelect
            disableSegmentSelect={Boolean(editingPlannedEntry)}
            disableTaskSelect={Boolean(editingPlannedEntry)}
            taskOptions={selectedProjectTaskOptions}
            defaultTaskId={plannedDefaultTaskId}
            initialValues={
              editingPlannedEntry
                ? {
                    id: editingPlannedEntry.id,
                    taskId: editingPlannedEntry.taskId,
                    year: editingPlannedEntry.year,
                    weekNumber: editingPlannedEntry.weekNumber,
                    yearOption: String(editingPlannedEntry.year),
                    weekNumberOption: String(editingPlannedEntry.weekNumber),
                    plannedDays: editingPlannedEntry.plannedDays,
                    monday: editingPlannedEntry.monday,
                    tuesday: editingPlannedEntry.tuesday,
                    wednesday: editingPlannedEntry.wednesday,
                    thursday: editingPlannedEntry.thursday,
                    friday: editingPlannedEntry.friday,
                    saturday: editingPlannedEntry.saturday,
                    sunday: editingPlannedEntry.sunday,
                  }
                : null
            }
            onSubmit={handleSubmitPlannedWork}
          />
        </Modal>
      ) : null}
    </>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<Card loading />}>
      <SchedulePageContent />
    </Suspense>
  );
}
