"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Select, Space, Spin } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectsStore } from "@/stores/projectsStore";
import ProjectExecutionCostMonitoringCard from "@/components/execution-cost-monitoring/ProjectExecutionCostMonitoringCard";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import { PageContainer } from "@ant-design/pro-components";

const ALL_PROJECTS_QUERY_KEY = JSON.stringify({
  type: "",
  ownerId: "",
  clientId: "",
  vendorId: "",
});

const isClientProject = (project: {
  type?: string | null;
  typeOption?: { value?: string | null } | null;
  clientId?: string | null;
  client?: { id?: string | null } | null;
}) => {
  return (
    project.type === "CLIENT" ||
    project.type === "客户项目" ||
    project.typeOption?.value === "客户项目" ||
    Boolean(project.clientId) ||
    Boolean(project.client?.id)
  );
};

const isInternalProject = (project: {
  type?: string | null;
  typeOption?: { value?: string | null } | null;
}) => {
  return (
    project.type === "INTERNAL" ||
    project.type === "内部项目" ||
    project.typeOption?.value === "内部项目"
  );
};

type SortableProject = {
  name?: string | null;
  isArchived?: boolean | null;
};

const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

const namePrefixRank = (name?: string | null) => {
  const normalized = String(name ?? "").trim();
  if (/^[a-zA-Z]\./.test(normalized)) return 0;
  return 1;
};

const compareProjectName = (leftName?: string | null, rightName?: string | null) => {
  const leftPrefixRank = namePrefixRank(leftName);
  const rightPrefixRank = namePrefixRank(rightName);
  if (leftPrefixRank !== rightPrefixRank) {
    return leftPrefixRank - rightPrefixRank;
  }
  return pinyinCollator.compare(String(leftName ?? ""), String(rightName ?? ""));
};

const compareProjectByArchiveAndName = (
  left: SortableProject,
  right: SortableProject,
) => {
  const leftArchived = Boolean(left.isArchived);
  const rightArchived = Boolean(right.isArchived);
  if (leftArchived !== rightArchived) {
    return leftArchived ? 1 : -1;
  }
  return compareProjectName(left.name, right.name);
};

function ProjectReimbursementsPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const projectsById = useProjectsStore((state) => state.byId);
  const projectIds = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.ids,
  );
  const loading = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.loading ?? false,
  );
  const loaded = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.loaded ?? false,
  );
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );
  const workdayAdjustments = useWorkdayAdjustmentsStore((state) => state.adjustments);
  const adjustmentsLoaded = useWorkdayAdjustmentsStore((state) => state.loaded);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const selectedProjectId = searchParams.get("projectId");
  const [projectIdsWithExecutionCosts, setProjectIdsWithExecutionCosts] =
    useState<Set<string>>(new Set());
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canCreateReimbursement = useMemo(
    () => roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE"),
    [roleCodes],
  );

  const fetchProjects = useCallback(
    async (force = false) => {
      await fetchProjectsFromStore({ force });
    },
    [fetchProjectsFromStore],
  );

  useEffect(() => {
    if (!authLoaded) {
      void fetchMe();
    }
  }, [authLoaded, fetchMe]);

  useEffect(() => {
    if (!authLoaded) return;
    if (loaded) return;
    void fetchProjects();
  }, [authLoaded, fetchProjects, loaded]);

  useEffect(() => {
    if (!authLoaded) return;
    if (adjustmentsLoaded) return;
    void fetchAdjustmentsFromStore();
  }, [adjustmentsLoaded, authLoaded, fetchAdjustmentsFromStore]);

  useEffect(() => {
    if (!authLoaded) return;
    const fetchExecutionCostProjectIds = async () => {
      try {
        const res = await fetch("/api/project-financial-structures", {
          cache: "no-store",
        });
        const data = res.ok ? await res.json() : [];
        const rows = Array.isArray(data) ? data : [];
        const next = new Set<string>();

        for (const row of rows) {
          const projectId =
            typeof row?.projectId === "string"
              ? row.projectId
              : typeof row?.project?.id === "string"
                ? row.project.id
                : "";
          const hasExecutionCost = Array.isArray(row?.executionCostItems)
            ? row.executionCostItems.length > 0
            : false;
          if (projectId && hasExecutionCost) {
            next.add(projectId);
          }
        }
        setProjectIdsWithExecutionCosts(next);
      } catch {
        setProjectIdsWithExecutionCosts(new Set());
      }
    };
    void fetchExecutionCostProjectIds();
  }, [authLoaded]);

  const allNonInternalProjects = useMemo(() => {
    return (projectIds ?? [])
      .map((id) => projectsById[id])
      .filter(
        (
          item,
        ): item is {
          id: string;
          name?: string | null;
          isArchived?: boolean | null;
          type?: string | null;
          typeOption?: { value?: string | null } | null;
          clientId?: string | null;
          client?: { id?: string | null } | null;
          startDate?: string | null;
          endDate?: string | null;
        } => Boolean(item?.id),
      )
      .filter((item) => !isInternalProject(item));
  }, [projectIds, projectsById]);

  const searchableProjectOptions = useMemo(
    () =>
      allNonInternalProjects
        .slice()
        .sort(compareProjectByArchiveAndName)
        .map((item) => ({
          label: `${item.name ?? "未命名项目"}${item.isArchived ? "（已归档）" : ""}`,
          value: item.id,
        })),
    [allNonInternalProjects],
  );

  const activeProjects = useMemo(() => {
    const projects = allNonInternalProjects
      .filter((item) => !Boolean(item.isArchived))
      .filter((item) => isClientProject(item));

    const sorted = projects.sort((left, right) => {
      const leftHasExecutionCost = projectIdsWithExecutionCosts.has(left.id);
      const rightHasExecutionCost = projectIdsWithExecutionCosts.has(right.id);
      if (leftHasExecutionCost !== rightHasExecutionCost) {
        return leftHasExecutionCost ? -1 : 1;
      }
      return compareProjectName(left.name, right.name);
    });

    if (!selectedProjectId) return sorted;

    const matched = allNonInternalProjects.find(
      (project) => project.id === selectedProjectId,
    );
    if (!matched) return sorted;

    return [matched];
  }, [
    allNonInternalProjects,
    projectIdsWithExecutionCosts,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const exists = allNonInternalProjects.some((item) => item.id === selectedProjectId);
    if (exists) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("projectId");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [allNonInternalProjects, pathname, router, searchParams, selectedProjectId]);

  const handleProjectSearchChange = useCallback(
    (value: string | undefined) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (value) {
        nextParams.set("projectId", value);
      } else {
        nextParams.delete("projectId");
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <PageContainer
      title="执行费用监控"
      extra={[
        <Select
          key="project-search"
          allowClear
          showSearch
          placeholder="搜索项目"
          style={{ width: 320 }}
          options={searchableProjectOptions}
          value={selectedProjectId ?? undefined}
          optionFilterProp="label"
          onChange={(value) => {
            handleProjectSearchChange(typeof value === "string" ? value : undefined);
          }}
        />,
      ]}
      header={{
        style: { background: "#fff", paddingInline: 24, borderRadius: 8 },
      }}
      style={{ backgroundColor: "#F5F5F5" }}
      childrenContentStyle={{ padding: 0 }}
    >
      <Spin spinning={!loaded && loading}>
        <Space orientation="vertical" size={12} style={{ width: "100%", padding: 0 }}>
          {activeProjects.map((project) => (
            <ProjectExecutionCostMonitoringCard
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              startDate={project.startDate}
              endDate={project.endDate}
              adjustments={workdayAdjustments}
              canManageProject={canCreateReimbursement}
            />
          ))}
        </Space>
      </Spin>
    </PageContainer>
  );
}

export default function ProjectReimbursementsPage() {
  return (
    <Suspense fallback={<Spin />}>
      <ProjectReimbursementsPageContent />
    </Suspense>
  );
}
