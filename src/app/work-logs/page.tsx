"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Empty, message, Modal, Popconfirm, Row, Space, Spin } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";

type CurrentUser = {
  id: string;
  name: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type PlannedWorkEntryRow = {
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
  task?: {
    id: string;
    name: string;
    owner?: { id: string; name: string } | null;
    segment?: {
      id: string;
      name: string;
      project?: { id: string; name: string } | null;
    } | null;
  } | null;
};

type ActualWorkEntryRow = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
};

type WeekTaskCard = {
  taskId: string;
  taskName: string;
  projectId?: string;
  projectName: string;
  segmentName: string;
  ownerName: string;
  plannedDays: number;
  weekdays: string[];
};

type WorkLogFormInitialValues = ActualWorkEntryFormPayload & { id: string };
type WeekBoardColumn = {
  label: string;
  dateKey: string;
  totalHours: number;
  items: ActualWorkEntryRow[];
};
type WorkdayAdjustmentRow = {
  id: string;
  changeType: string;
  startDate: string;
  endDate: string;
};
type LeaveRecordRow = {
  id: string;
  startDate: string;
  endDate: string;
  employee?: { id: string; name: string } | null;
};

const weekdayLabels: Record<
  keyof Pick<
    PlannedWorkEntryRow,
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday"
  >,
  string
> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周日",
};

const getCurrentIsoWeek = () => {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return {
    year: utcDate.getUTCFullYear(),
    weekNumber,
  };
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatHours = (value: number) => {
  const normalized = Number(value.toFixed(1));
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
};

const isDateWithinRange = (dateKey: string, startDate: string, endDate: string) => {
  const target = dayjs(dateKey);
  const start = dayjs(startDate).startOf("day");
  const end = dayjs(endDate).endOf("day");
  return !target.isBefore(start) && !target.isAfter(end);
};

export default function WorkLogsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [plannedRows, setPlannedRows] = useState<PlannedWorkEntryRow[]>([]);
  const [actualRows, setActualRows] = useState<ActualWorkEntryRow[]>([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<WorkdayAdjustmentRow[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogSubmitting, setWorkLogSubmitting] = useState(false);
  const [workLogMode, setWorkLogMode] = useState<"create" | "edit">("create");
  const [editingWorkLogId, setEditingWorkLogId] = useState<string | null>(null);
  const [workLogProjectOptions, setWorkLogProjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [workLogSelectedProjectId, setWorkLogSelectedProjectId] = useState<string | undefined>(undefined);
  const [workLogDisableProjectSelect, setWorkLogDisableProjectSelect] = useState(false);
  const [workLogInitialValues, setWorkLogInitialValues] = useState<WorkLogFormInitialValues | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [meRes, plannedRes, actualRes, employeesRes, projectsRes, workdayRes, leaveRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/planned-work-entries?projectType=all", { cache: "no-store" }),
        fetch("/api/actual-work-entries?projectType=all", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/workday-adjustments", { cache: "no-store" }),
        fetch("/api/leave-records", { cache: "no-store" }),
      ]);

      if (!meRes.ok) {
        setCurrentUser(null);
        setPlannedRows([]);
        setActualRows([]);
        setEmployees([]);
        setWorkLogProjectOptions([]);
        setWorkdayAdjustments([]);
        setLeaveRecords([]);
        return;
      }

      const [me, planned, actual, employeeList, projects, adjustments, leaves] = await Promise.all([
        meRes.json(),
        plannedRes.ok ? plannedRes.json() : [],
        actualRes.ok ? actualRes.json() : [],
        employeesRes.ok ? employeesRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        workdayRes.ok ? workdayRes.json() : [],
        leaveRes.ok ? leaveRes.json() : [],
      ]);

      setCurrentUser({ id: me.id, name: me.name });
      setPlannedRows(Array.isArray(planned) ? planned : []);
      setActualRows(Array.isArray(actual) ? actual : []);
      setEmployees(Array.isArray(employeeList) ? employeeList : []);
      setWorkdayAdjustments(Array.isArray(adjustments) ? adjustments : []);
      setLeaveRecords(Array.isArray(leaves) ? leaves : []);
      setWorkLogProjectOptions(
        Array.isArray(projects)
          ? projects.map((project: { id: string; name: string }) => ({
              id: project.id,
              name: project.name,
            }))
          : [],
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const weekLabel = useMemo(() => {
    const { start, end } = getCurrentWeekRange();
    return `${dayjs(start).format("YYYY-MM-DD")} ~ ${dayjs(end).format("YYYY-MM-DD")}`;
  }, []);

  const weekTaskCards = useMemo<WeekTaskCard[]>(() => {
    if (!currentUser) return [];
    const currentWeek = getCurrentIsoWeek();
    const map = new Map<string, WeekTaskCard & { weekdaySet: Set<string> }>();

    plannedRows.forEach((entry) => {
      const task = entry.task;
      if (!task || task.owner?.id !== currentUser.id) return;
      if (entry.year !== currentWeek.year || entry.weekNumber !== currentWeek.weekNumber) return;

      const weekdays = Object.entries(weekdayLabels)
        .filter(([key]) => Boolean(entry[key as keyof typeof weekdayLabels]))
        .map(([, value]) => value);

      const existing = map.get(task.id);
      if (!existing) {
        map.set(task.id, {
          taskId: task.id,
          taskName: task.name,
          projectId: task.segment?.project?.id,
          projectName: task.segment?.project?.name ?? "-",
          segmentName: task.segment?.name ?? "-",
          ownerName: task.owner?.name ?? "-",
          plannedDays: entry.plannedDays,
          weekdays,
          weekdaySet: new Set(weekdays),
        });
        return;
      }

      existing.plannedDays += entry.plannedDays;
      weekdays.forEach((day) => existing.weekdaySet.add(day));
      existing.weekdays = Array.from(existing.weekdaySet);
    });

    const cards: WeekTaskCard[] = [];
    map.forEach((item) => {
      cards.push({
        taskId: item.taskId,
        taskName: item.taskName,
        projectId: item.projectId,
        projectName: item.projectName,
        segmentName: item.segmentName,
        ownerName: item.ownerName,
        plannedDays: item.plannedDays,
        weekdays: item.weekdays,
      });
    });

    return cards.sort((a, b) => {
      const byProject = a.projectName.localeCompare(b.projectName, "zh-CN");
      if (byProject !== 0) return byProject;
      return a.taskName.localeCompare(b.taskName, "zh-CN");
    });
  }, [currentUser, plannedRows]);

  const weekActualRows = useMemo(() => {
    if (!currentUser) return [];
    const { start, end } = getCurrentWeekRange();

    return actualRows
      .filter((entry) => {
        if (entry.employee?.id !== currentUser.id) return false;
        const startTime = new Date(entry.startDate).getTime();
        const endTime = new Date(entry.endDate).getTime();
        return startTime <= end.getTime() && endTime >= start.getTime();
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [actualRows, currentUser]);

  const totalActualHours = useMemo(() => {
    return weekActualRows.reduce((sum, row) => {
      const hours = Math.max(dayjs(row.endDate).diff(dayjs(row.startDate), "minute") / 60, 0);
      return sum + hours;
    }, 0);
  }, [weekActualRows]);

  const weekActualBoard = useMemo<WeekBoardColumn[]>(() => {
    if (!currentUser) return [];
    const { start } = getCurrentWeekRange();
    const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
    const columns = dayLabels.map((label, index) => {
      const date = dayjs(start).add(index, "day");
      return {
        label,
        dateKey: date.format("YYYY-MM-DD"),
        totalHours: 0,
        items: [],
      };
    });

    const columnMap = new Map(columns.map((column) => [column.dateKey, column]));
    weekActualRows.forEach((entry) => {
      const key = dayjs(entry.startDate).format("YYYY-MM-DD");
      const column = columnMap.get(key);
      if (!column) return;
      const hours = Math.max(dayjs(entry.endDate).diff(dayjs(entry.startDate), "minute") / 60, 0);
      column.totalHours += hours;
      column.items.push(entry);
    });

    columns.forEach((column) => {
      column.items.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    });

    return columns.filter((column) => {
      const date = dayjs(column.dateKey);
      const isWeekend = date.day() === 0 || date.day() === 6;
      let isWorkday = !isWeekend;

      const dayAdjustments = workdayAdjustments.filter((item) =>
        isDateWithinRange(column.dateKey, item.startDate, item.endDate),
      );
      if (dayAdjustments.some((item) => item.changeType === "上班")) {
        isWorkday = true;
      } else if (dayAdjustments.some((item) => item.changeType === "休息")) {
        isWorkday = false;
      }

      const hasLeave = leaveRecords.some((item) => {
        if (item.employee?.id !== currentUser.id) return false;
        return isDateWithinRange(column.dateKey, item.startDate, item.endDate);
      });
      if (hasLeave) {
        isWorkday = false;
      }

      const hasEntries = column.items.length > 0;
      if (isWorkday) return true;
      return hasEntries;
    });
  }, [currentUser, leaveRecords, weekActualRows, workdayAdjustments]);

  const openLogModal = (task: WeekTaskCard) => {
    if (!currentUser) return;
    if (!task.projectId) return;
    const now = dayjs();
    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(task.projectId);
    setWorkLogDisableProjectSelect(true);
    setWorkLogInitialValues({
      id: `new-${task.taskId}-${Date.now()}`,
      projectId: task.projectId,
      title: task.taskName,
      employeeId: currentUser.id,
      startDate: now.toISOString(),
      endDate: now.toISOString(),
    });
    setWorkLogModalOpen(true);
  };

  const openGeneralLogModal = () => {
    if (!currentUser) return;
    const now = dayjs();
    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(undefined);
    setWorkLogDisableProjectSelect(false);
    setWorkLogInitialValues({
      id: `new-general-${Date.now()}`,
      projectId: workLogProjectOptions[0]?.id ?? "",
      title: "",
      employeeId: currentUser.id,
      startDate: now.toISOString(),
      endDate: now.toISOString(),
    });
    setWorkLogModalOpen(true);
  };

  const openPlatformLogModal = () => {
    if (!currentUser) return;
    const now = dayjs();
    const preferredProjectId =
      workLogProjectOptions.find((project) => project.name.includes("中台"))?.id ??
      workLogProjectOptions[0]?.id ??
      "";

    setWorkLogMode("create");
    setEditingWorkLogId(null);
    setWorkLogSelectedProjectId(preferredProjectId || undefined);
    setWorkLogDisableProjectSelect(false);
    setWorkLogInitialValues({
      id: `new-platform-${Date.now()}`,
      projectId: preferredProjectId,
      title: "",
      employeeId: currentUser.id,
      startDate: now.toISOString(),
      endDate: now.toISOString(),
    });
    setWorkLogModalOpen(true);
  };

  const openEditWorkLogModal = (entry: ActualWorkEntryRow) => {
    if (!currentUser) return;
    setWorkLogMode("edit");
    setEditingWorkLogId(entry.id);
    setWorkLogSelectedProjectId(entry.project?.id);
    setWorkLogDisableProjectSelect(false);
    setWorkLogInitialValues({
      id: entry.id,
      projectId: entry.project?.id ?? workLogProjectOptions[0]?.id ?? "",
      title: entry.title,
      employeeId: entry.employee?.id ?? currentUser.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
    });
    setWorkLogModalOpen(true);
  };

  const handleDeleteWorkLog = async (entry: ActualWorkEntryRow) => {
    try {
      const res = await fetch(`/api/actual-work-entries/${entry.id}?projectType=all`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
      }
      message.success("删除成功");
      await fetchData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除失败";
      message.error(text);
    }
  };

  const handleSubmitWorkLog = async (payload: ActualWorkEntryFormPayload) => {
    setWorkLogSubmitting(true);
    try {
      let res: Response;
      if (workLogMode === "edit" && editingWorkLogId) {
        res = await fetch(`/api/actual-work-entries/${editingWorkLogId}?projectType=all`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            projectType: "all",
          }),
        });
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
        throw new Error(text || (workLogMode === "edit" ? "编辑实际工时失败" : "登记实际工时失败"));
      }

      message.success(workLogMode === "edit" ? "编辑工时成功" : "登记工时成功");
      setWorkLogModalOpen(false);
      setWorkLogInitialValues(null);
      setWorkLogMode("create");
      setEditingWorkLogId(null);
      setWorkLogSelectedProjectId(undefined);
      setWorkLogDisableProjectSelect(false);
      await fetchData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存工时失败";
      message.error(text);
    } finally {
      setWorkLogSubmitting(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      {loading ? (
        <Card>
          <Spin />
        </Card>
      ) : (
        <>
          <Card
            title={`本周任务（${weekLabel}）`}
            extra={
              <Space>
                <Button onClick={openPlatformLogModal} disabled={!currentUser}>
                  中台项目工时
                </Button>
                <Button type="primary" onClick={openGeneralLogModal} disabled={!currentUser}>
                  登记工时
                </Button>
              </Space>
            }
          >
            {weekTaskCards.length === 0 ? (
              <Empty description="本周暂无你的计划任务" />
            ) : (
              <Row gutter={[12, 12]}>
                {weekTaskCards.map((task) => (
                  <Col xs={24} sm={12} lg={8} key={task.taskId}>
                    <Card
                      size="small"
                      title={
                        <span>
                          任务：
                          <AppLink href={`/project-tasks/${task.taskId}`}>{task.taskName}</AppLink>
                        </span>
                      }
                      extra={
                        <Button
                          type="link"
                          size="small"
                          disabled={!currentUser}
                          onClick={() => openLogModal(task)}
                        >
                          登记工时
                        </Button>
                      }
                    >
                      <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                        <div>
                          项目：
                          {task.projectId ? (
                            <AppLink href={`/projects/${task.projectId}`}>{task.projectName}</AppLink>
                          ) : (
                            task.projectName
                          )}
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          <Card title={`实际工时（本周，总计 ${Number(totalActualHours.toFixed(2))} 小时）`}>
            {weekActualBoard.length === 0 ? (
              <Empty description="本周暂无你的实际工时记录" />
            ) : (
              <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                <div style={{ display: "flex", gap: 12, minWidth: weekActualBoard.length * 240 }}>
                  {weekActualBoard.map((column) => (
                    <div key={column.dateKey} style={{ flex: 1, minWidth: 240 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          marginBottom: 10,
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        <span>{column.label}</span>
                        <span style={{ color: "#999", fontWeight: 500, fontSize: 13 }}>
                          {formatHours(column.totalHours)}
                        </span>
                      </div>
                      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                        {column.items.map((entry) => {
                          const hours = Math.max(
                            dayjs(entry.endDate).diff(dayjs(entry.startDate), "minute") / 60,
                            0,
                          );
                          return (
                            <Card
                              key={entry.id}
                              size="small"
                              actions={[
                                <span
                                  key="edit"
                                  role="button"
                                  aria-label="编辑"
                                  title="编辑"
                                  onClick={() => openEditWorkLogModal(entry)}
                                  style={{ cursor: "pointer", display: "inline-flex" }}
                                >
                                  <EditOutlined />
                                </span>,
                                <Popconfirm
                                  key="delete"
                                  title={`确定删除工时「${entry.title}」？`}
                                  okText="删除"
                                  cancelText="取消"
                                  onConfirm={() => void handleDeleteWorkLog(entry)}
                                >
                                  <span
                                    role="button"
                                    aria-label="删除"
                                    title="删除"
                                    style={{ cursor: "pointer", display: "inline-flex", color: "#ff4d4f" }}
                                  >
                                    <DeleteOutlined />
                                  </span>
                                </Popconfirm>,
                              ]}
                            >
                              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                                <AppLink
                                  href={`/actual-work-entries/${entry.id}`}
                                  style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}
                                >
                                  {entry.title}
                                </AppLink>
                                <div style={{ fontSize: 12, color: "#555" }}>
                                  {entry.project ? (
                                    <AppLink href={`/projects/${entry.project.id}`}>
                                      {entry.project.name}
                                    </AppLink>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: "#555" }}>
                                  {dayjs(entry.startDate).format("YYYY年M月D日 HH:mm")} {"-"}{" "}
                                  {dayjs(entry.endDate).format("HH:mm")}{" "}
                                  {formatHours(hours)}h
                                </div>
                              </Space>
                            </Card>
                          );
                        })}
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

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
            <ActualWorkEntryForm
              projectOptions={workLogProjectOptions}
              selectedProjectId={workLogSelectedProjectId}
              disableProjectSelect={workLogDisableProjectSelect}
              employees={employees}
              initialValues={workLogInitialValues}
              disableEmployeeSelect
              onSubmit={handleSubmitWorkLog}
            />
          </Modal>
        </>
      )}
    </Space>
  );
}
