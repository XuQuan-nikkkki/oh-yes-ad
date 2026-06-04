"use client";

import { Form, Input, Modal } from "antd";

type FormValues = {
  estimatedDuration: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (estimatedDuration: number) => Promise<void> | void;
};

const SupplementEstimatedDurationModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();

  const handleFinish = async (values: FormValues) => {
    await onSubmit(Number(values.estimatedDuration));
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="补充预计时长"
      open={open}
      confirmLoading={loading}
      onCancel={handleCancel}
      onOk={() => {
        void form.submit();
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="预估时长(工作日)"
          name="estimatedDuration"
          rules={[
            { required: true, message: "请输入预估时长(工作日)" },
            {
              validator: async (_, value: unknown) => {
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed > 0) return;
                throw new Error("请输入大于 0 的预估时长(工作日)");
              },
            },
          ]}
        >
          <Input type="number" min={1} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SupplementEstimatedDurationModal;
