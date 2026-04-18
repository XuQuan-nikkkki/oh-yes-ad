"use client";

import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Space, Switch } from "antd";

export type ProjectPayableActualNodeFormValues = {
  actualAmountTaxIncluded: number;
  actualDate: Dayjs;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectPayableActualNodeFormValues) => void | Promise<void>;
  title?: string;
  initialValues?: Partial<ProjectPayableActualNodeFormValues>;
};

const ProjectPayableActualNodeModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  title = "新增实付",
  initialValues,
}: Props) => {
  const [form] = Form.useForm<ProjectPayableActualNodeFormValues>();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      remarkNeedsAttention: false,
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
      width={860}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      destroyOnHidden
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
        },
      }}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) form.resetFields();
      }}
    >
      <Form<ProjectPayableActualNodeFormValues> form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="实付金额（含税）"
              name="actualAmountTaxIncluded"
              rules={[{ required: true, message: "请输入实付金额" }]}
            >
              <InputNumber min={0} precision={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="实付日期"
              name="actualDate"
              rules={[{ required: true, message: "请选择实付日期" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label={
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>备注</span>
              <Space size={8}>
                <span style={{ fontWeight: 400 }}>标红</span>
                <Form.Item
                  noStyle
                  name="remarkNeedsAttention"
                  valuePropName="checked"
                >
                  <Switch size="small" />
                </Form.Item>
              </Space>
            </div>
          }
          name="remark"
        >
          <Input.TextArea rows={3} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProjectPayableActualNodeModal;
