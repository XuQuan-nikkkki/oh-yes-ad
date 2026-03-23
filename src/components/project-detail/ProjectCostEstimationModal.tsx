"use client";

import { useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import { StepsForm } from "@ant-design/pro-components";
import type { ProFormInstance } from "@ant-design/pro-components";
import OutsourceItemsFormList from "@/components/project-detail/OutsourceItemsFormList";
import SelectOptionTag from "@/components/SelectOptionTag";
import {
  getProjectOutsourceTotal,
  normalizeProjectOutsourceAmount,
  normalizeProjectOutsourceItems,
} from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  latestCostEstimation?: Project["latestCostEstimation"];
  prefillEstimation?: Project["latestCostEstimation"];
  estimationType?: "planning" | "baseline";
  employees: Employee[];
  onSaved?: (
    latestCostEstimation: Project["latestCostEstimation"],
  ) => Promise<void> | void;
};

type CostEstimationMemberFormRow = {
  id: string;
  employeeId?: string;
  allocationPercent?: number;
};

type FormValues = {
  estimatedDuration?: number;
  agencyFeeRate?: number;
  hasClientBudget?: boolean;
  clientBudget?: string;
  contractAmountSnapshot?: number;
  members?: CostEstimationMemberFormRow[];
  hasOutsource?: boolean;
  outsourceItems?: Array<{
    id?: string;
    type?: string;
    amount?: number;
  }>;
  outsourceRemark?: string;
  executionCostTypes?: string[];
  otherExecutionCostRemark?: string;
};

type CostEstimationSubmitPayload = {
  type: "planning" | "baseline";
  estimatedDuration?: number;
  agencyFeeRate: number | null;
  clientBudget: string | null;
  contractAmountSnapshot: number | null;
  members: Array<{
    employeeId: string;
    allocationPercent: number;
  }>;
  outsourceItems: Array<{
    type: string;
    amount: number;
  }>;
  outsourceRemark: string | null;
  executionCostTypes: string[];
  otherExecutionCostRemark: string | null;
};

type CostEstimationMutationResponse = {
  project?: {
    id?: string;
    latestCostEstimation?: Project["latestCostEstimation"];
  };
};

const EXECUTION_COST_TYPE_OPTIONS = [
  "外出打车",
  "加班打车",
  "物料费",
  "快递费",
  "招待费",
  "采风费",
  "其他",
] as const;

const MEMBER_TABLE_MAX_HEIGHT = 300;
const MEMBER_FUNCTION_GROUP_ORDER = [
  "项目组",
  "设计组",
  "品牌组",
  "新媒体",
  "财务组",
] as const;

const isEmployeeActive = (employee: Employee) =>
  employee.employmentStatus !== "离职" &&
  employee.employmentStatusOption?.value !== "离职";

const mapEstimationToFormValues = (
  estimation?: Project["latestCostEstimation"],
): FormValues => ({
  estimatedDuration: estimation?.estimatedDuration ?? undefined,
  agencyFeeRate: estimation?.agencyFeeRate ?? undefined,
  hasClientBudget: Boolean(
    typeof estimation?.clientBudget === "string" &&
    estimation.clientBudget.trim().length > 0,
  ),
  clientBudget: estimation?.clientBudget ?? "",
  contractAmountSnapshot: estimation?.contractAmountSnapshot ?? undefined,
  members: (estimation?.members ?? []).map((member) => ({
    id: member.id,
    employeeId: member.employeeId,
    allocationPercent: member.allocationPercent,
  })),
  hasOutsource:
    (estimation?.outsourceItems?.length ?? 0) > 0 ||
    Boolean(estimation?.outsourceRemark?.trim()),
  outsourceItems: (estimation?.outsourceItems ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    amount: normalizeProjectOutsourceAmount(item.amount) ?? undefined,
  })),
  outsourceRemark: estimation?.outsourceRemark ?? "",
  executionCostTypes: (estimation?.executionCostTypes ?? [])
    .map((item) => item.value ?? "")
    .filter((item): item is string => Boolean(item)),
  otherExecutionCostRemark: estimation?.otherExecutionCostRemark ?? "",
});

const toNullableTrimmedString = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeExecutionCostTypes = (values?: string[]) =>
  Array.from(
    new Set((values ?? []).map((item) => item.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

const normalizeMembersForPayload = (members?: CostEstimationMemberFormRow[]) =>
  (members ?? [])
    .map((item) => ({
      employeeId: item.employeeId?.trim() ?? "",
      allocationPercent: Number(item.allocationPercent ?? 0),
    }))
    .filter((item) => item.employeeId)
    .sort((left, right) =>
      left.employeeId.localeCompare(right.employeeId, "zh-CN"),
    );

const toSubmitPayloadFromFormValues = (
  values: FormValues,
  estimationType: "planning" | "baseline",
) => {
  const normalizedOutsourceItems = values.hasOutsource
    ? normalizeProjectOutsourceItems(values.outsourceItems)
    : [];

  return {
    type: estimationType,
    estimatedDuration: values.estimatedDuration,
    agencyFeeRate: values.agencyFeeRate ?? null,
    clientBudget: values.hasClientBudget
      ? toNullableTrimmedString(values.clientBudget)
      : null,
    contractAmountSnapshot: values.contractAmountSnapshot ?? null,
    members: normalizeMembersForPayload(values.members),
    outsourceItems: normalizedOutsourceItems,
    outsourceRemark: values.hasOutsource
      ? toNullableTrimmedString(values.outsourceRemark)
      : null,
    executionCostTypes: normalizeExecutionCostTypes(values.executionCostTypes),
    otherExecutionCostRemark: toNullableTrimmedString(
      values.otherExecutionCostRemark,
    ),
  };
};

const toSubmitPayloadFromEstimation = (
  estimation?: Project["latestCostEstimation"],
  estimationType: "planning" | "baseline" = "planning",
): CostEstimationSubmitPayload => ({
  type: estimationType,
  estimatedDuration: estimation?.estimatedDuration ?? undefined,
  agencyFeeRate: estimation?.agencyFeeRate ?? null,
  clientBudget: toNullableTrimmedString(estimation?.clientBudget ?? null),
  contractAmountSnapshot: estimation?.contractAmountSnapshot ?? null,
  members: (estimation?.members ?? [])
    .map((item) => ({
        employeeId: item.employeeId,
        allocationPercent: item.allocationPercent,
      }))
    .sort((left, right) =>
      left.employeeId.localeCompare(right.employeeId, "zh-CN"),
    ),
  outsourceItems: normalizeProjectOutsourceItems(estimation?.outsourceItems),
  outsourceRemark: toNullableTrimmedString(estimation?.outsourceRemark ?? null),
  executionCostTypes: normalizeExecutionCostTypes(
    (estimation?.executionCostTypes ?? []).map((item) => item.value ?? ""),
  ),
  otherExecutionCostRemark: toNullableTrimmedString(
    estimation?.otherExecutionCostRemark ?? null,
  ),
});

const ProjectCostEstimationModal = ({
  open,
  onCancel,
  projectId,
  latestCostEstimation,
  prefillEstimation,
  estimationType = "planning",
  employees,
  onSaved,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);
  const [editingMemberRowIndex, setEditingMemberRowIndex] = useState<
    number | null
  >(null);
  const memberTableContainerRef = useRef<HTMLDivElement | null>(null);
  const [memberDraftRows, setMemberDraftRows] = useState<
    CostEstimationMemberFormRow[]
  >([]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => isEmployeeActive(employee)),
    [employees],
  );

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  const effectivePrefillEstimation = prefillEstimation ?? latestCostEstimation;

  const initialValues = useMemo(() => {
    const values = mapEstimationToFormValues(effectivePrefillEstimation);
    // Baseline 首次创建时可预填 planning 的其他字段，但项目金额必须手动录入。
    if (estimationType === "baseline" && !latestCostEstimation?.id) {
      values.contractAmountSnapshot = undefined;
    }
    return values;
  }, [effectivePrefillEstimation, estimationType, latestCostEstimation?.id]);

  const notifyError = (content: string) => {
    if (typeof app?.message?.error === "function") {
      app.message.error(content);
      return;
    }
    void messageApi.error(content);
  };

  const notifySuccess = (content: string) => {
    if (typeof app?.message?.success === "function") {
      app.message.success(content);
      return;
    }
    void messageApi.success(content);
  };

  const notifyInfo = (content: string) => {
    if (typeof app?.message?.info === "function") {
      app.message.info(content);
      return;
    }
    void messageApi.info(content);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMemberDraftRows(initialValues.members ?? []);
      setEditingMemberRowIndex(null);
      formRef.current?.resetFields();
      formRef.current?.setFieldsValue(initialValues);
      return;
    }
    formRef.current?.resetFields();
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          estimationType === "baseline"
            ? "立项申请"
            : latestCostEstimation
              ? "更新成本预算"
              : "开始成本测算"
        }
        open={open}
        onCancel={onCancel}
        afterOpenChange={handleOpenChange}
        footer={null}
        destroyOnHidden
        width={920}
        styles={{ body: { overflowX: "hidden" } }}
      >
        <StepsForm<FormValues>
        formRef={formRef}
        key={`${latestCostEstimation?.id ?? "new-cost-estimation"}-${effectivePrefillEstimation?.id ?? "no-prefill"}`}
        onFinish={async (values) => {
          if (submitting) return false;
          setSubmitting(true);

          const payload = toSubmitPayloadFromFormValues(values, estimationType);

          const rawMembers = values.members ?? [];
          if (rawMembers.length === 0) {
            notifyError("请至少添加 1 位成员");
            setSubmitting(false);
            return false;
          }
          const hasIncompleteMemberRow = rawMembers.some((item) => {
            const employeeId = item.employeeId?.trim() ?? "";
            const allocation = item.allocationPercent;
            const hasValidAllocation =
              typeof allocation === "number" &&
              Number.isFinite(allocation) &&
              allocation > 0;
            return !employeeId || !hasValidAllocation;
          });
          if (hasIncompleteMemberRow) {
            notifyError("请完整填写每位成员的姓名和占比（占比需大于 0）");
            setSubmitting(false);
            return false;
          }

          if (values.hasOutsource && payload.outsourceItems.length === 0) {
              notifyError("有外包时请至少添加 1 条完整的外包项");
              setSubmitting(false);
              return false;
          }

          const isUpdate = Boolean(latestCostEstimation?.id);
          if (isUpdate) {
            const previousPayload = toSubmitPayloadFromEstimation(
              latestCostEstimation,
              estimationType,
            );
            previousPayload.contractAmountSnapshot =
              latestCostEstimation?.contractAmountSnapshot ?? null;
            if (JSON.stringify(previousPayload) === JSON.stringify(payload)) {
              notifyInfo("未检测到变更，无需提交");
              setSubmitting(false);
              return false;
            }
          }

          const endpoint = isUpdate
            ? `/api/projects/${projectId}/cost-estimations/${latestCostEstimation?.id}`
            : `/api/projects/${projectId}/cost-estimations`;
          const method = isUpdate ? "PATCH" : "POST";

          try {
            const res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              notifyError(isUpdate ? "更新成本测算失败" : "创建成本测算失败");
              setSubmitting(false);
              return false;
            }

            const data = (await res.json()) as CostEstimationMutationResponse;
            notifySuccess(isUpdate ? "更新成本测算成功" : "创建成本测算成功");
            setSubmitting(false);
            onCancel();
            void Promise.resolve(
              onSaved?.(data.project?.latestCostEstimation ?? null),
            ).catch(() => {
              notifyError("刷新项目数据失败，请手动刷新页面");
            });
            return true;
          } catch {
            notifyError(isUpdate ? "更新成本测算失败" : "创建成本测算失败");
            setSubmitting(false);
            return false;
          }
        }}
        stepsProps={{
          style: {
            // marginBottom: 8,
          },
        }}
        stepsFormRender={(dom, submitter) => (
          <div style={{ width: "100%", overflowX: "hidden" }}>
            <div>{dom}</div>
            <div style={{ marginTop: 16 }}>{submitter}</div>
          </div>
        )}
        submitter={{
          render: (_props, dom) => <Space size={12}>{dom}</Space>,
          searchConfig: {
            submitText: "提交",
          },
          submitButtonProps: {
            loading: submitting,
            disabled: submitting,
          },
        }}
        formProps={{
          layout: "vertical",
          initialValues,
        }}
      >
        <StepsForm.StepForm title="基础信息">
          <Form.Item
            label="预估时长(工作日)"
            name="estimatedDuration"
            rules={[{ required: true, message: "请输入预估时长" }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="请输入天数"
            />
          </Form.Item>
          <Form.Item
            label="中介费率"
          >
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item noStyle name="agencyFeeRate">
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
          {estimationType !== "baseline" ? (
            <>
              <Form.Item
                label="是否有客户报价"
                name="hasClientBudget"
                valuePropName="checked"
              >
                <Switch checkedChildren="有" unCheckedChildren="没有" />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev: FormValues, next: FormValues) =>
                  prev.hasClientBudget !== next.hasClientBudget
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue("hasClientBudget") ? (
                    <Form.Item
                      label="客户报价(不含税)"
                      name="clientBudget"
                      rules={[
                        { required: true, message: "请输入客户报价(不含税)" },
                      ]}
                    >
                      <Input placeholder="请输入客户报价(不含税)" />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </>
          ) : null}
          {estimationType === "baseline" ? (
            <Form.Item
              label="项目金额"
              name="contractAmountSnapshot"
              rules={[{ required: true, message: "请输入项目金额" }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: "100%" }}
                placeholder="请输入项目金额"
              />
            </Form.Item>
          ) : null}
        </StepsForm.StepForm>

        <StepsForm.StepForm title="人员配置">
          <Form.List
            name="members"
            rules={[
              {
                validator: async (
                  _,
                  value: CostEstimationMemberFormRow[] | undefined,
                ) => {
                  if (!Array.isArray(value) || value.length === 0) {
                    return Promise.reject(new Error("请至少选择 1 位成员"));
                  }
                  const hasValidMember = value.some(
                    (item) =>
                      typeof item?.employeeId === "string" &&
                      item.employeeId.trim(),
                  );
                  if (!hasValidMember) {
                    return Promise.reject(new Error("请至少选择 1 位成员"));
                  }
                  const hasIncompleteMemberRow = value.some((item) => {
                    const employeeId = item?.employeeId?.trim() ?? "";
                    const allocation = item?.allocationPercent;
                    const hasValidAllocation =
                      typeof allocation === "number" &&
                      Number.isFinite(allocation) &&
                      allocation > 0;
                    return !employeeId || !hasValidAllocation;
                  });
                  if (hasIncompleteMemberRow) {
                    return Promise.reject(
                      new Error(
                        "请完整填写每位成员的姓名和占比（占比需大于 0）",
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                <div
                  ref={memberTableContainerRef}
                  style={{
                    width: "100%",
                    maxHeight: MEMBER_TABLE_MAX_HEIGHT,
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                >
                  <Table
                    rowKey="key"
                    pagination={false}
                    dataSource={fields}
                    locale={{ emptyText: "暂无成员，请添加" }}
                    style={{ width: "100%" }}
                    tableLayout="fixed"
                    scroll={{
                      x: "max-content",
                      y: MEMBER_TABLE_MAX_HEIGHT - 50,
                    }}
                    columns={[
                      {
                        title: "序号",
                        key: "index",
                        width: 64,
                        align: "center",
                        render: (_value, _field, index) => index + 1,
                      },
                      {
                        title: "姓名",
                        key: "employeeId",
                        width: 280,
                        render: (_value, field) => (
                          <Form.Item
                            name={[field.name, "employeeId"]}
                            style={{ marginBottom: 0 }}
                            rules={[{ required: true, message: "请选择成员" }]}
                          >
                            <Select
                              options={(() => {
                                const selectedIds = new Set(
                                  memberDraftRows
                                    .map((row) => row.employeeId)
                                    .filter(
                                      (id): id is string =>
                                        typeof id === "string" && id.length > 0,
                                    ),
                                );
                                const currentEmployeeId =
                                  memberDraftRows[field.name]?.employeeId;
                                if (currentEmployeeId) {
                                  selectedIds.delete(currentEmployeeId);
                                }

                                const grouped = new Map<
                                  string,
                                  Array<{ label: string; value: string }>
                                >();
                                for (const employee of activeEmployees) {
                                  if (selectedIds.has(employee.id)) continue;
                                  const groupLabel =
                                    employee.functionOption?.value?.trim() ||
                                    employee.function?.trim() ||
                                    "未设置职能";
                                  if (!grouped.has(groupLabel)) {
                                    grouped.set(groupLabel, []);
                                  }
                                  grouped.get(groupLabel)?.push({
                                    label: employee.name,
                                    value: employee.id,
                                  });
                                }

                                return Array.from(grouped.entries())
                                  .sort((a, b) => {
                                    const leftIndex =
                                      MEMBER_FUNCTION_GROUP_ORDER.indexOf(
                                        a[0] as (typeof MEMBER_FUNCTION_GROUP_ORDER)[number],
                                      );
                                    const rightIndex =
                                      MEMBER_FUNCTION_GROUP_ORDER.indexOf(
                                        b[0] as (typeof MEMBER_FUNCTION_GROUP_ORDER)[number],
                                      );
                                    const leftPriority =
                                      leftIndex === -1
                                        ? MEMBER_FUNCTION_GROUP_ORDER.length
                                        : leftIndex;
                                    const rightPriority =
                                      rightIndex === -1
                                        ? MEMBER_FUNCTION_GROUP_ORDER.length
                                        : rightIndex;

                                    if (leftPriority !== rightPriority) {
                                      return leftPriority - rightPriority;
                                    }

                                    return a[0].localeCompare(b[0], "zh-CN");
                                  })
                                  .map(([label, options]) => ({
                                    label,
                                    options: options.sort((a, b) =>
                                      a.label.localeCompare(b.label, "zh-CN"),
                                    ),
                                  }));
                              })()}
                              showSearch
                              placeholder="请选择成员"
                              optionFilterProp="label"
                              disabled={editingMemberRowIndex !== field.name}
                              onChange={(value) => {
                                setMemberDraftRows((previous) => {
                                  const next = [...previous];
                                  const idx = field.name;
                                  next[idx] = {
                                    ...(next[idx] ?? {
                                      id: `${Date.now()}-${idx}`,
                                    }),
                                    employeeId: String(value),
                                  };
                                  return next;
                                });
                              }}
                            />
                          </Form.Item>
                        ),
                      },
                      {
                        title: "职能",
                        key: "function",
                        width: 180,
                        render: (_value, field) => {
                          const row = memberDraftRows[field.name];
                          const employee = row?.employeeId
                            ? employeeById.get(row.employeeId)
                            : undefined;
                          if (!employee?.functionOption?.value) return "-";
                          return (
                            <SelectOptionTag option={employee.functionOption} />
                          );
                        },
                      },
                      {
                        title: "占比",
                        key: "allocationPercent",
                        width: 220,
                        render: (_value, field) => (
                          <Form.Item
                            name={[field.name, "allocationPercent"]}
                            style={{ marginBottom: 0 }}
                            rules={[
                              { required: true, message: "请输入占比" },
                              {
                                validator: async (_, value: unknown) => {
                                  if (typeof value !== "number" || value <= 0) {
                                    return Promise.reject(
                                      new Error("占比需大于 0"),
                                    );
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                          >
                            <InputNumber
                              min={1}
                              max={100}
                              precision={0}
                              style={{ width: "100%" }}
                              placeholder="占比（%）"
                              disabled={editingMemberRowIndex !== field.name}
                            />
                          </Form.Item>
                        ),
                      },
                      {
                        title: "操作",
                        key: "actions",
                        width: 120,
                        render: (_value, field) => (
                          <Space size={8} wrap={false}>
                            <Button
                              type="link"
                              onClick={() =>
                                setEditingMemberRowIndex(field.name)
                              }
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="确定移除该成员吗？"
                              okText="移除"
                              cancelText="取消"
                              onConfirm={() => {
                                remove(field.name);
                                setMemberDraftRows((prev) =>
                                  prev.filter(
                                    (_row, index) => index !== field.name,
                                  ),
                                );
                                if (editingMemberRowIndex === field.name) {
                                  setEditingMemberRowIndex(null);
                                }
                                notifySuccess("成员已移除");
                              }}
                            >
                              <Button danger type="link">
                                移除
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
                <Typography.Text type="secondary">{`已添加 ${fields.length} 个人员`}</Typography.Text>
                <Form.ErrorList errors={errors} />
                <Button
                  type="dashed"
                  block
                  style={{ height: 44 }}
                  onClick={() => {
                    const nextId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    const nextIndex = fields.length;
                    add({ id: nextId });
                    setMemberDraftRows((prev) => [...prev, { id: nextId }]);
                    setEditingMemberRowIndex(nextIndex);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        const container = memberTableContainerRef.current;
                        if (!container) return;
                        const tableBody = container.querySelector(
                          ".ant-table-body",
                        ) as HTMLDivElement | null;
                        if (tableBody) {
                          tableBody.scrollTo({
                            top: tableBody.scrollHeight,
                            behavior: "smooth",
                          });
                          return;
                        }
                        container.scrollTo({
                          top: container.scrollHeight,
                          behavior: "smooth",
                        });
                      });
                    });
                  }}
                >
                  + 添加一个成员
                </Button>
              </Space>
            )}
          </Form.List>
        </StepsForm.StepForm>

        <StepsForm.StepForm title="外包费用">
          <Form.Item
            label="是否有外包"
            name="hasOutsource"
            valuePropName="checked"
          >
            <Switch checkedChildren="有" unCheckedChildren="没有" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev: FormValues, next: FormValues) =>
              prev.hasOutsource !== next.hasOutsource ||
              JSON.stringify(prev.outsourceItems ?? []) !==
                JSON.stringify(next.outsourceItems ?? []) ||
              (prev.outsourceRemark ?? "") !== (next.outsourceRemark ?? "")
            }
          >
            {({ getFieldValue }) => {
              const hasOutsource = Boolean(getFieldValue("hasOutsource"));
              if (!hasOutsource) {
                return null;
              }

              const outsourceItems = (getFieldValue("outsourceItems") ??
                []) as FormValues["outsourceItems"];
              const total = getProjectOutsourceTotal(
                normalizeProjectOutsourceItems(outsourceItems),
              );

              return (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: "100%" }}
                >
                  <OutsourceItemsFormList />
                  <Typography.Text strong>
                    外包费用总计：{total} 元
                  </Typography.Text>
                  <Form.Item label="外包备注" name="outsourceRemark">
                    <Input.TextArea rows={3} placeholder="请输入外包备注" />
                  </Form.Item>
                </Space>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm title="执行费用">
          <Form.Item label="执行费用类别" name="executionCostTypes">
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
          <Form.Item
            noStyle
            shouldUpdate={(prev: FormValues, next: FormValues) =>
              JSON.stringify(prev.executionCostTypes ?? []) !==
              JSON.stringify(next.executionCostTypes ?? [])
            }
          >
            {({ getFieldValue }) => {
              const values = getFieldValue("executionCostTypes") as
                | string[]
                | undefined;
              const includeOther =
                Array.isArray(values) && values.includes("其他");
              if (!includeOther) return null;
              return (
                <Form.Item label="其他费用备注" name="otherExecutionCostRemark">
                  <Input.TextArea rows={1} placeholder="请输入其他费用备注" />
                </Form.Item>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>
        </StepsForm>
      </Modal>
    </>
  );
};

export default ProjectCostEstimationModal;
