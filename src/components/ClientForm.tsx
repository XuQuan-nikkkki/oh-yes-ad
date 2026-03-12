"use client";

import { Form, Input, Select, Button } from "antd";

export type ClientFormValues = {
  name: string;
  industry?: string[];
  remark?: string | null;
};

type ClientFormInitialValues = {
  id?: string;
  name?: string;
  industry?: string;
  remark?: string | null;
};

type Props = {
  initialValues?: ClientFormInitialValues | null;
  industryOptions?: string[];
  onSubmit: (values: ClientFormValues) => Promise<void> | void;
  submitText?: string;
};

const ClientForm = ({
  initialValues,
  industryOptions = [],
  onSubmit,
  submitText = "保存",
}: Props) => {
  return (
    <Form
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        ...initialValues,
        industry: initialValues?.industry ? [initialValues.industry] : undefined,
      }}
      onFinish={onSubmit}
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
        {submitText}
      </Button>
    </Form>
  );
};

export default ClientForm;
