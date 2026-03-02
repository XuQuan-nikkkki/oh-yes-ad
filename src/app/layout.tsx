"use client";

import "./globals.css";
import { Layout, Menu, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useRouter, usePathname } from "next/navigation";
import { HomeOutlined, UserOutlined, TeamOutlined, DatabaseOutlined, ClockCircleOutlined, CalendarOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ShoppingOutlined, BuildOutlined } from "@ant-design/icons";
import { useState } from "react";

const { Sider, Content } = Layout;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: "首页",
    },
    {
      key: "data",
      icon: <DatabaseOutlined />,
      label: "数据管理",
      children: [
        { key: "/clients", icon: <UserOutlined />, label: "客户管理" },
        { key: "/client-contacts", icon: <TeamOutlined />, label: "客户人员" },
        { key: "/client-projects", icon: <ShoppingOutlined />, label: "客户项目" },
        { key: "/internal-projects", icon: <BuildOutlined />, label: "内部项目" },
      ],
    },
    {
      key: "personal",
      icon: <ClockCircleOutlined />,
      label: "个人工作",
      children: [{ key: "/work-logs", icon: <ClockCircleOutlined />, label: "记录工时" }],
    },
    {
      key: "team",
      icon: <TeamOutlined />,
      label: "团队协作",
      children: [{ key: "/schedule", icon: <CalendarOutlined />, label: "项目排期" }],
    },
  ];

  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider locale={zhCN}>
          <Layout style={{ minHeight: "100vh", display: "flex" }}>
            <Sider 
              theme="dark"
              collapsible="icon"
              collapsed={collapsed}
              onCollapse={(value) => setCollapsed(value)}
              trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              style={{ 
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 1000
              }}
            >
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[pathname]}
                items={items}
                onClick={({ key }) => router.push(key)}
              />
            </Sider>

            <Layout style={{ 
              display: "flex", 
              flexDirection: "column",
              marginLeft: collapsed ? "80px" : "200px",
              transition: "margin-left 0.3s"
            }}>
              <Content style={{ padding: 24, flex: 1, overflow: "auto" }}>{children}</Content>
            </Layout>
          </Layout>
        </ConfigProvider>
      </body>
    </html>
  );
}
