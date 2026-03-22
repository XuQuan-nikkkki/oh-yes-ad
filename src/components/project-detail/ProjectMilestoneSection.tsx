"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import MilestoneCard, {
  MilestoneCardRow,
} from "@/components/project-detail/MilestoneCard";

type Props = {
  milestones?: MilestoneCardRow[] | null;
  title?: string;
  emptyText?: string;
  onAdd?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
  filterTodayAndFuture?: boolean;
  withContainerCard?: boolean;
  layout?: "grid" | "masonry";
  cardHeight?: number;
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
  layout = "grid",
  cardHeight,
}: Props) => {
  const [masonryColumnCount, setMasonryColumnCount] = useState(1);

  useEffect(() => {
    if (layout !== "masonry") return;

    const getColumnCount = (width: number) => {
      if (width >= 1680) return 4;
      if (width >= 1200) return 3;
      if (width >= 768) return 2;
      return 1;
    };

    const updateColumnCount = () => {
      setMasonryColumnCount(getColumnCount(window.innerWidth));
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => {
      window.removeEventListener("resize", updateColumnCount);
    };
  }, [layout]);

  const visibleMilestones = (milestones ?? [])
    .filter((milestone) => {
      if (!filterTodayAndFuture) return true;
      if (!milestone.date) return false;
      return !dayjs(milestone.date)
        .startOf("day")
        .isBefore(dayjs().startOf("day"), "day");
    })
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  const masonryColumns = useMemo(() => {
    const count = Math.max(1, masonryColumnCount);
    const columns: MilestoneCardRow[][] = Array.from(
      { length: count },
      () => [],
    );
    visibleMilestones.forEach((milestone, index) => {
      columns[index % count].push(milestone);
    });
    return columns;
  }, [masonryColumnCount, visibleMilestones]);

  const masonryContent = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(1, masonryColumnCount)}, minmax(0, 1fr))`,
        gap: 12,
        width: "100%",
      }}
    >
      {masonryColumns.map((column, columnIndex) => (
        <div
          key={`masonry-col-${columnIndex}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 0,
          }}
        >
          {column.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              height={cardHeight}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const gridContent = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 12,
        alignItems: "stretch",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {visibleMilestones.map((milestone) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          height={cardHeight}
        />
      ))}
    </div>
  );

  const content =
    visibleMilestones.length === 0 ? (
      <Empty description={emptyText} />
    ) : layout === "masonry" ? (
      masonryContent
    ) : (
      gridContent
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
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {content}
    </Card>
  );
};

export default ProjectMilestoneSection;
