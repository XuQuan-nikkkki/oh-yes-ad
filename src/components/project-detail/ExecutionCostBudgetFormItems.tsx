"use client";

import { Checkbox, Form, InputNumber, Typography } from "antd";
import { areArraysEqual } from "@/lib/array";
import { EXECUTION_COST_TYPE_OPTIONS } from "@/lib/execution-cost";
import { OtherExecutionCostRemarkInput } from "./ProjectCostBasisFormItems";

type Values = {
  executionCostTypes?: string[];
  executionCostAmounts?: Record<string, number | null>;
};

const gridTemplateColumns = "minmax(0, 1fr) minmax(140px, 220px)";

const ExecutionCostBudgetFormItems = () => (
  <>
    <Form.Item name="executionCostTypes" hidden>
      <Checkbox.Group />
    </Form.Item>
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue, setFieldValue }) => {
        const selected = (getFieldValue("executionCostTypes") ?? []) as string[];
        const amounts = (getFieldValue("executionCostAmounts") ?? {}) as Record<string, number | null>;
        const availableOptions = [
          ...EXECUTION_COST_TYPE_OPTIONS,
          ...selected.filter(
            (value) => !EXECUTION_COST_TYPE_OPTIONS.some((option) => option === value),
          ),
        ];
        const total = selected.reduce((sum, value) => {
          const amount = amounts[value];
          return sum + (typeof amount === "number" && Number.isFinite(amount) ? amount : 0);
        }, 0);

        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns, gap: 16, padding: "0 16px 8px", color: "rgba(0, 0, 0, 0.65)", fontWeight: 600 }}>
              <span>执行费用类别</span>
              <span>申请预算（元）</span>
            </div>
            <div style={{ border: "1px solid #e7eaf0", borderRadius: 8, overflow: "hidden" }}>
              {availableOptions.map((value, index) => {
                const checked = selected.includes(value);
                return (
                  <div key={value} style={{ display: "grid", gridTemplateColumns, gap: 16, alignItems: "center", padding: "12px 16px", borderTop: index === 0 ? undefined : "1px solid #f0f0f0", background: checked ? "#f8fbff" : undefined }}>
                    <Checkbox
                      checked={checked}
                      onChange={(event) => {
                        setFieldValue(
                          "executionCostTypes",
                          event.target.checked
                            ? [...selected, value]
                            : selected.filter((item) => item !== value),
                        );
                        if (!event.target.checked) {
                          setFieldValue(["executionCostAmounts", value], null);
                        }
                      }}
                    >
                      {value}
                    </Checkbox>
                    <Form.Item
                      name={["executionCostAmounts", value]}
                      rules={checked ? [{ required: true, message: "请输入申请预算" }] : []}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        precision={2}
                        disabled={!checked}
                        placeholder={checked ? "请输入金额" : "勾选后填写"}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </div>
                );
              })}
            </div>
            <Typography.Text strong style={{ display: "block", marginTop: 12, textAlign: "right" }}>
              申请预算合计：{total.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 元
            </Typography.Text>
          </div>
        );
      }}
    </Form.Item>
    <Form.Item
      noStyle
      shouldUpdate={(prev: Values, next: Values) =>
        !areArraysEqual(prev.executionCostTypes, next.executionCostTypes)
      }
    >
      {({ getFieldValue }) => {
        const selected = getFieldValue("executionCostTypes") as string[] | undefined;
        return Array.isArray(selected) && selected.includes("其他")
          ? <OtherExecutionCostRemarkInput />
          : null;
      }}
    </Form.Item>
  </>
);

export default ExecutionCostBudgetFormItems;
