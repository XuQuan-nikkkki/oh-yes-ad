"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "antd";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import ActualWorkEntriesTable from "@/components/ActualWorkEntriesTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import { useActualWorkEntriesStore } from "@/stores/actualWorkEntriesStore";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";

export default function Page() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; name: string; employmentStatus?: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    employee?: { id: string; name: string };
    project?: { id: string; name: string };
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const fetchEntriesFromStore = useActualWorkEntriesStore(
    (state) => state.fetchEntries,
  );
  const clearEntriesCache = useActualWorkEntriesStore(
    (state) => state.clearEntriesCache,
  );
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const currentEmployeeId = currentUser?.id ?? "";

  const fetchOptions = useCallback(async () => {
    const [projectRows, employeeRows] = await Promise.all([
      fetchProjectsFromStore(),
      fetchEmployeesFromStore(),
    ]);
    setProjects(
      (Array.isArray(projectRows) ? projectRows : [])
        .filter(
          (
            row,
          ): row is {
            id: string;
            name: string;
          } => typeof row?.id === "string" && typeof row?.name === "string",
        )
        .map((row) => ({
          id: row.id,
          name: row.name,
        })),
    );
    setEmployees(
      Array.isArray(employeeRows)
        ? employeeRows.map((row) => ({
            id: row.id,
            name: row.name,
            employmentStatus: row.employmentStatus ?? undefined,
          }))
        : [],
    );
  }, [fetchEmployeesFromStore, fetchProjectsFromStore]);

  const ensureOptionsLoaded = useCallback(async () => {
    if (optionsLoaded || optionsLoading) return;
    setOptionsLoading(true);
    try {
      await fetchOptions();
      setOptionsLoaded(true);
    } finally {
      setOptionsLoading(false);
    }
  }, [fetchOptions, optionsLoaded, optionsLoading]);

  const fetchRows = useCallback(
    async (params: {
      current: number;
      pageSize: number;
      filters: {
        title?: string;
        employeeName?: string;
        projectName?: string;
        startDate?: string;
        startDateFrom?: string;
        startDateTo?: string;
      };
    }) => {
      const query = new URLSearchParams({
        page: String(params.current),
        pageSize: String(params.pageSize),
      });
      if (params.filters.title) query.set("title", params.filters.title);
      if (params.filters.employeeName)
        query.set("employeeName", params.filters.employeeName);
      if (params.filters.projectName)
        query.set("projectName", params.filters.projectName);
      if (params.filters.startDate)
        query.set("startDate", params.filters.startDate);
      if (params.filters.startDateFrom)
        query.set("startDateFrom", params.filters.startDateFrom);
      if (params.filters.startDateTo)
        query.set("startDateTo", params.filters.startDateTo);
      return fetchEntriesFromStore(
        {
          current: params.current,
          pageSize: params.pageSize,
          filters: {
            title: query.get("title") ?? undefined,
            employeeName: query.get("employeeName") ?? undefined,
            projectName: query.get("projectName") ?? undefined,
            startDate: query.get("startDate") ?? undefined,
            startDateFrom: query.get("startDateFrom") ?? undefined,
            startDateTo: query.get("startDateTo") ?? undefined,
          },
        },
        refreshKey > 0,
      );
    },
    [fetchEntriesFromStore, refreshKey],
  );

  const onDelete = async (id: string) => {
    await fetch(`/api/actual-work-entries/${id}`, { method: "DELETE" });
    clearEntriesCache();
    setRefreshKey((prev) => prev + 1);
  };

  const onSubmit = async (payload: ActualWorkEntryFormPayload) => {
    if (editing) {
      await fetch(`/api/actual-work-entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/actual-work-entries", {
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void ensureOptionsLoaded();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ensureOptionsLoaded]);

  return (
    <ListPageContainer>
      <ActualWorkEntriesTable
        requestData={fetchRows}
        employeeFilterOptions={employees
          .map((item) => ({ label: item.name, value: item.name }))
          .sort((left, right) =>
            left.label.localeCompare(right.label, "zh-CN"),
          )}
        projectFilterOptions={projects
          .map((item) => ({ label: item.name, value: item.name }))
          .sort((left, right) =>
            left.label.localeCompare(right.label, "zh-CN"),
          )}
        headerTitle={<ProTableHeaderTitle>实际工时</ProTableHeaderTitle>}
        toolbarActions={[
          <Button
            key="create-actual-work-entry"
            type="primary"
            onClick={() => {
              void ensureOptionsLoaded().then(() => {
                setEditing(null);
                setOpen(true);
              });
            }}
            loading={optionsLoading}
          >
            新增实际工时
          </Button>,
        ]}
        onEdit={(row) => {
          void ensureOptionsLoaded().then(() => {
            setEditing(row);
            setOpen(true);
          });
        }}
        canManageRow={(row) =>
          isAdmin || (Boolean(currentEmployeeId) && row.employee?.id === currentEmployeeId)
        }
        onDelete={(id) => {
          void onDelete(id);
        }}
        refreshKey={refreshKey}
      />

      <Modal
        title={editing ? "编辑实际工时" : "新增实际工时"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <ActualWorkEntryForm
          projectOptions={projects}
          employees={employees}
          initialValues={
            editing
              ? {
                  id: editing.id,
                  projectId: editing.project?.id ?? "",
                  title: editing.title,
                  employeeId: editing.employee?.id ?? currentEmployeeId,
                  startDate: editing.startDate,
                  endDate: editing.endDate,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </ListPageContainer>
  );
}
