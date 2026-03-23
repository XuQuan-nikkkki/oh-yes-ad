"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button, Card, Modal, Space, Steps, Typography } from "antd";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ProCard } from "@ant-design/pro-components";
import DetailPageContainer from "@/components/DetailPageContainer";
import PageAccessResult from "@/components/PageAccessResult";
import ProjectFormModal from "@/components/ProjectFormModal";
import dayjs from "dayjs";
import { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";
import { ProjectSegmentRow } from "@/components/project-detail/ProjectSegmentsTable";
import type { ProjectTaskRow } from "@/components/project-detail/ProjectTasksTable";
import type { ProjectTaskFormPayload } from "@/components/project-detail/ProjectTaskForm";
import type { PlannedWorkEntryFormPayload } from "@/components/project-detail/PlannedWorkEntryForm";
import ActualWorkAnalysisTable from "@/components/project-detail/ActualWorkAnalysisTable";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import type { ProjectDocumentRow } from "@/components/ProjectDocumentsTable";
import ProjectDetailMilestonesContent from "@/components/project-detail/ProjectDetailMilestonesContent";
import ProjectDetailMembersContent from "@/components/project-detail/ProjectDetailMembersContent";
import ProjectDetailProgressContent from "@/components/project-detail/ProjectDetailProgressContent";
import ProjectActualWorkRecordsContent from "@/components/project-detail/ProjectActualWorkRecordsContent";
import ProjectDocumentsContent from "@/components/project-detail/ProjectDocumentsContent";
import ProjectCostEstimationCard from "@/components/project-detail/ProjectCostEstimationCard";
import ProjectPricingStrategyCard from "@/components/project-detail/ProjectPricingStrategyCard";
import ProjectFinancialStructureCard from "@/components/project-detail/ProjectFinancialStructureCard";
import ProjectRealtimeCostTrackingTable from "@/components/project-detail/ProjectRealtimeCostTrackingTable";
import ProjectReimbursementRecordsContent from "@/components/project-detail/ProjectReimbursementRecordsContent";
import ProjectPayableInfo from "@/components/project-detail/ProjectPayableInfo";
import ProjectReceivableInfo from "@/components/project-detail/ProjectReceivableInfo";
import {
  ProjectActualWorkAction,
  ProjectDocumentAction,
  ProjectMilestoneAction,
  ProjectPlannedWorkModal,
  ProjectSegmentAction,
  ProjectTaskModal,
} from "@/components/project-detail/ProjectDetailActionModules";
import ProjectInfo from "./ProjectInfo";
import ProjectPrimaryActions from "./ProjectPrimaryActions";
import AppLink from "@/components/AppLink";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useClientsStore } from "@/stores/clientsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import { DATE_FORMAT } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import type {
  ClientContact,
  Employee,
  PlannedWorkRow,
  Project,
  WorkdayAdjustment,
} from "@/types/projectDetail";
import type { ProjectProgressSegmentRow } from "@/types/projectProgress";

type EditingDocument = {
  id: string;
  name: string;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
} | null;

type EditingActualWorkEntry = {
  id: string;
  title: string;
  employeeId: string;
  startDate: string;
  endDate: string;
} | null;

type AnalysisDetailTarget = {
  memberKey: string;
  memberName: string;
};

type ActiveModalState =
  | { type: null }
  | { type: "project-edit" }
  | { type: "milestone"; editing: ProjectMilestoneRow | null }
  | { type: "segment"; editing: ProjectSegmentRow | null }
  | {
      type: "task";
      editing: ProjectTaskRow | null;
      defaultSegmentId?: string;
    }
  | { type: "document"; editing: EditingDocument }
  | { type: "actual-work"; editing: EditingActualWorkEntry }
  | {
      type: "planned-work";
      editing: PlannedWorkRow | null;
      defaultTaskId?: string;
    }
  | { type: "analysis-detail"; target: AnalysisDetailTarget };

const ProjectDetailPage = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const cachedProject = useProjectsStore((state) => state.byId[projectId]);
  const upsertProjects = useProjectsStore((state) => state.upsertProjects);
  const upsertProjectMilestones = useProjectMilestonesStore(
    (state) => state.upsertMilestones,
  );
  const hasCachedProject = Boolean(cachedProject);

  const [project, setProject] = useState<Project | null>(
    (cachedProject as Project | undefined) ?? null,
  );
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [contactsLoadedClientId, setContactsLoadedClientId] = useState<
    string | null
  >(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const [loading, setLoading] = useState(!hasCachedProject);
  const [activeModal, setActiveModal] = useState<ActiveModalState>({
    type: null,
  });
  const [deletingProject, setDeletingProject] = useState(false);
  const [addingFunction, setAddingFunction] = useState<string | null>(null);
  const [pricingTab, setPricingTab] = useState<
    "cost-estimation" | "pricing-reference"
  >("cost-estimation");
  const [contractTopTab, setContractTopTab] = useState<
    "project-initiation" | "project-financial-structure"
  >("project-initiation");
  const [executionTopTab, setExecutionTopTab] = useState<
    "members" | "vendors" | "milestones" | "progress" | "work" | "documents"
  >("members");
  const [financeTopTab, setFinanceTopTab] = useState<"receivable" | "payable">(
    "receivable",
  );
  const [costTrackingTab, setCostTrackingTab] = useState<
    "expense-records" | "realtime-cost"
  >("realtime-cost");
  const [realtimeCostDownload, setRealtimeCostDownload] = useState<
    (() => void) | null
  >(null);
  const [financialStructureExists, setFinancialStructureExists] = useState<
    boolean | null
  >(null);
  const [financialStructureRefreshKey, setFinancialStructureRefreshKey] =
    useState(0);
  const [reimbursementModalOpen, setReimbursementModalOpen] = useState(false);
  const [actualWorkView, setActualWorkView] = useState<"records" | "analysis">(
    "records",
  );
  const [workEntriesRefreshKey, setWorkEntriesRefreshKey] = useState(0);
  const [receivablePlanModalOpen, setReceivablePlanModalOpen] = useState(false);
  const [receivablePlanModalMode, setReceivablePlanModalMode] = useState<
    "create" | "edit"
  >("create");
  const [receivableNodeModalOpen, setReceivableNodeModalOpen] = useState(false);
  const [receivableCurrentPlan, setReceivableCurrentPlan] = useState<{
    id: string;
  } | null>(null);
  const receivableCardRef = useRef<{
    handleDeletePlan: () => Promise<void>;
  }>(null);
  const [payablePlanModalOpen, setPayablePlanModalOpen] = useState(false);
  const [payablePlanModalMode, setPayablePlanModalMode] = useState<
    "create" | "edit"
  >("create");
  const [payableNodeModalOpen, setPayableNodeModalOpen] = useState(false);
  const [payableCurrentPlan, setPayableCurrentPlan] = useState<{
    id: string;
  } | null>(null);
  const payableCardRef = useRef<{
    handleDeletePlan: () => Promise<void>;
  }>(null);
  const handleRealtimeCostDownloadReady = useCallback(
    (downloadFn: (() => void) | null) => {
      setRealtimeCostDownload(() => downloadFn);
    },
    [],
  );
  const analysisDetailTarget =
    activeModal.type === "analysis-detail" ? activeModal.target : null;
  const stepParamRaw = Number(searchParams.get("step"));
  const stepParam = Number.isFinite(stepParamRaw)
    ? Math.min(4, Math.max(0, Math.trunc(stepParamRaw)))
    : 2;
  const isInternalProject =
    project?.type === "INTERNAL" ||
    project?.type === "内部项目" ||
    project?.typeOption?.value === "内部项目";
  const { canManageProject } = useProjectPermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const isAdmin = roleCodes.includes("ADMIN");
  const isClientProject =
    project?.type === "CLIENT" ||
    project?.type === "客户项目" ||
    project?.typeOption?.value === "客户项目";
  const shouldShowDevelopingCommercialSteps = isClientProject && !isAdmin;
  const canManageAnyActualWorkEntry = roleCodes.includes("ADMIN");
  const storeClients = useClientsStore((state) => state.clients);
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);
  const clients = useMemo(
    () =>
      storeClients
        .filter(
          (
            item,
          ): item is {
            id: string;
            name: string;
          } => typeof item.id === "string" && typeof item.name === "string",
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
        })),
    [storeClients],
  );
  const fetchEmployeesFromStore = useEmployeesStore(
    (state) => state.fetchEmployees,
  );
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchProject = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          setProject(null);
          setClientContacts([]);
          return;
        }
        const data = (await res.json()) as Project;
        setProject(data);
        if (data?.id) {
          upsertProjects([data]);
          upsertProjectMilestones(
            (data.milestones ?? []).map((milestone) => ({
              ...milestone,
              project: {
                id: data.id,
                name: data.name,
                client: data.client
                  ? {
                      id: data.client.id,
                      name: data.client.name,
                    }
                  : null,
              },
            })),
          );
        }
        setWorkEntriesRefreshKey((prev) => prev + 1);
        if (!data.client?.id) {
          setClientContacts([]);
          setContactsLoadedClientId(null);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [projectId, upsertProjectMilestones, upsertProjects],
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await fetchEmployeesFromStore();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      console.log("Employees API not available yet");
    }
  }, [fetchEmployeesFromStore]);

  const fetchWorkdayAdjustments = useCallback(async () => {
    try {
      const data = await fetchAdjustmentsFromStore();
      setWorkdayAdjustments(data);
    } catch (error) {
      console.error("Failed to fetch workday adjustments:", error);
    }
  }, [fetchAdjustmentsFromStore]);

  const fetchFinancialStructureExists = useCallback(async () => {
    if (!projectId) {
      setFinancialStructureExists(false);
      return;
    }
    try {
      const query = new URLSearchParams({ projectId });
      const res = await fetch(
        `/api/project-financial-structures?${query.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setFinancialStructureExists(false);
        return;
      }
      const rows = (await res.json()) as Array<{ id?: string }>;
      setFinancialStructureExists(Array.isArray(rows) && rows.length > 0);
    } catch {
      setFinancialStructureExists(false);
    }
  }, [projectId]);

  const handleCostEstimationSaved = useCallback(
    (latestPlanningCostEstimation: Project["latestCostEstimation"]) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latestCostEstimation: latestPlanningCostEstimation ?? null,
          latestPlanningCostEstimation: latestPlanningCostEstimation ?? null,
        };
      });
    },
    [],
  );

  const handleBaselineCostEstimationSaved = useCallback(
    (latestBaselineCostEstimation: Project["latestBaselineCostEstimation"]) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latestCostEstimation: latestBaselineCostEstimation ?? null,
          latestBaselineCostEstimation: latestBaselineCostEstimation ?? null,
        };
      });
    },
    [],
  );

  const handleFinancialStructureSaved = useCallback(async () => {
    setFinancialStructureRefreshKey((prev) => prev + 1);
    await Promise.all([fetchProject(), fetchFinancialStructureExists()]);
  }, [fetchFinancialStructureExists, fetchProject]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await Promise.all([
        fetchProject(!hasCachedProject),
        fetchClientsFromStore(),
        fetchEmployees(),
        fetchWorkdayAdjustments(),
      ]);
    })();
  }, [
    projectId,
    fetchProject,
    fetchClientsFromStore,
    hasCachedProject,
    fetchEmployees,
    fetchWorkdayAdjustments,
  ]);

  useEffect(() => {
    const clientId = project?.client?.id;
    if (activeModal.type !== "milestone") return;
    if (!clientId) return;
    if (contactsLoadedClientId === clientId && clientContacts.length > 0) {
      return;
    }

    const fetchClientContacts = async () => {
      try {
        const contactsRes = await fetch(`/api/clients/${clientId}/contacts`);
        const contactsData = (await contactsRes.json()) as ClientContact[];
        setClientContacts(Array.isArray(contactsData) ? contactsData : []);
        setContactsLoadedClientId(clientId);
      } catch (error) {
        console.error("Failed to fetch client contacts:", error);
        setClientContacts([]);
      }
    };

    void fetchClientContacts();
  }, [
    activeModal.type,
    clientContacts.length,
    contactsLoadedClientId,
    project?.client?.id,
  ]);

  useEffect(() => {
    if (!isInternalProject) return;
    if (executionTopTab !== "vendors") return;
    setExecutionTopTab("members");
  }, [executionTopTab, isInternalProject]);

  useEffect(() => {
    if (stepParam !== 3) return;
    void fetchFinancialStructureExists();
  }, [fetchFinancialStructureExists, stepParam]);

  const milestoneCount = project?.milestones?.length ?? 0;
  const segmentRows: ProjectSegmentRow[] = project?.segments ?? [];
  const taskCount =
    project?.segments?.reduce(
      (sum, segment) => sum + (segment.projectTasks?.length ?? 0),
      0,
    ) ?? 0;
  const progressRows: ProjectProgressSegmentRow[] =
    project?.segments
      ?.map((segment) => ({
        id: segment.id,
        name: segment.name,
        status: segment.status,
        statusOption: segment.statusOption?.value
          ? {
              id: segment.statusOption.id ?? "",
              value: segment.statusOption.value,
              color: segment.statusOption.color ?? null,
            }
          : null,
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
            statusOption: task.statusOption ?? null,
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
        if (isLeftDone !== isRightDone) return isLeftDone ? 1 : -1;
        return left.name.localeCompare(right.name, "zh-CN");
      }) ?? [];
  const projectDocumentRows: ProjectDocumentRow[] =
    project?.documents?.map((doc) => ({
      id: doc.id,
      name: doc.name,
      typeOption: doc.typeOption?.value
        ? {
            id: doc.typeOption.id ?? "",
            value: doc.typeOption.value,
            color: doc.typeOption.color ?? null,
          }
        : null,
      date: doc.date ?? null,
      isFinal: Boolean(doc.isFinal),
      internalLink: doc.internalLink ?? null,
      milestone: doc.milestone ?? null,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    })) ?? [];
  const actualWorkEmployeeFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of project?.members ?? []) {
      if (member.id && member.name) {
        map.set(member.name, member.name);
      }
    }
    for (const entry of project?.actualWorkEntries ?? []) {
      const name = entry.employee?.name;
      if (name) {
        map.set(name, name);
      }
    }
    return Array.from(map.values())
      .sort((left, right) => left.localeCompare(right, "zh-CN"))
      .map((name) => ({ label: name, value: name }));
  }, [project?.actualWorkEntries, project?.members]);

  const actualWorkDetailRows = useMemo<ActualWorkEntryRow[]>(() => {
    if (!analysisDetailTarget) return [];

    return (project?.actualWorkEntries ?? [])
      .filter((entry) => {
        const memberKey = entry.employee?.id ?? `unknown-${entry.id}`;
        return memberKey === analysisDetailTarget.memberKey;
      })
      .sort(
        (left, right) =>
          dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf(),
      );
  }, [analysisDetailTarget, project?.actualWorkEntries]);

  const openTaskModalForSegment = (segment: { id: string; name: string }) => {
    if (!canManageProject) return;
    setActiveModal({
      type: "task",
      editing: null,
      defaultSegmentId: segment.id,
    });
  };

  const handleCreateTask = async (payload: ProjectTaskFormPayload) => {
    if (!canManageProject) return;
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActiveModal({ type: null });
    await fetchProject();
  };

  const openCreatePlannedWorkModal = (defaultTaskId?: string) => {
    if (!canManageProject) return;
    setActiveModal({
      type: "planned-work",
      editing: null,
      defaultTaskId,
    });
  };

  const openEditPlannedWorkModal = (record: PlannedWorkRow) => {
    if (!canManageProject) return;
    setActiveModal({
      type: "planned-work",
      editing: record,
    });
  };

  const handleStepChange = useCallback(
    (step: number) => {
      const nextStep = Math.min(4, Math.max(0, Math.trunc(step)));
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("tab");
      nextParams.set("step", String(nextStep));

      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  if (!project) {
    return (
      <DetailPageContainer>
        <Card loading={loading}>{loading ? null : "项目不存在"}</Card>
      </DetailPageContainer>
    );
  }

  const handleCreatePlannedWorkEntry = async (
    payload: PlannedWorkEntryFormPayload,
  ) => {
    const res = await fetch(`/api/projects/${projectId}/planned-work-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    setActiveModal({ type: null });
    await fetchProject();
  };

  return (
    <DetailPageContainer>
      <Card
        title={project.name || "项目信息"}
        loading={loading}
        extra={
          <ProjectPrimaryActions
            projectId={projectId}
            projectName={project.name}
            projectType={project.type}
            canManageProject={canManageProject}
            deletingProject={deletingProject}
            setDeletingProject={setDeletingProject}
            onOpenEdit={() => setActiveModal({ type: "project-edit" })}
          />
        }
      >
        <ProjectInfo
          project={project}
          workdayAdjustments={workdayAdjustments}
        />
      </Card>

      {isInternalProject ? (
        <ProCard
          style={{ marginTop: 4 }}
          tabs={{
            type: "card",
            activeKey: executionTopTab,
            tabBarExtraContent:
              executionTopTab === "milestones" ? (
                <div style={{ paddingRight: 16 }}>
                  <ProjectMilestoneAction
                    projectId={projectId}
                    visible
                    canManageProject={canManageProject}
                    project={project}
                    employees={employees}
                    clientContacts={clientContacts}
                    open={activeModal.type === "milestone"}
                    editing={
                      activeModal.type === "milestone"
                        ? activeModal.editing
                        : null
                    }
                    onOpenCreate={() => {
                      setActiveModal({ type: "milestone", editing: null });
                    }}
                    onCancel={() => {
                      setActiveModal({ type: null });
                    }}
                    onSaved={fetchProject}
                  />
                </div>
              ) : executionTopTab === "progress" ? (
                <div style={{ paddingRight: 16 }}>
                  <ProjectSegmentAction
                    projectId={projectId}
                    visible
                    canManageProject={canManageProject}
                    open={activeModal.type === "segment"}
                    editing={
                      activeModal.type === "segment"
                        ? activeModal.editing
                        : null
                    }
                    employees={employees}
                    onOpenCreate={() => {
                      setActiveModal({ type: "segment", editing: null });
                    }}
                    onCancel={() => {
                      setActiveModal({ type: null });
                    }}
                    onSaved={fetchProject}
                  />
                </div>
              ) : executionTopTab === "work" ? (
                <div style={{ paddingRight: 16 }}>
                  <ProjectActualWorkAction
                    projectId={projectId}
                    visible
                    actualWorkView={actualWorkView}
                    onActualWorkViewChange={setActualWorkView}
                    project={project}
                    employees={employees}
                    open={activeModal.type === "actual-work"}
                    editing={
                      activeModal.type === "actual-work"
                        ? activeModal.editing
                        : null
                    }
                    onOpenCreate={() => {
                      setActiveModal({
                        type: "actual-work",
                        editing: null,
                      });
                    }}
                    onCancel={() => {
                      setActiveModal({ type: null });
                    }}
                    onSaved={fetchProject}
                  />
                </div>
              ) : executionTopTab === "documents" ? (
                <div style={{ paddingRight: 16 }}>
                  <ProjectDocumentAction
                    projectId={projectId}
                    canManageProject={canManageProject}
                    visible
                    open={activeModal.type === "document"}
                    editing={
                      activeModal.type === "document"
                        ? activeModal.editing
                        : null
                    }
                    onOpenCreate={() => {
                      setActiveModal({ type: "document", editing: null });
                    }}
                    onCancel={() => {
                      setActiveModal({ type: null });
                    }}
                    onSaved={fetchProject}
                  />
                </div>
              ) : null,
            onChange: (key) =>
              setExecutionTopTab(
                key as
                  | "members"
                  | "milestones"
                  | "progress"
                  | "work"
                  | "documents",
              ),
            items: [
              {
                key: "members",
                label: `人员信息(${project.members?.length ?? 0})`,
                children: (
                  <ProjectDetailMembersContent
                    projectId={projectId}
                    members={project.members ?? []}
                    employees={employees}
                    addingFunction={addingFunction}
                    onSetAddingFunction={setAddingFunction}
                    onMembersChanged={fetchProject}
                  />
                ),
              },
              {
                key: "milestones",
                label: `里程碑(${milestoneCount})`,
                children: (
                  <ProjectDetailMilestonesContent
                    milestones={project.milestones ?? []}
                  />
                ),
              },
              {
                key: "progress",
                label: `环节${segmentRows.length}/任务${taskCount}`,
                children: (
                  <ProjectDetailProgressContent
                    projectId={projectId}
                    projectName={project.name ?? ""}
                    data={progressRows}
                    segmentCount={segmentRows.length}
                    taskCount={taskCount}
                    actionsDisabled={!canManageProject}
                    employees={employees}
                    onAddTask={(segment) => openTaskModalForSegment(segment)}
                    onEditSegment={(segment) => {
                      if (!canManageProject) return;
                      setActiveModal({
                        type: "segment",
                        editing: {
                          id: segment.id,
                          name: segment.name,
                          status: segment.status ?? null,
                          statusOption: segment.statusOption ?? null,
                          dueDate: segment.dueDate ?? null,
                          owner: segment.ownerId
                            ? {
                                id: segment.ownerId,
                                name: segment.ownerName,
                              }
                            : null,
                        },
                      });
                    }}
                    onAddPlannedWork={(task) =>
                      openCreatePlannedWorkModal(task.id)
                    }
                    onAfterUpdateTask={fetchProject}
                    onEditPlannedWork={(entry) => {
                      if (!canManageProject) return;
                      openEditPlannedWorkModal({
                        id: entry.id,
                        taskId: entry.taskId,
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
                      });
                    }}
                    onAfterDeletePlannedWork={fetchProject}
                    onAfterDeleteSegment={fetchProject}
                    onAfterDeleteTask={fetchProject}
                  />
                ),
              },
              {
                key: "work",
                label: `工时(${project.actualWorkEntries?.length ?? 0})`,
                children:
                  actualWorkView === "records" ? (
                    <ProjectActualWorkRecordsContent
                      projectId={projectId}
                      employeeFilterOptions={actualWorkEmployeeFilterOptions}
                      refreshKey={workEntriesRefreshKey}
                      requestData={async ({ current, pageSize, filters }) => {
                        const normalizedTitle = filters.title?.trim() ?? "";
                        const normalizedEmployee =
                          filters.employeeName?.trim() ?? "";
                        const normalizedDate = filters.startDate?.trim() ?? "";
                        const normalizedDateFrom =
                          filters.startDateFrom?.trim() ?? "";
                        const normalizedDateTo =
                          filters.startDateTo?.trim() ?? "";

                        const rows = (project.actualWorkEntries ?? []).map(
                          (entry) => ({
                            ...entry,
                            project: {
                              id: project.id,
                              name: project.name,
                            },
                          }),
                        );
                        const filtered = rows.filter((row) => {
                          if (
                            normalizedTitle &&
                            !(row.title ?? "").includes(normalizedTitle)
                          ) {
                            return false;
                          }
                          if (
                            normalizedEmployee &&
                            !(row.employee?.name ?? "").includes(
                              normalizedEmployee,
                            )
                          ) {
                            return false;
                          }
                          if (
                            normalizedDate &&
                            formatDate(row.startDate, DATE_FORMAT, "") !==
                              normalizedDate
                          ) {
                            return false;
                          }
                          if (normalizedDateFrom || normalizedDateTo) {
                            const rowDate = dayjs(row.startDate);
                            if (normalizedDateFrom) {
                              const from =
                                dayjs(normalizedDateFrom).startOf("day");
                              if (rowDate.isBefore(from)) return false;
                            }
                            if (normalizedDateTo) {
                              const to = dayjs(normalizedDateTo).endOf("day");
                              if (rowDate.isAfter(to)) return false;
                            }
                          }
                          return true;
                        });
                        const total = filtered.length;
                        const currentPage = current || 1;
                        const size = pageSize || 10;
                        const start = (currentPage - 1) * size;
                        const end = start + size;
                        return {
                          data: filtered.slice(start, end),
                          total,
                          success: true,
                        };
                      }}
                      canManageRow={(entry) =>
                        canManageAnyActualWorkEntry ||
                        (Boolean(currentUser?.id) &&
                          entry.employee?.id === currentUser?.id)
                      }
                      onEdit={(entry) => {
                        if (
                          !canManageAnyActualWorkEntry &&
                          entry.employee?.id !== currentUser?.id
                        ) {
                          return;
                        }
                        setActiveModal({
                          type: "actual-work",
                          editing: {
                            id: entry.id,
                            title: entry.title,
                            employeeId: entry.employee?.id ?? "",
                            startDate: entry.startDate,
                            endDate: entry.endDate,
                          },
                        });
                      }}
                      onAfterDelete={fetchProject}
                    />
                  ) : (
                    <ActualWorkAnalysisTable
                      entries={project.actualWorkEntries ?? []}
                      members={project.members ?? []}
                      onViewDetail={(target) => {
                        setActiveModal({
                          type: "analysis-detail",
                          target,
                        });
                      }}
                    />
                  ),
              },
              {
                key: "documents",
                label: `资料(${projectDocumentRows.length})`,
                children: (
                  <ProjectDocumentsContent
                    projectId={projectId}
                    rows={projectDocumentRows}
                    canManageProject={canManageProject}
                    onEdit={(record) => {
                      if (!canManageProject) return;
                      setActiveModal({
                        type: "document",
                        editing: {
                          id: record.id,
                          name: record.name,
                          typeOption: record.typeOption,
                          date: record.date,
                          isFinal: record.isFinal,
                          internalLink:
                            typeof record.internalLink === "string"
                              ? record.internalLink
                              : null,
                        },
                      });
                    }}
                    onAfterDelete={fetchProject}
                  />
                ),
              },
            ],
          }}
        />
      ) : (
        <>
          <Card styles={{ body: { paddingTop: 16, paddingBottom: 16 } }}>
            <Steps
              current={stepParam}
              onChange={handleStepChange}
              items={[
                { title: "项目报价" },
                { title: "项目立项" },
                { title: "项目执行" },
                { title: "项目成本追踪" },
                { title: "项目收付款" },
              ]}
            />
          </Card>

          {stepParam === 0 &&
            (shouldShowDevelopingCommercialSteps ? (
              <Card style={{ marginTop: 4 }}>
                <PageAccessResult type="developing" />
              </Card>
            ) : (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: pricingTab,
                onChange: (key) =>
                  setPricingTab(key as "cost-estimation" | "pricing-reference"),
                tabBarExtraContent:
                  pricingTab === "cost-estimation" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectCostEstimationCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestCostEstimation={
                          project.latestPlanningCostEstimation
                        }
                        estimationType="planning"
                        employees={employees}
                        showProjectInBasicInfo={false}
                        includeQuoteAmountInSyncSummary={false}
                        onSaved={handleCostEstimationSaved}
                      />
                    </div>
                  ) : pricingTab === "pricing-reference" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectPricingStrategyCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        latestCostEstimation={
                          project.latestPlanningCostEstimation
                        }
                      />
                    </div>
                  ) : null,
                items: [
                  {
                    key: "cost-estimation",
                    label: "项目成本测算",
                    children: (
                      <ProjectCostEstimationCard
                        mode="content"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestCostEstimation={
                          project.latestPlanningCostEstimation
                        }
                        estimationType="planning"
                        employees={employees}
                        showProjectInBasicInfo={false}
                        includeQuoteAmountInSyncSummary={false}
                        onSaved={handleCostEstimationSaved}
                      />
                    ),
                  },
                  {
                    key: "pricing-reference",
                    label: "报价参考",
                    children: (
                      <ProjectPricingStrategyCard
                        mode="content"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        latestCostEstimation={
                          project.latestPlanningCostEstimation
                        }
                      />
                    ),
                  },
                ],
              }}
            />
            ))}

          {stepParam === 1 &&
            (shouldShowDevelopingCommercialSteps ? (
              <Card style={{ marginTop: 4 }}>
                <PageAccessResult type="developing" />
              </Card>
            ) : (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: contractTopTab,
                onChange: (key) =>
                  setContractTopTab(
                    key as "project-initiation" | "project-financial-structure",
                  ),
                tabBarExtraContent:
                  contractTopTab === "project-initiation" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectCostEstimationCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestCostEstimation={
                          project.latestBaselineCostEstimation
                        }
                        modalPrefillEstimation={project.latestCostEstimation}
                        syncSummarySourceEstimation={
                          project.latestCostEstimation
                        }
                        estimationType="baseline"
                        employees={employees}
                        showProjectInBasicInfo={false}
                        showContractAmountInBasicInfo
                        includeQuoteAmountInSyncSummary
                        onSaved={handleBaselineCostEstimationSaved}
                      />
                    </div>
                  ) : contractTopTab === "project-financial-structure" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectFinancialStructureCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestBaselineCostEstimation={
                          project.latestBaselineCostEstimation
                        }
                        refreshKey={financialStructureRefreshKey}
                        onSaved={handleFinancialStructureSaved}
                      />
                    </div>
                  ) : null,
                items: [
                  {
                    key: "project-initiation",
                    label: "立项申请",
                    children: (
                      <ProjectCostEstimationCard
                        mode="content"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestCostEstimation={
                          project.latestBaselineCostEstimation
                        }
                        modalPrefillEstimation={project.latestCostEstimation}
                        syncSummarySourceEstimation={
                          project.latestCostEstimation
                        }
                        estimationType="baseline"
                        employees={employees}
                        showProjectInBasicInfo={false}
                        showContractAmountInBasicInfo
                        includeQuoteAmountInSyncSummary
                        onSaved={handleBaselineCostEstimationSaved}
                      />
                    ),
                  },
                  {
                    key: "project-financial-structure",
                    label: "项目财务结构",
                    children: (
                      <ProjectFinancialStructureCard
                        mode="content"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestBaselineCostEstimation={
                          project.latestBaselineCostEstimation
                        }
                        refreshKey={financialStructureRefreshKey}
                        onSaved={handleFinancialStructureSaved}
                      />
                    ),
                  },
                ],
              }}
            />
            ))}

          {stepParam === 2 && (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: executionTopTab,
                tabBarExtraContent:
                  executionTopTab === "milestones" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectMilestoneAction
                        projectId={projectId}
                        visible
                        canManageProject={canManageProject}
                        project={project}
                        employees={employees}
                        clientContacts={clientContacts}
                        open={activeModal.type === "milestone"}
                        editing={
                          activeModal.type === "milestone"
                            ? activeModal.editing
                            : null
                        }
                        onOpenCreate={() => {
                          setActiveModal({ type: "milestone", editing: null });
                        }}
                        onCancel={() => {
                          setActiveModal({ type: null });
                        }}
                        onSaved={fetchProject}
                      />
                    </div>
                  ) : executionTopTab === "progress" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectSegmentAction
                        projectId={projectId}
                        visible
                        canManageProject={canManageProject}
                        open={activeModal.type === "segment"}
                        editing={
                          activeModal.type === "segment"
                            ? activeModal.editing
                            : null
                        }
                        employees={employees}
                        onOpenCreate={() => {
                          setActiveModal({ type: "segment", editing: null });
                        }}
                        onCancel={() => {
                          setActiveModal({ type: null });
                        }}
                        onSaved={fetchProject}
                      />
                    </div>
                  ) : executionTopTab === "work" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectActualWorkAction
                        projectId={projectId}
                        visible
                        actualWorkView={actualWorkView}
                        onActualWorkViewChange={setActualWorkView}
                        project={project}
                        employees={employees}
                        open={activeModal.type === "actual-work"}
                        editing={
                          activeModal.type === "actual-work"
                            ? activeModal.editing
                            : null
                        }
                        onOpenCreate={() => {
                          setActiveModal({
                            type: "actual-work",
                            editing: null,
                          });
                        }}
                        onCancel={() => {
                          setActiveModal({ type: null });
                        }}
                        onSaved={fetchProject}
                      />
                    </div>
                  ) : executionTopTab === "documents" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectDocumentAction
                        projectId={projectId}
                        canManageProject={canManageProject}
                        visible
                        open={activeModal.type === "document"}
                        editing={
                          activeModal.type === "document"
                            ? activeModal.editing
                            : null
                        }
                        onOpenCreate={() => {
                          setActiveModal({ type: "document", editing: null });
                        }}
                        onCancel={() => {
                          setActiveModal({ type: null });
                        }}
                        onSaved={fetchProject}
                      />
                    </div>
                  ) : null,
                onChange: (key) =>
                  setExecutionTopTab(
                    key as
                      | "members"
                      | "vendors"
                      | "milestones"
                      | "progress"
                      | "work"
                      | "documents",
                  ),
                items: [
                  {
                    key: "members",
                    label: `人员信息(${project.members?.length ?? 0})`,
                    children: (
                      <ProjectDetailMembersContent
                        projectId={projectId}
                        members={project.members ?? []}
                        employees={employees}
                        addingFunction={addingFunction}
                        onSetAddingFunction={setAddingFunction}
                        onMembersChanged={fetchProject}
                      />
                    ),
                  },
                  {
                    key: "vendors",
                    label: `供应商(${project.vendors?.length ?? 0})`,
                    children: (
                      <Card styles={{ body: { padding: 16 } }}>
                        {(project.vendors?.length ?? 0) > 0 ? (
                          <Space wrap size={[12, 12]}>
                            {(project.vendors ?? []).map((vendor) => (
                              <AppLink
                                key={vendor.id}
                                href={`/vendors/${vendor.id}`}
                              >
                                {vendor.name}
                              </AppLink>
                            ))}
                          </Space>
                        ) : (
                          <Typography.Text type="secondary">
                            暂无合作供应商
                          </Typography.Text>
                        )}
                      </Card>
                    ),
                  },
                  {
                    key: "milestones",
                    label: `里程碑(${milestoneCount})`,
                    children: (
                      <ProjectDetailMilestonesContent
                        milestones={project.milestones ?? []}
                      />
                    ),
                  },
                  {
                    key: "progress",
                    label: `环节${segmentRows.length}/任务${taskCount}`,
                    children: (
                      <ProjectDetailProgressContent
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        data={progressRows}
                        segmentCount={segmentRows.length}
                        taskCount={taskCount}
                        actionsDisabled={!canManageProject}
                        employees={employees}
                        onAddTask={(segment) =>
                          openTaskModalForSegment(segment)
                        }
                        onEditSegment={(segment) => {
                          if (!canManageProject) return;
                          setActiveModal({
                            type: "segment",
                            editing: {
                              id: segment.id,
                              name: segment.name,
                              status: segment.status ?? null,
                              statusOption: segment.statusOption ?? null,
                              dueDate: segment.dueDate ?? null,
                              owner: segment.ownerId
                                ? {
                                    id: segment.ownerId,
                                    name: segment.ownerName,
                                  }
                                : null,
                            },
                          });
                        }}
                        onAddPlannedWork={(task) =>
                          openCreatePlannedWorkModal(task.id)
                        }
                        onAfterUpdateTask={fetchProject}
                        onEditPlannedWork={(entry) => {
                          if (!canManageProject) return;
                          openEditPlannedWorkModal({
                            id: entry.id,
                            taskId: entry.taskId,
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
                          });
                        }}
                        onAfterDeletePlannedWork={fetchProject}
                        onAfterDeleteSegment={fetchProject}
                        onAfterDeleteTask={fetchProject}
                      />
                    ),
                  },
                  {
                    key: "work",
                    label: `工时(${project.actualWorkEntries?.length ?? 0})`,
                    children:
                      actualWorkView === "records" ? (
                        <ProjectActualWorkRecordsContent
                          projectId={projectId}
                          employeeFilterOptions={
                            actualWorkEmployeeFilterOptions
                          }
                          refreshKey={workEntriesRefreshKey}
                          requestData={async ({
                            current,
                            pageSize,
                            filters,
                          }) => {
                            const normalizedTitle = filters.title?.trim() ?? "";
                            const normalizedEmployee =
                              filters.employeeName?.trim() ?? "";
                            const normalizedDate =
                              filters.startDate?.trim() ?? "";
                            const normalizedDateFrom =
                              filters.startDateFrom?.trim() ?? "";
                            const normalizedDateTo =
                              filters.startDateTo?.trim() ?? "";

                            const rows = (project.actualWorkEntries ?? []).map(
                              (entry) => ({
                                ...entry,
                                project: {
                                  id: project.id,
                                  name: project.name,
                                },
                              }),
                            );
                            const filtered = rows.filter((row) => {
                              if (
                                normalizedTitle &&
                                !(row.title ?? "").includes(normalizedTitle)
                              ) {
                                return false;
                              }
                              if (
                                normalizedEmployee &&
                                !(row.employee?.name ?? "").includes(
                                  normalizedEmployee,
                                )
                              ) {
                                return false;
                              }
                              if (
                                normalizedDate &&
                                formatDate(row.startDate, DATE_FORMAT, "") !==
                                  normalizedDate
                              ) {
                                return false;
                              }
                              if (normalizedDateFrom || normalizedDateTo) {
                                const rowDate = dayjs(row.startDate);
                                if (normalizedDateFrom) {
                                  const from =
                                    dayjs(normalizedDateFrom).startOf("day");
                                  if (rowDate.isBefore(from)) return false;
                                }
                                if (normalizedDateTo) {
                                  const to =
                                    dayjs(normalizedDateTo).endOf("day");
                                  if (rowDate.isAfter(to)) return false;
                                }
                              }
                              return true;
                            });
                            const total = filtered.length;
                            const currentPage = current || 1;
                            const size = pageSize || 10;
                            const start = (currentPage - 1) * size;
                            const end = start + size;
                            return {
                              data: filtered.slice(start, end),
                              total,
                              success: true,
                            };
                          }}
                          canManageRow={(entry) =>
                            canManageAnyActualWorkEntry ||
                            (Boolean(currentUser?.id) &&
                              entry.employee?.id === currentUser?.id)
                          }
                          onEdit={(entry) => {
                            if (
                              !canManageAnyActualWorkEntry &&
                              entry.employee?.id !== currentUser?.id
                            ) {
                              return;
                            }
                            setActiveModal({
                              type: "actual-work",
                              editing: {
                                id: entry.id,
                                title: entry.title,
                                employeeId: entry.employee?.id ?? "",
                                startDate: entry.startDate,
                                endDate: entry.endDate,
                              },
                            });
                          }}
                          onAfterDelete={fetchProject}
                        />
                      ) : (
                        <ActualWorkAnalysisTable
                          entries={project.actualWorkEntries ?? []}
                          members={project.members ?? []}
                          onViewDetail={(target) => {
                            setActiveModal({
                              type: "analysis-detail",
                              target,
                            });
                          }}
                        />
                      ),
                  },
                  {
                    key: "documents",
                    label: `资料(${projectDocumentRows.length})`,
                    children: (
                      <ProjectDocumentsContent
                        projectId={projectId}
                        rows={projectDocumentRows}
                        canManageProject={canManageProject}
                        onEdit={(record) => {
                          if (!canManageProject) return;
                          setActiveModal({
                            type: "document",
                            editing: {
                              id: record.id,
                              name: record.name,
                              typeOption: record.typeOption,
                              date: record.date,
                              isFinal: record.isFinal,
                              internalLink:
                                typeof record.internalLink === "string"
                                  ? record.internalLink
                                  : null,
                            },
                          });
                        }}
                        onAfterDelete={fetchProject}
                      />
                    ),
                  },
                ],
              }}
            />
          )}

          {stepParam === 3 &&
            (shouldShowDevelopingCommercialSteps ? (
              <Card style={{ marginTop: 4 }}>
                <PageAccessResult type="developing" />
              </Card>
            ) : financialStructureExists === null ? (
              <Card style={{ marginTop: 4 }} loading />
            ) : financialStructureExists ? (
              <ProCard
                style={{ marginTop: 4 }}
                tabs={{
                  type: "card",
                  activeKey: costTrackingTab,
                  tabBarExtraContent:
                    costTrackingTab === "expense-records" ? (
                      <div style={{ paddingRight: 16 }}>
                        <Button
                          type="primary"
                          onClick={() => setReimbursementModalOpen(true)}
                          disabled={!canManageProject}
                        >
                          新增报销
                        </Button>
                      </div>
                    ) : costTrackingTab === "realtime-cost" ? (
                      <div style={{ paddingRight: 16 }}>
                        <Button
                          onClick={() => {
                            realtimeCostDownload?.();
                          }}
                          disabled={!realtimeCostDownload}
                        >
                          下载表格
                        </Button>
                      </div>
                    ) : null,
                  onChange: (key) =>
                    setCostTrackingTab(
                      key as "expense-records" | "realtime-cost",
                    ),
                  items: [
                    {
                      key: "realtime-cost",
                      label: "实时成本",
                      children: (
                        <ProjectRealtimeCostTrackingTable
                          projectId={projectId}
                          projectName={project.name ?? ""}
                          startDate={project.startDate}
                          latestBaselineCostEstimation={
                            project.latestBaselineCostEstimation
                          }
                          members={project.members}
                          actualWorkEntries={project.actualWorkEntries}
                          workdayAdjustments={workdayAdjustments}
                          onDownloadReady={handleRealtimeCostDownloadReady}
                        />
                      ),
                    },
                    {
                      key: "expense-records",
                      label: "项目报销记录",
                      children: (
                        <ProjectReimbursementRecordsContent
                          projectId={projectId}
                          projectName={project.name ?? ""}
                          employees={(project.members ?? []).map((item) => ({
                            id: item.id,
                            name: item.name,
                          }))}
                          canManageProject={canManageProject}
                          open={reimbursementModalOpen}
                          onCancel={() => setReimbursementModalOpen(false)}
                        />
                      ),
                    },
                  ],
                }}
              />
            ) : (
              <Card style={{ marginTop: 4 }}>当前项目暂无财务结构。</Card>
            ))}

          {stepParam === 4 &&
            (shouldShowDevelopingCommercialSteps ? (
              <Card style={{ marginTop: 4 }}>
                <PageAccessResult type="developing" />
              </Card>
            ) : (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: financeTopTab,
                onChange: (key) =>
                  setFinanceTopTab(key as "receivable" | "payable"),
                tabBarExtraContent: (
                  <div style={{ paddingRight: 16 }}>
                    {financeTopTab === "receivable" ? (
                      <Button
                        type="primary"
                        disabled={!canManageProject}
                        onClick={() => {
                          setReceivablePlanModalMode("create");
                          setReceivablePlanModalOpen(true);
                        }}
                      >
                        新增收款计划
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        disabled={!canManageProject}
                        onClick={() => {
                          setPayablePlanModalMode("create");
                          setPayablePlanModalOpen(true);
                        }}
                      >
                        新增付款计划
                      </Button>
                    )}
                  </div>
                ),
                items: [
                  {
                    key: "receivable",
                    label: "项目收款",
                    children: (
                      <Card
                        title={receivableCurrentPlan ? "收款计划-1" : undefined}
                        extra={
                          receivableCurrentPlan ? (
                            <>
                              <Button
                                style={{ marginRight: 8 }}
                                disabled={!canManageProject}
                                onClick={() => {
                                  setReceivablePlanModalMode("edit");
                                  setReceivablePlanModalOpen(true);
                                }}
                              >
                                修改
                              </Button>
                              <Button
                                danger
                                disabled={!canManageProject}
                                onClick={async () => {
                                  await receivableCardRef.current?.handleDeletePlan();
                                }}
                              >
                                删除
                              </Button>
                            </>
                          ) : null
                        }
                      >
                        <ProjectReceivableInfo
                          ref={receivableCardRef}
                          projectId={projectId}
                          project={project}
                          canManageProject={canManageProject}
                          planModalOpen={receivablePlanModalOpen}
                          planModalMode={receivablePlanModalMode}
                          onPlanModalOpenChange={setReceivablePlanModalOpen}
                          onPlanModalModeChange={setReceivablePlanModalMode}
                          onCurrentPlanChange={setReceivableCurrentPlan}
                          nodeModalOpen={receivableNodeModalOpen}
                          onNodeModalOpenChange={setReceivableNodeModalOpen}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: "payable",
                    label: "项目付款",
                    children: (
                      <Card
                        title={payableCurrentPlan ? "付款计划-1" : undefined}
                        extra={
                          payableCurrentPlan ? (
                            <>
                              <Button
                                style={{ marginRight: 8 }}
                                disabled={!canManageProject}
                                onClick={() => {
                                  setPayablePlanModalMode("edit");
                                  setPayablePlanModalOpen(true);
                                }}
                              >
                                修改
                              </Button>
                              <Button
                                danger
                                disabled={!canManageProject}
                                onClick={async () => {
                                  await payableCardRef.current?.handleDeletePlan();
                                }}
                              >
                                删除
                              </Button>
                            </>
                          ) : null
                        }
                      >
                        <ProjectPayableInfo
                          ref={payableCardRef}
                          projectId={projectId}
                          project={project}
                          canManageProject={canManageProject}
                          planModalOpen={payablePlanModalOpen}
                          planModalMode={payablePlanModalMode}
                          onPlanModalOpenChange={setPayablePlanModalOpen}
                          onPlanModalModeChange={setPayablePlanModalMode}
                          onCurrentPlanChange={setPayableCurrentPlan}
                          nodeModalOpen={payableNodeModalOpen}
                          onNodeModalOpenChange={setPayableNodeModalOpen}
                        />
                      </Card>
                    ),
                  },
                ],
              }}
            />
            ))}
        </>
      )}
      <ProjectTaskModal
        projectId={projectId}
        projectName={project?.name}
        canManageProject={canManageProject}
        open={activeModal.type === "task"}
        editing={activeModal.type === "task" ? activeModal.editing : null}
        segmentRows={segmentRows}
        defaultSegmentId={
          activeModal.type === "task" ? activeModal.defaultSegmentId : undefined
        }
        employees={employees}
        onCancel={() => {
          setActiveModal({ type: null });
        }}
        onCreate={handleCreateTask}
        onSaved={fetchProject}
      />

      <ProjectPlannedWorkModal
        projectId={projectId}
        open={activeModal.type === "planned-work"}
        project={project}
        editing={
          activeModal.type === "planned-work" ? activeModal.editing : null
        }
        defaultTaskId={
          activeModal.type === "planned-work"
            ? activeModal.defaultTaskId
            : undefined
        }
        onCancel={() => {
          setActiveModal({ type: null });
        }}
        onCreate={handleCreatePlannedWorkEntry}
        onSaved={fetchProject}
      />

      <Modal
        title={
          analysisDetailTarget
            ? `${analysisDetailTarget.memberName} 的工时记录`
            : "工时记录"
        }
        open={Boolean(analysisDetailTarget)}
        onCancel={() => setActiveModal({ type: null })}
        footer={null}
        centered
        destroyOnHidden
        width={900}
        styles={{
          body: {
            height: "80vh",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto",
          },
        }}
      >
        <ActualWorkEntriesTable
          headerTitle={null}
          showTableOptions={false}
          compactHorizontalPadding
          columnKeys={["title", "startDate", "workDay"]}
          requestData={async ({ current, pageSize, filters }) => {
            const normalizedTitle = filters.title?.trim() ?? "";
            const normalizedDate = filters.startDate?.trim() ?? "";
            const normalizedDateFrom = filters.startDateFrom?.trim() ?? "";
            const normalizedDateTo = filters.startDateTo?.trim() ?? "";

            const filtered = actualWorkDetailRows.filter((row) => {
              if (
                normalizedTitle &&
                !(row.title ?? "").includes(normalizedTitle)
              ) {
                return false;
              }
              if (
                normalizedDate &&
                formatDate(row.startDate, DATE_FORMAT, "") !== normalizedDate
              ) {
                return false;
              }
              if (normalizedDateFrom || normalizedDateTo) {
                const rowDate = dayjs(row.startDate);
                if (normalizedDateFrom) {
                  const from = dayjs(normalizedDateFrom).startOf("day");
                  if (rowDate.isBefore(from)) return false;
                }
                if (normalizedDateTo) {
                  const to = dayjs(normalizedDateTo).endOf("day");
                  if (rowDate.isAfter(to)) return false;
                }
              }
              return true;
            });

            const start = Math.max((current - 1) * pageSize, 0);
            const end = start + pageSize;
            return {
              data: filtered.slice(start, end),
              total: filtered.length,
            };
          }}
        />
      </Modal>

      <ProjectFormModal
        open={activeModal.type === "project-edit"}
        initialValues={project}
        onCancel={() => setActiveModal({ type: null })}
        onSuccess={async () => {
          setActiveModal({ type: null });
          await fetchProject();
        }}
        clients={clients}
        employees={employees}
      />
    </DetailPageContainer>
  );
};

export default ProjectDetailPage;
