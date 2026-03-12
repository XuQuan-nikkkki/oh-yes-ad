"use client";

import { Button, DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";
import type { ProjectMilestoneRow } from "@/components/project-detail/ProjectMilestonesTable";

export type ProjectMilestoneFormPayload = {
  name: string;
  type?: string;
  date?: string | null;
  location?: string;
  method?: string;
  internalParticipantIds: string[];
  clientParticipantIds: string[];
  vendorParticipantIds: string[];
};

type FormValues = {
  name: string;
  type?: string;
  date?: dayjs.Dayjs;
  location?: string;
  method?: string;
  internalParticipantIds: string[];
  clientParticipantIds: string[];
  vendorParticipantIds: string[];
};

type Option = {
  id: string;
  name: string;
  employmentStatus?: string;
};

type Props = {
  initialValues?: ProjectMilestoneRow | null;
  projectMembers: Option[];
  allEmployees: Option[];
  clientParticipants: Option[];
  vendors: Option[];
  onSubmit: (payload: ProjectMilestoneFormPayload) => Promise<void> | void;
};

const ProjectMilestoneForm = ({
  initialValues,
  projectMembers,
  allEmployees,
  clientParticipants,
  vendors,
  onSubmit,
}: Props) => {
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

  // Keep historical selected values visible (e.g. resigned members),
  // so Select never falls back to raw UUID rendering.
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

  return (
    <Form<FormValues>
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        name: initialValues?.name,
        type: initialValues?.type ?? undefined,
        date: initialValues?.date ? dayjs(initialValues.date) : undefined,
        location: initialValues?.location ?? undefined,
        method: initialValues?.method ?? undefined,
        internalParticipantIds:
          initialValues?.internalParticipants?.map((item) => item.id) ?? [],
        clientParticipantIds:
          initialValues?.clientParticipants?.map((item) => item.id) ?? [],
        vendorParticipantIds:
          initialValues?.vendorParticipants?.map((item) => item.id) ?? [],
      }}
      onFinish={(values) =>
        onSubmit({
          name: values.name,
          type: values.type,
          date: values.date ? values.date.toISOString() : null,
          location: values.location,
          method: values.method,
          internalParticipantIds: values.internalParticipantIds ?? [],
          clientParticipantIds: values.clientParticipantIds ?? [],
          vendorParticipantIds: values.vendorParticipantIds ?? [],
        })
      }
    >
      <Form.Item label="里程碑名称" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="类型" name="type">
        <Input />
      </Form.Item>
      <Form.Item label="截止日期" name="date">
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="地点" name="location">
        <Input />
      </Form.Item>
      <Form.Item label="方式" name="method">
        <Input />
      </Form.Item>
      <Form.Item label="内部参与人员" name="internalParticipantIds">
        <Select
          mode="multiple"
          allowClear
          placeholder="请选择内部参与人员"
          options={internalParticipantOptions}
        />
      </Form.Item>
      <Form.Item label="客户参与人员" name="clientParticipantIds">
        <Select
          mode="multiple"
          allowClear
          placeholder="请选择客户参与人员"
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
      <Button type="primary" htmlType="submit" block>
        保存
      </Button>
    </Form>
  );
};

export default ProjectMilestoneForm;
