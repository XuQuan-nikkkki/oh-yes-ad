"use client";

import { useRouter } from "next/navigation";
import SelectOptionTag from "@/components/SelectOptionTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/projectDetail";

type Props = {
  projectId: string;
  stage?: string | null;
  stageOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  onSaved?: (project: Project) => void;
};

const ProjectStageValue = ({
  projectId,
  stage,
  stageOption,
  onSaved,
}: Props) => {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageProject = canManageProjectResources(roleCodes);

  return (
    <SelectOptionTag
      field="project.stage"
      disabled={!canManageProject}
      option={
        stageOption?.value
          ? {
              id: stageOption.id ?? "",
              value: stageOption.value,
              color: stageOption.color ?? null,
            }
          : stage
            ? {
                id: "",
                value: stage,
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
            stage: nextOption.value,
          }),
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "更新项目阶段失败");
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

export default ProjectStageValue;
