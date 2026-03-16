"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, DatePicker, Form, Input, Select, Tag, message } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import dayjs from "dayjs";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";

export type ProjectDocumentFormPayload = {
  name: string;
  projectId?: string;
  milestoneId?: string | null;
  typeOption?: string | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
};

type InitialValues = {
  id: string;
  name: string;
  projectId?: string;
  milestoneId?: string | null;
  typeOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  date?: string | null;
  isFinal: boolean;
  internalLink?: string | null;
};

type FormValues = {
  name: string;
  projectId?: string;
  milestoneId?: string;
  typeOption?: string;
  date?: dayjs.Dayjs;
  isFinal?: boolean;
  internalLink?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type MilestoneOption = {
  id: string;
  name: string;
  projectId?: string | null;
};

type Props = {
  projectOptions?: ProjectOption[];
  milestoneOptions?: MilestoneOption[];
  selectedProjectId?: string;
  selectedMilestoneId?: string;
  showProjectField?: boolean;
  showMilestoneField?: boolean;
  disableProjectSelect?: boolean;
  disableMilestoneSelect?: boolean;
  initialValues?: InitialValues | null;
  onSubmit: (payload: ProjectDocumentFormPayload) => Promise<void> | void;
};

const ProjectDocumentForm = ({
  projectOptions = [],
  milestoneOptions = [],
  selectedProjectId,
  selectedMilestoneId,
  showProjectField = false,
  showMilestoneField = false,
  disableProjectSelect = false,
  disableMilestoneSelect = false,
  initialValues,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [typeSearch, setTypeSearch] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const typeOptions = optionsByField["projectDocument.type"] ?? [];
  const watchedProjectId = Form.useWatch("projectId", form);

  useEffect(() => {
    void fetchAllOptions();
  }, [fetchAllOptions]);

  useEffect(() => {
    const nextValues: Partial<FormValues> = {};
    if (selectedProjectId) {
      nextValues.projectId = selectedProjectId;
    }
    if (selectedMilestoneId) {
      nextValues.milestoneId = selectedMilestoneId;
    }
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [form, selectedMilestoneId, selectedProjectId]);

  const effectiveProjectId =
    selectedProjectId ?? watchedProjectId ?? initialValues?.projectId;
  const filteredMilestoneOptions = effectiveProjectId
    ? milestoneOptions.filter((item) => item.projectId === effectiveProjectId)
    : milestoneOptions;

  useEffect(() => {
    if (!showMilestoneField) return;
    const currentMilestoneId = form.getFieldValue("milestoneId");
    if (!currentMilestoneId) return;
    const exists = filteredMilestoneOptions.some(
      (item) => item.id === currentMilestoneId,
    );
    if (!exists) {
      form.setFieldValue("milestoneId", undefined);
    }
  }, [filteredMilestoneOptions, form, showMilestoneField]);

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
          color: "#d9d9d9",
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await fetchAllOptions(true);
      setTypeSearch("");
      messageApi.success("类型已新增");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "新增类型失败");
    } finally {
      setCreatingType(false);
    }
  };

  const selectOptions = typeOptions.map((option) => ({
    label: option.value,
    value: option.value,
    color: option.color ?? "#d9d9d9",
  }));
  const hasExactType = typeSearch.trim()
    ? selectOptions.some(
        (option) =>
          String(option.value).toLowerCase() === typeSearch.trim().toLowerCase(),
      )
    : false;

  return (
    <>
      {contextHolder}
      <Form<FormValues>
        form={form}
        key={initialValues?.id || "new"}
        layout="vertical"
        initialValues={{
          name: initialValues?.name,
          projectId: selectedProjectId ?? initialValues?.projectId,
          milestoneId:
            selectedMilestoneId ?? initialValues?.milestoneId ?? undefined,
          typeOption: initialValues?.typeOption?.value ?? undefined,
          date: initialValues?.date ? dayjs(initialValues.date) : undefined,
          isFinal: initialValues?.isFinal ?? false,
          internalLink: initialValues?.internalLink ?? undefined,
        }}
        onFinish={(values) =>
          onSubmit({
            name: values.name,
            projectId: selectedProjectId ?? values.projectId,
            milestoneId: selectedMilestoneId ?? values.milestoneId ?? null,
            typeOption: values.typeOption?.trim() ? values.typeOption : null,
            date: values.date ? values.date.toISOString() : null,
            isFinal: Boolean(values.isFinal),
            internalLink: values.internalLink?.trim() ? values.internalLink : null,
          })
        }
      >
        <Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入名称" }]}>
          <Input />
        </Form.Item>
        {showProjectField ? (
          <Form.Item
            label="所属项目"
            name="projectId"
            rules={[{ required: true, message: "请选择所属项目" }]}
          >
            <Select
              disabled={disableProjectSelect}
              options={projectOptions.map((project) => ({
                label: project.name,
                value: project.id,
              }))}
              placeholder="请选择所属项目"
            />
          </Form.Item>
        ) : null}
        {showMilestoneField ? (
          <Form.Item label="关联里程碑" name="milestoneId">
            <Select
              allowClear
              disabled={disableMilestoneSelect}
              options={filteredMilestoneOptions.map((milestone) => ({
                label: milestone.name,
                value: milestone.id,
              }))}
              placeholder="请选择关联里程碑"
            />
          </Form.Item>
        ) : null}
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
            options={selectOptions}
            optionRender={(option) => {
              const data = option.data as DefaultOptionType & { color?: string };
              return (
                <Tag color={data.color ?? "#d9d9d9"} style={{ borderRadius: 6 }}>
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
                    {hasExactType ? "已存在同名选项" : `新增: ${typeSearch.trim() || ""}`}
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
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="isFinal" valuePropName="checked">
          <Checkbox>终稿</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          保存
        </Button>
      </Form>
    </>
  );
};

export default ProjectDocumentForm;
