"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  message,
} from "antd";
import { ProForm, StepsForm } from "@ant-design/pro-components";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import {
  DEFAULT_COLOR,
  DEFAULT_PROJECT_TASK_STATUS,
  PROJECT_TASK_STATUS_FIELD,
} from "@/lib/constants";
import {
  buildEmployeeLabelMap,
  buildFlatEmployeeOptions,
  renderEmployeeSelectedLabel,
} from "@/lib/employee-select";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type {
  ProjectProgressSegmentRow,
  ProjectProgressTaskRow,
} from "@/types/projectProgress";

dayjs.extend(isoWeek);

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string | null;
};

type Props = {
  open: boolean;
  projectId: string;
  projectName: string;
  data: ProjectProgressSegmentRow[];
  task: ProjectProgressTaskRow | null;
  employees?: EmployeeOption[];
  onCancel: () => void;
  onSuccess?: () => Promise<void> | void;
};

type TaskStepValues = {
  name: string;
  segmentId: string;
  status: SelectOptionSelectorValue;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type PlannedStepValues = {
  projectId: string;
  segmentId: string;
  taskId: string;
  yearOption?: string;
  weekNumberOption?: string;
  plannedDays: number;
  weekdays: string[];
};

type FormValues = TaskStepValues & PlannedStepValues;

const weekdayOptions = [
  { label: "周一", value: "monday" },
  { label: "周二", value: "tuesday" },
  { label: "周三", value: "wednesday" },
  { label: "周四", value: "thursday" },
  { label: "周五", value: "friday" },
  { label: "周六", value: "saturday" },
  { label: "周天", value: "sunday" },
] as const;

const toNormalizedSelectValue = (
  value?: SelectOptionSelectorValue | null,
): string | null => {
  if (!value) return null;
  return typeof value === "string" ? value : value.value;
};

const toIsoDateTimeOrNull = (value?: dayjs.Dayjs | string | Date | null) => {
  if (!value) return null;
  const normalized = dayjs.isDayjs(value) ? value : dayjs(value);
  return normalized.isValid() ? normalized.toISOString() : null;
};

const ProjectTaskStepFormModal = ({
  open,
  projectId,
  projectName,
  data,
  task,
  employees = [],
  onCancel,
  onSuccess,
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [yearSearch, setYearSearch] = useState("");
  const [weekSearch, setWeekSearch] = useState("");
  const [yearSelectOpen, setYearSelectOpen] = useState(false);
  const [weekSelectOpen, setWeekSelectOpen] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const plannedFormRef = useRef<FormInstance<FormValues> | undefined>(undefined);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions();
  }, [fetchAllOptions, open]);

  const statusOptions = useMemo(
    () => optionsByField[PROJECT_TASK_STATUS_FIELD] ?? [],
    [optionsByField],
  );
  const yearOptions = useMemo(
    () => optionsByField["plannedWorkEntry.year"] ?? [],
    [optionsByField],
  );
  const weekNumberOptions = useMemo(
    () =>
      [...(optionsByField["plannedWorkEntry.weekNumber"] ?? [])].sort((left, right) => {
        const leftNumber = Number(left.value);
        const rightNumber = Number(right.value);
        const leftIsNumeric = Number.isFinite(leftNumber);
        const rightIsNumeric = Number.isFinite(rightNumber);
        if (leftIsNumeric && rightIsNumeric) return leftNumber - rightNumber;
        if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
        return left.value.localeCompare(right.value, "zh-CN");
      }),
    [optionsByField],
  );

  const segmentOptions = useMemo(
    () =>
      data.map((segment) => ({
        id: segment.id,
        name: segment.name,
      })),
    [data],
  );
  const latestPlannedEntry = useMemo(() => {
    if (!task?.plannedEntries?.length) return null;
    return [...task.plannedEntries].sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year;
      if (left.weekNumber !== right.weekNumber) return right.weekNumber - left.weekNumber;
      return left.id.localeCompare(right.id, "zh-CN");
    })[0] ?? null;
  }, [task?.plannedEntries]);

  const currentYearValue = String(dayjs().year());
  const currentWeekValue = String(dayjs().isoWeek());
  const defaultYearOptionValue = useMemo(() => {
    const normalized = currentYearValue.trim();
    const matched = yearOptions.find((option) => option.value.trim() === normalized);
    return matched?.value ?? currentYearValue;
  }, [currentYearValue, yearOptions]);
  const defaultWeekOptionValue = useMemo(() => {
    const numericCurrentWeek = Number(currentWeekValue);
    const matched = weekNumberOptions.find((option) => {
      const numericOption = Number(option.value);
      return Number.isFinite(numericOption) && numericOption === numericCurrentWeek;
    });
    return matched?.value ?? currentWeekValue;
  }, [currentWeekValue, weekNumberOptions]);

  const ownerOptions = useMemo(
    () => buildFlatEmployeeOptions(employees),
    [employees],
  );
  const ownerLabelMap = useMemo(
    () =>
      buildEmployeeLabelMap(employees, [
        {
          id: task?.ownerId,
          name: task?.ownerName,
        },
      ]),
    [employees, task?.ownerId, task?.ownerName],
  );

  const baseValues = useMemo<FormValues | undefined>(() => {
    if (!task) return undefined;
    const selectedWeekdays = [
      latestPlannedEntry?.monday ? "monday" : null,
      latestPlannedEntry?.tuesday ? "tuesday" : null,
      latestPlannedEntry?.wednesday ? "wednesday" : null,
      latestPlannedEntry?.thursday ? "thursday" : null,
      latestPlannedEntry?.friday ? "friday" : null,
      latestPlannedEntry?.saturday ? "saturday" : null,
      latestPlannedEntry?.sunday ? "sunday" : null,
    ].filter(Boolean) as string[];

    return {
      name: task.name,
      segmentId: task.segmentId,
      status: task.statusOption?.value ?? task.status ?? DEFAULT_PROJECT_TASK_STATUS,
      ownerId: task.ownerId ?? undefined,
      dueDate: task.dueDate ? dayjs(task.dueDate) : undefined,
      projectId,
      taskId: task.id,
      yearOption: latestPlannedEntry ? String(latestPlannedEntry.year) : defaultYearOptionValue,
      weekNumberOption: latestPlannedEntry
        ? String(latestPlannedEntry.weekNumber)
        : defaultWeekOptionValue,
      plannedDays: latestPlannedEntry?.plannedDays ?? 0,
      weekdays: selectedWeekdays,
    };
  }, [
    defaultWeekOptionValue,
    defaultYearOptionValue,
    latestPlannedEntry,
    projectId,
    task,
  ]);

  const createOption = async (
    field: "plannedWorkEntry.year" | "plannedWorkEntry.weekNumber",
    value: string,
  ) => {
    const normalized = value.trim();
    if (!normalized) return;
    const res = await fetch("/api/select-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field,
        value: normalized,
        color: DEFAULT_COLOR,
      }),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    await fetchAllOptions(true);
    return normalized;
  };

  const handleCreateYear = async (form?: FormInstance<FormValues>) => {
    if (!yearSearch.trim()) return;
    try {
      setCreatingYear(true);
      const value = await createOption("plannedWorkEntry.year", yearSearch);
      if (value) {
        form?.setFieldValue("yearOption", value);
        setYearSearch("");
        setYearSelectOpen(false);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "新增年份失败");
    } finally {
      setCreatingYear(false);
    }
  };

  const handleCreateWeek = async (form?: FormInstance<FormValues>) => {
    if (!weekSearch.trim()) return;
    try {
      setCreatingWeek(true);
      const value = await createOption("plannedWorkEntry.weekNumber", weekSearch);
      if (value) {
        form?.setFieldValue("weekNumberOption", value);
        setWeekSearch("");
        setWeekSelectOpen(false);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "新增周数失败");
    } finally {
      setCreatingWeek(false);
    }
  };

  const renderCreatableSelect = (
    form: FormInstance<FormValues> | undefined,
    options: { value: string; label: string }[],
    placeholder: string,
    searchValue: string,
    onSearchChange: (value: string) => void,
    openSelect: boolean,
    onOpenChange: (nextOpen: boolean) => void,
    onCreate: (form?: FormInstance<FormValues>) => Promise<void>,
    creating: boolean,
  ) => {
    const keyword = searchValue.trim();
    const hasExactMatch = keyword
      ? options.some((item) => item.value.toLowerCase() === keyword.toLowerCase())
      : false;
    return (
      <Select
        placeholder={placeholder}
        showSearch
        popupMatchSelectWidth={false}
        open={openSelect}
        searchValue={searchValue}
        onOpenChange={onOpenChange}
        onSearch={onSearchChange}
        optionFilterProp="label"
        style={{ width: "100%" }}
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        options={options}
        popupRender={(menu) => (
          <div>
            {menu}
            <div style={{ padding: "8px" }}>
              <Button
                type="link"
                loading={creating}
                disabled={!keyword || hasExactMatch}
                style={{ padding: 0 }}
                onClick={() => void onCreate(form)}
              >
                {hasExactMatch ? "已存在同名选项" : `新增: ${keyword || ""}`}
              </Button>
            </div>
          </div>
        )}
      />
    );
  };

  const handleFinish = async (values: FormValues) => {
    if (!task) return true;
    setSubmitting(true);
    try {
      const taskResponse = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          segmentId: values.segmentId,
          status: toNormalizedSelectValue(values.status) ?? DEFAULT_PROJECT_TASK_STATUS,
          ownerId: values.ownerId ?? null,
          dueDate: toIsoDateTimeOrNull(values.dueDate),
        }),
      });

      if (!taskResponse.ok) {
        throw new Error((await taskResponse.text()) || "更新任务失败");
      }

      const weekdays = new Set(values.weekdays ?? []);
      const plannedPayload = {
        taskId: task.id,
        yearOption: String(values.yearOption ?? ""),
        weekNumberOption: String(values.weekNumberOption ?? ""),
        plannedDays: Number(values.plannedDays ?? 0),
        monday: weekdays.has("monday"),
        tuesday: weekdays.has("tuesday"),
        wednesday: weekdays.has("wednesday"),
        thursday: weekdays.has("thursday"),
        friday: weekdays.has("friday"),
        saturday: weekdays.has("saturday"),
        sunday: weekdays.has("sunday"),
      };

      const plannedEndpoint = latestPlannedEntry
        ? `/api/projects/${projectId}/planned-work-entries/${latestPlannedEntry.id}`
        : `/api/projects/${projectId}/planned-work-entries`;
      const plannedMethod = latestPlannedEntry ? "PATCH" : "POST";
      const plannedResponse = await fetch(plannedEndpoint, {
        method: plannedMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plannedPayload),
      });

      if (!plannedResponse.ok) {
        throw new Error((await plannedResponse.text()) || "保存计划工时失败");
      }

      messageApi.success("任务与计划工时已保存");
      await onSuccess?.();
      return true;
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存失败");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={task ? `编辑任务：${task.name}` : "编辑任务"}
        footer={null}
        onCancel={() => {
          if (submitting) return;
          onCancel();
        }}
        destroyOnHidden
        width={760}
      >
        {task && baseValues ? (
          <StepsForm<FormValues>
            onFinish={handleFinish}
            stepsProps={{ size: "small" }}
            submitter={{
              render: (_, dom) => <div style={{ paddingTop: 8 }}>{dom}</div>,
              submitButtonProps: { loading: submitting },
            }}
          >
            <StepsForm.StepForm<FormValues>
              title="任务信息"
              initialValues={baseValues}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <ProForm.Item label="所属项目" name="projectId">
                    <Select
                      disabled
                      options={[{ label: projectName, value: projectId }]}
                      placeholder="请选择所属项目"
                    />
                  </ProForm.Item>
                </Col>
                <Col span={12}>
                  <ProForm.Item
                    label="所属环节"
                    name="segmentId"
                    rules={[{ required: true, message: "请选择所属环节" }]}
                  >
                    <Select
                      options={segmentOptions.map((segment) => ({
                        label: segment.name,
                        value: segment.id,
                      }))}
                      placeholder="请选择所属环节"
                    />
                  </ProForm.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <ProForm.Item
                    label="任务名称"
                    name="name"
                    rules={[{ required: true, message: "请输入任务名称" }]}
                  >
                    <Input />
                  </ProForm.Item>
                </Col>
                <Col span={12}>
                  <ProForm.Item
                    label="状态"
                    name="status"
                    rules={[{ required: true, message: "请选择状态" }]}
                  >
                    <SelectOptionSelector
                      placeholder="请选择或新增状态"
                      allowClear={false}
                      options={statusOptions.map((item) => ({
                        label: item.value,
                        value: item.value,
                        color: item.color ?? DEFAULT_COLOR,
                      }))}
                    />
                  </ProForm.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <ProForm.Item label="负责人" name="ownerId">
                    <Select
                      allowClear
                      placeholder="选择负责人"
                      options={ownerOptions}
                      labelRender={renderEmployeeSelectedLabel(ownerLabelMap)}
                    />
                  </ProForm.Item>
                </Col>
                <Col span={12}>
                  <ProForm.Item label="截止日期" name="dueDate">
                    <DatePicker style={{ width: "100%" }} />
                  </ProForm.Item>
                </Col>
              </Row>
            </StepsForm.StepForm>
            <StepsForm.StepForm<FormValues>
              title="计划工时"
              initialValues={baseValues}
              formRef={plannedFormRef}
            >
              <div>
                <ProForm.Item name="projectId" hidden>
                  <Input />
                </ProForm.Item>
                <ProForm.Item name="segmentId" hidden>
                  <Input />
                </ProForm.Item>
                <ProForm.Item name="taskId" hidden>
                  <Input />
                </ProForm.Item>
                <div style={{ marginBottom: 24 }}>
                  <Space
                    style={{ width: "100%" }}
                    size={12}
                    styles={{ item: { flex: 1, minWidth: 180 } }}
                  >
                    <ProForm.Item
                      label="年份"
                      name="yearOption"
                      rules={[{ required: true, message: "请选择年份" }]}
                      style={{ width: "100%", marginBottom: 0 }}
                    >
                      {renderCreatableSelect(
                        plannedFormRef.current,
                        yearOptions.map((option) => ({
                          label: option.value,
                          value: option.value,
                        })),
                        "请选择年份",
                        yearSearch,
                        setYearSearch,
                        yearSelectOpen,
                        setYearSelectOpen,
                        handleCreateYear,
                        creatingYear,
                      )}
                    </ProForm.Item>
                    <ProForm.Item
                      label="周数"
                      name="weekNumberOption"
                      rules={[{ required: true, message: "请选择周数" }]}
                      style={{ width: "100%", marginBottom: 0 }}
                    >
                      {renderCreatableSelect(
                        plannedFormRef.current,
                        weekNumberOptions.map((option) => ({
                          label: option.value,
                          value: option.value,
                        })),
                        "请选择周数",
                        weekSearch,
                        setWeekSearch,
                        weekSelectOpen,
                        setWeekSelectOpen,
                        handleCreateWeek,
                        creatingWeek,
                      )}
                    </ProForm.Item>
                  </Space>
                </div>
                <ProForm.Item
                  label="工作日"
                  name="weekdays"
                  rules={[
                    {
                      required: true,
                      message: "请至少选择一个工作日",
                      type: "array",
                      min: 1,
                    },
                  ]}
                >
                  <Checkbox.Group options={[...weekdayOptions]} />
                </ProForm.Item>
                <ProForm.Item
                  label="工时(天)"
                  name="plannedDays"
                  rules={[{ required: true, message: "请输入工时" }]}
                >
                  <InputNumber style={{ width: "100%" }} min={0} step={0.5} />
                </ProForm.Item>
              </div>
            </StepsForm.StepForm>
          </StepsForm>
        ) : null}
      </Modal>
    </>
  );
};

export default ProjectTaskStepFormModal;
