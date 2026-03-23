"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, InputNumber, Modal, Select, message } from "antd";

type LegalEntityOption = {
  id: string;
  name: string;
  fullName?: string | null;
};

type ClientContract = {
  id: string;
  projectId: string;
  legalEntityId: string;
  contractAmount?: number | string | null;
  taxAmount?: number | string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  projectName: string;
  isClientProject?: boolean;
  contract: ClientContract | null;
  onSaved?: () => void | Promise<void>;
};

type FormValues = {
  projectId: string;
  legalEntityId?: string;
  contractAmount?: number;
  taxAmount?: number;
};

const toFormNumber = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const ClientContractModal = ({
  open,
  onCancel,
  projectId,
  projectName,
  isClientProject = false,
  contract,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [legalEntityOptions, setLegalEntityOptions] = useState<LegalEntityOption[]>([]);
  const [legalEntityLoading, setLegalEntityLoading] = useState(false);

  const isEdit = Boolean(contract?.id);

  const initialValues = useMemo<FormValues>(
    () => ({
      projectId,
      legalEntityId: contract?.legalEntityId ?? undefined,
      contractAmount: toFormNumber(contract?.contractAmount),
      taxAmount: toFormNumber(contract?.taxAmount),
    }),
    [contract?.contractAmount, contract?.legalEntityId, contract?.taxAmount, projectId],
  );

  const legalEntitySelectOptions = useMemo(
    () =>
      legalEntityOptions
        .map((item) => ({
          label: item.fullName || item.name,
          value: item.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    [legalEntityOptions],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(initialValues);
  }, [form, initialValues, open]);

  useEffect(() => {
    if (!open) return;
    const fetchLegalEntities = async () => {
      setLegalEntityLoading(true);
      try {
        const res = await fetch("/api/legal-entities");
        if (!res.ok) {
          setLegalEntityOptions([]);
          return;
        }
        const rows = (await res.json()) as LegalEntityOption[];
        setLegalEntityOptions(Array.isArray(rows) ? rows : []);
      } catch {
        setLegalEntityOptions([]);
      } finally {
        setLegalEntityLoading(false);
      }
    };
    void fetchLegalEntities();
  }, [open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        projectId,
        legalEntityId: values.legalEntityId,
        contractAmount:
          values.contractAmount === undefined || values.contractAmount === null
            ? null
            : values.contractAmount,
        taxAmount:
          values.taxAmount === undefined || values.taxAmount === null
            ? null
            : values.taxAmount,
      };

      const url = isEdit
        ? `/api/client-contracts/${contract?.id}`
        : "/api/client-contracts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (!isEdit && res.status === 409) {
          messageApi.error("当前项目已存在客户合同");
        } else {
          messageApi.error(isEdit ? "编辑客户合同失败" : "新建客户合同失败");
        }
        setSubmitting(false);
        return;
      }

      messageApi.success(isEdit ? "编辑客户合同成功" : "新建客户合同成功");
      await onSaved?.();
      setSubmitting(false);
      onCancel();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑客户合同" : "新建客户合同"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnHidden
    >
      {contextHolder}
      <Form<FormValues> form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item label="项目" name="projectId">
          <Select
            disabled
            options={[{ label: projectName || "未命名项目", value: projectId }]}
          />
        </Form.Item>
        <Form.Item
          label="签约主体"
          name="legalEntityId"
          rules={[{ required: true, message: "请选择签约主体" }]}
        >
          <Select
            showSearch
            allowClear
            loading={legalEntityLoading}
            placeholder="请选择签约主体"
            options={legalEntitySelectOptions}
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          label="合同金额"
          name="contractAmount"
          rules={
            isClientProject
              ? [{ required: true, message: "客户项目请输入合同金额" }]
              : undefined
          }
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="税费金额"
          name="taxAmount"
          rules={
            isClientProject
              ? [{ required: true, message: "客户项目请输入税费金额" }]
              : undefined
          }
        >
          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ClientContractModal;
