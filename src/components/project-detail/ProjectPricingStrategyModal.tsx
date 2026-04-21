"use client";

import { Children, useEffect, useMemo, useRef, useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Space,
  Switch,
  Typography,
} from "antd";
import { StepsForm } from "@ant-design/pro-components";
import type { ProFormInstance } from "@ant-design/pro-components";
import OutsourceItemsFormList from "@/components/project-detail/OutsourceItemsFormList";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
  normalizeProjectOutsourceAmount,
  normalizeProjectOutsourceItems,
} from "@/lib/project-outsource";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project } from "@/types/projectDetail";

type PricingCostItemFormRow = {
  costTypeOptionId: string;
  name: string;
  budgetAmount?: number;
};

type FormValues = {
  clientBudget?: string;
  estimatedDuration?: number;
  hasOutsource?: boolean;
  outsourceItems?: Array<{
    id?: string;
    type?: string;
    amount?: number;
  }>;
  outsourceRemark?: string;
  agencyFeeRate?: number;
  rentCost?: number;

  plannedLaborCost?: number;
  suggestedLaborCost?: number;

  plannedMiddleOfficeCost?: number;
  suggestedMiddleOfficeCost?: number;

  executionCostItems?: PricingCostItemFormRow[];
  executionCost?: number;

  bottomLinePrice?: number;
  targetPrice?: number;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  estimation?: Project["latestCostEstimation"];
  existingStrategy?: {
    id: string;
    mode?: "range" | "target";
    estimatedDuration: number;
    outsourceItems?: Array<{
      id: string;
      type: string;
      amount: number;
    }>;
    outsourceRemark?: string | null;
    agencyFeeRate?: number | null;
    rentCost: number;
    plannedLaborCost: number;
    suggestedLaborCost: number;
    plannedMiddleOfficeCost: number;
    suggestedMiddleOfficeCost: number;
    executionCost?: number | null;
    bottomLinePrice: number;
    targetPrice: number;
    executionCostItems?: Array<{
      costTypeOptionId: string;
      budgetAmount?: number | null;
      costTypeOption?: {
        value?: string | null;
      } | null;
    }>;
  } | null;
  onCreated?: () => void | Promise<void>;
};

const toMoney = (value: unknown) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toMoneyCents = (value: unknown) => Math.round(toMoney(value) * 100);

const fromMoneyCents = (cents: number) => Math.round(cents) / 100;

const roundMoney = (value: unknown) => fromMoneyCents(toMoneyCents(value));
const toOptionalMoney = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  return roundMoney(value);
};

const toNullableMoney = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const formatClientBudgetText = (value: unknown) => {
  const budget = toNullableMoney(value);
  if (budget === null) return "无";
  return roundMoney(budget).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatMoneyText = (value: unknown) =>
  `${roundMoney(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}元`;

const sumBudgetAmountCents = (items?: PricingCostItemFormRow[]) =>
  (items ?? []).reduce((sum, item) => sum + toMoneyCents(item.budgetAmount), 0);

const MODAL_FORM_MAX_HEIGHT = "calc(100vh - 220px)";
const calculateMiddleOfficeCost = (
  estimatedDuration: number | undefined,
  averageMonthlyCost: number,
  baseDays: number,
) => {
  const duration = Number(estimatedDuration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  return roundMoney((averageMonthlyCost / baseDays) * duration);
};

const calculateAgencyFeeAmountCents = (
  quoteCents: number,
  agencyFeeRate?: number,
) => Math.round(quoteCents * ((agencyFeeRate ?? 0) / 100));

const renderFormulaLabel = (label: string, formula?: string) => {
  if (!formula) return label;
  return (
    <Space size={6}>
      <span>{label}</span>
      <Popover content={`计算方式：${formula}`} trigger="hover">
        <InfoCircleOutlined
          style={{ color: "#8c8c8c", fontSize: 14, cursor: "pointer" }}
        />
      </Popover>
    </Space>
  );
};

const ProjectPricingStrategyModal = ({
  open,
  onCancel,
  projectId,
  estimation,
  existingStrategy,
  onCreated,
}: Props) => {
  const app = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const pricingMode: "range" | "target" =
    toNullableMoney(estimation?.clientBudget) !== null ? "target" : "range";

  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  const monthlyWorkdayBase = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
      ),
    [systemSettings],
  );
  const middleOfficeAverageMonthlyCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost,
      ),
    [systemSettings],
  );
  const middleOfficeBaseDays = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays,
      ),
    [systemSettings],
  );
  const laborCostRateWarningLine = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingLaborCostRateWarning,
      ),
    [systemSettings],
  );
  const projectCostBaselineRatio = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingProjectCostBaselineRatio,
      ),
    [systemSettings],
  );

  const estimatedCostByMembers = useMemo(() => {
    const totalLaborCost = (estimation?.members ?? []).reduce(
      (sum, member) =>
        sum +
        (typeof member.laborCostSnapshot === "number"
          ? member.laborCostSnapshot
          : 0),
      0,
    );
    const totalRentCost = (estimation?.members ?? []).reduce(
      (sum, member) =>
        sum +
        (typeof member.rentCostSnapshot === "number"
          ? member.rentCostSnapshot
          : 0),
      0,
    );

    return {
      totalLaborCost: roundMoney(totalLaborCost),
      totalRentCost: roundMoney(totalRentCost),
    };
  }, [estimation?.members]);

  const initialCostItems = useMemo<PricingCostItemFormRow[]>(() => {
    const estimationOptions = (estimation?.executionCostTypes ?? []).filter(
      (item) => Boolean(item?.id),
    );
    const existingCostItems = existingStrategy?.executionCostItems ?? [];
    const allOptionIds = new Set<string>([
      ...estimationOptions.map((item) => item.id ?? ""),
      ...existingCostItems.map((item) => item.costTypeOptionId),
    ]);

    const rows = Array.from(allOptionIds)
      .filter((id) => Boolean(id))
      .map((id) => {
        const estimationOption = estimationOptions.find(
          (item) => item.id === id,
        );
        const existingCostItem = existingCostItems.find(
          (item) => item.costTypeOptionId === id,
        );

        return {
          costTypeOptionId: id,
          name:
            estimationOption?.value ??
            existingCostItem?.costTypeOption?.value ??
            "未命名费用类型",
          budgetAmount:
            typeof existingCostItem?.budgetAmount === "number"
              ? existingCostItem.budgetAmount
              : undefined,
        };
      });

    return rows;
  }, [estimation?.executionCostTypes, existingStrategy?.executionCostItems]);

  const clientBudgetText = formatClientBudgetText(estimation?.clientBudget);

  const initialValues = useMemo<FormValues>(() => {
    if (existingStrategy) {
      const suggestedExecutionCost = fromMoneyCents(
        sumBudgetAmountCents(initialCostItems),
      );
      return {
        clientBudget: clientBudgetText,
        estimatedDuration: estimation?.estimatedDuration ?? undefined,
        hasOutsource:
          (estimation?.outsourceItems?.length ?? 0) > 0 ||
          Boolean(estimation?.outsourceRemark?.trim()),
        outsourceItems: (estimation?.outsourceItems ?? []).map((item) => ({
          id: item.id,
          type: item.type,
          amount: normalizeProjectOutsourceAmount(item.amount) ?? undefined,
        })),
        outsourceRemark: estimation?.outsourceRemark ?? "",
        agencyFeeRate: toOptionalMoney(estimation?.agencyFeeRate),
        rentCost: existingStrategy.rentCost,
        plannedLaborCost: existingStrategy.plannedLaborCost,
        suggestedLaborCost: existingStrategy.suggestedLaborCost,
        plannedMiddleOfficeCost: existingStrategy.plannedMiddleOfficeCost,
        suggestedMiddleOfficeCost: existingStrategy.suggestedMiddleOfficeCost,
        executionCostItems: initialCostItems,
        executionCost: suggestedExecutionCost,
        bottomLinePrice: existingStrategy.bottomLinePrice,
        targetPrice: existingStrategy.targetPrice,
      };
    }

    const suggestedLaborCost = estimatedCostByMembers.totalLaborCost;
    const suggestedRentCost = estimatedCostByMembers.totalRentCost;
    const suggestedMiddleOfficeCost = calculateMiddleOfficeCost(
      estimation?.estimatedDuration,
      middleOfficeAverageMonthlyCost,
      middleOfficeBaseDays,
    );

    return {
      clientBudget: clientBudgetText,
      estimatedDuration: estimation?.estimatedDuration ?? undefined,
      hasOutsource:
        (estimation?.outsourceItems?.length ?? 0) > 0 ||
        Boolean(estimation?.outsourceRemark?.trim()),
      outsourceItems: (estimation?.outsourceItems ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        amount: normalizeProjectOutsourceAmount(item.amount) ?? undefined,
      })),
      outsourceRemark: estimation?.outsourceRemark ?? "",
      agencyFeeRate: toOptionalMoney(estimation?.agencyFeeRate),
      rentCost: suggestedRentCost > 0 ? suggestedRentCost : undefined,
      plannedLaborCost: suggestedLaborCost > 0 ? suggestedLaborCost : undefined,
      suggestedLaborCost:
        pricingMode === "target" && suggestedLaborCost > 0
          ? suggestedLaborCost
          : undefined,
      plannedMiddleOfficeCost: suggestedMiddleOfficeCost,
      suggestedMiddleOfficeCost:
        pricingMode === "target" ? suggestedMiddleOfficeCost : undefined,
      executionCostItems: initialCostItems,
      executionCost:
        sumBudgetAmountCents(initialCostItems) > 0
          ? fromMoneyCents(sumBudgetAmountCents(initialCostItems))
          : undefined,
      bottomLinePrice: undefined,
      targetPrice: undefined,
    };
  }, [
    clientBudgetText,
    existingStrategy,
    estimation?.estimatedDuration,
    estimation?.agencyFeeRate,
    estimation?.outsourceItems,
    estimation?.outsourceRemark,
    estimatedCostByMembers.totalLaborCost,
    estimatedCostByMembers.totalRentCost,
    initialCostItems,
    middleOfficeAverageMonthlyCost,
    middleOfficeBaseDays,
    pricingMode,
  ]);

  const [draftValues, setDraftValues] = useState<FormValues>(initialValues);
  const notifyError = (content: string) => {
    if (typeof app?.message?.error === "function") {
      app.message.error(content);
      return;
    }
    console.error(content);
  };
  const notifySuccess = (content: string) => {
    if (typeof app?.message?.success === "function") {
      app.message.success(content);
      return;
    }
    console.log(content);
  };

  return (
    <Modal
      title={existingStrategy ? "更新报价参考" : "新建报价参考"}
      open={open}
      onCancel={onCancel}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) return;
        setDraftValues(initialValues);
        formRef.current?.setFieldsValue(initialValues);
      }}
      footer={null}
      destroyOnHidden
      width={1080}
      styles={{
        body: {
          overflow: "hidden",
        },
      }}
    >
      <StepsForm<FormValues>
        formRef={formRef}
        key={`${estimation?.id ?? "pricing-strategy"}-${existingStrategy?.id ?? "new"}`}
        formProps={{
          layout: "vertical",
          initialValues,
          style: {
            width: "100%",
            maxWidth: "none",
          },
        }}
        stepsProps={{
          style: {
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#fff",
            paddingBottom: 12,
          },
        }}
        stepsFormRender={(dom, submitter) => (
          <div
            style={{
              width: "100%",
              maxHeight: MODAL_FORM_MAX_HEIGHT,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 12,
              }}
            >
              {Children.toArray(dom)}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f0f0f0",
                background: "#fff",
              }}
            >
              {Children.toArray(submitter)}
            </div>
          </div>
        )}
        onFinish={async (values) => {
          if (!estimation?.id) {
            notifyError("请先创建项目成本测算");
            return false;
          }
          if (submitting) return false;
          setSubmitting(true);

          const executionCostItems = (values.executionCostItems ?? [])
            .filter((item) => item.costTypeOptionId)
            .map((item) => ({
              costTypeOptionId: item.costTypeOptionId,
              budgetAmount:
                typeof item.budgetAmount === "number"
                  ? roundMoney(item.budgetAmount)
                  : null,
            }));
          const suggestedExecution = fromMoneyCents(
            sumBudgetAmountCents(values.executionCostItems),
          );
          const outsourceItems = normalizeProjectOutsourceItems(
            values.outsourceItems,
          );
          if (values.hasOutsource && outsourceItems.length === 0) {
            notifyError("有外包时请至少添加 1 条完整的外包项");
            setSubmitting(false);
            return false;
          }
          const outsourceCostCents = toMoneyCents(
            getProjectOutsourceTotal(outsourceItems),
          );
          const plannedLaborCostCents = toMoneyCents(values.plannedLaborCost);
          const plannedMiddleOfficeCostCents = toMoneyCents(
            values.plannedMiddleOfficeCost,
          );
          const executionCostCents = toMoneyCents(suggestedExecution);
          const normalizedSuggestedLaborCost =
            pricingMode === "target"
              ? values.plannedLaborCost
              : values.suggestedLaborCost;
          const normalizedSuggestedMiddleOfficeCost =
            pricingMode === "target"
              ? values.plannedMiddleOfficeCost
              : values.suggestedMiddleOfficeCost;
          const suggestedLaborCostCents = toMoneyCents(
            normalizedSuggestedLaborCost,
          );
          const suggestedMiddleOfficeCostCents = toMoneyCents(
            normalizedSuggestedMiddleOfficeCost,
          );
          const agencyFeeRate = roundMoney(values.agencyFeeRate);
          const rentCostCents = toMoneyCents(values.rentCost);
          const bottomLinePriceCents = toMoneyCents(values.bottomLinePrice);
          const targetPriceCents = toMoneyCents(values.targetPrice);
          const mode = pricingMode;
          const normalizedTargetPriceCents =
            mode === "target"
              ? toMoneyCents(values.targetPrice)
              : targetPriceCents;
          const normalizedBottomPriceCents =
            mode === "target"
              ? normalizedTargetPriceCents
              : bottomLinePriceCents;
          const bottomLineAgencyFeeCents = calculateAgencyFeeAmountCents(
            normalizedBottomPriceCents,
            agencyFeeRate ?? 0,
          );
          const targetAgencyFeeCents = calculateAgencyFeeAmountCents(
            normalizedTargetPriceCents,
            agencyFeeRate ?? 0,
          );

          const payload = {
            projectId,
            estimationId: estimation.id,
            mode,
            estimatedDuration: values.estimatedDuration,
            outsourceItems,
            outsourceRemark: values.hasOutsource
              ? values.outsourceRemark?.trim() || null
              : null,
            agencyFeeRate,
            rentCost: roundMoney(values.rentCost),

            plannedLaborCost: roundMoney(values.plannedLaborCost),
            suggestedLaborCost: roundMoney(normalizedSuggestedLaborCost),

            plannedMiddleOfficeCost: roundMoney(values.plannedMiddleOfficeCost),
            suggestedMiddleOfficeCost: roundMoney(
              normalizedSuggestedMiddleOfficeCost,
            ),

            executionCostItems,
            executionCost: roundMoney(suggestedExecution),

            bottomLinePrice: roundMoney(
              fromMoneyCents(normalizedBottomPriceCents),
            ),
            bottomLineProfit: fromMoneyCents(
              normalizedBottomPriceCents -
                plannedMiddleOfficeCostCents -
                plannedLaborCostCents -
                executionCostCents -
                outsourceCostCents -
                bottomLineAgencyFeeCents -
                rentCostCents,
            ),
            targetPrice: roundMoney(fromMoneyCents(normalizedTargetPriceCents)),
            targetProfit: fromMoneyCents(
              normalizedTargetPriceCents -
                suggestedMiddleOfficeCostCents -
                suggestedLaborCostCents -
                executionCostCents -
                outsourceCostCents -
                targetAgencyFeeCents -
                rentCostCents,
            ),
          };

          try {
            const isUpdate = Boolean(existingStrategy?.id);
            const res = await fetch(
              isUpdate
                ? `/api/project-pricing-strategies/${existingStrategy?.id}`
                : "/api/project-pricing-strategies",
              {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );

            if (!res.ok) {
              if (!isUpdate && res.status === 409) {
                notifyError("该测算已存在报价参考");
              } else {
                notifyError(isUpdate ? "更新报价参考失败" : "新建报价参考失败");
              }
              setSubmitting(false);
              return false;
            }

            notifySuccess(isUpdate ? "更新报价参考成功" : "新建报价参考成功");
            await onCreated?.();
            setSubmitting(false);
            onCancel();
            return true;
          } catch {
            notifyError(
              existingStrategy ? "更新报价参考失败" : "新建报价参考失败",
            );
            setSubmitting(false);
            return false;
          }
        }}
        submitter={{
          searchConfig: { submitText: "提交" },
          render: (_props, dom) => (
            <Space size={12}>{Children.toArray(dom)}</Space>
          ),
          submitButtonProps: { loading: submitting, disabled: submitting },
        }}
      >
        <StepsForm.StepForm
          title="基础信息"
          onValuesChange={(_changedValues, allValues) => {
            setDraftValues((prev) => ({ ...prev, ...allValues }));
          }}
        >
          <Form.Item label="客户报价(不含税)" name="clientBudget">
            <Input value={clientBudgetText} readOnly disabled />
          </Form.Item>
          <Form.Item
            label="预计时长(工作日)"
            name="estimatedDuration"
            rules={[{ required: true, message: "请输入预计时长" }]}
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="中介费率" required={draftValues.agencyFeeRate !== undefined}>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item noStyle name="agencyFeeRate">
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  disabled
                />
              </Form.Item>
              <Button disabled style={{ pointerEvents: "none" }}>
                %
              </Button>
            </Space.Compact>
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm
          title="外包成本"
          onValuesChange={(_changedValues, allValues) => {
            setDraftValues((prev) => ({ ...prev, ...allValues }));
          }}
        >
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
              const total = getProjectOutsourceTotal(outsourceItems);
              return (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: "100%" }}
                >
                  <OutsourceItemsFormList
                    extra={
                      (estimation?.outsourceItems?.length ?? 0) > 0
                        ? `项目成本测算中，外包费用：${formatProjectOutsourceItemsText(
                            estimation?.outsourceItems,
                          )}`
                        : undefined
                    }
                  />
                  <Form.Item label="外包成本备注" name="outsourceRemark">
                    <Input.TextArea rows={3} placeholder="请输入外包成本备注" />
                  </Form.Item>
                  <Typography.Text strong>
                    外包成本总计：{total}元
                  </Typography.Text>
                </Space>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm
          title="人力与中台成本"
          onValuesChange={(_changedValues, allValues) => {
            setDraftValues((prev) => ({ ...prev, ...allValues }));
          }}
        >
          {pricingMode === "range" ? (
            <Space orientation="vertical" size={0} style={{ width: "100%" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  columnGap: 24,
                }}
              >
                <Form.Item
                  label={renderFormulaLabel(
                    "计划人力成本",
                    `按成本测算-人员配置中，每个成员的(薪资 + 社保 + 公积金) / ${monthlyWorkdayBase} * 项目预估时长计算`,
                  )}
                  name="plannedLaborCost"
                  rules={[{ required: true, message: "请输入计划人力成本" }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item
                  label="建议人力成本"
                  name="suggestedLaborCost"
                  rules={[{ required: true, message: "请输入建议人力成本" }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  columnGap: 24,
                }}
              >
                <Form.Item
                  label={renderFormulaLabel(
                    "租金成本",
                    `按系统参数中的(月工位费 + 月水电费) / ${monthlyWorkdayBase} * 项目预估时长计算`,
                  )}
                  name="rentCost"
                  rules={[{ required: true, message: "请输入租金成本" }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <div />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  columnGap: 24,
                }}
              >
                <Form.Item
                  label={renderFormulaLabel(
                    "计划中台成本",
                    `按中台均值（${middleOfficeAverageMonthlyCost}元）/ ${middleOfficeBaseDays}天 * 项目预估时长计算`,
                  )}
                  name="plannedMiddleOfficeCost"
                  rules={[{ required: true, message: "请输入计划中台成本" }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item
                  label="建议中台成本"
                  name="suggestedMiddleOfficeCost"
                  rules={[{ required: true, message: "请输入建议中台成本" }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>
            </Space>
          ) : (
            <div>
              <Form.Item
                label={renderFormulaLabel(
                  "人力成本",
                  `按成本测算-人员配置中，每个成员的(薪资 + 社保 + 公积金) / ${monthlyWorkdayBase} * 项目预估时长计算`,
                )}
                name="plannedLaborCost"
                rules={[{ required: true, message: "请输入人力成本" }]}
              >
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label={renderFormulaLabel(
                  "租金成本",
                  `按系统参数中的(月工位费 + 月水电费) / ${monthlyWorkdayBase} * 项目预估时长计算`,
                )}
                name="rentCost"
                rules={[{ required: true, message: "请输入租金成本" }]}
              >
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label={renderFormulaLabel(
                  "中台成本",
                  `按中台均值（${middleOfficeAverageMonthlyCost}元）/ ${middleOfficeBaseDays}天 * 项目预估时长计算`,
                )}
                name="plannedMiddleOfficeCost"
                rules={[{ required: true, message: "请输入中台成本" }]}
              >
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
            </div>
          )}
        </StepsForm.StepForm>

        <StepsForm.StepForm
          title="执行费用成本"
          onValuesChange={(_changedValues, allValues) => {
            const suggestedExecutionCost = fromMoneyCents(
              sumBudgetAmountCents(
                allValues.executionCostItems as PricingCostItemFormRow[] | undefined,
              ),
            );
            formRef.current?.setFieldValue(
              "executionCost",
              suggestedExecutionCost,
            );
            setDraftValues((prev) => ({
              ...prev,
              ...allValues,
              executionCost: suggestedExecutionCost,
            }));
          }}
        >
          <Form.Item label="执行费用明细" style={{ marginBottom: 24 }}>
            {initialCostItems.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  paddingInlineStart: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {initialCostItems.map((item, index) => {
                  const showOtherRemark =
                    item.name.trim() === "其他" &&
                    typeof estimation?.otherExecutionCostRemark === "string" &&
                    estimation.otherExecutionCostRemark.trim().length > 0;
                  const label = showOtherRemark
                    ? `${item.name}（${estimation?.otherExecutionCostRemark?.trim()}）`
                    : item.name;

                  return (
                    <li key={item.costTypeOptionId}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        <Form.Item
                          name={["executionCostItems", index, "costTypeOptionId"]}
                          hidden
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item name={["executionCostItems", index, "name"]} hidden>
                          <Input />
                        </Form.Item>
                        <Typography.Text>{label}</Typography.Text>
                        <Form.Item
                          name={["executionCostItems", index, "budgetAmount"]}
                          style={{ marginBottom: 0, width: 320 }}
                        >
                          <InputNumber
                            min={0}
                            precision={2}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Typography.Text type="secondary">
                该测算没有执行费用类型
              </Typography.Text>
            )}
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const suggested = fromMoneyCents(
                sumBudgetAmountCents(
                  getFieldValue("executionCostItems") as
                    | PricingCostItemFormRow[]
                    | undefined,
                ),
              );
              return (
                <Form.Item
                  label="执行费用成本"
                  extra={`执行费用明细加总：${roundMoney(suggested)}`}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: "100%" }}
                    value={roundMoney(suggested)}
                    disabled
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm
          title="报价与利润"
          onValuesChange={(_changedValues, allValues) => {
            setDraftValues((prev) => ({ ...prev, ...allValues }));
          }}
        >
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const plannedMiddleOfficeCostCents = toMoneyCents(
                draftValues.plannedMiddleOfficeCost,
              );
              const plannedLaborCostCents = toMoneyCents(
                draftValues.plannedLaborCost,
              );
              const executionCostCents = toMoneyCents(
                draftValues.executionCost,
              );
              const agencyFeeRate = toMoney(draftValues.agencyFeeRate);
              const outsourceCostCents = toMoneyCents(
                getProjectOutsourceTotal(draftValues.outsourceItems),
              );
              const rentCostCents = toMoneyCents(draftValues.rentCost);
              const bottomLinePriceCents = toMoneyCents(
                getFieldValue("bottomLinePrice"),
              );
              const targetPriceCents = toMoneyCents(
                getFieldValue("targetPrice"),
              );
              const clientQuoteValue = toNullableMoney(estimation?.clientBudget);
              const hasClientQuote = clientQuoteValue !== null;
              const clientQuoteCents = toMoneyCents(clientQuoteValue ?? 0);
              const clientQuoteAgencyFeeCents = calculateAgencyFeeAmountCents(
                clientQuoteCents,
                agencyFeeRate,
              );
              const bottomLineAgencyFeeCents = calculateAgencyFeeAmountCents(
                bottomLinePriceCents,
                agencyFeeRate,
              );
              const targetAgencyFeeCents = calculateAgencyFeeAmountCents(
                targetPriceCents,
                agencyFeeRate,
              );
              const suggestedMiddleOfficeCostCents = toMoneyCents(
                pricingMode === "target"
                  ? draftValues.plannedMiddleOfficeCost
                  : draftValues.suggestedMiddleOfficeCost,
              );
              const suggestedLaborCostCents = toMoneyCents(
                pricingMode === "target"
                  ? draftValues.plannedLaborCost
                  : draftValues.suggestedLaborCost,
              );
              const profit = fromMoneyCents(
                targetPriceCents -
                  suggestedMiddleOfficeCostCents -
                  suggestedLaborCostCents -
                  executionCostCents -
                  outsourceCostCents -
                  targetAgencyFeeCents -
                  rentCostCents,
              );
              const bottomProfit = fromMoneyCents(
                bottomLinePriceCents -
                  plannedMiddleOfficeCostCents -
                  plannedLaborCostCents -
                  executionCostCents -
                  outsourceCostCents -
                  bottomLineAgencyFeeCents -
                  rentCostCents,
              );
              const plannedBreakEven = fromMoneyCents(
                outsourceCostCents +
                  plannedLaborCostCents +
                  plannedMiddleOfficeCostCents +
                  bottomLineAgencyFeeCents +
                  rentCostCents +
                  executionCostCents,
              );
              const suggestedBreakEven = fromMoneyCents(
                outsourceCostCents +
                  suggestedLaborCostCents +
                  suggestedMiddleOfficeCostCents +
                  targetAgencyFeeCents +
                  rentCostCents +
                  executionCostCents,
              );
              const clientQuoteProfit = fromMoneyCents(
                clientQuoteCents -
                  suggestedMiddleOfficeCostCents -
                  suggestedLaborCostCents -
                  executionCostCents -
                  outsourceCostCents -
                  clientQuoteAgencyFeeCents -
                  rentCostCents,
              );
              const clientQuoteBreakEven = fromMoneyCents(
                outsourceCostCents +
                  suggestedLaborCostCents +
                  suggestedMiddleOfficeCostCents +
                  clientQuoteAgencyFeeCents +
                  rentCostCents +
                  executionCostCents,
              );
              const hasBottomLinePrice =
                getFieldValue("bottomLinePrice") !== null &&
                getFieldValue("bottomLinePrice") !== undefined &&
                String(getFieldValue("bottomLinePrice")) !== "";
              const hasTargetPrice =
                getFieldValue("targetPrice") !== null &&
                getFieldValue("targetPrice") !== undefined &&
                String(getFieldValue("targetPrice")) !== "";
              const bottomLineCostRatio =
                hasBottomLinePrice && bottomLinePriceCents > 0
                  ? `${Math.round(
                      (plannedBreakEven /
                        fromMoneyCents(bottomLinePriceCents)) *
                        100,
                    )}%`
                  : "-";
              const targetCostRatio =
                hasTargetPrice && targetPriceCents > 0
                  ? `${Math.round(
                      (suggestedBreakEven / fromMoneyCents(targetPriceCents)) *
                        100,
                    )}%`
                  : "-";
              const clientCostRatio =
                hasClientQuote && clientQuoteCents > 0
                  ? `${Math.round(
                      (clientQuoteBreakEven /
                        fromMoneyCents(clientQuoteCents)) *
                        100,
                    )}%`
                  : "-";
              const bottomLineLaborRate =
                hasBottomLinePrice && bottomLinePriceCents > 0
                  ? (plannedLaborCostCents / bottomLinePriceCents) * 100
                  : null;
              const targetLaborRate =
                hasTargetPrice && targetPriceCents > 0
                  ? (suggestedLaborCostCents / targetPriceCents) * 100
                  : null;
              const clientLaborRate =
                hasClientQuote && clientQuoteCents > 0
                  ? (suggestedLaborCostCents / clientQuoteCents) * 100
                  : null;
              const bottomLineReferenceCost =
                hasBottomLinePrice && bottomLinePriceCents > 0
                  ? fromMoneyCents(
                      Math.round(
                        bottomLinePriceCents * (projectCostBaselineRatio / 100),
                      ),
                    )
                  : null;
              const targetReferenceCost =
                hasTargetPrice && targetPriceCents > 0
                  ? fromMoneyCents(
                      Math.round(
                        targetPriceCents * (projectCostBaselineRatio / 100),
                      ),
                    )
                  : null;
              const clientQuoteReferenceCost =
                hasClientQuote && clientQuoteCents > 0
                  ? fromMoneyCents(
                      Math.round(
                        clientQuoteCents * (projectCostBaselineRatio / 100),
                      ),
                    )
                  : null;
              const renderCostRatioLine = (ratioText: string) => {
                const ratioValue = Number.parseFloat(ratioText);
                const exceededBaseline =
                  Number.isFinite(ratioValue) &&
                  ratioValue > projectCostBaselineRatio;

                return (
                  <>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`总费用占比：${ratioText}`}
                    </Typography.Text>
                    {exceededBaseline ? (
                      <Typography.Text
                        style={{
                          fontSize: 13,
                          color: "#ff4d4f",
                          fontWeight: 600,
                        }}
                      >
                        （成本超过基准线）
                      </Typography.Text>
                    ) : null}
                  </>
                );
              };
              const renderCostBreakdown = (
                outsourceCost: number,
                laborCost: number,
                laborRate: number | null,
                middleOfficeCost: number,
                rentCost: number,
                executionCost: number,
                agencyFeeCost: number,
              ) => {
                const laborRateExceeded =
                  typeof laborRate === "number" &&
                  laborRate > laborCostRateWarningLine;

                return (
                  <div
                    style={{
                      marginTop: 4,
                      marginBottom: 4,
                      paddingLeft: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 外包成本：${formatMoneyText(outsourceCost)}`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 人力成本：${formatMoneyText(laborCost)}`}
                      {typeof laborRate === "number" ? "（人力成本率 " : ""}
                      {typeof laborRate === "number" ? (
                        <span
                          style={{
                            color: laborRateExceeded ? "#ff4d4f" : undefined,
                            fontWeight: laborRateExceeded ? 700 : undefined,
                          }}
                        >
                          {formatPercent(laborRate)}
                        </span>
                      ) : null}
                      {typeof laborRate === "number" ? "）" : ""}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 中台成本：${formatMoneyText(middleOfficeCost)}`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 租金成本：${formatMoneyText(rentCost)}`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 执行成本：${formatMoneyText(executionCost)}`}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {`- 中介费：${formatMoneyText(agencyFeeCost)}`}
                    </Typography.Text>
                  </div>
                );
              };

              return (
                <div>
                  {pricingMode === "range" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        columnGap: 24,
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <Form.Item
                          label="最低报价"
                          name="bottomLinePrice"
                          rules={[
                            { required: true, message: "请输入最低报价" },
                          ]}
                        >
                          <InputNumber
                            min={0}
                            precision={2}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <div style={{ marginTop: -16, marginBottom: 16 }}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`盈亏平衡：${roundMoney(plannedBreakEven).toFixed(2)}元，成本基准参考：${typeof bottomLineReferenceCost === "number" ? `${roundMoney(bottomLineReferenceCost).toFixed(2)}元` : "-"}`}
                          </Typography.Text>
                          <br />
                          {renderCostBreakdown(
                            fromMoneyCents(outsourceCostCents),
                            fromMoneyCents(plannedLaborCostCents),
                            bottomLineLaborRate,
                            fromMoneyCents(plannedMiddleOfficeCostCents),
                            fromMoneyCents(rentCostCents),
                            fromMoneyCents(executionCostCents),
                            fromMoneyCents(bottomLineAgencyFeeCents),
                          )}
                          {renderCostRatioLine(bottomLineCostRatio)}
                          <br />
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`利润：${hasBottomLinePrice ? formatMoneyText(bottomProfit) : "-"}`}
                          </Typography.Text>
                        </div>
                      </div>
                      <div style={{ width: 340 }}>
                        <Form.Item
                          label="理想报价"
                          name="targetPrice"
                          rules={[{ required: true, message: "请输入报价" }]}
                        >
                          <InputNumber
                            min={0}
                            precision={2}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <div style={{ marginTop: -16, marginBottom: 16 }}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`盈亏平衡：${roundMoney(suggestedBreakEven).toFixed(2)}元，成本基准参考：${typeof targetReferenceCost === "number" ? `${roundMoney(targetReferenceCost).toFixed(2)}元` : "-"}`}
                          </Typography.Text>
                          <br />
                          {renderCostBreakdown(
                            fromMoneyCents(outsourceCostCents),
                            fromMoneyCents(suggestedLaborCostCents),
                            targetLaborRate,
                            fromMoneyCents(suggestedMiddleOfficeCostCents),
                            fromMoneyCents(rentCostCents),
                            fromMoneyCents(executionCostCents),
                            fromMoneyCents(targetAgencyFeeCents),
                          )}
                          {renderCostRatioLine(targetCostRatio)}
                          <br />
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`利润：${hasTargetPrice ? formatMoneyText(profit) : "-"}`}
                          </Typography.Text>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        columnGap: 24,
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <Form.Item label="客户报价">
                          <InputNumber
                            precision={2}
                            style={{ width: "100%" }}
                            value={
                              hasClientQuote
                                ? roundMoney(fromMoneyCents(clientQuoteCents))
                                : undefined
                            }
                            disabled
                          />
                        </Form.Item>
                        <div style={{ marginTop: -16, marginBottom: 16 }}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`盈亏平衡：${roundMoney(clientQuoteBreakEven).toFixed(2)}元，成本基准参考：${typeof clientQuoteReferenceCost === "number" ? `${roundMoney(clientQuoteReferenceCost).toFixed(2)}元` : "-"}`}
                          </Typography.Text>
                          <br />
                          {renderCostBreakdown(
                            fromMoneyCents(outsourceCostCents),
                            fromMoneyCents(suggestedLaborCostCents),
                            clientLaborRate,
                            fromMoneyCents(suggestedMiddleOfficeCostCents),
                            fromMoneyCents(rentCostCents),
                            fromMoneyCents(executionCostCents),
                            fromMoneyCents(clientQuoteAgencyFeeCents),
                          )}
                          {renderCostRatioLine(clientCostRatio)}
                          <br />
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`利润：${hasClientQuote ? formatMoneyText(clientQuoteProfit) : "-"}`}
                          </Typography.Text>
                        </div>
                      </div>
                      <div>
                        <Form.Item
                          label="建议报价"
                          name="targetPrice"
                          rules={[{ required: true, message: "请输入建议报价" }]}
                        >
                          <InputNumber
                            min={0}
                            precision={2}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <div style={{ marginTop: -16, marginBottom: 16 }}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`盈亏平衡：${roundMoney(suggestedBreakEven).toFixed(2)}元，成本基准参考：${typeof targetReferenceCost === "number" ? `${roundMoney(targetReferenceCost).toFixed(2)}元` : "-"}`}
                          </Typography.Text>
                          <br />
                          {renderCostBreakdown(
                            fromMoneyCents(outsourceCostCents),
                            fromMoneyCents(suggestedLaborCostCents),
                            targetLaborRate,
                            fromMoneyCents(suggestedMiddleOfficeCostCents),
                            fromMoneyCents(rentCostCents),
                            fromMoneyCents(executionCostCents),
                            fromMoneyCents(targetAgencyFeeCents),
                          )}
                          {renderCostRatioLine(targetCostRatio)}
                          <br />
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 14 }}
                          >
                            {`利润：${hasTargetPrice ? formatMoneyText(profit) : "-"}`}
                          </Typography.Text>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>
      </StepsForm>
    </Modal>
  );
};

export default ProjectPricingStrategyModal;
