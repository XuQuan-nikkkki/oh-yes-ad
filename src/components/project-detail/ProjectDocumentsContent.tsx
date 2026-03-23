"use client";

import type { ProjectDocumentRow } from "@/components/ProjectDocumentsTable";
import ProjectDocumentsTable from "@/components/ProjectDocumentsTable";

type Props = {
  projectId: string;
  rows: ProjectDocumentRow[];
  canManageProject: boolean;
  onEdit: (record: ProjectDocumentRow) => void;
  onAfterDelete?: () => Promise<void> | void;
};

const ProjectDocumentsContent = ({
  projectId,
  rows,
  canManageProject,
  onEdit,
  onAfterDelete,
}: Props) => {
  return (
    <ProjectDocumentsTable
      rows={rows}
      headerTitle={null}
      showColumnSetting={false}
      columnKeys={[
        "name",
        "type",
        "date",
        "isFinal",
        "internalLink",
        "actions",
      ]}
      actionsDisabled={!canManageProject}
      onEdit={onEdit}
      onDelete={async (id) => {
        if (!canManageProject) return;
        await fetch(`/api/projects/${projectId}/documents/${id}`, {
          method: "DELETE",
        });
        await onAfterDelete?.();
      }}
      actionDeleteTitle="确定删除文档？"
    />
  );
};

export default ProjectDocumentsContent;
