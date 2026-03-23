"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal } from "antd";
import ProjectTasksListTable, {
  type ProjectTaskListRow,
} from "@/components/ProjectTasksListTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import ProjectTaskForm, {
  type ProjectTaskFormPayload,
} from "@/components/project-detail/ProjectTaskForm";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { PROJECT_TASK_STATUS_FIELD } from "@/lib/constants";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectTasksStore } from "@/stores/projectTasksStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Row = ProjectTaskListRow;
const EMPTY_ROWS: Row[] = [];

export default function ProjectTasksPage() {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { canManageProject } = useProjectPermission();
  const rowsByKey = useProjectTasksStore((state) => state.tasksByKey);
  const rows = (rowsByKey["owner:all"] ?? EMPTY_ROWS) as Row[];
  const rowsLoading = useProjectTasksStore(
    (state) => Boolean(state.loadingByKey["owner:all"]),
  );
  const fetchTasksFromStore = useProjectTasksStore((state) => state.fetchTasks);
  const upsertTasks = useProjectTasksStore((state) => state.upsertTasks);
  const removeTask = useProjectTasksStore((state) => state.removeTask);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);

  const statusFilterOptions = useMemo(
    () =>
      (optionsByField[PROJECT_TASK_STATUS_FIELD] ?? [])
        .slice()
        .sort((left, right) => {
          const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return left.value.localeCompare(right.value, "zh-CN");
        })
        .map((option) => ({
          text: option.value,
          value: option.value,
        })),
    [optionsByField],
  );

  const fetchBaseData = useCallback(async () => {
    const [taskRows, employeeRows] = await Promise.all([
      fetchTasksFromStore(),
      fetchEmployeesFromStore(),
      fetchAllOptions(),
    ]);
    if (Array.isArray(taskRows) && taskRows.length > 0) {
      upsertTasks(taskRows);
    }
    setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
  }, [fetchAllOptions, fetchEmployeesFromStore, fetchTasksFromStore, upsertTasks]);

  const segments = useMemo(() => {
    const segmentMap = new Map<
      string,
      { id: string; name: string; project?: { id?: string; name: string } }
    >();
    for (const row of rows) {
      const segmentId = row.segment?.id;
      const segmentName = row.segment?.name;
      if (!segmentId || !segmentName) continue;
      if (segmentMap.has(segmentId)) continue;
      segmentMap.set(segmentId, {
        id: segmentId,
        name: segmentName,
        project: row.segment?.project
          ? { id: row.segment.project.id, name: row.segment.project.name }
          : undefined,
      });
    }
    return Array.from(segmentMap.values()).sort((left, right) =>
      `${left.project?.name ?? ""}-${left.name}`.localeCompare(
        `${right.project?.name ?? ""}-${right.name}`,
        "zh-CN",
      ),
    );
  }, [rows]);

  useEffect(() => {
    (async () => {
      await fetchBaseData();
    })();
  }, [fetchBaseData]);

  const onCreate = () => {
    if (!canManageProject) return;
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (row: Row) => {
    if (!canManageProject) return;
    setEditing(row);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/project-tasks/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeTask(id);
  };

  const onSubmit = async (payload: ProjectTaskFormPayload) => {
    if (!canManageProject) return;
    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/project-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    if (!res.ok) {
      await fetchTasksFromStore({ force: true });
      return;
    }
    const next = (await res.json()) as Row | null;
    if (next?.id) {
      upsertTasks([next]);
      return;
    }
    await fetchTasksFromStore({ force: true });
  };

  const refreshTasks = useCallback(async () => {
    await fetchTasksFromStore({ force: true });
  }, [fetchTasksFromStore]);

  const updateTaskStatus = useCallback(
    async (
      taskId: string,
      nextOption: { id: string; value: string; color: string },
    ) => {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextOption,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "更新任务状态失败");
      }
      const next = (await res.json()) as Row | null;
      if (next?.id) {
        upsertTasks([next]);
      }
    },
    [upsertTasks],
  );

  return (
    <ListPageContainer>
      <ProjectTasksListTable
        rows={rows}
        loading={rowsLoading}
        headerTitle={<ProTableHeaderTitle>项目任务</ProTableHeaderTitle>}
        showTableOptions
        statusFilterOptions={statusFilterOptions}
        renderStatusOption={(record) => (
          <SelectOptionQuickEditTag
            field="projectTask.status"
            option={record.statusOption ?? null}
            fallbackText={record.status ?? "-"}
            disabled={!canManageProject}
            modalTitle="修改任务状态"
            modalDescription="勾选只会暂存状态切换。点击保存后会一并保存选项改动、排序和任务状态。"
            optionValueLabel="状态值"
            saveSuccessText="任务状态已保存"
            onSaveSelection={(nextOption) => updateTaskStatus(record.id, nextOption)}
            onUpdated={async () => {
              await refreshTasks();
            }}
          />
        )}
        onEdit={(row) => onEdit(row)}
        onDelete={(id) => onDelete(id)}
        actionsDisabled={!canManageProject}
        toolbarActions={[
          <Button key="create" type="primary" onClick={onCreate} disabled={!canManageProject}>
            新增任务
          </Button>,
        ]}
      />

      <Modal
        title={editing ? "编辑任务" : "新增任务"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
        width={860}
      >
        <ProjectTaskForm
          segmentOptions={segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            projectId: segment.project?.id,
            projectName: segment.project?.name,
          }))}
          employees={employees}
          initialValues={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  segmentId: editing.segment?.id,
                  status: editing.status ?? null,
                  statusOption: editing.statusOption ?? null,
                  owner: editing.owner ?? null,
                  dueDate: editing.dueDate ?? null,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </ListPageContainer>
  );
}
