"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  ColorPicker,
  Dropdown,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import {
  DragSortTable,
  ProForm,
  StepsForm,
  type ProColumns,
} from "@ant-design/pro-components";
import { DEFAULT_COLOR } from "@/lib/constants";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type SelectOptionRecord = {
  id: string;
  field: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt?: string;
};

type FormValues = {
  value: string;
  color: string;
};

type Props = {
  option?: NullableSelectOptionValue;
  fallbackText?: string;
  rounded?: boolean;
  onUpdated?: () => void | Promise<void>;
  modalTitle?: string;
  fieldLabel?: string;
  fieldRequiredMessage?: string;
  inputPlaceholder?: string;
  successMessage?: string;
  editNotice?: ReactNode;
};

const normalizeHexColor = (raw?: string | null) => {
  if (!raw) return DEFAULT_COLOR;
  const color = raw.trim();
  if (!color) return DEFAULT_COLOR;
  const fullHex = /^#([0-9a-fA-F]{8})$/;
  if (fullHex.test(color)) {
    return color.slice(0, 7);
  }
  return color;
};

const sortByOrder = (left: SelectOptionRecord, right: SelectOptionRecord) => {
  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightCreated = right.createdAt
    ? new Date(right.createdAt).getTime()
    : 0;
  if (leftCreated !== rightCreated) return leftCreated - rightCreated;
  return left.value.localeCompare(right.value, "zh-CN");
};

const SelectOptionTag = ({
  option,
  fallbackText = "-",
  rounded = true,
  onUpdated,
  modalTitle = "修改选项",
  fieldLabel = "文案",
  fieldRequiredMessage = "请输入文案",
  inputPlaceholder = "请输入文案",
  successMessage = "选项已更新",
  editNotice,
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [editColor, setEditColor] = useState(normalizeHexColor(option?.color));
  const [initialValue, setInitialValue] = useState(option?.value ?? "");
  const [activeField, setActiveField] = useState<string>("");
  const [sortableOptions, setSortableOptions] = useState<SelectOptionRecord[]>(
    [],
  );

  const modalKey = useMemo(
    () => `${option?.id ?? "none"}-${editOpen ? "open" : "closed"}`,
    [editOpen, option?.id],
  );

  useEffect(() => {
    if (!editOpen || !option?.id) return;

    let cancelled = false;

    const loadData = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch("/api/select-options/all", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("获取选项失败");
        }

        const payload = (await res.json()) as {
          options?: SelectOptionRecord[];
        };
        const allOptions = Array.isArray(payload.options)
          ? payload.options
          : [];
        const current = allOptions.find((item) => item.id === option.id);

        const resolvedField = current?.field ?? "";
        const related = resolvedField
          ? allOptions
              .filter((item) => item.field === resolvedField)
              .sort(sortByOrder)
          : [];

        if (cancelled) return;

        setActiveField(resolvedField);
        setSortableOptions(
          related.map((item, index) => ({
            ...item,
            order: index + 1,
          })),
        );
        setInitialValue(current?.value ?? option.value ?? "");
        setEditColor(normalizeHexColor(current?.color ?? option.color));
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && error.message) {
            message.error(error.message);
          } else {
            message.error("获取选项失败");
          }
          setActiveField("");
          setSortableOptions([]);
          setInitialValue(option.value ?? "");
          setEditColor(normalizeHexColor(option.color));
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [editOpen, option?.color, option?.id, option?.value]);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key !== "edit" || !option?.id) return;
    setEditOpen(true);
  };

  const handleFinish = async (values: FormValues) => {
    if (!option?.id) return true;

    const normalizedValue = values.value.trim();
    if (!normalizedValue) {
      messageApi.error(fieldRequiredMessage);
      return false;
    }

    try {
      setSubmitting(true);

      const normalizedColor = normalizeHexColor(editColor);

      const relatedRows = sortableOptions.length
        ? sortableOptions.map((item, index) => ({ ...item, order: index + 1 }))
        : [];

      const patchRequests: Array<Promise<Response>> = [];

      const currentOrder =
        relatedRows.find((item) => item.id === option.id)?.order ?? null;

      patchRequests.push(
        fetch(`/api/select-options/${option.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: normalizedValue,
            color: normalizedColor,
            order: currentOrder,
          }),
        }),
      );

      for (const row of relatedRows) {
        if (row.id === option.id) continue;

        patchRequests.push(
          fetch(`/api/select-options/${row.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: row.value,
              color: normalizeHexColor(row.color),
              order: row.order,
            }),
          }),
        );
      }

      const results = await Promise.all(patchRequests);
      const failed = results.find((res) => !res.ok);
      if (failed) {
        const text = await failed.text();
        throw new Error(text || "更新选项失败");
      }

      messageApi.success(successMessage);
      setEditOpen(false);
      await onUpdated?.();
      return true;
    } catch (error) {
      if (error instanceof Error && error.message) {
        messageApi.error(error.message);
      } else {
        messageApi.error("更新选项失败");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const sortColumns: ProColumns<SelectOptionRecord>[] = [
    {
      title: "选项",
      dataIndex: "value",
      render: (_value, record) => (
        <Tag
          color={normalizeHexColor(record.color)}
          style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500 }}
        >
          {record.value}
        </Tag>
      ),
    },
  ];

  const tagNode = (
    <Tag
      color={option?.color ?? DEFAULT_COLOR}
      style={{
        borderRadius: rounded ? 6 : undefined,
        padding: "2px 10px",
        fontWeight: 500,
        cursor: option?.id ? "context-menu" : "default",
      }}
    >
      {option?.value ?? fallbackText}
    </Tag>
  );

  if (!option?.id) {
    return (
      <>
        {contextHolder}
        {tagNode}
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <Dropdown
        trigger={["contextMenu"]}
        menu={{
          items: [{ key: "edit", label: "修改" }],
          onClick: handleMenuClick,
        }}
      >
        <span>{tagNode}</span>
      </Dropdown>

      <Modal
        title={modalTitle}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <StepsForm<FormValues>
          key={modalKey}
          onFinish={handleFinish}
          stepsProps={{ size: "small" }}
          submitter={{
            submitButtonProps: {
              loading: submitting,
            },
          }}
        >
          <StepsForm.StepForm
            title="基础信息"
            initialValues={{
              value: initialValue,
              color: editColor,
            }}
          >
            {editNotice ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={editNotice}
              />
            ) : null}

            <ProForm.Item
              label={fieldLabel}
              name="value"
              rules={[
                {
                  required: true,
                  message: fieldRequiredMessage,
                },
              ]}
            >
              <Input placeholder={inputPlaceholder} />
            </ProForm.Item>

            <ProForm.Item label="颜色" name="color">
              <ColorPicker
                value={editColor}
                format="hex"
                disabledFormat
                disabledAlpha
                showText
                onChangeComplete={(color) => {
                  setEditColor(normalizeHexColor(color.toHexString()));
                }}
              />
            </ProForm.Item>
          </StepsForm.StepForm>

          <StepsForm.StepForm title="排序">
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              <Typography.Text type="secondary">
                {activeField
                  ? `拖拽调整该字段下选项顺序。`
                  : "未识别当前选项所属字段"}
              </Typography.Text>

              <DragSortTable<SelectOptionRecord>
                rowKey="id"
                size="small"
                search={false}
                options={false}
                pagination={false}
                dragSortKey="value"
                columns={sortColumns}
                dataSource={sortableOptions}
                loading={loadingOptions}
                onDragSortEnd={(
                  _beforeIndex: number,
                  _afterIndex: number,
                  newDataSource: SelectOptionRecord[],
                ) => {
                  setSortableOptions(
                    newDataSource.map((item, index) => ({
                      ...item,
                      order: index + 1,
                    })),
                  );
                }}
                locale={{ emptyText: "暂无可排序选项" }}
                style={{ marginBottom: 34 }}
              />
            </Space>
          </StepsForm.StepForm>
        </StepsForm>
      </Modal>
    </>
  );
};

export default SelectOptionTag;
