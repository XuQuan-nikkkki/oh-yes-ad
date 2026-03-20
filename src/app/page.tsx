"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Tabs } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  CalendarFilled,
  ShoppingOutlined,
  ShopOutlined,
  SwapOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  ProfileOutlined,
  FlagOutlined,
  FileTextOutlined,
  IdcardOutlined,
  BankOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import WorkLogsPanel from "@/components/work-logs/WorkLogsPanel";
import ProjectsTable, { type Project } from "@/components/ProjectsTable";
import { type ProjectTaskListRow } from "@/components/ProjectTasksListTable";
import HomeParticipationNestedTable from "@/components/home/HomeParticipationNestedTable";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useWorkdayAdjustmentsStore } from "@/stores/workdayAdjustmentsStore";
import { useProjectsStore } from "@/stores/projectsStore";

const HOME_TAB_SITE_MAP = "site-map";
const HOME_TAB_OWNED_PROJECTS = "owned-projects";
const HOME_TAB_WORK_LOGS = "work-logs";
const HOME_TAB_PARTICIPATION = "participation";
const WORK_LOG_VIEW_PARAM = "workLogView";

const validHomeTab = (tab: string | null, allowedTabs: string[]) => {
  if (tab && allowedTabs.includes(tab)) {
    return tab;
  }
  return allowedTabs[0] ?? HOME_TAB_SITE_MAP;
};

type WorkdayAdjustment = {
  id: string;
  changeType: string;
  startDate: string;
  endDate: string;
};

function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [participationLoading, setParticipationLoading] = useState(false);
  const [myOwnedProjects, setMyOwnedProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myTasks, setMyTasks] = useState<ProjectTaskListRow[]>([]);
  const [participationLoadedUserId, setParticipationLoadedUserId] = useState<
    string | null
  >(null);
  const [workdayAdjustments, setWorkdayAdjustments] = useState<
    WorkdayAdjustment[]
  >([]);
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchAdjustmentsFromStore = useWorkdayAdjustmentsStore(
    (state) => state.fetchAdjustments,
  );
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const isAdmin = roleCodes.includes("ADMIN");
  const canViewCompanyFinance =
    isAdmin || roleCodes.includes("HR") || roleCodes.includes("FINANCE");
  const canViewOwnedProjectsTab = roleCodes.includes("PROJECT_MANAGER");
  const availableHomeTabs = useMemo(
    () => [
      HOME_TAB_SITE_MAP,
      ...(canViewOwnedProjectsTab ? [HOME_TAB_OWNED_PROJECTS] : []),
      HOME_TAB_PARTICIPATION,
      HOME_TAB_WORK_LOGS,
    ],
    [canViewOwnedProjectsTab],
  );
  const activeTab = validHomeTab(searchParams.get("tab"), availableHomeTabs);

  useEffect(() => {
    (async () => {
      if (!currentUser?.id) {
        setMyProjects([]);
        setMyOwnedProjects([]);
        setMyTasks([]);
        setWorkdayAdjustments([]);
        setParticipationLoadedUserId(null);
        return;
      }
      const needParticipationData =
        activeTab === HOME_TAB_OWNED_PROJECTS ||
        activeTab === HOME_TAB_PARTICIPATION;
      if (!needParticipationData) return;
      if (participationLoadedUserId === currentUser.id) return;
      setParticipationLoading(true);
      try {
        const needOwnedProjectsData = activeTab === HOME_TAB_OWNED_PROJECTS;
        const [tasksRes, ownedProjectsRes, workdayData] =
          await Promise.all([
            fetch(
              `/api/project-tasks?ownerId=${encodeURIComponent(currentUser.id)}`,
              { cache: "no-store" },
            ),
            needOwnedProjectsData
              ? fetchProjectsFromStore({ ownerId: currentUser.id })
              : Promise.resolve(null),
            fetchAdjustmentsFromStore(),
          ]);
        const tasksData = tasksRes.ok ? await tasksRes.json() : [];
        const ownedProjectsData = ownedProjectsRes;

        const myProjectMap = new Map<string, Project>();
        if (Array.isArray(tasksData)) {
          for (const task of tasksData as ProjectTaskListRow[]) {
            const project = task?.segment?.project;
            if (project?.id && project?.name && !myProjectMap.has(project.id)) {
              myProjectMap.set(project.id, {
                id: project.id,
                name: project.name,
              } as Project);
            }
          }
        }
        setMyProjects(
          Array.from(myProjectMap.values()),
        );
        setMyOwnedProjects(
          Array.isArray(ownedProjectsData)
            ? ownedProjectsData
                .filter(
                  (
                    item,
                  ): item is Project & { id: string; name: string } =>
                    Boolean(item?.id) && typeof item?.name === "string",
                )
            : [],
        );
        setMyTasks(
          Array.isArray(tasksData)
            ? tasksData
            : [],
        );
        setWorkdayAdjustments(Array.isArray(workdayData) ? workdayData : []);
        setParticipationLoadedUserId(currentUser.id);
      } finally {
        setParticipationLoading(false);
      }
    })();
  }, [
    activeTab,
    currentUser?.id,
    fetchAdjustmentsFromStore,
    fetchProjectsFromStore,
    participationLoadedUserId,
  ]);

  const modules = [
    {
      title: "客户与供应商",
      items: [
        { label: "客户管理", icon: <UserOutlined />, path: "/clients" },
        {
          label: "客户人员",
          icon: <IdcardOutlined />,
          path: "/client-contacts",
        },
        { label: "供应商管理", icon: <ShopOutlined />, path: "/vendors" },
      ],
    },
    {
      title: "项目管理",
      items: [
        {
          label: "客户项目",
          icon: <ShoppingOutlined />,
          path: "/client-projects",
        },
        {
          label: "内部项目",
          icon: <ApartmentOutlined />,
          path: "/internal-projects",
        },
        {
          label: "项目环节",
          icon: <AppstoreOutlined />,
          path: "/project-segments",
        },
        {
          label: "项目任务",
          icon: <ProfileOutlined />,
          path: "/project-tasks",
        },
        {
          label: "项目里程碑",
          icon: <FlagOutlined />,
          path: "/project-milestones",
        },
        {
          label: "项目资料",
          icon: <FileTextOutlined />,
          path: "/project-documents",
        },
      ],
    },
    {
      title: "工时管理",
      items: [
        {
          label: "计划工时",
          icon: <CalendarOutlined />,
          path: "/planned-work-entries",
        },
        {
          label: "实际工时",
          icon: <ClockCircleOutlined />,
          path: "/actual-work-entries",
        },
        {
          label: "工时分析",
          icon: <ClockCircleOutlined />,
          path: "/work-hours-analysis",
        },
      ],
    },
    {
      title: "团队管理",
      items: [
        { label: "团队成员", icon: <TeamOutlined />, path: "/employees" },
        ...(isAdmin
          ? [
              { label: "角色管理", icon: <IdcardOutlined />, path: "/roles" },
              {
                label: "选项管理",
                icon: <AppstoreOutlined />,
                path: "/select-options",
              },
            ]
          : []),
        {
          label: "请假日历",
          icon: <CalendarFilled />,
          path: "/leave-calendar",
        },
        {
          label: "工作日变动",
          icon: <SwapOutlined />,
          path: "/workday-adjustments",
        },
      ],
    },
    ...(canViewCompanyFinance
      ? [
          {
            title: "公司财务",
            items: [
              {
                label: "公司主体",
                icon: <BankOutlined />,
                path: "/legal-entities",
              },
            ],
          },
        ]
      : []),
    {
      title: "团队协作",
      items: [
        { label: "项目排期", icon: <CalendarOutlined />, path: "/schedule" },
      ],
    },
  ];

  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        styles={{ header: { paddingBottom: 0 } }}
        onChange={(nextTab) => {
          const query = new URLSearchParams(searchParams.toString());
          query.set("tab", validHomeTab(nextTab, availableHomeTabs));
          if (nextTab !== HOME_TAB_WORK_LOGS) {
            query.delete(WORK_LOG_VIEW_PARAM);
          }
          router.replace(`${pathname}?${query.toString()}`, { scroll: false });
        }}
        items={[
          {
            key: HOME_TAB_SITE_MAP,
            label: "网站地图",
            children: (
              <div>
                {modules.map((module) => (
                  <div key={module.title} style={{ marginBottom: 32 }}>
                    <h3 style={{ marginBottom: 16 }}>{module.title}</h3>
                    <Row gutter={[16, 16]}>
                      {module.items.map((item) => (
                        <Col key={item.path} xs={24} sm={12} md={8} lg={6}>
                          <Card
                            hoverable
                            style={{ textAlign: "center", cursor: "pointer" }}
                            onClick={() => router.push(item.path)}
                          >
                            <div style={{ fontSize: 32, marginBottom: 12 }}>
                              {item.icon}
                            </div>
                            <div>{item.label}</div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </div>
            ),
          },
          ...(canViewOwnedProjectsTab
            ? [
                {
                  key: HOME_TAB_OWNED_PROJECTS,
                  label: "负责项目",
                  children: (
                    <ProjectsTable
                      loading={participationLoading}
                      projects={myOwnedProjects}
                      workdayAdjustments={workdayAdjustments}
                      compactHorizontalPadding
                      columnKeys={["name", "type", "status", "stage", "period"]}
                      defaultVisibleColumnKeys={[
                        "name",
                        "type",
                        "status",
                        "stage",
                        "period",
                      ]}
                      headerTitle={null}
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
                loading={participationLoading}
                projects={myProjects}
                tasks={myTasks}
                workdayAdjustments={workdayAdjustments}
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
