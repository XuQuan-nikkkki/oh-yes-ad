"use client";

import { Tag } from "antd";
import type { PresetColorType } from "antd/es/_util/colors";
import dayjs from "dayjs";

type CountdownTag = {
  text: string;
  color: PresetColorType | "default";
};

const formatCountdown = (value?: string | null): CountdownTag => {
  if (!value) {
    return { text: "暂无日期", color: "default" as PresetColorType | "default" };
  }
  const target = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const diffDays = target.diff(today, "day");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[target.day()];
  const dateText = `${target.format("YYYY年MM月DD日")} ${weekday}`;

  if (diffDays < 0) {
    return {
      text: dateText,
      color: "default" as const,
    };
  }
  if (diffDays === 0) {
    return {
      text: `${dateText}，今天`,
      color: "red" as const,
    };
  }
  return {
    text: `${dateText}，还有 ${diffDays} 天`,
    color: diffDays <= 3 ? "red" : "green",
  };
};

type Props = {
  date?: string | null;
};

const MilestoneCountdownTag = ({ date }: Props) => {
  const countdown = formatCountdown(date);

  return (
    <Tag color={countdown.color} style={{ fontWeight: 600, fontSize: 11 }}>
      {countdown.text}
    </Tag>
  );
};

export default MilestoneCountdownTag;
