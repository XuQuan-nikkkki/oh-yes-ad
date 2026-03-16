"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  message,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import Modal from "antd/es/modal/Modal";
import SelectOptionTag from "@/components/SelectOptionTag";
import TableActions from "@/components/TableActions";

type SelectOptionRecord = {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt?: string;
};

type SelectOptionsAllResponse = {
  options?: SelectOptionRecord[];
};

type SelectOptionFormValues = {
  field: string;
  value: string;
  color?: string;
  order?: number | null;
};

const DEFAULT_COLOR = "#8c8c8c";

const SelectOptionsPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<SelectOptionFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SelectOptionRecord | null>(
    null,
  );
  const [editColor, setEditColor] = useState<string>(DEFAULT_COLOR);
  const [options, setOptions] = useState<SelectOptionRecord[]>([]);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/select-options/all", {
        cache: "no-store",
      });
      const data = (await res.json()) as SelectOptionsAllResponse;
      const list = Array.isArray(data?.options) ? data.options : [];
      setOptions(list);
    } catch (error) {
      console.error("获取选项失败:", error);
      messageApi.error("获取选项失败");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((left, right) => {
        const fieldCompare = left.field.localeCompare(right.field, "zh-CN");
        if (fieldCompare !== 0) return fieldCompare;

        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;

        return left.value.localeCompare(right.value, "zh-CN");
      }),
    [options],
  );

  const fieldFilters = useMemo(
    () =>
      Array.from(new Set(options.map((item) => item.field).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
        .map((field) => ({ text: field, value: field })),
    [options],
  );

  const fieldAutoCompleteOptions = useMemo(
    () => fieldFilters.map((item) => ({ value: String(item.value) })),
    [fieldFilters],
  );

  const openCreateModal = () => {
    setEditingOption(null);
    setModalOpen(true);
  };

  const openEditModal = (record: SelectOptionRecord) => {
    setEditingOption(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOption(null);
    form.resetFields();
  };

  useEffect(() => {
    if (!modalOpen) return;

    if (editingOption) {
      setEditColor(editingOption.color ?? DEFAULT_COLOR);
      form.setFieldsValue({
        field: editingOption.field,
        value: editingOption.value,
        order: editingOption.order ?? null,
        color: editingOption.color ?? DEFAULT_COLOR,
      });
      return;
    }

    setEditColor(DEFAULT_COLOR);
    form.setFieldsValue({
      field: "",
      value: "",
      order: null,
      color: DEFAULT_COLOR,
    });
  }, [modalOpen, editingOption, form]);

  const submitModal = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        field: editingOption ? editingOption.field : values.field.trim(),
        value: values.value.trim(),
        color: editColor,
        order:
          typeof values.order === "number" && Number.isFinite(values.order)
            ? values.order
            : null,
      };

      const endpoint = editingOption
        ? `/api/select-options/${editingOption.id}`
        : "/api/select-options";
      const method = editingOption ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "保存失败");
      }

      messageApi.success(editingOption ? "选项已更新" : "选项已创建");
      closeModal();
      await fetchOptions();
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/select-options/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
      }
      messageApi.success("选项已删除");
      await fetchOptions();
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      }
    }
  };

  const columns: ColumnsType<SelectOptionRecord> = [
    {
      title: "Field",
      dataIndex: "field",
      width: 220,
      filters: fieldFilters,
      filterSearch: true,
      onFilter: (value, record) => record.field === String(value),
      sorter: (left, right) => left.field.localeCompare(right.field, "zh-CN"),
    },
    {
      title: "值",
      dataIndex: "value",
      render: (_value, row) => (
        <SelectOptionTag
          option={{
            id: row.id,
            value: row.value,
            color: row.color ?? null,
          }}
          onUpdated={fetchOptions}
        />
      ),
    },
    {
      title: "颜色",
      dataIndex: "color",
      width: 220,
      render: (value?: string | null) => {
        const resolved = value ?? DEFAULT_COLOR;
        return (
          <Tag color={resolved} style={{ marginInlineEnd: 0 }}>
            {resolved}
          </Tag>
        );
      },
    },
    {
      title: "顺序",
      dataIndex: "order",
      width: 120,
      sorter: (left, right) => (left.order ?? 999999) - (right.order ?? 999999),
      render: (value?: number | null) => value ?? "-",
    },
    {
      title: "操作",
      key: "actions",
      width: 180,
      render: (_value, row) => (
        <TableActions
          onEdit={() => openEditModal(row)}
          onDelete={() => void handleDelete(row.id)}
          deleteTitle="确定删除该选项？"
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        title="选项管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建
          </Button>
        }
      >
        <Table<SelectOptionRecord>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={sortedOptions}
          locale={{ emptyText: "暂无选项" }}
        />
      </Card>

      <Modal
        title={editingOption ? "编辑选项" : "新建选项"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void submitModal()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Field"
            name="field"
            rules={[{ required: true, message: "请输入 Field" }]}
          >
            {editingOption ? (
              <Input disabled />
            ) : (
              <AutoComplete options={fieldAutoCompleteOptions}>
                <Input placeholder="请输入 Field，如 project.status" />
              </AutoComplete>
            )}
          </Form.Item>

          <Form.Item
            label="值"
            name="value"
            rules={[{ required: true, message: "请输入值" }]}
          >
            <Input placeholder="请输入值" />
          </Form.Item>

          <Form.Item label="颜色" name="color">
            <ColorPicker
              value={editColor}
              showText
              onChange={(_, hex) => setEditColor(hex)}
            />
          </Form.Item>

          <Form.Item label="顺序" name="order">
            <InputNumber
              style={{ width: "100%" }}
              placeholder="可选，数字越小越靠前"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SelectOptionsPage;
