"use client";

import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Switch,
} from "antd";

export type ProjectReceivableActualNodeFormValues = {
  actualAmountTaxIncluded: number;
  actualDate: Dayjs;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: ProjectReceivableActualNodeFormValues,
  ) => void | Promise<void>;
  title?: string;
  initialValues?: Partial<ProjectReceivableActualNodeFormValues>;
  maxAmountTaxIncluded?: number;
};

const ProjectReceivableActualNodeModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  title = "新增实收",
  initialValues,
  maxAmountTaxIncluded,
}: Props) => {
  const [form] = Form.useForm<ProjectReceivableActualNodeFormValues>();

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
      <Form<ProjectReceivableActualNodeFormValues>
        form={form}
        layout="vertical"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="实收金额（含税）"
              name="actualAmountTaxIncluded"
              rules={[
                { required: true, message: "请输入实收金额" },
                {
                  validator: async (_, value: number | undefined) => {
                    if (value === undefined || value === null) return;
                    if (!Number.isFinite(Number(value))) {
                      throw new Error("请输入有效的实收金额");
                    }
                    if (Number(value) < 0) {
                      throw new Error("实收金额不能小于0");
                    }
                    if (
                      maxAmountTaxIncluded !== undefined &&
                      Number(value) > Number(maxAmountTaxIncluded)
                    ) {
                      throw new Error(
                        `实收金额不能大于剩余可收金额（${Number(
                          maxAmountTaxIncluded,
                        ).toLocaleString("zh-CN")}）`,
                      );
                    }
                  },
                },
              ]}
            >
              <InputNumber
                precision={0}
                min={0}
                max={maxAmountTaxIncluded}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="实收日期"
              name="actualDate"
              rules={[{ required: true, message: "请选择实收日期" }]}
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
                  layout="horizontal"
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

export default ProjectReceivableActualNodeModal;
