"use client";

import { message, Modal, Form, Input } from "antd";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";

type ChangePasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}
const ResetPasswordModal = ({ isModalOpen, setIsModalOpen }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [messageApi, contextHolder] = message.useMessage();

  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [passwordForm] = Form.useForm<ChangePasswordForm>();

  const handleChangePassword = async (values: ChangePasswordForm) => {
    if (!currentUser?.phone) {
      messageApi.error("当前账号缺少手机号，无法修改密码");
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
      messageApi.success("密码修改成功");
      setIsModalOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      const text = error instanceof Error ? error.message : "修改密码失败";
      messageApi.error(text);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="修改密码"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
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
  );
};

export default ResetPasswordModal;
