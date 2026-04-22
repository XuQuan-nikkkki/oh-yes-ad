import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
} from "antd";
import { EXECUTION_COST_TYPE_OPTIONS } from "@/lib/execution-cost";

type FormItemProps = {
  name?: string;
};
export const EstimatedDurationInput = ({
  name = "estimatedDuration",
}: FormItemProps) => (
  <Form.Item
    label="预估时长(工作日)"
    name={name}
    rules={[{ required: true, message: "请输入预估时长" }]}
  >
    <InputNumber
      min={0}
      precision={0}
      style={{ width: "100%" }}
      placeholder="请输入天数"
    />
  </Form.Item>
);

export const AgencyFeeRateInput = ({
  name = "agencyFeeRate",
}: FormItemProps) => (
  <Form.Item label="中介费率">
    <Space.Compact style={{ width: "100%" }}>
      <Form.Item noStyle name={name}>
        <InputNumber
          min={0}
          precision={2}
          style={{ width: "100%" }}
          placeholder="请输入中介费率"
        />
      </Form.Item>
      <Button disabled style={{ pointerEvents: "none" }}>
        %
      </Button>
    </Space.Compact>
  </Form.Item>
);

export const HasClientBudgetSwitch = ({
  name = "hasClientBudget",
}: FormItemProps) => (
  <Form.Item label="是否有客户报价" name={name} valuePropName="checked" layout="horizontal">
    <Switch checkedChildren="有" unCheckedChildren="没有" />
  </Form.Item>
);

export const ClientBudgetInput = ({ name = "clientBudget" }: FormItemProps) => (
  <Form.Item
    label="客户报价(不含税)"
    name={name}
    rules={[{ required: true, message: "请输入客户报价(不含税)" }]}
  >
    <Input placeholder="请输入客户报价(不含税)" />
  </Form.Item>
);

export const ContractAmountInptut = ({
  name = "contractAmount",
}: FormItemProps) => (
  <Form.Item
    label="报价金额（含税）"
    name={name}
    rules={[{ required: true, message: "请输入报价金额（含税）" }]}
  >
    <InputNumber
      min={0}
      precision={0}
      style={{ width: "100%" }}
      placeholder="请输入报价金额（含税）"
    />
  </Form.Item>
);

export const HasOutsourceCostSwitch = ({
  name = "hasOutsource",
}: FormItemProps) => (
  <Form.Item
    label="是否有外包"
    name={name}
    valuePropName="checked"
    layout="horizontal"
  >
    <Switch checkedChildren="有" unCheckedChildren="没有" />
  </Form.Item>
);

export const OutsourceRemarkInput = ({
  name = "outsourceRemark",
}: FormItemProps) => (
  <Form.Item label="外包备注" name={name}>
    <Input.TextArea rows={3} placeholder="请输入外包备注" />
  </Form.Item>
);

export const ExecutionCostTypesSelect = ({
  name = "executionCostTypes",
}: FormItemProps) => (
  <Form.Item label="执行费用类别" name={name}>
    <Checkbox.Group
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        rowGap: 8,
      }}
      options={EXECUTION_COST_TYPE_OPTIONS.map((item) => ({
        label: item,
        value: item,
      }))}
    />
  </Form.Item>
);

export const OtherExecutionCostRemarkInput = ({
  name = "otherExecutionCostRemark",
}: FormItemProps) => (
  <Form.Item label="其他费用备注" name={name}>
    <Input.TextArea rows={1} placeholder="请输入其他费用备注" />
  </Form.Item>
);
