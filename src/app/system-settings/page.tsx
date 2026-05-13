"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Form,
  Input,
  Modal,
  Tag,
  Typography,
  message,
} from "antd";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import ListPageContainer from "@/components/ListPageContainer";
import ProTableHeaderTitle from "@/components/ProTableHeaderTitle";
import TableActions from "@/components/TableActions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import {
  useSystemSettingsStore,
  type SystemSettingRecord,
  type SystemSettingValueType,
} from "@/stores/systemSettingsStore";

type SystemSettingFormValues = {
  name: string;
  value: string;
  unit?: string;
  description?: string;
  effectiveDate?: dayjs.Dayjs | null;
};

const VALUE_TYPE_LABELS: Record<SystemSettingValueType, string> = {
  number: "数字",
  percent: "百分比",
  boolean: "布尔",
  text: "文本",
  json: "JSON",
};

const formatSettingValue = (record: SystemSettingRecord) => {
  if (record.valueType === "boolean") {
    return record.value === "true" ? "是" : "否";
  }
  return record.value;
};

const formatEffectiveDate = (record: SystemSettingRecord) => {
  const effectiveDate = record.histories?.[0]?.effectiveDate;
  if (!effectiveDate) return "-";
  const parsed = dayjs(effectiveDate);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "-";
};

const SystemSettingsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<SystemSettingFormValues>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageSystemSettings =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const records = useSystemSettingsStore((state) => state.records);
  const loading = useSystemSettingsStore((state) => state.loading);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const upsertSystemSetting = useSystemSettingsStore(
    (state) => state.upsertSystemSetting,
  );
  const removeSystemSetting = useSystemSettingsStore(
    (state) => state.removeSystemSetting,
  );
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SystemSettingRecord | null>(
    null,
  );

  const fetchRecords = useCallback(async () => {
    if (!canManageSystemSettings) return;
    try {
      await fetchSystemSettings();
    } catch (error) {
      console.error("获取系统参数失败:", error);
      messageApi.error(
        error instanceof Error ? error.message : "获取系统参数失败",
      );
    }
  }, [fetchSystemSettings, canManageSystemSettings, messageApi]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editingRecord) {
      form.setFieldsValue({
        name: editingRecord.name,
        value: editingRecord.value,
        unit: editingRecord.unit ?? "",
        description: editingRecord.description ?? "",
        effectiveDate: dayjs(),
      });
    }
  }, [editingRecord, form, modalOpen]);

  const openEditModal = (record: SystemSettingRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingRecord(null);
    setModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    if (!editingRecord) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        key: editingRecord.key,
        name: values.name.trim(),
        group: editingRecord.group,
        value: values.value.trim(),
        valueType: editingRecord.valueType,
        unit: values.unit?.trim() || null,
        description: values.description?.trim() || null,
        order: editingRecord.order ?? null,
        effectiveDate: values.effectiveDate
          ? values.effectiveDate.startOf("day").toISOString()
          : null,
      };

      const res = await fetch(`/api/system-settings/${editingRecord.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "保存失败");
      }
      const saved = (await res.json()) as SystemSettingRecord;
      upsertSystemSetting(saved);

      messageApi.success("系统参数已更新");
      closeModal();
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (record: SystemSettingRecord) => {
    try {
      const res = await fetch(`/api/system-settings/${record.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "删除失败");
      }
      removeSystemSetting(record.id);
      messageApi.success("系统参数已删除");
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    }
  }, [messageApi, removeSystemSetting]);

  const columns = useMemo<ProColumns<SystemSettingRecord>[]>(
    () => [
      {
        title: "参数名称",
        dataIndex: "name",
        width: 160,
      },
      {
        title: "值",
        dataIndex: "value",
        width: 140,
        ellipsis: true,
        render: (_value, record) => formatSettingValue(record),
      },
      {
        title: "单位",
        dataIndex: "unit",
        width: 100,
        render: (_value, record) => record.unit || "-",
      },
      {
        title: "类型",
        dataIndex: "valueType",
        width: 90,
        render: (_dom, record) => (
          <Tag>{VALUE_TYPE_LABELS[record.valueType] ?? record.valueType}</Tag>
        ),
      },
      {
        title: "说明",
        dataIndex: "description",
        ellipsis: true,
        width: 220,
        render: (_dom, record) => record.description || "-",
      },
      {
        title: "生效日期",
        key: "effectiveDate",
        width: 120,
        render: (_dom, record) => formatEffectiveDate(record),
      },
      {
        title: "操作",
        key: "actions",
        width: 140,
        render: (_value, record) => (
          <TableActions
            onEdit={() => openEditModal(record)}
            onDelete={() => handleDelete(record)}
            deleteTitle={`确定删除系统参数「${record.name}」？`}
          />
        ),
      },
    ],
    [handleDelete],
  );

  if (!canManageSystemSettings) {
    return (
      <ListPageContainer>
        {contextHolder}
        <Typography.Text type="secondary">
          仅管理员、HR、财务可查看系统参数。
        </Typography.Text>
      </ListPageContainer>
    );
  }

  return (
    <ListPageContainer>
      {contextHolder}
      <ProTable<SystemSettingRecord>
        rowKey="id"
        loading={loading}
        dataSource={records}
        search={false}
        options={false}
        headerTitle={<ProTableHeaderTitle>系统参数</ProTableHeaderTitle>}
        columns={columns}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title="编辑系统参数"
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnHidden
        width={720}
      >
        <Form form={form} layout="vertical">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="参数名称"
              name="name"
              rules={[{ required: true, message: "请输入参数名称" }]}
            >
              <Input placeholder="例如 成本基准线" />
            </Form.Item>
            <Form.Item
              label="参数值"
              name="value"
              rules={[{ required: true, message: "请输入值" }]}
            >
              <Input placeholder="例如 53" />
            </Form.Item>
            <Form.Item label="参数单位" name="unit">
              <Input placeholder="例如 % / 元 / 天" />
            </Form.Item>
            <Form.Item
              label="生效日期"
              name="effectiveDate"
              rules={[{ required: true, message: "请选择生效日期" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="说明"
              name="description"
              style={{ gridColumn: "span 2" }}
            >
              <Input.TextArea
                rows={3}
                placeholder="例如 报价策略中用于判断成本是否超过基准线"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </ListPageContainer>
  );
};

export default SystemSettingsPage;
