"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Modal,
  Select,
  Segmented,
} from "antd";
import { useParams } from "next/navigation";
import DetailPageContainer from "@/components/DetailPageContainer";
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
import VendorsTable from "@/components/VendorsTable";
import ProjectDetailProgressContent from "@/components/project-detail/ProjectDetailProgressContent";
import ProjectActualWorkRecordsContent from "@/components/project-detail/ProjectActualWorkRecordsContent";
import ProjectDocumentsContent from "@/components/project-detail/ProjectDocumentsContent";
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
import { type ProjectProgressSegmentRow } from "@/components/project-detail/ProjectProgressNestedTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useCrmPermission } from "@/hooks/useCrmPermission";
import { useClientsStore } from "@/stores/clientsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useVendorsStore } from "@/stores/vendorsStore";
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
  const [projectDetailTab, setProjectDetailTab] = useState<
    "milestones" | "progress" | "work" | "documents"
  >("milestones");
  const [memberTab, setMemberTab] = useState<"members" | "vendors">("members");
  const [projectVendorsPage, setProjectVendorsPage] = useState(1);
  const [projectVendorsPageSize, setProjectVendorsPageSize] = useState(10);
  const [selectedVendorIdToAssociate, setSelectedVendorIdToAssociate] = useState<
    string | undefined
  >(undefined);
  const [actualWorkView, setActualWorkView] = useState<"records" | "analysis">(
    "records",
  );
  const [workEntriesRefreshKey, setWorkEntriesRefreshKey] = useState(0);
  const analysisDetailTarget =
    activeModal.type === "analysis-detail" ? activeModal.target : null;
  const { canManageProject } = useProjectPermission();
  const { canManageCrm } = useCrmPermission();
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
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const vendors = useVendorsStore((state) => state.vendors);
  const vendorsLoading = useVendorsStore((state) => state.loading);
  const vendorsLoaded = useVendorsStore((state) => state.loaded);
  const fetchVendorsFromStore = useVendorsStore((state) => state.fetchVendors);
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
    if (memberTab !== "vendors") return;
    if (vendorsLoaded) return;
    void fetchVendorsFromStore();
  }, [fetchVendorsFromStore, memberTab, vendorsLoaded]);

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
  const projectVendors = useMemo(
    () => (project?.vendors ?? []).map((item) => ({ id: item.id, name: item.name })),
    [project?.vendors],
  );
  const associateVendorOptions = useMemo(() => {
    const associatedVendorIds = new Set((project?.vendors ?? []).map((item) => item.id));
    return vendors
      .filter((vendor) => !associatedVendorIds.has(vendor.id))
      .map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
      }));
  }, [project?.vendors, vendors]);
  const handleAssociateVendorToProject = useCallback(
    async (vendorId: string) => {
      if (!canManageCrm) return;
      const res = await fetch(`/api/projects/${projectId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (!res.ok) return;
      setSelectedVendorIdToAssociate(undefined);
      await fetchProject();
    },
    [canManageCrm, fetchProject, projectId],
  );
  const handleRemoveVendorFromProject = useCallback(
    async (vendorId: string) => {
      if (!canManageCrm) return;
      const res = await fetch(`/api/projects/${projectId}/vendors/${vendorId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await fetchProject();
    },
    [canManageCrm, fetchProject, projectId],
  );

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
    setActiveModal({
      type: "planned-work",
      editing: null,
      defaultTaskId,
    });
  };

  const openEditPlannedWorkModal = (record: PlannedWorkRow) => {
    setActiveModal({
      type: "planned-work",
      editing: record,
    });
  };

  if (!project) {
    return (
      <DetailPageContainer>
        <Card loading={loading}>
          {loading ? null : "项目不存在"}
        </Card>
      </DetailPageContainer>
    );
  }

  const handleCreatePlannedWorkEntry = async (
    payload: PlannedWorkEntryFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/planned-work-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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

      <Card
        title={
          <Segmented
            value={memberTab}
            onChange={(value) => setMemberTab(value as "members" | "vendors")}
            options={[
              {
                label: `人员信息（${project.members?.length ?? 0}）`,
                value: "members",
              },
              {
                label: `合作供应商（${project.vendors?.length ?? 0}）`,
                value: "vendors",
              },
            ]}
          />
        }
        extra={
          memberTab === "vendors" ? (
            <Select
              style={{ width: 220 }}
              placeholder="新增合作供应商"
              showSearch
              allowClear
              value={selectedVendorIdToAssociate}
              loading={vendorsLoading}
              options={associateVendorOptions}
              disabled={!canManageCrm}
              onOpenChange={(open) => {
                if (!open || vendorsLoaded) return;
                void fetchVendorsFromStore();
              }}
              onChange={(value) => {
                const nextValue = typeof value === "string" ? value : undefined;
                setSelectedVendorIdToAssociate(nextValue);
                if (!nextValue) return;
                void handleAssociateVendorToProject(nextValue);
              }}
            />
          ) : null
        }
      >
        {memberTab === "members" ? (
          <ProjectDetailMembersContent
            projectId={projectId}
            members={project.members ?? []}
            employees={employees}
            addingFunction={addingFunction}
            onSetAddingFunction={setAddingFunction}
            onMembersChanged={fetchProject}
          />
        ) : (
          <VendorsTable
            vendors={projectVendors}
            loading={loading}
            current={projectVendorsPage}
            pageSize={projectVendorsPageSize}
            onPageChange={(nextPage, nextPageSize) => {
              setProjectVendorsPage(nextPage);
              setProjectVendorsPageSize(nextPageSize);
            }}
            onDelete={handleRemoveVendorFromProject}
            actionsDisabled={!canManageCrm}
            actionDeleteText="移除"
            actionDeleteTitle="确定移除该供应商与当前项目的关联吗？"
            headerTitle={null}
            showColumnSetting={false}
            toolbarActions={[]}
            columnKeys={["name", "actions"]}
            cardBodyStyle={{ padding: 0 }}
          />
        )}
      </Card>

      <Card
        title={
          <Segmented
            value={projectDetailTab}
            onChange={(value) =>
              setProjectDetailTab(
                value as "milestones" | "progress" | "work" | "documents",
              )
            }
            options={[
              {
                label: `项目里程碑（${milestoneCount}）`,
                value: "milestones",
              },
              {
                label: `项目进度（环节${segmentRows.length}/任务${taskCount}）`,
                value: "progress",
              },
              {
                label: `实际工时（${project.actualWorkEntries?.length ?? 0}）`,
                value: "work",
              },
              {
                label: `项目资料（${projectDocumentRows.length}）`,
                value: "documents",
              },
            ]}
          />
        }
        styles={{ body: { paddingTop: 12 } }}
        extra={
          <>
            <ProjectMilestoneAction
              projectId={projectId}
              visible={projectDetailTab === "milestones"}
              canManageProject={canManageProject}
              project={project}
              employees={employees}
              clientContacts={clientContacts}
              open={activeModal.type === "milestone"}
              editing={
                activeModal.type === "milestone" ? activeModal.editing : null
              }
              onOpenCreate={() => {
                setActiveModal({ type: "milestone", editing: null });
              }}
              onCancel={() => {
                setActiveModal({ type: null });
              }}
              onSaved={fetchProject}
            />
            <ProjectSegmentAction
              projectId={projectId}
              visible={projectDetailTab === "progress"}
              canManageProject={canManageProject}
              open={activeModal.type === "segment"}
              editing={
                activeModal.type === "segment" ? activeModal.editing : null
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
            <ProjectActualWorkAction
              projectId={projectId}
              visible={projectDetailTab === "work"}
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
                setActiveModal({ type: "actual-work", editing: null });
              }}
              onCancel={() => {
                setActiveModal({ type: null });
              }}
              onSaved={fetchProject}
            />
            <ProjectDocumentAction
              projectId={projectId}
              visible={projectDetailTab === "documents"}
              open={activeModal.type === "document"}
              editing={
                activeModal.type === "document" ? activeModal.editing : null
              }
              onOpenCreate={() => {
                setActiveModal({ type: "document", editing: null });
              }}
              onCancel={() => {
                setActiveModal({ type: null });
              }}
              onSaved={fetchProject}
            />
          </>
        }
      >
        {projectDetailTab === "milestones" && (
          <ProjectDetailMilestonesContent
            milestones={project.milestones ?? []}
          />
        )}
        {projectDetailTab === "progress" && (
          <ProjectDetailProgressContent
            projectId={projectId}
            data={progressRows}
            segmentCount={segmentRows.length}
            taskCount={taskCount}
            actionsDisabled={!canManageProject}
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
                    ? { id: segment.ownerId, name: segment.ownerName }
                    : null,
                },
              });
            }}
            onAddPlannedWork={(task) => openCreatePlannedWorkModal(task.id)}
            onEditTask={(task) => {
              if (!canManageProject) return;
              setActiveModal({
                type: "task",
                editing: {
                  id: task.id,
                  name: task.name,
                  status: task.status ?? null,
                  dueDate: task.dueDate ?? null,
                  segmentId: task.segmentId,
                  segmentName: task.segmentName,
                  owner: task.ownerId
                    ? { id: task.ownerId, name: task.ownerName }
                    : null,
                },
              });
            }}
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
        )}
        {projectDetailTab === "work" &&
          (actualWorkView === "records" ? (
            <ProjectActualWorkRecordsContent
              projectId={projectId}
              employeeFilterOptions={actualWorkEmployeeFilterOptions}
              refreshKey={workEntriesRefreshKey}
              requestData={async ({ current, pageSize, filters }) => {
                const normalizedTitle = filters.title?.trim() ?? "";
                const normalizedEmployee = filters.employeeName?.trim() ?? "";
                const normalizedDate = filters.startDate?.trim() ?? "";
                const normalizedDateFrom = filters.startDateFrom?.trim() ?? "";
                const normalizedDateTo = filters.startDateTo?.trim() ?? "";

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
                    !(row.employee?.name ?? "").includes(normalizedEmployee)
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
              onEdit={(row) => {
                setActiveModal({
                  type: "actual-work",
                  editing: {
                    id: row.id,
                    title: row.title,
                    employeeId: row.employee?.id ?? "",
                    startDate: row.startDate,
                    endDate: row.endDate,
                  },
                });
              }}
              onAfterDelete={fetchProject}
            />
          ) : (
            <ActualWorkAnalysisTable
              entries={project.actualWorkEntries ?? []}
              members={project.members ?? []}
              onViewDetail={(target) =>
                setActiveModal({ type: "analysis-detail", target })
              }
            />
          ))}
        {projectDetailTab === "documents" && (
          <ProjectDocumentsContent
            projectId={projectId}
            rows={projectDocumentRows}
            onEdit={(record) => {
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
        )}
      </Card>

      <ProjectTaskModal
        projectId={projectId}
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
              if (normalizedTitle && !(row.title ?? "").includes(normalizedTitle)) {
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
