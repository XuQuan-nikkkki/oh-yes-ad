"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import ProjectDocumentForm, {
  ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectDocumentsStore } from "@/stores/projectDocumentsStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

export type MilestoneTableRow = {
  id: string;
  name: string;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  location?: string | null;
  methodOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type Detail = {
  id: string;
  name: string;
  typeOption?: NullableSelectOptionValue;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
  project?: { id: string; name: string };
  milestone?: MilestoneTableRow | null;
};

export default function Page() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManageProjectDocuments = useMemo(
    () => canManageProjectResources(roleCodes),
    [roleCodes],
  );
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const removeDocumentFromStore = useProjectDocumentsStore(
    (state) => state.removeDocument,
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/project-documents/${id}`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchDetail();
    })();
  }, [id, fetchDetail]);

  const onEdit = () => {
    if (!canManageProjectDocuments || !data) return;
    setOpen(true);
  };

  const onSubmit = async (values: ProjectDocumentFormPayload) => {
    if (!canManageProjectDocuments) return;
    const payload = {
      name: values.name,
      projectId: values.projectId ?? data?.project?.id,
      typeOption: values.typeOption ?? null,
      date: values.date ?? null,
      isFinal: Boolean(values.isFinal),
      internalLink: values.internalLink ?? null,
    };
    const res = await fetch(`/api/project-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      messageApi.error("更新失败");
      return;
    }
    messageApi.success("更新成功");
    setOpen(false);
    await fetchDetail();
  };

  const onDelete = async () => {
    if (!canManageProjectDocuments) return;
    setDeleting(true);
    const res = await fetch(`/api/project-documents/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    removeDocumentFromStore(id);
    messageApi.success("删除成功");
    router.push("/project-documents");
  };

  if (loading) {
    return (
      <DetailPageContainer>
        <Card title="项目资料详情" loading />
      </DetailPageContainer>
    );
  }

  if (!data) {
    return (
      <DetailPageContainer>
        <Card title="项目资料详情">项目资料不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={`项目资料：${data.name}`}
        extra={
          <Space>
            {canManageProjectDocuments ? (
              <>
                <Button icon={<EditOutlined />} onClick={onEdit}>
                  编辑
                </Button>
                <Popconfirm
                  title={`确定删除资料「${data.name}」？`}
                  okText="删除"
                  icon={<DeleteOutlined />}
                  cancelText="取消"
                  onConfirm={() => void onDelete()}
                  okButtonProps={{ danger: true, loading: deleting }}
                >
                  <Button danger loading={deleting}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            ) : null}
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="所属项目">
            {data.project ? (
              <AppLink href={`/projects/${data.project.id}`}>
                {data.project.name}
              </AppLink>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="类型">
            {canManageProjectDocuments ? (
              <SelectOptionQuickEditTag
                field="projectDocument.type"
                option={data.typeOption}
                modalTitle="修改资料类型"
                modalDescription="勾选只会暂存类型切换。点击保存后会一并保存选项改动、排序和资料类型。"
                optionValueLabel="类型值"
                saveSuccessText="资料类型已保存"
                onSaveSelection={async (nextOption) => {
                  const res = await fetch(`/api/project-documents/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      typeOption: nextOption,
                    }),
                  });
                  if (!res.ok) {
                    throw new Error((await res.text()) || "更新类型失败");
                  }
                }}
                onUpdated={fetchDetail}
              />
            ) : (
              data.typeOption?.value ?? "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="日期">
            {data.date ? dayjs(data.date).format("YYYY-MM-DD") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="是最终版">
            <Checkbox
              checked={data.isFinal}
              onChange={() => {}}
              style={{ pointerEvents: "none" }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="内部链接">
            {data.internalLink ? (
              <a
                href={data.internalLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "gray",
                  textDecoration: "underline",
                }}
              >
                {data.internalLink}
              </a>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="关联里程碑">
            {data.milestone ? (
              <AppLink href={`/milestones/${data.milestone.id}`}>
                {data.milestone.name}
              </AppLink>
            ) : (
              "-"
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="编辑资料"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <ProjectDocumentForm
          projectOptions={
            data.project ? [{ id: data.project.id, name: data.project.name }] : []
          }
          showProjectField
          disableProjectSelect
          initialValues={{
            id: data.id,
            name: data.name,
            projectId: data.project?.id,
            milestoneId: data.milestone?.id ?? null,
            typeOption: data.typeOption ?? null,
            date: data.date ?? null,
            isFinal: data.isFinal,
            internalLink: data.internalLink ?? null,
          }}
          onSubmit={onSubmit}
        />
      </Modal>
    </DetailPageContainer>
  );
}
