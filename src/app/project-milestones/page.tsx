"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Divider, Empty, Radio, Space, Spin, Tooltip } from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ListPageContainer from "@/components/ListPageContainer";
import ProjectMilestonesTable, {
  ProjectMilestoneRow,
} from "@/components/ProjectMilestonesTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import type { ProjectMilestoneFormPayload } from "@/components/project-detail/ProjectMilestoneForm";
import ProjectMilestoneFormModal from "@/components/project-detail/ProjectMilestoneFormModal";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";

type Option = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type ProjectContext = {
  members: Option[];
  vendors: Option[];
  clientParticipants: Option[];
};

const EMPTY_CONTEXT: ProjectContext = {
  members: [],
  vendors: [],
  clientParticipants: [],
};

const TIMELINE_DAY_COUNT = 45;
const TIMELINE_DAY_WIDTH = 56;
const PROJECT_COLUMN_WIDTH = 220;
const TIMELINE_WEEK_HEADER_HEIGHT = 34;
const TIMELINE_DAY_HEADER_HEIGHT = 58;
const MILESTONE_BAR_SIDE_PADDING = 12;
const MILESTONE_BAR_MIN_GAP = 8;

dayjs.extend(isoWeek);

const toOpaqueColor = (raw: string | null | undefined) => {
  const value = (raw ?? "").trim();
  if (!value) return "#d9d9d9";
  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return `#${value.slice(1, 7)}`;
  }
  const rgbaMatch = value.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+)?\s*\)$/i,
  );
  if (rgbaMatch) {
    const r = Math.min(255, Number(rgbaMatch[1]));
    const g = Math.min(255, Number(rgbaMatch[2]));
    const b = Math.min(255, Number(rgbaMatch[3]));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return value;
};

const parseColorToRgb = (raw: string | null | undefined) => {
  const value = toOpaqueColor(raw);
  const hexMatch = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  const rgbMatch = value.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );
  if (rgbMatch) {
    return {
      r: Math.min(255, Number(rgbMatch[1])),
      g: Math.min(255, Number(rgbMatch[2])),
      b: Math.min(255, Number(rgbMatch[3])),
    };
  }
  return { r: 217, g: 217, b: 217 };
};

const toPastelColor = (raw: string | null | undefined) => {
  const { r, g, b } = parseColorToRgb(raw);
  const mix = 0.82;
  const rr = Math.round(r * (1 - mix) + 255 * mix);
  const gg = Math.round(g * (1 - mix) + 255 * mix);
  const bb = Math.round(b * (1 - mix) + 255 * mix);
  return `rgb(${rr}, ${gg}, ${bb})`;
};

const getTypeLineCount = (typeLabel?: string | null) => {
  const text = (typeLabel ?? "").trim();
  if (!text) return 0;
  return Array.from(text).length <= 2 ? 1 : 2;
};

const splitTypeLabelToTwoLines = (typeLabel?: string | null) => {
  const chars = Array.from((typeLabel ?? "").trim());
  if (chars.length <= 2) {
    return { firstLine: chars.join(""), secondLine: "" };
  }
  const mid = Math.ceil(chars.length / 2);
  return {
    firstLine: chars.slice(0, mid).join(""),
    secondLine: chars.slice(mid).join(""),
  };
};

const estimateTextWidth = (text: string, fontSize: number) => {
  let width = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      width += fontSize;
    } else if (/\s/.test(ch)) {
      width += fontSize * 0.35;
    } else {
      width += fontSize * 0.62;
    }
  }
  return Math.ceil(width);
};

const formatTimelineMilestoneDateLabel = (milestone: {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  datePrecision?: "DATE" | "DATETIME" | null;
}) => {
  const withTime = milestone.datePrecision === "DATETIME";
  const dateFmt = withTime ? "M/D HH:mm" : "M/D";
  const isRange = milestone.start.valueOf() !== milestone.end.valueOf();
  if (!isRange) return milestone.start.format(dateFmt);
  if (withTime && milestone.start.isSame(milestone.end, "day")) {
    return `${milestone.start.format("M/D HH:mm")} ~ ${milestone.end.format("HH:mm")}`;
  }
  return `${milestone.start.format(dateFmt)} ~ ${milestone.end.format(dateFmt)}`;
};

function ProjectMilestonesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [allEmployees, setAllEmployees] = useState<Option[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("timeline");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneRow | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined,
  );
  const [projectContext, setProjectContext] = useState<ProjectContext>(EMPTY_CONTEXT);
  const { canManageProject } = useProjectPermission();
  const rows = useProjectMilestonesStore((state) => state.rows);
  const rowsLoading = useProjectMilestonesStore((state) => state.loading);
  const fetchMilestonesFromStore = useProjectMilestonesStore(
    (state) => state.fetchMilestones,
  );
  const upsertMilestones = useProjectMilestonesStore(
    (state) => state.upsertMilestones,
  );
  const removeMilestone = useProjectMilestonesStore((state) => state.removeMilestone);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const workdayAdjustments = useWorkdayAdjustmentsStore((state) => state.adjustments);
  const workdayAdjustmentsLoaded = useWorkdayAdjustmentsStore(
    (state) => state.loaded,
  );
  const fetchWorkdayAdjustments = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchData = useCallback(async () => {
    await fetchMilestonesFromStore();
  }, [fetchMilestonesFromStore]);

  const fetchEmployees = useCallback(async () => {
    const employees = await fetchEmployeesFromStore();
    setAllEmployees(
      Array.isArray(employees)
        ? employees.map((item) => ({
            id: item.id,
            name: item.name,
            employmentStatus: item.employmentStatus ?? undefined,
          }))
        : [],
    );
  }, [fetchEmployeesFromStore]);

  const fetchProjectOptions = useCallback(async () => {
    const projects = await fetchProjectsFromStore();
    setProjectOptions(
      Array.isArray(projects)
        ? projects
            .filter((item): item is { id: string; name: string } =>
              Boolean(item.id && item.name),
            )
            .map((item) => ({ id: item.id, name: item.name }))
        : [],
    );
  }, [fetchProjectsFromStore]);

  const fetchProjectContext = useCallback(async (projectId?: string) => {
    if (!projectId) {
      setProjectContext(EMPTY_CONTEXT);
      return;
    }
    const projectRes = await fetch(`/api/projects/${projectId}`);
    if (!projectRes.ok) {
      setProjectContext(EMPTY_CONTEXT);
      return;
    }

    const project = (await projectRes.json()) as {
      members?: Option[];
      vendors?: Option[];
      client?: { id: string } | null;
    };

    let clientParticipants: Option[] = [];
    if (project.client?.id) {
      const contactsRes = await fetch(`/api/clients/${project.client.id}/contacts`);
      if (contactsRes.ok) {
        const contacts = (await contactsRes.json()) as Array<{ id: string; name: string }>;
        clientParticipants = contacts.map((item) => ({
          id: item.id,
          name: item.name,
        }));
      }
    }

    setProjectContext({
      members: project.members ?? [],
      vendors: project.vendors ?? [],
      clientParticipants,
    });
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const viewModeFromSearchParams = useMemo<"table" | "timeline">(() => {
    return searchParams.get("view") === "table" ? "table" : "timeline";
  }, [searchParams]);

  useEffect(() => {
    setViewMode(viewModeFromSearchParams);
  }, [viewModeFromSearchParams]);

  useEffect(() => {
    if (!open) return;
    void fetchProjectContext(selectedProjectId);
  }, [fetchProjectContext, open, selectedProjectId]);

  useEffect(() => {
    if (!open) return;
    if (allEmployees.length > 0) return;
    void fetchEmployees();
  }, [allEmployees.length, fetchEmployees, open]);

  useEffect(() => {
    if (!open) return;
    void fetchProjectOptions();
  }, [fetchProjectOptions, open]);

  useEffect(() => {
    if (workdayAdjustmentsLoaded) return;
    void fetchWorkdayAdjustments();
  }, [fetchWorkdayAdjustments, workdayAdjustmentsLoaded]);

  const onEdit = (row: ProjectMilestoneRow) => {
    if (!canManageProject) return;
    setEditing(row);
    setSelectedProjectId(row.project?.id);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/project-milestones/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeMilestone(id);
  };

  const onSubmit = async (payload: ProjectMilestoneFormPayload) => {
    if (!canManageProject) return;
    const projectId = payload.projectId ?? selectedProjectId;
    if (!projectId) return;

    const body = {
      ...payload,
      projectId,
    };

    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-milestones/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/project-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setOpen(false);
    setEditing(null);
    if (!res.ok) {
      await fetchMilestonesFromStore(true);
      return;
    }
    const next = (await res.json()) as ProjectMilestoneRow | null;
    if (next?.id) {
      upsertMilestones([next]);
      return;
    }
    await fetchMilestonesFromStore(true);
  };

  const refreshMilestone = useCallback(
    async (milestoneId: string) => {
      const res = await fetch(`/api/project-milestones/${milestoneId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "获取里程碑失败");
      }
      const next = (await res.json()) as ProjectMilestoneRow | null;
      if (next?.id) {
        upsertMilestones([next]);
      }
    },
    [upsertMilestones],
  );

  const updateMilestoneSelectOption = useCallback(
    async (
      milestoneId: string,
      field: "type" | "method",
      nextOption: { id: string; value: string; color: string },
    ) => {
      const res = await fetch(`/api/project-milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: nextOption,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "更新里程碑选项失败");
      }

      const next = (await res.json()) as ProjectMilestoneRow | null;
      if (next?.id) {
        upsertMilestones([next]);
      }
    },
    [upsertMilestones],
  );

  const timelineDays = useMemo(() => {
    const start = dayjs().startOf("day");
    return Array.from({ length: TIMELINE_DAY_COUNT }, (_, index) =>
      start.add(index, "day"),
    );
  }, []);

  const timelineDayMeta = useMemo(() => {
    const restDays = new Set<string>();
    const forcedWorkDays = new Set<string>();
    const toDayKey = (value: dayjs.Dayjs) => value.format("YYYY-MM-DD");
    const weekdayLabel = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    workdayAdjustments.forEach((item) => {
      const start = dayjs(item.startDate).startOf("day");
      const end = dayjs(item.endDate).startOf("day");
      if (!start.isValid() || !end.isValid()) return;
      const changeType = (item.changeType ?? "").trim();
      const isRestType = changeType.includes("休");
      const isWorkType = changeType.includes("班") || changeType.includes("工作");
      if (!isRestType && !isWorkType) return;
      const rangeEnd = end.isBefore(start) ? start : end;
      let cursor = start;
      while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, "day")) {
        const key = toDayKey(cursor);
        if (isRestType) {
          restDays.add(key);
          forcedWorkDays.delete(key);
        }
        if (isWorkType) {
          forcedWorkDays.add(key);
          restDays.delete(key);
        }
        cursor = cursor.add(1, "day");
      }
    });

    return timelineDays.map((day) => {
      const key = toDayKey(day);
      const weekday = day.day();
      const defaultWeekend = weekday === 0 || weekday === 6;
      const isAdjustedRestOnWorkday = !defaultWeekend && restDays.has(key);
      const isAdjustedWorkOnWeekend = defaultWeekend && forcedWorkDays.has(key);
      const isRestDay = restDays.has(key) || (defaultWeekend && !forcedWorkDays.has(key));
      return {
        key,
        day,
        weekdayText: weekdayLabel[weekday],
        weekNumber: day.isoWeek(),
        isoWeekYear: day.isoWeekYear(),
        isToday: day.isSame(dayjs(), "day"),
        isRestDay,
        adjustmentMark: isAdjustedRestOnWorkday
          ? "休"
          : isAdjustedWorkOnWeekend
            ? "班"
            : null,
      };
    });
  }, [timelineDays, workdayAdjustments]);

  const timelineWeekGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      weekNumber: number;
      start: dayjs.Dayjs;
      end: dayjs.Dayjs;
      length: number;
      hasRestDay: boolean;
    }> = [];

    timelineDayMeta.forEach((meta) => {
      const key = `${meta.isoWeekYear}-${meta.weekNumber}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.length += 1;
        last.end = meta.day;
        if (meta.isRestDay) last.hasRestDay = true;
        return;
      }
      groups.push({
        key,
        weekNumber: meta.weekNumber,
        start: meta.day,
        end: meta.day,
        length: 1,
        hasRestDay: meta.isRestDay,
      });
    });

    return groups;
  }, [timelineDayMeta]);

  const weekBoundaryAfterIndexes = useMemo(() => {
    const now = dayjs();
    const currentIsoWeek = now.isoWeek();
    const currentIsoWeekYear = now.isoWeekYear();

    const boundaries: Array<{ index: number; color: string }> = [];
    for (let i = 0; i < timelineDayMeta.length - 1; i += 1) {
      const current = timelineDayMeta[i];
      const next = timelineDayMeta[i + 1];
      if (
        current.weekNumber !== next.weekNumber ||
        current.isoWeekYear !== next.isoWeekYear
      ) {
        const isCurrentToNextBoundary =
          current.weekNumber === currentIsoWeek &&
          current.isoWeekYear === currentIsoWeekYear;
        boundaries.push({
          index: i,
          color: isCurrentToNextBoundary ? "#CFDBEE" : "#D1DBC9",
        });
      }
    }
    return boundaries;
  }, [timelineDayMeta]);

  const weekBoundaryAfterIndexSet = useMemo(
    () => new Set(weekBoundaryAfterIndexes.map((item) => item.index)),
    [weekBoundaryAfterIndexes],
  );

  const todayColumnIndex = useMemo(
    () => timelineDayMeta.findIndex((meta) => meta.isToday),
    [timelineDayMeta],
  );

  const timelineProjects = useMemo(() => {
    const today = dayjs().startOf("day");
    const projectMap = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        urgentDate: dayjs.Dayjs;
        milestones: Array<{
          id: string;
          name: string;
          typeLabel?: string | null;
          start: dayjs.Dayjs;
          end: dayjs.Dayjs;
          startDay: dayjs.Dayjs;
          endDay: dayjs.Dayjs;
          datePrecision?: "DATE" | "DATETIME" | null;
          detail?: string | null;
          method?: string | null;
          location?: string | null;
          internalParticipantNames?: string[];
          clientParticipantNames?: string[];
          vendorParticipantNames?: string[];
          color: string;
          lane?: number;
          renderWidth?: number;
        }>;
      }
    >();

    rows.forEach((row) => {
      const rowWithParticipants = row as ProjectMilestoneRow & {
        internalParticipants?: Array<{ name?: string | null }>;
        clientParticipants?: Array<{ name?: string | null }>;
        vendorParticipants?: Array<{ name?: string | null }>;
      };
      const projectId = row.project?.id;
      const projectName = row.project?.name?.trim();
      const isClientProject = Boolean(row.project?.client?.id);
      if (!projectId || !projectName || !isClientProject) return;
      const startRaw = row.startAt ?? row.date;
      if (!startRaw) return;
      const start = dayjs(startRaw);
      if (!start.isValid()) return;
      const endRaw = row.endAt ?? row.date ?? row.startAt;
      const endParsed = endRaw ? dayjs(endRaw) : start;
      if (!endParsed.isValid()) return;
      const end = endParsed.isBefore(start) ? start : endParsed;
      const startDay = start.startOf("day");
      const endDay = end.startOf("day");
      if (endDay.isBefore(today)) return;

      const urgentDate = startDay.isBefore(today) ? today : startDay;
      const existing = projectMap.get(projectId);
      const normalizedMilestone = {
        id: row.id,
        name: row.name || "未命名里程碑",
        typeLabel: row.typeOption?.value ?? row.type ?? null,
        start,
        end,
        startDay,
        endDay,
        datePrecision: row.datePrecision ?? null,
        detail: row.detail ?? null,
        method: row.methodOption?.value ?? row.method ?? null,
        location: row.location ?? null,
        internalParticipantNames:
          rowWithParticipants.internalParticipants
            ?.map((item) => item.name ?? "")
            .filter(Boolean) ?? [],
        clientParticipantNames:
          rowWithParticipants.clientParticipants
            ?.map((item) => item.name ?? "")
            .filter(Boolean) ?? [],
        vendorParticipantNames:
          rowWithParticipants.vendorParticipants
            ?.map((item) => item.name ?? "")
            .filter(Boolean) ?? [],
        color: toOpaqueColor(row.typeOption?.color),
      };
      if (!existing) {
        projectMap.set(projectId, {
          projectId,
          projectName,
          urgentDate,
          milestones: [normalizedMilestone],
        });
        return;
      }
      if (urgentDate.isBefore(existing.urgentDate)) {
        existing.urgentDate = urgentDate;
      }
      existing.milestones.push(normalizedMilestone);
    });

    const hasAsciiPrefix = (value: string) => /^[a-zA-Z][-.]/.test(value.trim());
    const compareProjectName = (a: string, b: string) => {
      const aPrefix = hasAsciiPrefix(a);
      const bPrefix = hasAsciiPrefix(b);
      if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
      return a.localeCompare(b, "zh-CN", { sensitivity: "base", numeric: true });
    };

    return Array.from(projectMap.values())
      .map((project) => ({
        ...project,
        milestones: (() => {
          const sorted = [...project.milestones].sort((a, b) => {
            if (a.start.isSame(b.start, "day")) {
              return a.name.localeCompare(b.name, "zh-CN", {
                sensitivity: "base",
                numeric: true,
              });
            }
            return a.start.valueOf() - b.start.valueOf();
          });

          // Lane packing by visual width to guarantee no visual overlap.
          const laneLastRight: number[] = [];
          const timelineBase = timelineDays[0];
          const withLanes = sorted.map((item) => {
            const dayOffsetStart = Math.max(
              0,
              item.startDay.diff(timelineBase, "day"),
            );
            const dayOffsetEnd = Math.min(
              TIMELINE_DAY_COUNT - 1,
              item.endDay.diff(timelineBase, "day"),
            );
            const widthDays = Math.max(1, dayOffsetEnd - dayOffsetStart + 1);
            const minSpanWidth = widthDays * TIMELINE_DAY_WIDTH - 4;
            const dateText = formatTimelineMilestoneDateLabel(item);
            const typeText = item.typeLabel?.trim() ?? "";
            const typeLineCount = getTypeLineCount(typeText);
            const typeBlockWidth = typeText
              ? typeLineCount <= 1
                ? Math.max(26, estimateTextWidth(typeText, 11) + 10)
                : 30
              : 0;
            const contentWidth = Math.max(
              estimateTextWidth(item.name, 12),
              estimateTextWidth(dateText, 11) + (typeText ? estimateTextWidth(typeText, 11) + 6 : 0),
            );
            const textWidth = contentWidth + typeBlockWidth + (typeText ? 6 : 0);
            const renderWidth = Math.max(
              minSpanWidth,
              textWidth + MILESTONE_BAR_SIDE_PADDING * 2,
            );
            const left = dayOffsetStart * TIMELINE_DAY_WIDTH + 2;
            const right = left + renderWidth;

            let assignedLane = -1;
            for (let lane = 0; lane < laneLastRight.length; lane += 1) {
              if (left >= laneLastRight[lane] + MILESTONE_BAR_MIN_GAP) {
                assignedLane = lane;
                break;
              }
            }
            if (assignedLane < 0) {
              assignedLane = laneLastRight.length;
              laneLastRight.push(right);
            } else {
              laneLastRight[assignedLane] = right;
            }
            return {
              ...item,
              lane: assignedLane,
              renderWidth,
            };
          });

          return withLanes;
        })(),
      }))
      .sort((a, b) => {
        if (a.urgentDate.isSame(b.urgentDate, "day")) {
          return compareProjectName(a.projectName, b.projectName);
        }
        return a.urgentDate.valueOf() - b.urgentDate.valueOf();
      });
  }, [rows, timelineDays]);

  const toolbarActions = [
    <Radio.Group
      key="view-mode"
      optionType="button"
      value={viewMode}
      onChange={(event) => {
        const nextViewMode = event.target.value as "table" | "timeline";
        setViewMode(nextViewMode);
        const nextSearchParams = new URLSearchParams(searchParams.toString());
        if (nextViewMode === "timeline") {
          nextSearchParams.delete("view");
        } else {
          nextSearchParams.set("view", nextViewMode);
        }
        const nextQuery = nextSearchParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      }}
      options={[
        { label: "时间轴", value: "timeline" },
        { label: "表格", value: "table" },
      ]}
    />,
    <Button
      key="create-project-milestone"
      type="primary"
      disabled={!canManageProject}
      onClick={() => {
        if (!canManageProject) return;
        setEditing(null);
        setSelectedProjectId(undefined);
        setOpen(true);
      }}
    >
      新增里程碑
    </Button>,
  ];

  return (
    <ListPageContainer>
      {viewMode === "table" ? (
        <ProjectMilestonesTable
          rows={rows}
          loading={rowsLoading}
          onEdit={onEdit}
          onDelete={(id) => {
            void onDelete(id);
          }}
          renderTypeOption={(record) => (
            <SelectOptionQuickEditTag
              field="projectMilestone.type"
              option={record.typeOption ?? null}
              disabled={!canManageProject}
              modalTitle="修改里程碑类型"
              modalDescription="勾选只会暂存类型切换。点击保存后会一并保存选项改动、排序和里程碑类型。"
              optionValueLabel="类型值"
              saveSuccessText="里程碑类型已保存"
              onSaveSelection={(nextOption) =>
                updateMilestoneSelectOption(record.id, "type", nextOption)
              }
              onUpdated={async () => {
                await refreshMilestone(record.id);
              }}
            />
          )}
          renderMethodOption={(record) => (
            <SelectOptionQuickEditTag
              field="projectMilestone.method"
              option={record.methodOption ?? null}
              disabled={!canManageProject}
              modalTitle="修改里程碑方式"
              modalDescription="勾选只会暂存方式切换。点击保存后会一并保存选项改动、排序和里程碑方式。"
              optionValueLabel="方式值"
              saveSuccessText="里程碑方式已保存"
              onSaveSelection={(nextOption) =>
                updateMilestoneSelectOption(record.id, "method", nextOption)
              }
              onUpdated={async () => {
                await refreshMilestone(record.id);
              }}
            />
          )}
          actionsDisabled={!canManageProject}
          headerTitle={<ProTableHeaderTitle>项目里程碑</ProTableHeaderTitle>}
          toolbarActions={toolbarActions}
        />
      ) : (
        <div
          style={{
            paddingInline: 16,
            paddingTop: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ProTableHeaderTitle>项目里程碑</ProTableHeaderTitle>
            <Space size={8}>{toolbarActions}</Space>
          </div>
          <Spin spinning={rowsLoading}>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                overflowX: "auto",
                background: "#fff",
              }}
            >
              <div
                style={{
                  minWidth:
                    PROJECT_COLUMN_WIDTH + TIMELINE_DAY_COUNT * TIMELINE_DAY_WIDTH,
                  position: "relative",
                }}
              >
                {weekBoundaryAfterIndexes.map(({ index, color }) => (
                  <div
                    key={`global-week-boundary-${index}`}
                    style={{
                      position: "absolute",
                      left: PROJECT_COLUMN_WIDTH + (index + 1) * TIMELINE_DAY_WIDTH,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: color,
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                ))}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px 1fr`,
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fff",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      fontWeight: 600,
                      borderRight: "1px solid #f0f0f0",
                      position: "sticky",
                      left: 0,
                      zIndex: 30,
                      background: "#fff",
                    }}
                  >
                    项目
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        borderBottom: "1px solid #f0f0f0",
                        minHeight: TIMELINE_WEEK_HEADER_HEIGHT,
                      }}
                    >
                      {timelineWeekGroups.map((group, groupIndex) => (
                        <div
                          key={group.key}
                          style={{
                            width: group.length * TIMELINE_DAY_WIDTH,
                            padding: "6px 8px",
                            borderRight:
                              groupIndex < timelineWeekGroups.length - 1
                                ? "1px solid transparent"
                                : "1px solid #f5f5f5",
                            textAlign: "center",
                            fontSize: 12,
                            color: "rgba(0,0,0,0.65)",
                            background: (() => {
                              const current = dayjs();
                              const groupStart = group.start.startOf("day");
                              const currentWeekStart = current.startOf("isoWeek");
                              const currentWeekEnd = current.endOf("isoWeek");
                              if (
                                (groupStart.isAfter(currentWeekStart) ||
                                  groupStart.isSame(currentWeekStart, "day")) &&
                                (groupStart.isBefore(currentWeekEnd) ||
                                  groupStart.isSame(currentWeekEnd, "day"))
                              ) {
                                return "#E3EBF6";
                              }
                              if (groupStart.isAfter(currentWeekEnd)) {
                                return "#E8EDDE";
                              }
                              return "#fff";
                            })(),
                          }}
                        >
                          {`第${group.weekNumber}周(${group.start.format("M/D")}-${group.end.format("M/D")})`}
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${TIMELINE_DAY_COUNT}, ${TIMELINE_DAY_WIDTH}px)`,
                        minHeight: TIMELINE_DAY_HEADER_HEIGHT,
                      }}
                    >
                      {timelineDayMeta.map((meta, dayIndex) => (
                        <div
                          key={meta.key}
                          style={{
                            padding: "8px 6px",
                            borderRight: weekBoundaryAfterIndexSet.has(dayIndex)
                              ? "1px solid transparent"
                              : "1px solid #f5f5f5",
                            textAlign: "center",
                            fontSize: 12,
                            color: meta.isToday ? "#1677ff" : "rgba(0,0,0,0.65)",
                            fontWeight: meta.isToday ? 600 : 400,
                            background: meta.isRestDay ? "#fafafa" : "#fff",
                          }}
                        >
                          <div>{meta.day.format("MM/DD")}</div>
                          <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
                            {meta.weekdayText}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                meta.adjustmentMark === "休"
                                  ? "#cf1322"
                                  : meta.adjustmentMark === "班"
                                    ? "#1677ff"
                                    : "rgba(0,0,0,0)",
                              lineHeight: "14px",
                              minHeight: 14,
                            }}
                          >
                            {meta.adjustmentMark ?? ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {timelineProjects.length === 0 ? (
                  <div style={{ padding: 24 }}>
                    <Empty description="暂无从今天开始的里程碑" />
                  </div>
                ) : (
                  timelineProjects.map((project) => (
                    (() => {
                      const laneCount = Math.max(
                        1,
                        ...project.milestones.map((m) => (m.lane ?? 0) + 1),
                      );
                      const rowHeight = Math.max(56, 8 + laneCount * 40);
                      return (
                    <div
                      key={project.projectId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: `${PROJECT_COLUMN_WIDTH}px 1fr`,
                        minHeight: rowHeight,
                        borderBottom: "1px solid #f5f5f5",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px",
                          borderRight: "1px solid #f0f0f0",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          position: "sticky",
                          left: 0,
                          zIndex: 20,
                          background: "#fff",
                        }}
                        title={project.projectName}
                      >
                        {project.projectName}
                      </div>
                      <div
                        style={{
                          position: "relative",
                          minHeight: rowHeight,
                          overflow: "hidden",
                          background:
                            "repeating-linear-gradient(to right, transparent, transparent 55px, #fafafa 55px, #fafafa 56px)",
                        }}
                      >
                        {timelineDayMeta.map((meta, colIndex) =>
                          meta.isRestDay ? (
                            <div
                              key={`${project.projectId}-${meta.key}-rest`}
                              style={{
                                position: "absolute",
                                left: colIndex * TIMELINE_DAY_WIDTH,
                                top: 0,
                                width: TIMELINE_DAY_WIDTH,
                                height: "100%",
                                background: "rgba(0,0,0,0.04)",
                                pointerEvents: "none",
                              }}
                            />
                          ) : null,
                        )}
                        {project.milestones.map((milestone) => {
                          const base = timelineDays[0];
                          const dayOffsetStart = Math.max(
                            0,
                            milestone.startDay.diff(base, "day"),
                          );
                          const dayOffsetEnd = Math.min(
                            TIMELINE_DAY_COUNT - 1,
                            milestone.endDay.diff(base, "day"),
                          );
                          if (dayOffsetEnd < 0 || dayOffsetStart > TIMELINE_DAY_COUNT - 1) {
                            return null;
                          }
                          const detailGroup = [
                            { label: "详情", value: milestone.detail?.trim() ?? "" },
                          ].filter((item) => item.value);
                          const methodLocationGroup = [
                            { label: "方式", value: milestone.method?.trim() ?? "" },
                            { label: "地点", value: milestone.location?.trim() ?? "" },
                          ].filter((item) => item.value);
                          const participantsGroup = [
                            {
                              label: "项目人员",
                              value: (milestone.internalParticipantNames ?? []).join("、"),
                            },
                            {
                              label: "客户人员",
                              value: (milestone.clientParticipantNames ?? []).join("、"),
                            },
                            {
                              label: "供应商",
                              value: (milestone.vendorParticipantNames ?? []).join("、"),
                            },
                          ].filter((item) => item.value);
                          const hoverGroups = [detailGroup, methodLocationGroup, participantsGroup]
                            .filter((group) => group.length > 0);

                          const milestoneNode = (
                            <button
                              key={milestone.id}
                              type="button"
                              onClick={() => {
                                const target = rows.find((row) => row.id === milestone.id);
                                if (!target) return;
                                onEdit(target);
                              }}
                              title={`${milestone.name} (${formatTimelineMilestoneDateLabel(milestone)})`}
                              style={{
                                position: "absolute",
                                left: dayOffsetStart * TIMELINE_DAY_WIDTH + 2,
                                top: 8 + (milestone.lane ?? 0) * 40,
                                width: "fit-content",
                                minHeight: 34,
                                margin: 0,
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                                zIndex: 2,
                                display: "inline-flex",
                                alignItems: "stretch",
                                textAlign: "left",
                              }}
                            >
                              {milestone.typeLabel ? (
                                (() => {
                                  const typeLineCount = getTypeLineCount(milestone.typeLabel);
                                  const { firstLine, secondLine } =
                                    splitTypeLabelToTwoLines(milestone.typeLabel);
                                  return (
                                    <span
                                      style={{
                                        background: milestone.color,
                                        color: "#fff",
                                        borderRadius: "6px 0 0 6px",
                                        padding: "4px 6px",
                                        fontSize: 11,
                                        lineHeight: "12px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        minWidth: typeLineCount <= 1 ? 26 : 34,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {typeLineCount <= 1 ? (
                                        firstLine
                                      ) : (
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <span>{firstLine}</span>
                                          <span>{secondLine}</span>
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()
                              ) : null}
                              <span
                                style={{
                                  background: toPastelColor(milestone.color),
                                  color: toOpaqueColor(milestone.color),
                                  borderRadius: milestone.typeLabel
                                    ? "0 6px 6px 0"
                                    : "6px",
                                  padding: "4px 8px",
                                  display: "inline-flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  justifyContent: "center",
                                  gap: 2,
                                }}
                              >
                                <span style={{ fontSize: 12, lineHeight: "14px" }}>
                                  {milestone.name}
                                </span>
                                <span style={{ fontSize: 11, lineHeight: "13px" }}>
                                  {formatTimelineMilestoneDateLabel(milestone)}
                                </span>
                              </span>
                            </button>
                          );
                          if (hoverGroups.length === 0) return milestoneNode;
                          return (
                            <Tooltip
                              key={`${milestone.id}-tooltip`}
                              placement="top"
                              title={
                                <div>
                                  {hoverGroups.map((group, groupIndex) => (
                                    <div key={`${milestone.id}-group-${groupIndex}`}>
                                      {group.map((row) => (
                                        <div key={`${milestone.id}-${row.label}`}>
                                          {row.label}：{row.value}
                                        </div>
                                      ))}
                                      {groupIndex < hoverGroups.length - 1 ? (
                                        <Divider style={{ margin: "6px 0" }} />
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              }
                            >
                              {milestoneNode}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                      );
                    })()
                  ))
                )}
              </div>
            </div>
          </Spin>
        </div>
      )}

      {open ? (
        <ProjectMilestoneFormModal
          title={editing ? "编辑里程碑" : "新增里程碑"}
          open={open}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          initialValues={editing}
          projectMembers={projectContext.members}
          allEmployees={allEmployees}
          clientParticipants={projectContext.clientParticipants}
          vendors={projectContext.vendors}
          projectOptions={projectOptions}
          selectedProjectId={selectedProjectId}
          disableProjectSelect={false}
          onProjectChange={(projectId) => setSelectedProjectId(projectId)}
          onSubmit={onSubmit}
        />
      ) : null}
    </ListPageContainer>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Card loading />}>
      <ProjectMilestonesPageContent />
    </Suspense>
  );
}
