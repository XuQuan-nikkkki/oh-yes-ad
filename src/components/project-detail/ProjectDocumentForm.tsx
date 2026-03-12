"use client";

import { Button, Checkbox, DatePicker, Form, Input } from "antd";
import dayjs from "dayjs";

export type ProjectDocumentFormPayload = {
  name: string;
  type?: string | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
};

type InitialValues = ProjectDocumentFormPayload & {
  id: string;
};

type FormValues = {
  name: string;
  type?: string;
  date?: dayjs.Dayjs;
  isFinal?: boolean;
  internalLink?: string;
};

type Props = {
  initialValues?: InitialValues | null;
  onSubmit: (payload: ProjectDocumentFormPayload) => Promise<void> | void;
};

const ProjectDocumentForm = ({ initialValues, onSubmit }: Props) => {
  return (
    <Form<FormValues>
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        name: initialValues?.name,
        type: initialValues?.type ?? undefined,
        date: initialValues?.date ? dayjs(initialValues.date) : undefined,
        isFinal: initialValues?.isFinal ?? false,
        internalLink: initialValues?.internalLink ?? undefined,
      }}
      onFinish={(values) =>
        onSubmit({
          name: values.name,
          type: values.type?.trim() ? values.type : null,
          date: values.date ? values.date.toISOString() : null,
          isFinal: Boolean(values.isFinal),
          internalLink: values.internalLink?.trim() ? values.internalLink : null,
        })
      }
    >
      <Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入名称" }]}>
        <Input />
      </Form.Item>
      <Form.Item label="类型" name="type">
        <Input />
      </Form.Item>
      <Form.Item label="日期" name="date">
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="内部链接" name="internalLink">
        <Input placeholder="https://..." />
      </Form.Item>
      <Form.Item name="isFinal" valuePropName="checked">
        <Checkbox>终稿</Checkbox>
      </Form.Item>

      <Button type="primary" htmlType="submit" block>
        保存
      </Button>
    </Form>
  );
};

export default ProjectDocumentForm;
