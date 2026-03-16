"use client";

import { useEffect, useState } from "react";
import { Button, Card, Modal, message } from "antd";
import ProjectDocumentsTable, {
  ProjectDocumentRow,
} from "@/components/ProjectDocumentsTable";
import ProjectDocumentForm, {
  type ProjectDocumentFormPayload,
} from "@/components/project-detail/ProjectDocumentForm";

type MilestoneOption = {
  id: string;
  name: string;
  project?: {
    id: string;
  } | null;
};

export default function Page() {
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState<ProjectDocumentRow[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDocumentRow | null>(null);

  const fetchData = async () => {
    const [documentsRes, projectsRes, milestonesRes] = await Promise.all([
      fetch("/api/project-documents"),
      fetch("/api/projects"),
      fetch("/api/project-milestones"),
    ]);
    const milestonesPayload = await milestonesRes.json();
    setRows(await documentsRes.json());
    setProjects(await projectsRes.json());
    setMilestones(Array.isArray(milestonesPayload) ? milestonesPayload : []);
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const onEdit = (row: ProjectDocumentRow) => {
    setEditing(row);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/project-documents/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const onSubmit = async (payload: ProjectDocumentFormPayload) => {
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

    if (editing) {
      await fetch(`/api/project-documents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/project-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setOpen(false);
    setEditing(null);
    await fetchData();
  };

  return (
    <>
      {contextHolder}
      <Card styles={{ body: { padding: 12 } }}>
        <ProjectDocumentsTable
          rows={rows}
          onEdit={onEdit}
          onDelete={(id) => {
            void onDelete(id);
          }}
          headerTitle={<h3 style={{ margin: 0 }}>项目资料</h3>}
          toolbarActions={[
            <Button
              key="create-project-document"
              type="primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              新增资料
            </Button>,
          ]}
        />

        <Modal
          title={editing ? "编辑资料" : "新增资料"}
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          forceRender
          destroyOnHidden
        >
          <ProjectDocumentForm
            showProjectField
            showMilestoneField
            projectOptions={projects}
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
      </Card>
    </>
  );
}
