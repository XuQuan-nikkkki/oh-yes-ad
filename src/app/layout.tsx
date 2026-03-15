"use client";

import "./globals.css";
import { Layout, Menu, ConfigProvider, message, Dropdown, Avatar, Space, Modal, Form, Input } from "antd";
import zhCN from "antd/locale/zh_CN";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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
  UserOutlined as UserAvatarOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

const { Sider, Content, Header } = Layout;

type CurrentUser = {
  id: string;
  name: string;
  fullName?: string | null;
  phone?: string | null;
};

type ChangePasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordForm] = Form.useForm<ChangePasswordForm>();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const isLoginPage = pathname === "/login";
  const menuKeyByPrefix = [
    "/project-segments",
    "/project-tasks",
    "/project-milestones",
    "/project-documents",
    "/planned-work-entries",
    "/actual-work-entries",
    "/internal-projects",
    "/client-projects",
    "/client-contacts",
    "/clients",
    "/vendors",
    "/employees",
    "/leave-calendar",
    "/workday-adjustments",
    "/work-logs",
    "/schedule",
    "/",
  ];
  const selectedMenuKey =
    menuKeyByPrefix.find((key) => pathname === key || pathname.startsWith(`${key}/`)) ??
    pathname;
  const menuLink = (href: string, label: string) => (
    <Link href={href} style={{ display: "block" }}>
      {label}
    </Link>
  );

  const items = [
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
        { key: "/clients", icon: <UserOutlined />, label: menuLink("/clients", "客户管理") },
        { key: "/client-contacts", icon: <IdcardOutlined />, label: menuLink("/client-contacts", "客户人员") },
        { key: "/vendors", icon: <ShopOutlined />, label: menuLink("/vendors", "供应商管理") },
      ],
    },
    {
      key: "project-mgmt",
      icon: <ApartmentOutlined />,
      label: "项目管理",
      children: [
        { key: "/client-projects", icon: <ShoppingOutlined />, label: menuLink("/client-projects", "客户项目") },
        { key: "/internal-projects", icon: <ApartmentOutlined />, label: menuLink("/internal-projects", "内部项目") },
        { key: "/project-segments", icon: <AppstoreOutlined />, label: menuLink("/project-segments", "项目环节") },
        { key: "/project-tasks", icon: <ProfileOutlined />, label: menuLink("/project-tasks", "项目任务") },
        { key: "/project-milestones", icon: <FlagOutlined />, label: menuLink("/project-milestones", "项目里程碑") },
        { key: "/project-documents", icon: <FileTextOutlined />, label: menuLink("/project-documents", "项目资料") },
      ],
    },
    {
      key: "worktime",
      icon: <ClockCircleOutlined />,
      label: "工时管理",
      children: [
        { key: "/planned-work-entries", icon: <CalendarOutlined />, label: menuLink("/planned-work-entries", "计划工时") },
        { key: "/actual-work-entries", icon: <ClockCircleOutlined />, label: menuLink("/actual-work-entries", "实际工时") },
      ],
    },
    {
      key: "team-mgmt",
      icon: <TeamOutlined />,
      label: "团队管理",
      children: [
        { key: "/employees", icon: <TeamOutlined />, label: menuLink("/employees", "团队成员") },
        { key: "/leave-calendar", icon: <CalendarFilled />, label: menuLink("/leave-calendar", "请假日历") },
        { key: "/workday-adjustments", icon: <SwapOutlined />, label: menuLink("/workday-adjustments", "工作日变动") },
      ],
    },
    {
      key: "personal",
      icon: <ClockCircleOutlined />,
      label: "个人工作",
      children: [{ key: "/work-logs", icon: <ClockCircleOutlined />, label: menuLink("/work-logs", "记录工时") }],
    },
    {
      key: "team",
      icon: <TeamOutlined />,
      label: "团队协作",
      children: [{ key: "/schedule", icon: <CalendarOutlined />, label: menuLink("/schedule", "项目排期") }],
    },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    message.success("已退出登录");
    router.replace("/login");
    router.refresh();
  };

  useEffect(() => {
    if (isLoginPage) return;
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setCurrentUser(data);
    })();
  }, [isLoginPage, pathname, router]);

  useEffect(() => {
    if (isLoginPage) return;
    void fetchAllOptions();
  }, [isLoginPage, fetchAllOptions]);

  const accountMenu = {
    items: [
      { key: "change-password", label: "修改密码" },
      { key: "logout", label: "退出登录" },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "change-password") {
        setPasswordModalOpen(true);
      }
      if (key === "logout") handleLogout();
    },
  };

  const handleChangePassword = async (values: ChangePasswordForm) => {
    if (!currentUser?.phone) {
      message.error("当前账号缺少手机号，无法修改密码");
      return;
    }
    setPasswordSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentUser.phone,
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "修改密码失败");
      }
      message.success("密码修改成功");
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      const text = error instanceof Error ? error.message : "修改密码失败";
      message.error(text);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConfigProvider locale={zhCN}>
          {isLoginPage ? (
            children
          ) : (
            <>
              <Layout style={{ minHeight: "100vh", display: "flex" }}>
                <Sider
                  theme="dark"
                  collapsible
                  collapsed={collapsed}
                  onCollapse={(value) => setCollapsed(value)}
                  trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 1000,
                  }}
                >
                  <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedMenuKey]}
                    items={items}
                  />
                </Sider>

                <Layout
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: collapsed ? "80px" : "200px",
                    transition: "margin-left 0.3s",
                  }}
                >
                  <Header
                    style={{
                      background: "#fff",
                      padding: "0 16px",
                      borderBottom: "1px solid #f0f0f0",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    <Dropdown trigger={["hover"]} menu={accountMenu}>
                      <Space style={{ cursor: "pointer" }}>
                        <Avatar size="small" icon={<UserAvatarOutlined />} />
                        <span>{currentUser?.name ?? "加载中..."}</span>
                      </Space>
                    </Dropdown>
                  </Header>
                  <Content style={{ padding: 16, flex: 1, overflow: "auto" }}>{children}</Content>
                </Layout>
              </Layout>
              <Modal
                title="修改密码"
                open={passwordModalOpen}
                onCancel={() => {
                  setPasswordModalOpen(false);
                  passwordForm.resetFields();
                }}
                onOk={() => passwordForm.submit()}
                confirmLoading={passwordSubmitting}
                destroyOnHidden
              >
                <Form<ChangePasswordForm>
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                >
                  <Form.Item
                    label="旧密码"
                    name="oldPassword"
                    rules={[{ required: true, message: "请输入旧密码" }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="新密码"
                    name="newPassword"
                    rules={[{ required: true, message: "请输入新密码" }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="确认新密码"
                    name="confirmPassword"
                    dependencies={["newPassword"]}
                    rules={[
                      { required: true, message: "请再次输入新密码" },
                      ({ getFieldValue }) => ({
                        validator(_, value: string) {
                          if (!value || getFieldValue("newPassword") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("两次输入的新密码不一致"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Form>
              </Modal>
            </>
          )}
        </ConfigProvider>
      </body>
    </html>
  );
}
