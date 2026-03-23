"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Card, Tabs } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import WorkLogsPanel from "@/components/work-logs/WorkLogsPanel";
import HomeOwnedProjectsTable from "@/components/home/HomeOwnedProjectsTable";
import HomeParticipationMilestones from "@/components/home/HomeParticipationMilestones";
import HomeParticipationNestedTable from "@/components/home/HomeParticipationNestedTable";
import HomeSiteMap from "@/components/home/HomeSiteMap";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useNavigationStore } from "@/stores/navigationStore";

const HOME_TAB_SITE_MAP = "site-map";
const HOME_TAB_OWNED_PROJECTS = "owned-projects";
const HOME_TAB_WORK_LOGS = "work-logs";
const HOME_TAB_PARTICIPATION = "participation";
const HOME_TAB_PARTICIPATION_MILESTONES = "participation-milestones";
const WORK_LOG_VIEW_PARAM = "workLogView";

const validHomeTab = (tab: string | null, allowedTabs: string[]) => {
  if (tab && allowedTabs.includes(tab)) {
    return tab;
  }
  return allowedTabs[0] ?? HOME_TAB_SITE_MAP;
};

function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setNavigating = useNavigationStore((state) => state.setNavigating);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const isAdmin = roleCodes.includes("ADMIN");
  const canViewOwnedProjectsTab = roleCodes.includes("PROJECT_MANAGER");
  const availableHomeTabs = useMemo(
    () => [
      HOME_TAB_SITE_MAP,
      ...(canViewOwnedProjectsTab ? [HOME_TAB_OWNED_PROJECTS] : []),
      HOME_TAB_PARTICIPATION,
      HOME_TAB_PARTICIPATION_MILESTONES,
      HOME_TAB_WORK_LOGS,
    ],
    [canViewOwnedProjectsTab],
  );
  const urlActiveTab = validHomeTab(searchParams.get("tab"), availableHomeTabs);
  const [activeTab, setActiveTab] = useState(urlActiveTab);

  useEffect(() => {
    setActiveTab(urlActiveTab);
  }, [urlActiveTab]);

  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        styles={{ header: { paddingBottom: 0 } }}
        onChange={(nextTab) => {
          const nextActiveTab = validHomeTab(nextTab, availableHomeTabs);
          setActiveTab(nextActiveTab);
          const query = new URLSearchParams(searchParams.toString());
          query.set("tab", nextActiveTab);
          if (nextActiveTab !== HOME_TAB_WORK_LOGS) {
            query.delete(WORK_LOG_VIEW_PARAM);
          }
          router.replace(`${pathname}?${query.toString()}`, { scroll: false });
        }}
        items={[
          {
            key: HOME_TAB_SITE_MAP,
            label: "网站地图",
            children: (
              <HomeSiteMap
                isAdmin={isAdmin}
                onNavigate={(path) => {
                  if (path === pathname) return;
                  setNavigating(true);
                  router.push(path);
                }}
              />
            ),
          },
          ...(canViewOwnedProjectsTab
            ? [
                {
                  key: HOME_TAB_OWNED_PROJECTS,
                  label: "负责项目",
                  children: (
                    <HomeOwnedProjectsTable
                      active={activeTab === HOME_TAB_OWNED_PROJECTS}
                    />
                  ),
                },
              ]
            : []),
          {
            key: HOME_TAB_PARTICIPATION,
            label: "参与项目",
            children: (
              <HomeParticipationNestedTable
                active={activeTab === HOME_TAB_PARTICIPATION}
              />
            ),
          },
          {
            key: HOME_TAB_PARTICIPATION_MILESTONES,
            label: "参与里程碑",
            children: (
              <HomeParticipationMilestones
                active={activeTab === HOME_TAB_PARTICIPATION_MILESTONES}
              />
            ),
          },
          {
            key: HOME_TAB_WORK_LOGS,
            label: "工时记录",
            children: <WorkLogsPanel />,
          },
        ]}
      />
    </Card>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Card loading />}>
      <HomePageContent />
    </Suspense>
  );
}
