import type { ReactNode } from "react";
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
  CreditCardOutlined,
  SettingOutlined,
  InboxOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { AppRoleCode } from "@/lib/role-permissions";

export type NavigationRoleCode = AppRoleCode;

export type NavigationItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  roles?: readonly NavigationRoleCode[];
  forbiddenRoles?: readonly NavigationRoleCode[];
  children?: NavigationItem[];
};

const NAV_ROLE_GROUPS = {
  adminOnly: ["ADMIN"] as const,
  adminAndProjectManager: ["ADMIN", "PROJECT_MANAGER"] as const,
  orgManagement: ["ADMIN", "PROJECT_MANAGER", "HR", "FINANCE"] as const,
  orgManagementWithoutFinance: ["ADMIN", "PROJECT_MANAGER", "HR"] as const,
  legalAndFinance: ["ADMIN", "HR", "FINANCE"] as const,
} satisfies Record<string, readonly NavigationRoleCode[]>;

export const NAVIGATION_ITEMS: NavigationItem[] = [
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
        forbiddenRoles: ["HR", "FINANCE"],
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
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/project-segments",
        icon: <AppstoreOutlined />,
        label: "项目环节",
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/project-tasks",
        icon: <ProfileOutlined />,
        label: "项目任务",
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/project-milestones",
        icon: <FlagOutlined />,
        label: "项目里程碑",
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/project-documents",
        icon: <FileTextOutlined />,
        label: "项目资料",
        forbiddenRoles: ["HR", "FINANCE"],
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
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/actual-work-entries",
        icon: <ClockCircleOutlined />,
        label: "实际工时",
        forbiddenRoles: ["HR", "FINANCE"],
      },
      {
        key: "/work-hours-analysis",
        icon: <ClockCircleOutlined />,
        label: "工时分析",
        roles: NAV_ROLE_GROUPS.orgManagement,
      },
    ],
  },
  {
    key: "crm",
    icon: <ShopOutlined />,
    label: "客户与供应商",
    roles: NAV_ROLE_GROUPS.adminAndProjectManager,
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
    roles: NAV_ROLE_GROUPS.orgManagementWithoutFinance,
    children: [
      {
        key: "/employees",
        icon: <TeamOutlined />,
        label: "团队成员",
      },
      {
        key: "/roles",
        icon: <IdcardOutlined />,
        label: "角色管理",
        roles: NAV_ROLE_GROUPS.adminOnly,
      },
      {
        key: "/select-options",
        icon: <AppstoreOutlined />,
        label: "选项管理",
        roles: NAV_ROLE_GROUPS.adminOnly,
      },
      {
        key: "/system-settings",
        icon: <SettingOutlined />,
        label: "系统参数",
        roles: NAV_ROLE_GROUPS.adminOnly,
      },
      {
        key: "/leave-calendar",
        icon: <CalendarFilled />,
        label: "请假日历",
        forbiddenRoles: ["FINANCE"],
      },
      {
        key: "/workday-adjustments",
        icon: <SwapOutlined />,
        label: "工作日变动",
        forbiddenRoles: ["FINANCE"],
      },
    ],
  },
  {
    key: "project-finance",
    icon: <CalculatorOutlined />,
    label: "财务管理",
    roles: NAV_ROLE_GROUPS.orgManagement,
    children: [
      {
        key: "/project-receivable-payable",
        icon: <CalculatorOutlined />,
        label: "项目收付款",
      },
      {
        key: "/project-receivable-delays",
        icon: <CalendarOutlined />,
        label: "项目进账预测",
      },
      {
        key: "/project-reimbursements",
        icon: <CreditCardOutlined />,
        label: "执行费用监控",
      },
      {
        key: "/legal-entities",
        icon: <BankOutlined />,
        label: "公司主体",
        roles: NAV_ROLE_GROUPS.legalAndFinance,
      },
      {
        key: "/company-account-balances",
        icon: <WalletOutlined />,
        label: "公司账户余额",
        roles: NAV_ROLE_GROUPS.legalAndFinance,
      },
    ],
  },
  {
    key: "history-data",
    icon: <DatabaseOutlined />,
    label: "历史数据",
    roles: NAV_ROLE_GROUPS.adminAndProjectManager,
    children: [
      {
        key: "/history-data/import-receivable-payable-details",
        icon: <InboxOutlined />,
        label: "导入收付款明细",
      },
    ],
  },
];

export const NAVIGATION_PATH_PREFIXES = [
  "/project-segments",
  "/project-tasks",
  "/project-milestones",
  "/project-documents",
  "/project-receivable-payable",
  "/project-receivable-delays",
  "/project-reimbursements",
  "/planned-work-entries",
  "/actual-work-entries",
  "/work-hours-analysis",
  "/internal-projects",
  "/client-projects",
  "/client-contacts",
  "/clients",
  "/vendors",
  "/company-account-balances",
  "/history-data/import-receivable-payable-details",
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

export const hasNavigationAccess = (
  item: Pick<NavigationItem, "roles" | "forbiddenRoles">,
  roleCodes: readonly string[],
  isAdmin: boolean,
) => {
  if (isAdmin) return true;
  if (
    item.forbiddenRoles &&
    item.forbiddenRoles.some((role) => roleCodes.includes(role))
  ) {
    return false;
  }
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((role) => roleCodes.includes(role));
};

export const filterNavigationItemsByRoles = (
  items: NavigationItem[],
  roleCodes: readonly string[],
  isAdmin: boolean,
): NavigationItem[] => {
  return items.flatMap((item) => {
    if (!hasNavigationAccess(item, roleCodes, isAdmin)) return [];

    const nextChildren = item.children
      ? filterNavigationItemsByRoles(item.children, roleCodes, isAdmin)
      : undefined;

    if (item.children && (!nextChildren || nextChildren.length === 0)) {
      return [];
    }

    return [
      {
        key: item.key,
        label: item.label,
        icon: item.icon,
        children: nextChildren,
      },
    ];
  });
};
