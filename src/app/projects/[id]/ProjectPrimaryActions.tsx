"use client";

import { message } from "antd";
import { useRouter } from "next/navigation";
import TableActions from "@/components/TableActions";

type Props = {
  projectId: string;
  projectName?: string;
  canManageProject: boolean;
  deletingProject: boolean;
  setDeletingProject: (value: boolean) => void;
  onDeleted?: () => void;
  onOpenEdit: () => void;
};

const ProjectPrimaryActions = ({
  projectId,
  projectName,
  canManageProject,
  deletingProject,
  setDeletingProject,
  onDeleted,
  onOpenEdit,
}: Props) => {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <>
      {contextHolder}
      <TableActions
        disabled={!canManageProject}
        deleteLoading={deletingProject}
        deleteTitle={`确定删除项目「${projectName ?? ""}」？`}
        disableTextVairant
        onEdit={() => {
          if (!canManageProject) return;
          onOpenEdit();
        }}
        onDelete={async () => {
          if (!canManageProject || !projectId) return;
          setDeletingProject(true);
          const res = await fetch("/api/projects", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: projectId }),
          });
          setDeletingProject(false);
          if (!res.ok) {
            messageApi.error("删除失败");
            return;
          }
          onDeleted?.();
          messageApi.success("删除成功");
          router.back();
        }}
      />
    </>
  );
};

export default ProjectPrimaryActions;
