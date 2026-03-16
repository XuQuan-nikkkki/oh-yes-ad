"use client";

import { useEffect } from "react";
import { Modal, Form, Input, Select, Button } from "antd";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

type Project = {
  id?: string;
  name?: string;
  type?: string;
  status?: string | null;
  stage?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
};

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Project | null;
  clients?: Client[];
  employees?: Employee[];
  projectType?: string;
  clientEditable?: boolean;
};

type ProjectFormValues = {
  name: string;
  type: string;
  status?: SelectOptionSelectorValue;
  stage?: SelectOptionSelectorValue;
  clientId?: string | null;
  ownerId?: string | null;
};

const ProjectFormModal = ({
  open,
  onCancel,
  onSuccess,
  initialValues,
  clients = [],
  employees = [],
  projectType,
  clientEditable = true,
}: Props) => {
  const [form] = Form.useForm<ProjectFormValues>();
  const projectTypeValue = Form.useWatch("type", form);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["project.status"] ?? [];
  const stageOptions = optionsByField["project.stage"] ?? [];

  const isEdit = !!initialValues?.id;
  const normalizeTypeCode = (value?: string | null) => {
    if (!value) return null;
    if (value === "客户项目") return "CLIENT";
    if (value === "内部项目") return "INTERNAL";
    return value;
  };
  const fixedTypeCode = normalizeTypeCode(projectType);
  const currentTypeCode = normalizeTypeCode(
    (projectTypeValue as string | undefined) ?? initialValues?.type ?? projectType,
  );
  const isInternalProject = currentTypeCode === "INTERNAL";

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions();
  }, [fetchAllOptions, open]);

  const normalizeIdValue = (value: unknown): string | null => {
    return typeof value === "string" && value.trim() ? value : null;
  };

  const normalizeProjectType = (value: unknown): string | null => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) return null;
    if (normalized === "客户项目") return "CLIENT";
    if (normalized === "内部项目") return "INTERNAL";
    return normalized;
  };

  const normalizeSelectOptionValue = (value: unknown) => {
    if (typeof value === "string") {
      const normalized = value.trim();
      return normalized || null;
    }
    if (value && typeof value === "object") {
      const candidateValue =
        "value" in value && typeof value.value === "string"
          ? value.value.trim()
          : "";
      const candidateColor =
        "color" in value && typeof value.color === "string"
          ? value.color.trim()
          : "";
      if (!candidateValue) return null;
      return {
        value: candidateValue,
        color: candidateColor || null,
      };
    }
    return null;
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    const type = normalizeProjectType(values.type);
    const isInternal = type === "INTERNAL";

    const payload = {
      name: values.name,
      type,
      status: isInternal ? null : normalizeSelectOptionValue(values.status),
      stage: isInternal ? null : normalizeSelectOptionValue(values.stage),
      clientId: isInternal ? null : normalizeIdValue(values.clientId),
      ownerId: normalizeIdValue(values.ownerId),
    };

    const res = await fetch("/api/projects", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? { id: initialValues?.id, ...payload }
          : payload
      ),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "保存项目失败");
    }

    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑项目" : "新建项目"}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        key={initialValues?.id || "new"}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={{
          name: initialValues?.name,
          type: normalizeTypeCode(initialValues?.type) ?? fixedTypeCode ?? undefined,
          status: isInternalProject
            ? undefined
            : initialValues?.status ?? undefined,
          stage: isInternalProject
            ? undefined
            : initialValues?.stage ?? undefined,
          clientId: isInternalProject ? undefined : initialValues?.clientId,
          ownerId: initialValues?.ownerId,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="项目名称"
          name="name"
          rules={[{ required: true, message: "请输入项目名称" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="项目类型"
          name="type"
          rules={[{ required: true, message: "请选择项目类型" }]}
        >
          <Select
            options={[
              { label: "客户项目", value: "CLIENT" },
              { label: "内部项目", value: "INTERNAL" },
            ]}
            placeholder="选择项目类型"
            disabled={Boolean(fixedTypeCode)}
          />
        </Form.Item>

        {!isInternalProject && (
          <Form.Item label="所属客户" name="clientId" rules={[{ required: true, message: "请选择客户" }]}>
            <Select
              options={clients.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              placeholder="选择客户"
              disabled={!clientEditable}
            />
          </Form.Item>
        )}

        <Form.Item label="项目负责人" name="ownerId">
          <Select
            options={employees
              .filter((e) => e.employmentStatus === "在职")
              .map((e) => ({
                label: e.name,
                value: e.id,
              }))}
            placeholder="选择负责人（可选）"
            allowClear
          />
        </Form.Item>

        {!isInternalProject && (
          <Form.Item label="项目状态" name="status">
            <SelectOptionSelector
              placeholder="选择或新增项目状态（可选）"
              options={statusOptions.map((item) => ({
                label: item.value,
                value: item.value,
                color: item.color ?? "#d9d9d9",
              }))}
            />
          </Form.Item>
        )}

        {!isInternalProject && (
          <Form.Item label="项目阶段" name="stage">
            <SelectOptionSelector
              placeholder="选择或新增项目阶段（可选）"
              options={stageOptions.map((item) => ({
                label: item.value,
                value: item.value,
                color: item.color ?? "#d9d9d9",
              }))}
            />
          </Form.Item>
        )}

        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </Modal>
  );
};

export default ProjectFormModal;
