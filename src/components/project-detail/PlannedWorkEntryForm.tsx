"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Col, Form, Input, InputNumber, Row, Select, message } from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

dayjs.extend(isoWeek);

export type PlannedWorkEntryFormPayload = {
  deliverableId: string;
  yearOption: string;
  weekNumberOption: string;
  plannedDays: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

export type PlannedWorkEntryDeliverableContext = {
  id: string;
  title: string;
  briefId: string;
  briefTitle: string;
  projectId: string;
  projectName: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
};

type InitialValues = Omit<PlannedWorkEntryFormPayload, "deliverableId"> & {
  id: string;
  deliverableId?: string;
  year?: number | null;
  weekNumber?: number | null;
};

type Props = {
  selectedProjectId?: string;
  disableProjectSelect?: boolean;
  defaultDeliverableId?: string;
  initialValues?: InitialValues | null;
  deliverableContext?: PlannedWorkEntryDeliverableContext;
  onSubmit: (payload: PlannedWorkEntryFormPayload) => Promise<void> | void;
};

type FormValues = {
  projectId?: string;
  briefId?: string;
  deliverableId?: string;
  yearOption?: string;
  weekNumberOption?: string;
  plannedDays: number;
  weekdays: string[];
};

const weekdays = [
  { label: "周一", value: "monday" }, { label: "周二", value: "tuesday" },
  { label: "周三", value: "wednesday" }, { label: "周四", value: "thursday" },
  { label: "周五", value: "friday" }, { label: "周六", value: "saturday" },
  { label: "周天", value: "sunday" },
] as const;

export default function PlannedWorkEntryForm({
  selectedProjectId,
  disableProjectSelect = false,
  defaultDeliverableId,
  initialValues,
  deliverableContext,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const [deliverables, setDeliverables] = useState<PlannedWorkEntryDeliverableContext[]>(deliverableContext ? [deliverableContext] : []);
  const [loading, setLoading] = useState(!deliverableContext);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);

  useEffect(() => { void fetchAllOptions(); }, [fetchAllOptions]);
  useEffect(() => {
    if (deliverableContext) return;
    let active = true;
    void fetch("/api/briefs", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      })
      .then((rows) => {
        if (!active) return;
        setDeliverables(Array.isArray(rows) ? rows.flatMap((brief) =>
          Array.isArray(brief.deliverables) ? brief.deliverables.map((item: { id: string; title: string; assignee?: { id: string; name: string } | null }) => ({
            id: item.id,
            title: item.title,
            briefId: brief.id,
            briefTitle: brief.title,
            projectId: brief.project.id,
            projectName: brief.project.name,
            assigneeId: item.assignee?.id,
            assigneeName: item.assignee?.name,
          })) : [],
        ) : []);
      })
      .catch((error) => { if (active) messageApi.error(error instanceof Error ? error.message : "加载需求单和交付物失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliverableContext, messageApi]);

  const deliverableId = initialValues?.deliverableId ?? defaultDeliverableId ?? deliverableContext?.id;
  const initialDeliverable = deliverables.find((item) => item.id === deliverableId) ?? deliverableContext;
  const projectId = selectedProjectId ?? initialDeliverable?.projectId;
  const briefId = initialDeliverable?.briefId;
  const watchedProjectId = Form.useWatch("projectId", form) ?? projectId;
  const watchedBriefId = Form.useWatch("briefId", form) ?? briefId;
  const watchedDeliverableId = Form.useWatch("deliverableId", form) ?? deliverableId;

  const projects = useMemo(() => Array.from(new Map(deliverables.map((item) => [item.projectId, item.projectName])), ([id, name]) => ({ id, name })), [deliverables]);
  const briefs = useMemo(() => Array.from(new Map(deliverables.filter((item) => !watchedProjectId || item.projectId === watchedProjectId).map((item) => [item.briefId, item.briefTitle])), ([id, title]) => ({ id, title })), [deliverables, watchedProjectId]);
  const visibleDeliverables = useMemo(() => deliverables.filter((item) => item.projectId === watchedProjectId && item.briefId === watchedBriefId), [deliverables, watchedBriefId, watchedProjectId]);
  const selectedDeliverable = deliverables.find((item) => item.id === watchedDeliverableId);

  useEffect(() => {
    if (loading || !deliverableId) return;
    const item = deliverables.find((candidate) => candidate.id === deliverableId);
    if (!item) return;
    form.setFieldsValue({
      projectId: selectedProjectId ?? item.projectId,
      briefId: item.briefId,
      deliverableId: item.id,
    });
  }, [deliverableId, deliverables, form, loading, selectedProjectId]);

  useEffect(() => {
    if (loading) return;
    const current = form.getFieldValue("briefId");
    if (current && !briefs.some((item) => item.id === current)) form.setFieldsValue({ briefId: undefined, deliverableId: undefined });
  }, [briefs, form, loading]);
  useEffect(() => {
    if (loading) return;
    const current = form.getFieldValue("deliverableId");
    if (current && !visibleDeliverables.some((item) => item.id === current)) form.setFieldValue("deliverableId", undefined);
  }, [form, loading, visibleDeliverables]);

  const yearOptions = optionsByField["plannedWorkEntry.year"] ?? [];
  const weekOptions = useMemo(() => [...(optionsByField["plannedWorkEntry.weekNumber"] ?? [])].sort((a, b) => Number(a.value) - Number(b.value)), [optionsByField]);
  const initialWeekdays = weekdays.filter((item) => initialValues?.[item.value]).map((item) => item.value);
  const initialYear = initialValues?.yearOption ?? (initialValues?.year != null ? String(initialValues.year) : String(dayjs().year()));
  const initialWeek = initialValues?.weekNumberOption ?? (initialValues?.weekNumber != null ? String(initialValues.weekNumber) : String(dayjs().isoWeek()));

  return <>
    {contextHolder}
    <Form<FormValues>
      form={form}
      key={initialValues?.id ?? "new"}
      layout="vertical"
      initialValues={{ projectId, briefId, deliverableId, yearOption: initialYear, weekNumberOption: initialWeek, plannedDays: initialValues?.plannedDays ?? 0, weekdays: initialWeekdays }}
      onFinish={(values) => runWithSubmitLock(async () => {
        const selectedDays = new Set(values.weekdays ?? []);
        await onSubmit({
          deliverableId: values.deliverableId as string,
          yearOption: String(values.yearOption),
          weekNumberOption: String(values.weekNumberOption),
          plannedDays: values.plannedDays,
          monday: selectedDays.has("monday"), tuesday: selectedDays.has("tuesday"),
          wednesday: selectedDays.has("wednesday"), thursday: selectedDays.has("thursday"),
          friday: selectedDays.has("friday"), saturday: selectedDays.has("saturday"), sunday: selectedDays.has("sunday"),
        });
      })}
    >
      <Row gutter={16}>
        <Col span={12}><Form.Item label="所属项目" name="projectId" rules={[{ required: true, message: "请选择项目" }]}><Select loading={loading} disabled={disableProjectSelect || Boolean(deliverableContext)} placeholder="请选择项目" options={projects.map((item) => ({ label: item.name, value: item.id }))} /></Form.Item></Col>
        <Col span={12}><Form.Item label="所属需求单" name="briefId" rules={[{ required: true, message: "请选择需求单" }]}><Select loading={loading} disabled={Boolean(deliverableContext)} placeholder="请选择需求单" options={briefs.map((item) => ({ label: item.title, value: item.id }))} /></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}><Form.Item label="所属交付物" name="deliverableId" rules={[{ required: true, message: "请选择交付物" }]}><Select loading={loading} disabled={Boolean(deliverableContext)} placeholder="请选择交付物" options={visibleDeliverables.map((item) => ({ label: item.title, value: item.id }))} /></Form.Item></Col>
        <Col span={12}><Form.Item label="交付物负责人"><Input disabled value={selectedDeliverable?.assigneeName ?? ""} placeholder="待指派执行人" /></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col span={6}><Form.Item label="年份" name="yearOption" rules={[{ required: true, message: "请选择年份" }]}><Select showSearch options={yearOptions.map((item) => ({ label: item.value, value: item.value }))} /></Form.Item></Col>
        <Col span={6}><Form.Item label="周数" name="weekNumberOption" rules={[{ required: true, message: "请选择周数" }]}><Select showSearch options={weekOptions.map((item) => ({ label: item.value, value: item.value }))} /></Form.Item></Col>
        <Col span={12}><Form.Item label="工作日" name="weekdays" rules={[{ required: true, type: "array", min: 1, message: "请至少选择一个工作日" }]}><Checkbox.Group options={[...weekdays]} /></Form.Item></Col>
      </Row>
      <Row><Col span={12}><Form.Item label="计划天数" name="plannedDays" rules={[{ required: true, message: "请输入工时" }]}><InputNumber min={0} step={0.5} style={{ width: "100%" }} /></Form.Item></Col></Row>
      <Button type="primary" htmlType="submit" block loading={submitting} disabled={submitting}>保存</Button>
    </Form>
  </>;
}
