"use client";

import { Modal, Form, Input, Select, Button } from "antd";

type Vendor = {
  id?: string;
  name?: string;
  fullName?: string | null;
  vendorType?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  vendorTypeOptions?: string[];
  initialValues?: Vendor | null;
};

const VendorFormModal = ({
  open,
  onCancel,
  onSuccess,
  vendorTypeOptions = [],
  initialValues,
}: Props) => {
  const isEdit = !!initialValues?.id;

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      vendorType: Array.isArray(values.vendorType)
        ? values.vendorType[0]
        : values.vendorType,
    };

    await fetch("/api/vendors", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { id: initialValues?.id, ...payload } : payload
      ),
    });

    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑供应商" : "新建供应商"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form
        key={initialValues?.id || "new"}
        layout="vertical"
        initialValues={{
          ...initialValues,
          vendorType: initialValues?.vendorType
            ? [initialValues.vendorType]
            : undefined,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="全称" name="fullName">
          <Input />
        </Form.Item>

        <Form.Item label="供应商类型" name="vendorType">
          <Select
            mode="tags"
            options={vendorTypeOptions.map((item) => ({
              label: item,
              value: item,
            }))}
            maxCount={1}
            placeholder="选择或输入类型"
          />
        </Form.Item>

        <Form.Item label="联系人" name="contactName">
          <Input />
        </Form.Item>

        <Form.Item label="电话" name="phone">
          <Input />
        </Form.Item>

        <Form.Item label="邮箱" name="email">
          <Input />
        </Form.Item>

        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </Modal>
  );
};

export default VendorFormModal;
