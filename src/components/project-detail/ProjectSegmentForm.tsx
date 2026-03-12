"use client";

import { Button, ConfigProvider, DatePicker, Form, Input, Select } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import type { ProjectSegmentRow } from "@/components/project-detail/ProjectSegmentsTable";

export type ProjectSegmentFormPayload = {
  name: string;
  status?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
};

type FormValues = {
  name: string;
  status?: string[];
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type Props = {
  initialValues?: ProjectSegmentRow | null;
  employees?: EmployeeOption[];
  onSubmit: (payload: ProjectSegmentFormPayload) => Promise<void> | void;
};

const ProjectSegmentForm = ({ initialValues, employees = [], onSubmit }: Props) => {
  dayjs.locale("zh-cn");

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
    <ConfigProvider locale={zhCN}>
      <Form<FormValues>
        key={initialValues?.id || "new"}
        layout="vertical"
        initialValues={{
          name: initialValues?.name,
          status: initialValues?.status ? [initialValues.status] : [],
          ownerId: initialValues?.owner?.id,
          dueDate: initialValues?.dueDate ? dayjs(initialValues.dueDate) : undefined,
        }}
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            status: values.status?.[0] ?? null,
            ownerId: values.ownerId ?? null,
            dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          })
        }
      >
        <Form.Item label="环节名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select
            mode="tags"
            maxCount={1}
            placeholder="选择或输入状态"
            options={[
              { label: "待开始", value: "待开始" },
              { label: "进行中", value: "进行中" },
              { label: "已完成", value: "已完成" },
              { label: "已阻塞", value: "已阻塞" },
            ]}
            allowClear
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
    </ConfigProvider>
  );
};

export default ProjectSegmentForm;
