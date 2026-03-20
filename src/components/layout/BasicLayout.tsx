"use client";

import { Layout, Dropdown, Avatar, Space, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

const { Content, Header } = Layout;

// Style Constants
const HEADER_STYLE = {
  background: "#fff",
  padding: "0 16px",
  borderBottom: "1px solid #f0f0f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
} as const;

const SYSTEM_TITLE_STYLE = {
  fontSize: 18,
  fontWeight: 600,
  color: "#1f1f1f",
  marginLeft: 4,
} as const;

const ACCOUNT_SPACE_STYLE = {
  cursor: "pointer",
} as const;

const CONTENT_STYLE = {
  padding: 16,
  flex: 1,
  overflow: "auto",
} as const;

const getLayoutStyle = (collapsed: boolean) => ({
  display: "flex" as const,
  flexDirection: "column" as const,
  marginLeft: collapsed ? "80px" : "200px",
  transition: "margin-left 0.3s",
});

interface BasicLayoutProps {
  collapsed: boolean;
  currentUser: CurrentUser | null;
  onChangePassword: () => void;
  children: React.ReactNode;
}

const BasicLayout = ({
  collapsed,
  currentUser,
  onChangePassword,
  children,
}: BasicLayoutProps) => {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const clearCurrentUser = useAuthStore((state) => state.clearCurrentUser);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      messageApi.success("已退出登录");
    } finally {
      clearCurrentUser();
      router.replace("/login");
      router.refresh();
    }
  }, [clearCurrentUser, messageApi, router]);

  const accountMenu = useMemo(
    () => ({
      items: [
        { key: "change-password", label: "修改密码" },
        { key: "logout", label: "退出登录" },
      ],
      onClick: ({ key }: { key: string }) => {
        if (key === "change-password") {
          onChangePassword();
        }
        if (key === "logout") {
          handleLogout();
        }
      },
    }),
    [onChangePassword, handleLogout],
  );

  const renderSystemHeader = () => (
    <div style={SYSTEM_TITLE_STYLE}>
      一条龙管理系统
    </div>
  );

  const renderHeaderDropdown = () => (
    <Dropdown trigger={["hover"]} menu={accountMenu}>
      <Space style={ACCOUNT_SPACE_STYLE}>
        <Avatar size="small" icon={<UserOutlined />} />
        <span>{currentUser?.name ?? "加载中..."}</span>
      </Space>
    </Dropdown>
  );

  return (
    <Layout style={getLayoutStyle(collapsed)}>
      {contextHolder}
      <Header style={HEADER_STYLE}>
        {renderSystemHeader()}
        {renderHeaderDropdown()}
      </Header>
      <Content style={CONTENT_STYLE}>
        {children}
      </Content>
    </Layout>
  );
};

export default BasicLayout;
