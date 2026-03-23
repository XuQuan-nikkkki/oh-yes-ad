"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
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
  valueType: SystemSettingValueType;
  unit?: string;
  description?: string;
};

const VALUE_TYPE_LABELS: Record<SystemSettingValueType, string> = {
  number: "数字",
  percent: "百分比",
  boolean: "布尔",
  text: "文本",
  json: "JSON",
};

const formatSettingValue = (record: SystemSettingRecord) => {
  const unitSuffix = record.unit ? ` ${record.unit}` : "";
  if (record.valueType === "boolean") {
    return record.value === "true" ? `是${unitSuffix}` : `否${unitSuffix}`;
  }
  return `${record.value}${unitSuffix}`;
};

const SystemSettingsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<SystemSettingFormValues>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");
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

  const isEditMode = Boolean(editingRecord?.id);

  const fetchRecords = useCallback(async () => {
    if (!isAdmin) return;
    try {
      await fetchSystemSettings();
    } catch (error) {
      console.error("获取系统参数失败:", error);
      messageApi.error(
        error instanceof Error ? error.message : "获取系统参数失败",
      );
    }
  }, [fetchSystemSettings, isAdmin, messageApi]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!modalOpen) return;
    if (editingRecord) {
      form.setFieldsValue({
        name: editingRecord.name,
        value: editingRecord.value,
        valueType: editingRecord.valueType,
        unit: editingRecord.unit ?? "",
        description: editingRecord.description ?? "",
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      valueType: "number",
    });
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
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name.trim(),
        value: values.value.trim(),
        valueType: values.valueType,
        unit: values.unit?.trim() || null,
        description: values.description?.trim() || null,
      };

      const endpoint = isEditMode
        ? `/api/system-settings/${editingRecord?.id}`
        : "/api/system-settings";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
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

      messageApi.success(isEditMode ? "系统参数已更新" : "系统参数已新增");
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

  if (!isAdmin) {
    return (
      <ListPageContainer>
        {contextHolder}
        <Typography.Text type="secondary">
          仅管理员可查看系统参数。
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
        title={isEditMode ? "编辑系统参数" : "新增系统参数"}
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
              label="值类型"
              name="valueType"
              rules={[{ required: true, message: "请选择值类型" }]}
            >
              <Select
                options={Object.entries(VALUE_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="值"
              name="value"
              rules={[{ required: true, message: "请输入值" }]}
            >
              <Input placeholder="例如 53" />
            </Form.Item>
            <Form.Item label="单位" name="unit">
              <Input placeholder="例如 % / 元 / 天" />
            </Form.Item>
          </div>
          <Form.Item label="说明" name="description">
            <Input.TextArea
              rows={3}
              placeholder="例如 报价策略中用于判断成本是否超过基准线"
            />
          </Form.Item>
        </Form>
      </Modal>
    </ListPageContainer>
  );
};

export default SystemSettingsPage;
