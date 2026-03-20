"use client";

import { Layout } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import MenuContent from "./MenuContent";
import type { CurrentUser } from "@/stores/authStore";

const { Sider } = Layout;

// Style Constants
const SIDER_STYLE = {
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
} as const;

interface LayoutSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  pathname: string;
  currentUser: CurrentUser | null;
}

export default function LayoutSider({
  collapsed,
  onCollapse,
  pathname,
  currentUser,
}: LayoutSiderProps) {
  return (
    <Sider
      className="app-sider"
      theme="dark"
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      style={SIDER_STYLE}
    >
      <div className="app-sider-menu-scroll">
        <MenuContent pathname={pathname} currentUser={currentUser} />
      </div>
    </Sider>
  );
}
