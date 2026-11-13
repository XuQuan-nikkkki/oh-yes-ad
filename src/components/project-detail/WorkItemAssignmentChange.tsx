"use client";

import { useMemo, useState } from "react";
import { Flex, Form, Input, Modal, Select, Tag, Timeline, Typography, message } from "antd";
import dayjs from "dayjs";
import { buildFunctionGroupedEmployeeOptions } from "@/lib/employee-select";
import { useEmployeesStore } from "@/stores/employeesStore";

export type WorkItemAssignmentChangeItem = {
  id: string;
  fromAssignee?: { id: string; name: string } | null;
  toAssignee: { id: string; name: string };
  changedBy: { id: string; name: string };
  remarks?: string | null;
  changedAt: string;
};

type WorkItemRef = {
  id: string;
  assignee?: { id: string; name: string } | null;
};

export const WorkItemAssignmentHistory = ({
  changes = [],
  variant = "embedded",
}: {
  changes?: WorkItemAssignmentChangeItem[];
  variant?: "embedded" | "detail";
}) => {
  const items = useMemo(
    () =>
      [...changes].reverse().map((change, index) => ({
        color: index === 0 ? "blue" : "gray",
        content: (
          <div className="brief-work-item-assignment-history-item">
            <Flex gap={8} align="baseline" wrap>
              <Typography.Text>
                {change.fromAssignee ? (
                  <>从 {change.fromAssignee.name} 交接给 </>
                ) : (
                  <>指派给 </>
                )}
                <strong>{change.toAssignee.name}</strong>
              </Typography.Text>
              {index === 0 ? <Tag color="blue">当前执行人</Tag> : null}
              <Typography.Text type="secondary">
                {dayjs(change.changedAt).format("YYYY-MM-DD HH:mm")}
              </Typography.Text>
              <Typography.Text type="secondary">
                操作人：{change.changedBy.name}
              </Typography.Text>
            </Flex>
            {change.remarks ? (
              <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0" }}>
                {change.remarks}
              </Typography.Paragraph>
            ) : null}
          </div>
        ),
      })),
    [changes],
  );

  if (!items.length) return null;

  return (
    <div className={`brief-work-item-assignment-history is-${variant}`}>
      {variant === "embedded" ? (
        <div className="brief-work-item-assignment-history-title">
          <Typography.Text className="brief-work-item-section-title">执行人交接记录</Typography.Text>
        </div>
      ) : null}
      <Timeline items={items} />
    </div>
  );
};

export const WorkItemAssignmentModal = ({
  workItem,
  onClose,
  onSaved,
}: {
  workItem: WorkItemRef | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) => {
  const [form] = Form.useForm<{ toAssigneeId: string; remarks?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const employees = useEmployeesStore((state) => state.employees);
  const employeeOptions = useMemo(
    () => {
      const currentAssignee = employees.find(
        (employee) => employee.id === workItem?.assignee?.id,
      );
      const preferredFunctionName =
        currentAssignee?.functionOption?.value ?? currentAssignee?.function;
      return buildFunctionGroupedEmployeeOptions(employees, {
        excludedEmployeeIds: workItem?.assignee?.id
          ? [workItem.assignee.id]
          : [],
        preferredFunctionName,
      });
    },
    [workItem?.assignee?.id, employees],
  );

  const submit = async () => {
    if (!workItem || submitting) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/work-items/${workItem.id}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAssigneeId: values.toAssigneeId,
          remarks: values.remarks?.trim() || null,
        }),
      });
      if (!response.ok) throw new Error((await response.text()) || "保存执行人失败");
      messageApi.success(workItem.assignee ? "执行人已交接" : "执行人已指派");
      onClose();
      await onSaved();
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "保存执行人失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={workItem?.assignee ? "交接执行人" : "指派执行人"}
        open={Boolean(workItem)}
        onCancel={() => { if (!submitting) onClose(); }}
        onOk={() => void submit()}
        okText={workItem?.assignee ? "确认交接" : "确认指派"}
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          {workItem?.assignee ? (
            <Form.Item label="当前执行人">
              <Input value={workItem.assignee.name} disabled />
            </Form.Item>
          ) : null}
          <Form.Item
            label={workItem?.assignee ? "交接给" : "指派给"}
            name="toAssigneeId"
            rules={[{ required: true, message: "请选择新执行人" }]}
          >
            <Select showSearch optionFilterProp="label" placeholder="请选择新执行人" options={employeeOptions} />
          </Form.Item>
          <Form.Item label="备注（可选）" name="remarks">
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="可记录交接事项、背景或其他信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
