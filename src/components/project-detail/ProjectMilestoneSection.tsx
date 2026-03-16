"use client";

import { Button, Card, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ProjectMilestoneCard, {
  ProjectMilestoneCardRow,
} from "@/components/project-detail/ProjectMilestoneCard";

type Props = {
  milestones?: ProjectMilestoneCardRow[] | null;
  title?: string;
  emptyText?: string;
  onAdd?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
  filterTodayAndFuture?: boolean;
  withContainerCard?: boolean;
};

const ProjectMilestoneSection = ({
  milestones = [],
  title = "项目里程碑",
  emptyText = "暂无里程碑",
  onAdd,
  addButtonText = "新增里程碑",
  showAddButton = true,
  filterTodayAndFuture = true,
  withContainerCard = true,
}: Props) => {
  const visibleMilestones = (milestones ?? [])
    .filter((milestone) => {
      if (!filterTodayAndFuture) return true;
      if (!milestone.date) return false;
      return !dayjs(milestone.date)
        .startOf("day")
        .isBefore(dayjs().startOf("day"), "day");
    })
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  const content = visibleMilestones.length === 0 ? (
    <Empty description={emptyText} />
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, 250px)",
        gap: 12,
        alignItems: "stretch",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {visibleMilestones.map((milestone) => (
        <ProjectMilestoneCard key={milestone.id} milestone={milestone} />
      ))}
    </div>
  );

  if (!withContainerCard) {
    return <div style={{ width: "100%", minWidth: 0 }}>{content}</div>;
  }

  return (
    <Card
      title={title}
      extra={
        showAddButton ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {addButtonText}
          </Button>
        ) : null
      }
      styles={{
        header: { padding: "6px 16px" },
        body: { padding: 16, overflowX: "hidden" },
      }}
      style={{ width: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
    >
      {content}
    </Card>
  );
};

export default ProjectMilestoneSection;
