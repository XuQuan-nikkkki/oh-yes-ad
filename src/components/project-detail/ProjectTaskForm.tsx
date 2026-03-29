"use client";

import { useEffect, useMemo } from "react";
import { Button, Col, ConfigProvider, DatePicker, Form, Input, Row, Select } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import {
  DEFAULT_COLOR,
  DEFAULT_PROJECT_TASK_STATUS,
  PROJECT_TASK_STATUS_FIELD,
} from "@/lib/constants";
import {
  buildEmployeeLabelMap,
  buildGroupedEmployeeOptions,
  isEmployeeActive,
  renderEmployeeSelectedLabel,
} from "@/lib/employee-select";

export type ProjectTaskFormPayload = {
  name: string;
  segmentId: string;
  status: SelectOptionSelectorValue;
  ownerId?: string | null;
  dueDate?: string | null;
};

type FormValues = {
  name: string;
  segmentId: string;
  status: SelectOptionSelectorValue;
  ownerId?: string;
  dueDate?: dayjs.Dayjs;
};

type SegmentOption = {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  employmentStatus?: string | null;
  employmentStatusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type InitialValues = {
  id?: string;
  name?: string;
  segmentId?: string;
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
} | null;

type Props = {
  segmentOptions: SegmentOption[];
  defaultSegmentId?: string;
  disableProjectSelect?: boolean;
  disableSegmentSelect?: boolean;
  employees?: EmployeeOption[];
  projectMembers?: EmployeeOption[];
  initialValues?: InitialValues;
  onSubmit: (payload: ProjectTaskFormPayload) => Promise<void> | void;
};

const toIsoDateTimeOrNull = (value?: dayjs.Dayjs | string | Date | null) => {
  if (!value) return null;
  const normalized = dayjs.isDayjs(value) ? value : dayjs(value);
  return normalized.isValid() ? normalized.toISOString() : null;
};

const ProjectTaskForm = ({
  segmentOptions,
  defaultSegmentId,
  disableProjectSelect = false,
  disableSegmentSelect = false,
  employees = [],
  projectMembers = [],
  initialValues,
  onSubmit,
}: Props) => {
  dayjs.locale("zh-cn");
  const [form] = Form.useForm<FormValues & { projectId?: string }>();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = useMemo(
    () => optionsByField[PROJECT_TASK_STATUS_FIELD] ?? [],
    [optionsByField],
  );

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  const activeEmployees = useMemo(
    () => employees.filter(isEmployeeActive),
    [employees],
  );
  const initialSegmentId = initialValues?.segmentId ?? defaultSegmentId;
  const initialProjectId = segmentOptions.find(
    (segment) => segment.id === initialSegmentId,
  )?.projectId;
  const projectOptions = useMemo(
    () =>
      Array.from(
        segmentOptions.reduce<Map<string, { label: string; value: string }>>(
          (map, segment) => {
            if (!segment.projectId || !segment.projectName) return map;
            if (!map.has(segment.projectId)) {
              map.set(segment.projectId, {
                label: segment.projectName,
                value: segment.projectId,
              });
            }
            return map;
          },
          new Map(),
        ).values(),
      ).sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    [segmentOptions],
  );
  const selectedProjectId = Form.useWatch("projectId", form) as string | undefined;
  const visibleSegmentOptions = useMemo(
    () =>
      segmentOptions
        .filter((segment) =>
          selectedProjectId ? segment.projectId === selectedProjectId : true,
        )
        .map((segment) => ({
          label: segment.name,
          value: segment.id,
        })),
    [segmentOptions, selectedProjectId],
  );
  const ownerOptions = useMemo(
    () =>
      buildGroupedEmployeeOptions(
        activeEmployees,
        projectMembers.filter(isEmployeeActive).map((member) => member.id),
      ),
    [activeEmployees, projectMembers],
  );
  const ownerLabelMap = useMemo(
    () =>
      buildEmployeeLabelMap(employees, [
        {
          id: initialValues?.owner?.id,
          name: initialValues?.owner?.name,
        },
      ]),
    [employees, initialValues?.owner?.id, initialValues?.owner?.name],
  );

  return (
    <ConfigProvider locale={zhCN}>
      <Form<FormValues & { projectId?: string }>
        form={form}
        key={initialValues?.id || "new"}
        layout="vertical"
        initialValues={{
          projectId: initialProjectId,
          name: initialValues?.name,
          segmentId: initialValues?.segmentId ?? defaultSegmentId,
          status:
            initialValues?.statusOption?.value ??
            initialValues?.status ??
            DEFAULT_PROJECT_TASK_STATUS,
          ownerId: initialValues?.owner?.id,
          dueDate: initialValues?.dueDate
            ? dayjs(initialValues.dueDate)
            : undefined,
        }}
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            segmentId: values.segmentId,
            status: values.status ?? DEFAULT_PROJECT_TASK_STATUS,
            ownerId: values.ownerId ?? null,
            dueDate: toIsoDateTimeOrNull(values.dueDate),
          })
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="所属项目"
              name="projectId"
              rules={[{ required: true, message: "请选择所属项目" }]}
            >
              <Select
                disabled={disableProjectSelect}
                options={projectOptions}
                placeholder="请选择所属项目"
                onChange={() => {
                  form.setFieldValue("segmentId", undefined);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="所属环节"
              name="segmentId"
              rules={[{ required: true, message: "请选择所属环节" }]}
            >
              <Select
                disabled={disableSegmentSelect}
                options={visibleSegmentOptions}
                placeholder="请选择所属环节"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="任务状态" name="status" rules={[{ required: true }]}>
              <SelectOptionSelector
                placeholder="请选择或新增状态"
                allowClear={false}
                options={statusOptions.map((item) => ({
                  label: item.value,
                  value: item.value,
                  color: item.color ?? DEFAULT_COLOR,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="负责人"
              name="ownerId"
              rules={[{ required: true, message: "请选择负责人" }]}
            >
              <Select
                placeholder="选择负责人"
                options={ownerOptions}
                showSearch
                optionFilterProp="label"
                labelRender={renderEmployeeSelectedLabel(ownerLabelMap)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="截止日期" name="dueDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </ConfigProvider>
  );
};

export default ProjectTaskForm;
