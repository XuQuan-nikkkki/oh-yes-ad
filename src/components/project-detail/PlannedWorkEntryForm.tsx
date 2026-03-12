"use client";

import { useEffect, useMemo } from "react";
import { Button, Checkbox, Form, InputNumber, Select, Space } from "antd";

export type PlannedWorkEntryFormPayload = {
  taskId: string;
  year: number;
  weekNumber: number;
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
};

type ProjectOption = {
  id: string;
  name: string;
};

type PlannedWorkEntryInitialValues = PlannedWorkEntryFormPayload & {
  id: string;
};

type FormValues = {
  projectId: string;
  taskId: string;
  year: number;
  weekNumber: number;
  plannedDays: number;
  weekdays: string[];
};

type Props = {
  projectOptions: ProjectOption[];
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
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
  taskOptions,
  initialValues,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const currentYear = new Date().getFullYear();
  const initialProjectId =
    selectedProjectId ??
    taskOptions.find((task) => task.id === initialValues?.taskId)?.projectId ??
    projectOptions[0]?.id;
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
  const filteredTaskOptions = useMemo(
    () =>
      taskOptions.filter((task) =>
        watchProjectId ? task.projectId === watchProjectId : true,
      ),
    [taskOptions, watchProjectId],
  );

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

  return (
    <Form<FormValues>
      form={form}
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        projectId: initialProjectId,
        taskId: initialValues?.taskId,
        year: initialValues?.year ?? currentYear,
        weekNumber: initialValues?.weekNumber ?? 1,
        plannedDays: initialValues?.plannedDays ?? 0,
        weekdays: selectedWeekdays,
      }}
      onFinish={(values) => {
        const weekdays = new Set(values.weekdays ?? []);
        return onSubmit({
          taskId: values.taskId,
          year: values.year,
          weekNumber: values.weekNumber,
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

      <Form.Item label="所属任务" name="taskId" rules={[{ required: true, message: "请选择任务" }]}>
        <Select
          placeholder="请选择任务"
          options={filteredTaskOptions.map((task) => ({
            label: task.name,
            value: task.id,
          }))}
        />
      </Form.Item>

      <Space style={{ width: "100%" }} size={12}>
        <Form.Item
          label="年份"
          name="year"
          rules={[{ required: true, message: "请输入年份" }]}
          style={{ flex: 1 }}
        >
          <InputNumber style={{ width: "100%" }} min={2000} max={2100} precision={0} />
        </Form.Item>
        <Form.Item
          label="周数"
          name="weekNumber"
          rules={[{ required: true, message: "请输入周数" }]}
          style={{ flex: 1 }}
        >
          <InputNumber style={{ width: "100%" }} min={1} max={53} precision={0} />
        </Form.Item>
      </Space>

      <Form.Item
        label="工时(天)"
        name="plannedDays"
        rules={[{ required: true, message: "请输入工时" }]}
      >
        <InputNumber style={{ width: "100%" }} min={0} step={0.5} />
      </Form.Item>

      <Form.Item
        label="工作日"
        name="weekdays"
        rules={[{ required: true, message: "请至少选择一个工作日", type: "array", min: 1 }]}
      >
        <Checkbox.Group options={weekdayOptions} />
      </Form.Item>

      <Button type="primary" htmlType="submit" block>
        保存
      </Button>
    </Form>
  );
};

export default PlannedWorkEntryForm;
