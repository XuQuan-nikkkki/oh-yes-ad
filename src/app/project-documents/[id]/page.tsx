"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { DEFAULT_COLOR } from "@/lib/constants";
import AppLink from "@/components/AppLink";
import DetailPageContainer from "@/components/DetailPageContainer";
import SelectOptionTag from "@/components/SelectOptionTag";
import { MilestoneTableRow } from "@/components/MilestonesTable";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type Detail = {
  id: string;
  name: string;
  typeOption?: NullableSelectOptionValue;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
  project?: { id: string; name: string };
  milestone?: MilestoneTableRow | null;
};

type FormValues = {
  name: string;
  projectId: string;
  typeOption?: string;
  date?: dayjs.Dayjs;
  isFinal?: boolean;
  internalLink?: string;
};

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectDocument.type"] ?? [];

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/project-documents/${id}`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      await fetchDetail();
      await fetchAllOptions();
    })();
  }, [id, fetchAllOptions, fetchDetail]);

  const createTypeOption = async () => {
    const value = typeSearch.trim();
    if (!value) return;
    try {
      setCreatingType(true);
      const response = await fetch("/api/select-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "projectDocument.type",
          value,
          color: DEFAULT_COLOR,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await fetchAllOptions(true);
      form.setFieldValue("typeOption", value);
      setTypeSearch("");
      messageApi.success("类型已新增");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "新增类型失败");
    } finally {
      setCreatingType(false);
    }
  };

  const onEdit = () => {
    if (!data) return;
    form.setFieldsValue({
      name: data.name,
      projectId: data.project?.id,
      typeOption: data.typeOption?.value ?? undefined,
      date: data.date ? dayjs(data.date) : undefined,
      isFinal: data.isFinal,
      internalLink: data.internalLink ?? undefined,
    });
    setOpen(true);
  };

  const typeSelectOptions = typeOptions.map((option) => ({
    label: option.value,
    value: option.value,
    color: option.color ?? DEFAULT_COLOR,
  }));
  const hasExactType = typeSearch.trim()
    ? typeSelectOptions.some(
        (option) =>
          String(option.value).toLowerCase() ===
          typeSearch.trim().toLowerCase(),
      )
    : false;

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      projectId: values.projectId,
      typeOption: values.typeOption ?? null,
      date: values.date ? values.date.toISOString() : null,
      isFinal: Boolean(values.isFinal),
      internalLink: values.internalLink ?? null,
    };
    const res = await fetch(`/api/project-documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      messageApi.error("更新失败");
      return;
    }
    messageApi.success("更新成功");
    setOpen(false);
    await fetchDetail();
  };

  const onDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/project-documents/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      messageApi.error("删除失败");
      return;
    }
    messageApi.success("删除成功");
    router.push("/project-documents");
  };

  if (loading) {
    return (
      <DetailPageContainer>
        <Card title="项目资料详情" loading />
      </DetailPageContainer>
    );
  }

  if (!data) {
    return (
      <DetailPageContainer>
        <Card title="项目资料详情">项目资料不存在</Card>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      {contextHolder}
      <Card
        title={`项目资料：${data.name}`}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={onEdit}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除资料「${data.name}」？`}
              okText="删除"
              cancelText="取消"
              onConfirm={() => void onDelete()}
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger loading={deleting}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={2} size="small">
            <Descriptions.Item label="所属项目">
              {data.project ? (
                <AppLink href={`/projects/${data.project.id}`}>
                  {data.project.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              <SelectOptionTag option={data.typeOption} />
            </Descriptions.Item>
            <Descriptions.Item label="日期">
              {data.date ? dayjs(data.date).format("YYYY-MM-DD") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="是最终版">
              <Checkbox
                checked={data.isFinal}
                onChange={() => {}}
                style={{ pointerEvents: "none" }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="内部链接">
              {data.internalLink ? (
                <a
                  href={data.internalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "gray",
                    textDecoration: "underline",
                  }}
                >
                  {data.internalLink}
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="关联里程碑">
              {data.milestone ? (
                <AppLink href={`/milestones/${data.milestone.id}`}>
                  {data.milestone.name}
                </AppLink>
              ) : (
                "-"
              )}
            </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="编辑资料"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={(values) => void onSubmit(values)}
        >
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="所属项目"
            name="projectId"
            rules={[{ required: true }]}
          >
            <Select
              disabled
              options={
                data.project
                  ? [{ label: data.project.name, value: data.project.id }]
                  : []
              }
            />
          </Form.Item>
          <Form.Item label="类型" name="typeOption">
            <Select
              allowClear
              placeholder="请选择或新增类型"
              showSearch
              searchValue={typeSearch}
              onSearch={(value) => setTypeSearch(value)}
              onChange={() => setTypeSearch("")}
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={typeSelectOptions}
              optionRender={(option) => {
                const data = option.data as DefaultOptionType & {
                  color?: string;
                };
                return (
                  <Tag
                    color={data.color ?? DEFAULT_COLOR}
                    style={{ borderRadius: 6 }}
                  >
                    {String(data.label ?? "")}
                  </Tag>
                );
              }}
              popupRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: "8px" }}>
                    <Button
                      type="link"
                      loading={creatingType}
                      disabled={!typeSearch.trim() || hasExactType}
                      style={{ padding: 0 }}
                      onClick={() => void createTypeOption()}
                    >
                      {hasExactType
                        ? "已存在同名选项"
                        : `新增: ${typeSearch.trim() || ""}`}
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item label="日期" name="date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="内部链接" name="internalLink">
            <Input />
          </Form.Item>
          <Form.Item name="isFinal" valuePropName="checked">
            <Checkbox>是最终版</Checkbox>
          </Form.Item>
          <Button block type="primary" htmlType="submit">
            保存
          </Button>
        </Form>
      </Modal>
    </DetailPageContainer>
  );
}
