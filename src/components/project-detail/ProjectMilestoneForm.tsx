// @ts-nocheck
"use client";

import { useEffect } from "react";
import { StepsForm } from "@ant-design/pro-components";
import { Checkbox, DatePicker, Form, Input, Select, Space } from "antd";
import dayjs from "dayjs";
import type { ProjectMilestoneRow } from "@/components/project-detail/ProjectMilestonesTable";
import SelectOptionSelector, {
  type SelectOptionSelectorValue,
} from "@/components/SelectOptionSelector";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

export type ProjectMilestoneFormPayload = {
  name: string;
  projectId?: string;
  type?: SelectOptionSelectorValue;
  startAt?: string | null;
  endAt?: string | null;
  datePrecision?: "DATE" | "DATETIME";
  location?: string;
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
  method?: SelectOptionSelectorValue;
  internalParticipantIds: string[];
  clientParticipantIds: string[];
  vendorParticipantIds: string[];
};

type Option = {
  id: string;
  name: string;
  employmentStatus?: string;
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
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectMilestone.type"] ?? [];
  const methodOptions = optionsByField["projectMilestone.method"] ?? [];

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  const selectedInternalMembers = initialValues?.internalParticipants ?? [];
  const selectedInternalIdSet = new Set(selectedInternalMembers.map((item) => item.id));
  const projectMemberIdSet = new Set(projectMembers.map((item) => item.id));

  const labelMap = new Map<string, string>();
  projectMembers.forEach((item) => labelMap.set(item.id, item.name));
  allEmployees.forEach((item) => labelMap.set(item.id, item.name));
  selectedInternalMembers.forEach((item) => labelMap.set(item.id, item.name));

  const activeEmployees = allEmployees.filter(
    (item) => item.employmentStatus !== "离职",
  );

  const projectGroupIds = new Set<string>();
  const nonProjectGroupIds = new Set<string>();

  activeEmployees.forEach((item) => {
    if (projectMemberIdSet.has(item.id)) {
      projectGroupIds.add(item.id);
      return;
    }
    nonProjectGroupIds.add(item.id);
  });

  selectedInternalIdSet.forEach((id) => {
    if (projectMemberIdSet.has(id)) {
      projectGroupIds.add(id);
      return;
    }
    nonProjectGroupIds.add(id);
  });

  const toSortedOptions = (ids: Set<string>) =>
    Array.from(ids)
      .map((id) => ({
        value: id,
        label: labelMap.get(id) ?? id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));

  const internalParticipantOptions = [
    {
      label: "项目成员",
      options: toSortedOptions(projectGroupIds),
    },
    {
      label: "非项目成员",
      options: toSortedOptions(nonProjectGroupIds),
    },
  ].filter((group) => group.options.length > 0);

  const startRaw = initialValues?.startAt ?? initialValues?.date ?? null;
  const endRaw = initialValues?.endAt ?? null;
  const includeTime = initialValues?.datePrecision === "DATETIME";
  const rangeValue =
    Boolean(startRaw && endRaw) &&
    dayjs(startRaw).valueOf() !== dayjs(endRaw).valueOf();

  return (
    <StepsForm<FormValues>
      key={initialValues?.id || selectedProjectId || "new"}
      onFinish={async (values) => {
        const end =
          values.isRange &&
          values.endAt &&
          !(
            values.startAt &&
            values.startAt.valueOf() === values.endAt.valueOf()
          )
            ? values.endAt
            : null;
        const toPayloadDate = (value?: dayjs.Dayjs | null) => {
          if (!value) return null;
          return values.includeTime
            ? value.toISOString()
            : value.format("YYYY-MM-DD");
        };
        await onSubmit({
          name: values.name,
          projectId: values.projectId,
          type: values.type,
          startAt: toPayloadDate(values.startAt),
          endAt: toPayloadDate(end),
          datePrecision: values.includeTime ? "DATETIME" : "DATE",
          location: values.location,
          method: values.method,
          internalParticipantIds: values.internalParticipantIds ?? [],
          clientParticipantIds: values.clientParticipantIds ?? [],
          vendorParticipantIds: values.vendorParticipantIds ?? [],
        });
        return true;
      }}
      submitter={{
        searchConfig: {
          submitText: "保存",
        },
      }}
      formProps={{
        layout: "vertical",
        initialValues: {
          name: initialValues?.name,
          projectId:
            selectedProjectId ?? initialValues?.project?.id ?? undefined,
          type: initialValues?.type ?? undefined,
          includeTime,
          isRange: rangeValue,
          startAt: startRaw ? dayjs(startRaw) : undefined,
          endAt: endRaw ? dayjs(endRaw) : undefined,
          location: initialValues?.location ?? undefined,
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
        <Form.Item label="名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
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
              color: item.color ?? "#d9d9d9",
            }))}
          />
        </Form.Item>
        <Space style={{ marginBottom: 12 }}>
          <Form.Item name="includeTime" valuePropName="checked" noStyle>
            <Checkbox>包含时间</Checkbox>
          </Form.Item>
          <Form.Item name="isRange" valuePropName="checked" noStyle>
            <Checkbox>时间段</Checkbox>
          </Form.Item>
        </Space>
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
              <>
                <Form.Item
                  label="时间"
                  name="startAt"
                  rules={[{ required: true, message: "请选择时间" }]}
                >
                  <DatePicker
                    showTime={includeTimeValue}
                    format={format}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                {isRangeValue ? (
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
                            new Error("结束时间不能早于时间"),
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
                ) : null}
              </>
            );
          }}
        </Form.Item>
      </StepsForm.StepForm>

      <StepsForm.StepForm title="补充信息">
        <Form.Item label="方式" name="method">
          <SelectOptionSelector
            placeholder="请选择或新增方式"
            options={methodOptions.map((item) => ({
              label: item.value,
              value: item.value,
              color: item.color ?? "#d9d9d9",
            }))}
          />
        </Form.Item>
        <Form.Item label="地点" name="location">
          <Input />
        </Form.Item>
      </StepsForm.StepForm>

      <StepsForm.StepForm title="参与人员">
        <Form.Item label="项目人员" name="internalParticipantIds">
          <Select
            mode="multiple"
            allowClear
            placeholder="请选择项目人员"
            options={internalParticipantOptions}
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
