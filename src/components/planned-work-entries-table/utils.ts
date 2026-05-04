import dayjs from "dayjs";
import type { WorkdayAdjustmentRange } from "@/types/workdayAdjustment";
import type { PlannedWorkEntryRow } from "./types";

export const normalizeFilterOptions = (
  options: { text?: string; label?: string; value: string }[],
) => options.map((item) => ({ text: item.text ?? item.label ?? item.value, value: item.value }));

export const getNumericYear = (row: PlannedWorkEntryRow): number | null => {
  const raw = row.yearOption?.value ?? (row.year != null ? String(row.year) : "");
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const getNumericWeek = (row: PlannedWorkEntryRow): number | null => {
  const raw =
    row.weekNumberOption?.value ?? (row.weekNumber != null ? String(row.weekNumber) : "");
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const isDateInRange = (
  date: dayjs.Dayjs,
  startDate: string,
  endDate: string,
): boolean => {
  const start = dayjs(startDate).startOf("day");
  const end = dayjs(endDate).endOf("day");
  return (
    date.isAfter(start.subtract(1, "millisecond")) &&
    date.isBefore(end.add(1, "millisecond"))
  );
};

export const isWorkdayByAdjustments = (
  date: dayjs.Dayjs,
  workdayAdjustments: WorkdayAdjustmentRange[],
): boolean => {
  let isWorkday = date.day() >= 1 && date.day() <= 5;
  workdayAdjustments.forEach((item) => {
    if (!isDateInRange(date, item.startDate, item.endDate)) return;
    if (item.changeType === "上班") isWorkday = true;
    if (item.changeType === "休假" || item.changeType === "调休") isWorkday = false;
  });
  return isWorkday;
};

export const renderMonth = (row: PlannedWorkEntryRow): string => {
  const year = getNumericYear(row);
  const week = getNumericWeek(row);
  if (year === null || week === null) return "-";
  const weekStart = dayjs(`${year}-01-04`).startOf("isoWeek").add(week - 1, "week");
  const weekEnd = weekStart.add(6, "day");
  const startMonth = weekStart.month() + 1;
  const endMonth = weekEnd.month() + 1;
  if (startMonth === endMonth) return `${startMonth}月`;
  return `${startMonth}-${endMonth}月`;
};

export const getNameText = (row: PlannedWorkEntryRow): string => {
  const week =
    row.weekNumberOption?.value ??
    (row.weekNumber != null ? String(row.weekNumber) : "");
  const ownerName = row.task?.owner?.name ?? "";
  if (!week || !ownerName) return "-";
  return `W${week} 工时记录@${ownerName}`;
};
