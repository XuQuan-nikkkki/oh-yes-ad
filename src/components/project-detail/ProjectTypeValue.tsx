"use client";

import { useRouter } from "next/navigation";
import SelectOptionTag from "@/components/SelectOptionTag";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Props = {
  projectId: string;
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

const PROJECT_TYPE_MAP: Record<string, string> = {
  CLIENT: "客户项目",
  INTERNAL: "内部项目",
};

const ProjectTypeValue = ({ projectId, type, typeOption }: Props) => {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageProject = canManageProjectResources(roleCodes);

  return (
    <SelectOptionTag
      field="project.type"
      disabled={!canManageProject}
      option={
        typeOption?.value
          ? {
              id: typeOption.id ?? "",
              value: typeOption.value,
              color: typeOption.color ?? null,
            }
          : type
            ? {
                id: "",
                value: PROJECT_TYPE_MAP[type] || type || "-",
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
            type: nextOption.value,
          }),
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "更新项目类型失败");
        }
      }}
      onUpdated={async () => {
        router.refresh();
      }}
    />
  );
};

export default ProjectTypeValue;
