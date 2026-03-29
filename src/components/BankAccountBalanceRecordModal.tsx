"use client";

import { useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useSubmitLock } from "@/hooks/useSubmitLock";

type LegalEntityOption = {
  id: string;
  name: string;
};

type BankAccountOption = {
  id: string;
  accountNumber: string;
  legalEntityId: string;
};

type Props = {
  open: boolean;
  legalEntityId?: string;
  legalEntityName?: string;
  bankAccount?: {
    id: string;
    accountNumber: string;
  } | null;
  legalEntityOptions?: LegalEntityOption[];
  bankAccountOptions?: BankAccountOption[];
  initialValues?: {
    id?: string;
    legalEntityId?: string;
    bankAccountId?: string;
    balance?: number | null;
    snapshotAt?: string | null;
    remark?: string | null;
  } | null;
  lockLegalEntity?: boolean;
  lockBankAccount?: boolean;
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
};

const BankAccountBalanceRecordModal = ({
  open,
  legalEntityId,
  legalEntityName,
  bankAccount,
  legalEntityOptions = [],
  bankAccountOptions = [],
  initialValues,
  lockLegalEntity = true,
  lockBankAccount = true,
  onCancel,
  onSuccess,
}: Props) => {
  const [form] = Form.useForm();
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const [selectedLegalEntityId, setSelectedLegalEntityId] = useState("");
  const isEdit = Boolean(initialValues?.id);

  const formInitialValues = {
    legalEntityId: initialValues?.legalEntityId ?? legalEntityId ?? "",
    bankAccountId: initialValues?.bankAccountId ?? bankAccount?.id ?? "",
    balance: initialValues?.balance ?? undefined,
    snapshotAt: initialValues?.snapshotAt ? dayjs(initialValues.snapshotAt) : dayjs(),
    remark: initialValues?.remark ?? "",
  };

  const mergedLegalEntityOptions = useMemo(() => {
    if (legalEntityOptions.length > 0) {
      return legalEntityOptions.map((item) => ({
        label: item.name,
        value: item.id,
      }));
    }
    if (legalEntityId) {
      return [{ label: legalEntityName || "未命名公司主体", value: legalEntityId }];
    }
    return [];
  }, [legalEntityId, legalEntityName, legalEntityOptions]);

  const filteredBankAccountOptions = useMemo(() => {
    const source =
      bankAccountOptions.length > 0
        ? bankAccountOptions.filter((item) =>
            selectedLegalEntityId ? item.legalEntityId === selectedLegalEntityId : true,
          )
        : bankAccount && legalEntityId
          ? [{ id: bankAccount.id, accountNumber: bankAccount.accountNumber, legalEntityId }]
          : [];

    return source.map((item) => ({
      label: item.accountNumber,
      value: item.id,
    }));
  }, [bankAccount, bankAccountOptions, legalEntityId, selectedLegalEntityId]);

  return (
    <Modal
      title={isEdit ? "编辑余额记录" : "新增余额记录"}
      open={open}
      onCancel={onCancel}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.resetFields();
          setSelectedLegalEntityId("");
          return;
        }
        form.setFieldsValue(formInitialValues);
        setSelectedLegalEntityId(String(formInitialValues.legalEntityId ?? ""));
      }}
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
              isEdit
                ? `/api/bank-account-balance-records/${initialValues?.id}`
                : "/api/bank-account-balance-records",
              {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bankAccountId: values.bankAccountId,
                  balance: values.balance,
                  snapshotAt: values.snapshotAt?.toISOString?.() ?? null,
                  remark: String(values.remark ?? "").trim() || null,
                }),
              },
            );

            if (!res.ok) {
              throw new Error((await res.text()) || `${isEdit ? "更新" : "记录"}金额失败`);
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
            label="公司主体"
            name="legalEntityId"
            rules={[{ required: true, message: "请选择公司主体" }]}
          >
            <Select
              options={mergedLegalEntityOptions}
              disabled={lockLegalEntity}
              onChange={(value) => {
                const nextValue = String(value ?? "");
                setSelectedLegalEntityId(nextValue);
                if (!lockBankAccount) {
                  form.setFieldValue("bankAccountId", undefined);
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label="银行卡号"
            name="bankAccountId"
            rules={[{ required: true, message: "请选择银行卡号" }]}
          >
            <Select
              options={filteredBankAccountOptions}
              disabled={lockBankAccount}
            />
          </Form.Item>
          <Form.Item label="金额" name="balance" rules={[{ required: true, message: "请输入金额" }]}>
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="日期"
            name="snapshotAt"
            rules={[{ required: true, message: "请选择日期" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="remark" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
            <Input.TextArea placeholder="请输入备注" rows={4} />
          </Form.Item>
        </div>

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

export default BankAccountBalanceRecordModal;
