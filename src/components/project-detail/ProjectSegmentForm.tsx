"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ConfigProvider, DatePicker, Form, Input, Select } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { DEFAULT_COLOR } from "@/lib/constants";

const DEFAULT_PROJECT_SEGMENT_STATUS = "待启动";

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
  projectOptions = [],
  selectedProjectId,
  disableProjectSelect = false,
  employees = [],
  projectMembers = [],
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
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const statusOptions = useMemo(
    () => optionsByField["projectSegment.status"] ?? [],
    [optionsByField],
  );
  const [form] = Form.useForm<FormValues>();
  const watchedProjectId = Form.useWatch("projectId", form);
  const [resolvedProjectMembers, setResolvedProjectMembers] = useState<EmployeeOption[]>(projectMembers);

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  useEffect(() => {
    setResolvedProjectMembers(projectMembers);
  }, [projectMembers]);

  useEffect(() => {
    const activeProjectId =
      watchedProjectId ?? selectedProjectId ?? initialValues?.project?.id;
    if (!activeProjectId) {
      setResolvedProjectMembers([]);
      return;
    }
    if (
      projectMembers.length > 0 &&
      activeProjectId === (selectedProjectId ?? initialValues?.project?.id)
    ) {
      setResolvedProjectMembers(projectMembers);
      return;
    }

    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/projects/${activeProjectId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (!cancelled) {
          setResolvedProjectMembers([]);
        }
        return;
      }
      const data = (await response.json()) as {
        members?: EmployeeOption[];
      } | null;
      if (cancelled) return;
      setResolvedProjectMembers(Array.isArray(data?.members) ? data.members : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialValues?.project?.id, projectMembers, selectedProjectId, watchedProjectId]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.employmentStatus !== "离职"),
    [employees],
  );

  const ownerOptions = useMemo(() => {
    const projectMemberIdSet = new Set(
      resolvedProjectMembers
        .filter((member) => member.employmentStatus !== "离职")
        .map((member) => member.id),
    );

    const projectInsideOptions = activeEmployees
      .filter((employee) => projectMemberIdSet.has(employee.id))
      .map((employee) => ({
        label: employee.name,
        value: employee.id,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));

    const projectOutsideOptions = activeEmployees
      .filter((employee) => !projectMemberIdSet.has(employee.id))
      .map((employee) => ({
        label: employee.name,
        value: employee.id,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));

    return [
      {
        label: "项目内",
        options: projectInsideOptions,
      },
      {
        label: "项目外",
        options: projectOutsideOptions,
      },
    ].filter((group) => group.options.length > 0);
  }, [activeEmployees, resolvedProjectMembers]);

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
        <Form.Item label="状态" name="status" rules={[{ required: true, message: "请选择状态" }]}>
          <SelectOptionSelector
            placeholder="请选择或新增状态"
            options={statusOptions.map((item) => ({
              label: item.value,
              value: item.value,
              color: item.color ?? DEFAULT_COLOR,
            }))}
          />
        </Form.Item>
        <Form.Item label="负责人" name="ownerId">
          <Select
            allowClear
            placeholder="选择负责人"
            options={ownerOptions}
          />
        </Form.Item>
        <Form.Item label="开始日期" name="startDate">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="结束日期" name="endDate">
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
