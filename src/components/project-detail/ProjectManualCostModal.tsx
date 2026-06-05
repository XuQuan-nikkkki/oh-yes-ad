"use client";

import { useEffect, useState } from "react";
import { Alert, Form, Input, InputNumber, Modal } from "antd";
import type { Project, ProjectManualCost } from "@/types/projectDetail";

type Props = {
  open: boolean;
  projectId: string;
  initialValues?: ProjectManualCost;
  onCancel: () => void;
  onSaved: (project: Project) => void;
};

type ManualCostFormValues = {
  agencyFeeAmount?: string | number | null;
  agencyFeeRemark?: string | null;
  outsourceAmount?: string | number | null;
  outsourceRemark?: string | null;
  laborAmount?: string | number | null;
  laborRemark?: string | null;
  rentAmount?: string | number | null;
  rentRemark?: string | null;
  middleOfficeAmount?: string | number | null;
  middleOfficeRemark?: string | null;
  executionAmount?: string | number | null;
  executionRemark?: string | null;
};

const FIELD_CONFIG = [
  { amountKey: "agencyFeeAmount", remarkKey: "agencyFeeRemark", label: "中介费" },
  { amountKey: "outsourceAmount", remarkKey: "outsourceRemark", label: "外包成本" },
  { amountKey: "laborAmount", remarkKey: "laborRemark", label: "人力成本" },
  { amountKey: "rentAmount", remarkKey: "rentRemark", label: "租金成本" },
  {
    amountKey: "middleOfficeAmount",
    remarkKey: "middleOfficeRemark",
    label: "中台成本",
  },
  {
    amountKey: "executionAmount",
    remarkKey: "executionRemark",
    label: "执行费用成本",
  },
] as const satisfies Array<{
  amountKey: keyof ManualCostFormValues;
  remarkKey: keyof ManualCostFormValues;
  label: string;
}>;

const normalizeInitialValues = (
  values?: ProjectManualCost,
): ManualCostFormValues => ({
  agencyFeeAmount: values?.agencyFeeAmount ?? null,
  agencyFeeRemark: values?.agencyFeeRemark ?? null,
  outsourceAmount: values?.outsourceAmount ?? null,
  outsourceRemark: values?.outsourceRemark ?? null,
  laborAmount: values?.laborAmount ?? null,
  laborRemark: values?.laborRemark ?? null,
  rentAmount: values?.rentAmount ?? null,
  rentRemark: values?.rentRemark ?? null,
  middleOfficeAmount: values?.middleOfficeAmount ?? null,
  middleOfficeRemark: values?.middleOfficeRemark ?? null,
  executionAmount: values?.executionAmount ?? null,
  executionRemark: values?.executionRemark ?? null,
});

const normalizeNullableAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replaceAll(",", ""));
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
  }
  return null;
};

const normalizeNullableRemark = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeFormValues = (values?: ManualCostFormValues | ProjectManualCost) => ({
  agencyFeeAmount: normalizeNullableAmount(values?.agencyFeeAmount),
  agencyFeeRemark: normalizeNullableRemark(values?.agencyFeeRemark),
  outsourceAmount: normalizeNullableAmount(values?.outsourceAmount),
  outsourceRemark: normalizeNullableRemark(values?.outsourceRemark),
  laborAmount: normalizeNullableAmount(values?.laborAmount),
  laborRemark: normalizeNullableRemark(values?.laborRemark),
  rentAmount: normalizeNullableAmount(values?.rentAmount),
  rentRemark: normalizeNullableRemark(values?.rentRemark),
  middleOfficeAmount: normalizeNullableAmount(values?.middleOfficeAmount),
  middleOfficeRemark: normalizeNullableRemark(values?.middleOfficeRemark),
  executionAmount: normalizeNullableAmount(values?.executionAmount),
  executionRemark: normalizeNullableRemark(values?.executionRemark),
});

const ProjectManualCostModal = ({
  open,
  projectId,
  initialValues,
  onCancel,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<ManualCostFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(normalizeInitialValues(initialValues));
    setErrorText(null);
  }, [form, initialValues, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const normalizedValues = normalizeFormValues(values);
    const normalizedInitialValues = normalizeFormValues(initialValues);

    if (
      JSON.stringify(normalizedValues) === JSON.stringify(normalizedInitialValues)
    ) {
      setErrorText(null);
      onCancel();
      return;
    }

    const hasValue = FIELD_CONFIG.some(({ amountKey, remarkKey }) => {
      const amount = normalizedValues[amountKey];
      const remark = normalizedValues[remarkKey];
      const hasAmount = amount !== null;
      const hasRemark = remark !== null;
      return hasAmount || hasRemark;
    });

    if (!hasValue) {
      setErrorText("请至少填写一项成本或备注");
      return;
    }

    setErrorText(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          costSourceMode: "MANUAL",
          manualCost: normalizedValues,
        }),
      });

      if (!response.ok) {
        setErrorText("补充成本保存失败");
        return;
      }

      const project = (await response.json()) as Project;
      setErrorText(null);
      onSaved(project);
    } catch (error) {
      console.error(error);
      setErrorText("补充成本保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="补充成本"
      open={open}
      onCancel={onCancel}
      onOk={() => {
        void handleSubmit();
      }}
      confirmLoading={submitting}
      destroyOnHidden
      width={760}
    >
      {errorText ? (
        <Alert
          type="error"
          showIcon
          message={errorText}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form form={form} layout="vertical">
        {FIELD_CONFIG.map(({ amountKey, remarkKey, label }) => (
          <div
            key={String(amountKey)}
            style={{
              display: "grid",
              gridTemplateColumns: "220px minmax(0, 1fr)",
              gap: 16,
            }}
          >
            <Form.Item<ManualCostFormValues> label={`${label}金额`} name={amountKey}>
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={2}
                placeholder={`请输入${label}金额`}
                addonAfter="元"
              />
            </Form.Item>
            <Form.Item<ManualCostFormValues> label={`${label}备注`} name={remarkKey}>
              <Input.TextArea
                placeholder={`请输入${label}备注`}
                autoSize={{ minRows: 1, maxRows: 4 }}
              />
            </Form.Item>
          </div>
        ))}
      </Form>
    </Modal>
  );
};

export default ProjectManualCostModal;
