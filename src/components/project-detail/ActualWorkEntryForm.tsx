"use client";

import { useMemo, type ReactNode } from "react";
import { Button, Form, Input, Select } from "antd";
import dayjs from "dayjs";
import type { DefaultOptionType } from "antd/es/select";
import { useAuthStore } from "@/stores/authStore";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import DateTimePicker from "@/components/DateTimePicker";

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
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
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
  const defaultStartDate = useMemo(
    () => dayjs().second(0).millisecond(0),
    [],
  );
  const defaultEndDate = useMemo(
    () => defaultStartDate.add(1, "hour"),
    [defaultStartDate],
  );
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
        startDate: initialValues?.startDate
          ? dayjs(initialValues.startDate)
          : defaultStartDate,
        endDate: initialValues?.endDate
          ? dayjs(initialValues.endDate)
          : defaultEndDate,
      }}
      onFinish={(values) =>
        runWithSubmitLock(async () => {
          const startDate = values.startDate as dayjs.Dayjs;
          const endDate = values.endDate as dayjs.Dayjs;
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
          showSearch
          optionFilterProp="label"
          filterOption={(input, option) => {
            if (Array.isArray((option as DefaultOptionType | undefined)?.options)) {
              return false;
            }
            return String(option?.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase());
          }}
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
        label="开始时间"
        name="startDate"
        rules={[
          { required: true, message: "请选择开始时间" },
        ]}
      >
        <DateTimePicker placeholder="请选择开始时间" />
      </Form.Item>
      <Form.Item
        label="结束时间"
        name="endDate"
        dependencies={["startDate"]}
        rules={[
          { required: true, message: "请选择结束时间" },
          ({ getFieldValue }) => ({
            validator(_, value: dayjs.Dayjs | undefined) {
              const start = getFieldValue("startDate") as dayjs.Dayjs | undefined;
              if (!value || !start) {
                return Promise.resolve();
              }
              if (value.isAfter(start) || value.isSame(start)) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("结束时间需晚于或等于开始时间"));
            },
          }),
        ]}
      >
        <DateTimePicker placeholder="请选择结束时间" />
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
