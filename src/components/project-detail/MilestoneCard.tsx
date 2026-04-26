"use client";

import { ProCard } from "@ant-design/pro-components";
import {
  CheckCircleFilled,
  ClockCircleFilled,
  ScheduleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";
import MilestoneCountdownTag from "@/components/project-detail/MilestoneCountdownTag";
import MilestoneTypeValue from "@/components/project-detail/MilestoneTypeValue";

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

export type MilestoneCardRow = {
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

const participantTitleStyle = {
  fontSize: 11,
  color: "#8C8C8C",
  fontWeight: 600,
} as const;

type Props = {
  milestone: MilestoneCardRow;
  height?: number;
};

const getMilestoneDateStatus = (date?: string | null) => {
  if (!date) return null;

  const milestoneDay = dayjs(date);
  if (!milestoneDay.isValid()) return null;

  const milestoneStart = milestoneDay.startOf("day");
  const todayStart = dayjs().startOf("day");

  if (milestoneStart.isBefore(todayStart)) return "past";
  if (milestoneStart.isAfter(todayStart)) return "future";
  return "today";
};

const getCountdownIcon = (dateStatus: "past" | "today" | "future" | null) => {
  if (dateStatus === "past") {
    return <CheckCircleFilled style={{ color: "#8C8C8C", fontSize: 12 }} />;
  }
  if (dateStatus === "today") {
    return <ClockCircleFilled style={{ color: "#D15750", fontSize: 12 }} />;
  }
  if (dateStatus === "future") {
    return <ScheduleFilled style={{ color: "#4A9C78", fontSize: 12 }} />;
  }
  return null;
};

const MilestoneCard = ({ milestone, height }: Props) => {
  const dateStatus = getMilestoneDateStatus(milestone.date);
  const countdownIcon = getCountdownIcon(dateStatus);
  const rightBorderColor =
    dateStatus === "today"
      ? "#D15750"
      : dateStatus === "future"
        ? "#4A9C78"
        : undefined;

  return (
    <ProCard
      title={
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, minWidth: 0, flex: 1 }}>
            <AppLink href={`/project-milestones/${milestone.id}`}>
              {milestone.name}
            </AppLink>
          </span>
          {/* <MilestoneTypeValue
            type={milestone.type}
            typeOption={milestone.typeOption}
          /> */}
        </div>
      }
      bordered
      extra={
        <MilestoneTypeValue
          type={milestone.type}
          typeOption={milestone.typeOption}
        />
      }
      style={{
        height: height ?? "100%",
        width: "100%",
        minWidth: 0,
        opacity: dateStatus === "past" ? 0.7 : 1,
        ...(rightBorderColor
          ? { borderLeft: `3px solid ${rightBorderColor}` }
          : {}),
      }}
      headStyle={{ padding: "6px 12px 0" }}
      bodyStyle={{
        padding: "4px 12px 8px",
        height: "100%",
        overflowY: height ? "auto" : "visible",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {milestone.clientParticipants &&
          milestone.clientParticipants.length > 0 ? (
            <div style={{ fontSize: 12 }}>
              <div style={participantTitleStyle}>客户人员：</div>
              <div>{renderClientPeople(milestone.clientParticipants)}</div>
            </div>
          ) : null}

          {milestone.internalParticipants &&
          milestone.internalParticipants.length > 0 ? (
            <div style={{ fontSize: 12 }}>
              <div style={participantTitleStyle}>项目人员：</div>
              <div>{renderPeople(milestone.internalParticipants)}</div>
            </div>
          ) : null}

          {milestone.vendorParticipants &&
          milestone.vendorParticipants.length > 0 ? (
            <div style={{ fontSize: 12 }}>
              <div style={participantTitleStyle}>供应商：</div>
              <div>{renderPeople(milestone.vendorParticipants)}</div>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 10 }}>
          <MilestoneCountdownTag date={milestone.date} icon={countdownIcon} />
        </div>
      </div>
    </ProCard>
  );
};

export default MilestoneCard;
