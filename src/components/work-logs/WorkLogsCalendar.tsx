"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, Empty, Modal, Spin, message } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import zhCnLocale from "@fullcalendar/core/locales/zh-cn";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ActualWorkEntryForm, {
  type ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import {
  calculateActualWorkdays,
  getActualWorkDateKey,
  getActualWorkEntryHours,
} from "@/lib/actual-workdays";
import { useProjectTasksStore } from "@/stores/projectTasksStore";
import { useProjectsStore } from "@/stores/projectsStore";

dayjs.extend(isoWeek);

export type WorkLogsCalendarEmployee = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type ActualWorkEntryRow = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
};

type WorkLogFormInitialValues = ActualWorkEntryFormPayload & { id: string };

type CalendarVisibleRange = {
  start: Date;
  end: Date;
};

type CopiedWorkLog = {
  title: string;
  projectId: string;
  durationMinutes: number;
};

type ProjectOption = { id: string; name: string };
type ProjectOptionWithStatus = ProjectOption & {
  status?: string | null;
  statusOrder?: number | null;
};

type CalendarViewType =
  | "dayGridMonth"
  | "timeGridWeek"
  | "timeGridDay"
  | "listMonth";

type Props = {
  employee?: WorkLogsCalendarEmployee | null;
  title?: ReactNode;
  extra?: ReactNode;
};

type WeeklyTaskCard = {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  plannedDays: number;
};

const WORK_LOG_VIEW_PARAM = "workLogView";

const mapQueryViewToCalendarView = (value: string | null): CalendarViewType => {
  if (
    value === "dayGridMonth" ||
    value === "timeGridWeek" ||
    value === "timeGridDay" ||
    value === "listMonth"
  ) {
    return value;
  }
  if (value === "month") return "dayGridMonth";
  if (value === "week") return "timeGridWeek";
  if (value === "day") return "timeGridDay";
  if (value === "list") return "listMonth";
  return "timeGridWeek";
};

const formatHours = (value: number) => {
  const normalized = Number(value.toFixed(1));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(1);
};

const formatSummaryNumber = (value: number) =>
  value.toFixed(2).replace(/\.?0+$/, "");

const WorkLogsCalendar = ({ employee, title, extra }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );
  const fetchTasksFromStore = useProjectTasksStore((state) => state.fetchTasks);
  const employees = useMemo<WorkLogsCalendarEmployee[]>(
    () => (employee ? [employee] : []),
    [employee],
  );
  const [actualRows, setActualRows] = useState<ActualWorkEntryRow[]>([]);
  const [actualRowsLoading, setActualRowsLoading] = useState(false);
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogSubmitting, setWorkLogSubmitting] = useState(false);
  const [workLogMode, setWorkLogMode] = useState<"create" | "edit">("create");
  const [editingWorkLogId, setEditingWorkLogId] = useState<string | null>(null);
  const [workLogProjectOptions, setWorkLogProjectOptions] = useState<
    ProjectOptionWithStatus[]
  >([]);
  const [workLogProjectOptionGroups, setWorkLogProjectOptionGroups] = useState<
    DefaultOptionType[]
  >([]);
  const [workLogOptionsLoading, setWorkLogOptionsLoading] = useState(false);
  const [workLogOptionsLoadedUserId, setWorkLogOptionsLoadedUserId] = useState<
    string | null
  >(null);
  const [workLogSelectedProjectId, setWorkLogSelectedProjectId] = useState<
    string | undefined
  >(undefined);
  const [workLogDisableProjectSelect, setWorkLogDisableProjectSelect] =
    useState(false);
  const [workLogInitialValues, setWorkLogInitialValues] =
    useState<WorkLogFormInitialValues | null>(null);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTaskCard[]>([]);
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(false);
  const lastCalendarClickRef = useRef<{ key: string; ts: number } | null>(null);
  const lastCalendarDateRef = useRef<{ date: Date; allDay: boolean } | null>(
    null,
  );
  const [calendarVisibleRange, setCalendarVisibleRange] =
    useState<CalendarVisibleRange | null>(null);
  const [selectedCalendarEntryId, setSelectedCalendarEntryId] = useState<
    string | null
  >(null);
  const [copiedWorkLog, setCopiedWorkLog] = useState<CopiedWorkLog | null>(
    null,
  );
  const initialCalendarView = useMemo(
    () => mapQueryViewToCalendarView(searchParams.get(WORK_LOG_VIEW_PARAM)),
    [searchParams],
  );

  useEffect(() => {
    if (workLogOptionsLoadedUserId && workLogOptionsLoadedUserId !== employee?.id) {
      setWorkLogProjectOptions([]);
      setWorkLogProjectOptionGroups([]);
      setWorkLogOptionsLoadedUserId(null);
    }
  }, [employee?.id, workLogOptionsLoadedUserId]);

  const ensureWorkLogProjectOptionsLoaded = async () => {
    const userId = employee?.id;
    if (!userId) {
      setWorkLogProjectOptions([]);
      setWorkLogProjectOptionGroups([]);
      setWorkLogOptionsLoadedUserId(null);
      return;
    }
    if (workLogOptionsLoadedUserId === userId) return;

    setWorkLogOptionsLoading(true);
    try {
      const [tasks, ownedProjects] = await Promise.all([
        fetchTasksFromStore({ ownerId: userId }),
        fetchProjectsFromStore({ ownerId: userId }),
      ]);

      const isArchivedProject = (project: {
        isArchived?: boolean | null;
        status?: string | null;
        statusOption?: { value?: string | null } | null;
      }) => {
        if (Boolean(project.isArchived)) return true;
        const statusValue = project.statusOption?.value ?? project.status ?? "";
        return statusValue === "已归档";
      };

      const projectMap = new Map<string, ProjectOptionWithStatus>();

      if (Array.isArray(ownedProjects)) {
        for (const project of ownedProjects as Array<{
          id?: string | null;
          name?: string | null;
          isArchived?: boolean | null;
          status?: string | null;
          statusOption?: {
            value?: string | null;
            order?: number | null;
          } | null;
        }>) {
          if (!project.id || !project.name || isArchivedProject(project)) continue;
          projectMap.set(project.id, {
            id: project.id,
            name: project.name,
            status: project.statusOption?.value ?? project.status ?? null,
            statusOrder: project.statusOption?.order ?? null,
          });
        }
      }

      if (Array.isArray(tasks)) {
        for (const task of tasks as Array<{
          segment?: {
            project?: {
              id?: string | null;
              name?: string | null;
              status?: string | null;
              statusOption?: {
                value?: string | null;
                order?: number | null;
              } | null;
            } | null;
          } | null;
        }>) {
          const project = task?.segment?.project;
          if (!project?.id || !project.name) continue;
          if (isArchivedProject(project)) continue;
          if (projectMap.has(project.id)) continue;
          projectMap.set(project.id, {
            id: project.id,
            name: project.name,
            status: project.statusOption?.value ?? project.status ?? null,
            statusOrder: project.statusOption?.order ?? null,
          });
        }
      }

      const hasPlatformProject = Array.from(projectMap.values()).some((project) =>
        project.name.trim().includes("中台项目"),
      );

      if (!hasPlatformProject) {
        const allProjects = await fetchProjectsFromStore();
        if (Array.isArray(allProjects)) {
          for (const project of allProjects as Array<{
            id?: string | null;
            name?: string | null;
            isArchived?: boolean | null;
            status?: string | null;
            statusOption?: {
              value?: string | null;
              order?: number | null;
            } | null;
          }>) {
            if (!project.id || !project.name || isArchivedProject(project)) continue;
            if (!project.name.trim().includes("中台项目")) continue;
            projectMap.set(project.id, {
              id: project.id,
              name: project.name,
              status: project.statusOption?.value ?? project.status ?? null,
              statusOrder: project.statusOption?.order ?? null,
            });
            break;
          }
        }
      }

      const projectList = Array.from(projectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN"),
      );

      const platformProjects = projectList.filter((project) =>
        project.name.trim().includes("中台项目"),
      );
      const nonPlatformProjects = projectList.filter(
        (project) => !project.name.trim().includes("中台项目"),
      );

      const groupedProjectOptions = [
        ...platformProjects.map((project) => ({
          label: project.name,
          value: project.id,
        })),
        ...Array.from(
          nonPlatformProjects.reduce<
            Map<
              string,
              {
                label: string;
                order: number;
                options: ProjectOptionWithStatus[];
              }
            >
          >((groups, project) => {
            const label = project.status?.trim() || "未设置状态";
            const existing = groups.get(label);
            const nextOrder = Number.isFinite(project.statusOrder)
              ? Number(project.statusOrder)
              : Number.MAX_SAFE_INTEGER;
            if (!existing) {
              groups.set(label, {
                label,
                order: nextOrder,
                options: [project],
              });
              return groups;
            }
            existing.options.push(project);
            existing.order = Math.min(existing.order, nextOrder);
            return groups;
          }, new Map()),
        )
          .sort((left, right) => {
            if (left[1].order !== right[1].order) {
              return left[1].order - right[1].order;
            }
            return left[1].label.localeCompare(right[1].label, "zh-CN");
          })
          .map(([, group]) => ({
            label: group.label,
            options: group.options
              .slice()
              .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
              .map(({ id, name }) => ({
                label: name,
                value: id,
              })),
          })),
      ];

      setWorkLogProjectOptions(projectList);
      setWorkLogProjectOptionGroups(groupedProjectOptions);
      setWorkLogOptionsLoadedUserId(userId);
    } finally {
      setWorkLogOptionsLoading(false);
    }
  };

  const fetchActualRowsInRange = async (
    range: CalendarVisibleRange,
    employeeId: string,
  ) => {
    const startDateFrom = dayjs(range.start).format("YYYY-MM-DD");
    const endDateTo = dayjs(range.end).subtract(1, "day").format("YYYY-MM-DD");
    const query = new URLSearchParams({
      projectType: "all",
      employeeId,
      startDateFrom,
      startDateTo: endDateTo,
    });
    const actualRes = await fetch(`/api/actual-work-entries?${query.toString()}`, {
      cache: "no-store",
    });
    const actual = actualRes.ok ? await actualRes.json() : [];
    setActualRows(Array.isArray(actual) ? actual : []);
  };

  useEffect(() => {
    (async () => {
      if (!employee?.id || !calendarVisibleRange) {
        setActualRows([]);
        return;
      }
      setActualRowsLoading(true);
      try {
        await fetchActualRowsInRange(calendarVisibleRange, employee.id);
      } finally {
        setActualRowsLoading(false);
      }
    })();
  }, [calendarVisibleRange, employee?.id]);

  useEffect(() => {
    (async () => {
      if (!employee?.id) {
        setWeeklyTasks([]);
        return;
      }
      setWeeklyTasksLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "1000",
          year: String(dayjs().isoWeekYear()),
          weekNumber: String(dayjs().isoWeek()),
        });
        const response = await fetch(`/api/planned-work-entries?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = response.ok ? await response.json() : { data: [] };
        const rows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        const taskMap = new Map<string, WeeklyTaskCard>();
        for (const row of rows as Array<{
          plannedDays?: number | null;
          task?: {
            id?: string;
            name?: string | null;
            owner?: { id?: string | null } | null;
            segment?: {
              project?: { id?: string | null; name?: string | null } | null;
            } | null;
          } | null;
        }>) {
          const task = row.task;
          const project = task?.segment?.project;
          if (!task?.id || !task.name || !project?.id || !project.name) continue;
          if (task.owner?.id !== employee.id) continue;
          const existing = taskMap.get(task.id);
          if (existing) {
            existing.plannedDays += Number(row.plannedDays ?? 0);
            continue;
          }
          taskMap.set(task.id, {
            taskId: task.id,
            taskName: task.name,
            projectId: project.id,
            projectName: project.name,
            plannedDays: Number(row.plannedDays ?? 0),
          });
        }

        setWeeklyTasks(
          Array.from(taskMap.values()).sort((left, right) => {
            if (right.plannedDays !== left.plannedDays) {
              return right.plannedDays - left.plannedDays;
            }
            return left.taskName.localeCompare(right.taskName, "zh-CN");
          }),
        );
      } finally {
        setWeeklyTasksLoading(false);
      }
    })();
  }, [employee?.id]);

  const employeeActualRows = useMemo(() => {
    if (!employee) return [];
    return actualRows
      .filter((entry) => entry.employee?.id === employee.id)
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
  }, [actualRows, employee]);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();

      if (key === "c") {
        if (!selectedCalendarEntryId) return;
        const entry = employeeActualRows.find(
          (item) => item.id === selectedCalendarEntryId,
        );
        if (!entry || !entry.project?.id) return;
        const minutes = Math.max(
          dayjs(entry.endDate).diff(dayjs(entry.startDate), "minute"),
          1,
        );
        setCopiedWorkLog({
          title: entry.title,
          projectId: entry.project.id,
          durationMinutes: minutes,
        });
        messageApi.success("已复制工时记录");
        return;
      }

      if (key === "v") {
        if (!copiedWorkLog || !employee) return;
        if (!lastCalendarDateRef.current) {
          messageApi.warning("请先点击日历中的目标日期/时间");
          return;
        }
        event.preventDefault();
        const base = dayjs(lastCalendarDateRef.current.date);
        const start = lastCalendarDateRef.current.allDay
          ? base.hour(9).minute(0).second(0).millisecond(0)
          : base;
        const end = start.add(copiedWorkLog.durationMinutes, "minute");

        try {
          const res = await fetch("/api/actual-work-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: copiedWorkLog.projectId,
              title: copiedWorkLog.title,
              employeeId: employee.id,
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              projectType: "all",
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "粘贴失败");
          }
          const created = await res.json();
          const projectName =
            workLogProjectOptions.find(
              (project) => project.id === copiedWorkLog.projectId,
            )?.name ?? "-";
          setActualRows((prev) => [
            {
              id: created.id,
              title: copiedWorkLog.title,
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              employee: { id: employee.id, name: employee.name },
              project: { id: copiedWorkLog.projectId, name: projectName },
            },
            ...prev,
          ]);
          messageApi.success("已粘贴工时记录");
        } catch (error) {
          const text = error instanceof Error ? error.message : "粘贴失败";
          messageApi.error(text);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copiedWorkLog,
    employee,
    employeeActualRows,
    messageApi,
    selectedCalendarEntryId,
    workLogProjectOptions,
  ]);

  const totalActualHours = useMemo(() => {
    const visibleStart = calendarVisibleRange
      ? dayjs(calendarVisibleRange.start)
      : null;
    const visibleEnd = calendarVisibleRange
      ? dayjs(calendarVisibleRange.end)
      : null;

    return employeeActualRows.reduce((sum, row) => {
      const rowStart = dayjs(row.startDate);
      const rowEnd = dayjs(row.endDate);
      if (
        !rowStart.isValid() ||
        !rowEnd.isValid() ||
        !rowEnd.isAfter(rowStart)
      ) {
        return sum;
      }

      if (!visibleStart || !visibleEnd) {
        return sum + rowEnd.diff(rowStart, "minute") / 60;
      }

      const overlapStart = rowStart.isAfter(visibleStart)
        ? rowStart
        : visibleStart;
      const overlapEnd = rowEnd.isBefore(visibleEnd) ? rowEnd : visibleEnd;
      if (!overlapEnd.isAfter(overlapStart)) {
        return sum;
      }

      return sum + overlapEnd.diff(overlapStart, "minute") / 60;
    }, 0);
  }, [calendarVisibleRange, employeeActualRows]);

  const totalActualDays = useMemo(() => {
    const visibleStart = calendarVisibleRange
      ? dayjs(calendarVisibleRange.start)
      : null;
    const visibleEnd = calendarVisibleRange
      ? dayjs(calendarVisibleRange.end)
      : null;
    const dailyHoursMap = new Map<string, number>();
    const visibleSegments: Array<{ start: dayjs.Dayjs; hours: number }> = [];

    for (const row of employeeActualRows) {
      const rowStart = dayjs(row.startDate);
      const rowEnd = dayjs(row.endDate);
      if (
        !rowStart.isValid() ||
        !rowEnd.isValid() ||
        !rowEnd.isAfter(rowStart)
      ) {
        continue;
      }

      const overlapStart =
        visibleStart && rowStart.isBefore(visibleStart) ? visibleStart : rowStart;
      const overlapEnd =
        visibleEnd && rowEnd.isAfter(visibleEnd) ? visibleEnd : rowEnd;
      if (!overlapEnd.isAfter(overlapStart)) {
        continue;
      }

      const hours = overlapEnd.diff(overlapStart, "minute") / 60;
      const key = getActualWorkDateKey(overlapStart.toISOString());
      dailyHoursMap.set(key, (dailyHoursMap.get(key) ?? 0) + hours);
      visibleSegments.push({ start: overlapStart, hours });
    }

    return visibleSegments.reduce((sum, row) => {
      const key = getActualWorkDateKey(row.start.toISOString());
      const totalDailyHours = dailyHoursMap.get(key) ?? row.hours;
      return sum + calculateActualWorkdays(row.hours, totalDailyHours);
    }, 0);
  }, [calendarVisibleRange, employeeActualRows]);

  const calendarEvents = useMemo(
    () =>
      employeeActualRows.map((entry) => {
        const hours = Math.max(
          getActualWorkEntryHours(entry.startDate, entry.endDate),
          0,
        );
        return {
          id: entry.id,
          title: `${entry.title} ${formatHours(hours)}h`,
          start: entry.startDate,
          end: entry.endDate,
          extendedProps: {
            projectName: entry.project?.name ?? "",
          },
        };
      }),
    [employeeActualRows],
  );

  const openQuickCreateFromCalendar = (date: Date, allDay: boolean) => {
    if (!employee) return;
    void ensureWorkLogProjectOptionsLoaded();
    const base = dayjs(date);
    const start = allDay
      ? base.hour(9).minute(0).second(0).millisecond(0)
      : base;
    const end = start.add(1, "hour");

    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(undefined);
    setWorkLogDisableProjectSelect(false);
    setWorkLogInitialValues({
      id: `new-calendar-${Date.now()}`,
      projectId: "",
      title: "",
      employeeId: employee.id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    setWorkLogModalOpen(true);
  };

  const openEditWorkLogModal = (entry: ActualWorkEntryRow) => {
    if (!employee) return;
    void ensureWorkLogProjectOptionsLoaded();

    setWorkLogMode("edit");
    setEditingWorkLogId(entry.id);
    setWorkLogSelectedProjectId(entry.project?.id);
    setWorkLogDisableProjectSelect(false);
    setWorkLogInitialValues({
      id: entry.id,
      projectId: entry.project?.id ?? "",
      title: entry.title,
      employeeId: entry.employee?.id ?? employee.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
    });
    setWorkLogModalOpen(true);
  };

  const openCreateWorkLogFromTask = (task: WeeklyTaskCard) => {
    if (!employee) return;
    void ensureWorkLogProjectOptionsLoaded();
    const start = dayjs();
    const end = start.add(1, "hour");

    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(task.projectId);
    setWorkLogDisableProjectSelect(true);
    setWorkLogInitialValues({
      id: `new-task-${task.taskId}-${Date.now()}`,
      projectId: task.projectId,
      title: task.taskName,
      employeeId: employee.id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    setWorkLogModalOpen(true);
  };

  const handleSubmitWorkLog = async (payload: ActualWorkEntryFormPayload) => {
    setWorkLogSubmitting(true);
    try {
      let res: Response;
      if (workLogMode === "edit" && editingWorkLogId) {
        res = await fetch(
          `/api/actual-work-entries/${editingWorkLogId}?projectType=all`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              projectType: "all",
            }),
          },
        );
      } else {
        res = await fetch("/api/actual-work-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            projectType: "all",
          }),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text ||
            (workLogMode === "edit" ? "编辑实际工时失败" : "登记实际工时失败"),
        );
      }

      messageApi.success(workLogMode === "edit" ? "编辑工时成功" : "登记工时成功");
      setWorkLogModalOpen(false);
      setWorkLogInitialValues(null);
      setWorkLogMode("create");
      setEditingWorkLogId(null);
      setWorkLogSelectedProjectId(undefined);
      setWorkLogDisableProjectSelect(false);
      if (calendarVisibleRange && employee?.id) {
        await fetchActualRowsInRange(calendarVisibleRange, employee.id);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存工时失败";
      messageApi.error(text);
    } finally {
      setWorkLogSubmitting(false);
    }
  };

  const updateWorkLogTimeRange = async (
    entryId: string,
    startDate: string,
    endDate: string,
  ) => {
    const res = await fetch(`/api/actual-work-entries/${entryId}?projectType=all`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        projectType: "all",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "更新时间失败");
    }
  };

  const handleCalendarTimeChange = async (params: {
    entryId: string;
    start: Date | null;
    end: Date | null;
    revert: () => void;
  }) => {
    const targetRow = employeeActualRows.find((item) => item.id === params.entryId);
    if (!targetRow || !params.start) {
      params.revert();
      return;
    }

    const start = dayjs(params.start);
    const originalStart = dayjs(targetRow.startDate);
    const originalEnd = dayjs(targetRow.endDate);
    const originalDurationMinutes = Math.max(
      originalEnd.diff(originalStart, "minute"),
      1,
    );
    const end = params.end
      ? dayjs(params.end)
      : start.add(originalDurationMinutes, "minute");

    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      params.revert();
      messageApi.error("时间范围无效");
      return;
    }

    try {
      await updateWorkLogTimeRange(
        params.entryId,
        start.toISOString(),
        end.toISOString(),
      );
      setActualRows((prev) =>
        prev.map((item) =>
          item.id === params.entryId
            ? {
                ...item,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
              }
            : item,
        ),
      );
      messageApi.success("工时时间已更新");
    } catch (error) {
      params.revert();
      const text = error instanceof Error ? error.message : "更新时间失败";
      messageApi.error(text);
    }
  };

  if (!employee) {
    return (
      <>
        {contextHolder}
        <Card title={title ?? "实际工时"} extra={extra} type="inner">
          <Empty description="暂无可查看的员工" />
        </Card>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <Card title="本周任务" type="inner" style={{ marginBottom: 16 }}>
        <Spin spinning={weeklyTasksLoading}>
          {weeklyTasks.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {weeklyTasks.map((task) => (
                <Card
                  key={task.taskId}
                  hoverable
                  size="small"
                  title={task.taskName}
                  onClick={() => openCreateWorkLogFromTask(task)}
                  extra={
                    <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
                      点击记录工时
                    </span>
                  }
                >
                  <div style={{ color: "rgba(0,0,0,0.65)", marginBottom: 4 }}>
                    {task.projectName}
                  </div>
                  <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
                    计划工时 {formatSummaryNumber(task.plannedDays)}d
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="本周暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      </Card>
      <Card
        title={
          title ??
          `实际工时（总计 ${formatSummaryNumber(totalActualHours)}小时 | ${formatSummaryNumber(totalActualDays)}天）`
        }
        extra={extra}
        type="inner"
      >
        <Spin spinning={actualRowsLoading}>
          <div className="work-logs-calendar">
            <FullCalendar
              weekNumbers
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
              ]}
              locale={zhCnLocale}
              initialView={initialCalendarView}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
              }}
              views={{
                dayGridMonth: {
                  buttonText: "月",
                },
                timeGridWeek: {
                  buttonText: "周",
                },
                timeGridDay: {
                  buttonText: "日",
                },
                listMonth: {
                  buttonText: "列表",
                  eventOrder: "-start",
                },
              }}
              events={calendarEvents}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                meridiem: false,
                hour12: false,
              }}
              eventContent={(arg) => {
                const projectName =
                  (arg.event.extendedProps.projectName as string) ?? "";
                return (
                  <div>
                    <div style={{ fontSize: 10 }}>{arg.timeText}</div>
                    <div style={{ fontSize: 11 }}>{arg.event.title}</div>
                    {projectName ? (
                      <div
                        style={{
                          fontSize: 10,
                          lineHeight: "14px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {projectName}
                      </div>
                    ) : null}
                  </div>
                );
              }}
              slotMinTime="09:00:00"
              scrollTime="09:00:00"
              dayMaxEvents
              height="auto"
              editable
              eventStartEditable
              eventDurationEditable
              eventResizableFromStart
              datesSet={(info) => {
                setCalendarVisibleRange((prev) => {
                  const prevStart = prev?.start?.getTime?.() ?? null;
                  const prevEnd = prev?.end?.getTime?.() ?? null;
                  const nextStart = info.start.getTime();
                  const nextEnd = info.end.getTime();
                  if (prevStart === nextStart && prevEnd === nextEnd) {
                    return prev;
                  }
                  return {
                    start: info.start,
                    end: info.end,
                  };
                });
                if (searchParams.get(WORK_LOG_VIEW_PARAM) === info.view.type) {
                  return;
                }
                const params = new URLSearchParams(searchParams.toString());
                params.set(WORK_LOG_VIEW_PARAM, info.view.type);
                router.replace(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
              }}
              eventClick={(info) => {
                setSelectedCalendarEntryId(info.event.id);
                const entry = employeeActualRows.find(
                  (item) => item.id === info.event.id,
                );
                if (!entry) return;
                void openEditWorkLogModal(entry);
              }}
              eventDrop={(info) => {
                void handleCalendarTimeChange({
                  entryId: info.event.id,
                  start: info.event.start,
                  end: info.event.end,
                  revert: info.revert,
                });
              }}
              eventResize={(info) => {
                void handleCalendarTimeChange({
                  entryId: info.event.id,
                  start: info.event.start,
                  end: info.event.end,
                  revert: info.revert,
                });
              }}
              dateClick={(info) => {
                setSelectedCalendarEntryId(null);
                lastCalendarDateRef.current = {
                  date: info.date,
                  allDay: info.allDay,
                };
                const now = Date.now();
                const clickKey = `${info.dateStr}|${info.allDay ? "all" : "time"}`;
                const prev = lastCalendarClickRef.current;
                if (prev && prev.key === clickKey && now - prev.ts <= 300) {
                  lastCalendarClickRef.current = null;
                  void openQuickCreateFromCalendar(info.date, info.allDay);
                  return;
                }
                lastCalendarClickRef.current = { key: clickKey, ts: now };
              }}
            />
          </div>
        </Spin>
      </Card>
      <style jsx global>{`
        .work-logs-calendar .fc-day-sat,
        .work-logs-calendar .fc-day-sun {
          background-color: #faf6ea;
        }
      `}</style>
      <Modal
        title={workLogMode === "edit" ? "编辑实际工时" : "登记实际工时"}
        open={workLogModalOpen}
        onCancel={() => {
          if (workLogSubmitting) return;
          setWorkLogModalOpen(false);
          setWorkLogInitialValues(null);
          setWorkLogMode("create");
          setEditingWorkLogId(null);
          setWorkLogSelectedProjectId(undefined);
          setWorkLogDisableProjectSelect(false);
        }}
        footer={null}
        destroyOnHidden
      >
        <Spin spinning={workLogOptionsLoading}>
          <ActualWorkEntryForm
            projectOptions={workLogProjectOptions}
            projectOptionGroups={workLogProjectOptionGroups}
            selectedProjectId={workLogSelectedProjectId}
            employees={employees}
            initialValues={workLogInitialValues}
            disableProjectSelect={workLogDisableProjectSelect}
            disableEmployeeSelect
            onSubmit={handleSubmitWorkLog}
          />
        </Spin>
      </Modal>
    </>
  );
};

export default WorkLogsCalendar;
