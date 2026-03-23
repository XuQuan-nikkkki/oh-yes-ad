"use client";

import { Tag } from "antd";
import { DEFAULT_COLOR } from "@/lib/constants";

type Props = {
  entryId: string;
  weekNumber: number;
  plannedDays?: number | null;
  isCurrentWeek?: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

const PlannedWorkScheduleValue = ({
  entryId,
  weekNumber,
  plannedDays,
  isCurrentWeek = false,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
}: Props) => {
  const dayItems: Array<{ key: string; label: string; active: boolean }> = [
    { key: "monday", label: "一", active: monday },
    { key: "tuesday", label: "二", active: tuesday },
    { key: "wednesday", label: "三", active: wednesday },
    { key: "thursday", label: "四", active: thursday },
    { key: "friday", label: "五", active: friday },
    { key: "saturday", label: "六", active: saturday },
    { key: "sunday", label: "日", active: sunday },
  ];

  const visibleDays = dayItems.filter((item) => {
    if (item.key === "saturday" || item.key === "sunday") {
      return item.active;
    }
    return true;
  });
  const weekLabel = `W${String(weekNumber).padStart(2, "0")}`;

  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      <Tag
        color={isCurrentWeek ? "#ffccc7" : DEFAULT_COLOR}
        style={{
          marginInlineEnd: 0,
          fontWeight: 600,
          width: 40,
          textAlign: "center",
          padding: "0 4px 0 3px",
          color: isCurrentWeek ? "#cf1322" : DEFAULT_COLOR,
        }}
      >
        {weekLabel}
      </Tag>
      {visibleDays.map((item) => (
        <Tag
          key={`${entryId}-${item.key}`}
          color={item.active ? "#b7eb8f" : DEFAULT_COLOR}
          style={{
            marginInlineEnd: 0,
            fontWeight: 600,
            color: item.active ? "#389e0d" : DEFAULT_COLOR,
            textAlign: "center",
          }}
        >
          {item.label}
        </Tag>
      ))}
      {typeof plannedDays === "number" ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            paddingInline: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(0,0,0,0.65)",
            whiteSpace: "nowrap",
          }}
        >
          {`${Number(plannedDays.toFixed(2))}d`}
        </span>
      ) : null}
    </span>
  );
};

export default PlannedWorkScheduleValue;
