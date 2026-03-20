"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Calendar, Card, Modal, Radio, Space, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProjectMilestonesTable, {
  ProjectMilestoneRow,
} from "@/components/ProjectMilestonesTable";
import AppLink from "@/components/AppLink";
import ProjectMilestoneForm, {
  ProjectMilestoneFormPayload,
} from "@/components/project-detail/ProjectMilestoneForm";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useEmployeesStore } from "@/stores/employeesStore";

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
  const [rows, setRows] = useState<ProjectMilestoneRow[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [allEmployees, setAllEmployees] = useState<Option[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneRow | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined,
  );
  const [projectContext, setProjectContext] = useState<ProjectContext>(EMPTY_CONTEXT);
  const { canManageProject } = useProjectPermission();
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  const fetchData = useCallback(async () => {
    const [res1, res2, employees] = await Promise.all([
      fetch("/api/project-milestones"),
      fetch("/api/projects"),
      fetchEmployeesFromStore(),
    ]);
    setRows(await res1.json());
    setProjects(await res2.json());
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

  const onEdit = (row: ProjectMilestoneRow) => {
    if (!canManageProject) return;
    setEditing(row);
    setSelectedProjectId(row.project?.id);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!canManageProject) return;
    await fetch(`/api/project-milestones/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (payload: ProjectMilestoneFormPayload) => {
    if (!canManageProject) return;
    const projectId = payload.projectId ?? selectedProjectId;
    if (!projectId) return;

    const body = {
      ...payload,
      projectId,
    };

    if (editing) {
      await fetch(`/api/project-milestones/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/project-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setOpen(false);
    setEditing(null);
    await fetchData();
  };

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
        setSelectedProjectId(projects[0]?.id);
        setOpen(true);
      }}
    >
      新增里程碑
    </Button>,
  ];

  return (
    <Card styles={{ body: { padding: 12 } }}>
      {viewMode === "table" ? (
        <ProjectMilestonesTable
          rows={rows}
          onEdit={onEdit}
          onDelete={(id) => {
            void onDelete(id);
          }}
          actionsDisabled={!canManageProject}
          headerTitle={<h3 style={{ margin: 0 }}>项目里程碑</h3>}
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
            <h3 style={{ margin: 0 }}>项目里程碑</h3>
            <Space size={8}>{toolbarActions}</Space>
          </div>
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
                        color={item.typeOption?.color ?? "#d9d9d9"}
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
        </>
      )}

      {open ? (
        <Modal
          title={editing ? "编辑里程碑" : "新增里程碑"}
          open={open}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          footer={null}
          destroyOnHidden
        >
          <ProjectMilestoneForm
            initialValues={editing}
            projectMembers={projectContext.members}
            allEmployees={allEmployees}
            clientParticipants={projectContext.clientParticipants}
            vendors={projectContext.vendors}
            projectOptions={projects}
            selectedProjectId={selectedProjectId}
            disableProjectSelect={false}
            onProjectChange={(projectId) => setSelectedProjectId(projectId)}
            onSubmit={onSubmit}
          />
        </Modal>
      ) : null}
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Card loading />}>
      <ProjectMilestonesPageContent />
    </Suspense>
  );
}
