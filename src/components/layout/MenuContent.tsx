"use client";

import { Menu } from "antd";
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  ShopOutlined,
  CalendarFilled,
  SwapOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  ProfileOutlined,
  FlagOutlined,
  FileTextOutlined,
  IdcardOutlined,
  BankOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useMemo } from "react";
import { getRoleCodesFromUser, type CurrentUser } from "@/stores/authStore";

const MENU_KEY_BY_PREFIX = [
  "/project-segments",
  "/project-tasks",
  "/project-milestones",
  "/project-documents",
  "/planned-work-entries",
  "/actual-work-entries",
  "/work-hours-analysis",
  "/internal-projects",
  "/client-projects",
  "/client-contacts",
  "/clients",
  "/vendors",
  "/legal-entities",
  "/roles",
  "/select-options",
  "/employees",
  "/leave-calendar",
  "/workday-adjustments",
  "/schedule",
  "/",
];

interface MenuContentProps {
  pathname: string;
  currentUser: CurrentUser | null;
}

export default function MenuContent({ pathname, currentUser }: MenuContentProps) {
  const selectedMenuKey = useMemo(() => {
    return (
      MENU_KEY_BY_PREFIX.find(
        (key) => pathname === key || pathname.startsWith(`${key}/`),
      ) ?? pathname
    );
  }, [pathname]);

  const menuLink = (_href: string, label: string) => (
    <Link href={_href} prefetch={false}>
      {label}
    </Link>
  );

  const roleCodes = getRoleCodesFromUser(currentUser);
  const canViewCompanyFinance =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const isAdmin = roleCodes.includes("ADMIN");

  const items = useMemo(
    () => [
      {
        key: "/",
        icon: <HomeOutlined />,
        label: menuLink("/", "首页"),
      },
      {
        key: "crm",
        icon: <ShopOutlined />,
        label: "客户与供应商",
        children: [
          {
            key: "/clients",
            icon: <UserOutlined />,
            label: menuLink("/clients", "客户管理"),
          },
          {
            key: "/client-contacts",
            icon: <IdcardOutlined />,
            label: menuLink("/client-contacts", "客户人员"),
          },
          {
            key: "/vendors",
            icon: <ShopOutlined />,
            label: menuLink("/vendors", "供应商管理"),
          },
        ],
      },
      {
        key: "project-mgmt",
        icon: <ApartmentOutlined />,
        label: "项目管理",
        children: [
          {
            key: "/client-projects",
            icon: <ShoppingOutlined />,
            label: menuLink("/client-projects", "客户项目"),
          },
          {
            key: "/internal-projects",
            icon: <ApartmentOutlined />,
            label: menuLink("/internal-projects", "内部项目"),
          },
          {
            key: "/project-segments",
            icon: <AppstoreOutlined />,
            label: menuLink("/project-segments", "项目环节"),
          },
          {
            key: "/project-tasks",
            icon: <ProfileOutlined />,
            label: menuLink("/project-tasks", "项目任务"),
          },
          {
            key: "/project-milestones",
            icon: <FlagOutlined />,
            label: menuLink("/project-milestones", "项目里程碑"),
          },
          {
            key: "/project-documents",
            icon: <FileTextOutlined />,
            label: menuLink("/project-documents", "项目资料"),
          },
        ],
      },
      {
        key: "worktime",
        icon: <ClockCircleOutlined />,
        label: "工时管理",
        children: [
          {
            key: "/planned-work-entries",
            icon: <CalendarOutlined />,
            label: menuLink("/planned-work-entries", "计划工时"),
          },
          {
            key: "/actual-work-entries",
            icon: <ClockCircleOutlined />,
            label: menuLink("/actual-work-entries", "实际工时"),
          },
          {
            key: "/work-hours-analysis",
            icon: <ClockCircleOutlined />,
            label: menuLink("/work-hours-analysis", "工时分析"),
          },
        ],
      },
      {
        key: "team-mgmt",
        icon: <TeamOutlined />,
        label: "团队管理",
        children: [
          {
            key: "/employees",
            icon: <TeamOutlined />,
            label: menuLink("/employees", "团队成员"),
          },
          ...(isAdmin
            ? [
                {
                  key: "/roles",
                  icon: <IdcardOutlined />,
                  label: menuLink("/roles", "角色管理"),
                },
                {
                  key: "/select-options",
                  icon: <AppstoreOutlined />,
                  label: menuLink("/select-options", "选项管理"),
                },
              ]
            : []),
          {
            key: "/leave-calendar",
            icon: <CalendarFilled />,
            label: menuLink("/leave-calendar", "请假日历"),
          },
          {
            key: "/workday-adjustments",
            icon: <SwapOutlined />,
            label: menuLink("/workday-adjustments", "工作日变动"),
          },
        ],
      },
      ...(canViewCompanyFinance
        ? [
            {
              key: "company-finance",
              icon: <WalletOutlined />,
              label: "公司财务",
              children: [
                {
                  key: "/legal-entities",
                  icon: <BankOutlined />,
                  label: menuLink("/legal-entities", "公司主体"),
                },
              ],
            },
          ]
        : []),
      {
        key: "team",
        icon: <TeamOutlined />,
        label: "团队协作",
        children: [
          {
            key: "/schedule",
            icon: <CalendarOutlined />,
            label: menuLink("/schedule", "项目排期"),
          },
        ],
      },
    ],
    [isAdmin, canViewCompanyFinance],
  );

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedMenuKey]}
      items={items}
    />
  );
}
