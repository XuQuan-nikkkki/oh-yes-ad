"use client";

import { useEffect, useRef, useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button, Col, ColorPicker, ConfigProvider, Collapse, DatePicker, Divider, Empty, Flex, Form, Input, Radio, Row,
  Select, Space, Steps, Tag, Typography, message,
} from "antd";
import type { SelectProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import zhCN from "antd/locale/zh_CN";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { DEFAULT_COLOR } from "@/lib/constants";

export type DeliverableType = "DESIGN" | "COPY" | "PROJECT_MANAGEMENT" | "NEW_MEDIA";

export type BriefDeliverablePayload = {
  id?: string;
  type: DeliverableType;
  title: string;
  description: string;
  formatOptionIds?: string[];
  categoryOrSceneOptionIds?: string[];
  specification?: string;
  reviewerId?: string;
  assigneeId?: string;
  firstDraftAt?: string;
  revisionAt?: string;
  finalAt?: string;
  creatorId: string;
};

export type BriefFormPayload = {
  title: string;
  description: string;
  projectId: string;
  ownerId: string;
  creatorId: string;
  deliverables: BriefDeliverablePayload[];
};

type DeliverableFormValue = Omit<
  BriefDeliverablePayload,
  "creatorId" | "firstDraftAt" | "revisionAt" | "finalAt"
> & {
  uiKey: string;
  firstDraftAt?: Dayjs;
  revisionAt?: Dayjs;
  finalAt?: Dayjs;
};
export type BriefEmployee = {
  id: string;
  name: string;
  function?: string | null;
  functionOption?: { value?: string | null } | null;
  position?: string | null;
  positionOption?: { value?: string | null } | null;
  employmentStatus?: string | null;
  employmentStatusOption?: { value?: string | null } | null;
};
type FormValues = {
  title: string;
  description: string;
  clientId: string;
  projectId: string;
  ownerId: string;
  creatorId: string;
  deliverables: DeliverableFormValue[];
};
type Props = {
  project: { id: string; name: string };
  client: { id: string; name: string };
  creator: { id: string; name: string };
  initialBrief?: {
    title: string;
    description: string;
    owner?: { id: string } | null;
    creator?: { id: string; name: string } | null;
    deliverables?: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      specification?: string | null;
      reviewer?: { id: string } | null;
      assignee?: { id: string } | null;
      firstDraftAt?: string | null;
      revisionAt?: string | null;
      finalAt: string;
      formatOptions?: Array<{ option: { id: string } }>;
      categoryOrSceneOptions?: Array<{ option: { id: string } }>;
    }>;
  };
  employees?: BriefEmployee[];
  onSubmit: (payload: BriefFormPayload) => Promise<void> | void;
};

const typeMeta: Record<DeliverableType, { label: string; color: string; reviewerLabel: string }> = {
  DESIGN: { label: "设计", color: "blue", reviewerLabel: "设计审核人" },
  COPY: { label: "文案", color: "orange", reviewerLabel: "文案审核人" },
  PROJECT_MANAGEMENT: { label: "项目管理", color: "purple", reviewerLabel: "项目管理审核人" },
  NEW_MEDIA: { label: "新媒体", color: "cyan", reviewerLabel: "新媒体审核人" },
};

export const FORMAT_OPTION_FIELD = "briefDeliverable.format";
export const CATEGORY_SCENE_OPTION_FIELD = "briefDeliverable.categoryOrScene";

export const MultipleOptionSelect = ({
  field,
  placeholder,
  value = [],
  onChange,
}: {
  field: string;
  placeholder: string;
  value?: string[];
  onChange?: (value: string[]) => void;
}) => {
  const [searchText, setSearchText] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOptionColor, setNewOptionColor] = useState(DEFAULT_COLOR);
  const [selectOpen, setSelectOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);
  const options = optionsByField[field] ?? [];
  const keyword = searchText.trim();
  const hasExactMatch = options.some(
    (option) =>
      typeof option.value === "string" &&
      option.value.trim().toLowerCase() === keyword.toLowerCase(),
  );

  const createOption = async () => {
    if (!keyword || hasExactMatch || creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/select-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: keyword, color: newOptionColor }),
      });
      if (!response.ok) throw new Error("新增选项失败");
      const created = (await response.json()) as { id: string };
      await fetchAllOptions(true);
      onChange?.(Array.from(new Set([...value, created.id])));
      setSearchText("");
      setNewOptionColor(DEFAULT_COLOR);
      setSelectOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "新增选项失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Select
      mode="multiple"
      open={selectOpen}
      onOpenChange={(open) => {
        if (!open && colorPickerOpen) return;
        setSelectOpen(open);
      }}
      allowClear
      showSearch
      searchValue={searchText}
      optionFilterProp="label"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onSearch={setSearchText}
      onSelect={() => setSearchText("")}
      options={options.map((option) => ({
        label: option.value,
        value: option.id,
        color: option.color ?? DEFAULT_COLOR,
      }))}
      optionRender={(option) => {
        const data = option.data as { label?: string; color?: string };
        return <Tag color={data.color}>{String(data.label ?? "")}</Tag>;
      }}
      tagRender={(props: Parameters<NonNullable<SelectProps["tagRender"]>>[0]) => {
        const option = options.find((item) => item.id === String(props.value));
        return (
          <Tag
            color={option?.color ?? DEFAULT_COLOR}
            closable={props.closable}
            onClose={props.onClose}
            style={{ marginInlineEnd: 4, borderRadius: 6 }}
          >
            {option?.value ?? props.label}
          </Tag>
        );
      }}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: "8px 0" }} />
          <Flex
            align="center"
            justify="space-between"
            gap={8}
            style={{ padding: "0 8px 8px" }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <Button
              type="link"
              loading={creating}
              disabled={!keyword || hasExactMatch}
              style={{ padding: 0 }}
              onClick={() => void createOption()}
            >
              {!keyword || hasExactMatch ? "新增" : `新增: ${keyword}`}
            </Button>
            <ColorPicker
              value={newOptionColor}
              size="small"
              format="hex"
              disabledAlpha
              open={colorPickerOpen}
              onOpenChange={setColorPickerOpen}
              disabled={!keyword || hasExactMatch || creating}
              onChangeComplete={(color) =>
                setNewOptionColor(color.toHexString())
              }
            />
          </Flex>
        </>
      )}
    />
  );
};

const buildFunctionGroupedOptions = (
  employees: BriefEmployee[],
  type: DeliverableType,
  selectedId?: string,
) => {
  const groups = new Map<string, Array<{ label: string; value: string }>>();

  employees.forEach((employee) => {
    const status = employee.employmentStatusOption?.value ?? employee.employmentStatus;
    if (status === "离职" && employee.id !== selectedId) return;

    const functionName =
      employee.functionOption?.value?.trim() ||
      employee.function?.trim() ||
      "未设置职能";
    const options = groups.get(functionName) ?? [];
    options.push({ label: employee.name, value: employee.id });
    groups.set(functionName, options);
  });

  const preferredGroups =
    type === "DESIGN"
      ? ["设计组", "品牌组", "项目组"]
      : type === "COPY"
        ? ["品牌组", "设计组", "项目组"]
        : type === "PROJECT_MANAGEMENT"
          ? ["项目组", "设计组", "品牌组"]
          : ["新媒体", "设计组", "品牌组"];

  return Array.from(groups.entries())
    .map(([label, options]) => ({
      label,
      options: options.sort((left, right) =>
        left.label.localeCompare(right.label, "zh-CN"),
      ),
    }))
    .sort((left, right) => {
      const leftIndex = preferredGroups.indexOf(left.label);
      const rightIndex = preferredGroups.indexOf(right.label);
      if (leftIndex >= 0 || rightIndex >= 0) {
        if (leftIndex < 0) return 1;
        if (rightIndex < 0) return -1;
        return leftIndex - rightIndex;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    });
};

export const getDefaultDeliverableReviewerId = (
  employees: BriefEmployee[],
  type: DeliverableType,
) => {
  const activeEmployees = employees.filter((employee) => {
    const status =
      employee.employmentStatusOption?.value ?? employee.employmentStatus;
    return status !== "离职";
  });
  if (type === "DESIGN") {
    return activeEmployees.find((employee) => {
      const position = employee.positionOption?.value ?? employee.position;
      return position === "美术指导";
    })?.id;
  }
  if (type !== "COPY") return undefined;
  const brandGroupEmployees = activeEmployees.filter((employee) => {
    const functionName = employee.functionOption?.value ?? employee.function;
    return functionName === "品牌组";
  });
  return (
    brandGroupEmployees.find((employee) => {
      const position = employee.positionOption?.value ?? employee.position;
      return position === "文案策划";
    })?.id ?? brandGroupEmployees[0]?.id
  );
};

export const DeliverableFormFields = ({
  fieldName,
  employees,
}: {
  fieldName?: number;
  employees: BriefEmployee[];
}) => {
  const form = Form.useFormInstance();
  const itemName = (name: string) =>
    fieldName === undefined ? name : [fieldName, name];
  const watchName = (name: string) =>
    fieldName === undefined ? name : ["deliverables", fieldName, name];
  const type =
    (Form.useWatch(watchName("type"), form) as DeliverableType | undefined) ??
    "DESIGN";
  const reviewerId = Form.useWatch(watchName("reviewerId"), form) as
    | string
    | undefined;
  const assigneeId = Form.useWatch(watchName("assigneeId"), form) as
    | string
    | undefined;
  const meta = typeMeta[type];
  const reviewerOptions = buildFunctionGroupedOptions(employees, type, reviewerId);
  const assigneeOptions = buildFunctionGroupedOptions(employees, type, assigneeId);
  return (
    <Row gutter={16}>
      {fieldName === undefined ? null : (
        <Form.Item name={[fieldName, "uiKey"]} hidden><Input /></Form.Item>
      )}
      <Col xs={24} md={8}>
        <Form.Item label="交付物类型" name={itemName("type")} rules={[{ required: true, message: "请选择交付物类型" }]}>
          <Radio.Group
            className="brief-deliverable-type-radio"
            optionType="button"
            options={[
              { label: "设计", value: "DESIGN" },
              { label: "文案", value: "COPY" },
              { label: "项目管理", value: "PROJECT_MANAGEMENT" },
              { label: "新媒体", value: "NEW_MEDIA" },
            ]}
            onChange={(event) => {
              const nextType = event.target.value as DeliverableType;
              form.setFieldValue(
                watchName("reviewerId"),
                getDefaultDeliverableReviewerId(employees, nextType),
              );
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={16}>
        <Form.Item label="交付物标题" name={itemName("title")} rules={[{ required: true, whitespace: true, message: "请输入交付物标题" }]}>
          <Input placeholder="请输入交付物标题" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="交付物描述" name={itemName("description")} rules={[{ required: true, whitespace: true, message: "请输入交付物描述" }]}>
          <Input.TextArea rows={3} placeholder="请输入交付要求、内容范围及验收说明" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label={meta.reviewerLabel}
          name={itemName("reviewerId")}
          rules={[{ required: true, message: `请选择${meta.reviewerLabel}` }]}
        >
          <Select allowClear showSearch optionFilterProp="label" placeholder={`请选择${meta.reviewerLabel}`} options={reviewerOptions} />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label={`${meta.label}执行人`} name={itemName("assigneeId")}>
          <Select allowClear showSearch optionFilterProp="label" placeholder={`请选择${meta.label}执行人`} options={assigneeOptions} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="格式" name={itemName("formatOptionIds")}>
          <MultipleOptionSelect field={FORMAT_OPTION_FIELD} placeholder="请选择格式" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="类别/场景" name={itemName("categoryOrSceneOptionIds")}>
          <MultipleOptionSelect field={CATEGORY_SCENE_OPTION_FIELD} placeholder="请选择类别或场景" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="规格" name={itemName("specification")}><Input placeholder="如：1920 × 1080 px" /></Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="初稿时间" name={itemName("firstDraftAt")} rules={[{ required: true, message: "请选择初稿时间" }]}>
          <DatePicker style={{ width: "100%" }} placeholder="请选择初稿日期" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="修改时间" name={itemName("revisionAt")} rules={[{ required: true, message: "请选择修改时间" }]}>
          <DatePicker style={{ width: "100%" }} placeholder="请选择修改日期" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item label="定稿时间" name={itemName("finalAt")} rules={[{ required: true, message: "请选择定稿时间" }]}>
          <DatePicker style={{ width: "100%" }} placeholder="请选择定稿日期" />
        </Form.Item>
      </Col>
    </Row>
  );
};

const BriefForm = ({
  project,
  client,
  creator,
  initialBrief,
  employees = [],
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState(0);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const nextDeliverableKey = useRef(0);
  const { submitting, runWithSubmitLock } = useSubmitLock();
  const employeeOptions = employees.map(({ id, name }) => ({ label: name, value: id }));
  const defaultDesignReviewerId = getDefaultDeliverableReviewerId(
    employees,
    "DESIGN",
  );
  const watchedDeliverables = Form.useWatch("deliverables", form);
  const knownDeliverableKeys = useRef<Set<string>>(new Set());
  const initialValues: FormValues = {
    title: initialBrief?.title ?? "",
    description: initialBrief?.description ?? "",
    projectId: project.id,
    clientId: client.id,
    creatorId: initialBrief?.creator?.id ?? creator.id,
    ownerId: initialBrief?.owner?.id ?? creator.id,
    deliverables: (initialBrief?.deliverables ?? []).map((item) => ({
      id: item.id,
      uiKey: item.id,
      type: (["DESIGN", "COPY", "PROJECT_MANAGEMENT", "NEW_MEDIA"] as const).includes(item.type as DeliverableType)
        ? item.type as DeliverableType
        : "DESIGN",
      title: item.title,
      description: item.description,
      specification: item.specification ?? undefined,
      reviewerId: item.reviewer?.id,
      assigneeId: item.assignee?.id,
      formatOptionIds: item.formatOptions?.map(({ option }) => option.id),
      categoryOrSceneOptionIds: item.categoryOrSceneOptions?.map(
        ({ option }) => option.id,
      ),
      firstDraftAt: item.firstDraftAt ? dayjs(item.firstDraftAt) : undefined,
      revisionAt: item.revisionAt ? dayjs(item.revisionAt) : undefined,
      finalAt: dayjs(item.finalAt),
    })),
  };

  useEffect(() => {
    const currentKeys = (watchedDeliverables ?? [])
      .map((item) => item?.uiKey)
      .filter((key): key is string => Boolean(key));
    const addedKeys = currentKeys.filter(
      (key) => !knownDeliverableKeys.current.has(key),
    );

    if (addedKeys.length > 0) {
      setActiveKeys(addedKeys);
    }
    knownDeliverableKeys.current = new Set(currentKeys);
  }, [watchedDeliverables]);

  const goToDeliverables = async () => {
    await form.validateFields(["title", "description", "projectId", "clientId", "creatorId", "ownerId"]);
    setStep(1);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={(values) => runWithSubmitLock(async () => {
          const deliverables = (values.deliverables ?? []).filter(
            (item): item is DeliverableFormValue => Boolean(item),
          );
          if (deliverables.length === 0) {
            message.error("请至少添加一个需求交付物");
            return;
          }
          await onSubmit({
            title: values.title.trim(), description: values.description.trim(), projectId: values.projectId,
            ownerId: values.ownerId, creatorId: values.creatorId,
            deliverables: deliverables.map(({ uiKey: _uiKey, ...item }) => {
              void _uiKey;
              return {
                ...item, title: item.title.trim(), description: item.description.trim(),
                formatOptionIds: item.formatOptionIds?.filter(Boolean),
                categoryOrSceneOptionIds:
                  item.categoryOrSceneOptionIds?.filter(Boolean),
                specification: item.specification?.trim() || undefined,
                firstDraftAt: item.firstDraftAt?.format("YYYY-MM-DD"),
                revisionAt: item.revisionAt?.format("YYYY-MM-DD"),
                finalAt: item.finalAt?.format("YYYY-MM-DD"),
                creatorId: values.creatorId,
              };
            }),
          });
        })}
      >
        <Steps current={step} responsive={false} style={{ maxWidth: 760, margin: "8px auto 28px" }} items={[{ title: "需求信息" }, { title: "需求交付物" }]} />

        <div style={{ display: step === 0 ? "block" : "none" }}>
          <Form.Item label="需求标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入需求标题" }]}>
            <Input placeholder="请输入需求标题" />
          </Form.Item>
          <Form.Item label="需求描述" name="description" rules={[{ required: true, whitespace: true, message: "请输入需求描述" }]}>
            <Input.TextArea placeholder="请输入需求描述" rows={3} style={{ resize: "none" }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="所属项目" name="projectId" rules={[{ required: true }]}><Select disabled options={[{ label: project.name, value: project.id }]} /></Form.Item></Col>
            <Col span={12}><Form.Item label="所属客户" name="clientId" rules={[{ required: true }]}><Select disabled options={[{ label: client.name, value: client.id }]} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="发起人" name="creatorId" rules={[{ required: true }]}><Select disabled options={[{ label: creator.name, value: creator.id }]} /></Form.Item></Col>
            <Col span={12}><Form.Item label="负责人" name="ownerId" rules={[{ required: true, message: "请选择负责人" }]}><Select showSearch optionFilterProp="label" placeholder="请选择负责人" options={employeeOptions} /></Form.Item></Col>
          </Row>
          <Flex className="brief-form-footer-actions" justify="flex-end"><Button type="primary" onClick={goToDeliverables}>下一步</Button></Flex>
        </div>

        <div style={{ display: step === 1 ? "block" : "none" }}>
          <Form.List name="deliverables" rules={[{ validator: async (_, value) => { if (!value?.length) throw new Error("请至少添加一个需求交付物"); } }]}>
            {(fields, { add, remove }, { errors }) => {
              const addDeliverable = () => {
                nextDeliverableKey.current += 1;
                const uiKey = `deliverable-${nextDeliverableKey.current}`;
                const pendingFieldKey = String(fields.length);
                add({
                  type: "DESIGN",
                  title: "",
                  description: "",
                  uiKey,
                  reviewerId: defaultDesignReviewerId,
                });
                setActiveKeys([uiKey, pendingFieldKey]);
              };
              return (
                <>
                  <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 12 }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>需求交付物（{fields.length}）</Typography.Title>
                    {fields.length === 0 ? (
                      <Button icon={<PlusOutlined />} onClick={addDeliverable}>
                        添加交付物
                      </Button>
                    ) : null}
                  </Flex>
                  {fields.length === 0 ? (
                    <div style={{ border: "1px dashed #d9d9d9", borderRadius: 8, padding: "24px 12px" }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请添加设计或文案交付物" /></div>
                  ) : (
                    <>
                      <Collapse
                        className="brief-deliverables-collapse"
                        activeKey={activeKeys}
                        onChange={(keys) => setActiveKeys(Array.isArray(keys) ? keys.map(String) : [String(keys)])}
                        style={{ background: "#fff" }}
                        items={fields.map((field) => {
                          const item = watchedDeliverables?.[field.name] as DeliverableFormValue | undefined;
                          const type = item?.type ?? "DESIGN";
                          const meta = typeMeta[type];
                          const assigneeName = employeeOptions.find((option) => option.value === item?.assigneeId)?.label;
                          return {
                            key: item?.uiKey ?? String(field.name),
                            label: <Space size={12} align="center" wrap><Typography.Text strong>{item?.title?.trim() || `未命名${meta.label}交付物`}</Typography.Text><Tag color={meta.color}>{meta.label}</Tag><Typography.Text type="secondary">执行人：{assigneeName || "待指派执行人"}</Typography.Text></Space>,
                            extra: <Button type="text" danger aria-label="删除交付物" icon={<DeleteOutlined />} onClick={(event) => { event.stopPropagation(); remove(field.name); }} />,
                            children: <DeliverableFormFields fieldName={field.name} employees={employees} />,
                          };
                        })}
                      />
                      <Flex justify="flex-end" style={{ marginTop: 12 }}>
                        <Button icon={<PlusOutlined />} onClick={addDeliverable}>
                          添加交付物
                        </Button>
                      </Flex>
                    </>
                  )}
                  <Form.ErrorList errors={errors} />
                </>
              );
            }}
          </Form.List>
          <Flex className="brief-form-footer-actions" justify="space-between">
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
              {initialBrief ? "保存" : "创建"}
            </Button>
          </Flex>
        </div>
      </Form>
    </ConfigProvider>
  );
};

export default BriefForm;
