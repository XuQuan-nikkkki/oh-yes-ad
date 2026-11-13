"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button, Card, Modal, Popconfirm, Space, message } from "antd";
import { useParams } from "next/navigation";
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
import ProjectDetailWorkspaceComparison from "@/components/project-detail/ProjectDetailWorkspaceComparison";
import ProjectBriefProgressContent, {
  type ProjectBrief,
  type ProjectBriefWorkItem,
} from "@/components/project-detail/ProjectBriefProgressContent";
import BriefFormModal from "@/components/project-detail/BriefFormModal";
import WorkItemEditModal from "@/components/project-detail/WorkItemEditModal";
import ProjectActualWorkRecordsContent from "@/components/project-detail/ProjectActualWorkRecordsContent";
import ProjectManualCostModal from "@/components/project-detail/ProjectManualCostModal";
import ProjectStatusValue from "@/components/project-detail/ProjectStatusValue";
import {
  ProjectActualWorkAction,
  ProjectMilestoneAction,
} from "@/components/project-detail/ProjectDetailActionModules";
import ProjectInfo from "./ProjectInfo";
import projectInfoStyles from "./ProjectInfo.module.css";
import ProjectPrimaryActions from "./ProjectPrimaryActions";
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
  const [executionTopTab, setExecutionTopTab] = useState<
    "members" | "vendors" | "milestones" | "progress" | "work"
  >("members");
  const [realtimeCostDownload, setRealtimeCostDownload] = useState<
    (() => void) | null
  >(null);
  const [manualCostModalOpen, setManualCostModalOpen] = useState(false);
  const [deletingManualCost, setDeletingManualCost] = useState(false);
  const [financialStructureRefreshKey, setFinancialStructureRefreshKey] =
    useState(0);
  const [actualWorkView, setActualWorkView] = useState<"records" | "analysis">(
    "records",
  );
  const [workEntriesRefreshKey, setWorkEntriesRefreshKey] = useState(0);
  const handleRealtimeCostDownloadReady = useCallback(
    (downloadFn: (() => void) | null) => {
      setRealtimeCostDownload(() => downloadFn);
    },
    [],
  );
  const analysisDetailTarget =
    activeModal.type === "analysis-detail" ? activeModal.target : null;
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
    await fetchProject();
  }, [fetchProject]);

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

  const realtimeCostActions = (
    <Space>
      {canManageReimbursements ? (
        project.costSourceMode === "MANUAL" && hasManualCost ? (
          <>
            <Button onClick={() => setManualCostModalOpen(true)}>编辑成本</Button>
            <Popconfirm
              title="确认删除补充成本？"
              description="删除后将清空人工录入成本，并把成本口径切回自动计算。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true, loading: deletingManualCost }}
              onConfirm={() => { void handleDeleteManualCost(); }}
            >
              <Button danger loading={deletingManualCost}>删除成本</Button>
            </Popconfirm>
          </>
        ) : (
          <Button onClick={() => setManualCostModalOpen(true)}>补充成本</Button>
        )
      ) : null}
      {canViewRealtimeCostDownload ? (
        <Button onClick={() => realtimeCostDownload?.()} disabled={!realtimeCostDownload}>
          下载数据
        </Button>
      ) : null}
    </Space>
  );

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
                    renderModal={false}
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
          <ProjectDetailWorkspaceComparison
            projectId={projectId}
            projectName={project.name ?? ""}
            project={project}
            startDate={project.startDate}
            endDate={project.endDate}
            costSourceMode={project.costSourceMode}
            manualCost={project.manualCost}
            latestCostEstimation={project.latestCostEstimation}
            onCostEstimationSaved={handleCostEstimationSaved}
            latestInitiation={project.latestInitiation}
            onInitiationSaved={handleInitiationSaved}
            financialStructureRefreshKey={financialStructureRefreshKey}
            onFinancialStructureSaved={handleFinancialStructureSaved}
            workdayAdjustments={workdayAdjustments}
            costTrackingActions={realtimeCostActions}
            onCostDownloadReady={handleRealtimeCostDownloadReady}
            members={project.members ?? []}
            vendors={project.vendors ?? []}
            milestones={project.milestones ?? []}
            briefs={project.briefs ?? []}
            actualWorkEntries={project.actualWorkEntries ?? []}
            briefProgressContent={briefProgressContent}
            onCreateBrief={openCreateBrief}
            employees={employees}
            canManageProject={canManageProject}
            canManageReimbursements={canManageReimbursements}
            canCollectReceivable={canCollectReceivable}
            onMembersChanged={fetchProject}
            onOpenActualWorkCreate={() => setActiveModal({ type: "actual-work", editing: null })}
            canManageActualWorkEntry={(entry) =>
              canManageAnyActualWorkEntry ||
              (Boolean(currentUser?.id) && entry.employee?.id === currentUser?.id)
            }
            onEditActualWork={(entry) => {
              if (!canManageAnyActualWorkEntry && entry.employee?.id !== currentUser?.id) return;
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
            onDeleteActualWork={async (entry) => {
              if (!canManageAnyActualWorkEntry && entry.employee?.id !== currentUser?.id) return;
              try {
                const response = await fetch(`/api/projects/${projectId}/actual-work-entries/${entry.id}`, { method: "DELETE" });
                if (!response.ok) throw new Error("删除失败");
                messageApi.success("工时记录已删除");
                await fetchProject();
              } catch {
                messageApi.error("删除工时记录失败，请重试");
              }
            }}
          />
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

      <ProjectActualWorkAction
        projectId={projectId}
        visible={false}
        actualWorkView={actualWorkView}
        onActualWorkViewChange={setActualWorkView}
        project={project}
        employees={employees}
        open={activeModal.type === "actual-work"}
        editing={activeModal.type === "actual-work" ? activeModal.editing : null}
        onOpenCreate={() => setActiveModal({ type: "actual-work", editing: null })}
        onCancel={() => setActiveModal({ type: null })}
        onSaved={fetchProject}
      />

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
