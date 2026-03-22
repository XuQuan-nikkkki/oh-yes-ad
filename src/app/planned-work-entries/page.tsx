"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "antd";
import ListPageContainer from "@/components/ListPageContainer";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import PlannedWorkEntriesTable, {
  PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { usePlannedWorkEntriesStore } from "@/stores/plannedWorkEntriesStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

export default function Page() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    { id: string; name: string; projectId: string; segmentId?: string; segmentName?: string }[]
  >([]);
  const [formOptionsLoaded, setFormOptionsLoaded] = useState(false);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);
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
            } => Boolean(item?.id && item?.name),
          )
          .map((t) => ({
            id: t.id,
            name: t.name,
            projectId: t.segment?.project?.id ?? "",
            segmentId: t.segment?.id,
            segmentName: t.segment?.name,
            projectName: t.segment?.project?.name ?? "",
          }))
      : [];
    setTasks(
      nextTasks.map((task) => ({
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        segmentId: task.segmentId,
        segmentName: task.segmentName,
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
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWorkdayAdjustments]);

  const onDelete = async (id: string) => {
    await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
    clearEntriesCache();
    setRefreshKey((prev) => prev + 1);
  };

  const onSubmit = async (payload: PlannedWorkEntryFormPayload) => {
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

  return (
    <ListPageContainer>
      <PlannedWorkEntriesTable
        requestData={fetchRows}
        headerTitle={<ProTableHeaderTitle>计划工时</ProTableHeaderTitle>}
        toolbarActions={[
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
        ]}
        workdayAdjustments={workdayAdjustments}
        onEdit={(row) => {
          void ensureFormOptionsLoaded().then(() => {
            setEditing(row);
            setOpen(true);
          });
        }}
        onDelete={(id) => {
          void onDelete(id);
        }}
        refreshKey={refreshKey}
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
