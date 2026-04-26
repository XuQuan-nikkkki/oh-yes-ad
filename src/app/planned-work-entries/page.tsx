"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal } from "antd";
import ListPageContainer from "@/components/ListPageContainer";
import PageAccessResult from "@/components/PageAccessResult";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import PlannedWorkEntriesTable, {
  PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { usePlannedWorkEntriesStore } from "@/stores/plannedWorkEntriesStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";
import { DEFAULT_COLOR } from "@/lib/constants";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

export default function Page() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManagePlannedWork = useMemo(
    () => canManageProjectResources(roleCodes),
    [roleCodes],
  );
  const isAdmin = roleCodes.includes("ADMIN");
  const hideWorktimeEntryPages =
    !isAdmin && (roleCodes.includes("HR") || roleCodes.includes("FINANCE"));
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    {
      id: string;
      name: string;
      projectId: string;
      segmentId?: string;
      segmentName?: string;
      ownerName?: string;
    }[]
  >([]);
  const [formOptionsLoaded, setFormOptionsLoaded] = useState(false);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustmentRange[]
  >([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedWorkEntryRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchEntriesFromStore = usePlannedWorkEntriesStore(
    (state) => state.fetchEntries,
  );
  const clearEntriesCache = usePlannedWorkEntriesStore(
    (state) => state.clearEntriesCache,
  );
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );

  const fetchWorkdayAdjustments = useCallback(async () => {
    const workdayList = await fetchAdjustmentsFromStore();
    setWorkdayAdjustments(Array.isArray(workdayList) ? workdayList : []);
  }, [fetchAdjustmentsFromStore]);

  const fetchFormOptions = useCallback(async () => {
    const tasksRes = await fetch("/api/project-tasks");
    const taskList = await tasksRes.json();
    const nextTasks = Array.isArray(taskList)
      ? taskList
          .filter(
            (item): item is {
              id: string;
              name: string;
              segment?: {
                id?: string;
                name?: string;
                project?: { id?: string; name?: string };
              };
              owner?: { id?: string; name?: string };
            } => Boolean(item?.id && item?.name),
          )
          .map((t) => ({
            id: t.id,
            name: t.name,
            projectId: t.segment?.project?.id ?? "",
            segmentId: t.segment?.id,
            segmentName: t.segment?.name,
            projectName: t.segment?.project?.name ?? "",
            ownerName: t.owner?.name ?? "",
          }))
      : [];
    setTasks(
      nextTasks.map((task) => ({
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        segmentId: task.segmentId,
        segmentName: task.segmentName,
        ownerName: task.ownerName,
      })),
    );
    const projectMap = new Map<string, string>();
    nextTasks.forEach((task) => {
      if (!task.projectId || !task.projectName) return;
      projectMap.set(task.projectId, task.projectName);
    });
    setProjects(
      Array.from(projectMap.entries()).map(([id, name]) => ({
        id,
        name,
      })),
    );
    setFormOptionsLoaded(true);
  }, []);

  const ensureFormOptionsLoaded = useCallback(async () => {
    if (formOptionsLoaded || formOptionsLoading) return;
    setFormOptionsLoading(true);
    try {
      await fetchFormOptions();
    } finally {
      setFormOptionsLoading(false);
    }
  }, [fetchFormOptions, formOptionsLoaded, formOptionsLoading]);

  const fetchRows = useCallback(
    async (params: {
      current: number;
      pageSize: number;
      filters: {
        projectName?: string;
        segmentName?: string;
        taskName?: string;
        ownerName?: string;
        year?: string;
        weekNumber?: string;
      };
    }) => {
      const query = new URLSearchParams({
        page: String(params.current),
        pageSize: String(params.pageSize),
      });
      if (params.filters.projectName)
        query.set("projectName", params.filters.projectName);
      if (params.filters.segmentName)
        query.set("segmentName", params.filters.segmentName);
      if (params.filters.taskName) query.set("taskName", params.filters.taskName);
      if (params.filters.ownerName)
        query.set("ownerName", params.filters.ownerName);
      if (params.filters.year) query.set("year", params.filters.year);
      if (params.filters.weekNumber)
        query.set("weekNumber", params.filters.weekNumber);

      return fetchEntriesFromStore(
        {
          current: params.current,
          pageSize: params.pageSize,
          filters: {
            projectName: query.get("projectName") ?? undefined,
            segmentName: query.get("segmentName") ?? undefined,
            taskName: query.get("taskName") ?? undefined,
            ownerName: query.get("ownerName") ?? undefined,
            year: query.get("year") ?? undefined,
            weekNumber: query.get("weekNumber") ?? undefined,
          },
        },
        refreshKey > 0,
      );
    },
    [fetchEntriesFromStore, refreshKey],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchWorkdayAdjustments();
      void ensureFormOptionsLoaded();
      void fetchAllOptions();
    }, 0);
    return () => clearTimeout(timer);
  }, [ensureFormOptionsLoaded, fetchAllOptions, fetchWorkdayAdjustments]);

  const buildFilterOptions = useCallback(
    (values: Array<string | null | undefined>) =>
      Array.from(
        new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
      )
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
        .map((value) => ({ label: value, value })),
    [],
  );

  const buildNumericFilterOptions = useCallback(
    (values: Array<string | null | undefined>) =>
      Array.from(
        new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
      )
        .sort((left, right) => Number(left) - Number(right))
        .map((value) => ({ label: value, value })),
    [],
  );

  const projectFilterOptions = buildFilterOptions(
    projects.map((project) => project.name),
  );
  const segmentFilterOptions = buildFilterOptions(
    tasks.map((task) => task.segmentName),
  );
  const taskFilterOptions = buildFilterOptions(tasks.map((task) => task.name));
  const ownerFilterOptions = buildFilterOptions(
    tasks.map((task) => task.ownerName),
  );
  const yearFilterOptions = buildNumericFilterOptions(
    (optionsByField["plannedWorkEntry.year"] ?? []).map((option) => option.value),
  );
  const weekNumberFilterOptions = buildNumericFilterOptions(
    (optionsByField["plannedWorkEntry.weekNumber"] ?? []).map((option) => option.value),
  );

  const onDelete = async (id: string) => {
    if (!canManagePlannedWork) return;
    await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
    clearEntriesCache();
    setRefreshKey((prev) => prev + 1);
  };

  const onSubmit = async (payload: PlannedWorkEntryFormPayload) => {
    if (!canManagePlannedWork) return;
    if (editing) {
      await fetch(`/api/planned-work-entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/planned-work-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    setEditing(null);
    clearEntriesCache();
    setRefreshKey((prev) => prev + 1);
  };

  const refreshEntries = useCallback(() => {
    clearEntriesCache();
    setRefreshKey((prev) => prev + 1);
  }, [clearEntriesCache]);

  const updatePlannedEntryWeekNumber = useCallback(
    async (
      entryId: string,
      nextOption: { id: string; value: string; color: string },
    ) => {
      if (!canManagePlannedWork) return;
      const res = await fetch(`/api/planned-work-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekNumberOption: nextOption.value,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "更新周数失败");
      }
    },
    [canManagePlannedWork],
  );

  const updatePlannedEntryYear = useCallback(
    async (
      entryId: string,
      nextOption: { id: string; value: string; color: string },
    ) => {
      if (!canManagePlannedWork) return;
      const res = await fetch(`/api/planned-work-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearOption: nextOption.value,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "更新年份失败");
      }
    },
    [canManagePlannedWork],
  );

  if (hideWorktimeEntryPages) {
    return <PageAccessResult type="forbidden" />;
  }

  return (
    <ListPageContainer>
      <PlannedWorkEntriesTable
        requestData={fetchRows}
        headerTitle={<ProTableHeaderTitle>计划工时</ProTableHeaderTitle>}
        toolbarActions={[
          ...(canManagePlannedWork
            ? [
                <Button
                  key="create-planned-work-entry"
                  type="primary"
                  onClick={() => {
                    void ensureFormOptionsLoaded().then(() => {
                      setEditing(null);
                      setOpen(true);
                    });
                  }}
                >
                  新增计划工时
                </Button>,
              ]
            : []),
        ]}
        workdayAdjustments={workdayAdjustments}
        projectFilterOptions={projectFilterOptions}
        segmentFilterOptions={segmentFilterOptions}
        taskFilterOptions={taskFilterOptions}
        ownerFilterOptions={ownerFilterOptions}
        yearFilterOptions={yearFilterOptions}
        weekNumberFilterOptions={weekNumberFilterOptions}
        onEdit={(row) => {
          if (!canManagePlannedWork) return;
          void ensureFormOptionsLoaded().then(() => {
            setEditing(row);
            setOpen(true);
          });
        }}
        onDelete={(id) => {
          if (!canManagePlannedWork) return;
          void onDelete(id);
        }}
        refreshKey={refreshKey}
        renderYearCell={(row) => (
          <SelectOptionQuickEditTag
            field="plannedWorkEntry.year"
            option={
              row.yearOption?.value
                ? {
                    id: row.yearOption.id ?? "",
                    value: row.yearOption.value,
                    color: row.yearOption.color ?? DEFAULT_COLOR,
                  }
                : null
            }
            fallbackText={
              row.year !== null && row.year !== undefined
                ? String(row.year)
                : "-"
            }
            disabled={!canManagePlannedWork}
            modalTitle="修改年份"
            modalDescription="勾选只会暂存年份切换。点击保存后会一并保存选项改动、排序和当前计划工时的年份。"
            optionValueLabel="年份"
            saveSuccessText="年份已保存"
            onSaveSelection={async (nextOption) => {
              await updatePlannedEntryYear(row.id, nextOption);
            }}
            onUpdated={refreshEntries}
          />
        )}
        monthTitle="第 n 周"
        renderMonthCell={(row) => (
          <SelectOptionQuickEditTag
            field="plannedWorkEntry.weekNumber"
            optionSortMode="numeric"
            option={
              row.weekNumberOption?.value
                ? {
                    id: row.weekNumberOption.id ?? "",
                    value: row.weekNumberOption.value,
                    color: row.weekNumberOption.color ?? DEFAULT_COLOR,
                  }
                : null
            }
            fallbackText={
              row.weekNumber !== null && row.weekNumber !== undefined
                ? String(row.weekNumber)
                : "-"
            }
            disabled={!canManagePlannedWork}
            modalTitle="修改周数"
            modalDescription="勾选只会暂存周数切换。点击保存后会一并保存选项改动、排序和当前计划工时的周数。"
            optionValueLabel="周数"
            saveSuccessText="周数已保存"
            onSaveSelection={async (nextOption) => {
              await updatePlannedEntryWeekNumber(row.id, nextOption);
            }}
            onUpdated={refreshEntries}
          />
        )}
        actionsDisabled={!canManagePlannedWork}
      />

      <Modal
        title={editing ? "编辑计划工时" : "新增计划工时"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <PlannedWorkEntryForm
          projectOptions={projects}
          taskOptions={tasks}
          initialValues={
            editing
              ? {
                  id: editing.id,
                  taskId: editing.task?.id ?? "",
                  yearOption:
                    editing.yearOption?.value ?? String(editing.year ?? ""),
                  weekNumberOption:
                    editing.weekNumberOption?.value ??
                    String(editing.weekNumber ?? ""),
                  plannedDays: editing.plannedDays,
                  monday: editing.monday,
                  tuesday: editing.tuesday,
                  wednesday: editing.wednesday,
                  thursday: editing.thursday,
                  friday: editing.friday,
                  saturday: editing.saturday,
                  sunday: editing.sunday,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </ListPageContainer>
  );
}
