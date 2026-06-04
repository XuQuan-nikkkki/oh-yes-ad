"use client";

import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from "antd";

export type ProjectReceivableBadDebtRecordType = "WRITE_OFF" | "RECOVERY";

export type ProjectReceivableBadDebtRecordFormValues = {
  type: ProjectReceivableBadDebtRecordType;
  amountTaxIncluded: number;
  occurredAt: Dayjs;
  reason?: string;
  remark?: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: ProjectReceivableBadDebtRecordFormValues,
  ) => void | Promise<void>;
  title?: string;
  initialValues?: Partial<ProjectReceivableBadDebtRecordFormValues>;
};

const ProjectReceivableBadDebtRecordModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  title = "坏账记录",
  initialValues,
}: Props) => {
  const [form] = Form.useForm<ProjectReceivableBadDebtRecordFormValues>();
  const type = Form.useWatch("type", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      type: "WRITE_OFF",
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
      <Form<ProjectReceivableBadDebtRecordFormValues>
        form={form}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="类型"
              name="type"
              rules={[{ required: true, message: "请选择坏账类型" }]}
            >
              <Select
                options={[
                  { label: "坏账核销", value: "WRITE_OFF" },
                  { label: "坏账收回", value: "RECOVERY" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="金额（含税）"
              name="amountTaxIncluded"
              rules={[
                { required: true, message: "请输入金额" },
                {
                  validator: async (_, value: number | undefined) => {
                    if (value === undefined || value === null) return;
                    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
                      throw new Error("金额必须大于0");
                    }
                  },
                },
              ]}
            >
              <InputNumber precision={2} min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="发生日期"
          name="occurredAt"
          rules={[{ required: true, message: "请选择发生日期" }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        {type === "RECOVERY" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="保存坏账收回后，系统会自动创建同金额、同日期的实收记录。"
          />
        ) : null}
        <Form.Item label="原因" name="reason">
          <Input placeholder="请输入原因" />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProjectReceivableBadDebtRecordModal;
