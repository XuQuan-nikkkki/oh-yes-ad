"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Col, ConfigProvider, DatePicker, Form, Input, Row, Select } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { DEFAULT_COLOR } from "@/lib/constants";
import {
  buildEmployeeLabelMap,
  buildGroupedEmployeeOptions,
  isEmployeeActive,
  renderEmployeeSelectedLabel,
} from "@/lib/employee-select";

const DEFAULT_PROJECT_SEGMENT_STATUS = "待启动";
const EMPTY_PROJECT_OPTIONS: ProjectOption[] = [];
const EMPTY_EMPLOYEE_OPTIONS: EmployeeOption[] = [];

const isSameEmployeeList = (
  left: EmployeeOption[],
  right: EmployeeOption[],
) =>
  left.length === right.length &&
  left.every(
    (item, index) =>
      item.id === right[index]?.id &&
      item.name === right[index]?.name &&
      item.employmentStatus === right[index]?.employmentStatus,
  );

export type ProjectSegmentFormPayload = {
  name: string;
  projectId?: string;
  status?: SelectOptionSelectorValue | null;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type FormValues = {
  name: string;
  projectId?: string;
  status?: SelectOptionSelectorValue | null;
  ownerId?: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
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
  startDate?: string | null;
  endDate?: string | null;
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
  projectMembers?: EmployeeOption[];
  onSubmit: (payload: ProjectSegmentFormPayload) => Promise<void> | void;
};

const ProjectSegmentForm = ({
  initialValues,
  projectOptions = EMPTY_PROJECT_OPTIONS,
  selectedProjectId,
  disableProjectSelect = false,
  employees = EMPTY_EMPLOYEE_OPTIONS,
  projectMembers = EMPTY_EMPLOYEE_OPTIONS,
  onSubmit,
}: Props) => {
  const normalizeSelectValue = (
    value?: SelectOptionSelectorValue | null,
  ): SelectOptionSelectorValue | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    return {
      ...value,
      color: value.color ?? DEFAULT_COLOR,
    };
  };

  dayjs.locale("zh-cn");
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = useMemo(
    () => optionsByField["projectSegment.status"] ?? [],
    [optionsByField],
  );
  const [form] = Form.useForm<FormValues>();
  const watchedProjectId = Form.useWatch("projectId", form);
  const [fetchedProjectMembers, setFetchedProjectMembers] = useState<EmployeeOption[]>(
    EMPTY_EMPLOYEE_OPTIONS,
  );
  const baseProjectId = selectedProjectId ?? initialValues?.project?.id;
  const activeProjectId = watchedProjectId ?? baseProjectId;
  const directProjectMembers =
    activeProjectId && projectMembers.length > 0 && activeProjectId === baseProjectId
      ? projectMembers
      : null;

  useEffect(() => {
    void useSelectOptionsStore.getState().fetchAllOptions();
  }, []);

  useEffect(() => {
    if (!activeProjectId || directProjectMembers) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/projects/${activeProjectId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (!cancelled) {
          setFetchedProjectMembers(EMPTY_EMPLOYEE_OPTIONS);
        }
        return;
      }
      const data = (await response.json()) as {
        members?: EmployeeOption[];
      } | null;
      if (cancelled) return;
      const nextMembers = Array.isArray(data?.members) ? data.members : EMPTY_EMPLOYEE_OPTIONS;
      setFetchedProjectMembers((previous) =>
        isSameEmployeeList(previous, nextMembers) ? previous : nextMembers,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, directProjectMembers]);

  const resolvedProjectMembers = directProjectMembers ?? (activeProjectId ? fetchedProjectMembers : EMPTY_EMPLOYEE_OPTIONS);

  const activeEmployees = useMemo(
    () => employees.filter(isEmployeeActive),
    [employees],
  );
  const ownerOptions = useMemo(
    () =>
      buildGroupedEmployeeOptions(
        activeEmployees,
        resolvedProjectMembers.filter(isEmployeeActive).map((member) => member.id),
      ),
    [activeEmployees, resolvedProjectMembers],
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
      <Form<FormValues>
        form={form}
        key={initialValues?.id || "new"}
        layout="vertical"
        initialValues={{
          name: initialValues?.name,
          projectId: selectedProjectId ?? initialValues?.project?.id,
          status:
            initialValues?.statusOption?.value ??
            initialValues?.status ??
            DEFAULT_PROJECT_SEGMENT_STATUS,
          ownerId: initialValues?.owner?.id,
          startDate: initialValues?.startDate ? dayjs(initialValues.startDate) : undefined,
          endDate: initialValues?.endDate
            ? dayjs(initialValues.endDate)
            : initialValues?.dueDate
              ? dayjs(initialValues.dueDate)
              : undefined,
        }}
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            projectId: values.projectId,
            status: normalizeSelectValue(values.status),
            ownerId: values.ownerId ?? null,
            startDate: values.startDate ? values.startDate.toISOString() : null,
            endDate: values.endDate ? values.endDate.toISOString() : null,
          })
        }
      >
        <Row gutter={16}>
          <Col span={12}>
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
          </Col>
          <Col span={12}>
            <Form.Item label="环节名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="环节状态" name="status" rules={[{ required: true, message: "请选择状态" }]}>
              <SelectOptionSelector
                placeholder="请选择或新增状态"
                options={statusOptions.map((item) => ({
                  label: item.value,
                  value: item.value,
                  color: item.color ?? DEFAULT_COLOR,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="负责人" name="ownerId">
              <Select
                allowClear
                placeholder="选择负责人"
                options={ownerOptions}
                labelRender={renderEmployeeSelectedLabel(ownerLabelMap)}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="开始时间" name="startDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="结束时间" name="endDate">
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

export default ProjectSegmentForm;
