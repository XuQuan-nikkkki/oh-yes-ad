"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Space,
  Descriptions,
  Button,
  Tag,
  Modal,
  Select,
  Empty,
  Segmented,
  Table,
  Checkbox,
  Popover,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import ProjectFormModal from "@/components/ProjectFormModal";
import AppLink from "@/components/AppLink";
import dayjs from "dayjs";
import TableActions from "@/components/TableActions";
import ProjectMilestonesTable, {
  ProjectMilestoneRow,
} from "@/components/project-detail/ProjectMilestonesTable";
import { ProjectSegmentRow } from "@/components/project-detail/ProjectSegmentsTable";
import ProjectTasksTable, {
  ProjectTaskRow,
} from "@/components/project-detail/ProjectTasksTable";
import ProjectMilestoneForm, {
  ProjectMilestoneFormPayload,
} from "@/components/project-detail/ProjectMilestoneForm";
import ProjectSegmentForm, {
  ProjectSegmentFormPayload,
} from "@/components/project-detail/ProjectSegmentForm";
import ProjectTaskForm, {
  ProjectTaskFormPayload,
} from "@/components/project-detail/ProjectTaskForm";
import ProjectDocumentForm, {
  ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";

type PeriodInfo = {
  period: string;
  naturalDays: number;
  workdays: number;
  display: string;
};

type WorkdayAdjustment = {
  id: string;
  name?: string | null;
  changeType: string;
  startDate: string;
  endDate: string;
};

type Project = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  stage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  vendors?: {
    id: string;
    name: string;
  }[];
  members?: {
    id: string;
    name: string;
    function?: string | null;
    employmentStatus?: string | null;
  }[];
  milestones?: {
    id: string;
    name: string;
    type?: string | null;
    date?: string | null;
    location?: string | null;
    method?: string | null;
    internalParticipants?: {
      id: string;
      name: string;
    }[];
    clientParticipants?: {
      id: string;
      name: string;
    }[];
    vendorParticipants?: {
      id: string;
      name: string;
    }[];
  }[];
  segments?: {
    id: string;
    name: string;
    status?: string | null;
    dueDate?: string | null;
    owner?: {
      id: string;
      name: string;
    } | null;
    projectTasks?: {
      id: string;
      name: string;
      status?: string | null;
      segmentId: string;
      owner?: {
        id: string;
        name: string;
      } | null;
      dueDate?: string | null;
      plannedWorkEntries?: {
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
      }[];
    }[];
  }[];
  actualWorkEntries?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    employee?: { id: string; name: string };
  }[];
  documents?: {
    id: string;
    name: string;
    type?: string | null;
    date?: string | null;
    isFinal: boolean;
    internalLink?: string | null;
  }[];
  periodInfo?: PeriodInfo;
};

type Client = {
  id: string;
  name: string;
};

type ClientContact = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string;
  function?: string | null;
};

type PlannedWorkRow = {
  id: string;
  taskId: string;
  taskDisplayName?: string;
  taskOwnerName?: string;
  year?: number;
  weekNumber?: number;
  plannedDays?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
};

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [addingFunction, setAddingFunction] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"milestone" | "segment">(
    "milestone",
  );
  const [workView, setWorkView] = useState<"planned" | "actual">("planned");
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDefaultSegmentId, setTaskDefaultSegmentId] = useState<
    string | undefined
  >(undefined);
  const [editingMilestone, setEditingMilestone] =
    useState<ProjectMilestoneRow | null>(null);
  const [editingSegment, setEditingSegment] =
    useState<ProjectSegmentRow | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTaskRow | null>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<
    | {
        id: string;
        name: string;
        type?: string | null;
        date?: string | null;
        isFinal: boolean;
        internalLink?: string | null;
      }
    | null
  >(null);
  const [actualWorkModalOpen, setActualWorkModalOpen] = useState(false);
  const [editingActualWorkEntry, setEditingActualWorkEntry] = useState<
    | {
        id: string;
        title: string;
        employeeId: string;
        startDate: string;
        endDate: string;
      }
    | null
  >(null);
  const [plannedWorkModalOpen, setPlannedWorkModalOpen] = useState(false);
  const [editingPlannedWorkEntry, setEditingPlannedWorkEntry] =
    useState<PlannedWorkRow | null>(null);
  const [plannedWorkDefaultTaskId, setPlannedWorkDefaultTaskId] = useState<
    string | undefined
  >(undefined);

  const projectTypeMap: Record<string, string> = {
    CLIENT: "客户项目",
    INTERNAL: "内部项目",
  };

  // 计算时间段内的工作日数
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

      // 查找是否有针对此日期的调整
      const adjustment = adjustments.find((adj) => {
        const adjStart = new Date(adj.startDate).toISOString().split("T")[0];
        const adjEnd = new Date(adj.endDate).toISOString().split("T")[0];
        return dateStr >= adjStart && dateStr <= adjEnd;
      });

      // 根据调整信息判断是否为工作日
      if (adjustment) {
        if (adjustment.changeType === "上班") {
          workdays++;
        }
        // 如果是"休假"或"调休"，不计入工作日
      } else {
        // 没有调整信息时，默认周一到周五为工作日
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workdays++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return workdays;
  };

  // 计算项目周期
  const calculatePeriodInfo = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    adjustments: WorkdayAdjustment[],
  ): PeriodInfo | undefined => {
    if (!startDate) return undefined;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const today = new Date();

    // 计算到目前为止的周期
    const effectiveEnd = endDate ? new Date(endDate) : today;
    const naturalDays =
      Math.floor(
        (effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const workdays = calculateWorkdays(start, effectiveEnd, adjustments);

    // 生成显示字符串
    const startStr = dayjs(start).format("YYYY/MM/DD");
    const endStr = endDate ? dayjs(end).format("YYYY/MM/DD") : "至今";
    const period = `${startStr} - ${endStr}`;

    // 添加自然日和工作日信息
    const display = `${period} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;

    return {
      period,
      naturalDays,
      workdays,
      display,
    };
  };

  const fetchProject = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data);
    if (data?.client?.id) {
      try {
        const contactsRes = await fetch(`/api/clients/${data.client.id}/contacts`);
        const contactsData = await contactsRes.json();
        setClientContacts(contactsData);
      } catch (error) {
        console.error("Failed to fetch client contacts:", error);
        setClientContacts([]);
      }
    } else {
      setClientContacts([]);
    }
    setLoading(false);
  }, [projectId]);

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch {
      console.log("Employees API not available yet");
    }
  };

  const fetchWorkdayAdjustments = async () => {
    try {
      const res = await fetch("/api/workday-adjustments");
      const data = await res.json();
      setWorkdayAdjustments(data);
    } catch (error) {
      console.error("Failed to fetch workday adjustments:", error);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await Promise.all([
        fetchProject(),
        fetchClients(),
        fetchEmployees(),
        fetchWorkdayAdjustments(),
      ]);
    })();
  }, [projectId, fetchProject]);

  const isInternalProject = project?.type === "INTERNAL";

  // 按职能分组成员
  const groupedMembers = useCallback(() => {
    if (!project?.members) return {};

    const groups: Record<string, typeof project.members> = {};
    const order = ["项目组", "设计组"];

    project.members.forEach((member) => {
      const func = member.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(member);
    });

    // 按顺序排列
    const sorted: Record<string, typeof project.members> = {};
    order.forEach((key) => {
      if (groups[key]) {
        sorted[key] = groups[key];
      }
    });

    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        sorted[key] = groups[key];
      }
    });

    return sorted;
  }, [project]);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Modal.confirm({
      title: "确认移除",
      content: `是否将 ${memberName} 从项目成员中移除？`,
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          await fetch(`/api/projects/${projectId}/members/${memberId}`, {
            method: "DELETE",
          });
          await fetchProject();
        } catch (error) {
          console.error("Failed to remove member:", error);
        }
      },
    });
  };

  const handleAddMember = async (employeeId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeId),
      });
      await fetchProject();
      setAddingFunction(null);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  // 获取所有可用的在职员工（不区分职能）
  const getAllAvailableEmployees = () => {
    const currentMemberIds = new Set(project?.members?.map((m) => m.id) || []);
    return employees.filter(
      (e) => e.employmentStatus === "在职" && !currentMemberIds.has(e.id),
    );
  };

  // 生成按职能分组的 Select options
  const getGroupedEmployeeOptions = () => {
    const available = getAllAvailableEmployees();
    const groups: Record<string, typeof available> = {};
    const order = ["项目组", "设计组"];

    available.forEach((employee) => {
      const func = employee.function || "其他";
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(employee);
    });

    const result: {
      label: string;
      options: { label: string; value: string }[];
    }[] = [];

    // 按顺序添加
    order.forEach((key) => {
      if (groups[key]) {
        result.push({
          label: key,
          options: groups[key].map((e) => ({
            label: e.name,
            value: e.id,
          })),
        });
      }
    });

    // 添加其他职能
    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        result.push({
          label: key,
          options: groups[key].map((e) => ({
            label: e.name,
            value: e.id,
          })),
        });
      }
    });

    return result;
  };

  const milestoneRows: ProjectMilestoneRow[] = project?.milestones ?? [];
  const segmentRows: ProjectSegmentRow[] = project?.segments ?? [];
  const plannedWorkRows: PlannedWorkRow[] =
    project?.segments?.flatMap((segment) =>
      (segment.projectTasks ?? []).flatMap((task) =>
        (task.plannedWorkEntries ?? []).map((entry) => ({
          id: entry.id,
          taskId: task.id,
          taskDisplayName: task.name,
          taskOwnerName: task.owner?.name ?? "-",
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
        })),
      ),
    ) ?? [];

  const openCreateScheduleModal = () => {
    if (scheduleView === "milestone") {
      setEditingMilestone(null);
      setMilestoneModalOpen(true);
      return;
    }
    setEditingSegment(null);
    setSegmentModalOpen(true);
  };

  const openTaskModalForSegment = (segment: { id: string; name: string }) => {
    setEditingTask(null);
    setTaskDefaultSegmentId(segment.id);
    setTaskModalOpen(true);
  };

  const handleCreateMilestone = async (payload: ProjectMilestoneFormPayload) => {
    await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMilestoneModalOpen(false);
    await fetchProject();
  };

  const handleUpdateMilestone = async (
    milestoneId: string,
    payload: ProjectMilestoneFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMilestoneModalOpen(false);
    setEditingMilestone(null);
    await fetchProject();
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const handleCreateSegment = async (payload: ProjectSegmentFormPayload) => {
    await fetch(`/api/projects/${projectId}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSegmentModalOpen(false);
    await fetchProject();
  };

  const handleUpdateSegment = async (
    segmentId: string,
    payload: ProjectSegmentFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSegmentModalOpen(false);
    setEditingSegment(null);
    await fetchProject();
  };

  const handleDeleteSegment = async (segmentId: string) => {
    await fetch(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const handleCreateTask = async (payload: ProjectTaskFormPayload) => {
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTaskModalOpen(false);
    setTaskDefaultSegmentId(undefined);
    await fetchProject();
  };

  const handleUpdateTask = async (
    taskId: string,
    payload: ProjectTaskFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setTaskModalOpen(false);
    setEditingTask(null);
    setTaskDefaultSegmentId(undefined);
    await fetchProject();
  };

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const handleCreateDocument = async (payload: ProjectDocumentFormPayload) => {
    await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setDocumentModalOpen(false);
    await fetchProject();
  };

  const handleUpdateDocument = async (
    documentId: string,
    payload: ProjectDocumentFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setDocumentModalOpen(false);
    setEditingDocument(null);
    await fetchProject();
  };

  const handleDeleteDocument = async (documentId: string) => {
    await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const handleCreateActualWorkEntry = async (
    payload: ActualWorkEntryFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/actual-work-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActualWorkModalOpen(false);
    await fetchProject();
  };

  const handleUpdateActualWorkEntry = async (
    entryId: string,
    payload: ActualWorkEntryFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/actual-work-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActualWorkModalOpen(false);
    setEditingActualWorkEntry(null);
    await fetchProject();
  };

  const handleDeleteActualWorkEntry = async (entryId: string) => {
    await fetch(`/api/projects/${projectId}/actual-work-entries/${entryId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const openCreatePlannedWorkModal = (taskId?: string) => {
    setEditingPlannedWorkEntry(null);
    setPlannedWorkDefaultTaskId(taskId);
    setPlannedWorkModalOpen(true);
  };

  const openEditPlannedWorkModal = (record: PlannedWorkRow) => {
    setEditingPlannedWorkEntry(record);
    setPlannedWorkDefaultTaskId(undefined);
    setPlannedWorkModalOpen(true);
  };

  const handleCreatePlannedWorkEntry = async (
    payload: PlannedWorkEntryFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/planned-work-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPlannedWorkModalOpen(false);
    setPlannedWorkDefaultTaskId(undefined);
    await fetchProject();
  };

  const handleUpdatePlannedWorkEntry = async (
    entryId: string,
    payload: PlannedWorkEntryFormPayload,
  ) => {
    await fetch(`/api/projects/${projectId}/planned-work-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPlannedWorkModalOpen(false);
    setEditingPlannedWorkEntry(null);
    setPlannedWorkDefaultTaskId(undefined);
    await fetchProject();
  };

  const handleDeletePlannedWorkEntry = async (entryId: string) => {
    await fetch(`/api/projects/${projectId}/planned-work-entries/${entryId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const formatActualWorkRange = (start: string, end: string) => {
    const startTime = dayjs(start);
    const endTime = dayjs(end);
    if (startTime.isSame(endTime, "day")) {
      return `${startTime.format("YYYY-MM-DD HH:mm")}-${endTime.format("HH:mm")}`;
    }
    return `${startTime.format("YYYY-MM-DD HH:mm")}-${endTime.format("MM-DD HH:mm")}`;
  };

  const getActualEntryHours = (start: string, end: string) => {
    const startTime = dayjs(start);
    const endTime = dayjs(end);
    const diffHours = endTime.diff(startTime, "minute") / 60;
    return Math.max(diffHours, 0);
  };

  const actualWorkDayHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    (project?.actualWorkEntries ?? []).forEach((entry) => {
      const employeeId = entry.employee?.id;
      if (!employeeId) return;
      const dayKey = dayjs(entry.startDate).format("YYYY-MM-DD");
      const key = `${employeeId}__${dayKey}`;
      const hours = getActualEntryHours(entry.startDate, entry.endDate);
      map.set(key, (map.get(key) ?? 0) + hours);
    });
    return map;
  }, [project?.actualWorkEntries]);

  const calcActualWorkValue = (entry: {
    startDate: string;
    endDate: string;
    employee?: { id: string };
  }) => {
    const hours = getActualEntryHours(entry.startDate, entry.endDate);
    if (hours === 0) return 0;

    const employeeId = entry.employee?.id;
    if (!employeeId) {
      return Math.round((hours / 7.5) * 10) / 10;
    }

    const dayKey = dayjs(entry.startDate).format("YYYY-MM-DD");
    const totalHours = actualWorkDayHoursMap.get(`${employeeId}__${dayKey}`) ?? 0;
    if (totalHours > 7.5) {
      return Math.round((hours / totalHours) * 100) / 100;
    }
    return Math.round((hours / 7.5) * 10) / 10;
  };

  const formatNumber = (value: number) => Number(value.toFixed(2)).toString();

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      <Card
        title="项目信息"
        loading={loading}
        extra={
          <Button icon={<EditOutlined />} onClick={() => setOpen(true)}>
            编辑
          </Button>
        }
      >
        {project && (
          <>
            {/* 基础信息 */}
            <Descriptions
              title={
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  基础信息
                </span>
              }
              column={3}
              size="small"
              style={{ marginBottom: "24px" }}
            >
              <Descriptions.Item label="项目名称">
                {project.name}
              </Descriptions.Item>
              <Descriptions.Item label="项目类型">
                {projectTypeMap[project.type] || project.type}
              </Descriptions.Item>
              {!isInternalProject && project.client && (
                <Descriptions.Item label="所属客户">
                  <AppLink href={`/clients/${project.client.id}`}>
                    {project.client.name}
                  </AppLink>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 项目进度 */}
            {!isInternalProject && (
              <Descriptions
                title={
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    项目进度
                  </span>
                }
                column={3}
                size="small"
                style={{ marginBottom: "24px" }}
              >
                {project.status && (
                  <Descriptions.Item label="项目状态">
                    {project.status}
                  </Descriptions.Item>
                )}
                {project.stage && (
                  <Descriptions.Item label="项目阶段">
                    {project.stage}
                  </Descriptions.Item>
                )}
                {project.startDate && (
                  <Descriptions.Item label="开始时间">
                    {dayjs(project.startDate).format("YYYY-MM-DD")}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="结束时间">
                  {project.endDate
                    ? dayjs(project.endDate).format("YYYY-MM-DD")
                    : "-"}
                </Descriptions.Item>
                {project.startDate && (
                  <Descriptions.Item label="项目周期">
                    {
                      calculatePeriodInfo(
                        project.startDate,
                        project.endDate,
                        workdayAdjustments,
                      )?.display
                    }
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}

            {/* 项目负责人 */}
            <Descriptions
              title={
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  项目负责人
                </span>
              }
              column={3}
              size="small"
            >
              <Descriptions.Item label="负责人">
                {project.owner?.name ?? "-"}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      {/* 人员信息 - 按职能分组 */}
      <Card title="人员信息">
        {project?.members && project.members.length > 0 ? (
          <Space orientation="vertical" style={{ width: "100%" }} size="large">
            {Object.entries(groupedMembers()).map(([func, members]) => (
              <div key={func}>
                <Space size={[8, 8]} wrap align="center">
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      minWidth: "60px",
                    }}
                  >
                    <strong>{func}：</strong>
                  </span>
                  {members.map((member) => (
                    <Tag
                      key={member.id}
                      style={{ marginRight: 0 }}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveMember(member.id, member.name);
                      }}
                    >
                      {member.name}
                      {member.employmentStatus === "离职" && " (离职)"}
                    </Tag>
                  ))}
                </Space>
              </div>
            ))}
            {/* 添加成员 - 全局显示 */}
            <div style={{ paddingTop: "8px", borderTop: "1px solid #f0f0f0" }}>
              <Space size={[8, 8]} wrap align="center">
                {addingFunction === "global" ? (
                  <Select
                    placeholder="选择成员"
                    style={{ width: 200 }}
                    options={getGroupedEmployeeOptions()}
                    onSelect={(value) => {
                      handleAddMember(value);
                    }}
                    onBlur={() => setAddingFunction(null)}
                    autoFocus
                    open
                  />
                ) : (
                  <Tag
                    onClick={() => setAddingFunction("global")}
                    style={{ cursor: "pointer", marginRight: 0 }}
                  >
                    + 添加成员
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Empty description="暂无团队成员" />
            {/* 添加首个成员 */}
            <div>
              <Space size={[8, 8]} wrap align="center">
                {addingFunction === "global" ? (
                  <Select
                    placeholder="选择成员"
                    style={{ width: 200 }}
                    options={getGroupedEmployeeOptions()}
                    onSelect={(value) => {
                      handleAddMember(value);
                    }}
                    onBlur={() => setAddingFunction(null)}
                    autoFocus
                    open
                  />
                ) : (
                  <Tag
                    onClick={() => setAddingFunction("global")}
                    style={{ cursor: "pointer", marginRight: 0 }}
                  >
                    + 添加成员
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        )}
      </Card>

      {/* 项目安排 */}
      <Card
        title={
          <Segmented
            value={scheduleView}
            onChange={(value) =>
              setScheduleView(value as "milestone" | "segment")
            }
            options={[
              { label: "项目里程碑", value: "milestone" },
              { label: "项目环节/任务", value: "segment" },
            ]}
          />
        }
        extra={
          <Button type="primary" onClick={openCreateScheduleModal}>
            {scheduleView === "milestone"
              ? "新增里程碑"
              : "新增环节"}
          </Button>
        }
      >
        {scheduleView === "milestone" && (
          <ProjectMilestonesTable
            data={milestoneRows}
            onEdit={(record) => {
              setEditingMilestone(record);
              setMilestoneModalOpen(true);
            }}
            onDelete={async (record) => {
              await handleDeleteMilestone(record.id);
            }}
          />
        )}
        {scheduleView === "segment" && (
          <ProjectTasksTable
            data={project?.segments ?? []}
            onAddTask={(segment) => openTaskModalForSegment(segment)}
            onEditSegment={(segment) => {
              setEditingSegment(segment);
              setSegmentModalOpen(true);
            }}
            onDeleteSegment={async (segment) => {
              await handleDeleteSegment(segment.id);
            }}
            onEdit={(record) => {
              setEditingTask(record);
              setTaskDefaultSegmentId(undefined);
              setTaskModalOpen(true);
            }}
            onDelete={async (record) => {
              await handleDeleteTask(record.id);
            }}
          />
        )}
      </Card>

      {/* 项目工时 */}
      <Card
        title={
          <Segmented
            value={workView}
            onChange={(value) => setWorkView(value as "planned" | "actual")}
            options={[
              { label: "实际工时", value: "actual" },
              { label: "计划工时", value: "planned" },
            ]}
          />
        }
        extra={
          workView === "planned" ? (
            <Button type="primary" onClick={() => openCreatePlannedWorkModal()}>
              新增计划工时
            </Button>
          ) : workView === "actual" ? (
            <Button
              type="primary"
              onClick={() => {
                setEditingActualWorkEntry(null);
                setActualWorkModalOpen(true);
              }}
            >
              新增实际工时
            </Button>
          ) : null
        }
      >
        {workView === "planned" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "任务",
                dataIndex: "taskDisplayName",
                width: 280,
                render: (value: string | undefined) => value ?? "-",
              },
              {
                title: "任务责任人",
                dataIndex: "taskOwnerName",
                width: 140,
                render: (value: string | undefined) => value ?? "-",
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>年份</span>,
                dataIndex: "year",
                width: 110,
                sorter: (a, b) => (a.year ?? 0) - (b.year ?? 0),
                render: (value: number | undefined) => value ?? "-",
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周数</span>,
                dataIndex: "weekNumber",
                width: 110,
                sorter: (a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0),
                render: (value: number | undefined) => value ?? "-",
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>计划天数</span>,
                dataIndex: "plannedDays",
                width: 130,
                sorter: (a, b) => (a.plannedDays ?? 0) - (b.plannedDays ?? 0),
                render: (value: number | undefined) => value ?? "-",
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周一</span>,
                dataIndex: "monday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周二</span>,
                dataIndex: "tuesday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周三</span>,
                dataIndex: "wednesday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周四</span>,
                dataIndex: "thursday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周五</span>,
                dataIndex: "friday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周六</span>,
                dataIndex: "saturday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: "nowrap" }}>周天</span>,
                dataIndex: "sunday",
                width: 86,
                align: "center",
                render: (value: boolean | undefined) => (
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                ),
              },
              {
                title: "操作",
                width: 220,
                render: (_value, record: PlannedWorkRow) => (
                  <TableActions
                    onEdit={() => openEditPlannedWorkModal(record)}
                    onDelete={() => handleDeletePlannedWorkEntry(record.id)}
                    deleteTitle={`确定删除该条计划工时？`}
                  />
                ),
              },
            ]}
            dataSource={plannedWorkRows}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无计划工时" }}
            scroll={{ x: "max-content" }}
          />
        )}
        {workView === "actual" && (
          <Table
            rowKey="id"
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                width: "30%",
                sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
              },
              {
                title: "人员",
                dataIndex: ["employee", "name"],
                width: 160,
                sorter: (a, b) =>
                  (a.employee?.name || "").localeCompare(
                    b.employee?.name || "",
                  ),
              },
              {
                title: "时间",
                width: 280,
                sorter: (a, b) =>
                  (a.startDate || "").localeCompare(b.startDate || ""),
                render: (_value: unknown, record) =>
                  formatActualWorkRange(record.startDate, record.endDate),
              },
              {
                title: "工时",
                width: 100,
                render: (_value: unknown, record) => {
                  const entryHours = getActualEntryHours(
                    record.startDate,
                    record.endDate,
                  );
                  const employeeId = record.employee?.id;
                  const dayKey = dayjs(record.startDate).format("YYYY-MM-DD");
                  const totalHours = employeeId
                    ? (actualWorkDayHoursMap.get(`${employeeId}__${dayKey}`) ?? 0)
                    : entryHours;
                  const baseHours = totalHours > 7.5 ? totalHours : 7.5;
                  const workDays = Number(calcActualWorkValue(record).toFixed(2));
                  const text = `记录时长 ${formatNumber(entryHours)}h，当天总工时 ${formatNumber(baseHours)}h，折合 ${formatNumber(workDays)}d`;

                  return (
                    <Popover content={text}>
                      <span>{formatNumber(workDays)}d</span>
                    </Popover>
                  );
                },
              },
              {
                title: "操作",
                width: 180,
                render: (_value: unknown, record) => (
                  <TableActions
                    onEdit={() => {
                      setEditingActualWorkEntry({
                        id: record.id,
                        title: record.title,
                        employeeId: record.employee?.id ?? "",
                        startDate: record.startDate,
                        endDate: record.endDate,
                      });
                      setActualWorkModalOpen(true);
                    }}
                    onDelete={() => handleDeleteActualWorkEntry(record.id)}
                    deleteTitle={`确定删除实际工时「${record.title}」？`}
                  />
                ),
              },
            ]}
            dataSource={project?.actualWorkEntries ?? []}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "暂无实际工时" }}
            scroll={{ x: "max-content" }}
          />
        )}
      </Card>

      {/* 项目文档 */}
      <Card
        title="项目文档"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditingDocument(null);
              setDocumentModalOpen(true);
            }}
          >
            新增文档
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={[
            {
              title: "名称",
              dataIndex: "name",
              width: "25%",
              sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            },
            {
              title: "类型",
              dataIndex: "type",
              width: "15%",
              sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
            },
            {
              title: "日期",
              dataIndex: "date",
              width: 120,
              sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
              render: (value: string | null) =>
                value ? dayjs(value).format("YYYY-MM-DD") : "-",
            },
            {
              title: "最终版",
              dataIndex: "isFinal",
              width: 80,
              render: (value: boolean) => (
                <Checkbox
                  checked={value}
                  onChange={() => {}}
                  style={{ pointerEvents: "none" }}
                />
              ),
            },
            {
              title: "内部链接",
              dataIndex: "internalLink",
              ellipsis: true,
              render: (value: string | null) =>
                value ? (
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    {value}
                  </a>
                ) : (
                  "-"
                ),
            },
            {
              title: "操作",
              width: 180,
              render: (_value: unknown, record) => (
                <TableActions
                  onEdit={() => {
                    setEditingDocument({
                      id: record.id,
                      name: record.name,
                      type: record.type,
                      date: record.date,
                      isFinal: record.isFinal,
                      internalLink: record.internalLink,
                    });
                    setDocumentModalOpen(true);
                  }}
                  onDelete={() => handleDeleteDocument(record.id)}
                  deleteTitle={`确定删除文档「${record.name}」？`}
                />
              ),
            },
          ]}
          dataSource={project?.documents ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无项目文档" }}
          scroll={{ x: "max-content" }}
        />
      </Card>

      <Modal
        title={editingMilestone ? "编辑里程碑" : "新增里程碑"}
        open={milestoneModalOpen}
        onCancel={() => {
          setMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <ProjectMilestoneForm
          initialValues={editingMilestone}
          projectMembers={project?.members ?? []}
          allEmployees={employees}
          clientParticipants={project?.client?.id ? clientContacts : []}
          vendors={project?.vendors ?? []}
          onSubmit={async (payload) => {
            if (editingMilestone) {
              await handleUpdateMilestone(editingMilestone.id, payload);
              return;
            }
            await handleCreateMilestone(payload);
          }}
        />
      </Modal>

      <Modal
        title={editingSegment ? "编辑环节" : "新增环节"}
        open={segmentModalOpen}
        onCancel={() => {
          setSegmentModalOpen(false);
          setEditingSegment(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <ProjectSegmentForm
          initialValues={editingSegment}
          employees={employees}
          onSubmit={async (payload) => {
            if (editingSegment) {
              await handleUpdateSegment(editingSegment.id, payload);
              return;
            }
            await handleCreateSegment(payload);
          }}
        />
      </Modal>

      <Modal
        title={editingTask ? "编辑任务" : "新增任务"}
        open={taskModalOpen}
        onCancel={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
          setTaskDefaultSegmentId(undefined);
        }}
        footer={null}
        destroyOnHidden
      >
        <ProjectTaskForm
          segmentOptions={segmentRows.map((segment) => ({
            id: segment.id,
            name: segment.name,
          }))}
          defaultSegmentId={taskDefaultSegmentId}
          employees={employees}
          initialValues={editingTask}
          onSubmit={async (payload) => {
            if (editingTask) {
              await handleUpdateTask(editingTask.id, payload);
              return;
            }
            await handleCreateTask(payload);
          }}
        />
      </Modal>

      <Modal
        title={editingDocument ? "编辑文档" : "新增文档"}
        open={documentModalOpen}
        onCancel={() => {
          setDocumentModalOpen(false);
          setEditingDocument(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <ProjectDocumentForm
          initialValues={editingDocument}
          onSubmit={async (payload) => {
            if (editingDocument) {
              await handleUpdateDocument(editingDocument.id, payload);
              return;
            }
            await handleCreateDocument(payload);
          }}
        />
      </Modal>

      <Modal
        title={editingActualWorkEntry ? "编辑实际工时" : "新增实际工时"}
        open={actualWorkModalOpen}
        onCancel={() => {
          setActualWorkModalOpen(false);
          setEditingActualWorkEntry(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <ActualWorkEntryForm
          projectOptions={
            project
              ? [
                  {
                    id: project.id,
                    name: project.name,
                  },
                ]
              : []
          }
          selectedProjectId={project?.id}
          disableProjectSelect
          employees={employees}
          initialValues={editingActualWorkEntry}
          onSubmit={async (payload) => {
            if (editingActualWorkEntry) {
              await handleUpdateActualWorkEntry(editingActualWorkEntry.id, payload);
              return;
            }
            await handleCreateActualWorkEntry(payload);
          }}
        />
      </Modal>

      <Modal
        title={editingPlannedWorkEntry ? "编辑计划工时" : "新增计划工时"}
        open={plannedWorkModalOpen}
        onCancel={() => {
          setPlannedWorkModalOpen(false);
          setEditingPlannedWorkEntry(null);
          setPlannedWorkDefaultTaskId(undefined);
        }}
        footer={null}
        destroyOnHidden
      >
        <PlannedWorkEntryForm
          projectOptions={
            project
              ? [
                  {
                    id: project.id,
                    name: project.name,
                  },
                ]
              : []
          }
          selectedProjectId={project?.id}
          disableProjectSelect
          taskOptions={
            project?.segments?.flatMap((segment) =>
              (segment.projectTasks ?? []).map((task) => ({
                id: task.id,
                projectId: project.id,
                name: task.name,
              })),
            ) ?? []
          }
          initialValues={
            editingPlannedWorkEntry
              ? {
                  id: editingPlannedWorkEntry.id,
                  taskId: editingPlannedWorkEntry.taskId,
                  year: editingPlannedWorkEntry.year ?? new Date().getFullYear(),
                  weekNumber: editingPlannedWorkEntry.weekNumber ?? 1,
                  plannedDays: editingPlannedWorkEntry.plannedDays ?? 0,
                  monday: Boolean(editingPlannedWorkEntry.monday),
                  tuesday: Boolean(editingPlannedWorkEntry.tuesday),
                  wednesday: Boolean(editingPlannedWorkEntry.wednesday),
                  thursday: Boolean(editingPlannedWorkEntry.thursday),
                  friday: Boolean(editingPlannedWorkEntry.friday),
                  saturday: Boolean(editingPlannedWorkEntry.saturday),
                  sunday: Boolean(editingPlannedWorkEntry.sunday),
                }
              : plannedWorkDefaultTaskId
                ? {
                    id: "new",
                    taskId: plannedWorkDefaultTaskId,
                    year: new Date().getFullYear(),
                    weekNumber: 1,
                    plannedDays: 0,
                    monday: false,
                    tuesday: false,
                    wednesday: false,
                    thursday: false,
                    friday: false,
                    saturday: false,
                    sunday: false,
                  }
                : null
          }
          onSubmit={async (payload) => {
            if (editingPlannedWorkEntry) {
              await handleUpdatePlannedWorkEntry(editingPlannedWorkEntry.id, payload);
              return;
            }
            await handleCreatePlannedWorkEntry(payload);
          }}
        />
      </Modal>

      <ProjectFormModal
        open={open}
        initialValues={project}
        onCancel={() => setOpen(false)}
        onSuccess={async () => {
          setOpen(false);
          await fetchProject();
        }}
        clients={clients}
        employees={employees}
      />
    </Space>
  );
};

export default ProjectDetailPage;
