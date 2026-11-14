"use client";

import { useEffect } from "react";
import { StepsForm } from "@ant-design/pro-components";
import { Checkbox, Col, DatePicker, Form, Input, Row, Select, Space } from "antd";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import type { ProjectMilestoneRow } from "@/components/project-detail/ProjectMilestonesTable";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useSubmitLock } from "@/hooks/useSubmitLock";

export type ProjectMilestoneFormPayload = {
  name: string;
  projectId?: string;
  type?: SelectOptionSelectorValue;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME";
  location?: string;
  detail?: string;
  method?: SelectOptionSelectorValue;
  internalParticipantIds: string[];
  clientParticipantIds: string[];
  vendorParticipantIds: string[];
};

type FormValues = {
  name: string;
  projectId?: string;
  type?: SelectOptionSelectorValue;
  includeTime?: boolean;
  isRange?: boolean;
  startAt?: dayjs.Dayjs;
  endAt?: dayjs.Dayjs;
  location?: string;
  detail?: string;
  method?: SelectOptionSelectorValue;
  internalParticipantIds: string[];
  clientParticipantIds: string[];
  vendorParticipantIds: string[];
};

type Option = {
  id: string;
  name: string;
  function?: string | null;
  functionOption?: { value?: string | null } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: { value?: string | null } | null;
};

type ProjectOption = {
  id: string;
  name: string;
};

type Props = {
  initialValues?: ProjectMilestoneRow | null;
  projectMembers: Option[];
  allEmployees: Option[];
  clientParticipants: Option[];
  vendors: Option[];
  projectOptions?: ProjectOption[];
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
  onProjectChange?: (projectId?: string) => void;
  onSubmit: (payload: ProjectMilestoneFormPayload) => Promise<void> | void;
};

const InternalParticipantSelect = ({
  projectMembers,
  allEmployees,
  selectedInitialMembers,
  value,
  onChange,
}: {
  projectMembers: Option[];
  allEmployees: Option[];
  selectedInitialMembers: Option[];
  value?: string[];
  onChange?: (value: string[]) => void;
}) => {
  const selectedIds = value ?? selectedInitialMembers.map((item) => item.id);
  const selectedIdSet = new Set(selectedIds);
  const employeeById = new Map<string, Option>();
  [...projectMembers, ...selectedInitialMembers, ...allEmployees].forEach((item) => {
    const previous = employeeById.get(item.id);
    employeeById.set(item.id, {
      ...previous,
      ...item,
      function: item.function ?? previous?.function,
      functionOption: item.functionOption ?? previous?.functionOption,
      employmentStatus: item.employmentStatus ?? previous?.employmentStatus,
      employmentStatusOption:
        item.employmentStatusOption ?? previous?.employmentStatusOption,
    });
  });

  const groups = new Map<string, Array<{ label: string; value: string }>>();
  employeeById.forEach((employee) => {
    const status =
      employee.employmentStatusOption?.value ?? employee.employmentStatus;
    if (status === "离职" && !selectedIdSet.has(employee.id)) return;
    const functionName =
      employee.functionOption?.value?.trim() ||
      employee.function?.trim() ||
      "未设置职能";
    const options = groups.get(functionName) ?? [];
    options.push({ label: employee.name, value: employee.id });
    groups.set(functionName, options);
  });

  const options = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([label, members]) => ({
      label,
      options: members.sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    }));

  return (
    <Select
      mode="multiple"
      allowClear
      placeholder="请选择项目人员"
      options={options}
      value={value}
      onChange={onChange}
      showSearch
      optionFilterProp="label"
    />
  );
};

const ProjectMilestoneForm = ({
  initialValues,
  projectMembers,
  allEmployees,
  clientParticipants,
  vendors,
  projectOptions = [],
  selectedProjectId,
  disableProjectSelect = false,
  onProjectChange,
  onSubmit,
}: Props) => {
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectMilestone.type"] ?? [];
  const methodOptions = optionsByField["projectMilestone.method"] ?? [];

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  const selectedInternalMembers = initialValues?.internalParticipants ?? [];

  const startRaw = initialValues?.startAt ?? initialValues?.date ?? null;
  const endRaw = initialValues?.endAt ?? null;
  const includeTime = initialValues?.datePrecision === "DATETIME";
  const rangeValue =
    Boolean(startRaw && endRaw) &&
    dayjs(startRaw).valueOf() !== dayjs(endRaw).valueOf();

  return (
    <StepsForm<FormValues>
      key={initialValues?.id || "new"}
      onFinish={async (values) => {
        const result = await runWithSubmitLock(async () => {
          const end =
            values.isRange &&
            values.endAt &&
            !(
              values.startAt &&
              values.startAt.valueOf() === values.endAt.valueOf()
            )
              ? values.endAt
              : null;
          const toPayloadDate = (value?: dayjs.Dayjs | string | null) => {
            if (!value) return null;
            const d = dayjs.isDayjs(value) ? value : dayjs(value);
            return values.includeTime
              ? d.toISOString()
              : d.format("YYYY-MM-DD");
          };
          await onSubmit({
            name: values.name,
            projectId: values.projectId,
            type: values.type,
            startAt: toPayloadDate(values.startAt),
            endAt: toPayloadDate(end),
            datePrecision: values.includeTime ? "DATETIME" : "DATE",
            location: values.location,
            detail: values.detail,
            method: values.method,
            internalParticipantIds: values.internalParticipantIds ?? [],
            clientParticipantIds: values.clientParticipantIds ?? [],
            vendorParticipantIds: values.vendorParticipantIds ?? [],
          });
          return true;
        });
        return result ?? false;
      }}
      submitter={{
        searchConfig: {
          submitText: "保存",
        },
        submitButtonProps: {
          loading: submitting,
          disabled: submitting,
        },
      }}
      formProps={{
        layout: "vertical",
        initialValues: {
          name: initialValues?.name,
          projectId:
            selectedProjectId ??
            initialValues?.projectId ??
            initialValues?.project?.id ??
            undefined,
          type: initialValues?.type ?? undefined,
          includeTime,
          isRange: rangeValue,
          startAt: startRaw ? dayjs(startRaw) : undefined,
          endAt: endRaw ? dayjs(endRaw) : undefined,
          location: initialValues?.location ?? undefined,
          detail: initialValues?.detail ?? undefined,
          method: initialValues?.method ?? undefined,
          internalParticipantIds:
            initialValues?.internalParticipants?.map((item) => item.id) ?? [],
          clientParticipantIds:
            initialValues?.clientParticipants?.map((item) => item.id) ?? [],
          vendorParticipantIds:
            initialValues?.vendorParticipants?.map((item) => item.id) ?? [],
        },
      }}
    >
      <StepsForm.StepForm
        title="基础信息"
        onValuesChange={(changedValues, allValues) => {
          if ("isRange" in changedValues && !allValues.isRange) {
            allValues.endAt = undefined;
          }
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="所属项目"
              name="projectId"
              rules={[{ required: true, message: "请选择所属项目" }]}
            >
              <Select
                disabled={disableProjectSelect}
                options={projectOptions.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
                placeholder="请选择所属项目"
                onChange={(value) => {
                  onProjectChange?.(value ? String(value) : undefined);
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="类型"
              name="type"
              rules={[{ required: true, message: "请选择类型" }]}
            >
              <SelectOptionSelector
                placeholder="请选择或新增类型"
                options={typeOptions.map((item) => ({
                  label: item.value,
                  value: item.value,
                  color: item.color ?? DEFAULT_COLOR,
                }))}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="方式" name="method">
              <SelectOptionSelector
                placeholder="请选择或新增方式"
                options={methodOptions.map((item) => ({
                  label: item.value,
                  value: item.value,
                  color: item.color ?? DEFAULT_COLOR,
                }))}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="地点" name="location">
          <Input />
        </Form.Item>

        <Form.Item label="详情" name="detail">
          <Input.TextArea rows={2} allowClear />
        </Form.Item>

        <Form.Item label="时间类型" style={{ marginBottom: 24 }}>
          <Space style={{ paddingTop: 4 }}>
            <Form.Item name="includeTime" valuePropName="checked" noStyle>
              <Checkbox>包含时间</Checkbox>
            </Form.Item>
            <Form.Item name="isRange" valuePropName="checked" noStyle>
              <Checkbox>时间段</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, next) =>
            prev.includeTime !== next.includeTime || prev.isRange !== next.isRange
          }
        >
          {({ getFieldValue }) => {
            const includeTimeValue = Boolean(getFieldValue("includeTime"));
            const isRangeValue = Boolean(getFieldValue("isRange"));
            const format = includeTimeValue ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD";
            return (
              <Row gutter={16}>
                <Col span={isRangeValue ? 12 : 24}>
                  <Form.Item
                    label={isRangeValue ? "开始" : "时间"}
                    name="startAt"
                    rules={[
                      {
                        required: true,
                        message: isRangeValue ? "请选择开始时间" : "请选择时间",
                      },
                    ]}
                  >
                    <DatePicker
                      showTime={includeTimeValue}
                      format={format}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                {isRangeValue ? (
                  <Col span={12}>
                    <Form.Item
                      label="结束"
                      name="endAt"
                      rules={[
                        { required: true, message: "请选择结束时间" },
                        ({ getFieldValue }) => ({
                          validator(_, value: dayjs.Dayjs | undefined) {
                            const startAtValue = getFieldValue("startAt") as
                              | dayjs.Dayjs
                              | undefined;
                            if (
                              !value ||
                              !startAtValue ||
                              !value.isBefore(startAtValue)
                            ) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error("结束时间不能早于开始时间"),
                            );
                          },
                        }),
                      ]}
                    >
                      <DatePicker
                        showTime={includeTimeValue}
                        format={format}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                ) : null}
              </Row>
            );
          }}
        </Form.Item>

      </StepsForm.StepForm>

      <StepsForm.StepForm title="参与人员">
        <Form.Item label="项目人员" name="internalParticipantIds">
          <InternalParticipantSelect
            projectMembers={projectMembers}
            allEmployees={allEmployees}
            selectedInitialMembers={selectedInternalMembers}
          />
        </Form.Item>
        <Form.Item label="客户人员" name="clientParticipantIds">
          <Select
            mode="multiple"
            allowClear
            placeholder="请选择客户人员"
            options={clientParticipants.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
        <Form.Item label="供应商" name="vendorParticipantIds">
          <Select
            mode="multiple"
            allowClear
            placeholder="请选择供应商"
            options={vendors.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
      </StepsForm.StepForm>
    </StepsForm>
  );
};

export default ProjectMilestoneForm;
