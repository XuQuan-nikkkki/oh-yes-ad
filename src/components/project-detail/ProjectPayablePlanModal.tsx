"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Steps, Switch } from "antd";

export type ProjectPayablePlanFormValues = {
  vendorId?: string;
  legalEntityId?: string;
  contractAmount?: number;
  serviceContent?: string;
  ownerEmployeeId?: string;
  hasCustomerCollection?: boolean;
  remark?: string;
  remarkNeedsAttention?: boolean;
};

type Option = {
  label: string;
  value: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: ProjectPayablePlanFormValues,
  ) => void | Promise<void>;
  initialValues: Partial<ProjectPayablePlanFormValues>;
  projectId: string;
  projectName: string;
  vendorOptions: Option[];
  vendorLoading?: boolean;
  legalEntityOptions: Option[];
  legalEntityLoading?: boolean;
  ownerOptions: Option[];
};

const MODAL_FORM_MAX_HEIGHT = "calc(100vh - 220px)";

const ProjectPayablePlanModal = ({
  open,
  mode,
  loading = false,
  onCancel,
  onSubmit,
  initialValues,
  projectId,
  projectName,
  vendorOptions,
  vendorLoading = false,
  legalEntityOptions,
  legalEntityLoading = false,
  ownerOptions,
}: Props) => {
  const [form] = Form.useForm<ProjectPayablePlanFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const mergedInitialValues = useMemo(
    () => ({ hasCustomerCollection: false, remarkNeedsAttention: false, ...initialValues }),
    [initialValues],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(mergedInitialValues);
  }, [form, mergedInitialValues, open]);

  return (
    <Modal
      title={mode === "edit" ? "修改付款计划" : "新增付款计划"}
      open={open}
      onCancel={onCancel}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) return;
        setCurrentStep(0);
        form.setFieldsValue(mergedInitialValues);
      }}
      footer={null}
      destroyOnHidden
      width={860}
    >
      <div
        style={{
          width: "100%",
          maxHeight: MODAL_FORM_MAX_HEIGHT,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#fff",
            paddingBottom: 12,
          }}
        >
          <Steps
            current={currentStep}
            items={[{ title: "供应商合同" }, { title: "付款计划" }]}
          />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            paddingRight: 12,
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={mergedInitialValues}
            >
              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
          <Form.Item label="所属项目">
            <Select
              disabled
              options={[{ label: projectName || "未命名项目", value: projectId }]}
              value={projectId}
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
              options={vendorOptions}
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
              options={legalEntityOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="合同金额(含税)"
            name="contractAmount"
            rules={[{ required: true, message: "请输入合同金额(含税)" }]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
              </div>

              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
          <Form.Item
            label="服务内容"
            name="serviceContent"
            rules={[{ required: true, message: "请输入服务内容" }]}
          >
            <Input placeholder="请输入服务内容" />
          </Form.Item>
          <Form.Item
            label="跟进人"
            name="ownerEmployeeId"
            rules={[{ required: true, message: "请选择跟进人" }]}
          >
            <Select
              showSearch
              placeholder="请选择跟进人"
              options={ownerOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="有客户收款"
            name="hasCustomerCollection"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
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
                >
                  <Switch size="small" />
                </Form.Item>
              </Space>
            </div>
            <Form.Item name="remark" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={4} placeholder="请输入备注" />
            </Form.Item>
          </div>
              </div>
            </Form>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
            background: "#fff",
          }}
        >
          <Space size={12}>
            {currentStep === 1 ? (
              <Button onClick={() => setCurrentStep(0)} disabled={loading}>
                上一步
              </Button>
            ) : null}
            {currentStep === 0 ? (
              <Button
                type="primary"
                disabled={loading}
                onClick={async () => {
                  try {
                    await form.validateFields([
                      "vendorId",
                      "legalEntityId",
                      "contractAmount",
                    ]);
                    setCurrentStep(1);
                  } catch {
                    // antd will render field errors; keep the step as-is.
                  }
                }}
              >
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                loading={loading}
                disabled={loading}
                onClick={async () => {
                  try {
                    const values = await form.validateFields();
                    await onSubmit(values);
                  } catch {
                    // antd will render field errors.
                  }
                }}
              >
                保存
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectPayablePlanModal;
