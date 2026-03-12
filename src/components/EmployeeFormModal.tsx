"use client";

import { Modal, Form, Input, Select, Button, Row, Col } from "antd";
import { useEffect, useMemo } from "react";

type Employee = {
  id?: string;
  name?: string;
  phone?: string | null;
  fullName?: string | null;
  roles?: {
    role: {
      id: string;
      code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";
      name: string;
    };
  }[];
  function?: string | null;
  employmentStatus?: string | null;
};

type RoleOption = {
  id: string;
  code: "ADMIN" | "PROJECT_MANAGER" | "HR" | "FINANCE" | "STAFF";
  name: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  functionOptions: string[];
  roleOptions: RoleOption[];
  initialValues?: Employee | null;
};

type FormValues = {
  name: string;
  phone?: string;
  fullName?: string;
  roleIds?: string[];
  function?: string | string[];
  employmentStatus?: string | null;
};

const EmployeeFormModal = ({
  open,
  onCancel,
  onSuccess,
  functionOptions,
  roleOptions,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues?.id;
  const selectedRoleIds = useMemo(
    () => initialValues?.roles?.map((item) => item.role.id) ?? [],
    [initialValues?.roles],
  );

  useEffect(() => {
    if (open) {
      if (isEdit && initialValues) {
        form.setFieldsValue({
          name: initialValues.name || "",
          phone: initialValues.phone || "",
          fullName: initialValues.fullName || "",
          roleIds: selectedRoleIds,
          function: initialValues.function || undefined,
          employmentStatus: initialValues.employmentStatus || "在职",
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, isEdit, initialValues, selectedRoleIds, form]);

  const handleSubmit = async (values: FormValues) => {
    const functionValue = Array.isArray(values.function)
      ? values.function[0] || null
      : values.function || null;

    const payload = {
      name: values.name,
      phone: values.phone || null,
      fullName: values.fullName || null,
      roleIds: values.roleIds ?? [],
      function: functionValue,
      employmentStatus: values.employmentStatus || null,
    };

    await fetch("/api/employees", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { id: initialValues?.id, ...payload } : payload
      ),
    });

    form.resetFields();
    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑成员" : "新增成员"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="姓名"
          name="name"
          rules={[{ required: true, message: "请输入姓名" }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: "请输入手机号" }]}
        >
          <Input placeholder="用于登录的手机号" />
        </Form.Item>

        <Form.Item label="全名" name="fullName">
          <Input placeholder="可选，完整姓名" />
        </Form.Item>

        <Form.Item
          label="角色"
          name="roleIds"
          rules={[{ required: true, message: "请至少选择一个角色" }]}
        >
          <Select
            mode="multiple"
            options={[
              ...roleOptions.map((item) => ({
                label: item.name,
                value: item.id,
              })),
            ]}
            placeholder="选择角色"
          />
        </Form.Item>

        <Form.Item label="职能" name="function">
          <Select
            mode="tags"
            options={functionOptions.map((item) => ({
              label: item,
              value: item,
            }))}
            maxCount={1}
            placeholder="选择或输入职能"
          />
        </Form.Item>

        <Form.Item label="用工状态" name="employmentStatus">
          <Select
            options={[
              { label: "在职", value: "在职" },
              { label: "离职", value: "离职" },
            ]}
            placeholder="选择用工状态"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Button onClick={onCancel} block>
              取消
            </Button>
          </Col>
          <Col span={12}>
            <Button type="primary" onClick={() => form.submit()} block>
              保存
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EmployeeFormModal;
