import dayjs from "dayjs";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";

export const calculateWorkdays = (
  startDate: Date,
  endDate: Date,
  adjustments: WorkdayAdjustmentRange[] = [],
): number => {
  let workdays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split("T")[0];

    const adjustment = adjustments.find((adj) => {
      const adjStart = new Date(adj.startDate).toISOString().split("T")[0];
      const adjEnd = new Date(adj.endDate).toISOString().split("T")[0];
      return dateStr >= adjStart && dateStr <= adjEnd;
    });

    if (adjustment?.changeType === "上班") {
      workdays++;
    } else if (!adjustment && dayOfWeek >= 1 && dayOfWeek <= 5) {
      workdays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workdays;
};

export const formatProjectPeriod = (
  startDate?: string | null,
  endDate?: string | null,
  adjustments: WorkdayAdjustmentRange[] = [],
) => {
  if (!startDate) return "-";
  const start = new Date(startDate);
  const effectiveEnd = endDate ? new Date(endDate) : new Date();
  const naturalDays =
    Math.floor(
      (effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const workdays = calculateWorkdays(start, effectiveEnd, adjustments);
  const startStr = dayjs(start).format("YYYY/MM/DD");
  const endStr = endDate ? dayjs(endDate).format("YYYY/MM/DD") : "至今";
  return `${startStr} - ${endStr} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;
};
