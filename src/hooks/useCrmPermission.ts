"use client";

import { useEffect, useState } from "react";
import { canManageCrmResourcesByRoles } from "@/lib/role-permissions";

type MePayload = {
  roles?: Array<{
    role?: {
      code?: string | null;
    } | null;
  }>;
};

export const useCrmPermission = () => {
  const [canManageCrm, setCanManageCrm] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (active) setCanManageCrm(false);
          return;
        }
        const me = (await res.json()) as MePayload;
        if (active) {
          setCanManageCrm(canManageCrmResourcesByRoles(me));
        }
      } catch {
        if (active) setCanManageCrm(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { canManageCrm };
};
