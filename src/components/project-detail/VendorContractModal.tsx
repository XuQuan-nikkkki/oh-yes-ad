"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Modal, Select, message } from "antd";

type LegalEntityOption = {
  id: string;
  name: string;
  fullName?: string | null;
};

type VendorOption = {
  id: string;
  name: string;
  fullName?: string | null;
};

type VendorContract = {
  id: string;
  projectId: string;
  vendorId: string;
  legalEntityId: string;
  serviceContent?: string | null;
  contractAmount?: number | string | null;
  vendor?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  projectName: string;
  contract: VendorContract | null;
  onSaved?: () => void | Promise<void>;
};

type FormValues = {
  projectId: string;
  vendorId?: string;
  legalEntityId?: string;
  serviceContent?: string;
  contractAmount?: number;
};

const toFormNumber = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const VendorContractModal = ({
  open,
  onCancel,
  projectId,
  projectName,
  contract,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [legalEntityOptions, setLegalEntityOptions] = useState<LegalEntityOption[]>([]);
  const [legalEntityLoading, setLegalEntityLoading] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);

  const isEdit = Boolean(contract?.id);

  const initialValues = useMemo<FormValues>(
    () => ({
      projectId,
      vendorId: contract?.vendorId ?? undefined,
      legalEntityId: contract?.legalEntityId ?? undefined,
      serviceContent: contract?.serviceContent ?? undefined,
      contractAmount: toFormNumber(contract?.contractAmount),
    }),
    [
      contract?.contractAmount,
      contract?.legalEntityId,
      contract?.serviceContent,
      contract?.vendorId,
      projectId,
    ],
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

  const vendorSelectOptions = useMemo(
    () => {
      const fromProject = vendorOptions.map((item) => ({
        label: item.fullName || item.name,
        value: item.id,
      }));

      if (contract?.vendorId) {
        const exists = fromProject.some((item) => item.value === contract.vendorId);
        if (!exists) {
          fromProject.push({
            value: contract.vendorId,
            label:
              contract.vendor?.fullName ||
              contract.vendor?.name ||
              contract.vendorId,
          });
        }
      }

      return fromProject.sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
    },
    [contract?.vendor, contract?.vendorId, vendorOptions],
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
        const res = await fetch("/api/legal-entities", { cache: "no-store" });
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

    const fetchProjectVendors = async () => {
      setVendorLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        if (!res.ok) {
          setVendorOptions([]);
          return;
        }
        const project = (await res.json()) as { vendors?: VendorOption[] };
        const rows = project?.vendors;
        setVendorOptions(Array.isArray(rows) ? rows : []);
      } catch {
        setVendorOptions([]);
      } finally {
        setVendorLoading(false);
      }
    };

    void fetchLegalEntities();
    void fetchProjectVendors();
  }, [open, projectId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        projectId,
        vendorId: values.vendorId,
        legalEntityId: values.legalEntityId,
        serviceContent: values.serviceContent?.trim() || null,
        contractAmount:
          values.contractAmount === undefined || values.contractAmount === null
            ? null
            : Math.trunc(values.contractAmount),
      };

      const url = isEdit
        ? `/api/vendor-contracts/${contract?.id}`
        : "/api/vendor-contracts";
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
          messageApi.error("当前项目已存在供应商合同");
        } else {
          messageApi.error(isEdit ? "编辑供应商合同失败" : "新建供应商合同失败");
        }
        setSubmitting(false);
        return;
      }

      messageApi.success(isEdit ? "编辑供应商合同成功" : "新建供应商合同成功");
      await onSaved?.();
      setSubmitting(false);
      onCancel();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑供应商合同" : "新建供应商合同"}
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
          label="供应商"
          name="vendorId"
          rules={[{ required: true, message: "请选择供应商" }]}
        >
          <Select
            showSearch
            allowClear
            loading={vendorLoading}
            placeholder="请选择供应商"
            options={vendorSelectOptions}
            optionFilterProp="label"
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
        <Form.Item label="服务内容" name="serviceContent">
          <Input placeholder="请输入服务内容" />
        </Form.Item>
        <Form.Item
          label="合同金额(含税)"
          name="contractAmount"
          rules={[{ required: true, message: "请输入合同金额(含税)" }]}
        >
          <InputNumber min={0} precision={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VendorContractModal;
