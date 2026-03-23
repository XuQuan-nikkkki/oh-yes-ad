"use client";

import SelectOptionTag from "@/components/SelectOptionTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Props = {
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

const ProjectStatusValue = ({ status, statusOption }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageProject = canManageProjectResources(roleCodes);

  return (
    <SelectOptionTag
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
    />
  );
};

export default ProjectStatusValue;
