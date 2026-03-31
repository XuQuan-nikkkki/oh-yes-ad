"use client";

import { Suspense, useState } from "react";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

type LoginFormValues = {
  phone: string;
  password: string;
};

function LoginPageContent() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [messageApi, contextHolder] = message.useMessage();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "登录失败");
      }

      const user = (await res.json()) as Parameters<typeof setCurrentUser>[0];
      setCurrentUser(user);
      messageApi.success("登录成功");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "登录失败";
      messageApi.error(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4ecfb 100%)",
        padding: 16,
      }}
    >
      {contextHolder}
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          系统登录
        </Typography.Title>
        <Typography.Text type="secondary">
          使用手机号和密码登录
        </Typography.Text>

        <Form<LoginFormValues>
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={handleSubmit}
          initialValues={{ password: "admin123" }}
        >
          <Form.Item
            label="手机号"
            name="phone"
            rules={[{ required: true, message: "请输入手机号" }]}
          >
            <Input placeholder="请输入手机号" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
