"use client";

import { Button, Space } from "antd";
import type { ComponentProps } from "react";
import MilestoneNoticeTemplate from "@/components/project-detail/MilestoneNoticeTemplate";

type MilestoneNoticeProps = ComponentProps<typeof MilestoneNoticeTemplate>;

type Props = {
  canManageProject?: boolean;
  onCreate?: () => void;
  addButtonText?: string;
  status?: MilestoneNoticeProps["status"];
  statusOptionValue?: MilestoneNoticeProps["statusOptionValue"];
  milestones?: MilestoneNoticeProps["milestones"];
};

const ProjectMilestoneSectionActions = ({
  canManageProject = false,
  onCreate,
  addButtonText = "新增里程碑",
  status,
  statusOptionValue,
  milestones = [],
}: Props) => (
  <Space size={8} wrap>
    <MilestoneNoticeTemplate
      status={status}
      statusOptionValue={statusOptionValue}
      milestones={milestones}
    />
    {canManageProject ? (
      <Button
        type="primary"
        onClick={() => {
          onCreate?.();
        }}
      >
        {addButtonText}
      </Button>
    ) : null}
  </Space>
);

export default ProjectMilestoneSectionActions;
