"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Spin,
  Tabs,
  message,
} from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import AppLink from "@/components/AppLink";
import ClientProjectSchedulePane from "@/components/schedule/ClientProjectSchedulePane";
import WeeklyTasksPanel from "@/components/schedule/WeeklyTasksPanel";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { ProjectMilestoneFormPayload } from "@/components/project-detail/ProjectMilestoneForm";
import ProjectMilestoneFormModal from "@/components/project-detail/ProjectMilestoneFormModal";
import ProjectBriefProgressContent from "@/components/project-detail/ProjectBriefProgressContent";
import type {
  ProjectBrief,
  ProjectBriefWorkItem,
} from "@/components/project-detail/ProjectBriefProgressContent";
import BriefFormModal from "@/components/project-detail/BriefFormModal";
import WorkItemEditModal from "@/components/project-detail/WorkItemEditModal";
import ProjectMilestoneSection from "@/components/project-detail/ProjectMilestoneSection";
import ProjectMilestoneSectionActions from "@/components/project-detail/ProjectMilestoneSectionActions";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useAuthStore } from "@/stores/authStore";

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
    order?: number | null;
  } | null;
};

type BriefProjectContext = ProjectListItem & {
  client: {
    id: string;
    name: string;
  };
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
  position?: string | null;
  positionOption?: {
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
  workItem?: {
    id: string;
    title: string;
    assignee?: {
      id: string;
      name: string;
    } | null;
    brief?: {
      id: string;
      title: string;
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
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
    order?: number | null;
  } | null;
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
    startAt?: string | null;
    endAt?: string | null;
    date?: string | null;
    location?: string | null;
    method?: string | null;
    methodOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    internalParticipants?: Participant[];
    clientParticipants?: ClientParticipant[];
    vendorParticipants?: Participant[];
  }[];
  briefs?: ProjectBrief[];
};

const ASCII_INITIAL_RE = /^[A-Za-z0-9]/;
const EN_NAME_COLLATOR = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const ZH_NAME_COLLATOR = new Intl.Collator("zh-CN-u-co-pinyin", {
  numeric: true,
  sensitivity: "base",
});

const SCHEDULE_TAB_KEYS = new Set([
  "weekly-tasks",
  "next-weekly-tasks",
  "client-project-schedule",
  "internal-project-schedule",
]);

const compareDisplayNames = (left?: string | null, right?: string | null) => {
  const leftName = left?.trim() ?? "";
  const rightName = right?.trim() ?? "";
  const leftPriority = ASCII_INITIAL_RE.test(leftName) ? 0 : 1;
  const rightPriority = ASCII_INITIAL_RE.test(rightName) ? 0 : 1;

  if (leftPriority !== rightPriority) return leftPriority - rightPriority;

  if (leftPriority === 0) {
    return EN_NAME_COLLATOR.compare(leftName, rightName);
  }

  return ZH_NAME_COLLATOR.compare(leftName, rightName);
};

function SchedulePageContent() {
  const currentUser = useAuthStore((state) => state.currentUser);
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
  const [nextWeeklyPlannedEntries, setNextWeeklyPlannedEntries] = useState<
    WeeklyPlannedEntry[]
  >([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingNextWeekly, setLoadingNextWeekly] = useState(false);
  const [clientContacts, setClientContacts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(
    null,
  );
  const [briefProjectContext, setBriefProjectContext] =
    useState<BriefProjectContext | null>(null);
  const [editingBrief, setEditingBrief] = useState<ProjectBrief | null>(null);
  const [editingWorkItem, setEditingWorkItem] = useState<{
    workItem?: ProjectBriefWorkItem;
    briefId?: string;
    projectId: string;
  } | null>(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);
  const { canManageProject } = useProjectPermission();

  const scheduleStateWrapStyle = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  } as const;

  const scheduleStateCardBodyStyle = {
    width: "100%",
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const employeesFromStore = useEmployeesStore((state) => state.employees);
  const employeesFullFromStore = useEmployeesStore(
    (state) => state.employeesFull,
  );
  const employeesLoaded = useEmployeesStore((state) => state.loaded);
  const employeesLoadedFull = useEmployeesStore((state) => state.loadedFull);
  const fetchEmployeesFromStore = useEmployeesStore(
    (state) => state.fetchEmployees,
  );
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );
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

  const refreshProjects = useCallback(async (force = false) => {
    const data = await fetchProjectsFromStore(force ? { force: true } : undefined);
    setAllProjects(Array.isArray(data) ? (data as ProjectListItem[]) : []);
  }, [fetchProjectsFromStore]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        await refreshProjects();
      } finally {
        setLoadingProjects(false);
      }
    };

    void fetchProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (
      activeScheduleTab !== "internal-project-schedule" ||
      loadingProjects
    ) {
      return;
    }

    // Keep rendering cached projects while refreshing the list in the background.
    void refreshProjects(true);
  }, [activeScheduleTab, loadingProjects, refreshProjects]);

  useEffect(() => {
    let cancelled = false;

    const fetchEmployees = async () => {
      const nextEmployees =
        employeesLoadedFull && employeesFullFromStore.length > 0
          ? employeesFullFromStore
          : await fetchEmployeesFromStore({ full: true });

      if (cancelled) return;
      setEmployees(Array.isArray(nextEmployees) ? (nextEmployees as EmployeeListItem[]) : []);
    };

    void fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [
    employeesFromStore,
    employeesFullFromStore,
    employeesLoaded,
    employeesLoadedFull,
    fetchEmployeesFromStore,
  ]);

  useEffect(() => {
    if (
      activeScheduleTab !== "weekly-tasks" &&
      activeScheduleTab !== "next-weekly-tasks"
    ) {
      return;
    }

    const fetchScheduleEntries = async (
      targetDate: dayjs.Dayjs,
      setLoading: (loading: boolean) => void,
      setEntries: (entries: WeeklyPlannedEntry[]) => void,
    ) => {
      setLoading(true);
      try {
        const year = String(targetDate.year());
        const weekNumber = String(targetDate.isoWeek());

        const plannedPromise = fetch(
          `/api/planned-work-entries?page=1&pageSize=1000&year=${year}&weekNumber=${weekNumber}`,
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
        setEntries(nextEntries as WeeklyPlannedEntry[]);
      } finally {
        setLoading(false);
      }
    };

    if (activeScheduleTab === "weekly-tasks") {
      void fetchScheduleEntries(dayjs(), setLoadingWeekly, setWeeklyPlannedEntries);
      return;
    }

    void fetchScheduleEntries(
      dayjs().add(1, "week"),
      setLoadingNextWeekly,
      setNextWeeklyPlannedEntries,
    );
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
        .sort((left, right) => compareDisplayNames(left.name, right.name)),
    [allProjects],
  );

  const internalVisibleProjects = useMemo(
    () =>
      allProjects
        .filter((project) => {
          if (Boolean(project.isArchived)) return false;
          const typeValue =
            project.typeOption?.value?.trim() || project.type?.trim() || "";
          if (typeValue !== "INTERNAL" && typeValue !== "内部项目")
            return false;
          if (project.name.includes("中台")) return false;
          return true;
        })
        .sort((left, right) => compareDisplayNames(left.name, right.name)),
    [allProjects],
  );

  const groupedVisibleProjects = useMemo(() => {
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
          compareDisplayNames(left.name, right.name),
        ),
      }))
      .sort((left, right) => {
        const leftOrder = left.statusOption?.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder =
          right.statusOption?.order ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.status.localeCompare(right.status, "zh-CN");
      });
  }, [optionsByField, visibleProjects]);

  const defaultClientProjectId = useMemo(() => {
    return visibleProjects[0]?.id ?? null;
  }, [visibleProjects]);

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
    if (
      currentProjectId &&
      !visibleProjects.some((project) => project.id === currentProjectId)
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("projectId");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
      return;
    }
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
  }, [
    loadingProjects,
    pathname,
    router,
    searchParams,
    selectedClientProject,
    visibleProjects,
  ]);

  const fetchProjectDetailById = useCallback(async (projectId: string, force = false) => {
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
  }, [projectDetails]);

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
      void Promise.all(
        projectIds.map((projectId) => fetchProjectDetailById(projectId)),
      );
      return;
    }
    const projectId = activeMilestoneProjectId;
    if (!projectId) return;
    void fetchProjectDetailById(projectId);
  }, [
    activeMilestoneProjectId,
    activeScheduleTab,
    fetchProjectDetailById,
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

  const renderProjectScheduleContent = (project: ProjectListItem) => {
    const detail = projectDetails[project.id];
    const detailLoading = Boolean(projectDetailLoadingById[project.id]);

    if (!detail && detailLoading) {
      return (
        <div style={scheduleStateWrapStyle}>
          <Card
            style={scheduleStateWrapStyle}
            styles={{ body: scheduleStateCardBodyStyle }}
          >
            <Spin />
          </Card>
        </div>
      );
    }

    if (!detail) {
      return (
        <div style={scheduleStateWrapStyle}>
          <Card
            style={scheduleStateWrapStyle}
            styles={{ body: scheduleStateCardBodyStyle }}
          >
            <Empty description="暂无项目详情" />
          </Card>
        </div>
      );
    }

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
          extra={
            <ProjectMilestoneSectionActions
              canManageProject={canManageProject}
              onCreate={() => {
                if (!canManageProject) return;
                setMilestoneProjectId(project.id);
                setMilestoneModalOpen(true);
              }}
              status={detail.status}
              statusOptionValue={detail.statusOption?.value}
              milestones={detail.milestones ?? []}
            />
          }
          showAddButton={false}
        />
        <Card
          title="项目需求单"
          extra={
            canManageProject ? (
              <Button
                type="primary"
                onClick={() => {
                  if (!detail.client) {
                    messageApi.error("当前项目未关联客户");
                    return;
                  }
                  setBriefProjectContext({
                    ...project,
                    client: detail.client,
                  });
                  setEditingBrief(null);
                  setBriefModalOpen(true);
                }}
              >
                创建需求单
              </Button>
            ) : null
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
              overflowX: "auto",
            },
          }}
        >
          <ProjectBriefProgressContent
            briefs={(detail.briefs ?? []).filter(
              (brief) => brief.status !== "completed",
            )}
            project={{ id: project.id, name: project.name }}
            canManagePlannedWork={canManageProject}
            onAfterStatusChange={async () => {
              await fetchProjectDetailById(project.id, true);
            }}
            onAfterPlannedWorkChange={async () => {
              refreshProjectDetails(project.id);
            }}
            onAfterAssignmentChange={
              canManageProject
                ? async () => {
                    refreshProjectDetails(project.id);
                  }
                : undefined
            }
            onAfterSubmissionChange={
              canManageProject
                ? async () => {
                    refreshProjectDetails(project.id);
                  }
                : undefined
            }
            onEditBrief={
              canManageProject
                ? (brief) => {
                    if (!detail.client) {
                      messageApi.error("当前项目未关联客户");
                      return;
                    }
                    setBriefProjectContext({
                      ...project,
                      client: detail.client,
                    });
                    setEditingBrief(brief);
                    setBriefModalOpen(true);
                  }
                : undefined
            }
            onEditWorkItem={
              canManageProject
                ? (workItem) =>
                    setEditingWorkItem({
                      workItem,
                      projectId: project.id,
                    })
                : undefined
            }
            onAddWorkItem={
              canManageProject
                ? (brief) =>
                    setEditingWorkItem({
                      briefId: brief.id,
                      projectId: project.id,
                    })
                : undefined
            }
            onDeleteBrief={
              canManageProject
                ? async (brief) => {
                    const response = await fetch(`/api/briefs/${brief.id}`, {
                      method: "DELETE",
                    });
                    if (!response.ok) {
                      messageApi.error(
                        (await response.text()) || "删除需求单失败",
                      );
                      return;
                    }
                    messageApi.success("需求单已删除");
                    refreshProjectDetails(project.id);
                  }
                : undefined
            }
            onDeleteWorkItem={
              canManageProject
                ? async (workItem) => {
                    const response = await fetch(
                      `/api/work-items/${workItem.id}`,
                      { method: "DELETE" },
                    );
                    if (!response.ok) {
                      messageApi.error(
                        (await response.text()) || "删除工作项失败",
                      );
                      return;
                    }
                    messageApi.success("工作项已删除");
                    refreshProjectDetails(project.id);
                  }
                : undefined
            }
          />
        </Card>
      </div>
    );
  };

  const customerScheduleContent = loadingProjects ? (
    <div style={scheduleStateWrapStyle}>
      <Card
        style={scheduleStateWrapStyle}
        styles={{ body: scheduleStateCardBodyStyle }}
      >
        <Spin />
      </Card>
    </div>
  ) : visibleProjects.length === 0 ? (
    <div style={scheduleStateWrapStyle}>
      <Card
        style={scheduleStateWrapStyle}
        styles={{ body: scheduleStateCardBodyStyle }}
      >
        <Empty description="暂无项目" />
      </Card>
    </div>
  ) : !selectedClientProject ? (
    <div style={scheduleStateWrapStyle}>
      <Card
        style={scheduleStateWrapStyle}
        styles={{ body: scheduleStateCardBodyStyle }}
      >
        <Empty description="请选择项目" />
      </Card>
    </div>
  ) : (
    renderProjectScheduleContent(selectedClientProject)
  );

  const internalScheduleContent = loadingProjects ? (
    <div style={scheduleStateWrapStyle}>
      <Card
        style={scheduleStateWrapStyle}
        styles={{ body: scheduleStateCardBodyStyle }}
      >
        <Spin />
      </Card>
    </div>
  ) : internalVisibleProjects.length === 0 ? (
    <div style={scheduleStateWrapStyle}>
      <Card
        style={scheduleStateWrapStyle}
        styles={{ body: scheduleStateCardBodyStyle }}
      >
        <Empty description="暂无内部项目" />
      </Card>
    </div>
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
        label: (
          <AppLink href={`/projects/${project.id}`}>{project.name}</AppLink>
        ),
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
                  statusActionsDisabled={!canManageProject}
                  onProjectStatusUpdated={async () => {
                    await refreshProjects(true);
                    refreshProjectDetails(selectedClientProject?.id);
                  }}
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
              children: (
                <WeeklyTasksPanel
                  loading={loadingWeekly}
                  employees={employees}
                  entries={weeklyPlannedEntries}
                  emptyDescription="暂无本周安排"
                  noScheduleText="本周无安排"
                  stateWrapStyle={scheduleStateWrapStyle}
                  stateCardBodyStyle={scheduleStateCardBodyStyle}
                />
              ),
            },
            {
              key: "next-weekly-tasks",
              label: "下周任务安排",
              children: (
                <WeeklyTasksPanel
                  loading={loadingNextWeekly}
                  employees={employees}
                  entries={nextWeeklyPlannedEntries}
                  emptyDescription="暂无下周安排"
                  noScheduleText="下周无安排"
                  stateWrapStyle={scheduleStateWrapStyle}
                  stateCardBodyStyle={scheduleStateCardBodyStyle}
                />
              ),
            },
          ]}
        />
      </Card>

      {briefModalOpen && briefProjectContext && currentUser ? (
        <BriefFormModal
          open={briefModalOpen}
          onCancel={() => {
            setBriefModalOpen(false);
            setBriefProjectContext(null);
            setEditingBrief(null);
          }}
          project={briefProjectContext}
          client={briefProjectContext.client}
          creator={editingBrief?.creator ?? currentUser}
          initialBrief={editingBrief ?? undefined}
          employees={employees}
          onSubmit={async (payload) => {
            const response = await fetch(
              editingBrief ? `/api/briefs/${editingBrief.id}` : "/api/briefs",
              {
              method: editingBrief ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              },
            );
            if (!response.ok) {
              throw new Error(
                (await response.text()) ||
                  (editingBrief ? "更新需求单失败" : "创建需求单失败"),
              );
            }
            messageApi.success(editingBrief ? "需求单已更新" : "需求单已创建");
            setBriefModalOpen(false);
            setBriefProjectContext(null);
            setEditingBrief(null);
            refreshProjectDetails(payload.projectId);
          }}
        />
      ) : null}

      {editingWorkItem ? (
        <WorkItemEditModal
          open
          workItem={editingWorkItem.workItem}
          employees={employees}
          onCancel={() => setEditingWorkItem(null)}
          onSubmit={async (payload) => {
            const isEditing = Boolean(editingWorkItem.workItem);
            const endpoint = isEditing
              ? `/api/work-items/${editingWorkItem.workItem!.id}`
              : `/api/briefs/${editingWorkItem.briefId}/work-items`;
            const response = await fetch(endpoint, {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
              throw new Error(
                (await response.text()) ||
                  (isEditing ? "更新工作项失败" : "添加工作项失败"),
              );
            }
            messageApi.success(isEditing ? "工作项已更新" : "工作项已添加");
            const projectId = editingWorkItem.projectId;
            setEditingWorkItem(null);
            refreshProjectDetails(projectId);
          }}
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
