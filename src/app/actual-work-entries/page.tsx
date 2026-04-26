"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, Radio, Select, Space, Spin } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useSearchParams } from "next/navigation";
import PageAccessResult from "@/components/PageAccessResult";
import ActualWorkEntryForm, {
  ActualWorkEntryFormPayload,
} from "@/components/project-detail/ActualWorkEntryForm";
import ActualWorkEntriesTable from "@/components/ActualWorkEntriesTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import WorkLogsCalendar, {
  type WorkLogsCalendarEmployee,
} from "@/components/work-logs/WorkLogsCalendar";
import { canManageProjectResources } from "@/lib/role-permissions";
import { useActualWorkEntriesStore } from "@/stores/actualWorkEntriesStore";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import dayjs from "dayjs";

const ACTUAL_WORK_VIEW_PARAM = "view";
const ACTUAL_WORK_CALENDAR_EMPLOYEE_PARAM = "calendarEmployeeId";
const ACTUAL_WORK_CALENDAR_DATE_PARAM = "workLogDate";
const ACTUAL_WORK_VIEW_STORAGE_KEY = "actual-work-entries:view";
const ACTUAL_WORK_CALENDAR_EMPLOYEE_STORAGE_KEY =
  "actual-work-entries:calendarEmployeeId";

type EmployeeOptionItem = {
  id: string;
  name: string;
  employmentStatus?: string;
  function?: string | null;
  leaveDate?: string | null;
};

function ActualWorkEntriesPageContent() {
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");
  const hideWorktimeEntryPages =
    !isAdmin && (roleCodes.includes("HR") || roleCodes.includes("FINANCE"));
  const canManageAnyActualWorkEntry = canManageProjectResources(roleCodes);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<EmployeeOptionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [selectedCalendarEmployeeId, setSelectedCalendarEmployeeId] = useState<
    string | undefined
  >(undefined);
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
  const replaceCurrentSearchParams = useCallback((nextSearchParams: URLSearchParams) => {
    if (typeof window === "undefined") return;
    const nextQuery = nextSearchParams.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, []);
  const viewModeFromSearchParams = useMemo<"table" | "calendar">(() => {
    return searchParams.get(ACTUAL_WORK_VIEW_PARAM) === "calendar"
      ? "calendar"
      : "table";
  }, [searchParams]);
  const calendarEmployeeIdFromSearchParams = useMemo(
    () =>
      searchParams.get(ACTUAL_WORK_CALENDAR_EMPLOYEE_PARAM) ?? undefined,
    [searchParams],
  );

  const fetchOptions = useCallback(async () => {
    const [projectRows, employeeRows] = await Promise.all([
      fetchProjectsFromStore(),
      fetchEmployeesFromStore({ full: true }),
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
            function:
              typeof row.function === "string" ? row.function : null,
            leaveDate:
              typeof row.leaveDate === "string" ? row.leaveDate : null,
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

  useEffect(() => {
    const storedViewMode =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(ACTUAL_WORK_VIEW_STORAGE_KEY)
        : null;
    if (viewModeFromSearchParams === "calendar" || storedViewMode !== "calendar") {
      setViewMode(viewModeFromSearchParams);
      return;
    }
    setViewMode("calendar");
  }, [viewModeFromSearchParams]);

  useEffect(() => {
    if (calendarEmployeeIdFromSearchParams) {
      setSelectedCalendarEmployeeId(calendarEmployeeIdFromSearchParams);
      return;
    }
    const storedEmployeeId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(
            ACTUAL_WORK_CALENDAR_EMPLOYEE_STORAGE_KEY,
          ) ?? undefined
        : undefined;
    if (storedEmployeeId) {
      setSelectedCalendarEmployeeId(storedEmployeeId);
      return;
    }
    setSelectedCalendarEmployeeId(currentEmployeeId || undefined);
  }, [calendarEmployeeIdFromSearchParams, currentEmployeeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (viewMode === "calendar") {
      window.sessionStorage.setItem(ACTUAL_WORK_VIEW_STORAGE_KEY, viewMode);
      return;
    }
    window.sessionStorage.removeItem(ACTUAL_WORK_VIEW_STORAGE_KEY);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedCalendarEmployeeId) {
      window.sessionStorage.setItem(
        ACTUAL_WORK_CALENDAR_EMPLOYEE_STORAGE_KEY,
        selectedCalendarEmployeeId,
      );
      return;
    }
    window.sessionStorage.removeItem(
      ACTUAL_WORK_CALENDAR_EMPLOYEE_STORAGE_KEY,
    );
  }, [selectedCalendarEmployeeId]);

  const shouldShowEmployeeInCalendar = useCallback((employee: EmployeeOptionItem) => {
    const status = employee.employmentStatus ?? "";
    if (!status.includes("离职")) return true;
    if (!employee.leaveDate) return false;
    const leaveDate = dayjs(employee.leaveDate);
    if (!leaveDate.isValid()) return false;
    return leaveDate.isAfter(dayjs().subtract(1, "month").startOf("day"));
  }, []);

  const employeeFilterOptions = useMemo(
    () =>
      employees
        .map((item) => ({ label: item.name, value: item.name }))
        .sort((left, right) =>
          left.label.localeCompare(right.label, "zh-CN"),
        ),
    [employees],
  );

  const calendarEmployeeOptions = useMemo(() => {
    const grouped = employees
      .filter(shouldShowEmployeeInCalendar)
      .reduce<Map<string, { label: string; value: string }[]>>((map, employee) => {
        const functionLabel = employee.function?.trim() || "未设置职能";
        const isDeparted = (employee.employmentStatus ?? "").includes("离职");
        const option = {
          label: `${employee.name}${isDeparted ? "（离职）" : ""}`,
          value: employee.id,
        };
        const current = map.get(functionLabel) ?? [];
        current.push(option);
        map.set(functionLabel, current);
        return map;
      }, new Map());

    return Array.from(grouped.entries())
      .sort((left, right) => left[0].localeCompare(right[0], "zh-CN"))
      .map(([label, options]) => ({
        label,
        options: options.sort((left, right) =>
          left.label.localeCompare(right.label, "zh-CN"),
        ),
      })) satisfies DefaultOptionType[];
  }, [employees, shouldShowEmployeeInCalendar]);

  const selectedCalendarEmployee = useMemo<WorkLogsCalendarEmployee | null>(() => {
    if (!selectedCalendarEmployeeId) return null;
    const matched = employees.find((item) => item.id === selectedCalendarEmployeeId);
    if (!matched) return null;
    return {
      id: matched.id,
      name: matched.name,
      employmentStatus: matched.employmentStatus,
    };
  }, [employees, selectedCalendarEmployeeId]);

  const toolbarNode = (
    <Space key="actual-work-toolbar" size={12} wrap>
      <Radio.Group
        value={viewMode}
        onChange={(event) => {
          const nextViewMode = event.target.value as "table" | "calendar";
          setViewMode(nextViewMode);
          const nextSearchParams = new URLSearchParams(searchParams.toString());
          if (nextViewMode === "table") {
            nextSearchParams.delete(ACTUAL_WORK_VIEW_PARAM);
          } else {
            nextSearchParams.set(ACTUAL_WORK_VIEW_PARAM, nextViewMode);
          }
          replaceCurrentSearchParams(nextSearchParams);
        }}
        optionType="button"
        buttonStyle="solid"
        options={[
          { label: "表格", value: "table" },
          { label: "日历", value: "calendar" },
        ]}
      />
      {viewMode === "table" ? (
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
        </Button>
      ) : (
        <Select
          showSearch
          virtual={false}
          style={{ width: 160 }}
          placeholder="请选择人员"
          options={calendarEmployeeOptions}
          value={selectedCalendarEmployeeId}
          onChange={(value) => {
            setSelectedCalendarEmployeeId(value);
            const nextSearchParams = new URLSearchParams(searchParams.toString());
            if (value) {
              nextSearchParams.set(ACTUAL_WORK_CALENDAR_EMPLOYEE_PARAM, value);
            } else {
              nextSearchParams.delete(ACTUAL_WORK_CALENDAR_EMPLOYEE_PARAM);
            }
            nextSearchParams.set(
              ACTUAL_WORK_CALENDAR_DATE_PARAM,
              dayjs().format("YYYY-MM-DD"),
            );
            replaceCurrentSearchParams(nextSearchParams);
          }}
          filterOption={(input, option) =>
            String(option?.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
      )}
    </Space>
  );

  if (hideWorktimeEntryPages) {
    return <PageAccessResult type="forbidden" />;
  }

  return (
    <ListPageContainer>
      {viewMode === "table" ? (
        <ActualWorkEntriesTable
          requestData={fetchRows}
          employeeFilterOptions={employeeFilterOptions}
          projectFilterOptions={projects
            .map((item) => ({ label: item.name, value: item.name }))
            .sort((left, right) =>
              left.label.localeCompare(right.label, "zh-CN"),
            )}
          headerTitle={<ProTableHeaderTitle>实际工时</ProTableHeaderTitle>}
          toolbarActions={[toolbarNode]}
          onEdit={(row) => {
            void ensureOptionsLoaded().then(() => {
              setEditing(row);
              setOpen(true);
            });
          }}
          canManageRow={(row) =>
            canManageAnyActualWorkEntry ||
            (Boolean(currentEmployeeId) && row.employee?.id === currentEmployeeId)
          }
          onDelete={(id) => {
            void onDelete(id);
          }}
          refreshKey={refreshKey}
        />
      ) : (
        <WorkLogsCalendar
          employee={selectedCalendarEmployee}
          title={<ProTableHeaderTitle>实际工时</ProTableHeaderTitle>}
          extra={toolbarNode}
        />
      )}

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

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ActualWorkEntriesPageContent />
    </Suspense>
  );
}
