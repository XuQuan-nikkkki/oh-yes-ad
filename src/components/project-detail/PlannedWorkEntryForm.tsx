"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  message,
} from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { DEFAULT_COLOR } from "@/lib/constants";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

dayjs.extend(isoWeek);

export type PlannedWorkEntryFormPayload = {
  taskId: string;
  yearOption: string;
  weekNumberOption: string;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

type TaskOption = {
  id: string;
  name: string;
  projectId: string;
  segmentId?: string;
  segmentName?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type SelectOptionItem = {
  id: string;
  value: string;
  color?: string | null;
};

type PlannedWorkEntryInitialValues = PlannedWorkEntryFormPayload & {
  id: string;
  year?: number | null;
  weekNumber?: number | null;
};

type FormValues = {
  projectId?: string;
  segmentId?: string;
  taskId?: string;
  yearOption?: string;
  weekNumberOption?: string;
  plannedDays: number;
  weekdays: string[];
};

type Props = {
  projectOptions: ProjectOption[];
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
  disableSegmentSelect?: boolean;
  disableTaskSelect?: boolean;
  defaultSegmentId?: string;
  defaultTaskId?: string;
  taskOptions: TaskOption[];
  initialValues?: PlannedWorkEntryInitialValues | null;
  onSubmit: (payload: PlannedWorkEntryFormPayload) => Promise<void> | void;
};

const weekdayOptions = [
  { label: "周一", value: "monday" },
  { label: "周二", value: "tuesday" },
  { label: "周三", value: "wednesday" },
  { label: "周四", value: "thursday" },
  { label: "周五", value: "friday" },
  { label: "周六", value: "saturday" },
  { label: "周天", value: "sunday" },
] as const;

const PlannedWorkEntryForm = ({
  projectOptions,
  selectedProjectId,
  disableProjectSelect = false,
  disableSegmentSelect = false,
  disableTaskSelect = false,
  defaultSegmentId,
  defaultTaskId,
  taskOptions,
  initialValues,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [yearSearch, setYearSearch] = useState("");
  const [weekSearch, setWeekSearch] = useState("");
  const [yearSelectOpen, setYearSelectOpen] = useState(false);
  const [weekSelectOpen, setWeekSelectOpen] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [taskOwnerName, setTaskOwnerName] = useState("");
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const resolvedInitialTaskId = initialValues?.taskId ?? defaultTaskId;
  const initialTask = taskOptions.find((task) => task.id === resolvedInitialTaskId);
  const initialProjectId =
    selectedProjectId ??
    initialTask?.projectId;
  const initialSegmentId = initialTask?.segmentId ?? defaultSegmentId;
  const selectedWeekdays = [
    initialValues?.monday ? "monday" : null,
    initialValues?.tuesday ? "tuesday" : null,
    initialValues?.wednesday ? "wednesday" : null,
    initialValues?.thursday ? "thursday" : null,
    initialValues?.friday ? "friday" : null,
    initialValues?.saturday ? "saturday" : null,
    initialValues?.sunday ? "sunday" : null,
  ].filter(Boolean) as string[];
  const watchProjectId = Form.useWatch("projectId", form) ?? initialProjectId;
  const watchSegmentId = Form.useWatch("segmentId", form) ?? initialSegmentId;
  const watchTaskId = Form.useWatch("taskId", form) ?? resolvedInitialTaskId;
  const filteredSegmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    taskOptions.forEach((task) => {
      if (!task.segmentId || !task.segmentName) return;
      if (watchProjectId && task.projectId !== watchProjectId) return;
      if (!map.has(task.segmentId)) {
        map.set(task.segmentId, { id: task.segmentId, name: task.segmentName });
      }
    });
    return Array.from(map.values());
  }, [taskOptions, watchProjectId]);
  const filteredTaskOptions = useMemo(
    () => {
      if (!watchSegmentId) return [];
      return taskOptions.filter((task) => {
        if (watchProjectId && task.projectId !== watchProjectId) return false;
        return task.segmentId === watchSegmentId;
      });
    },
    [taskOptions, watchProjectId, watchSegmentId],
  );
  const yearOptions = useMemo<SelectOptionItem[]>(
    () => (optionsByField["plannedWorkEntry.year"] ?? []) as SelectOptionItem[],
    [optionsByField],
  );
  const weekNumberOptions = useMemo<SelectOptionItem[]>(
    () =>
      [
        ...((optionsByField["plannedWorkEntry.weekNumber"] ?? []) as SelectOptionItem[]),
      ].sort((left, right) => {
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
  const isCreateMode = !initialValues || initialValues.id === "new";
  const currentYearValue = String(dayjs().year());
  const currentWeekValue = String(dayjs().isoWeek());
  const initialYearOptionValue =
    initialValues?.yearOption ??
    (typeof initialValues?.year === "number" ? String(initialValues.year) : undefined);
  const initialWeekOptionValue =
    initialValues?.weekNumberOption ??
    (typeof initialValues?.weekNumber === "number"
      ? String(initialValues.weekNumber)
      : undefined);
  const defaultYearOptionValue = useMemo(() => {
    const normalized = currentYearValue.trim();
    const matched = yearOptions.find(
      (option: SelectOptionItem) => option.value.trim() === normalized,
    );
    return matched?.value ?? currentYearValue;
  }, [currentYearValue, yearOptions]);
  const defaultWeekOptionValue = useMemo(() => {
    const numericCurrentWeek = Number(currentWeekValue);
    const matched = weekNumberOptions.find((option: SelectOptionItem) => {
      const numericOption = Number(option.value);
      return Number.isFinite(numericOption) && numericOption === numericCurrentWeek;
    });
    return matched?.value ?? currentWeekValue;
  }, [currentWeekValue, weekNumberOptions]);

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  useEffect(() => {
    const currentSegmentId = form.getFieldValue("segmentId");
    if (!currentSegmentId) return;
    const existsInProject = filteredSegmentOptions.some(
      (segment) => segment.id === currentSegmentId,
    );
    if (!existsInProject) {
      form.setFieldValue("segmentId", undefined);
      form.setFieldValue("taskId", undefined);
    }
  }, [filteredSegmentOptions, form]);

  useEffect(() => {
    const currentTaskId = form.getFieldValue("taskId");
    if (!currentTaskId) return;
    const existsInProject = filteredTaskOptions.some(
      (task) => task.id === currentTaskId,
    );
    if (!existsInProject) {
      form.setFieldValue("taskId", undefined);
    }
  }, [filteredTaskOptions, form]);

  useEffect(() => {
    const taskId = typeof watchTaskId === "string" ? watchTaskId : "";
    if (!taskId) {
      setTaskOwnerName("");
      return;
    }

    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/project-tasks/${taskId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (active) setTaskOwnerName("");
          return;
        }
        const payload = (await res.json()) as {
          owner?: { name?: string | null } | null;
        };
        if (active) {
          setTaskOwnerName(payload.owner?.name ?? "");
        }
      } catch {
        if (active) setTaskOwnerName("");
      }
    })();

    return () => {
      active = false;
    };
  }, [watchTaskId]);

  useEffect(() => {
    if (!isCreateMode) return;
    if (!form.getFieldValue("yearOption")) {
      form.setFieldValue("yearOption", defaultYearOptionValue);
    }
    if (!form.getFieldValue("weekNumberOption")) {
      form.setFieldValue("weekNumberOption", defaultWeekOptionValue);
    }
  }, [defaultWeekOptionValue, defaultYearOptionValue, form, isCreateMode]);

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

  const handleCreateYear = async () => {
    if (!yearSearch.trim()) return;
    try {
      setCreatingYear(true);
      const value = await createOption("plannedWorkEntry.year", yearSearch);
      if (value) {
        form.setFieldValue("yearOption", value);
        setYearSearch("");
        setYearSelectOpen(false);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "新增年份失败");
    } finally {
      setCreatingYear(false);
    }
  };

  const handleCreateWeek = async () => {
    if (!weekSearch.trim()) return;
    try {
      setCreatingWeek(true);
      const value = await createOption("plannedWorkEntry.weekNumber", weekSearch);
      if (value) {
        form.setFieldValue("weekNumberOption", value);
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
    options: { value: string; label: string }[],
    placeholder: string,
    searchValue: string,
    onSearchChange: (value: string) => void,
    open: boolean,
    onOpenChange: (nextOpen: boolean) => void,
    onCreate: () => Promise<void>,
    creating: boolean,
  ) => {
    const keyword = searchValue.trim();
    const hasExactMatch = keyword
      ? options.some(
          (item) => item.value.toLowerCase() === keyword.toLowerCase(),
        )
      : false;
    return (
      <Select
        placeholder={placeholder}
        showSearch
        popupMatchSelectWidth={false}
        open={open}
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
          <>
            {menu}
            <div style={{ padding: "8px" }}>
              <Button
                type="link"
                loading={creating}
                disabled={!keyword || hasExactMatch}
                style={{ padding: 0 }}
                onClick={() => void onCreate()}
              >
                {hasExactMatch ? "已存在同名选项" : `新增: ${keyword || ""}`}
              </Button>
            </div>
          </>
        )}
      />
    );
  };

  return (
    <>
      {contextHolder}
    <Form<FormValues>
      form={form}
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        projectId: initialProjectId,
        segmentId: initialSegmentId,
        taskId: resolvedInitialTaskId,
        yearOption: isCreateMode
          ? (defaultYearOptionValue ?? initialYearOptionValue)
          : initialYearOptionValue,
        weekNumberOption: isCreateMode
          ? (defaultWeekOptionValue ?? initialWeekOptionValue)
          : initialWeekOptionValue,
        plannedDays: initialValues?.plannedDays ?? 0,
        weekdays: selectedWeekdays,
      }}
      onFinish={(values) => {
        const weekdays = new Set(values.weekdays ?? []);
        return onSubmit({
          taskId: values.taskId as string,
          yearOption: String(values.yearOption ?? ""),
          weekNumberOption: String(values.weekNumberOption ?? ""),
          plannedDays: values.plannedDays,
          monday: weekdays.has("monday"),
          tuesday: weekdays.has("tuesday"),
          wednesday: weekdays.has("wednesday"),
          thursday: weekdays.has("thursday"),
          friday: weekdays.has("friday"),
          saturday: weekdays.has("saturday"),
          sunday: weekdays.has("sunday"),
        });
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="所属项目"
            name="projectId"
            rules={[{ required: true, message: "请选择项目" }]}
          >
            <Select
              disabled={disableProjectSelect}
              placeholder="请选择项目"
              options={projectOptions.map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="所属环节"
            name="segmentId"
            rules={[{ required: true, message: "请选择环节" }]}
          >
            <Select
              disabled={disableSegmentSelect}
              placeholder="请选择环节"
              options={filteredSegmentOptions.map((segment) => ({
                label: segment.name,
                value: segment.id,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="所属任务"
            name="taskId"
            rules={[{ required: true, message: "请选择任务" }]}
          >
            <Select
              disabled={disableTaskSelect}
              placeholder="请选择任务"
              options={filteredTaskOptions.map((task) => ({
                label: task.name,
                value: task.id,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="任务负责人">
            <Input value={taskOwnerName} placeholder="" disabled />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="年份"
                name="yearOption"
                rules={[{ required: true, message: "请选择年份" }]}
              >
                {renderCreatableSelect(
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
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="周数"
                name="weekNumberOption"
                rules={[{ required: true, message: "请选择周数" }]}
              >
                {renderCreatableSelect(
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
              </Form.Item>
            </Col>
          </Row>
        </Col>
        <Col span={12}>
          <Form.Item
            label="工作日"
            name="weekdays"
            rules={[{ required: true, message: "请至少选择一个工作日", type: "array", min: 1 }]}
          >
            <Checkbox.Group options={[...weekdayOptions]} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="计划天数"
            name="plannedDays"
            rules={[{ required: true, message: "请输入工时" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={0.5} />
          </Form.Item>
        </Col>
      </Row>

      <Button type="primary" htmlType="submit" block>
        保存
      </Button>
    </Form>
    </>
  );
};

export default PlannedWorkEntryForm;
