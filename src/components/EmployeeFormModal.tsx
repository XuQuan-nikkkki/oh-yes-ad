"use client";

import { Modal, Form, Input, Select, Button, Row, Col } from "antd";
import { useEffect } from "react";

type Employee = {
  id?: string;
  name?: string;
  function?: string | null;
  employmentStatus?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  functionOptions: string[];
  initialValues?: Employee | null;
};

const EmployeeFormModal = ({
  open,
  onCancel,
  onSuccess,
  functionOptions,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues?.id;

  useEffect(() => {
    if (open) {
      if (isEdit && initialValues) {
        form.setFieldsValue({
          name: initialValues.name || "",
          function: initialValues.function || undefined,
          employmentStatus: initialValues.employmentStatus || "在职",
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, isEdit, initialValues, form]);

  const handleSubmit = async (values: any) => {
    const functionValue = Array.isArray(values.function)
      ? values.function[0] || null
      : values.function || null;

    const payload = {
      name: values.name,
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
