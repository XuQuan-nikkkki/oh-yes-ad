"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button, Card, Modal, Popconfirm, Space, Steps, Typography, message } from "antd";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ProCard } from "@ant-design/pro-components";
import DetailPageContainer from "@/components/DetailPageContainer";
import ProjectFormModal from "@/components/ProjectFormModal";
import dayjs from "dayjs";
import { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";
import ActualWorkAnalysisTable from "@/components/project-detail/ActualWorkAnalysisTable";
import ActualWorkEntriesTable, {
  type ActualWorkEntryRow,
} from "@/components/ActualWorkEntriesTable";
import ProjectDetailMilestonesContent from "@/components/project-detail/ProjectDetailMilestonesContent";
import ProjectDetailMembersContent from "@/components/project-detail/ProjectDetailMembersContent";
import ProjectBriefProgressContent, {
  type ProjectBrief,
  type ProjectBriefWorkItem,
} from "@/components/project-detail/ProjectBriefProgressContent";
import BriefFormModal from "@/components/project-detail/BriefFormModal";
import WorkItemEditModal from "@/components/project-detail/WorkItemEditModal";
import ProjectActualWorkRecordsContent from "@/components/project-detail/ProjectActualWorkRecordsContent";
import ProjectCostEstimationCard from "@/components/project-detail/ProjectCostEstimationCard";
import ProjectInitiationCard from "@/components/project-detail/ProjectInitiationCard";
import ProjectPricingStrategyCard from "@/components/project-detail/ProjectPricingStrategyCard";
import ProjectFinancialStructureCard from "@/components/project-detail/ProjectFinancialStructureCard";
import ProjectManualCostModal from "@/components/project-detail/ProjectManualCostModal";
import ProjectRealtimeCostTrackingTable from "@/components/project-detail/ProjectRealtimeCostTrackingTable";
import ProjectReimbursementRecordsContent from "@/components/project-detail/ProjectReimbursementRecordsContent";
import ProjectReimbursementCreateAction from "@/components/project-detail/ProjectReimbursementCreateAction";
import ProjectPayableInfo from "@/components/project-detail/ProjectPayableInfo";
import ProjectReceivableInfo from "@/components/project-detail/ProjectReceivableInfo";
import ProjectStatusValue from "@/components/project-detail/ProjectStatusValue";
import {
  ProjectActualWorkAction,
  ProjectMilestoneAction,
} from "@/components/project-detail/ProjectDetailActionModules";
import ProjectInfo from "./ProjectInfo";
import projectInfoStyles from "./ProjectInfo.module.css";
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
import { canManageProjectResources } from "@/lib/role-permissions";
import type {
  ClientContact,
  Employee,
  Project,
  WorkdayAdjustment,
} from "@/types/projectDetail";

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
  | { type: "actual-work"; editing: EditingActualWorkEntry }
  | { type: "analysis-detail"; target: AnalysisDetailTarget };

const ProjectDetailPage = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const cachedProject = useProjectsStore((state) => state.byId[projectId]);
  const upsertProjects = useProjectsStore((state) => state.upsertProjects);
  const removeProjectFromStore = useProjectsStore((state) => state.removeProject);
  const upsertProjectMilestones = useProjectMilestonesStore(
    (state) => state.upsertMilestones,
  );
  const hasCachedProject = Boolean(cachedProject);

  const [project, setProject] = useState<Project | null>(
    (cachedProject as Project | undefined) ?? null,
  );
  const [messageApi, messageContextHolder] = message.useMessage();
  const [editingBrief, setEditingBrief] = useState<ProjectBrief | null>(null);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<{
    briefId?: string;
    workItem?: ProjectBriefWorkItem;
  } | null>(null);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [contactsLoadedClientId, setContactsLoadedClientId] = useState<
    string | null
  >(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const [loading, setLoading] = useState(!hasCachedProject);
  const [projectLoadError, setProjectLoadError] = useState<"not-found" | "failed" | null>(null);
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
    "members" | "vendors" | "milestones" | "progress" | "work"
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
  const [manualCostModalOpen, setManualCostModalOpen] = useState(false);
  const [deletingManualCost, setDeletingManualCost] = useState(false);
  const [financialStructureExists, setFinancialStructureExists] = useState<
    boolean | null
  >(null);
  const [financialStructureRefreshKey, setFinancialStructureRefreshKey] =
    useState(0);
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
  const tabParamRaw = searchParams.get("tab");
  const stepTabKeys = useMemo(
    () =>
      ({
        0: ["cost-estimation", "pricing-reference"],
        1: ["project-initiation", "project-financial-structure"],
        2: ["members", "vendors", "milestones", "progress", "work"],
        3: ["receivable", "payable"],
        4: ["realtime-cost", "expense-records"],
      }) as const,
    [],
  );
  const isInternalProject =
    project?.type === "INTERNAL" ||
    project?.type === "内部项目" ||
    project?.typeOption?.value === "内部项目";
  const { canManageProject } = useProjectPermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canViewRealtimeCostDownload = useMemo(
    () => roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE"),
    [roleCodes],
  );
  const canManageReimbursements = useMemo(
    () => roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE"),
    [roleCodes],
  );
  const canCollectReceivable = useMemo(
    () =>
      roleCodes.includes("ADMIN") ||
      roleCodes.includes("FINANCE") ||
      roleCodes.includes("PROJECT_MANAGER"),
    [roleCodes],
  );
  const hasManualCost = useMemo(() => {
    if (!project?.manualCost) return false;
    return Object.values(project.manualCost).some((value) => {
      if (typeof value === "number") return Number.isFinite(value);
      if (typeof value === "string") return value.trim().length > 0;
      return false;
    });
  }, [project?.manualCost]);
  const canManageAnyActualWorkEntry = canManageProjectResources(roleCodes);
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
          setProjectLoadError(res.status === 404 ? "not-found" : "failed");
          setProject(null);
          setClientContacts([]);
          return;
        }
        const data = (await res.json()) as Project;
        setProjectLoadError(null);
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
      } catch {
        setProjectLoadError("failed");
        setProject(null);
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
    (latestCostEstimation: Project["latestCostEstimation"]) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latestCostEstimation: latestCostEstimation ?? null,
        };
      });
    },
    [],
  );

  const handleInitiationSaved = useCallback(
    (latestInitiation: Project["latestInitiation"]) => {
      setProject((prev) => {
        if (!prev) return prev;
        const normalizedLatestInitiation = latestInitiation ?? null;
        return {
          ...prev,
          latestInitiation: normalizedLatestInitiation,
          initiations: normalizedLatestInitiation
            ? [normalizedLatestInitiation]
            : [],
        };
      });
    },
    [],
  );

  const handleFinancialStructureSaved = useCallback(async () => {
    setFinancialStructureRefreshKey((prev) => prev + 1);
    await Promise.all([fetchProject(), fetchFinancialStructureExists()]);
  }, [fetchFinancialStructureExists, fetchProject]);

  const handleManualCostSaved = useCallback(
    (savedProject: Project) => {
      setProject((prev) => (prev ? { ...prev, ...savedProject } : savedProject));
      setManualCostModalOpen(false);
      void fetchProject();
    },
    [fetchProject],
  );

  const handleDeleteManualCost = useCallback(async () => {
    if (!projectId) return;
    setDeletingManualCost(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          costSourceMode: "AUTO",
          manualCost: null,
        }),
      });

      if (!response.ok) {
        return;
      }

      const savedProject = (await response.json()) as Project;
      setProject((prev) => (prev ? { ...prev, ...savedProject } : savedProject));
      void fetchProject();
    } finally {
      setDeletingManualCost(false);
    }
  }, [fetchProject, projectId]);

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
    // "项目成本追踪" step
    if (stepParam !== 4) return;
    void fetchFinancialStructureExists();
  }, [fetchFinancialStructureExists, stepParam]);

  const milestoneCount = project?.milestones?.length ?? 0;
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


  const replaceSearchParams = useCallback(
    (nextParams: URLSearchParams) => {
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const handleStepChange = useCallback(
    (step: number) => {
      const nextStep = Math.min(4, Math.max(0, Math.trunc(step))) as
        | 0
        | 1
        | 2
        | 3
        | 4;
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("step", String(nextStep));
      nextParams.set("tab", stepTabKeys[nextStep][0]);
      replaceSearchParams(nextParams);
    },
    [replaceSearchParams, searchParams, stepTabKeys],
  );

  const handleStepTabChange = useCallback(
    (key: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("step", String(stepParam));
      nextParams.set("tab", key);
      replaceSearchParams(nextParams);
    },
    [replaceSearchParams, searchParams, stepParam],
  );

  useEffect(() => {
    if (isInternalProject) return;

    const stepIndex = stepParam as 0 | 1 | 2 | 3 | 4;
    const validKeys = stepTabKeys[stepIndex] as readonly string[];
    const normalizedTab =
      tabParamRaw && validKeys.includes(tabParamRaw)
        ? tabParamRaw
        : validKeys[0];

    if (stepParam === 0) {
      if (pricingTab !== normalizedTab) {
        setPricingTab(normalizedTab as "cost-estimation" | "pricing-reference");
      }
    } else if (stepParam === 1) {
      if (contractTopTab !== normalizedTab) {
        setContractTopTab(
          normalizedTab as "project-initiation" | "project-financial-structure",
        );
      }
    } else if (stepParam === 2) {
      if (executionTopTab !== normalizedTab) {
        setExecutionTopTab(
          normalizedTab as
            | "members"
            | "vendors"
            | "milestones"
            | "progress"
            | "work",
        );
      }
    } else if (stepParam === 3) {
      if (financeTopTab !== normalizedTab) {
        setFinanceTopTab(normalizedTab as "receivable" | "payable");
      }
    } else if (stepParam === 4) {
      if (costTrackingTab !== normalizedTab) {
        setCostTrackingTab(normalizedTab as "expense-records" | "realtime-cost");
      }
    }

    if (tabParamRaw !== normalizedTab) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", normalizedTab);
      replaceSearchParams(nextParams);
    }
  }, [
    contractTopTab,
    costTrackingTab,
    executionTopTab,
    financeTopTab,
    isInternalProject,
    pricingTab,
    replaceSearchParams,
    searchParams,
    stepParam,
    stepTabKeys,
    tabParamRaw,
  ]);

  if (!project) {
    return (
      <DetailPageContainer>
        <Card loading={loading}>
          {loading ? null : projectLoadError === "failed" ? (
            <>项目加载失败，请刷新重试。 <Button onClick={() => void fetchProject(true)}>重新加载</Button></>
          ) : "项目不存在"}
        </Card>
      </DetailPageContainer>
    );
  }

  const openCreateBrief = () => {
    if (!project.client) {
      messageApi.error("当前项目未关联客户");
      return;
    }
    setEditingBrief(null);
    setBriefModalOpen(true);
  };

  const briefProgressContent = (
    <ProjectBriefProgressContent
      briefs={project.briefs ?? []}
      project={{ id: project.id, name: project.name }}
      canManagePlannedWork={canManageProject}
      onAfterPlannedWorkChange={fetchProject}
      onAfterAssignmentChange={canManageProject ? fetchProject : undefined}
      onAfterSubmissionChange={canManageProject ? fetchProject : undefined}
      onAfterStatusChange={canManageProject ? fetchProject : undefined}
      onEditBrief={canManageProject ? (brief) => {
        if (!project.client) {
          messageApi.error("当前项目未关联客户");
          return;
        }
        setEditingBrief(brief);
        setBriefModalOpen(true);
      } : undefined}
      onEditWorkItem={canManageProject ? (workItem) => {
        setEditingWorkItem({ workItem });
      } : undefined}
      onAddWorkItem={canManageProject ? (brief) => {
        setEditingWorkItem({ briefId: brief.id });
      } : undefined}
      onDeleteBrief={canManageProject ? async (brief) => {
        const response = await fetch(`/api/briefs/${brief.id}`, { method: "DELETE" });
        if (!response.ok) {
          messageApi.error((await response.text()) || "删除需求单失败");
          return;
        }
        messageApi.success("需求单已删除");
        await fetchProject();
      } : undefined}
      onDeleteWorkItem={canManageProject ? async (workItem) => {
        const response = await fetch(`/api/work-items/${workItem.id}`, { method: "DELETE" });
        if (!response.ok) {
          messageApi.error((await response.text()) || "删除工作项失败");
          return;
        }
        messageApi.success("工作项已删除");
        await fetchProject();
      } : undefined}
    />
  );

  const handleProjectUpdated = (updatedProject: Project) => {
    setProject(updatedProject);
    upsertProjects([updatedProject]);
  };

  return (
    <DetailPageContainer>
      {messageContextHolder}
      <Card
        title={
          <div className={projectInfoStyles.title}>
            <span className={projectInfoStyles.titleName}>
              {project.name || "项目信息"}
            </span>
            {!isInternalProject && (
              <span className={projectInfoStyles.titleStatus}>
                <ProjectStatusValue
                  projectId={project.id}
                  status={project.status}
                  statusOption={project.statusOption}
                  onSaved={handleProjectUpdated}
                />
              </span>
            )}
          </div>
        }
        loading={loading}
        extra={
          <ProjectPrimaryActions
            projectId={projectId}
            projectName={project.name}
            canManageProject={canManageProject}
            deletingProject={deletingProject}
            setDeletingProject={setDeletingProject}
            onDeleted={() => {
              removeProjectFromStore(projectId);
            }}
            onOpenEdit={() => setActiveModal({ type: "project-edit" })}
          />
        }
      >
        <ProjectInfo
          project={project}
          workdayAdjustments={workdayAdjustments}
          onProjectUpdated={handleProjectUpdated}
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
                  {canManageProject ? (
                    <Button type="primary" onClick={openCreateBrief}>
                      创建需求单
                    </Button>
                  ) : null}
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
              ) : null,
            onChange: (key) =>
              setExecutionTopTab(
                key as
                  | "members"
                  | "milestones"
                  | "progress"
                  | "work",
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
                label: `需求单${project.briefs?.length ?? 0}/工作项${(project.briefs ?? []).reduce((sum, brief) => sum + (brief.workItems?.length ?? 0), 0)}`,
                children: briefProgressContent,
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
                { title: "项目收付款" },
                { title: "项目成本追踪" },
              ]}
            />
          </Card>

          {stepParam === 0 && (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: pricingTab,
                onChange: (key) => {
                  setPricingTab(key as "cost-estimation" | "pricing-reference");
                  handleStepTabChange(String(key));
                },
                tabBarExtraContent:
                  pricingTab === "cost-estimation" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectCostEstimationCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        projectMembers={project.members}
                        latestCostEstimation={
                          project.latestCostEstimation
                        }
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
                          project.latestCostEstimation
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
                        projectMembers={project.members}
                        latestCostEstimation={
                          project.latestCostEstimation
                        }
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
                          project.latestCostEstimation
                        }
                      />
                    ),
                  },
                ],
              }}
            />
          )}

          {stepParam === 1 && (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: contractTopTab,
                onChange: (key) => {
                  setContractTopTab(
                    key as "project-initiation" | "project-financial-structure",
                  );
                  handleStepTabChange(String(key));
                },
                tabBarExtraContent:
                  contractTopTab === "project-initiation" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectInitiationCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        projectMembers={project.members}
                        canManageProject={canManageProject}
                        latestInitiation={
                          project.latestInitiation
                        }
                        modalPrefillInitiation={project.latestCostEstimation}
                        syncSummarySourceInitiation={
                          project.latestCostEstimation
                        }
                        employees={employees}
                        showProjectInBasicInfo={false}
                        showContractAmountInBasicInfo
                        includeQuoteAmountInSyncSummary
                        onSaved={handleInitiationSaved}
                      />
                    </div>
                  ) : contractTopTab === "project-financial-structure" ? (
                    <div style={{ paddingRight: 16 }}>
                      <ProjectFinancialStructureCard
                        mode="actions"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        canManageProject={canManageProject}
                        latestInitiation={
                          project.latestInitiation
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
                      <ProjectInitiationCard
                        mode="content"
                        projectId={projectId}
                        projectName={project.name ?? ""}
                        projectMembers={project.members}
                        canManageProject={canManageProject}
                        latestInitiation={
                          project.latestInitiation
                        }
                        modalPrefillInitiation={project.latestCostEstimation}
                        syncSummarySourceInitiation={
                          project.latestCostEstimation
                        }
                        employees={employees}
                        showProjectInBasicInfo={false}
                        showContractAmountInBasicInfo
                        includeQuoteAmountInSyncSummary
                        onSaved={handleInitiationSaved}
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
                        latestInitiation={
                          project.latestInitiation
                        }
                        refreshKey={financialStructureRefreshKey}
                        onSaved={handleFinancialStructureSaved}
                      />
                    ),
                  },
                ],
              }}
            />
          )}

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
                      {canManageProject ? (
                        <Button type="primary" onClick={openCreateBrief}>
                          创建需求单
                        </Button>
                      ) : null}
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
                  ) : null,
                onChange: (key) => {
                  setExecutionTopTab(
                    key as
                      | "members"
                      | "vendors"
                      | "milestones"
                      | "progress"
                      | "work",
                  );
                  handleStepTabChange(String(key));
                },
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
                    label: `需求单${project.briefs?.length ?? 0}/工作项${(project.briefs ?? []).reduce((sum, brief) => sum + (brief.workItems?.length ?? 0), 0)}`,
                    children: briefProgressContent,
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
                ],
              }}
            />
          )}

          {stepParam === 4 &&
            (financialStructureExists === null ? (
              <Card style={{ marginTop: 4 }} loading />
            ) : (
              <ProCard
                style={{ marginTop: 4 }}
                tabs={{
                  type: "card",
                  activeKey: costTrackingTab,
                  tabBarExtraContent:
                    costTrackingTab === "expense-records" ? (
                      <div style={{ paddingRight: 16 }}>
                        <ProjectReimbursementCreateAction
                          projectId={projectId}
                          projectName={project.name ?? ""}
                          employees={(project.members ?? []).map((item) => ({
                            id: item.id,
                            name: item.name,
                          }))}
                          canManageProject={canManageReimbursements}
                        />
                      </div>
	                    ) : costTrackingTab === "realtime-cost" ? (
	                      <div style={{ paddingRight: 16 }}>
	                        <Space>
	                          {canManageReimbursements ? (
	                            project.costSourceMode === "MANUAL" &&
	                            hasManualCost ? (
	                              <>
	                                <Button
	                                  onClick={() => {
	                                    setManualCostModalOpen(true);
	                                  }}
	                                >
	                                  编辑成本
	                                </Button>
	                                <Popconfirm
	                                  title="确认删除补充成本？"
	                                  description="删除后将清空人工录入成本，并把成本口径切回自动计算。"
	                                  okText="删除"
	                                  cancelText="取消"
	                                  okButtonProps={{
	                                    danger: true,
	                                    loading: deletingManualCost,
	                                  }}
	                                  onConfirm={() => {
	                                    void handleDeleteManualCost();
	                                  }}
	                                >
	                                  <Button danger loading={deletingManualCost}>
	                                    删除成本
	                                  </Button>
	                                </Popconfirm>
	                              </>
	                            ) : (
	                              <Button
	                                onClick={() => {
	                                  setManualCostModalOpen(true);
	                                }}
	                              >
	                                补充成本
	                              </Button>
	                            )
	                          ) : null}
	                          {canViewRealtimeCostDownload ? (
                            <Button
                              onClick={() => {
                                realtimeCostDownload?.();
                              }}
                              disabled={!realtimeCostDownload}
                            >
                              下载数据
                            </Button>
                          ) : null}
                        </Space>
                      </div>
                    ) : null,
                  onChange: (key) => {
                    setCostTrackingTab(
                      key as "expense-records" | "realtime-cost",
                    );
                    handleStepTabChange(String(key));
                  },
                  items: [
                    {
                      key: "realtime-cost",
                      label: "实时成本",
                      children: (
                        <ProjectRealtimeCostTrackingTable
                          projectId={projectId}
                          projectName={project.name ?? ""}
                          startDate={project.startDate}
                          endDate={project.endDate}
                          costSourceMode={project.costSourceMode}
                          manualCost={project.manualCost}
                          latestInitiation={
                            project.latestInitiation
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
                          canManageProject={canManageReimbursements}
                        />
                      ),
                    },
                  ],
                }}
              />
            ))}

          {stepParam === 3 && (
            <ProCard
              style={{ marginTop: 4 }}
              tabs={{
                type: "card",
                activeKey: financeTopTab,
                onChange: (key) => {
                  setFinanceTopTab(key as "receivable" | "payable");
                  handleStepTabChange(String(key));
                },
                tabBarExtraContent: (
                  <div style={{ paddingRight: 16 }}>
                    {financeTopTab === "receivable" ? (
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
                          <Popconfirm
                            title="确定删除当前收款计划吗？删除后节点也会被删除。"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                              await receivableCardRef.current?.handleDeletePlan();
                            }}
                          >
                            <Button danger disabled={!canManageProject}>
                              删除
                            </Button>
                          </Popconfirm>
                        </>
                      ) : (
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
                      )
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
                      <ProjectReceivableInfo
                        ref={receivableCardRef}
                        projectId={projectId}
                        project={project}
                        canManageProject={canManageProject}
                        canManageReceivableNodes={canCollectReceivable}
                        canCollectReceivable={canCollectReceivable}
                        canManageBadDebtRecords={canManageReimbursements}
                        planModalOpen={receivablePlanModalOpen}
                        planModalMode={receivablePlanModalMode}
                        onPlanModalOpenChange={setReceivablePlanModalOpen}
                        onPlanModalModeChange={setReceivablePlanModalMode}
                        onCurrentPlanChange={setReceivableCurrentPlan}
                        nodeModalOpen={receivableNodeModalOpen}
                        onNodeModalOpenChange={setReceivableNodeModalOpen}
                      />
                    ),
                  },
                  {
                    key: "payable",
                    label: "项目付款",
                    children: (
                      <ProjectPayableInfo
                        ref={payableCardRef}
                        projectId={projectId}
                        project={project}
                        canManageProject={canManageProject}
                        planModalOpen={payablePlanModalOpen}
                        planModalMode={payablePlanModalMode}
                        onPlanModalOpenChange={setPayablePlanModalOpen}
                        onPlanModalModeChange={setPayablePlanModalMode}
                        nodeModalOpen={payableNodeModalOpen}
                        onNodeModalOpenChange={setPayableNodeModalOpen}
                      />
                    ),
                  },
                ],
              }}
              />
          )}
        </>
      )}
      {briefModalOpen && project.client && currentUser ? (
        <BriefFormModal
          open
          onCancel={() => {
            setBriefModalOpen(false);
            setEditingBrief(null);
          }}
          project={{ id: project.id, name: project.name, ownerId: project.ownerId ?? project.owner?.id }}
          client={project.client}
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
            setEditingBrief(null);
            await fetchProject();
          }}
        />
      ) : null}

      {editingWorkItem ? (
        <WorkItemEditModal
          open
          workItem={editingWorkItem.workItem}
          projectOwnerId={project.ownerId ?? project.owner?.id}
          employees={employees}
          onCancel={() => setEditingWorkItem(null)}
          onSubmit={async (payload) => {
            try {
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
              setEditingWorkItem(null);
              await fetchProject();
            } catch (error) {
              messageApi.error(
                error instanceof Error ? error.message : "保存工作项失败，请重试",
              );
            }
          }}
        />
      ) : null}

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
      <ProjectManualCostModal
        open={manualCostModalOpen}
        projectId={projectId}
        initialValues={project?.manualCost}
        onCancel={() => {
          setManualCostModalOpen(false);
        }}
        onSaved={handleManualCostSaved}
      />
    </DetailPageContainer>
  );
};

export default ProjectDetailPage;
