"use client";

import type { ReactNode } from "react";
import { Button, DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";
import type { DefaultOptionType } from "antd/es/select";
import { useAuthStore } from "@/stores/authStore";
import { useSubmitLock } from "@/hooks/useSubmitLock";

export type ActualWorkEntryFormPayload = {
  projectId: string;
  title: string;
  employeeId: string;
  startDate: string;
  endDate: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string | null;
};

type ProjectOption = {
  id: string;
  name: string;
};
type ProjectOptionEntry = DefaultOptionType;

type InitialValues = ActualWorkEntryFormPayload & {
  id: string;
};

type FormValues = {
  projectId: string;
  title: string;
  employeeId: string;
  timeRange: [dayjs.Dayjs, dayjs.Dayjs];
};

type Props = {
  projectOptions: ProjectOption[];
  projectOptionGroups?: ProjectOptionEntry[];
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
  disableEmployeeSelect?: boolean;
  employees: EmployeeOption[];
  initialValues?: InitialValues | null;
  onSubmit: (payload: ActualWorkEntryFormPayload) => Promise<void> | void;
  extraActions?: ReactNode;
  submitBlock?: boolean;
};

const ActualWorkEntryForm = ({
  projectOptions,
  projectOptionGroups,
  selectedProjectId,
  disableProjectSelect = false,
  employees,
  initialValues,
  onSubmit,
  extraActions,
  submitBlock = true,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const employeeOptions = employees
    .filter((employee) => employee.employmentStatus !== "离职")
    .map((employee) => ({ label: employee.name, value: employee.id }));
  const initialProjectId = selectedProjectId ?? initialValues?.projectId;
  const currentEmployeeId = currentUser?.id ?? "";
  const initialEmployeeId = initialValues?.employeeId ?? currentEmployeeId;
  const selectOptions: DefaultOptionType[] =
    projectOptionGroups && projectOptionGroups.length > 0
      ? projectOptionGroups
      : projectOptions.map((project) => ({
          label: project.name,
          value: project.id,
        }));

  return (
    <Form<FormValues>
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        projectId: initialProjectId,
        title: initialValues?.title,
        employeeId: initialEmployeeId,
        timeRange:
          initialValues?.startDate && initialValues?.endDate
            ? [dayjs(initialValues.startDate), dayjs(initialValues.endDate)]
            : undefined,
      }}
      onFinish={(values) =>
        runWithSubmitLock(async () => {
          const [startDate, endDate] = values.timeRange;
          await onSubmit({
            projectId: values.projectId,
            title: values.title,
            employeeId: values.employeeId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        })
      }
    >
      <Form.Item
        label="所属项目"
        name="projectId"
        rules={[{ required: true, message: "请选择项目" }]}
      >
        <Select
          disabled={disableProjectSelect}
          placeholder="请选择项目"
          options={selectOptions}
        />
      </Form.Item>
      <Form.Item label="事件" name="title" rules={[{ required: true, message: "请输入事件" }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="人员"
        name="employeeId"
        rules={[{ required: true, message: "请选择人员" }]}
      >
        <Select
          disabled
          placeholder="请选择人员"
          options={employeeOptions}
        />
      </Form.Item>
      <Form.Item
        label="时间范围"
        name="timeRange"
        rules={[
          { required: true, message: "请选择时间范围" },
          () => ({
            validator(_, value: [dayjs.Dayjs, dayjs.Dayjs] | undefined) {
              if (!value || value.length !== 2) {
                return Promise.resolve();
              }
              const [start, end] = value;
              if (end.isAfter(start) || end.isSame(start)) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("结束时间需晚于或等于开始时间"));
            },
          }),
        ]}
      >
        <DatePicker.RangePicker
          showTime
          style={{ width: "100%" }}
          format="YYYY-MM-DD HH:mm"
        />
      </Form.Item>

      <div style={{ display: "flex", gap: 12 }}>
        {extraActions}
        <Button
          type="primary"
          htmlType="submit"
          block={submitBlock}
          loading={submitting}
          disabled={submitting}
          style={submitBlock ? undefined : { flex: 1, width: "50%" }}
        >
          保存
        </Button>
      </div>
    </Form>
  );
};

export default ActualWorkEntryForm;
