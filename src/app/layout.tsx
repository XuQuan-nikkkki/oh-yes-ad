"use client";

import "./globals.css";
import { Layout, ConfigProvider, message, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useAuthStore } from "@/stores/authStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import ResetPasswordModal from "@/components/layout/PasswordResetModal";
import BasicLayout from "@/components/layout/BasicLayout";
import LayoutSider from "@/components/layout/LayoutSider";

// Style Constants
const MAIN_LAYOUT_STYLE = {
  minHeight: "100vh",
  display: "flex",
} as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const navigating = useNavigationStore((state) => state.navigating);
  const setNavigating = useNavigationStore((state) => state.setNavigating);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const clearCurrentUser = useAuthStore((state) => state.clearCurrentUser);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [, contextHolder] = message.useMessage();
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const isLoginPage = pathname === "/login";

  const handleSessionInvalid = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearCurrentUser();
      router.replace("/login");
      router.refresh();
    }
  }, [clearCurrentUser, router]);

  useEffect(() => {
    setNavigating(false);
  }, [pathname, setNavigating]);

  useEffect(() => {
    if (isLoginPage) return;
    (async () => {
      const user = await fetchMe();
      if (!user) {
        await handleSessionInvalid();
        return;
      }
    })();
  }, [fetchMe, isLoginPage, router, handleSessionInvalid]);

  useEffect(() => {
    if (isLoginPage) return;
    void fetchAllOptions();
  }, [isLoginPage, fetchAllOptions]);

  useEffect(() => {
    if (isLoginPage) return;
    void fetchSystemSettings();
  }, [isLoginPage, fetchSystemSettings]);

  const renderContent = () => {
    if (isLoginPage) {
      return children;
    }
    return (
      <Layout style={MAIN_LAYOUT_STYLE}>
        <LayoutSider
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          pathname={pathname}
          currentUser={currentUser}
        />

        <BasicLayout
          collapsed={collapsed}
          currentUser={currentUser}
          onChangePassword={() => setPasswordModalOpen(true)}
        >
          {children}
        </BasicLayout>
      </Layout>
    );
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConfigProvider locale={zhCN}>
          {contextHolder}
          {navigating ? (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,255,255,0.35)",
                zIndex: 1999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Spin size="large" />
            </div>
          ) : null}
          {renderContent()}
          <ResetPasswordModal
            isModalOpen={passwordModalOpen}
            setIsModalOpen={setPasswordModalOpen}
          />
        </ConfigProvider>
      </body>
    </html>
  );
}
