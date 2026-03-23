"use client";

import SelectOptionTag from "@/components/SelectOptionTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Props = {
  stage?: string | null;
  stageOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

const ProjectStageValue = ({ stage, stageOption }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageProject = canManageProjectResources(roleCodes);

  return (
    <SelectOptionTag
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
    />
  );
};

export default ProjectStageValue;
