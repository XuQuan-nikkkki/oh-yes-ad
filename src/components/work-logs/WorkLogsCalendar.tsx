"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Card, Empty, Modal, Spin, message } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg } from "@fullcalendar/core";
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
  createRequest?: number;
  onEntryChanged?: () => void;
};

type WeeklyWorkItemCard = {
  workItemId: string;
  workItemName: string;
  projectId: string;
  projectName: string;
  dateLabel: string;
};

const WORK_LOG_VIEW_PARAM = "workLogView";
const WORK_LOG_DATE_PARAM = "workLogDate";

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

const normalizeQueryDate = (value: string | null) => {
  if (!value) return dayjs();
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : dayjs();
};

const WorkLogsCalendar = ({ employee, title, extra, createRequest = 0, onEntryChanged }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );
  const employees = useMemo<WorkLogsCalendarEmployee[]>(
    () => (employee ? [employee] : []),
    [employee],
  );
  const [actualRows, setActualRows] = useState<ActualWorkEntryRow[]>([]);
  const [actualRowsLoading, setActualRowsLoading] = useState(false);
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogSubmitting, setWorkLogSubmitting] = useState(false);
  const [workLogDeleting, setWorkLogDeleting] = useState(false);
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
  const [weeklyWorkItems, setWeeklyWorkItems] = useState<
    WeeklyWorkItemCard[]
  >([]);
  const [weeklyWorkItemsLoading, setWeeklyWorkItemsLoading] =
    useState(false);
  const lastCalendarClickRef = useRef<{ key: string; ts: number } | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [calendarVisibleRange, setCalendarVisibleRange] =
    useState<CalendarVisibleRange | null>(null);
  const initialCalendarView = useMemo(
    () => mapQueryViewToCalendarView(searchParams.get(WORK_LOG_VIEW_PARAM)),
    [searchParams],
  );
  const queryCalendarDate = useMemo(
    () => normalizeQueryDate(searchParams.get(WORK_LOG_DATE_PARAM)),
    [searchParams],
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const currentDate = dayjs(api.getDate());
    if (currentDate.isSame(queryCalendarDate, "day")) return;
    api.gotoDate(queryCalendarDate.toDate());
  }, [queryCalendarDate]);

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
      const allProjects = await fetchProjectsFromStore();

      const isArchivedProject = (project: {
        isArchived?: boolean | null;
        status?: string | null;
        statusOption?: { value?: string | null } | null;
      }) => {
        if (Boolean(project.isArchived)) return true;
        const statusValue = project.statusOption?.value ?? project.status ?? "";
        return statusValue === "已归档";
      };

      const normalizedProjects = Array.isArray(allProjects)
        ? (allProjects as Array<{
            id?: string | null;
            name?: string | null;
            isArchived?: boolean | null;
            type?: string | null;
            typeOption?: { value?: string | null } | null;
            status?: string | null;
            statusOption?: {
              value?: string | null;
              order?: number | null;
            } | null;
          }>)
            .filter((project) => project.id && project.name && !isArchivedProject(project))
            .map((project) => {
              const typeValue = project.typeOption?.value ?? project.type ?? "";
              return {
                id: String(project.id),
                name: String(project.name),
                status: project.statusOption?.value ?? project.status ?? null,
                statusOrder: project.statusOption?.order ?? null,
                isInternal: typeValue === "内部项目" || typeValue === "INTERNAL",
                isPlatform: String(project.name).trim().includes("中台项目"),
              };
            })
        : [];

      const statusGroupedProjects = normalizedProjects.filter(
        (project) => !project.isInternal && !project.isPlatform,
      );
      const platformProjects = normalizedProjects
        .filter((project) => project.isPlatform)
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
      const internalProjects = normalizedProjects
        .filter((project) => project.isInternal && !project.isPlatform)
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));

      const statusOptionGroups = Array.from(
        statusGroupedProjects.reduce<
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
          const option = {
            id: project.id,
            name: project.name,
            status: project.status,
            statusOrder: project.statusOrder,
          };
          if (!existing) {
            groups.set(label, {
              label,
              order: nextOrder,
              options: [option],
            });
            return groups;
          }
          existing.options.push(option);
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
        }));

      const internalGroupOptions = new Map<string, { label: string; value: string }>();
      for (const project of platformProjects) {
        internalGroupOptions.set(project.id, { label: project.name, value: project.id });
      }
      for (const project of internalProjects) {
        internalGroupOptions.set(project.id, { label: project.name, value: project.id });
      }

      const groupedProjectOptions: DefaultOptionType[] = [
        ...statusOptionGroups,
        ...(internalGroupOptions.size > 0
          ? [
              {
                label: "内部项目",
                options: Array.from(internalGroupOptions.values()),
              },
            ]
          : []),
      ];

      const projectList = normalizedProjects
        .map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          statusOrder: project.statusOrder,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

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
        setWeeklyWorkItems([]);
        return;
      }
      setWeeklyWorkItemsLoading(true);
      try {
        const weekStart = dayjs().startOf("isoWeek");
        const params = new URLSearchParams({
          employeeId: employee.id,
          weekStart: weekStart.format("YYYY-MM-DD"),
          weekEnd: weekStart.add(7, "day").format("YYYY-MM-DD"),
        });
        const response = await fetch(`/api/work-items/weekly?${params.toString()}`, {
          cache: "no-store",
        });
        const rows = response.ok ? await response.json() : [];
        setWeeklyWorkItems(Array.isArray(rows) ? rows as WeeklyWorkItemCard[] : []);
      } finally {
        setWeeklyWorkItemsLoading(false);
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

  const lastCreateRequestRef = useRef(0);
  useEffect(() => {
    if (createRequest === lastCreateRequestRef.current) return;
    lastCreateRequestRef.current = createRequest;
    if (createRequest <= 0) return;
    openQuickCreateFromCalendar(new Date(), false);
  // A counter represents an explicit action from the parent, not a calendar state change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

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

  const openCreateWorkLogFromWorkItem = (
    workItem: WeeklyWorkItemCard,
  ) => {
    if (!employee) return;
    void ensureWorkLogProjectOptionsLoaded();
    const start = dayjs();
    const end = start.add(1, "hour");

    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(workItem.projectId);
    setWorkLogDisableProjectSelect(true);
    setWorkLogInitialValues({
      id: `new-work-item-${workItem.workItemId}-${Date.now()}`,
      projectId: workItem.projectId,
      title: workItem.workItemName,
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
      resetWorkLogModalState();
      if (calendarVisibleRange && employee?.id) {
        await fetchActualRowsInRange(calendarVisibleRange, employee.id);
      }
      onEntryChanged?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存工时失败";
      messageApi.error(text);
    } finally {
      setWorkLogSubmitting(false);
    }
  };

  const resetWorkLogModalState = () => {
    setWorkLogModalOpen(false);
    setWorkLogInitialValues(null);
    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(undefined);
    setWorkLogDisableProjectSelect(false);
  };

  const handleDeleteWorkLog = async () => {
    if (workLogMode !== "edit" || !editingWorkLogId) return;
    const confirmed = window.confirm("确定删除这条工时记录？");
    if (!confirmed) return;

    setWorkLogDeleting(true);
    try {
      const res = await fetch(
        `/api/actual-work-entries/${editingWorkLogId}?projectType=all`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error((await res.text()) || "删除工时失败");
      }

      messageApi.success("删除工时成功");
      resetWorkLogModalState();
      if (calendarVisibleRange && employee?.id) {
        await fetchActualRowsInRange(calendarVisibleRange, employee.id);
      }
      onEntryChanged?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除工时失败";
      messageApi.error(text);
    } finally {
      setWorkLogDeleting(false);
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
      onEntryChanged?.();
    } catch (error) {
      params.revert();
      const text = error instanceof Error ? error.message : "更新时间失败";
      messageApi.error(text);
    }
  };

  const syncCalendarSearchParams = (info: DatesSetArg) => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get(WORK_LOG_VIEW_PARAM) !== info.view.type) {
      params.set(WORK_LOG_VIEW_PARAM, info.view.type);
      changed = true;
    }

    const currentStart = dayjs(info.view.currentStart).format("YYYY-MM-DD");
    if (params.get(WORK_LOG_DATE_PARAM) !== currentStart) {
      params.set(WORK_LOG_DATE_PARAM, currentStart);
      changed = true;
    }

    if (!changed) return;
    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
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
      <Card title="本周工作项" type="inner" style={{ marginBottom: 16 }}>
        <Spin spinning={weeklyWorkItemsLoading}>
          {weeklyWorkItems.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {weeklyWorkItems.map((workItem) => (
                <Card
                  key={workItem.workItemId}
                  hoverable
                  size="small"
                  title={workItem.workItemName}
                  onClick={() => openCreateWorkLogFromWorkItem(workItem)}
                  extra={
                    <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
                      点击记录工时
                    </span>
                  }
                >
                  <div style={{ color: "rgba(0,0,0,0.65)", marginBottom: 4 }}>
                    {workItem.projectName}
                  </div>
                  <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
                    {workItem.dateLabel}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              description="本周暂无工作项"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
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
              ref={calendarRef}
              weekNumbers
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
              ]}
              locale={zhCnLocale}
              initialView={initialCalendarView}
              initialDate={queryCalendarDate.toDate()}
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
                const eventDurationMinutes = (() => {
                  const start = arg.event.start?.getTime();
                  const end = arg.event.end?.getTime();
                  if (typeof start !== "number" || typeof end !== "number") {
                    return null;
                  }
                  return Math.max(Math.round((end - start) / (1000 * 60)), 0);
                })();
                const isCompactEvent =
                  arg.view.type !== "listMonth" &&
                  typeof eventDurationMinutes === "number" &&
                  eventDurationMinutes <= 30;
                const showProjectName =
                  !isCompactEvent &&
                  Boolean(projectName) &&
                  (typeof eventDurationMinutes !== "number" ||
                    eventDurationMinutes >= 60);
                return (
                  <div
                    style={{
                      height: "100%",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    {!isCompactEvent ? (
                      <div
                        style={{
                          fontSize: 10,
                          lineHeight: "12px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {arg.timeText}
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {arg.event.title}
                    </div>
                    {showProjectName ? (
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
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              scrollTime="00:00:00"
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
                syncCalendarSearchParams(info);
              }}
              eventClick={(info) => {
                if (!canEditWorkLogs) {
                  router.push(`/actual-work-entries/${info.event.id}`);
                  return;
                }
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
                if (!canEditWorkLogs) return;
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

        .work-logs-calendar .fc-timegrid-event {
          overflow: hidden;
        }

        .work-logs-calendar .fc-timegrid-event .fc-event-main {
          overflow: hidden;
        }
      `}</style>
      <Modal
        title={workLogMode === "edit" ? "修改工时记录" : "创建工时记录"}
        open={workLogModalOpen}
        onCancel={() => {
          if (workLogSubmitting || workLogDeleting) return;
          resetWorkLogModalState();
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
            submitBlock={workLogMode !== "edit"}
            extraActions={
              workLogMode === "edit" ? (
                <Button
                  danger
                  onClick={() => void handleDeleteWorkLog()}
                  loading={workLogDeleting}
                  disabled={workLogSubmitting || workLogDeleting}
                  style={{ flex: 1, width: "50%" }}
                >
                  删除
                </Button>
              ) : null
            }
            onSubmit={handleSubmitWorkLog}
          />
        </Spin>
      </Modal>
    </>
  );
};

export default WorkLogsCalendar;
