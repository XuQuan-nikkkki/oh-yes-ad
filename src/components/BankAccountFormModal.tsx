"use client";

import { useEffect, useMemo } from "react";
import { Button, Form, Input, Modal, Select, Switch } from "antd";
import { useSubmitLock } from "@/hooks/useSubmitLock";

type BankAccountRecord = {
  id?: string;
  legalEntityId?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  isActive?: boolean;
} | null;

type Props = {
  open: boolean;
  legalEntityId: string;
  legalEntityName: string;
  initialValues?: BankAccountRecord;
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
};

const BankAccountFormModal = ({
  open,
  legalEntityId,
  legalEntityName,
  initialValues,
  onCancel,
  onSuccess,
}: Props) => {
  const [form] = Form.useForm();
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const isEdit = Boolean(initialValues?.id);

  const normalized = useMemo(
    () => ({
      legalEntityId,
      bankName: initialValues?.bankName ?? "",
      bankBranch: initialValues?.bankBranch ?? "",
      accountNumber: initialValues?.accountNumber ?? "",
      isActive: initialValues?.isActive ?? true,
    }),
    [initialValues, legalEntityId],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(normalized);
  }, [form, normalized, open]);

  return (
    <Modal
      title={isEdit ? "编辑银行账户" : "新增银行账户"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={840}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          runWithSubmitLock(async () => {
            const res = await fetch(
              isEdit ? `/api/bank-accounts/${initialValues?.id}` : "/api/bank-accounts",
              {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  legalEntityId,
                  bankName: String(values.bankName ?? "").trim(),
                  bankBranch: String(values.bankBranch ?? "").trim(),
                  accountNumber: String(values.accountNumber ?? "").trim(),
                  isActive: Boolean(values.isActive),
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
          <Form.Item label="开户银行" name="bankName" rules={[{ required: true, message: "请输入开户银行" }]}>
            <Input placeholder="请输入开户银行" />
          </Form.Item>
          <Form.Item label="开户支行" name="bankBranch" rules={[{ required: true, message: "请输入开户支行" }]}>
            <Input placeholder="请输入开户支行" />
          </Form.Item>
          <Form.Item
            label="银行卡号"
            name="accountNumber"
            rules={[{ required: true, message: "请输入银行卡号" }]}
            style={{ gridColumn: "1 / -1" }}
          >
            <Input placeholder="请输入银行卡号" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="isActive"
            valuePropName="checked"
            style={{ gridColumn: "1 / -1", marginBottom: 0 }}
            layout="horizontal"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </div>

        <Form.Item label="公司主体" style={{ display: "none" }}>
          <Select
            value={legalEntityId}
            options={[{ label: legalEntityName || "未命名公司主体", value: legalEntityId }]}
            disabled
          />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default BankAccountFormModal;
