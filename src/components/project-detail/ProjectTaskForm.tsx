"use client";

import { Button, DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";
import type { ProjectTaskRow } from "@/components/project-detail/ProjectTasksTable";

export type ProjectTaskFormPayload = {
  name: string;
  segmentId: string;
  ownerId?: string | null;
  dueDate?: string | null;
};

type FormValues = {
  name: string;
  segmentId: string;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type SegmentOption = {
  id: string;
  name: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type Props = {
  segmentOptions: SegmentOption[];
  defaultSegmentId?: string;
  employees?: EmployeeOption[];
  initialValues?: ProjectTaskRow | null;
  onSubmit: (payload: ProjectTaskFormPayload) => Promise<void> | void;
};

const ProjectTaskForm = ({
  segmentOptions,
  defaultSegmentId,
  employees = [],
  initialValues,
  onSubmit,
}: Props) => {
  const ownerOptionMap = new Map<string, string>();
  employees.forEach((employee) => {
    if (employee.employmentStatus !== "离职") {
      ownerOptionMap.set(employee.id, employee.name);
    }
  });
  if (initialValues?.owner?.id && initialValues.owner.name) {
    ownerOptionMap.set(initialValues.owner.id, initialValues.owner.name);
  }

  return (
    <Form<FormValues>
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        name: initialValues?.name,
        segmentId: initialValues?.segmentId ?? defaultSegmentId,
        ownerId: initialValues?.owner?.id,
        dueDate: initialValues?.dueDate ? dayjs(initialValues.dueDate) : undefined,
      }}
      onFinish={(values) =>
        onSubmit({
          name: values.name,
          segmentId: values.segmentId,
          ownerId: values.ownerId ?? null,
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        })
      }
    >
      <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="所属环节" name="segmentId" rules={[{ required: true }]}>
        <Select
          options={segmentOptions.map((segment) => ({
            label: segment.name,
            value: segment.id,
          }))}
          placeholder="请选择所属环节"
        />
      </Form.Item>
      <Form.Item label="负责人" name="ownerId">
        <Select
          allowClear
          placeholder="选择负责人"
          options={Array.from(ownerOptionMap.entries()).map(([id, name]) => ({
            label: name,
            value: id,
          }))}
        />
      </Form.Item>
      <Form.Item label="截止日期" name="dueDate">
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Button type="primary" htmlType="submit" block>
        保存
      </Button>
    </Form>
  );
};

export default ProjectTaskForm;
