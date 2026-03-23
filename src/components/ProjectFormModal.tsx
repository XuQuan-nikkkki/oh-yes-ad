"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Col, DatePicker, Input, Modal, Row, Select, Switch } from "antd";
import { ProForm, StepsForm } from "@ant-design/pro-components";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { SimpleClient } from "@/types/client";

type Project = {
  id?: string;
  name?: string;
  type?: string;
  isArchived?: boolean | null;
  status?: string | null;
  stage?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type Employee = {
  id: string;
  name: string;
  employmentStatus?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Project | null;
  clients?: SimpleClient[];
  employees?: Employee[];
  projectType?: string;
  clientEditable?: boolean;
};

type ProjectFormValues = {
  name: string;
  type?: string;
  clientId?: string | null;
  ownerId?: string | null;
  status?: SelectOptionSelectorValue;
  stage?: SelectOptionSelectorValue;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  isArchived?: boolean;
};

const normalizeProjectTypeCode = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  if (normalized === "客户项目") return "CLIENT";
  if (normalized === "内部项目") return "INTERNAL";
  return normalized;
};

const normalizeIdValue = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value : null;
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

const normalizeDateValue = (value: unknown) => {
  if (!value) return null;
  const parsed = dayjs.isDayjs(value) ? value : dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : null;
};

const ProjectFormModal = ({
  open,
  onCancel,
  onSuccess,
  initialValues,
  clients = [],
  employees: employeesFromProps = [],
  projectType,
  clientEditable = true,
}: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [currentTypeCode, setCurrentTypeCode] = useState<string | null>(
    normalizeProjectTypeCode(initialValues?.type ?? projectType),
  );
  const baseFormRef = useRef<FormInstance<ProjectFormValues> | undefined>(undefined);
  const progressFormRef = useRef<FormInstance<ProjectFormValues> | undefined>(undefined);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["project.status"] ?? [];
  const stageOptions = optionsByField["project.stage"] ?? [];

  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);
  const storedEmployeesRaw = useEmployeesStore((state) => state.employees);
  const storedEmployees = useMemo(
    () =>
      storedEmployeesRaw.map(
        (item): Employee => ({
          id: item.id,
          name: item.name,
          employmentStatus: item.employmentStatus ?? undefined,
        }),
      ),
    [storedEmployeesRaw],
  );
  const employees =
    storedEmployees.length > 0 ? storedEmployees : employeesFromProps;

  const isEdit = !!initialValues?.id;
  const fixedTypeCode = normalizeProjectTypeCode(projectType);
  const isInternalProject = currentTypeCode === "INTERNAL";

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions();
    void fetchEmployeesFromStore();
    setCurrentTypeCode(normalizeProjectTypeCode(initialValues?.type ?? projectType));
  }, [
    fetchAllOptions,
    fetchEmployeesFromStore,
    initialValues?.type,
    open,
    projectType,
  ]);

  const baseValues = useMemo<ProjectFormValues>(
    () => ({
      name: initialValues?.name ?? "",
      type:
        normalizeProjectTypeCode(initialValues?.type) ??
        fixedTypeCode ??
        undefined,
      clientId:
        normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) === "INTERNAL"
          ? undefined
          : initialValues?.clientId ?? undefined,
      ownerId: initialValues?.ownerId ?? undefined,
      status:
        normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) === "INTERNAL"
          ? undefined
          : initialValues?.status ?? undefined,
      stage:
        normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) === "INTERNAL"
          ? undefined
          : initialValues?.stage ?? undefined,
      startDate: initialValues?.startDate ? dayjs(initialValues.startDate) : undefined,
      endDate: initialValues?.endDate ? dayjs(initialValues.endDate) : undefined,
      isArchived: Boolean(initialValues?.isArchived),
    }),
    [
      fixedTypeCode,
      initialValues?.clientId,
      initialValues?.endDate,
      initialValues?.isArchived,
      initialValues?.name,
      initialValues?.ownerId,
      initialValues?.stage,
      initialValues?.startDate,
      initialValues?.status,
      initialValues?.type,
    ],
  );

  const handleTypeChange = (nextType: string) => {
    const normalizedType = normalizeProjectTypeCode(nextType);
    setCurrentTypeCode(normalizedType);
    if (normalizedType === "INTERNAL") {
      baseFormRef.current?.setFieldValue("clientId", undefined);
      progressFormRef.current?.setFieldValue("status", undefined);
      progressFormRef.current?.setFieldValue("stage", undefined);
    }
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    const type = normalizeProjectTypeCode(values.type);
    const isInternal = type === "INTERNAL";

    const payload = {
      name: values.name,
      type,
      clientId: isInternal ? null : normalizeIdValue(values.clientId),
      ownerId: normalizeIdValue(values.ownerId),
      status: isInternal ? null : normalizeSelectOptionValue(values.status),
      stage: isInternal ? null : normalizeSelectOptionValue(values.stage),
      startDate: normalizeDateValue(values.startDate),
      endDate: normalizeDateValue(values.endDate),
      isArchived: Boolean(values.isArchived),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit ? { id: initialValues?.id, ...payload } : payload,
        ),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存项目失败");
      }

      onSuccess();
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑项目" : "新建项目"}
      open={open}
      onCancel={() => {
        if (submitting) return;
        onCancel();
      }}
      footer={null}
      destroyOnHidden
      width={860}
    >
      <StepsForm<ProjectFormValues>
        onFinish={handleSubmit}
        stepsProps={{ size: "small" }}
        submitter={{
          submitButtonProps: { loading: submitting },
        }}
      >
        <StepsForm.StepForm<ProjectFormValues>
          title="基础信息"
          initialValues={baseValues}
          formRef={baseFormRef}
        >
          <Row gutter={16}>
            <Col span={12}>
              <ProForm.Item
                label="项目名称"
                name="name"
                rules={[{ required: true, message: "请输入项目名称" }]}
              >
                <Input />
              </ProForm.Item>
            </Col>
            <Col span={12}>
              <ProForm.Item
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
                  onChange={handleTypeChange}
                />
              </ProForm.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {!isInternalProject ? (
              <Col span={12}>
                <ProForm.Item
                  label="所属客户"
                  name="clientId"
                  rules={[{ required: true, message: "请选择客户" }]}
                >
                  <Select
                    options={clients.map((client) => ({
                      label: client.name,
                      value: client.id,
                    }))}
                    placeholder="选择客户"
                    disabled={!clientEditable}
                  />
                </ProForm.Item>
              </Col>
            ) : null}

            <Col span={12}>
              <ProForm.Item
                label="项目负责人"
                name="ownerId"
                rules={[{ required: true, message: "请选择项目负责人" }]}
              >
                <Select
                  options={employees
                    .filter((employee) => employee.employmentStatus === "在职")
                    .map((employee) => ({
                      label: employee.name,
                      value: employee.id,
                    }))}
                  placeholder="选择负责人"
                />
              </ProForm.Item>
            </Col>
          </Row>
        </StepsForm.StepForm>

        <StepsForm.StepForm<ProjectFormValues>
          title="项目进度"
          initialValues={baseValues}
          formRef={progressFormRef}
        >
          <Row gutter={16}>
            {!isInternalProject ? (
              <Col span={12}>
                <ProForm.Item
                  label="项目状态"
                  name="status"
                  rules={[{ required: true, message: "请选择项目状态" }]}
                >
                  <SelectOptionSelector
                    placeholder="选择或新增项目状态"
                    allowClear={false}
                    options={statusOptions.map((item) => ({
                      label: item.value,
                      value: item.value,
                      color: item.color ?? DEFAULT_COLOR,
                    }))}
                  />
                </ProForm.Item>
              </Col>
            ) : null}

            {!isInternalProject ? (
              <Col span={12}>
                <ProForm.Item
                  label="项目阶段"
                  name="stage"
                  rules={[{ required: true, message: "请选择项目阶段" }]}
                >
                  <SelectOptionSelector
                    placeholder="选择或新增项目阶段"
                    allowClear={false}
                    options={stageOptions.map((item) => ({
                      label: item.value,
                      value: item.value,
                      color: item.color ?? DEFAULT_COLOR,
                    }))}
                  />
                </ProForm.Item>
              </Col>
            ) : null}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <ProForm.Item
                label="开始时间"
                name="startDate"
                rules={[{ required: true, message: "请选择开始时间" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </ProForm.Item>
            </Col>
            <Col span={12}>
              <ProForm.Item label="结束时间" name="endDate">
                <DatePicker style={{ width: "100%" }} />
              </ProForm.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <ProForm.Item label="是否归档" name="isArchived" valuePropName="checked">
                <Switch checkedChildren="已归档" unCheckedChildren="未归档" />
              </ProForm.Item>
            </Col>
          </Row>
        </StepsForm.StepForm>
      </StepsForm>
    </Modal>
  );
};

export default ProjectFormModal;
