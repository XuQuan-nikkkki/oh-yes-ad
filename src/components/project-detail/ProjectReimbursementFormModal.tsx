"use client";

import { useMemo } from "react";
import { DatePicker, Form, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import {
  buildEmployeeLabelMap,
  buildFlatEmployeeOptions,
  renderEmployeeSelectedLabel,
} from "@/lib/employee-select";

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    value?: string | null;
  } | null;
};

type CategoryOption = {
  id: string;
  value: string;
  color?: string | null;
};

export type ProjectReimbursementFormValues = {
  applicantEmployeeId: string;
  categoryOptionId: string;
  amount: number;
  occurredAt: string;
};

type Props = {
  open: boolean;
  projectId: string;
  projectName: string;
  employees: EmployeeOption[];
  categoryOptions: CategoryOption[];
  initialValues?: {
    applicantEmployeeId?: string;
    categoryOptionId?: string;
    amount?: number | string | null;
    occurredAt?: string | null;
  } | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectReimbursementFormValues) => Promise<void> | void;
};

const toAmountNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const ProjectReimbursementFormModal = ({
  open,
  projectId,
  projectName,
  employees,
  categoryOptions,
  initialValues,
  submitting = false,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();

  const employeeOptions = useMemo(
    () => buildFlatEmployeeOptions(employees),
    [employees],
  );
  const employeeLabelMap = useMemo(
    () => buildEmployeeLabelMap(employees),
    [employees],
  );

  const selectOptions = useMemo(
    () =>
      categoryOptions.map((item) => ({
        label: item.value,
        value: item.id,
      })),
    [categoryOptions],
  );

  return (
    <Modal
      title={initialValues ? "编辑报销" : "新增报销"}
      open={open}
      onCancel={onCancel}
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          form.setFieldsValue({
            projectId,
            applicantEmployeeId: initialValues?.applicantEmployeeId,
            categoryOptionId: initialValues?.categoryOptionId,
            amount: toAmountNumber(initialValues?.amount),
            occurredAt: initialValues?.occurredAt
              ? dayjs(initialValues.occurredAt)
              : dayjs(),
          });
          return;
        }
        form.resetFields();
      }}
      onOk={() => {
        void form.submit();
      }}
      confirmLoading={submitting}
      destroyOnHidden
      width={840}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          await onSubmit({
            applicantEmployeeId: values.applicantEmployeeId,
            categoryOptionId: values.categoryOptionId,
            amount: values.amount,
            occurredAt: values.occurredAt.toISOString(),
          });
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <Form.Item label="项目">
            <Select
              value={projectId}
              options={[{ label: projectName || "未命名项目", value: projectId }]}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="申请人"
            name="applicantEmployeeId"
            rules={[{ required: true, message: "请选择申请人" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={employeeOptions}
              placeholder="请选择申请人"
              labelRender={renderEmployeeSelectedLabel(employeeLabelMap)}
            />
          </Form.Item>

          <Form.Item
            label="类别"
            name="categoryOptionId"
            rules={[{ required: true, message: "请选择类别" }]}
          >
            <Select
              options={selectOptions}
              placeholder={
                selectOptions.length > 0 ? "请选择类别" : "当前财务结构未配置执行费用类别"
              }
              disabled={selectOptions.length === 0}
            />
          </Form.Item>

          <Form.Item
            label="金额"
            name="amount"
            rules={[{ required: true, message: "请输入金额" }]}
          >
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="费用发生日期"
            name="occurredAt"
            rules={[{ required: true, message: "请选择费用发生日期" }]}
            style={{ gridColumn: "1 / -1" }}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default ProjectReimbursementFormModal;
