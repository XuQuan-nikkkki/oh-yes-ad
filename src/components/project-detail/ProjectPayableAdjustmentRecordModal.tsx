"use client";

import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Modal, Radio, Row } from "antd";

export type ProjectPayableAdjustmentRecordFormValues = {
  type: "REDUCTION" | "INCREASE" | "REDUCTION_REVERSAL";
  amountTaxIncluded: number;
  occurredAt?: Dayjs | null;
  reason?: string;
  remark?: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: ProjectPayableAdjustmentRecordFormValues,
  ) => void | Promise<void>;
  title?: string;
  initialValues?: Partial<ProjectPayableAdjustmentRecordFormValues>;
};

const ProjectPayableAdjustmentRecordModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  title = "新增应付调整",
  initialValues,
}: Props) => {
  const [form] = Form.useForm<ProjectPayableAdjustmentRecordFormValues>();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      type: "REDUCTION",
      ...initialValues,
    });
  }, [form, initialValues, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={title}
      open={open}
      width={720}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      destroyOnHidden
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) form.resetFields();
      }}
    >
      <Form<ProjectPayableAdjustmentRecordFormValues>
        form={form}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="调整类型"
              name="type"
              rules={[{ required: true, message: "请选择调整类型" }]}
            >
              <Radio.Group
                optionType="button"
                options={[
                  { label: "应付减免", value: "REDUCTION" },
                  { label: "应付增加", value: "INCREASE" },
                  { label: "应付冲回", value: "REDUCTION_REVERSAL" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="调整金额（含税）"
              name="amountTaxIncluded"
              rules={[{ required: true, message: "请输入调整金额" }]}
            >
              <InputNumber precision={2} min={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="调整日期"
              name="occurredAt"
              rules={[{ required: true, message: "请选择调整日期" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="调整原因" name="reason">
              <Input placeholder="请输入调整原因" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProjectPayableAdjustmentRecordModal;
