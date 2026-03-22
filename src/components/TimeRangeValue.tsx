"use client";

import { formatDateRange } from "@/lib/date";

type DatePrecision = "DATE" | "DATETIME" | null | undefined;

type Props = {
  start?: string | null;
  end?: string | null;
  datePrecision?: DatePrecision;
  emptyText?: string;
  compactEndTime?: boolean;
  showDayOffset?: boolean;
  separator?: string;
};

const TimeRangeValue = ({
  start,
  end,
  datePrecision = "DATETIME",
  emptyText = "-",
  compactEndTime = false,
  showDayOffset = false,
  separator = " ~ ",
}: Props) => {
  const withTime = datePrecision === "DATETIME";
  return formatDateRange({
    start,
    end,
    withTime,
    emptyText,
    separator,
    compactEndTimeOnSameDay: compactEndTime,
    showDayOffset,
  });
};

export default TimeRangeValue;
