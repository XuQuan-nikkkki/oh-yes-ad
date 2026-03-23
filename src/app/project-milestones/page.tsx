"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Calendar, Card, Radio, Space, Spin, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ListPageContainer from "@/components/ListPageContainer";
import ProjectMilestonesTable, {
  ProjectMilestoneRow,
} from "@/components/ProjectMilestonesTable";
import AppLink from "@/components/AppLink";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import type { ProjectMilestoneFormPayload } from "@/components/project-detail/ProjectMilestoneForm";
import ProjectMilestoneFormModal from "@/components/project-detail/ProjectMilestoneFormModal";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { DEFAULT_COLOR } from "@/lib/constants";

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

function ProjectMilestonesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [allEmployees, setAllEmployees] = useState<Option[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
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

  const viewModeFromSearchParams = useMemo<"table" | "calendar">(() => {
    return searchParams.get("view") === "calendar" ? "calendar" : "table";
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

  const milestonesByDate = rows.reduce<Record<string, ProjectMilestoneRow[]>>(
    (acc, row) => {
      const startRaw = row.startAt ?? row.date;
      if (!startRaw) return acc;

      const start = dayjs(startRaw).startOf("day");
      if (!start.isValid()) return acc;

      const endRaw = row.endAt ?? null;
      const end = endRaw ? dayjs(endRaw).startOf("day") : start;
      if (!end.isValid()) return acc;

      const rangeEnd = end.isBefore(start) ? start : end;
      let cursor = start;
      while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, "day")) {
        const key = cursor.format("YYYY-MM-DD");
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        cursor = cursor.add(1, "day");
      }
      return acc;
    },
    {},
  );

  const getMilestoneTooltipContent = (item: ProjectMilestoneRow) => (
    <div>
      <div>里程碑：{item.name || "-"}</div>
      <div>客户：{item.project?.client?.name ?? "-"}</div>
      <div>项目：{item.project?.name ?? "-"}</div>
      <div>类型：{item.typeOption?.value ?? item.type ?? "-"}</div>
    </div>
  );

  const toolbarActions = [
    <Radio.Group
      key="view-mode"
      optionType="button"
      value={viewMode}
      onChange={(event) => {
        const nextViewMode = event.target.value as "table" | "calendar";
        setViewMode(nextViewMode);
        const nextSearchParams = new URLSearchParams(searchParams.toString());
        if (nextViewMode === "table") {
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
        { label: "表格", value: "table" },
        { label: "日历", value: "calendar" },
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
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <ProTableHeaderTitle>项目里程碑</ProTableHeaderTitle>
            <Space size={8}>{toolbarActions}</Space>
          </div>
          <Spin spinning={rowsLoading}>
            <Calendar
              cellRender={(current) => {
                const items = milestonesByDate[current.format("YYYY-MM-DD")] ?? [];
                if (items.length === 0) return null;
                return (
                  <div style={{ marginTop: 6 }}>
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${current.format("YYYY-MM-DD")}`}
                        style={{ marginBottom: 4 }}
                      >
                        <Tag
                          color={item.typeOption?.color ?? DEFAULT_COLOR}
                          style={{ borderRadius: 6, marginInlineEnd: 0 }}
                        >
                          <Tooltip title={getMilestoneTooltipContent(item)}>
                            <span>
                              <AppLink href={`/project-milestones/${item.id}`}>
                                {item.name}
                              </AppLink>
                            </span>
                          </Tooltip>
                        </Tag>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </Spin>
        </>
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
