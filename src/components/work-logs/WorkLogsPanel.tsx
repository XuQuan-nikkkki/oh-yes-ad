"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import WorkLogsCalendar from "@/components/work-logs/WorkLogsCalendar";

export default function WorkLogsPanel() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const employee = useMemo(
    () =>
      currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
          }
        : null,
    [currentUser],
  );
  return <WorkLogsCalendar employee={employee} />;
}
