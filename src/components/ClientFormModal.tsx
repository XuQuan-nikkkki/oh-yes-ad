"use client";

import { Modal, Form, Input, Select, Button } from "antd";

type Client = {
  id?: string;
  name?: string;
  industry?: string;
  remark?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  industryOptions?: string[];
  initialValues?: Client | null;
};

const ClientFormModal = ({
  open,
  onCancel,
  onSuccess,
  industryOptions=[],
  initialValues,
}: Props) => {
  const isEdit = !!initialValues?.id;

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      industry: Array.isArray(values.industry)
        ? values.industry[0]
        : values.industry,
    };

    await fetch("/api/clients", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? { id: initialValues?.id, ...payload }
          : payload
      ),
    });

    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑客户" : "新建客户"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form
        key={initialValues?.id || "new"} // 🔥 关键：强制切换时重建 Form
        layout="vertical"
        initialValues={{
          ...initialValues,
          industry: initialValues?.industry
            ? [initialValues.industry]
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

        <Form.Item
          label="行业"
          name="industry"
          rules={[{ required: true, message: "请输入行业" }]}
        >
          <Select
            mode="tags"
            options={industryOptions.map((item) => ({
              label: item,
              value: item,
            }))}
            maxCount={1}
            placeholder="选择或输入行业"
          />
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </Modal>
  );
};

export default ClientFormModal;