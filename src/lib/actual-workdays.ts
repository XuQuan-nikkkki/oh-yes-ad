import dayjs from "dayjs";

export const DEFAULT_WORKDAY_HOURS = 7.5;

export const getActualWorkEntryHours = (start: string, end: string) =>
  Math.max(dayjs(end).diff(dayjs(start), "minute") / 60, 0);

export const getActualWorkDateKey = (start: string) =>
  dayjs(start).format("YYYY-MM-DD");

export const getActualWorkdayGroupKey = (employeeId: string, start: string) =>
  `${employeeId}__${getActualWorkDateKey(start)}`;

export const calculateActualWorkdays = (
  hours: number,
  totalDailyHours: number,
) => {
  if (hours === 0) return 0;
  return totalDailyHours > DEFAULT_WORKDAY_HOURS
    ? hours / totalDailyHours
    : hours / DEFAULT_WORKDAY_HOURS;
};
