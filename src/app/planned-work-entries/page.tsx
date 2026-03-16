"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Modal } from "antd";
import PlannedWorkEntryForm, {
  PlannedWorkEntryFormPayload,
} from "@/components/project-detail/PlannedWorkEntryForm";
import PlannedWorkEntriesTable, {
  PlannedWorkEntryRow,
} from "@/components/PlannedWorkEntriesTable";

export default function Page() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    { id: string; name: string; projectId: string; segmentId?: string; segmentName?: string }[]
  >([]);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    { startDate: string; endDate: string; changeType?: string | null }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedWorkEntryRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOptions = useCallback(async () => {
    const [res2, res3, res4] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/project-tasks"),
      fetch("/api/workday-adjustments"),
    ]);
    const projectList = await res2.json();
    const taskList = await res3.json();
    const workdayList = await res4.json();
    setProjects(
      projectList.map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
      })),
    );
    setTasks(
      taskList.map(
        (t: {
          id: string;
          name: string;
          segment?: { id?: string; name?: string; project?: { id: string } };
        }) => ({
          id: t.id,
          name: t.name,
          projectId: t.segment?.project?.id,
          segmentId: t.segment?.id,
          segmentName: t.segment?.name,
        }),
      ),
    );
    setWorkdayAdjustments(
      Array.isArray(workdayList) ? workdayList : [],
    );
  }, []);

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

      const res = await fetch(`/api/planned-work-entries?${query.toString()}`);
      const payload = await res.json();
      if (Array.isArray(payload)) {
        return {
          data: payload,
          total: payload.length,
        };
      }
      return {
        data: Array.isArray(payload?.data) ? payload.data : [],
        total:
          typeof payload?.total === "number"
            ? payload.total
            : Array.isArray(payload?.data)
              ? payload.data.length
              : 0,
      };
    },
    [],
  );

  useEffect(() => {
    (async () => {
      await fetchOptions();
    })();
  }, [fetchOptions]);

  const onDelete = async (id: string) => {
    await fetch(`/api/planned-work-entries/${id}`, { method: "DELETE" });
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
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Card styles={{ body: { padding: 12 } }}>
      <PlannedWorkEntriesTable
        requestData={fetchRows}
        headerTitle={<h3 style={{ margin: 0 }}>计划工时</h3>}
        toolbarActions={[
          <Button
            key="create-planned-work-entry"
            type="primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            新增计划工时
          </Button>,
        ]}
        workdayAdjustments={workdayAdjustments}
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
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
    </Card>
  );
}
