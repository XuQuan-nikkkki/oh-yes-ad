"use client";

import { message } from "antd";
import { useRouter } from "next/navigation";
import TableActions from "@/components/TableActions";

type Props = {
  projectId: string;
  projectName?: string;
  projectType?: string;
  canManageProject: boolean;
  deletingProject: boolean;
  setDeletingProject: (value: boolean) => void;
  onOpenEdit: () => void;
};

const ProjectPrimaryActions = ({
  projectId,
  projectName,
  projectType,
  canManageProject,
  deletingProject,
  setDeletingProject,
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
          messageApi.success("删除成功");
          router.push(
            projectType === "INTERNAL" ? "/internal-projects" : "/client-projects",
          );
        }}
      />
    </>
  );
};

export default ProjectPrimaryActions;
