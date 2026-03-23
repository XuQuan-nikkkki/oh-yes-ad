"use client";

import { useEffect } from "react";
import { Modal, Form, Input, Button, Select } from "antd";
import { useClientsStore } from "@/stores/clientsStore";
import type { ClientContact as Contact } from "@/types/clientContact";

type ContactFormValues = {
  name: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  clientIds: string[];
};

type Props = {
  open: boolean;
  clientId?: string;
  clientEditable?: boolean; // 控制是否允许修改
  clientOptions?: { id: string; name: string }[];
  initialValues?: Contact | null;
  onCancel: () => void;
  onSuccess: (savedContact?: Contact) => void;
};

const EMPTY_CLIENT_OPTIONS: { id: string; name: string }[] = [];

const ContactFormModal = ({
  open,
  clientId,
  initialValues,
  onCancel,
  onSuccess,
  clientEditable = false,
  clientOptions = EMPTY_CLIENT_OPTIONS,
}: Props) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues?.id;
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);
  const storeClients = useClientsStore((state) => state.clients);
  const clients = (() => {
    const options = new Map<string, { id: string; name: string }>();

    for (const item of clientOptions) {
      if (item?.id && item?.name) {
        options.set(item.id, item);
      }
    }

    for (const item of storeClients) {
      if (item?.id && typeof item?.name === "string") {
        options.set(item.id, {
          id: item.id,
          name: item.name,
        });
      }
    }

    for (const item of initialValues?.clients ?? []) {
      if (item?.id && item?.name) {
        options.set(item.id, item);
      }
    }

    if (initialValues?.client?.id && initialValues.client.name) {
      options.set(initialValues.client.id, initialValues.client);
    }

    return Array.from(options.values());
  })();

  useEffect(() => {
    if (!open) return;
    if (!clientEditable) return;
    if (clients.length > 0) return;
    void fetchClientsFromStore();
  }, [open, clientEditable, clients.length, fetchClientsFromStore]);

  useEffect(() => {
    if (open) {
      const normalizedClientIds = Array.from(
        new Set(
          initialValues?.clientIds?.filter(Boolean) ??
            initialValues?.clients?.map((item) => item.id).filter(Boolean) ??
            (initialValues?.client?.id ? [initialValues.client.id] : clientId ? [clientId] : []),
        ),
      );
      form.setFieldsValue({
        ...initialValues,
        clientIds: normalizedClientIds,
      });
    }
  }, [open, initialValues, clientId, form]);

  const handleSubmit = async (values: ContactFormValues) => {
    let savedContact: Contact | undefined;
    if (isEdit) {
      const res = await fetch(`/api/client-contacts/${initialValues?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      savedContact = await res.json();
    } else {
      const res = await fetch("/api/client-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      savedContact = await res.json();
    }

    form.resetFields();
    onSuccess(savedContact);
  };

  return (
    <Modal
      title={isEdit ? "编辑人员" : "新建人员"}
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ flex: "80px" }} // 固定宽度
        wrapperCol={{ flex: 1 }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="姓名"
          name="name"
          rules={[{ required: true, message: "请输入姓名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="客户"
          name="clientIds"
          rules={[{ required: true, message: "请选择至少一个客户" }]}
        >
          <Select
            mode="multiple"
            options={clients.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            disabled={!clientEditable}
            placeholder="搜索并选择客户"
          />
        </Form.Item>
        <Form.Item label="职位" name="title">
          <Input />
        </Form.Item>
        <Form.Item label="职责范围" name="scope">
          <Input />
        </Form.Item>
        <Form.Item label="偏好" name="preference">
          <Input />
        </Form.Item>
        <Form.Item label="电话" name="phone">
          <Input />
        </Form.Item>
        <Form.Item label="邮箱" name="email">
          <Input />
        </Form.Item>
        <Form.Item label="微信" name="wechat">
          <Input />
        </Form.Item>
        <Form.Item label="地址" name="address">
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </Modal>
  );
};

export default ContactFormModal;
