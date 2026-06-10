"use client";

import type { Dayjs } from "dayjs";
import { useEffect, useRef } from "react";
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
  actualDate?: Dayjs | null;
  invoiceDate?: Dayjs | null;
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
  const wasOpenRef = useRef(false);
  const actualAmountTaxIncluded = Form.useWatch(
    "actualAmountTaxIncluded",
    form,
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.resetFields();
      form.setFieldsValue({
        remarkNeedsAttention: false,
        ...initialValues,
      });
    }
    wasOpenRef.current = open;
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
              label="收款金额（含税）"
              name="actualAmountTaxIncluded"
              rules={[
                { required: true, message: "请输入收款金额" },
                {
                  validator: async (_, value: number | undefined) => {
                    if (value === undefined || value === null) return;
                    if (!Number.isFinite(Number(value))) {
                      throw new Error("请输入有效的收款金额");
                    }
                    if (Number(value) < 0) {
                      throw new Error("收款金额不能小于0");
                    }
                    if (
                      maxAmountTaxIncluded !== undefined &&
                      Number(value) > Number(maxAmountTaxIncluded)
                    ) {
                      throw new Error(
                        `收款金额不能大于剩余可收金额（${Number(
                          maxAmountTaxIncluded,
                        ).toLocaleString("zh-CN")}）`,
                      );
                    }
                  },
                },
              ]}
            >
              <InputNumber
                precision={2}
                min={0}
                max={maxAmountTaxIncluded}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="开票金额">
              <InputNumber
                precision={2}
                min={0}
                value={actualAmountTaxIncluded}
                disabled
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="收款日期" name="actualDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="开票日期" name="invoiceDate">
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
