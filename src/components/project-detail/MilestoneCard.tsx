"use client";

import { ProCard } from "@ant-design/pro-components";
import { Space, Tag } from "antd";
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

type Props = {
  milestone: MilestoneCardRow;
  height?: number;
};

const MilestoneCard = ({ milestone, height }: Props) => {
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
        height: height ?? "100%",
        width: "100%",
        minWidth: 0,
      }}
      headStyle={{ padding: "6px 12px 0" }}
      bodyStyle={{
        padding: "4px 12px 8px",
        height: "100%",
        overflowY: height ? "auto" : "visible",
      }}
    >
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        <MilestoneTypeValue
          type={milestone.type}
          typeOption={milestone.typeOption}
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

        <MilestoneCountdownTag date={milestone.date} />
      </Space>
    </ProCard>
  );
};

export default MilestoneCard;
