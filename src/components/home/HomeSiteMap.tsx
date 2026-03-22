"use client";

import { Card, Col, Row } from "antd";
import type { ReactNode } from "react";
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
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

export type HomeSiteMapItem = {
  label: string;
  icon: ReactNode;
  path: string;
  visible?: boolean;
};

export type HomeSiteMapModule = {
  title: string;
  items: HomeSiteMapItem[];
  visible?: boolean;
};

type Props = {
  isAdmin: boolean;
  onNavigate: (path: string) => void;
};

const HomeSiteMap = ({ isAdmin, onNavigate }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canViewCompanyFinance =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");

  const modules: HomeSiteMapModule[] = [
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
        {
          label: "角色管理",
          icon: <IdcardOutlined />,
          path: "/roles",
          visible: isAdmin,
        },
        {
          label: "选项管理",
          icon: <AppstoreOutlined />,
          path: "/select-options",
          visible: isAdmin,
        },
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
    {
      title: "公司财务",
      visible: canViewCompanyFinance,
      items: [
        {
          label: "公司主体",
          icon: <BankOutlined />,
          path: "/legal-entities",
        },
      ],
    },
    {
      title: "团队协作",
      items: [
        { label: "项目排期", icon: <CalendarOutlined />, path: "/schedule" },
      ],
    },
  ];

  return (
    <div>
      {modules
        .filter((module) => module.visible !== false)
        .map((module) => {
          const visibleItems = module.items.filter((item) => item.visible !== false);
          if (visibleItems.length === 0) return null;
          return (
        <div key={module.title} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16 }}>{module.title}</h3>
          <Row gutter={[16, 16]}>
            {visibleItems.map((item) => (
              <Col key={item.path} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ textAlign: "center", cursor: "pointer" }}
                  onClick={() => onNavigate(item.path)}
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
          );
        })}
    </div>
  );
};

export default HomeSiteMap;
