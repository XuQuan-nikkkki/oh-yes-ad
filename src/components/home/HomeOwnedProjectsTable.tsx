"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Spin } from "antd";
import ProjectsTable from "@/components/ProjectsTable";
import type { Project } from "@/types/project";
import { useAuthStore } from "@/stores/authStore";
import { useProjectsStore } from "@/stores/projectsStore";

type Props = {
  active?: boolean;
};

const HomeOwnedProjectsTable = ({ active = false }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
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
      setProjects([]);
      setLoadedUserId(null);
      return;
    }

    if (loadedUserId === userId) return;
    if (inflightUserIdRef.current === userId) return;

    inflightUserIdRef.current = userId;
    setLoading(true);
    void (async () => {
      try {
        const rows = await fetchProjectsFromStore({ ownerId: userId });
        setProjects(
          Array.isArray(rows)
            ? rows.filter(
                (item): item is Project & { id: string; name: string } =>
                  Boolean(item?.id) && typeof item?.name === "string",
              )
            : [],
        );
        setLoadedUserId(userId);
      } finally {
        if (inflightUserIdRef.current === userId) {
          inflightUserIdRef.current = null;
        }
        setLoading(false);
      }
    })();
  }, [active, currentUser?.id, fetchProjectsFromStore, loadedUserId]);

  if (shouldShowLoading) {
    return <Card loading />;
  }

  return (
    <Spin spinning={loading}>
      <ProjectsTable
        loading={loading}
        projects={projects}
        compactHorizontalPadding
        columnKeys={["name", "type", "status", "stage", "period"]}
        defaultVisibleColumnKeys={["name", "type", "status", "stage", "period"]}
        headerTitle={null}
      />
    </Spin>
  );
};

export default HomeOwnedProjectsTable;
