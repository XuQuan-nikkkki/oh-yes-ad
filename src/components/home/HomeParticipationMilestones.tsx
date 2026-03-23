"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Spin } from "antd";
import ProjectMilestoneSection from "@/components/project-detail/ProjectMilestoneSection";
import type {
  MilestoneCardRow,
  MilestoneParticipant,
} from "@/components/project-detail/MilestoneCard";
import type { ProjectTaskListRow } from "@/components/ProjectTasksListTable";
import { useAuthStore } from "@/stores/authStore";
import { useProjectTasksStore } from "@/stores/projectTasksStore";

type HomeMilestoneRow = MilestoneCardRow & {
  project?: {
    id: string;
    name: string;
  } | null;
  internalParticipants?: MilestoneParticipant[];
};

type Props = {
  active?: boolean;
};

const HomeParticipationMilestones = ({ active = false }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchTasksFromStore = useProjectTasksStore((state) => state.fetchTasks);
  const [loading, setLoading] = useState(false);
  const [milestones, setMilestones] = useState<HomeMilestoneRow[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const inflightUserIdRef = useRef<string | null>(null);
  const shouldShowLoading =
    active &&
    Boolean(currentUser?.id) &&
    loadedUserId !== currentUser?.id;

  useEffect(() => {
    if (!active) return;

    const userId = currentUser?.id;
    if (!userId) {
      setMilestones([]);
      setLoadedUserId(null);
      return;
    }

    if (loadedUserId === userId) return;
    if (inflightUserIdRef.current === userId) return;

    inflightUserIdRef.current = userId;
    setLoading(true);
    void (async () => {
      try {
        const [tasksData, milestonesRes] = await Promise.all([
          fetchTasksFromStore({ ownerId: userId }),
          fetch("/api/project-milestones", { cache: "no-store" }),
        ]);

        const nextTasks = Array.isArray(tasksData)
          ? (tasksData as ProjectTaskListRow[])
          : [];
        const projectIds = new Set(
          nextTasks
            .filter(
              (
                task,
              ): task is ProjectTaskListRow & {
                segment: NonNullable<ProjectTaskListRow["segment"]> & {
                  project: NonNullable<
                    NonNullable<ProjectTaskListRow["segment"]>["project"]
                  >;
                };
              } =>
                Boolean(task.segment?.project?.id) &&
                !String(task.segment?.project?.name ?? "").includes("中台项目"),
            )
            .map((task) => task.segment.project.id),
        );

        const milestonesData = milestonesRes.ok ? await milestonesRes.json() : [];
        const nextMilestones = Array.isArray(milestonesData)
          ? (milestonesData as HomeMilestoneRow[])
          : [];

        setMilestones(
          nextMilestones.filter((milestone) => {
            if (!milestone.project?.id || !projectIds.has(milestone.project.id)) {
              return false;
            }
            return (milestone.internalParticipants ?? []).some(
              (participant) => participant.id === userId,
            );
          }),
        );
        setLoadedUserId(userId);
      } finally {
        if (inflightUserIdRef.current === userId) {
          inflightUserIdRef.current = null;
        }
        setLoading(false);
      }
    })();
  }, [active, currentUser?.id, fetchTasksFromStore, loadedUserId]);

  const visibleMilestones = useMemo(
    () => milestones.map((milestone) => ({ ...milestone })),
    [milestones],
  );

  if (shouldShowLoading) {
    return <Card loading />;
  }

  return (
    <Spin spinning={loading}>
      <ProjectMilestoneSection
        milestones={visibleMilestones}
        title="参与里程碑"
        emptyText="暂无你参与的里程碑"
        showAddButton={false}
        withContainerCard={false}
        filterTodayAndFuture
        layout="grid"
        gridMinWidth={200}
        gridMaxWidth={240}
      />
    </Spin>
  );
};

export default HomeParticipationMilestones;
