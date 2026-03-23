"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, message } from "antd";
import ProjectDocumentsTable, {
  ProjectDocumentRow,
} from "@/components/ProjectDocumentsTable";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import ProjectDocumentForm, {
  type ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectDocumentsStore } from "@/stores/projectDocumentsStore";
import { useProjectMilestonesStore } from "@/stores/projectMilestonesStore";
import { useProjectsStore } from "@/stores/projectsStore";

type MilestoneOption = {
  id: string;
  name: string;
  project?: {
    id: string;
  } | null;
};

export default function Page() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManageProjectDocuments = useMemo(
    () => canManageProjectResources(roleCodes),
    [roleCodes],
  );
  const [messageApi, contextHolder] = message.useMessage();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDocumentRow | null>(null);
  const rows = useProjectDocumentsStore((state) => state.rows);
  const rowsLoading = useProjectDocumentsStore((state) => state.loading);
  const fetchDocumentsFromStore = useProjectDocumentsStore(
    (state) => state.fetchDocuments,
  );
  const upsertDocuments = useProjectDocumentsStore((state) => state.upsertDocuments);
  const removeDocument = useProjectDocumentsStore((state) => state.removeDocument);
  const milestones = useProjectMilestonesStore(
    (state) => state.rows as MilestoneOption[],
  );
  const fetchMilestonesFromStore = useProjectMilestonesStore(
    (state) => state.fetchMilestones,
  );
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchDocumentsFromStore(), fetchMilestonesFromStore()]);
  }, [fetchDocumentsFromStore, fetchMilestonesFromStore]);

  const fetchProjectOptions = useCallback(async () => {
    const projects = await fetchProjectsFromStore();
    setProjects(
      Array.isArray(projects)
        ? projects
            .filter(
              (item): item is { id: string; name: string } =>
                Boolean(item.id && item.name),
            )
            .map((item) => ({ id: item.id, name: item.name }))
        : [],
    );
  }, [fetchProjectsFromStore]);

  const refreshDocument = useCallback(
    async (documentId: string) => {
      const res = await fetch(`/api/project-documents/${documentId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "获取资料失败");
      }
      const next = (await res.json()) as ProjectDocumentRow | null;
      if (next?.id) {
        upsertDocuments([next]);
      }
    },
    [upsertDocuments],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const onEdit = (row: ProjectDocumentRow) => {
    if (!canManageProjectDocuments) return;
    if (projects.length === 0) {
      void fetchProjectOptions();
    }
    setEditing(row);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!canManageProjectDocuments) return;
    const res = await fetch(`/api/project-documents/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    removeDocument(id);
  };

  const onSubmit = async (payload: ProjectDocumentFormPayload) => {
    if (!canManageProjectDocuments) return;
    if (!payload.projectId) {
      messageApi.error("请选择所属项目");
      return;
    }

    const body = {
      name: payload.name,
      projectId: payload.projectId,
      milestoneId: payload.milestoneId ?? null,
      typeOption: payload.typeOption ?? null,
      date: payload.date ?? null,
      isFinal: Boolean(payload.isFinal),
      internalLink: payload.internalLink ?? null,
    };

    let res: Response;
    if (editing) {
      res = await fetch(`/api/project-documents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/project-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setOpen(false);
    setEditing(null);
    if (!res.ok) {
      await fetchDocumentsFromStore(true);
      return;
    }
    const next = (await res.json()) as ProjectDocumentRow | null;
    if (next?.id) {
      upsertDocuments([next]);
      return;
    }
    await fetchDocumentsFromStore(true);
  };

  const updateDocumentType = async (
    row: ProjectDocumentRow,
    nextOption: { id: string; value: string; color: string },
  ) => {
    if (!canManageProjectDocuments) return;
    const res = await fetch(`/api/project-documents/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeOption: nextOption,
      }),
    });

    if (!res.ok) {
      throw new Error((await res.text()) || "更新类型失败");
    }

    const next = (await res.json()) as ProjectDocumentRow | null;
    if (next?.id) {
      upsertDocuments([next]);
    }
  };

  const formProjectOptions =
    editing?.project && !projects.some((item) => item.id === editing.project?.id)
      ? [...projects, { id: editing.project.id, name: editing.project.name }]
      : projects;

  return (
    <>
      {contextHolder}
      <ListPageContainer>
        <ProjectDocumentsTable
          rows={rows}
          loading={rowsLoading}
          actionsDisabled={!canManageProjectDocuments}
          onEdit={onEdit}
          onDelete={(id) => {
            void onDelete(id);
          }}
          renderTypeOption={(record) => (
            canManageProjectDocuments ? (
              <SelectOptionQuickEditTag
                field="projectDocument.type"
                option={record.typeOption ?? null}
                modalTitle="修改资料类型"
                modalDescription="勾选只会暂存类型切换。点击保存后会一并保存选项改动、排序和资料类型。"
                optionValueLabel="类型值"
                saveSuccessText="资料类型已保存"
                onSaveSelection={(nextOption) => updateDocumentType(record, nextOption)}
                onUpdated={async () => {
                  await refreshDocument(record.id);
                }}
              />
            ) : (
              record.typeOption?.value ?? "-"
            )
          )}
          headerTitle={<ProTableHeaderTitle>项目资料</ProTableHeaderTitle>}
          toolbarActions={[
            ...(canManageProjectDocuments
              ? [
                  <Button
                    key="create-project-document"
                    type="primary"
                    onClick={() => {
                      if (projects.length === 0) {
                        void fetchProjectOptions();
                      }
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    新增资料
                  </Button>,
                ]
              : []),
        ]}
        />

        <Modal
          title={editing ? "编辑资料" : "新增资料"}
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          width={860}
          destroyOnHidden
        >
          <ProjectDocumentForm
            showProjectField
            showMilestoneField
            projectOptions={formProjectOptions}
            milestoneOptions={milestones.map((item) => ({
              id: item.id,
              name: item.name,
              projectId: item.project?.id ?? null,
            }))}
            initialValues={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    projectId: editing.project?.id,
                    milestoneId: editing.milestone?.id ?? null,
                    typeOption: editing.typeOption,
                    date: editing.date,
                    isFinal: editing.isFinal,
                    internalLink: editing.internalLink,
                  }
                : null
            }
            onSubmit={onSubmit}
          />
        </Modal>
      </ListPageContainer>
    </>
  );
}
