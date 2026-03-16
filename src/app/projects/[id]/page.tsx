// @ts-nocheck
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Space,
  Descriptions,
  Button,
  Input,
  Tag,
  Modal,
  Select,
  Empty,
  Segmented,
  Checkbox,
  Progress,
  Table,
  Row,
  Col,
  Popconfirm,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import ProjectFormModal from "@/components/ProjectFormModal";
import AppLink from "@/components/AppLink";
import dayjs from "dayjs";
import { ProjectMilestoneRow } from "@/components/ProjectMilestonesTable";
import { ProjectSegmentRow } from "@/components/project-detail/ProjectSegmentsTable";
import type { ProjectTaskRow } from "@/components/project-detail/ProjectTasksTable";
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
import SelectOptionTag from "@/components/SelectOptionTag";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import ActualWorkEntriesTable from "@/components/ActualWorkEntriesTable";
import ProjectDocumentsTable, {
  ProjectDocumentRow,
} from "@/components/ProjectDocumentsTable";
import ProjectMilestoneSection from "@/components/project-detail/ProjectMilestoneSection";
import ProjectProgressNestedTable, {
  ProjectProgressSegmentRow,
} from "@/components/project-detail/ProjectProgressNestedTable";
import { useProjectPermission } from "@/hooks/useProjectPermission";

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
  isArchived?: boolean | null;
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
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  stageOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
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
    typeOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    startAt?: string | null;
    endAt?: string | null;
    datePrecision?: "DATE" | "DATETIME" | null;
    date?: string | null;
    location?: string | null;
    method?: string | null;
    methodOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
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
    typeOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
    date?: string | null;
    isFinal: boolean;
    internalLink?: string | null;
    milestone?: { id: string; name: string } | null;
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

type MilestoneNoticeItem = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  location?: string | null;
  method?: string | null;
  methodOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  internalParticipants?: { id: string; name: string }[];
  clientParticipants?: { id: string; name: string }[];
  vendorParticipants?: { id: string; name: string }[];
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
};

const ProjectDetailPage = () => {
  const params = useParams();
  const router = useRouter();
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
  const [deletingProject, setDeletingProject] = useState(false);
  const [addingFunction, setAddingFunction] = useState<string | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState<
    "milestones" | "progress" | "work" | "documents"
  >("milestones");
  const [actualWorkView, setActualWorkView] = useState<"records" | "analysis">(
    "records",
  );
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
  const [editingDocument, setEditingDocument] = useState<{
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
  } | null>(null);
  const [actualWorkModalOpen, setActualWorkModalOpen] = useState(false);
  const [editingActualWorkEntry, setEditingActualWorkEntry] = useState<{
    id: string;
    title: string;
    employeeId: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [plannedWorkModalOpen, setPlannedWorkModalOpen] = useState(false);
  const [editingPlannedWorkEntry, setEditingPlannedWorkEntry] =
    useState<PlannedWorkRow | null>(null);
  const [plannedWorkDefaultTaskId, setPlannedWorkDefaultTaskId] = useState<
    string | undefined
  >(undefined);
  const [workEntriesRefreshKey, setWorkEntriesRefreshKey] = useState(0);
  const [analysisDetailTarget, setAnalysisDetailTarget] = useState<{
    memberKey: string;
    memberName: string;
  } | null>(null);
  const [noticeTemplateModalOpen, setNoticeTemplateModalOpen] = useState(false);
  const [showNextWeekMilestones, setShowNextWeekMilestones] = useState(false);
  const [showFollowingMilestones, setShowFollowingMilestones] = useState(false);
  const { canManageProject } = useProjectPermission();

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
    setWorkEntriesRefreshKey((prev) => prev + 1);
    if (data?.client?.id) {
      try {
        const contactsRes = await fetch(
          `/api/clients/${data.client.id}/contacts`,
        );
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
    const sortMembers = (members: typeof project.members) =>
      [...members].sort((left, right) => {
        const leftResigned = left.employmentStatus === "离职";
        const rightResigned = right.employmentStatus === "离职";
        if (leftResigned !== rightResigned) {
          return leftResigned ? 1 : -1;
        }
        return left.name.localeCompare(right.name, "zh-CN");
      });

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
        sorted[key] = sortMembers(groups[key]);
      }
    });

    Object.keys(groups).forEach((key) => {
      if (!order.includes(key)) {
        sorted[key] = sortMembers(groups[key]);
      }
    });

    return sorted;
  }, [project]);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!canManageProject) return;
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
    if (!canManageProject) return;
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

  const milestoneRows: ProjectMilestoneRow[] =
    project?.milestones?.map((milestone) => ({
      ...milestone,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    })) ?? [];
  const milestoneNoticeTemplate = useMemo(() => {
    const newLine = "\n";
    const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周天"];
    const statusText = project?.statusOption?.value ?? project?.status ?? "";
    const needInfo = !["已结案", "暂停"].includes(statusText);
    if (!needInfo) return "";

    const today = dayjs().startOf("day");
    const day = today.day();
    const monday =
      day === 0 ? today.subtract(6, "day") : today.subtract(day - 1, "day");
    const friday = monday.add(4, "day");
    const sunday = monday.add(6, "day");
    const nextSunday = monday.add(13, "day");

    const mondayDisplay = monday.format("MM月DD日");
    const fridayDisplay =
      monday.month() === friday.month()
        ? friday.format("DD日")
        : friday.format("MM月DD日");
    const title = `本周${mondayDisplay}-${fridayDisplay}工作安排：`;

    const normalizedMilestones: MilestoneNoticeItem[] = (project?.milestones ?? [])
      .map((milestone) => {
        const startRaw = milestone.startAt ?? milestone.date ?? milestone.endAt;
        if (!startRaw) return null;
        const start = dayjs(startRaw);
        if (!start.isValid()) return null;
        const endRaw = milestone.endAt ?? milestone.startAt ?? milestone.date;
        const end = endRaw ? dayjs(endRaw) : start;
        const validEnd = end.isValid() ? end : start;
        return {
          id: milestone.id,
          name: milestone.name,
          type: milestone.type,
          typeOption: milestone.typeOption,
          location: milestone.location,
          method: milestone.method,
          methodOption: milestone.methodOption,
          internalParticipants: milestone.internalParticipants,
          clientParticipants: milestone.clientParticipants,
          vendorParticipants: milestone.vendorParticipants,
          start,
          end: validEnd,
        };
      })
      .filter((item): item is MilestoneNoticeItem => Boolean(item))
      .filter((item) => !item.start.isBefore(monday, "day"))
      .sort((left, right) => left.start.valueOf() - right.start.valueOf());

    const milestones = normalizedMilestones.filter((item) => {
      const inThisWeek = !item.start.isAfter(sunday, "day");
      const inNextWeek =
        item.start.isAfter(sunday, "day") && !item.start.isAfter(nextSunday, "day");
      const inFollowingWeeks = item.start.isAfter(nextSunday, "day");

      if (inThisWeek) return true;
      if (showNextWeekMilestones && inNextWeek) return true;
      if (showFollowingMilestones && inFollowingWeeks) return true;
      return false;
    });

    const details = milestones
      .map((milestone, index) => {
        const isoDay = milestone.start.day() === 0 ? 7 : milestone.start.day();
        const dayText = weekDays[isoDay - 1] ?? "周天";
        const weekGap = Math.max(
          0,
          milestone.start.startOf("day").diff(monday.startOf("day"), "week"),
        );
        const dayDisplay =
          weekGap === 0
            ? `【${dayText}】`
            : weekGap === 1
              ? `【下${dayText}】`
              : weekGap === 2
                ? `【下下${dayText}】`
                : `【${milestone.start.format("M月D日")} ${dayText}】`;

        const name = milestone.name?.trim() ?? "";
        const type = milestone.typeOption?.value ?? milestone.type ?? "";
        const indexDisplay = milestones.length > 1 ? `${index + 1} -` : "";
        const firstLine = `${indexDisplay}${dayDisplay}${name}${type ? `-${type}` : ""}`;

        const startTime = milestone.start.format("HH:mm");
        const endTime = milestone.end.format("HH:mm");
        const isTimeInvalid = startTime === "00:00" && endTime === "00:00";
        const timeRange =
          startTime !== endTime ? `${startTime}-${endTime}` : startTime;
        const timeContent = isTimeInvalid ? "" : timeRange;

        const address = milestone.location ?? "";
        const method = milestone.methodOption?.value ?? milestone.method ?? "";
        const clients = (milestone.clientParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const colleagues = (milestone.internalParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const vendors = (milestone.vendorParticipants ?? [])
          .map((item) => item.name)
          .filter((value): value is string => Boolean(value))
          .join("、");
        const membersContent = [clients, colleagues, vendors]
          .filter((value) => value !== "")
          .join("、");

        const detailLines = [
          ["时间", timeContent],
          ["描述", " "],
          ["地点", address],
          ["方式", method],
          ["参与人员", membersContent],
          ["备注", " "],
          ["TODO", `${newLine}  - `],
        ]
          .filter((item) => item[1] !== "")
          .map((item) => `- ${item[0]}：${item[1]}`)
          .join(newLine);

        return `${firstLine}${newLine}${detailLines}`;
      })
      .join(`${newLine}${newLine}`);

    if (!details) return "";
    return `${title}${newLine}${details}`;
  }, [
    project?.milestones,
    project?.status,
    project?.statusOption?.value,
    showFollowingMilestones,
    showNextWeekMilestones,
  ]);
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

  const actualWorkAnalysisRows = useMemo(() => {
    const entries = project?.actualWorkEntries ?? [];
    const round2 = (value: number) => Number(value.toFixed(2));
    const departedMatcher = (status?: string | null) =>
      (status ?? "").includes("离职") ||
      (status ?? "").toUpperCase().includes("LEFT");
    const memberById = new Map(
      (project?.members ?? []).map((member) => [member.id, member]),
    );
    const memberByName = new Map(
      (project?.members ?? []).map((member) => [member.name, member]),
    );
    const memberMap = new Map<
      string,
      { id: string; name: string; hours: number; isDeparted: boolean }
    >();

    for (const entry of entries) {
      const start = dayjs(entry.startDate);
      const end = dayjs(entry.endDate);
      const hours = round2(Math.max(end.diff(start, "minute") / 60, 0));
      const employeeId = entry.employee?.id ?? `unknown-${entry.id}`;
      const employeeName = entry.employee?.name ?? "未分配成员";
      const matchedMember =
        (entry.employee?.id ? memberById.get(entry.employee.id) : undefined) ??
        (entry.employee?.name
          ? memberByName.get(entry.employee.name)
          : undefined);
      const existing = memberMap.get(employeeId);
      if (existing) {
        existing.hours = round2(existing.hours + hours);
      } else {
        memberMap.set(employeeId, {
          id: employeeId,
          name: employeeName,
          hours,
          isDeparted: departedMatcher(matchedMember?.employmentStatus),
        });
      }
    }

    for (const member of project?.members ?? []) {
      if (!memberMap.has(member.id)) {
        memberMap.set(member.id, {
          id: member.id,
          name: member.name,
          hours: 0,
          isDeparted: departedMatcher(member.employmentStatus),
        });
      }
    }

    const memberRows = Array.from(memberMap.values())
      .filter(
        (row) =>
          !(
            row.hours === 0 &&
            ["Johnny", "Icy", "张弛"].includes((row.name ?? "").trim())
          ),
      )
      .sort((left, right) => {
        if (right.hours !== left.hours) return right.hours - left.hours;
        return left.name.localeCompare(right.name, "zh-CN");
      });

    const totalHours = round2(
      memberRows.reduce((sum, row) => sum + row.hours, 0),
    );
    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
    const formatHours = (hours: number) =>
      hours.toFixed(2).replace(/\.?0+$/, "");
    const formatDays = (hours: number) =>
      (hours / 8).toFixed(2).replace(/\.?0+$/, "");

    return [
      {
        key: "total",
        memberKey: "total",
        name: "项目总工时",
        hours: totalHours,
        ratioValue: totalHours > 0 ? 100 : 0,
        ratio: totalHours > 0 ? "100.00%" : "0.00%",
        isTotal: true,
      },
      ...memberRows.map((row) => ({
        key: row.id,
        memberKey: row.id,
        employeeId: row.id.startsWith("unknown-") ? null : row.id,
        name: row.name,
        hours: row.hours,
        isDeparted: row.isDeparted,
        ratioValue: totalHours > 0 ? round2((row.hours / totalHours) * 100) : 0,
        ratio: totalHours > 0 ? formatPercent(row.hours / totalHours) : "0.00%",
        isTotal: false,
      })),
    ].map((row) => ({
      ...row,
      hoursDisplay: `${formatHours(row.hours)}h`,
      daysDisplay: `${formatDays(row.hours)}d`,
    }));
  }, [project?.actualWorkEntries, project?.members]);

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

  const actualWorkDetailRows = useMemo(() => {
    if (!analysisDetailTarget) return [];
    const round2 = (value: number) => Number(value.toFixed(2));
    const formatHours = (hours: number) => hours.toFixed(2);
    const formatDays = (hours: number) => (hours / 8).toFixed(2);
    const formatRange = (start: string, end: string) => {
      const s = dayjs(start);
      const e = dayjs(end);
      if (s.isSame(e, "day")) {
        return `${s.format("YYYY-MM-DD HH:mm")}-${e.format("HH:mm")}`;
      }
      const dayDiff = e.startOf("day").diff(s.startOf("day"), "day");
      return `${s.format("YYYY-MM-DD HH:mm")}-${e.format("HH:mm")}（+${dayDiff}）`;
    };

    return (project?.actualWorkEntries ?? [])
      .filter((entry) => {
        const memberKey = entry.employee?.id ?? `unknown-${entry.id}`;
        return memberKey === analysisDetailTarget.memberKey;
      })
      .sort(
        (left, right) =>
          dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf(),
      )
      .map((entry) => {
        const hours = round2(
          Math.max(
            dayjs(entry.endDate).diff(dayjs(entry.startDate), "minute") / 60,
            0,
          ),
        );
        return {
          id: entry.id,
          title: entry.title,
          timeRange: formatRange(entry.startDate, entry.endDate),
          hoursDisplay: `${formatHours(hours)}h`,
          daysDisplay: `${formatDays(hours)}d`,
        };
      });
  }, [analysisDetailTarget, project?.actualWorkEntries]);

  const openTaskModalForSegment = (segment: { id: string; name: string }) => {
    if (!canManageProject) return;
    setEditingTask(null);
    setTaskDefaultSegmentId(segment.id);
    setTaskModalOpen(true);
  };

  const handleCreateMilestone = async (
    payload: ProjectMilestoneFormPayload,
  ) => {
    if (!canManageProject) return;
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
    if (!canManageProject) return;
    await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMilestoneModalOpen(false);
    setEditingMilestone(null);
    await fetchProject();
  };

  const handleCreateSegment = async (payload: ProjectSegmentFormPayload) => {
    if (!canManageProject) return;
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
    if (!canManageProject) return;
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
    if (!canManageProject) return;
    await fetch(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: "DELETE",
    });
    await fetchProject();
  };

  const handleCreateTask = async (payload: ProjectTaskFormPayload) => {
    if (!canManageProject) return;
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
    if (!canManageProject) return;
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
    if (!canManageProject) return;
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

  const openCreatePlannedWorkModal = (defaultTaskId?: string) => {
    setEditingPlannedWorkEntry(null);
    setPlannedWorkDefaultTaskId(defaultTaskId);
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

  const handleDeleteProject = async () => {
    if (!canManageProject) return;
    if (!projectId) return;
    setDeletingProject(true);
    const res = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: projectId }),
    });
    setDeletingProject(false);
    if (!res.ok) {
      message.error("删除失败");
      return;
    }
    message.success("删除成功");
    router.push(
      project?.type === "INTERNAL" ? "/internal-projects" : "/client-projects",
    );
  };

  const handleCopyMilestoneNoticeTemplate = async () => {
    if (!milestoneNoticeTemplate) return;
    try {
      await navigator.clipboard.writeText(milestoneNoticeTemplate);
      message.success("通知模板已复制");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      <Card
        title={project?.name || "项目信息"}
        loading={loading}
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              disabled={!canManageProject}
              onClick={() => {
                if (!canManageProject) return;
                setOpen(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title={`确定删除项目「${project?.name ?? ""}」？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => void handleDeleteProject()}
              okButtonProps={{ danger: true, loading: deletingProject }}
            >
              <Button danger loading={deletingProject} disabled={!canManageProject}>
                删除
              </Button>
            </Popconfirm>
          </Space>
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
              <Descriptions.Item label="项目类型">
                <SelectOptionTag
                  option={
                    project.typeOption?.value
                      ? {
                          id: project.typeOption.id ?? "",
                          value: project.typeOption.value,
                          color: project.typeOption.color ?? null,
                        }
                      : project.type
                        ? {
                            id: "",
                            value:
                              projectTypeMap[project.type] ||
                              project.type ||
                              "-",
                            color: null,
                          }
                        : null
                  }
                />
              </Descriptions.Item>
              {!isInternalProject && project.client && (
                <Descriptions.Item label="所属客户">
                  <AppLink href={`/clients/${project.client.id}`}>
                    {project.client.name}
                  </AppLink>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="负责人">
                {project.owner ? (
                  <AppLink href={`/employees/${project.owner.id}`}>
                    {project.owner.name}
                  </AppLink>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* 项目进度 */}
            {isInternalProject ? (
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
                <Descriptions.Item label="项目周期" span={1}>
                  {project.startDate
                    ? (calculatePeriodInfo(
                        project.startDate,
                        project.endDate,
                        workdayAdjustments,
                      )?.display ?? "-")
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="已归档">
                  <Checkbox
                    checked={Boolean(project.isArchived)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                </Descriptions.Item>
              </Descriptions>
            ) : (
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
                <Descriptions.Item label="项目状态">
                  <SelectOptionTag
                    option={
                      project.statusOption?.value
                        ? {
                            id: project.statusOption.id ?? "",
                            value: project.statusOption.value,
                            color: project.statusOption.color ?? null,
                          }
                        : project.status
                          ? {
                              id: "",
                              value: project.status,
                              color: null,
                            }
                          : null
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="项目阶段">
                  <SelectOptionTag
                    option={
                      project.stageOption?.value
                        ? {
                            id: project.stageOption.id ?? "",
                            value: project.stageOption.value,
                            color: project.stageOption.color ?? null,
                          }
                        : project.stage
                          ? {
                              id: "",
                              value: project.stage,
                              color: null,
                            }
                          : null
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="已归档">
                  <Checkbox
                    checked={Boolean(project.isArchived)}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="项目周期" span={3}>
                  {project.startDate
                    ? (calculatePeriodInfo(
                        project.startDate,
                        project.endDate,
                        workdayAdjustments,
                      )?.display ?? "-")
                    : "-"}
                </Descriptions.Item>
              </Descriptions>
            )}
          </>
        )}
      </Card>

      {/* 人员信息 - 按职能分组 */}
      <Card title="人员信息">
        {project?.members && project.members.length > 0 ? (
          <Space orientation="vertical" style={{ width: "100%" }} size="large">
            <Row gutter={[16, 16]}>
              {Object.entries(groupedMembers()).map(([func, members]) => (
                <Col key={func} xs={24} md={12}>
                  <Space
                    orientation="vertical"
                    size={8}
                    style={{ width: "100%", alignItems: "flex-start" }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      <strong>{func}：</strong>
                    </span>
                    <Space size={[8, 8]} wrap>
                      {members.map((member) => (
                        <Tag
                          key={member.id}
                          style={{ marginRight: 0 }}
                          closable={canManageProject}
                          onClose={(e) => {
                            if (!canManageProject) return;
                            e.preventDefault();
                            handleRemoveMember(member.id, member.name);
                          }}
                        >
                          {member.name}
                          {member.employmentStatus === "离职" && " (离职)"}
                        </Tag>
                      ))}
                    </Space>
                  </Space>
                </Col>
              ))}
            </Row>
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
                  canManageProject ? (
                    <Tag
                      onClick={() => setAddingFunction("global")}
                      style={{ cursor: "pointer", marginRight: 0 }}
                    >
                      + 添加成员
                    </Tag>
                  ) : null
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
                  canManageProject ? (
                    <Tag
                      onClick={() => setAddingFunction("global")}
                      style={{ cursor: "pointer", marginRight: 0 }}
                    >
                      + 添加成员
                    </Tag>
                  ) : null
                )}
              </Space>
            </div>
          </Space>
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
                label: `项目里程碑（${milestoneRows.length}）`,
                value: "milestones",
              },
              {
                label: `项目进度（环节${segmentRows.length}/任务${taskCount}）`,
                value: "progress",
              },
              {
                label: `实际工时（${project?.actualWorkEntries?.length ?? 0}）`,
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
          projectDetailTab === "milestones" ? (
            <Space size={8}>
              <Button onClick={() => setNoticeTemplateModalOpen(true)}>
                生成通知模板
              </Button>
              <Button
                type="primary"
                disabled={!canManageProject}
                onClick={() => {
                  if (!canManageProject) return;
                  setEditingMilestone(null);
                  setMilestoneModalOpen(true);
                }}
              >
                新增里程碑
              </Button>
            </Space>
          ) : projectDetailTab === "progress" ? (
            <Button
              type="primary"
              disabled={!canManageProject}
              onClick={() => {
                if (!canManageProject) return;
                setEditingSegment(null);
                setSegmentModalOpen(true);
              }}
            >
              新增环节
            </Button>
          ) : projectDetailTab === "work" ? (
            <Space size={8}>
              <Select
                value={actualWorkView}
                style={{ width: 140 }}
                options={[
                  { label: "工时记录", value: "records" },
                  { label: "工时分析", value: "analysis" },
                ]}
                onChange={(value) =>
                  setActualWorkView(value as "records" | "analysis")
                }
              />
              <Button
                type="primary"
                onClick={() => {
                  setEditingActualWorkEntry(null);
                  setActualWorkModalOpen(true);
                }}
              >
                新增实际工时
              </Button>
            </Space>
          ) : (
            <Button
              type="primary"
              onClick={() => {
                setEditingDocument(null);
                setDocumentModalOpen(true);
              }}
            >
              新增文档
            </Button>
          )
        }
      >
        {projectDetailTab === "milestones" && (
          <ProjectMilestoneSection
            milestones={project?.milestones ?? []}
            withContainerCard={false}
            showAddButton={false}
          />
        )}
        {projectDetailTab === "progress" && (
          <ProjectProgressNestedTable
            data={progressRows}
            segmentHeaderTitle={`项目环节（${segmentRows.length}）/任务（${taskCount}）`}
            pageSize={8}
            actionsDisabled={!canManageProject}
            onAddTask={(segment) => openTaskModalForSegment(segment)}
            onEditSegment={(segment) => {
              if (!canManageProject) return;
              setEditingSegment({
                id: segment.id,
                name: segment.name,
                status: segment.status ?? null,
                statusOption: segment.statusOption ?? null,
                dueDate: segment.dueDate ?? null,
                owner: segment.ownerId
                  ? { id: segment.ownerId, name: segment.ownerName }
                  : null,
              });
              setSegmentModalOpen(true);
            }}
            onDeleteSegment={async (segment) => {
              await handleDeleteSegment(segment.id);
            }}
            onAddPlannedWork={(task) => openCreatePlannedWorkModal(task.id)}
            onEditTask={(task) => {
              if (!canManageProject) return;
              setEditingTask({
                id: task.id,
                name: task.name,
                status: task.status ?? null,
                dueDate: task.dueDate ?? null,
                segmentId: task.segmentId,
                segmentName: task.segmentName,
                owner: task.ownerId
                  ? { id: task.ownerId, name: task.ownerName }
                  : null,
              });
              setTaskDefaultSegmentId(undefined);
              setTaskModalOpen(true);
            }}
            onDeleteTask={async (task) => {
              await handleDeleteTask(task.id);
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
            onDeletePlannedWork={async (entry) => {
              await handleDeletePlannedWorkEntry(entry.id);
            }}
          />
        )}
        {projectDetailTab === "work" &&
          (actualWorkView === "records" ? (
            <ActualWorkEntriesTable
              headerTitle={null}
              showTableOptions={false}
              compactHorizontalPadding
              employeeFilterOptions={actualWorkEmployeeFilterOptions}
              refreshKey={workEntriesRefreshKey}
              columnKeys={[
                "title",
                "employeeName",
                "startDate",
                "workDay",
                "actions",
              ]}
              requestData={async ({ current, pageSize, filters }) => {
                const normalizedTitle = filters.title?.trim() ?? "";
                const normalizedEmployee = filters.employeeName?.trim() ?? "";
                const normalizedDate = filters.startDate?.trim() ?? "";
                const normalizedDateFrom = filters.startDateFrom?.trim() ?? "";
                const normalizedDateTo = filters.startDateTo?.trim() ?? "";

                const rows = (project?.actualWorkEntries ?? []).map(
                  (entry) => ({
                    ...entry,
                    project: project
                      ? {
                          id: project.id,
                          name: project.name,
                        }
                      : undefined,
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
                    dayjs(row.startDate).format("YYYY-MM-DD") !== normalizedDate
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
                setEditingActualWorkEntry({
                  id: row.id,
                  title: row.title,
                  employeeId: row.employee?.id ?? "",
                  startDate: row.startDate,
                  endDate: row.endDate,
                });
                setActualWorkModalOpen(true);
              }}
              onDelete={async (id) => {
                await handleDeleteActualWorkEntry(id);
              }}
            />
          ) : (
            <Table
              rowKey="key"
              pagination={false}
              columns={[
                {
                  title: "姓名",
                  dataIndex: "name",
                  key: "name",
                  render: (
                    value: string,
                    row: {
                      isTotal: boolean;
                      employeeId?: string | null;
                      isDeparted?: boolean;
                    },
                  ) => {
                    const displayName = row.isDeparted
                      ? `${value}（离职）`
                      : value;
                    if (row.isTotal) {
                      return <strong>{displayName}</strong>;
                    }
                    if (row.employeeId) {
                      return (
                        <AppLink href={`/employees/${row.employeeId}`}>
                          {displayName}
                        </AppLink>
                      );
                    }
                    return displayName;
                  },
                },
                {
                  title: "工时（小时）",
                  dataIndex: "hoursDisplay",
                  key: "hoursDisplay",
                  render: (value: string, row: { isTotal: boolean }) =>
                    row.isTotal ? <strong>{value}</strong> : value,
                },
                {
                  title: "工时（天）",
                  dataIndex: "daysDisplay",
                  key: "daysDisplay",
                  render: (value: string, row: { isTotal: boolean }) =>
                    row.isTotal ? <strong>{value}</strong> : value,
                },
                {
                  title: "占比",
                  dataIndex: "ratio",
                  key: "ratio",
                  render: (
                    value: string,
                    row: { isTotal: boolean; ratioValue: number },
                  ) => (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 180,
                      }}
                    >
                      <Progress
                        percent={Number(row.ratioValue.toFixed(2))}
                        showInfo={false}
                        size="small"
                        strokeColor={row.isTotal ? "#1677ff" : undefined}
                        style={{ width: 120, margin: 0 }}
                      />
                      {row.isTotal ? <strong>{value}</strong> : value}
                    </div>
                  ),
                },
                {
                  title: "查看详情",
                  key: "detail",
                  render: (
                    _: unknown,
                    row: { isTotal: boolean; memberKey: string; name: string },
                  ) =>
                    row.isTotal ? (
                      "-"
                    ) : (
                      <Button
                        type="link"
                        onClick={() =>
                          setAnalysisDetailTarget({
                            memberKey: row.memberKey,
                            memberName: row.name,
                          })
                        }
                        style={{ paddingInline: 0 }}
                      >
                        查看详情
                      </Button>
                    ),
                },
              ]}
              dataSource={actualWorkAnalysisRows}
            />
          ))}
        {projectDetailTab === "documents" && (
          <ProjectDocumentsTable
            rows={projectDocumentRows}
            headerTitle={null}
            showColumnSetting={false}
            columnKeys={[
              "name",
              "type",
              "date",
              "isFinal",
              "internalLink",
              "actions",
            ]}
            onEdit={(record) => {
              setEditingDocument({
                id: record.id,
                name: record.name,
                typeOption: record.typeOption,
                date: record.date,
                isFinal: record.isFinal,
                internalLink:
                  typeof record.internalLink === "string"
                    ? record.internalLink
                    : null,
              });
              setDocumentModalOpen(true);
            }}
            onDelete={async (id) => {
              await handleDeleteDocument(id);
            }}
            actionDeleteTitle="确定删除文档？"
          />
        )}
      </Card>

      <Modal
        title="生成通知模板"
        open={noticeTemplateModalOpen}
        onCancel={() => setNoticeTemplateModalOpen(false)}
        destroyOnHidden
        width={760}
        footer={
          <Space>
            <Button onClick={() => setNoticeTemplateModalOpen(false)}>关闭</Button>
            <Button
              type="primary"
              disabled={!milestoneNoticeTemplate}
              onClick={() => {
                void handleCopyMilestoneNoticeTemplate();
              }}
            >
              复制内容
            </Button>
          </Space>
        }
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Space size={16} wrap>
            <Checkbox
              checked={showNextWeekMilestones}
              onChange={(event) => setShowNextWeekMilestones(event.target.checked)}
            >
              显示下周里程碑
            </Checkbox>
            <Checkbox
              checked={showFollowingMilestones}
              onChange={(event) => setShowFollowingMilestones(event.target.checked)}
            >
              显示后续里程碑
            </Checkbox>
          </Space>
          <Input.TextArea
            value={milestoneNoticeTemplate}
            readOnly
            autoSize={{ minRows: 14, maxRows: 24 }}
            placeholder="当前无可生成的里程碑通知内容"
          />
        </Space>
      </Modal>

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
          projectOptions={
            project ? [{ id: project.id, name: project.name }] : []
          }
          selectedProjectId={project?.id}
          disableProjectSelect
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
              await handleUpdateActualWorkEntry(
                editingActualWorkEntry.id,
                payload,
              );
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
                segmentId: segment.id,
                segmentName: segment.name,
                name: task.name,
              })),
            ) ?? []
          }
          initialValues={
            editingPlannedWorkEntry
              ? {
                  id: editingPlannedWorkEntry.id,
                  taskId: editingPlannedWorkEntry.taskId,
                  year:
                    editingPlannedWorkEntry.year ?? new Date().getFullYear(),
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
              await handleUpdatePlannedWorkEntry(
                editingPlannedWorkEntry.id,
                payload,
              );
              return;
            }
            await handleCreatePlannedWorkEntry(payload);
          }}
        />
      </Modal>

      <Modal
        title={
          analysisDetailTarget
            ? `${analysisDetailTarget.memberName} 的工时记录`
            : "工时记录"
        }
        open={Boolean(analysisDetailTarget)}
        onCancel={() => setAnalysisDetailTarget(null)}
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
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ y: "calc(80vh - 100px)" }}
          columns={[
            { title: "事件", dataIndex: "title", key: "title" },
            { title: "时间", dataIndex: "timeRange", key: "timeRange" },
            {
              title: "工时（小时）",
              dataIndex: "hoursDisplay",
              key: "hoursDisplay",
            },
            {
              title: "工时（天）",
              dataIndex: "daysDisplay",
              key: "daysDisplay",
            },
          ]}
          dataSource={actualWorkDetailRows}
          locale={{ emptyText: "暂无工时记录" }}
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
