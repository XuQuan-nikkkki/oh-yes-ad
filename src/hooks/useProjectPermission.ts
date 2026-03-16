"use client";

import { useEffect, useState } from "react";
import { canManageProjectResourcesByRoles } from "@/lib/role-permissions";

type MePayload = {
  roles?: Array<{
    role?: {
      code?: string | null;
    } | null;
  }>;
};

export const useProjectPermission = () => {
  const [canManageProject, setCanManageProject] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (active) setCanManageProject(false);
          return;
        }
        const me = (await res.json()) as MePayload;
        if (active) {
          setCanManageProject(canManageProjectResourcesByRoles(me));
        }
      } catch {
        if (active) setCanManageProject(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { canManageProject };
};
