import dayjs from "dayjs";
import { DATE_FORMAT, DATETIME_FORMAT } from "@/lib/constants";

export const formatDate = (
  value?: string | number | Date | null,
  format: string = DATE_FORMAT,
  emptyText = "-",
) => {
  if (value === undefined || value === null || value === "") return emptyText;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(format) : emptyText;
};

export const formatDateTime = (
  value?: string | number | Date | null,
  emptyText = "-",
) => formatDate(value, DATETIME_FORMAT, emptyText);

export const formatDateRange = (options: {
  start?: string | number | Date | null;
  end?: string | number | Date | null;
  withTime?: boolean;
  emptyText?: string;
  separator?: string;
  compactEndTimeOnSameDay?: boolean;
  showDayOffset?: boolean;
}) => {
  const {
    start,
    end,
    withTime = false,
    emptyText = "-",
    separator = " ~ ",
    compactEndTimeOnSameDay = false,
    showDayOffset = false,
  } = options;

  if (start === undefined || start === null || start === "") return emptyText;
  const startAt = dayjs(start);
  if (!startAt.isValid()) return emptyText;

  const fullFormat = withTime ? DATETIME_FORMAT : DATE_FORMAT;
  const startText = startAt.format(fullFormat);
  if (end === undefined || end === null || end === "") return startText;

  const endAt = dayjs(end);
  if (!endAt.isValid()) return startText;
  if (endAt.valueOf() === startAt.valueOf()) return startText;

  const compactEndFormat = withTime
    ? endAt.isSame(startAt, "year")
      ? "MM-DD HH:mm"
      : DATETIME_FORMAT
    : endAt.isSame(startAt, "year")
      ? "MM-DD"
      : DATE_FORMAT;

  if (compactEndTimeOnSameDay && withTime && endAt.isSame(startAt, "day")) {
    const dayDiff = endAt.startOf("day").diff(startAt.startOf("day"), "day");
    const suffix = showDayOffset && dayDiff > 0 ? `(+${dayDiff})` : "";
    return `${startText}${separator}${endAt.format("HH:mm")}${suffix}`;
  }

  if (withTime && endAt.isSame(startAt, "day")) {
    return `${startText}${separator}${endAt.format("HH:mm")}`;
  }

  if (!withTime && endAt.isSame(startAt, "day")) return startText;
  return `${startText}${separator}${endAt.format(compactEndFormat)}`;
};
