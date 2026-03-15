"use client";

import { useMemo, useState } from "react";
import { Form, Input, Select, Button, Divider, Space, Tag, ColorPicker } from "antd";
import type { DefaultOptionType } from "antd/es/select";

export type ClientFormValues = {
  name: string;
  industryOptionId?: string;
  newIndustryName?: string;
  newIndustryColor?: string;
  remark?: string | null;
};

type ClientFormInitialValues = {
  id?: string;
  name?: string;
  industryOptionId?: string;
  industryOption?: {
    id: string;
    value: string;
  } | null;
  remark?: string | null;
};

type SelectOption = {
  id: string;
  value: string;
  color?: string | null;
};

type Props = {
  initialValues?: ClientFormInitialValues | null;
  industryOptions?: SelectOption[];
  onSubmit: (values: ClientFormValues) => Promise<void> | void;
  submitText?: string;
};

const ClientForm = ({
  initialValues,
  industryOptions = [],
  onSubmit,
  submitText = "保存",
}: Props) => {
  const [form] = Form.useForm<ClientFormValues>();
  const [searchText, setSearchText] = useState("");
  const [showCreateIndustry, setShowCreateIndustry] = useState(false);
  const newIndustryColor = Form.useWatch("newIndustryColor", form);

  const normalizedSearchText = searchText.trim();

  const selectOptions = useMemo(
    () =>
      industryOptions.map((item) => ({
        label: item.value,
        value: item.id,
        color: item.color ?? undefined,
      })),
    [industryOptions],
  );

  const hasMatchByName = useMemo(
    () =>
      normalizedSearchText
        ? selectOptions.some(
            (item) =>
              String(item.label).toLowerCase() === normalizedSearchText.toLowerCase(),
          )
        : false,
    [normalizedSearchText, selectOptions],
  );

  const getTagTextColor = (color?: string) => {
    if (!color || !color.startsWith("#") || color.length !== 7) {
      return "#262626";
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? "#262626" : "#ffffff";
  };

  const activateCreateIndustry = (name?: string) => {
    const value = (name ?? normalizedSearchText).trim();
    setShowCreateIndustry(true);
    form.setFieldValue("industryOptionId", undefined);
    if (value) {
      form.setFieldValue("newIndustryName", value);
    }
    if (!form.getFieldValue("newIndustryColor")) {
      form.setFieldValue("newIndustryColor", "#8c8c8c");
    }
  };

  const hideCreateIndustry = () => {
    setShowCreateIndustry(false);
    form.setFieldValue("newIndustryName", undefined);
    form.setFieldValue("newIndustryColor", undefined);
    void form.validateFields(["industryOptionId"]);
  };

  return (
    <Form
      form={form}
      key={initialValues?.id || "new"}
      layout="vertical"
      initialValues={{
        ...initialValues,
        industryOptionId:
          initialValues?.industryOptionId ?? initialValues?.industryOption?.id,
      }}
      onFinish={onSubmit}
    >
      <Form.Item
        label="名称"
        name="name"
        rules={[{ required: true, message: "请输入名称" }]}
      >
        <Input />
      </Form.Item>

      {!showCreateIndustry ? (
      <Form.Item
        label="行业"
        name="industryOptionId"
        required
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
                const newIndustryName = String(
                  getFieldValue("newIndustryName") ?? "",
                ).trim();
                if (value || newIndustryName) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("请选择行业，或新增一个行业"));
              },
            }),
          ]}
        >
          <Select
            options={selectOptions}
            showSearch={{
              onSearch: setSearchText,
              filterOption: (input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
            optionRender={(option) => {
              const data = option.data as DefaultOptionType & { color?: string };
              return (
                <Tag
                  style={{
                    backgroundColor: data.color ?? "#d9d9d9",
                    color: getTagTextColor(data.color),
                    borderColor: data.color ?? "#bfbfbf",
                    borderRadius: 6,
                  }}
                >
                  {String(data.label ?? "")}
                </Tag>
              );
            }}
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ padding: "0 8px 8px" }}>
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() =>
                      activateCreateIndustry(
                        !normalizedSearchText || hasMatchByName
                          ? undefined
                          : normalizedSearchText,
                      )
                    }
                  >
                    {!normalizedSearchText || hasMatchByName
                      ? "新增行业"
                      : `新增行业: ${normalizedSearchText}`}
                  </Button>
                </div>
              </>
            )}
            onChange={() => {
              setSearchText("");
            }}
            placeholder="请选择行业"
          />
        </Form.Item>
      ) : null}

      {showCreateIndustry ? (
        <Space style={{ width: "100%", marginBottom: 16 }} align="start">
          <Form.Item
            label="新增行业"
            name="newIndustryName"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[{ required: true, message: "请输入新增行业名称" }]}
          >
            <Input
              placeholder="输入新行业名称（保存时创建）"
              onChange={() => {
                void form.validateFields(["industryOptionId"]);
              }}
            />
          </Form.Item>
          <Form.Item
            label="颜色"
            name="newIndustryColor"
            initialValue="#8c8c8c"
            style={{ marginBottom: 0 }}
          >
            <ColorPicker
              value={newIndustryColor || "#8c8c8c"}
              format="hex"
              disabledFormat
              showText
              onChangeComplete={(color) => {
                form.setFieldValue("newIndustryColor", color.toHexString());
              }}
            />
          </Form.Item>
          <Form.Item label=" " style={{ marginBottom: 0 }}>
            <Button onClick={hideCreateIndustry}>取消新增</Button>
          </Form.Item>
        </Space>
      ) : null}

      <Form.Item label="备注" name="remark">
        <Input.TextArea rows={3} />
      </Form.Item>

      <Button type="primary" htmlType="submit" block>
        {submitText}
      </Button>
    </Form>
  );
};

export default ClientForm;
