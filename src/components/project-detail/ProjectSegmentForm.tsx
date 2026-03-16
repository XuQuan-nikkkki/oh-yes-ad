// @ts-nocheck
"use client";

import { useEffect, useMemo } from "react";
import { Button, ConfigProvider, DatePicker, Form, Input, Select } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

export type ProjectSegmentFormPayload = {
  name: string;
  projectId?: string;
  status?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
};

type FormValues = {
  name: string;
  projectId?: string;
  status?: SelectOptionSelectorValue;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type InitialValues = {
  id?: string;
  name?: string;
  status?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
  dueDate?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
} | null;

type Props = {
  initialValues?: InitialValues;
  projectOptions?: ProjectOption[];
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
  employees?: EmployeeOption[];
  onSubmit: (payload: ProjectSegmentFormPayload) => Promise<void> | void;
};

const ProjectSegmentForm = ({
  initialValues,
  projectOptions = [],
  selectedProjectId,
  disableProjectSelect = false,
  employees = [],
  onSubmit,
}: Props) => {
  dayjs.locale("zh-cn");
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = useMemo(
    () => optionsByField["projectSegment.status"] ?? [],
    [optionsByField],
  );

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

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
          projectId: selectedProjectId ?? initialValues?.project?.id,
          status:
            initialValues?.statusOption?.value ?? initialValues?.status ?? undefined,
          ownerId: initialValues?.owner?.id,
          dueDate: initialValues?.dueDate ? dayjs(initialValues.dueDate) : undefined,
        }}
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            projectId: values.projectId,
            status: values.status ?? null,
            ownerId: values.ownerId ?? null,
            dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          })
        }
      >
        <Form.Item label="环节名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}>
          <Select
            disabled={disableProjectSelect}
            options={projectOptions.map((project) => ({
              label: project.name,
              value: project.id,
            }))}
            placeholder="请选择所属项目"
          />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <SelectOptionSelector
            placeholder="请选择或新增状态"
            options={statusOptions.map((item) => ({
              label: item.value,
              value: item.value,
              color: item.color ?? "#d9d9d9",
            }))}
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
