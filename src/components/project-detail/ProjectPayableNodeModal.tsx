"use client";

import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Space, Switch } from "antd";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

export type ProjectPayableNodeFormValues = {
  stage: SelectOptionSelectorValue;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: Dayjs;
  actualAmountTaxIncluded?: number;
  actualDate?: Dayjs;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectPayableNodeFormValues) => void | Promise<void>;
  stageOptions: StageOption[];
  stageOptionsLoading?: boolean;
  actualAmountTaxIncluded?: number | null;
  actualDate?: Dayjs | null;
  initialValues?: Partial<ProjectPayableNodeFormValues>;
  title?: string;
};

const ProjectPayableNodeModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  stageOptions,
  stageOptionsLoading = false,
  actualAmountTaxIncluded = null,
  actualDate = null,
  initialValues,
  title = "新增付款节点",
}: Props) => {
  const [form] = Form.useForm<ProjectPayableNodeFormValues>();
  const showActualFields =
    actualAmountTaxIncluded !== null &&
    actualAmountTaxIncluded !== undefined &&
    actualDate !== null &&
    actualDate !== undefined;

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
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.resetFields();
        }
      }}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
        },
      }}
    >
      <Form<ProjectPayableNodeFormValues> form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="付款阶段"
              name="stage"
              rules={[{ required: true, message: "请选择付款阶段" }]}
            >
              <SelectOptionSelector
                placeholder={stageOptionsLoading ? "加载中..." : "请选择或新增付款阶段"}
                options={stageOptions.map((item) => ({
                  value: item.value,
                  label: item.value,
                  color: item.color ?? undefined,
                }))}
                createButtonText="新增付款阶段"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="付款条件"
              name="paymentCondition"
              rules={[{ required: true, message: "请输入付款条件" }]}
            >
              <Input placeholder="请输入付款条件" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="预付金额（含税）"
              name="expectedAmountTaxIncluded"
              rules={[{ required: true, message: "请输入预付金额" }]}
            >
              <InputNumber min={0} precision={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="预付日期"
              name="expectedDate"
              rules={[{ required: true, message: "请选择预付日期" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        {showActualFields ? (
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
        ) : null}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "rgba(0,0,0,0.88)" }}>备注</span>
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
          <Form.Item name="remark" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default ProjectPayableNodeModal;
