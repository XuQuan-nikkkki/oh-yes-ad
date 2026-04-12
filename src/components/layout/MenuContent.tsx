"use client";

import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";
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
  CalculatorOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleCodesFromUser, type CurrentUser } from "@/stores/authStore";
import { useNavigationStore } from "@/stores/navigationStore";

const MENU_KEY_BY_PREFIX = [
  "/project-segments",
  "/project-tasks",
  "/project-milestones",
  "/project-documents",
  "/project-receivable-payable",
  "/project-receivable-delays",
  "/planned-work-entries",
  "/actual-work-entries",
  "/work-hours-analysis",
  "/internal-projects",
  "/client-projects",
  "/client-contacts",
  "/clients",
  "/vendors",
  "/company-account-balances",
  "/legal-entities",
  "/roles",
  "/select-options",
  "/system-settings",
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

type MenuItemConfig = ItemType & {
  visible?: boolean;
  children?: MenuItemConfig[];
};

const filterVisibleMenuItems = (items: MenuItemConfig[]): ItemType[] => {
  return items.flatMap((item) => {
    if (item.visible === false) return [];

    const nextItem = { ...item };
    delete nextItem.visible;
    const nextChildren = nextItem.children
      ? filterVisibleMenuItems(nextItem.children)
      : undefined;

    if ("type" in nextItem && nextItem.type === "divider") {
      return [nextItem];
    }

    return [
      {
        ...nextItem,
        ...(nextChildren ? { children: nextChildren } : {}),
      } as ItemType,
    ];
  });
};

export default function MenuContent({
  pathname,
  currentUser,
}: MenuContentProps) {
  const router = useRouter();
  const setNavigating = useNavigationStore((state) => state.setNavigating);
  const selectedMenuKey = useMemo(() => {
    return (
      MENU_KEY_BY_PREFIX.find(
        (key) => pathname === key || pathname.startsWith(`${key}/`),
      ) ?? pathname
    );
  }, [pathname]);
  const [activeSelectedKey, setActiveSelectedKey] = useState(selectedMenuKey);

  useEffect(() => {
    setActiveSelectedKey(selectedMenuKey);
  }, [selectedMenuKey]);

  const roleCodes = getRoleCodesFromUser(currentUser);
  const isStaffOnly =
    roleCodes.length === 1 && roleCodes.includes("STAFF");
  const canViewCompanyFinance =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const isAdmin = roleCodes.includes("ADMIN");

  const items = useMemo<MenuItemConfig[]>(
    () => [
      {
        key: "/",
        icon: <HomeOutlined />,
        label: "首页",
      },
      {
        key: "team",
        icon: <TeamOutlined />,
        label: "团队协作",
        children: [
          {
            key: "/schedule",
            icon: <CalendarOutlined />,
            label: "项目排期",
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
            label: "客户项目",
          },
          {
            key: "/internal-projects",
            icon: <ApartmentOutlined />,
            label: "内部项目",
          },
          {
            key: "/project-segments",
            icon: <AppstoreOutlined />,
            label: "项目环节",
          },
          {
            key: "/project-tasks",
            icon: <ProfileOutlined />,
            label: "项目任务",
          },
          {
            key: "/project-milestones",
            icon: <FlagOutlined />,
            label: "项目里程碑",
          },
          {
            key: "/project-documents",
            icon: <FileTextOutlined />,
            label: "项目资料",
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
            label: "计划工时",
          },
          {
            key: "/actual-work-entries",
            icon: <ClockCircleOutlined />,
            label: "实际工时",
          },
          {
            key: "/work-hours-analysis",
            icon: <ClockCircleOutlined />,
            label: "工时分析",
            visible: !isStaffOnly,
          },
        ],
      },
      ...(!isStaffOnly
        ? [
            {
              key: "crm",
              icon: <ShopOutlined />,
              label: "客户与供应商",
              children: [
                {
                  key: "/clients",
                  icon: <UserOutlined />,
                  label: "客户管理",
                },
                {
                  key: "/client-contacts",
                  icon: <IdcardOutlined />,
                  label: "客户人员",
                },
                {
                  key: "/vendors",
                  icon: <ShopOutlined />,
                  label: "供应商管理",
                },
              ],
            },
            {
              key: "team-mgmt",
              icon: <TeamOutlined />,
              label: "团队管理",
              children: [
                ...(!isStaffOnly
                  ? [
                      {
                        key: "/employees",
                        icon: <TeamOutlined />,
                        label: "团队成员",
                      },
                      ...(isAdmin
                        ? [
                            {
                              key: "/roles",
                              icon: <IdcardOutlined />,
                              label: "角色管理",
                            },
                            {
                              key: "/select-options",
                              icon: <AppstoreOutlined />,
                              label: "选项管理",
                            },
                            {
                              key: "/system-settings",
                              icon: <SettingOutlined />,
                              label: "系统参数",
                            },
                          ]
                        : []),
                    ]
                  : []),
                {
                  key: "/leave-calendar",
                  icon: <CalendarFilled />,
                  label: "请假日历",
                },
                ...(!isStaffOnly
                  ? [
                      {
                        key: "/workday-adjustments",
                        icon: <SwapOutlined />,
                        label: "工作日变动",
                      },
                    ]
                  : []),
              ],
            },
            {
              key: "project-finance",
              icon: <CalculatorOutlined />,
              label: "财务管理",
              children: [
                {
                  key: "/project-receivable-payable",
                  icon: <CalculatorOutlined />,
                  label: "项目收付款",
                },
                {
                  key: "/project-receivable-delays",
                  icon: <CalendarOutlined />,
                  label: "项目收款延期",
                },
                ...(canViewCompanyFinance
                  ? [
                      {
                        key: "/legal-entities",
                        icon: <BankOutlined />,
                        label: "公司主体",
                      },
                      {
                        key: "/company-account-balances",
                        icon: <WalletOutlined />,
                        label: "公司账户余额",
                      },
                    ]
                  : []),
              ],
            },
          ]
        : []),
    ],
    [isAdmin, isStaffOnly, canViewCompanyFinance],
  );

  const visibleItems = useMemo(
    () => filterVisibleMenuItems(items),
    [items],
  );

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[activeSelectedKey]}
      onClick={({ key }) => {
        if (!key.startsWith("/")) return;
        if (key === pathname) return;
        setActiveSelectedKey(key);
        setNavigating(true);
        router.push(key);
      }}
      items={visibleItems}
    />
  );
}
