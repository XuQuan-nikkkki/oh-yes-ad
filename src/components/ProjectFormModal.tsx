"use client";

import { Modal, Form, Input, Select, Button } from "antd";

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
};

type ProjectFormValues = {
  name: string;
  type: string;
  status?: string[] | string | null;
  stage?: string[] | string | null;
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
}: Props) => {
  const isEdit = !!initialValues?.id;
  const isInternalProject = projectType === "内部项目" || initialValues?.type === "INTERNAL";

  const normalizeSingleValue = (value: unknown): string | null => {
    if (Array.isArray(value)) {
      const first = value[0];
      return typeof first === "string" && first.trim() ? first : null;
    }
    return typeof value === "string" && value.trim() ? value : null;
  };

  const normalizeProjectType = (value: unknown): string | null => {
    const normalized = normalizeSingleValue(value);
    if (!normalized) return null;
    if (normalized === "客户项目") return "CLIENT";
    if (normalized === "内部项目") return "INTERNAL";
    return normalized;
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    const type = normalizeProjectType(values.type);

    const payload = {
      name: values.name,
      type,
      status: isInternalProject ? null : normalizeSingleValue(values.status),
      stage: isInternalProject ? null : normalizeSingleValue(values.stage),
      clientId: isInternalProject ? null : normalizeSingleValue(values.clientId),
      ownerId: normalizeSingleValue(values.ownerId),
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
        key={initialValues?.id || "new"}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={{
          name: initialValues?.name,
          type: initialValues?.type || projectType || undefined,
          status: isInternalProject
            ? []
            : initialValues?.status
            ? Array.isArray(initialValues.status)
              ? initialValues.status
              : [initialValues.status]
            : [],
          stage: isInternalProject
            ? []
            : initialValues?.stage
            ? Array.isArray(initialValues.stage)
              ? initialValues.stage
              : [initialValues.stage]
            : [],
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
            disabled={!!projectType}
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
            <Select
              mode="tags"
              maxCount={1}
              options={
                [
                  { label: "推进中", value: "推进中" },
                  { label: "结算中", value: "结算中" },
                  { label: "商务洽谈", value: "商务洽谈" },
                  { label: "走流程", value: "走流程" },
                  { label: "已结案", value: "已结案" },
                  { label: "暂停", value: "暂停" },
                ]
              }
              placeholder="选择或输入项目状态（可选）"
              allowClear
            />
          </Form.Item>
        )}

        {!isInternalProject && (
          <Form.Item label="项目阶段" name="stage">
            <Select
              mode="tags"
              maxCount={1}
              options={
                [
                  { label: "商务洽谈", value: "商务洽谈" },
                  { label: "合同签订", value: "合同签订" },
                  { label: "立项", value: "立项" },
                  { label: "背景与需求", value: "背景与需求" },
                  { label: "定义与设想", value: "定义与设想" },
                  { label: "设计与原型（上）", value: "设计与原型（上）" },
                  { label: "设计与原型（下）", value: "设计与原型（下）" },
                  { label: "迭代与落地", value: "迭代与落地" },
                  { label: "VIS手册提交", value: "VIS手册提交" },
                  { label: "结案阶段", value: "结案阶段" },
                  { label: "文件深化", value: "文件深化" },
                  { label: "第三季度服务", value: "第三季度服务" },
                  { label: "交付验收中", value: "交付验收中" },
                  { label: "第四季度服务", value: "第四季度服务" },
                  { label: "策划拍摄", value: "策划拍摄" },
                ]
              }
              placeholder="选择或创建一个阶段"
              allowClear
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
