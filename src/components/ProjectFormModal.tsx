"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Col, DatePicker, Input, Modal, Row, Select, Switch } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { ProForm, StepsForm } from "@ant-design/pro-components";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import {
  renderEmployeeSelectedLabel,
} from "@/lib/employee-select";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import type { SimpleClient } from "@/types/client";
import { useSubmitLock } from "@/hooks/useSubmitLock";

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
  function?: string | null;
  functionOption?: {
    value?: string | null;
  } | null;
  employmentStatusOption?: {
    value?: string | null;
  } | null;
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

const OWNER_FUNCTION_PRIORITY = ["项目组", "项目经理", "品牌", "设计"] as const;

const getFunctionGroupLabel = (employee: Employee) => {
  const fromOption = employee.functionOption?.value?.trim();
  if (fromOption) return fromOption;
  const fromField = employee.function?.trim();
  return fromField || "未设置职能";
};

const isResignedEmployee = (employee: Employee) =>
  employee.employmentStatus === "离职" ||
  employee.employmentStatusOption?.value === "离职";

const getOwnerOptionLabel = (employee: Employee) =>
  isResignedEmployee(employee) ? `${employee.name}（已离职）` : employee.name;

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
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const [currentTypeCode, setCurrentTypeCode] = useState<string | null>(
    normalizeProjectTypeCode(initialValues?.type ?? projectType),
  );
  const baseFormRef = useRef<FormInstance<ProjectFormValues> | undefined>(
    undefined,
  );
  const progressFormRef = useRef<FormInstance<ProjectFormValues> | undefined>(
    undefined,
  );
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = optionsByField["project.status"] ?? [];
  const stageOptions = optionsByField["project.stage"] ?? [];

  const fetchEmployeesFromStore = useEmployeesStore(
    (state) => state.fetchEmployees,
  );
  const storedEmployeesRaw = useEmployeesStore((state) => state.employees);
  const storedEmployees = useMemo(
    () =>
      storedEmployeesRaw.map(
        (item): Employee => ({
          id: item.id,
          name: item.name,
          function: typeof item.function === "string" ? item.function : undefined,
          functionOption:
            item.functionOption &&
            typeof item.functionOption === "object" &&
            "value" in item.functionOption
              ? {
                  value:
                    typeof item.functionOption.value === "string"
                      ? item.functionOption.value
                      : undefined,
                }
              : undefined,
          employmentStatus: item.employmentStatus ?? undefined,
          employmentStatusOption:
            item.employmentStatusOption &&
            typeof item.employmentStatusOption === "object" &&
            "value" in item.employmentStatusOption
              ? {
                  value:
                    typeof item.employmentStatusOption.value === "string"
                      ? item.employmentStatusOption.value
                      : undefined,
                }
              : undefined,
        }),
      ),
    [storedEmployeesRaw],
  );
  const employees =
    storedEmployees.length > 0 ? storedEmployees : employeesFromProps;
  const projectOwnerOptions = useMemo<DefaultOptionType[]>(() => {
    const grouped = new Map<string, Employee[]>();
    employees.forEach((employee) => {
      const label = getFunctionGroupLabel(employee);
      const list = grouped.get(label) ?? [];
      list.push(employee);
      grouped.set(label, list);
    });

    const rankOfGroup = (label: string) => {
      const idx = OWNER_FUNCTION_PRIORITY.indexOf(
        label as (typeof OWNER_FUNCTION_PRIORITY)[number],
      );
      return idx >= 0 ? idx : OWNER_FUNCTION_PRIORITY.length + 1;
    };

    return Array.from(grouped.entries())
      .sort((left, right) => {
        const rankDiff = rankOfGroup(left[0]) - rankOfGroup(right[0]);
        if (rankDiff !== 0) return rankDiff;
        return left[0].localeCompare(right[0], "zh-CN");
      })
      .map(([groupLabel, groupEmployees]) => ({
        label: groupLabel,
        options: [...groupEmployees]
          .sort((left, right) => {
            const resignedDiff =
              Number(isResignedEmployee(left)) - Number(isResignedEmployee(right));
            if (resignedDiff !== 0) return resignedDiff;
            return left.name.localeCompare(right.name, "zh-CN");
          })
          .map((employee) => ({
            label: getOwnerOptionLabel(employee),
            value: employee.id,
          })),
      }))
      .filter((group) => Array.isArray(group.options) && group.options.length > 0);
  }, [employees]);
  const projectOwnerLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => {
      map.set(employee.id, getOwnerOptionLabel(employee));
    });
    if (initialValues?.ownerId && !map.has(initialValues.ownerId)) {
      map.set(initialValues.ownerId, initialValues.ownerId);
    }
    return map;
  }, [employees, initialValues?.ownerId]);

  const isEdit = !!initialValues?.id;
  const fixedTypeCode = normalizeProjectTypeCode(projectType);
  const isInternalProject = currentTypeCode === "INTERNAL";

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions(true);
    void fetchEmployeesFromStore();
  }, [fetchAllOptions, fetchEmployeesFromStore, open]);

  const baseValues: ProjectFormValues = {
    name: initialValues?.name ?? "",
    type:
      normalizeProjectTypeCode(initialValues?.type) ??
      fixedTypeCode ??
      undefined,
    clientId:
      normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) ===
      "INTERNAL"
        ? undefined
        : (initialValues?.clientId ?? undefined),
    ownerId: initialValues?.ownerId ?? undefined,
    status:
      normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) ===
      "INTERNAL"
        ? undefined
        : (initialValues?.status ?? undefined),
    stage:
      normalizeProjectTypeCode(initialValues?.type ?? fixedTypeCode) ===
      "INTERNAL"
        ? undefined
        : (initialValues?.stage ?? undefined),
    startDate: initialValues?.startDate
      ? dayjs(initialValues.startDate)
      : undefined,
    endDate: initialValues?.endDate ? dayjs(initialValues.endDate) : undefined,
    isArchived: Boolean(initialValues?.isArchived),
  };

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

    try {
      const result = await runWithSubmitLock(async () => {
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
      });
      return result ?? false;
    } catch {
      return false;
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑项目" : "新建项目"}
      open={open}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) return;
        setCurrentTypeCode(
          normalizeProjectTypeCode(initialValues?.type ?? projectType),
        );
      }}
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
          submitButtonProps: { loading: submitting, disabled: submitting },
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
                    showSearch
                    optionFilterProp="label"
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
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    const label =
                      typeof option?.label === "string" ? option.label : "";
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                  options={projectOwnerOptions}
                  placeholder="选择负责人"
                  labelRender={renderEmployeeSelectedLabel(
                    projectOwnerLabelMap,
                  )}
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
              <ProForm.Item
                label="是否归档"
                name="isArchived"
                valuePropName="checked"
                layout="horizontal"
              >
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
