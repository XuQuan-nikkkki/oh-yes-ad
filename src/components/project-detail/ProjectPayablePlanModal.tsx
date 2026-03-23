"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select, Space } from "antd";
import { StepsForm } from "@ant-design/pro-components";

export type ProjectPayablePlanFormValues = {
  vendorId?: string;
  legalEntityId?: string;
  contractAmount?: number;
  serviceContent?: string;
  ownerEmployeeId?: string;
  remark?: string;
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

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      ...initialValues,
    });
  }, [form, initialValues, open]);

  return (
    <Modal
      title={mode === "edit" ? "修改付款计划" : "新增付款计划"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={860}
    >
      <StepsForm<ProjectPayablePlanFormValues>
        formProps={{ form, layout: "vertical", initialValues }}
        stepsProps={{
          style: {
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#fff",
            paddingBottom: 12,
          },
        }}
        stepsFormRender={(dom, submitter) => (
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
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 12,
              }}
            >
              {dom}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f0f0f0",
                background: "#fff",
              }}
            >
              {submitter}
            </div>
          </div>
        )}
        onFinish={async (values) => {
          await onSubmit(values);
          return true;
        }}
        submitter={{
          searchConfig: {
            submitText: "保存",
          },
          render: (_props, dom) => <Space size={12}>{dom}</Space>,
          submitButtonProps: { loading, disabled: loading },
        }}
      >
        <StepsForm.StepForm title="供应商合同">
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
        </StepsForm.StepForm>

        <StepsForm.StepForm title="付款计划">
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
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={4} placeholder="请输入备注" />
          </Form.Item>
        </StepsForm.StepForm>
      </StepsForm>
    </Modal>
  );
};

export default ProjectPayablePlanModal;
