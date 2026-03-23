"use client";

import { Button, Form, Input, InputNumber, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { normalizeProjectOutsourceAmount } from "@/lib/project-outsource";

type Props = {
  name?: string;
  label?: string;
  typeLabel?: string;
  amountLabel?: string;
  addButtonText?: string;
  extra?: React.ReactNode;
};

const OutsourceItemsFormList = ({
  name = "outsourceItems",
  label = "外包明细",
  typeLabel = "外包类型",
  amountLabel = "费用",
  addButtonText = "新增外包项",
  extra,
}: Props) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <Form.Item label={label} required extra={extra}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {fields.map((field) => (
            <Space
              key={field.key}
              align="start"
              style={{ width: "100%", display: "flex" }}
            >
              <Form.Item
                key={`${field.key}-type`}
                name={[field.name, "type"]}
                style={{ flex: 1, marginBottom: 0 }}
                rules={[{ required: true, message: `请输入${typeLabel}` }]}
              >
                <Input placeholder={`请输入${typeLabel}`} />
              </Form.Item>
              <Form.Item
                key={`${field.key}-amount`}
                style={{ width: 180, marginBottom: 0 }}
                required
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item
                    noStyle
                    name={[field.name, "amount"]}
                    rules={[{ required: true, message: `请输入${amountLabel}` }]}
                    getValueProps={(value) => ({
                      value:
                        typeof value === "string" || typeof value === "number"
                          ? normalizeProjectOutsourceAmount(value) ?? undefined
                          : value,
                    })}
                  >
                    <InputNumber
                      min={0}
                      precision={0}
                      style={{ width: "100%" }}
                      placeholder={`请输入${amountLabel}`}
                    />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: "none" }}>
                    元
                  </Button>
                </Space.Compact>
              </Form.Item>
              <Button
                danger
                type="text"
                icon={<MinusCircleOutlined />}
                onClick={() => remove(field.name)}
              />
            </Space>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => add({ type: "", amount: undefined })}
          >
            {addButtonText}
          </Button>
        </div>
      </Form.Item>
    )}
  </Form.List>
);

export default OutsourceItemsFormList;
