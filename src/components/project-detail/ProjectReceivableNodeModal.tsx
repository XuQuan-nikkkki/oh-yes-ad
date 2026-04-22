"use client";

import type { Dayjs } from "dayjs";
import { useEffect, useMemo } from "react";
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
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

export type ProjectReceivableNodeFormValues = {
  stage: SelectOptionSelectorValue;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number;
  expectedDate?: Dayjs;
  actualAmountTaxIncluded?: number;
  actualDate?: Dayjs;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectReceivableNodeFormValues) => void | Promise<void>;
  stageOptions: StageOption[];
  stageOptionsLoading?: boolean;
  initialValues?: Partial<ProjectReceivableNodeFormValues>;
  actualAmountTaxIncluded?: number | null;
  actualDate?: Dayjs | null;
  title?: string;
};

const ProjectReceivableNodeModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  stageOptions,
  stageOptionsLoading = false,
  initialValues,
  actualAmountTaxIncluded = null,
  actualDate = null,
  title = "新增收款节点",
}: Props) => {
  const [form] = Form.useForm<ProjectReceivableNodeFormValues>();
  const mergedInitialValues = useMemo<Partial<ProjectReceivableNodeFormValues>>(
    () => ({
      remarkNeedsAttention: false,
      actualAmountTaxIncluded: actualAmountTaxIncluded ?? undefined,
      actualDate: actualDate ?? undefined,
      ...initialValues,
    }),
    [actualAmountTaxIncluded, actualDate, initialValues],
  );
  const shouldShowActualFields =
    mergedInitialValues.actualAmountTaxIncluded !== undefined ||
    mergedInitialValues.actualDate !== undefined;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(mergedInitialValues);
  }, [form, mergedInitialValues, open]);

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
      <Form<ProjectReceivableNodeFormValues> form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="收款阶段"
              name="stage"
              rules={[{ required: true, message: "请选择收款阶段" }]}
            >
              <SelectOptionSelector
                placeholder={
                  stageOptionsLoading ? "加载中..." : "请选择或新增收款阶段"
                }
                options={stageOptions.map((item) => ({
                  value: item.value,
                  label: item.value,
                  color: item.color ?? undefined,
                }))}
                createButtonText="新增收款阶段"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="收款关键交付物"
              name="keyDeliverable"
              rules={[{ required: true, message: "请输入收款关键交付物" }]}
            >
              <Input placeholder="请输入收款关键交付物" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="预收金额（含税）"
              name="expectedAmountTaxIncluded"
              rules={[{ required: true, message: "请输入预收金额" }]}
            >
              <InputNumber precision={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="预收日期" name="expectedDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        {shouldShowActualFields ? (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="实收金额（含税）"
                name="actualAmountTaxIncluded"
              >
                <InputNumber precision={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="实收日期" name="actualDate">
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
                name="remarkNeedsAttention"
                valuePropName="checked"
                noStyle
                layout="horizontal"
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

export default ProjectReceivableNodeModal;
