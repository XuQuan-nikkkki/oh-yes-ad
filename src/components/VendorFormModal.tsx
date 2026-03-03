"use client";

import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Divider,
  Checkbox,
  Upload,
  Space,
} from "antd";

type Vendor = {
  id?: string;
  name?: string;
  fullName?: string | null;
  vendorType?: string | null;
  businessType?: string | null;
  services?: string[];
  location?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  strengths?: string | null;
  notes?: string | null;
  companyIntro?: string | null;
  portfolioLink?: string | null;
  priceRange?: string | null;
  isBlacklisted?: boolean;
  cooperationStatus?: string | null;
  rating?: string | null;
  lastCoopDate?: string | null;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  vendorTypeOptions?: string[];
  businessTypeOptions?: string[];
  servicesOptions?: string[];
  cooperationStatusOptions?: string[];
  ratingOptions?: string[];
  initialValues?: Vendor | null;
};

const VendorFormModal = ({
  open,
  onCancel,
  onSuccess,
  vendorTypeOptions = [],
  businessTypeOptions = [],
  servicesOptions = [],
  cooperationStatusOptions = [],
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues?.id;

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      vendorType: Array.isArray(values.vendorType)
        ? values.vendorType[0]
        : values.vendorType,
      businessType: Array.isArray(values.businessType)
        ? values.businessType[0]
        : values.businessType,
      services: values.services || [],
    };

    await fetch("/api/vendors", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { id: initialValues?.id, ...payload } : payload,
      ),
    });

    onSuccess();
  };

  return (
    <Modal
      title={isEdit ? "编辑供应商" : "新建供应商"}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width="80%"
      centered
      styles={{
        body: {
          maxHeight: "80vh",
          overflow: "auto",
        },
      }}
      footer={
        <Space>
          <Button onClick={onCancel} block>
            取消
          </Button>
          <Button type="primary" onClick={() => form.submit()} block>
            保存
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        key={initialValues?.id || "new"}
        initialValues={{
          ...initialValues,
          vendorType: initialValues?.vendorType
            ? [initialValues.vendorType]
            : undefined,
          businessType: initialValues?.businessType
            ? [initialValues.businessType]
            : undefined,
        }}
        onFinish={handleSubmit}
        labelWrap
      >
        <Row gutter={24}>
          {/* 左列 */}
          <Col span={11}>
            <h4 style={{ marginBottom: "16px", fontWeight: 600 }}>基础信息</h4>
            <Form.Item
              label="名称"
              name="name"
              rules={[{ required: true, message: "请输入名称" }]}
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input placeholder="必填" />
            </Form.Item>

            <Form.Item
              label="全称"
              name="fullName"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input />
            </Form.Item>

            <h4
              style={{
                marginTop: "24px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              公司情况
            </h4>

            <Form.Item
              label="供应商类型"
              name="vendorType"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Select
                mode="tags"
                options={vendorTypeOptions.map((item) => ({
                  label: item,
                  value: item,
                }))}
                maxCount={1}
                placeholder="选择或输入类型"
              />
            </Form.Item>

            <Form.Item
              label="业务类型"
              name="businessType"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Select
                mode="tags"
                options={businessTypeOptions.map((item) => ({
                  label: item,
                  value: item,
                }))}
                maxCount={1}
                placeholder="选择或输入业务类型"
              />
            </Form.Item>

            <Form.Item
              label="服务范围"
              name="services"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Select
                mode="multiple"
                options={servicesOptions.map((item) => ({
                  label: item,
                  value: item,
                }))}
                placeholder="选择或输入服务范围（可多选）"
              />
            </Form.Item>

            <Form.Item
              label="核心特色/擅长领域"
              name="strengths"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item
              label="公司简介"
              name="companyIntro"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Upload disabled>
                <Button>选择文件</Button>
              </Upload>
            </Form.Item>

            <Form.Item
              label="代表作品链接"
              name="portfolioLink"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input type="url" placeholder="https://" />
            </Form.Item>

            <h4 style={{ marginBottom: "16px", fontWeight: 600 }}>联系方式</h4>
            <Form.Item
              label="所在地"
              name="location"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="联系人"
              name="contactName"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="联系人微信"
              name="wechat"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="电话"
              name="phone"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
            >
              <Input type="email" />
            </Form.Item>
          </Col>

          {/* 分割线 */}
          <Col span={2}>
            <Divider orientation="vertical" style={{ height: "100%" }} />
          </Col>

          {/* 右列 */}
          <Col span={11}>
            <h4
              style={{
                marginTop: "24px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              合作情况
            </h4>

            <Form.Item label="参考价区间" layout="vertical" name="priceRange">
              <Input.TextArea rows={5} />
            </Form.Item>

            <Form.Item label="关键备注" layout="vertical" name="notes">
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item
              label="最近合作时间"
              name="lastCoopDate"
              layout="vertical"
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="往期合作项目"
              layout="vertical"
              name="cooperatedProjects"
            >
              <Input.TextArea rows={2} />
            </Form.Item>

            <h4
              style={{
                marginTop: "24px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              合作评价
            </h4>

            <Form.Item
              label="合作状态"
              name="cooperationStatus"
              labelCol={{ span: 4 }}
              wrapperCol={{ span: 20 }}
            >
              <Select
                placeholder="选择合作状态"
                options={cooperationStatusOptions.map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="综合评级"
              name="rating"
              labelCol={{ span: 4 }}
              wrapperCol={{ span: 20 }}
            >
              <Select
                placeholder="选择评级"
                options={[
                  { label: "S(能力顶尖，超预期)", value: "S" },
                  { label: "A(出品稳定，沟通高效)", value: "A" },
                  { label: "B(创意或效率略有不足，可备用)", value: "B" },
                  { label: "C(出现明显问题，有待观察)", value: "C" },
                  { label: "未知", value: "未知" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="是否在黑名单中"
              name="isBlacklisted"
              valuePropName="checked"
            >
              <Checkbox></Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default VendorFormModal;
