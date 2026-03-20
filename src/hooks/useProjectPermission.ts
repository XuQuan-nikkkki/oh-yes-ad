"use client";

import { useMemo } from "react";
import { canManageProjectResourcesByRoles } from "@/lib/role-permissions";
import { useAuthStore } from "@/stores/authStore";

export const useProjectPermission = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const canManageProject = useMemo(
    () => canManageProjectResourcesByRoles(currentUser),
    [currentUser],
  );

  return { canManageProject };
};
