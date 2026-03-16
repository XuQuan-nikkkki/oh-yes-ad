"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Modal } from "antd";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import ActualWorkEntriesTable from "@/components/ActualWorkEntriesTable";

export default function Page() {
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

  const fetchOptions = useCallback(async () => {
    const [res2, res3] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/employees"),
    ]);
    setProjects(await res2.json());
    setEmployees(await res3.json());
  }, []);

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

      const res = await fetch(`/api/actual-work-entries?${query.toString()}`);
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
    await fetch(`/api/actual-work-entries/${id}`, { method: "DELETE" });
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
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Card styles={{ body: { padding: 12 } }}>
      <ActualWorkEntriesTable
        requestData={fetchRows}
        employeeFilterOptions={employees
          .map((item) => ({ label: item.name, value: item.name }))
          .sort((left, right) =>
            left.label.localeCompare(right.label, "zh-CN"),
          )}
        headerTitle={<h3 style={{ margin: 0 }}>实际工时</h3>}
        toolbarActions={[
          <Button
            key="create-actual-work-entry"
            type="primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            新增实际工时
          </Button>,
        ]}
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
                  employeeId: editing.employee?.id ?? "",
                  startDate: editing.startDate,
                  endDate: editing.endDate,
                }
              : null
          }
          onSubmit={onSubmit}
        />
      </Modal>
    </Card>
  );
}
