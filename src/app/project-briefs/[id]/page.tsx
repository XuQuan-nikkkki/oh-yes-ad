"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import TableActions from "@/components/TableActions";
import type { BriefFormPayload } from "@/components/project-detail/BriefForm";
import type { DeliverableEditPayload } from "@/components/project-detail/DeliverableEditForm";
import type { ProjectBriefDeliverable } from "@/components/project-detail/ProjectBriefProgressContent";
import { useBriefDetail } from "@/hooks/useBriefDetail";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { formatDate } from "@/lib/date";
import { useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { BriefDetail } from "@/types/brief";
import { DeliverableAssignmentHistory } from "@/components/project-detail/DeliverableAssignmentChange";

const BriefFormModal = dynamic(() => import("@/components/project-detail/BriefFormModal"));
const DeliverableEditModal = dynamic(() => import("@/components/project-detail/DeliverableEditModal"));
const statusLabels: Record<string, string> = {
  draft: "草稿",
  waiting_assignment: "待分配任务",
  in_progress: "进行中",
  paused: "暂停",
  completed: "已完成",
};
const statusColors: Record<string, string> = {
  waiting_assignment: "orange", in_progress: "green", paused: "gold", completed: "blue",
};

export default function BriefDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, notFound, refresh } = useBriefDetail<BriefDetail>(`/api/briefs/${id}`);
  const [open, setOpen] = useState(false);
  const [deliverableTab, setDeliverableTab] = useState("overview");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ProjectBriefDeliverable | null>(null);
  const [deletingDeliverableId, setDeletingDeliverableId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const employees = useEmployeesStore((state) => state.employees);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);

  const save = async (payload: BriefFormPayload) => {
    if (!canManageProject) return;
    try {
      const response = await fetch(`/api/briefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || "保存失败");
      setOpen(false);
      messageApi.success("需求单已保存");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "保存失败，请重试");
    }
  };

  const deleteBrief = async () => {
    if (!canManageProject || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/briefs/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.text()) || "删除失败");
      setDeleteConfirmOpen(false);
      messageApi.success("需求单及关联交付物已删除");
      router.replace("/project-briefs");
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "删除失败，请重试");
      setDeleting(false);
    }
  };

  const saveDeliverable = async (payload: DeliverableEditPayload) => {
    if (!canManageProject || !editingDeliverable || deleting) return;
    try {
      const response = await fetch(`/api/deliverables/${editingDeliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || "保存失败");
      setEditingDeliverable(null);
      messageApi.success("交付物已保存");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "保存失败，请重试");
    }
  };

  const deleteDeliverable = async (deliverable: ProjectBriefDeliverable) => {
    if (!canManageProject || deleting || deletingDeliverableId) return;
    if ((data?.deliverables?.length ?? 0) <= 1) {
      messageApi.warning("需求单至少需要保留一个交付物");
      return;
    }
    setDeletingDeliverableId(deliverable.id);
    try {
      const response = await fetch(`/api/deliverables/${deliverable.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.text()) || "删除失败");
      messageApi.success("交付物已删除");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "删除失败，请重试");
    } finally {
      setDeletingDeliverableId(null);
    }
  };

  if (loading || error || !data) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="需求单详情" loading={loading}>
          {error ? (
            <Alert type="error" title={error} showIcon action={<Button onClick={() => void refresh()}>重试</Button>} />
          ) : notFound ? "需求单不存在或已被删除" : null}
        </Card>
      </DetailPageContainer>
    );
  }

  const deliverables = data.deliverables ?? [];
  const activeDeliverable = deliverables.find((item) => item.id === deliverableTab);
  const activeDeliverableTab = activeDeliverable ? deliverableTab : "overview";
  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={data.title}
        extra={
          <Space wrap>
            <Button icon={<EditOutlined />} disabled={!canManageProject || deleting} onClick={() => {
              void fetchEmployees();
              setOpen(true);
            }}>编辑</Button>
            <Popconfirm
              title={`确定删除需求单“${data.title}”？`}
              description="关联的全部交付物及其选项关联、指派历史将一并删除，此操作不可恢复。"
              open={deleteConfirmOpen}
              onOpenChange={(nextOpen) => {
                if (!deleting) setDeleteConfirmOpen(nextOpen);
              }}
              onConfirm={() => void deleteBrief()}
              onCancel={() => setDeleteConfirmOpen(false)}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true, loading: deleting }}
              cancelButtonProps={{ disabled: deleting }}
              disabled={!canManageProject || deleting}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!canManageProject} loading={deleting}>删除</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }} size="small">
          <Descriptions.Item label="需求描述" span={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 }}>{data.description}</Typography.Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="所属项目">
            <AppLink href={`/projects/${data.project.id}`}>{data.project.name}</AppLink>
          </Descriptions.Item>
          <Descriptions.Item label="所属客户">
            {data.project.client ? <AppLink href={`/clients/${data.project.client.id}`}>{data.project.client.name}</AppLink> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {data.owner ? <AppLink href={`/employees/${data.owner.id}`}>{data.owner.name}</AppLink> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="创建人">
            {data.creator ? <AppLink href={`/employees/${data.creator.id}`}>{data.creator.name}</AppLink> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(data.createdAt, "YYYY-MM-DD HH:mm")}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusColors[data.status] ?? "default"}>{statusLabels[data.status] ?? data.status}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card
        title="需求交付物"
        tabProps={{ type: "card", size: "middle", style: { marginTop: 12 } }}
        activeTabKey={activeDeliverableTab}
        onTabChange={setDeliverableTab}
        tabBarExtraContent={activeDeliverable ? (
          <TableActions
            key={activeDeliverable.id}
            disabled={!canManageProject || deleting || Boolean(deletingDeliverableId)}
            deleteLoading={deletingDeliverableId === activeDeliverable.id}
            deleteTitle={`确定删除交付物“${activeDeliverable.title}”？此操作不可恢复。`}
            onEdit={() => {
              void fetchEmployees();
              setEditingDeliverable(activeDeliverable);
            }}
            onDelete={() => void deleteDeliverable(activeDeliverable)}
          />
        ) : undefined}
        tabList={[
          { key: "overview", label: "总览" },
          ...deliverables.map((deliverable) => ({
            key: deliverable.id,
            label: (
              <Space>
                <span>{deliverable.title}</span>
                <Tag color={({ DESIGN: "blue", COPY: "orange", PROJECT_MANAGEMENT: "purple", NEW_MEDIA: "cyan" } as Record<string, string>)[deliverable.type] ?? "default"}>
                  {({ DESIGN: "设计", COPY: "文案", PROJECT_MANAGEMENT: "项目管理", NEW_MEDIA: "新媒体" } as Record<string, string>)[deliverable.type] ?? deliverable.type}
                </Tag>
              </Space>
            ),
          })),
        ]}
      >
        {activeDeliverableTab === "overview" ? (
          <Table<ProjectBriefDeliverable>
            rowKey="id"
            dataSource={deliverables}
            scroll={{ x: "max-content" }}
            pagination={false}
            locale={{ emptyText: "暂无交付物" }}
            columns={[
              {
                title: "标题",
                dataIndex: "title",
                render: (_, row) => (
                  <Space>
                    <AppLink href={`/brief-deliverables/${row.id}`}>{row.title}</AppLink>
                    <Tag color={({ DESIGN: "blue", COPY: "orange", PROJECT_MANAGEMENT: "purple", NEW_MEDIA: "cyan" } as Record<string, string>)[row.type] ?? "default"}>{({ DESIGN: "设计", COPY: "文案", PROJECT_MANAGEMENT: "项目管理", NEW_MEDIA: "新媒体" } as Record<string, string>)[row.type] ?? row.type}</Tag>
                  </Space>
                ),
              },
              {
                title: "描述",
                dataIndex: "description",
                render: (value: string) => <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 360 }}>{value || "-"}</div>,
              },
              { title: "审核人", key: "reviewer", render: (_, row) => row.reviewer?.name ?? "-" },
              { title: "执行人", key: "assignee", render: (_, row) => row.assignee?.name ?? <Tag color="orange">待指派执行人</Tag> },
              ...([['firstDraftAt', '初稿日期'], ['revisionAt', '修改日期'], ['finalAt', '定稿日期']] as const).map(([key, title]) => ({
                title, dataIndex: key, render: (value: string) => formatDate(value, "YYYY-MM-DD"),
              })),
              {
                title: "操作",
                key: "actions",
                fixed: "right",
                width: 160,
                render: (_, row) => (
                  <TableActions
                    disabled={!canManageProject || deleting || Boolean(deletingDeliverableId)}
                    deleteLoading={deletingDeliverableId === row.id}
                    deleteTitle={`确定删除交付物“${row.title}”？此操作不可恢复。`}
                    onEdit={() => {
                      void fetchEmployees();
                      setEditingDeliverable(row);
                    }}
                    onDelete={() => void deleteDeliverable(row)}
                  />
                ),
              },
            ]}
          />
        ) : activeDeliverable ? (
          <div>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="交付物描述" span={3}>
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 }}>
                {activeDeliverable.description || "-"}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="格式">
              {activeDeliverable.formatOptions?.length
                ? activeDeliverable.formatOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="类别">
              {activeDeliverable.categoryOrSceneOptions?.length
                ? activeDeliverable.categoryOrSceneOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="规格">
              <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{activeDeliverable.specification || "-"}</span>
            </Descriptions.Item>
          </Descriptions>
          <Descriptions column={3} size="small" style={{ marginTop: 24 }}>
            <Descriptions.Item label="审核人">
              {activeDeliverable.reviewer ? <AppLink href={`/employees/${activeDeliverable.reviewer.id}`}>{activeDeliverable.reviewer.name}</AppLink> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="执行人">
              {activeDeliverable.assignee ? <AppLink href={`/employees/${activeDeliverable.assignee.id}`}>{activeDeliverable.assignee.name}</AppLink> : <Tag color="orange">待指派执行人</Tag>}
            </Descriptions.Item>
            <Descriptions.Item>{null}</Descriptions.Item>
          </Descriptions>
          <Descriptions column={3} size="small" style={{ marginTop: 24 }}>
            <Descriptions.Item label="初稿日期">{formatDate(activeDeliverable.firstDraftAt, "YYYY-MM-DD")}</Descriptions.Item>
            <Descriptions.Item label="修改日期">{formatDate(activeDeliverable.revisionAt, "YYYY-MM-DD")}</Descriptions.Item>
            <Descriptions.Item label="定稿日期">{formatDate(activeDeliverable.finalAt, "YYYY-MM-DD")}</Descriptions.Item>
          </Descriptions>
          {activeDeliverable.assignmentChanges?.length ? (
            <div style={{ marginTop: 28 }}>
              <Typography.Title level={5} style={{ marginBottom: 20 }}>
                执行人交接记录
              </Typography.Title>
              <DeliverableAssignmentHistory
                changes={activeDeliverable.assignmentChanges}
                variant="detail"
              />
            </div>
          ) : null}
          </div>
        ) : null}
      </Card>
      {editingDeliverable ? (
        <DeliverableEditModal
          open
          deliverable={editingDeliverable}
          employees={employees}
          onCancel={() => setEditingDeliverable(null)}
          onSubmit={saveDeliverable}
        />
      ) : null}
      {open && currentUser ? (
        <BriefFormModal
          open
          project={data.project}
          client={data.project.client ?? { id: "", name: "内部项目" }}
          creator={data.creator ?? currentUser}
          initialBrief={data}
          employees={employees}
          onCancel={() => setOpen(false)}
          onSubmit={save}
        />
      ) : null}
    </DetailPageContainer>
  );
}
