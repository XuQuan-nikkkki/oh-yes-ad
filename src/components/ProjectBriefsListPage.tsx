"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Alert, Button, Tag, message } from "antd";
import AppLink from "@/components/AppLink";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import TableActions from "@/components/TableActions";
import type { ProjectBrief, ProjectBriefWorkItem } from "@/components/project-detail/ProjectBriefProgressContent";
import type { BriefFormPayload } from "@/components/project-detail/BriefForm";
import type { WorkItemEditPayload } from "@/components/project-detail/WorkItemEditForm";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { formatDate } from "@/lib/date";

const BriefFormModal = dynamic(() => import("@/components/project-detail/BriefFormModal"));
const WorkItemEditModal = dynamic(() => import("@/components/project-detail/WorkItemEditModal"));

type BriefRow = ProjectBrief & {
  project: { id: string; name: string; client?: { id: string; name: string } | null };
};
type WorkItemRow = ProjectBriefWorkItem & { brief: BriefRow };

const statusLabels: Record<string, string> = {
  draft: "草稿",
  waiting_assignment: "待分配任务",
  in_progress: "进行中",
  paused: "暂停",
  completed: "已完成",
};

const statusColors: Record<string, string> = {
  waiting_assignment: "orange",
  in_progress: "green",
  paused: "gold",
  completed: "blue",
};

function filterColumn<T>(rows: T[], getValue: (row: T) => string): Pick<ProColumns<T>, "filters" | "filterSearch" | "onFilter"> {
  return {
    filters: [...new Set(rows.map(getValue).filter(Boolean))].map((value) => ({ text: value, value })),
    filterSearch: true,
    onFilter: (value, row) => getValue(row) === String(value),
  };
}

export default function ProjectBriefsListPage({ mode }: { mode: "briefs" | "workItems" }) {
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBrief, setEditingBrief] = useState<BriefRow | null>(null);
  const [deletingBriefId, setDeletingBriefId] = useState<string | null>(null);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItemRow | null>(null);
  const [deletingWorkItemId, setDeletingWorkItemId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const employees = useEmployeesStore((state) => state.employees);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/briefs", { cache: "no-store", signal });
      if (!response.ok) throw new Error("加载需求数据失败，请重试");
      const data: BriefRow[] = await response.json();
      if (!signal?.aborted) setBriefs(data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "加载失败，请重试");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const workItems = useMemo(
    () => briefs.flatMap((brief) => (brief.workItems ?? []).map((item) => ({ ...item, brief }))),
    [briefs],
  );

  const save = async (url: string, payload: BriefFormPayload | WorkItemEditPayload) => {
    if (!canManageProject) return;
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || "保存失败");
      setEditingBrief(null);
      setEditingWorkItem(null);
      messageApi.success("保存成功");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "保存失败，请重试");
    }
  };

  const deleteBrief = async (id: string) => {
    if (!canManageProject || deletingBriefId) return;
    setDeletingBriefId(id);
    try {
      const response = await fetch(`/api/briefs/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.text()) || "删除失败");
      messageApi.success("需求单及关联工作项已删除");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "删除失败，请重试");
    } finally {
      setDeletingBriefId(null);
    }
  };

  const deleteWorkItem = async (id: string) => {
    if (!canManageProject || deletingWorkItemId) return;
    setDeletingWorkItemId(id);
    try {
      const response = await fetch(`/api/work-items/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.text()) || "删除失败");
      messageApi.success("删除成功");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "删除失败，请重试");
    } finally {
      setDeletingWorkItemId(null);
    }
  };

  const briefColumns: ProColumns<BriefRow>[] = [
    { title: "需求单名称", dataIndex: "title", width: 180, ellipsis: true, ...filterColumn(briefs, (row) => row.title), render: (_, row) => <AppLink href={`/project-briefs/${row.id}`}>{row.title}</AppLink> },
    { title: "需求描述", dataIndex: "description", width: 200, render: (_, row) => <div style={{ width: 200, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{row.description || "-"}</div> },
    { title: "所属项目", key: "project", width: 220, ...filterColumn(briefs, (row) => row.project.name), render: (_, row) => <AppLink href={`/projects/${row.project.id}`}>{row.project.name}</AppLink> },
    // TODO: 细化需求单状态 UI 时，在列表页支持手动修改状态。
    { title: "状态", key: "status", ...filterColumn(briefs, (row) => statusLabels[row.status] ?? row.status), render: (_, row) => <Tag color={statusColors[row.status] ?? "default"}>{statusLabels[row.status] ?? row.status}</Tag> },
    { title: "负责人", key: "owner", ...filterColumn(briefs, (row) => row.owner?.name ?? ""), render: (_, row) => row.owner?.name ?? "-" },
    { title: "创建人", key: "creator", ...filterColumn(briefs, (row) => row.creator?.name ?? ""), render: (_, row) => row.creator?.name ?? "-" },
    { title: "创建日期", dataIndex: "createdAt", sorter: (a, b) => a.createdAt.localeCompare(b.createdAt), render: (_, row) => formatDate(row.createdAt, "YYYY-MM-DD") },
    { title: "操作", valueType: "option", render: (_, row) => <TableActions disabled={!canManageProject || deletingBriefId !== null} onEdit={() => { void fetchEmployees(); setEditingBrief(row); }} onDelete={() => void deleteBrief(row.id)} deleteLoading={deletingBriefId === row.id} deleteTitle={`确定删除需求单“${row.title}”？关联工作项将一并删除，且无法恢复。`} /> },
  ];

  const workItemColumns: ProColumns<WorkItemRow>[] = [
    { title: "工作项名称", dataIndex: "title", width: 180, ellipsis: true, ...filterColumn(workItems, (row) => row.title), render: (_, row) => <AppLink href={`/brief-work-items/${row.id}`}>{row.title}</AppLink> },
    { title: "描述", dataIndex: "description", width: 220, render: (_, row) => <div style={{ width: 220, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{row.description || "-"}</div> },
    { title: "类型", key: "type", ...filterColumn(workItems, (row) => ({ DESIGN: "设计", COPY: "文案", PROJECT_MANAGEMENT: "项目管理", NEW_MEDIA: "新媒体" }[row.type] ?? row.type)), render: (_, row) => { const meta = ({ DESIGN: ["设计", "blue"], COPY: ["文案", "orange"], PROJECT_MANAGEMENT: ["项目管理", "purple"], NEW_MEDIA: ["新媒体", "cyan"] } as Record<string, [string, string]>)[row.type] ?? [row.type, "default"]; return <Tag color={meta[1]}>{meta[0]}</Tag>; } },
    { title: "所属项目", key: "project", width: 200, ...filterColumn(workItems, (row) => row.brief.project.name), render: (_, row) => <AppLink href={`/projects/${row.brief.project.id}`}>{row.brief.project.name}</AppLink> },
    { title: "所属需求单", key: "brief", width: 180, ...filterColumn(workItems, (row) => row.brief.title), render: (_, row) => <AppLink href={`/project-briefs/${row.brief.id}`}>{row.brief.title}</AppLink> },
    { title: "审核人", key: "reviewer", ...filterColumn(workItems, (row) => row.reviewer?.name ?? ""), render: (_, row) => row.reviewer?.name ?? "-" },
    { title: "执行人", key: "assignee", ...filterColumn(workItems, (row) => row.assignee?.name ?? "待指派执行人"), render: (_, row) => row.assignee?.name ?? <Tag color="orange">待指派执行人</Tag> },
    { title: "格式", key: "formatOptions", width: 180, render: (_, row) => row.formatOptions?.length ? row.formatOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>) : "-" },
    { title: "类别/场景", key: "categoryOrSceneOptions", width: 200, render: (_, row) => row.categoryOrSceneOptions?.length ? row.categoryOrSceneOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>) : "-" },
    { title: "规格", dataIndex: "specification", width: 180, ellipsis: true, render: (_, row) => row.specification || "-" },
    ...([['firstDraftAt', '初稿日期'], ['revisionAt', '修改日期'], ['finalAt', '定稿日期']] as const).map(([key, title]): ProColumns<WorkItemRow> => ({
      title, dataIndex: key, width: 120,
      sorter: (a, b) => (a[key] ?? "").localeCompare(b[key] ?? ""),
      render: (_, row) => formatDate(row[key], "YYYY-MM-DD"),
    })),
    { title: "操作", valueType: "option", render: (_, row) => <TableActions disabled={!canManageProject || deletingWorkItemId !== null} onEdit={() => { void fetchEmployees(); setEditingWorkItem(row); }} onDelete={() => void deleteWorkItem(row.id)} deleteLoading={deletingWorkItemId === row.id} deleteTitle={`确定删除工作项“${row.title}”？删除后无法恢复。`} /> },
  ];

  const tableProps = {
    rowKey: "id",
    loading,
    search: false as const,
    scroll: { x: "max-content" },
    pagination: { defaultPageSize: 20, showSizeChanger: true },
    options: { reload: false, density: false, fullScreen: false, setting: { draggable: false } },
    toolBarRender: () => [],
  };

  return (
    <ListPageContainer>
      {contextHolder}
      {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => void refresh()}>重试</Button>} /> : null}
      {mode === "briefs" ? (
        <ProTable<BriefRow>
          {...tableProps}
          columns={briefColumns}
          dataSource={briefs}
          headerTitle={<ProTableHeaderTitle>项目需求单</ProTableHeaderTitle>}
          locale={{ emptyText: "暂无项目需求单" }}
        />
      ) : (
        <ProTable<WorkItemRow>
          {...tableProps}
          columns={workItemColumns}
          columnsState={{
            defaultValue: {
              formatOptions: { show: false },
              categoryOrSceneOptions: { show: false },
              specification: { show: false },
              firstDraftAt: { show: false },
              revisionAt: { show: false },
              finalAt: { show: false },
            },
          }}
          dataSource={workItems}
          headerTitle={<ProTableHeaderTitle>需求工作项</ProTableHeaderTitle>}
          locale={{ emptyText: "暂无需求工作项" }}
        />
      )}
      {editingBrief && currentUser ? <BriefFormModal open project={editingBrief.project} client={editingBrief.project.client ?? { id: "", name: "内部项目" }} creator={editingBrief.creator ?? currentUser} initialBrief={editingBrief} employees={employees} onCancel={() => setEditingBrief(null)} onSubmit={(payload) => save(`/api/briefs/${editingBrief.id}`, payload)} /> : null}
      {editingWorkItem ? <WorkItemEditModal open workItem={editingWorkItem} employees={employees} onCancel={() => setEditingWorkItem(null)} onSubmit={(payload) => save(`/api/work-items/${editingWorkItem.id}`, payload)} /> : null}
    </ListPageContainer>
  );
}
