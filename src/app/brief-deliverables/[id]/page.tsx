"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Popconfirm, Space, Tag, Typography, message } from "antd";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import type { DeliverableEditPayload } from "@/components/project-detail/DeliverableEditForm";
import { useBriefDetail } from "@/hooks/useBriefDetail";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import { formatDate } from "@/lib/date";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { DeliverableDetail } from "@/types/brief";

const DeliverableEditModal = dynamic(() => import("@/components/project-detail/DeliverableEditModal"));

export default function DeliverableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, notFound, refresh } = useBriefDetail<DeliverableDetail>(`/api/deliverables/${id}`);
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { canManageProject } = useProjectPermission();
  const employees = useEmployeesStore((state) => state.employees);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);

  const save = async (payload: DeliverableEditPayload) => {
    if (!canManageProject || deleting) return;
    try {
      const response = await fetch(`/api/deliverables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || "保存失败");
      setOpen(false);
      messageApi.success("交付物已保存");
      await refresh();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "保存失败，请重试");
    }
  };

  const deleteDeliverable = async () => {
    if (!canManageProject || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.text()) || "删除失败");
      setDeleteConfirmOpen(false);
      messageApi.success("交付物已删除");
      router.replace("/brief-deliverables");
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "删除失败，请重试");
      setDeleting(false);
    }
  };

  if (loading || error || !data) {
    return (
      <DetailPageContainer>
        {contextHolder}
        <Card title="交付物详情" loading={loading}>
          {error ? (
            <Alert type="error" title={error} showIcon action={<Button onClick={() => void refresh()}>重试</Button>} />
          ) : notFound ? "交付物不存在或已被删除" : null}
        </Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={
          <Space wrap>
            <span>{data.title}</span>
            <Tag color={({ DESIGN: "blue", COPY: "orange", PROJECT_MANAGEMENT: "purple", NEW_MEDIA: "cyan" } as Record<string, string>)[data.type] ?? "default"}>{({ DESIGN: "设计", COPY: "文案", PROJECT_MANAGEMENT: "项目管理", NEW_MEDIA: "新媒体" } as Record<string, string>)[data.type] ?? data.type}</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <Button icon={<EditOutlined />} disabled={!canManageProject || deleting} onClick={() => {
              void fetchEmployees();
              setOpen(true);
            }}>编辑</Button>
            <Popconfirm
              title={`确定删除交付物“${data.title}”？`}
              description="此操作不可恢复。需求单至少需要保留一个交付物。"
              open={deleteConfirmOpen}
              onOpenChange={(nextOpen) => {
                if (!deleting) setDeleteConfirmOpen(nextOpen);
              }}
              onConfirm={() => void deleteDeliverable()}
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
          <Descriptions.Item label="所属项目">
            <AppLink href={`/projects/${data.brief.project.id}`}>{data.brief.project.name}</AppLink>
          </Descriptions.Item>
          <Descriptions.Item label="所属需求单">
            <AppLink href={`/project-briefs/${data.brief.id}`}>{data.brief.title}</AppLink>
          </Descriptions.Item>
          <Descriptions.Item label="审核人">
            {data.reviewer ? <AppLink href={`/employees/${data.reviewer.id}`}>{data.reviewer.name}</AppLink> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="执行人">
            {data.assignee ? <AppLink href={`/employees/${data.assignee.id}`}>{data.assignee.name}</AppLink> : <Tag color="orange">待指派执行人</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="创建人">
            <AppLink href={`/employees/${data.creator.id}`}>{data.creator.name}</AppLink>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(data.createdAt, "YYYY-MM-DD HH:mm")}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="交付物详情">
        <Descriptions column={{ xs: 1, sm: 3 }} size="small">
          <Descriptions.Item label="交付描述" span="filled">
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 }}>{data.description}</Typography.Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="格式">
            {data.formatOptions?.length ? data.formatOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="类别">
            {data.categoryOrSceneOptions?.length ? data.categoryOrSceneOptions.map(({ option }) => <Tag key={option.id} color={option.color ?? undefined}>{option.value}</Tag>) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="规格">
            <span style={{ whiteSpace: "pre-wrap" }}>{data.specification || "-"}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="交付时间">
        <Descriptions column={{ xs: 1, sm: 3 }} size="small">
          <Descriptions.Item label="初稿日期">{formatDate(data.firstDraftAt, "YYYY-MM-DD")}</Descriptions.Item>
          <Descriptions.Item label="修改日期">{formatDate(data.revisionAt, "YYYY-MM-DD")}</Descriptions.Item>
          <Descriptions.Item label="定稿日期">{formatDate(data.finalAt, "YYYY-MM-DD")}</Descriptions.Item>
        </Descriptions>
      </Card>
      {open ? (
        <DeliverableEditModal
          open
          deliverable={data}
          employees={employees}
          onCancel={() => setOpen(false)}
          onSubmit={save}
        />
      ) : null}
    </DetailPageContainer>
  );
}
