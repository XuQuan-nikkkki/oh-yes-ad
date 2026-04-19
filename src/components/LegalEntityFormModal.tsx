"use client";

import { useEffect, useMemo } from "react";
import { Button, Form, Input, Modal, Switch } from "antd";
import { useSubmitLock } from "@/hooks/useSubmitLock";

export type LegalEntityFormValues = {
  name: string;
  fullName?: string;
  taxNumber?: string;
  address?: string;
  isActive: boolean;
};

type LegalEntityRecord = {
  id?: string;
  name?: string;
  fullName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  isActive?: boolean;
} | null;

type Props = {
  open: boolean;
  initialValues?: LegalEntityRecord;
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
};

const LegalEntityFormModal = ({
  open,
  initialValues,
  onCancel,
  onSuccess,
}: Props) => {
  const [form] = Form.useForm<LegalEntityFormValues>();
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const isEdit = Boolean(initialValues?.id);

  const normalizedInitialValues = useMemo(
    () => ({
      name: initialValues?.name ?? "",
      fullName: initialValues?.fullName ?? "",
      taxNumber: initialValues?.taxNumber ?? "",
      address: initialValues?.address ?? "",
      isActive: initialValues?.isActive ?? false,
    }),
    [initialValues],
  );

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.setFieldsValue(normalizedInitialValues);
  }, [form, normalizedInitialValues, open]);

  return (
    <Modal
      title={isEdit ? "编辑公司主体" : "新增公司主体"}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={840}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          runWithSubmitLock(async () => {
            const res = await fetch(
              isEdit ? `/api/legal-entities/${initialValues?.id}` : "/api/legal-entities",
              {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: values.name.trim(),
                  fullName: values.fullName?.trim() || null,
                  taxNumber: values.taxNumber?.trim() || null,
                  address: values.address?.trim() || null,
                  isActive: values.isActive ?? false,
                }),
              },
            );

            if (!res.ok) {
              throw new Error((await res.text()) || "保存失败");
            }

            await onSuccess();
          })
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item label="全称" name="fullName">
            <Input placeholder="请输入全称" />
          </Form.Item>

          <Form.Item label="税号" name="taxNumber">
            <Input placeholder="请输入税号" />
          </Form.Item>

          <Form.Item label="地址" name="address">
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="isActive"
            valuePropName="checked"
            style={{ gridColumn: "1 / -1", marginBottom: 0 }}
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default LegalEntityFormModal;
