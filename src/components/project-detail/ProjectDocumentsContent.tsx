"use client";

import type { ProjectDocumentRow } from "@/components/ProjectDocumentsTable";
import ProjectDocumentsTable from "@/components/ProjectDocumentsTable";

type Props = {
  projectId: string;
  rows: ProjectDocumentRow[];
  onEdit: (record: ProjectDocumentRow) => void;
  onAfterDelete?: () => Promise<void> | void;
};

const ProjectDocumentsContent = ({
  projectId,
  rows,
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
      onEdit={onEdit}
      onDelete={async (id) => {
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
