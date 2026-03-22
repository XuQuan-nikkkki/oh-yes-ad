"use client";

import { Tag } from "antd";
import { DEFAULT_COLOR } from "@/lib/constants";

type Props = {
  entryId: string;
  weekNumber: number;
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

  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      <Tag color={DEFAULT_COLOR} style={{ marginInlineEnd: 0, fontWeight: 600 }}>
        {`W${weekNumber}`}
      </Tag>
      {visibleDays.map((item) => (
        <Tag
          key={`${entryId}-${item.key}`}
          color={item.active ? "#b7eb8f" : DEFAULT_COLOR}
          style={{
            marginInlineEnd: 0,
            fontWeight: 600,
            color: item.active ? "#389e0d" : DEFAULT_COLOR,
          }}
        >
          {item.label}
        </Tag>
      ))}
    </span>
  );
};

export default PlannedWorkScheduleValue;
