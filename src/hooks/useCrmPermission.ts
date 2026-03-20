"use client";

import { useMemo } from "react";
import { canManageCrmResourcesByRoles } from "@/lib/role-permissions";
import { useAuthStore } from "@/stores/authStore";

export const useCrmPermission = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const canManageCrm = useMemo(
    () => canManageCrmResourcesByRoles(currentUser),
    [currentUser],
  );

  return { canManageCrm };
};
