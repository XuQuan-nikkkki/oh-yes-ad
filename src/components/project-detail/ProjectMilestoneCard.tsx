"use client";

import { ProCard } from "@ant-design/pro-components";
import { Space, Tag } from "antd";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import dayjs from "dayjs";

export type MilestoneParticipant = {
  id: string;
  name: string;
};

export type MilestoneClientParticipant = {
  id: string;
  name: string;
  title?: string | null;
  order?: number | null;
};

export type ProjectMilestoneCardRow = {
  id: string;
  name: string;
  type?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  clientParticipants?: MilestoneClientParticipant[];
  internalParticipants?: MilestoneParticipant[];
  vendorParticipants?: MilestoneParticipant[];
};

const renderPeople = (participants?: MilestoneParticipant[]) =>
  participants && participants.length > 0
    ? participants.map((person) => person.name).join("、")
    : "-";

const renderClientPeople = (participants?: MilestoneClientParticipant[]) =>
  participants && participants.length > 0
    ? [...participants]
        .sort((left, right) => {
          const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.name.localeCompare(right.name, "zh-CN");
        })
        .map((person) =>
          person.title ? `${person.name}(${person.title})` : person.name,
        )
        .join("、")
    : "-";

const formatCountdown = (value?: string | null) => {
  if (!value) return { text: "暂无日期", urgent: false };
  const target = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const diffDays = target.diff(today, "day");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[target.day()];

  if (diffDays < 0) {
    return {
      text: `${target.format("YYYY年MM月DD日")} ${weekday}，已超期 ${Math.abs(diffDays)} 天`,
      urgent: true,
    };
  }
  if (diffDays === 0) {
    return {
      text: `${target.format("YYYY年MM月DD日")} ${weekday}，今天`,
      urgent: true,
    };
  }
  return {
    text: `${target.format("YYYY年MM月DD日")} ${weekday}，还有 ${diffDays} 天`,
    urgent: diffDays <= 3,
  };
};

type Props = {
  milestone: ProjectMilestoneCardRow;
};

const ProjectMilestoneCard = ({ milestone }: Props) => {
  const countdown = formatCountdown(milestone.date);

  return (
    <ProCard
      title={
        <span style={{ fontSize: 14 }}>
          <AppLink href={`/project-milestones/${milestone.id}`}>
            {milestone.name}
          </AppLink>
        </span>
      }
      bordered
      style={{
        height: "100%",
        width: 250,
        minWidth: 250,
        maxWidth: 250,
      }}
      headStyle={{ padding: "6px 12px 0" }}
      bodyStyle={{ padding: "4px 12px", height: "100%" }}
    >
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        <SelectOptionTag
          option={
            milestone.typeOption?.value
              ? {
                  id: milestone.typeOption.id ?? "",
                  value: milestone.typeOption.value,
                  color: milestone.typeOption.color ?? null,
                }
              : {
                  id: "",
                  value: milestone.type || "未分类",
                  color: null,
                }
          }
        />

        {milestone.clientParticipants && milestone.clientParticipants.length > 0 ? (
          <div style={{ fontSize: 12 }}>
            <Tag
              color="gold"
              style={{ fontWeight: 600, fontSize: 11, padding: "0 6px" }}
            >
              客户人员：
            </Tag>
            <div>{renderClientPeople(milestone.clientParticipants)}</div>
          </div>
        ) : null}

        {milestone.internalParticipants &&
        milestone.internalParticipants.length > 0 ? (
          <div style={{ fontSize: 12 }}>
            <Tag
              color="gold"
              style={{ fontWeight: 600, fontSize: 11, padding: "0 6px" }}
            >
              项目人员：
            </Tag>
            <div>{renderPeople(milestone.internalParticipants)}</div>
          </div>
        ) : null}

        {milestone.vendorParticipants && milestone.vendorParticipants.length > 0 ? (
          <div style={{ fontSize: 12 }}>
            <Tag
              color="gold"
              style={{ fontWeight: 600, fontSize: 11, padding: "0 6px" }}
            >
              供应商
            </Tag>
            <div>{renderPeople(milestone.vendorParticipants)}</div>
          </div>
        ) : null}

        <Tag
          color={countdown.urgent ? "red" : "green"}
          style={{ fontWeight: 600, fontSize: 11 }}
        >
          {countdown.text}
        </Tag>
      </Space>
    </ProCard>
  );
};

export default ProjectMilestoneCard;
