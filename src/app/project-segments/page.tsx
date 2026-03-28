"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "antd";
import ProjectSegmentsProTable, {
  type ProjectSegmentsProTableRow,
} from "@/components/ProjectSegmentsProTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectSegmentFormModal from "@/components/project-detail/ProjectSegmentFormModal";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useProjectSegmentsStore } from "@/stores/projectSegmentsStore";
import type { ProjectSegmentFormPayload } from "@/components/project-detail/ProjectSegmentForm";

type Row = ProjectSegmentsProTableRow;
type Option = { id: string; name: string };
type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string | null;
};

export default function ProjectSegmentsPage() {
  const [projects, setProjects] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { canManageProject } = useProjectPermission();
  const rows = useProjectSegmentsStore((state) => state.rows);
  const rowsLoading = useProjectSegmentsStore((state) => state.loading);
  const fetchSegmentsFromStore = useProjectSegmentsStore(
    (state) => state.fetchSegments,
  );
  const upsertSegments = useProjectSegmentsStore((state) => state.upsertSegments);
  const removeSegment = useProjectSegmentsStore((state) => state.removeSegment);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const fetchBaseData = useCallback(async () => {
    const employeeRows = await fetchEmployeesFromStore();
    await fetchSegmentsFromStore();
    setEmployees(
      (Array.isArray(employeeRows) ? employeeRows : []).map(
        (e: { id: string; name: string; employmentStatus?: string | null }) => ({
          id: e.id,
          name: e.name,
          employmentStatus: e.employmentStatus ?? null,
        }),
      ),
    );
  }, [fetchEmployeesFromStore, fetchSegmentsFromStore]);

  const fetchProjects = useCallback(async () => {
    const data = await fetchProjectsFromStore();
    setProjects(
      (Array.isArray(data) ? data : [])
        .filter(
          (
            p,
          ): p is {
            id: string;
            name: string;
          } => typeof p?.id === "string" && typeof p?.name === "string",
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
        })),
    );
  }, [fetchProjectsFromStore]);

  const ensureProjectsLoaded = useCallback(async () => {
    if (projects.length > 0) return;
    await fetchProjects();
  }, [fetchProjects, projects.length]);

  useEffect(() => {
    (async () => {
      await fetchBaseData();
      await fetchAllOptions();
    })();
  }, [fetchAllOptions, fetchBaseData]);

  const onCreate = () => {
    if (!canManageProject) return;
    void (async () => {
      await ensureProjectsLoaded();
      setEditing(null);
      setOpen(true);
    })();
  };

  const onEdit = (row: Row) => {
    if (!canManageProject) return;
    void (async () => {
      await ensureProjectsLoaded();
      setEditing(row);
      setOpen(true);
    })();
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    const res = await fetch(`/api/project-segments/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeSegment(id);
  };

  const refreshSegment = useCallback(
    async (segmentId: string) => {
      const res = await fetch(`/api/project-segments/${segmentId}`);
      if (!res.ok) return;
      const next = (await res.json()) as Row | null;
      if (next?.id) {
        upsertSegments([next]);
      }
    },
    [upsertSegments],
  );

  const updateSegmentStatus = useCallback(
    async (
      segmentId: string,
      nextOption: { id: string; value: string; color: string },
    ) => {
      const res = await fetch(`/api/project-segments/${segmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextOption,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "更新环节状态失败");
      }
      const next = (await res.json()) as Row | null;
      if (next?.id) {
        upsertSegments([next]);
      }
    },
    [upsertSegments],
  );

  const onSubmit = async (payload: ProjectSegmentFormPayload) => {
    if (!canManageProject) return;

    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-segments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/project-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setOpen(false);
    if (!res.ok) {
      await fetchSegmentsFromStore(true);
      return;
    }
    const next = (await res.json()) as Row | null;
    if (next?.id) {
      upsertSegments([next]);
      return;
    }
    await fetchSegmentsFromStore(true);
  };

  return (
    <ListPageContainer>
      <ProjectSegmentsProTable
        rows={rows}
        loading={rowsLoading}
        headerTitle={<ProTableHeaderTitle>项目环节</ProTableHeaderTitle>}
        columnsStatePersistenceKey="project-segments-table-columns-state"
        onEdit={onEdit}
        onDelete={(id) => void onDelete(id)}
        actionsDisabled={!canManageProject}
        renderStatusOption={(record) => (
          <SelectOptionQuickEditTag
            field="projectSegment.status"
            option={record.statusOption ?? null}
            fallbackText={record.status ?? "-"}
            disabled={!canManageProject}
            modalTitle="修改环节状态"
            modalDescription="勾选只会暂存状态切换。点击保存后会一并保存选项改动、排序和环节状态。"
            optionValueLabel="状态值"
            saveSuccessText="环节状态已保存"
            onSaveSelection={async (nextOption) => {
              await updateSegmentStatus(record.id, nextOption);
            }}
            onUpdated={async () => {
              await refreshSegment(record.id);
            }}
          />
        )}
        toolbarActions={[
          <Button key="create" type="primary" onClick={onCreate} disabled={!canManageProject}>
            新增环节
          </Button>,
        ]}
      />

      <ProjectSegmentFormModal
        title={editing ? "编辑环节" : "新增环节"}
        open={open}
        onCancel={() => setOpen(false)}
        initialValues={editing}
        projectOptions={projects}
        employees={employees}
        onSubmit={onSubmit}
      />
    </ListPageContainer>
  );
}
