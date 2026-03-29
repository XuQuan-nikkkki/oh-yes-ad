"use client";

import { useRouter } from "next/navigation";
import SelectOptionTag from "@/components/SelectOptionTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/projectDetail";

type Props = {
  projectId: string;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  onSaved?: (project: Project) => void;
};

const ProjectStatusValue = ({
  projectId,
  status,
  statusOption,
  onSaved,
}: Props) => {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageProject = canManageProjectResources(roleCodes);

  return (
    <SelectOptionTag
      field="project.status"
      disabled={!canManageProject}
      option={
        statusOption?.value
          ? {
              id: statusOption.id ?? "",
              value: statusOption.value,
              color: statusOption.color ?? null,
            }
          : status
            ? {
                id: "",
                value: status,
                color: null,
              }
            : null
      }
      onSaveSelection={async (nextOption) => {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextOption.value,
          }),
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "更新项目状态失败");
        }

        const updatedProject = (await response.json()) as Project;
        onSaved?.(updatedProject);
      }}
      onUpdated={async () => {
        router.refresh();
      }}
    />
  );
};

export default ProjectStatusValue;
