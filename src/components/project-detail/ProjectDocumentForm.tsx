"use client";

import { useEffect } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

export type ProjectDocumentFormPayload = {
  name: string;
  projectId?: string;
  milestoneId?: string | null;
  typeOption?: SelectOptionSelectorValue | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
};

type InitialValues = {
  id: string;
  name: string;
  projectId?: string;
  milestoneId?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
};

type FormValues = {
  name: string;
  projectId?: string;
  milestoneId?: string;
  typeOption?: SelectOptionSelectorValue;
  date?: dayjs.Dayjs;
  isFinal?: boolean;
  internalLink?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type MilestoneOption = {
  id: string;
  name: string;
  projectId?: string | null;
};

type Props = {
  projectOptions?: ProjectOption[];
  milestoneOptions?: MilestoneOption[];
  selectedProjectId?: string;
  selectedMilestoneId?: string;
  showProjectField?: boolean;
  showMilestoneField?: boolean;
  disableProjectSelect?: boolean;
  disableMilestoneSelect?: boolean;
  initialValues?: InitialValues | null;
  onSubmit: (payload: ProjectDocumentFormPayload) => Promise<void> | void;
};

const ProjectDocumentForm = ({
  projectOptions = [],
  milestoneOptions = [],
  selectedProjectId,
  selectedMilestoneId,
  showProjectField = false,
  showMilestoneField = false,
  disableProjectSelect = false,
  disableMilestoneSelect = false,
  initialValues,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectDocument.type"] ?? [];
  const watchedProjectId = Form.useWatch("projectId", form);

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  useEffect(() => {
    const nextValues: Partial<FormValues> = {};
    if (selectedProjectId) {
      nextValues.projectId = selectedProjectId;
    }
    if (selectedMilestoneId) {
      nextValues.milestoneId = selectedMilestoneId;
    }
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [form, selectedMilestoneId, selectedProjectId]);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      name: initialValues?.name,
      projectId: selectedProjectId ?? initialValues?.projectId,
      milestoneId:
        selectedMilestoneId ?? initialValues?.milestoneId ?? undefined,
      typeOption: initialValues?.typeOption?.value ?? undefined,
      date: initialValues?.date ? dayjs(initialValues.date) : undefined,
      isFinal: initialValues?.isFinal ?? false,
      internalLink: initialValues?.internalLink ?? undefined,
    });
  }, [
    form,
    initialValues,
    selectedMilestoneId,
    selectedProjectId,
  ]);

  const effectiveProjectId =
    selectedProjectId ?? watchedProjectId ?? initialValues?.projectId;
  const filteredMilestoneOptions = effectiveProjectId
    ? milestoneOptions.filter((item) => item.projectId === effectiveProjectId)
    : milestoneOptions;

  useEffect(() => {
    if (!showMilestoneField) return;
    const currentMilestoneId = form.getFieldValue("milestoneId");
    if (!currentMilestoneId) return;
    const exists = filteredMilestoneOptions.some(
      (item) => item.id === currentMilestoneId,
    );
    if (!exists) {
      form.setFieldValue("milestoneId", undefined);
    }
  }, [filteredMilestoneOptions, form, showMilestoneField]);

  const selectOptions = typeOptions.map((option) => ({
    label: option.value,
    value: option.value,
    color: option.color,
  }));

  return (
    <Form<FormValues>
        form={form}
        key={initialValues?.id || "new"}
        layout="vertical"
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            projectId: selectedProjectId ?? values.projectId,
            milestoneId: selectedMilestoneId ?? values.milestoneId ?? null,
            typeOption:
              typeof values.typeOption === "string"
                ? values.typeOption.trim() || null
                : values.typeOption?.value?.trim()
                  ? {
                      value: values.typeOption.value.trim(),
                      color: values.typeOption.color ?? null,
                    }
                  : null,
            date: values.date ? values.date.toISOString() : null,
            isFinal: Boolean(values.isFinal),
            internalLink: values.internalLink?.trim() ? values.internalLink : null,
          })
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="名称"
              name="name"
              rules={[{ required: true, message: "请输入名称" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            {showProjectField ? (
              <Form.Item
                label="所属项目"
                name="projectId"
                rules={[{ required: true, message: "请选择所属项目" }]}
              >
                <Select
                  disabled={disableProjectSelect}
                  options={projectOptions.map((project) => ({
                    label: project.name,
                    value: project.id,
                  }))}
                  placeholder="请选择所属项目"
                />
              </Form.Item>
            ) : null}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="类型" name="typeOption">
              <SelectOptionSelector
                placeholder="请选择或新增类型"
                options={selectOptions}
                createButtonText="新增并选择颜色"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {showMilestoneField ? (
              <Form.Item label="关联里程碑" name="milestoneId">
                <Select
                  allowClear
                  disabled={disableMilestoneSelect}
                  options={filteredMilestoneOptions.map((milestone) => ({
                    label: milestone.name,
                    value: milestone.id,
                  }))}
                  placeholder="请选择关联里程碑"
                />
              </Form.Item>
            ) : null}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="日期" name="date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="内部链接" name="internalLink">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="isFinal" valuePropName="checked">
          <Checkbox>终稿</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
  );
};

export default ProjectDocumentForm;
