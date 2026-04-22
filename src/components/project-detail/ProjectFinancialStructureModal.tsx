"use client";

import { Children, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { StepsForm } from "@ant-design/pro-components";
import type { ProFormInstance } from "@ant-design/pro-components";
import OutsourceItemsFormList from "@/components/project-detail/OutsourceItemsFormList";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { toNullableTrimmedString } from "@/lib/toNullableTrimmedString";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
  normalizeProjectOutsourceAmount,
  normalizeProjectOutsourceItems,
} from "@/lib/project-outsource";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project } from "@/types/projectDetail";
import { EXECUTION_COST_FIELD } from "@/lib/execution-cost";

type ExistingStructure = {
  id: string;
  projectId: string;
  estimationId?: string | null;
  contractAmountTaxIncluded?: number | null;
  laborCost: number;
  rentCost: number;
  middleOfficeCost: number;
  executionCost: number;
  agencyFeeRate: number;
  totalCost: number;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
  outsourceRemark?: string | null;
  executionCostItems?: Array<{
    id: string;
    costTypeOptionId: string;
    budgetAmount: number;
    remark?: string | null;
    costTypeOption?: {
      id?: string;
      value?: string | null;
    } | null;
  }>;
};

type ExecutionCostItemFormRow = {
  costTypeOptionId: string;
  budgetAmount?: number;
};

type FormValues = {
  hasOutsource?: boolean;
  laborCost?: number;
  rentCost?: number;
  middleOfficeCost?: number;
  outsourceItems?: Array<{
    id?: string;
    type?: string;
    amount?: number;
  }>;
  outsourceRemark?: string;
  executionCost?: number;
  agencyFeeRate?: number;
  totalCost?: number;
  executionCostItems?: ExecutionCostItemFormRow[];
};

export type ImportedFinancialStructurePrefill = {
  incomeTaxIncluded?: number;
  outsourceAmount?: number;
  laborCost?: number;
  rentCost?: number;
  middleOfficeCost?: number;
  executionCostItems?: Array<{
    label: string;
    amount: number;
  }>;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  estimation?: Project["latestInitiation"];
  existingStructure?: ExistingStructure | null;
  importedPrefill?: ImportedFinancialStructurePrefill | null;
  onSaved?: () => void | Promise<void>;
};

type PricingStrategyExecutionCostItem = {
  costTypeOptionId?: string | null;
  budgetAmount?: number | null;
  costTypeOption?: {
    value?: string | null;
  } | null;
};

type PricingStrategyResponse = {
  executionCostItems?: PricingStrategyExecutionCostItem[] | null;
};

const MODAL_FORM_MAX_HEIGHT = "calc(100vh - 220px)";
  const toMoney = (value: unknown) => {
    if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};


const roundMoney = (value: unknown) => {
  const amount = toMoney(value);
  return Math.round(amount * 100) / 100;
};

const calculateMiddleOfficeCost = (
  estimatedDuration: number | undefined,
  averageMonthlyCost: number,
  baseDays: number,
) => {
  const duration = Number(estimatedDuration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  return roundMoney((averageMonthlyCost / baseDays) * duration);
};

const parseContractAmount = (estimation?: Project["latestInitiation"]) => {
  if (typeof estimation?.contractAmount === "number") {
    return estimation.contractAmount;
  }
  if (typeof estimation?.clientBudget === "string") {
    const normalized = estimation.clientBudget.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeExecutionCostLabel = (value: string) =>
  value
    .trim()
    .replace(/[\s:：]/g, "")
    .replace(/费用/g, "")
    .replace(/费/g, "")
    .toLowerCase();

const ProjectFinancialStructureModal = ({
  open,
  onCancel,
  projectId,
  estimation,
  existingStructure,
  importedPrefill,
  onSaved,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [fallbackExecutionCostDefinitions, setFallbackExecutionCostDefinitions] =
    useState<Array<{ id: string; label: string }>>([]);
  const [pricingExecutionCostPrefill, setPricingExecutionCostPrefill] = useState<{
    byId: Record<string, number>;
    byLabel: Record<string, number>;
  }>({ byId: {}, byLabel: {} });
  const formRef = useRef<ProFormInstance<FormValues> | null>(null);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
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

  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  useEffect(() => {
    if (!open || !projectId || existingStructure?.id) return;

    let cancelled = false;
    const fetchPricingStrategyExecutionCosts = async () => {
      try {
        // Prefill from the latest pricing strategy of the project (regardless of estimation).
        // If the latest pricing strategy doesn't include a cost type, keep it empty.
        const query = new URLSearchParams({ projectId });
	        const res = await fetch(
	          `/api/project-pricing-strategies?${query.toString()}`,
	          { cache: "no-store" },
	        );
	        if (!res.ok) {
	          if (!cancelled)
	            setPricingExecutionCostPrefill({ byId: {}, byLabel: {} });
	          return;
	        }

        const rows = (await res.json()) as PricingStrategyResponse[];
        const latest = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const byId: Record<string, number> = {};
        const byLabel: Record<string, number> = {};

        for (const item of latest?.executionCostItems ?? []) {
          const optionId = String(item?.costTypeOptionId ?? "").trim();
          const label = String(item?.costTypeOption?.value ?? "").trim();
          if (
            typeof item?.budgetAmount === "number" &&
            Number.isFinite(item.budgetAmount)
          ) {
            if (optionId) byId[optionId] = item.budgetAmount;
            if (label) byLabel[label] = item.budgetAmount;
          }
        }

        if (!cancelled) {
          setPricingExecutionCostPrefill({ byId, byLabel });
        }
      } catch {
        if (!cancelled) setPricingExecutionCostPrefill({ byId: {}, byLabel: {} });
      }
    };

    void fetchPricingStrategyExecutionCosts();
    return () => {
      cancelled = true;
    };
  }, [existingStructure?.id, open, projectId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadExecutionCostOptions = async () => {
      const query = new URLSearchParams({ field: EXECUTION_COST_FIELD });
      const res = await fetch(`/api/select-options?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("FETCH_EXECUTION_COST_OPTIONS_FAILED");
      }
      const rows = (await res.json()) as Array<{
        id?: string;
        value?: string | null;
      }>;
      return (rows ?? [])
        .map((item) => ({
          id: String(item.id ?? "").trim(),
          label: String(item.value ?? "").trim(),
        }))
        .filter((item) => item.id && item.label);
    };

    const fetchExecutionCostOptions = async () => {
      try {
        let definitions = await loadExecutionCostOptions();
        const importedPositiveLabels = (importedPrefill?.executionCostItems ?? [])
          .filter(
            (item) =>
              typeof item?.amount === "number" &&
              Number.isFinite(item.amount) &&
              item.amount > 0,
          )
          .map((item) => String(item.label ?? "").trim())
          .filter(Boolean);

        if (importedPositiveLabels.length > 0) {
          const existingNormalizedLabels = new Set(
            definitions.map((item) => normalizeExecutionCostLabel(item.label)),
          );
          const missingLabels = importedPositiveLabels.filter((label) => {
            const normalizedLabel = normalizeExecutionCostLabel(label);
            if (!normalizedLabel) return false;
            return !existingNormalizedLabels.has(normalizedLabel);
          });

          if (missingLabels.length > 0) {
            await Promise.all(
              missingLabels.map((label) =>
                fetch("/api/select-options", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    field: EXECUTION_COST_FIELD,
                    value: label,
                  }),
                }),
              ),
            );
            definitions = await loadExecutionCostOptions();
          }
        }

        if (cancelled) return;
        setFallbackExecutionCostDefinitions(definitions);
      } catch {
        if (!cancelled) setFallbackExecutionCostDefinitions([]);
      }
    };

    void fetchExecutionCostOptions();
    return () => {
      cancelled = true;
    };
  }, [importedPrefill?.executionCostItems, open]);

  const estimatedLaborCost = useMemo(
    () =>
      roundMoney(
        (estimation?.members ?? []).reduce(
          (sum, member) =>
            sum +
            (typeof member.laborCostSnapshot === "number"
              ? member.laborCostSnapshot
              : 0),
          0,
        ),
      ),
    [estimation?.members],
  );
  const estimatedOutsourceCost = useMemo(
    () => roundMoney(getProjectOutsourceTotal(estimation?.outsourceItems)),
    [estimation?.outsourceItems],
  );
  const estimatedMiddleOfficeCost = useMemo(
    () =>
      calculateMiddleOfficeCost(
        estimation?.estimatedDuration,
        middleOfficeAverageMonthlyCost,
        middleOfficeBaseDays,
      ),
    [
      estimation?.estimatedDuration,
      middleOfficeAverageMonthlyCost,
      middleOfficeBaseDays,
    ],
  );
  const estimatedRentCost = useMemo(
    () =>
      roundMoney(
        (estimation?.members ?? []).reduce(
          (sum, member) =>
            sum +
            (typeof member.rentCostSnapshot === "number"
              ? member.rentCostSnapshot
              : 0),
          0,
        ),
      ),
    [estimation?.members],
  );
  const contractAmount = useMemo(
    () =>
      typeof existingStructure?.contractAmountTaxIncluded === "number"
        ? existingStructure.contractAmountTaxIncluded
        :
      typeof importedPrefill?.incomeTaxIncluded === "number"
        ? importedPrefill.incomeTaxIncluded
        : parseContractAmount(estimation),
    [estimation, existingStructure, importedPrefill],
  );
  const importedPrefillKey = useMemo(
    () => JSON.stringify(importedPrefill ?? {}),
    [importedPrefill],
  );
  const hasImportedExecutionPrefill = Boolean(importedPrefill);

  const estimationExecutionCostItemDefinitions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const item of estimation?.executionCostTypes ?? []) {
      if (!item?.id) continue;
      const label = item.value || "未命名费用类型";
      if (!map.has(item.id)) {
        map.set(item.id, { id: item.id, label });
      }
    }

    return Array.from(map.values());
  }, [estimation?.executionCostTypes]);

  const executionCostItemDefinitions = useMemo(() => {
    const baseDefinitions =
      estimationExecutionCostItemDefinitions.length > 0
        ? estimationExecutionCostItemDefinitions
        : fallbackExecutionCostDefinitions;
    const mergedDefinitions = Array.from(
      new Map(
        [...baseDefinitions, ...fallbackExecutionCostDefinitions].map((item) => [
          item.id,
          item,
        ]),
      ).values(),
    );
    if (!hasImportedExecutionPrefill) return baseDefinitions;

    const definitionByNormalizedLabel = new Map<string, { id: string; label: string }>();
    for (const definition of mergedDefinitions) {
      definitionByNormalizedLabel.set(
        normalizeExecutionCostLabel(definition.label),
        definition,
      );
    }

    const selected = new Map<string, { id: string; label: string }>();
    for (const item of importedPrefill?.executionCostItems ?? []) {
      if (typeof item?.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0) {
        continue;
      }
      const normalizedLabel = normalizeExecutionCostLabel(String(item.label ?? ""));
      if (!normalizedLabel) continue;
      const matched = definitionByNormalizedLabel.get(normalizedLabel);
      if (matched) {
        selected.set(matched.id, matched);
      }
    }
    return Array.from(selected.values());
  }, [
    estimationExecutionCostItemDefinitions,
    fallbackExecutionCostDefinitions,
    hasImportedExecutionPrefill,
    importedPrefill?.executionCostItems,
  ]);

  const initialValues = useMemo<FormValues>(() => {
    const getPrefillAmount = (id: string, label: string) =>
      pricingExecutionCostPrefill.byId[id] ?? pricingExecutionCostPrefill.byLabel[label];
    const importedExecutionAmountByExactLabel = new Map<string, number>();
    const importedExecutionAmountByNormalizedLabel = new Map<string, number>();
    for (const item of importedPrefill?.executionCostItems ?? []) {
      const normalizedLabel = String(item.label ?? "").trim();
      if (!normalizedLabel) continue;
      if (typeof item.amount !== "number" || !Number.isFinite(item.amount)) continue;
      importedExecutionAmountByExactLabel.set(normalizedLabel, item.amount);
      importedExecutionAmountByNormalizedLabel.set(
        normalizeExecutionCostLabel(normalizedLabel),
        item.amount,
      );
    }
    const getImportedExecutionAmount = (label: string) => {
      const exact = importedExecutionAmountByExactLabel.get(label);
      if (typeof exact === "number") return exact;
      return importedExecutionAmountByNormalizedLabel.get(
        normalizeExecutionCostLabel(label),
      );
    };

    if (existingStructure) {
      const initialLaborCost = Number(estimatedLaborCost ?? 0);
      const initialRentCost = Number(estimatedRentCost ?? 0);
      const initialMiddleOfficeCost = Number(estimatedMiddleOfficeCost ?? 0);
      const initialOutsourceCost = Number(estimatedOutsourceCost ?? 0);
      const initialExecutionCost = Number(existingStructure.executionCost ?? 0);
      const initialTotalCost = roundMoney(
        initialLaborCost +
          initialRentCost +
          initialMiddleOfficeCost +
          initialOutsourceCost +
          initialExecutionCost +
          (typeof estimation?.agencyFeeRate === "number"
            ? estimation.agencyFeeRate
            : existingStructure.agencyFeeRate),
      );

      const importedOutsourceAmount = importedPrefill?.outsourceAmount;
      const hasImportedOutsource =
        typeof importedOutsourceAmount === "number" &&
        Number.isFinite(importedOutsourceAmount) &&
        importedOutsourceAmount > 0;

      return {
        hasOutsource:
          hasImportedOutsource || (estimation?.outsourceItems?.length ?? 0) > 0,
        laborCost:
          typeof importedPrefill?.laborCost === "number"
            ? importedPrefill.laborCost
            : initialLaborCost,
        rentCost:
          typeof importedPrefill?.rentCost === "number"
            ? importedPrefill.rentCost
            : initialRentCost,
        middleOfficeCost:
          typeof importedPrefill?.middleOfficeCost === "number"
            ? importedPrefill.middleOfficeCost
            : initialMiddleOfficeCost,
        outsourceItems: hasImportedOutsource
          ? [{ type: "", amount: importedOutsourceAmount }]
          : (estimation?.outsourceItems ?? []).map((item) => ({
          id: item.id,
          type: item.type,
          amount: normalizeProjectOutsourceAmount(item.amount) ?? undefined,
            })),
        outsourceRemark:
          typeof existingStructure.outsourceRemark === "string"
            ? existingStructure.outsourceRemark
            : estimation?.outsourceRemark ?? "",
        executionCost: initialExecutionCost,
        agencyFeeRate:
          typeof estimation?.agencyFeeRate === "number"
            ? estimation.agencyFeeRate
            : existingStructure.agencyFeeRate,
        totalCost: initialTotalCost,
        executionCostItems: executionCostItemDefinitions.map((definition) => {
          const existingItem = (existingStructure.executionCostItems ?? []).find(
            (item) => item.costTypeOptionId === definition.id,
          );
          return {
            costTypeOptionId: definition.id,
            budgetAmount: getImportedExecutionAmount(definition.label) ??
              existingItem?.budgetAmount ??
              (hasImportedExecutionPrefill
                ? undefined
                : getPrefillAmount(definition.id, definition.label)),
          };
        }),
      };
    }

    const importedOutsourceAmount = importedPrefill?.outsourceAmount;
    const hasImportedOutsource =
      typeof importedOutsourceAmount === "number" &&
      Number.isFinite(importedOutsourceAmount) &&
      importedOutsourceAmount > 0;

    return {
      hasOutsource: hasImportedOutsource || (estimation?.outsourceItems?.length ?? 0) > 0,
      outsourceItems: hasImportedOutsource
        ? [{ type: "", amount: importedOutsourceAmount }]
        : (estimation?.outsourceItems ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        amount: normalizeProjectOutsourceAmount(item.amount) ?? undefined,
          })),
      outsourceRemark: estimation?.outsourceRemark ?? "",
      laborCost:
        typeof importedPrefill?.laborCost === "number"
          ? importedPrefill.laborCost
          : estimatedLaborCost,
      rentCost:
        typeof importedPrefill?.rentCost === "number"
          ? importedPrefill.rentCost
          : estimatedRentCost,
      middleOfficeCost:
        typeof importedPrefill?.middleOfficeCost === "number"
          ? importedPrefill.middleOfficeCost
          : estimatedMiddleOfficeCost,
      executionCost: undefined,
      agencyFeeRate:
        typeof estimation?.agencyFeeRate === "number"
          ? estimation.agencyFeeRate
          : undefined,
      totalCost: undefined,
      executionCostItems: executionCostItemDefinitions.map((item) => ({
        costTypeOptionId: item.id,
        budgetAmount:
          getImportedExecutionAmount(item.label) ??
          (hasImportedExecutionPrefill
            ? undefined
            : getPrefillAmount(item.id, item.label)),
      })),
    };
  }, [
    executionCostItemDefinitions,
    estimation,
    estimatedLaborCost,
    estimatedRentCost,
    estimatedMiddleOfficeCost,
    estimatedOutsourceCost,
    existingStructure,
    hasImportedExecutionPrefill,
    importedPrefill,
    pricingExecutionCostPrefill,
  ]);

  useEffect(() => {
    if (!open) return;
    formRef.current?.setFieldsValue(initialValues);
  }, [initialValues, open]);

  useEffect(() => {
    // StepsForm can mount fields lazily. Ensure execution cost item amounts are prefilled
    // once we have the latest pricing strategy numbers. Do not override user input.
    if (!open || existingStructure?.id || hasImportedExecutionPrefill) return;
    if (executionCostItemDefinitions.length === 0) return;
    if (
      Object.keys(pricingExecutionCostPrefill.byId).length === 0 &&
      Object.keys(pricingExecutionCostPrefill.byLabel).length === 0
    ) {
      return;
    }

    const currentRows = (formRef.current?.getFieldValue("executionCostItems") ??
      []) as ExecutionCostItemFormRow[];
    const nextRows = executionCostItemDefinitions.map((definition, index) => {
      const existing = currentRows[index];
      const currentAmount = existing?.budgetAmount;
      const shouldKeep =
        typeof currentAmount === "number" && Number.isFinite(currentAmount);
      const suggested =
        pricingExecutionCostPrefill.byId[definition.id] ??
        pricingExecutionCostPrefill.byLabel[definition.label];

      return {
        costTypeOptionId: definition.id,
        budgetAmount:
          shouldKeep ? currentAmount : typeof suggested === "number" ? suggested : undefined,
      };
    });

    formRef.current?.setFieldsValue({ executionCostItems: nextRows });
  }, [
    executionCostItemDefinitions,
    existingStructure?.id,
    hasImportedExecutionPrefill,
    open,
    pricingExecutionCostPrefill,
  ]);

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

  return (
    <>
      {contextHolder}
      <Modal
        title={existingStructure ? "更新财务结构" : "新增财务结构"}
        open={open}
        onCancel={onCancel}
        footer={null}
        destroyOnHidden
        width={960}
        afterOpenChange={(nextOpen) => {
          if (nextOpen) {
            formRef.current?.resetFields();
            formRef.current?.setFieldsValue(initialValues);
            return;
          }
          formRef.current?.resetFields();
        }}
        styles={{
          body: {
            overflow: "hidden",
          },
        }}
      >
            <StepsForm<FormValues>
        formRef={formRef}
        key={`${existingStructure?.id ?? "new-financial-structure"}-${estimation?.id ?? "no-estimation"}-${importedPrefillKey}`}
        formProps={{ layout: "vertical" }}
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
          if (submitting) return false;

          const executionCostRows = values.executionCostItems ?? [];
          const hasMissingExecutionBudget = executionCostItemDefinitions.some(
            (definition) => {
              const row = executionCostRows.find(
                (item) => item.costTypeOptionId === definition.id,
              );
              return (
                typeof row?.budgetAmount !== "number" ||
                !Number.isFinite(row.budgetAmount)
              );
            },
          );
          if (hasMissingExecutionBudget) {
            notifyError("请填写全部执行费用预算金额");
            return false;
          }

          const laborCost = roundMoney(values.laborCost);
          const rentCost = roundMoney(values.rentCost);
          const middleOfficeCost = roundMoney(values.middleOfficeCost);
          const hasOutsource = Boolean(values.hasOutsource);
          const outsourceItems = hasOutsource
            ? normalizeProjectOutsourceItems(values.outsourceItems)
            : [];
          if (hasOutsource && outsourceItems.length === 0) {
            notifyError("请选择外包并至少填写一条外包明细");
            setSubmitting(false);
            return false;
          }
          const outsourceCost = roundMoney(getProjectOutsourceTotal(outsourceItems));
          const outsourceRemark = hasOutsource
            ? toNullableTrimmedString(values.outsourceRemark)
            : null;

          const executionCostItems = executionCostItemDefinitions
            .map((definition) => {
              const row = executionCostRows.find(
                (item) => item.costTypeOptionId === definition.id,
              );
              return {
                costTypeOptionId: definition.id,
                budgetAmount: roundMoney(row?.budgetAmount),
              };
            })
            .filter(
              (item) =>
                typeof item.budgetAmount === "number" &&
                Number.isFinite(item.budgetAmount) &&
                item.budgetAmount > 0,
            );
          const executionCost = roundMoney(
            executionCostItems.reduce((sum, item) => sum + toMoney(item.budgetAmount), 0),
          );
          const agencyFeeRate = roundMoney(values.agencyFeeRate);
          const agencyFeeAmount = roundMoney((contractAmount * agencyFeeRate) / 100);
          const totalCost = roundMoney(
            laborCost +
              rentCost +
              middleOfficeCost +
              outsourceCost +
              executionCost +
              agencyFeeAmount,
          );

          setSubmitting(true);
          try {
            const isUpdate = Boolean(existingStructure?.id);
            const res = await fetch(
              isUpdate
                ? `/api/project-financial-structures/${existingStructure?.id}`
                : "/api/project-financial-structures",
              {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId,
                  ...(estimation?.id ? { estimationId: estimation.id } : {}),
                  contractAmountTaxIncluded: contractAmount,
                  laborCost,
                  rentCost,
                  middleOfficeCost,
                  executionCost,
                  agencyFeeRate,
                  totalCost,
                  outsourceItems,
                  outsourceRemark,
                  executionCostItems,
                }),
              },
            );

            if (!res.ok) {
              if (!isUpdate && res.status === 409) {
                notifyError("该立项申请已存在财务结构");
              } else {
                notifyError(isUpdate ? "更新财务结构失败" : "新增财务结构失败");
              }
              setSubmitting(false);
              return false;
            }

            notifySuccess(isUpdate ? "更新财务结构成功" : "新增财务结构成功");
            await onSaved?.();
            setSubmitting(false);
            onCancel();
            return true;
          } catch {
            notifyError(existingStructure ? "更新财务结构失败" : "新增财务结构失败");
            setSubmitting(false);
            return false;
          }
        }}
        submitter={{
          searchConfig: { submitText: "提交" },
          render: (_props, dom) => (
            <Space size={12}>{Children.toArray(dom)}</Space>
          ),
          submitButtonProps: {
            loading: submitting,
            disabled: submitting,
          },
        }}
      >
        <StepsForm.StepForm title="基础信息">
          <Form.Item label="合同金额(含税)">
            <Input
              value={contractAmount > 0 ? contractAmount.toLocaleString("zh-CN") : "无"}
              readOnly
              disabled
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
              <Input disabled style={{ width: 64, textAlign: "center" }} value="%" />
            </Space.Compact>
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const agencyFeeAmount = roundMoney(
                (contractAmount * toMoney(getFieldValue("agencyFeeRate"))) / 100,
              );
              return (
                <Form.Item label="中介费">
                  <InputNumber
                    value={agencyFeeAmount}
                    disabled
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm title="外包成本">
          <Form.Item
            label="是否有外包"
            name="hasOutsource"
            initialValue={initialValues.hasOutsource}
            valuePropName="checked"
            layout="horizontal"
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
                []) as Array<{ type?: string; amount?: number }>;
              const outsourceTotal = roundMoney(
                getProjectOutsourceTotal(outsourceItems),
              );

                  return (
                    <>
                      <OutsourceItemsFormList
                        initialValue={initialValues.outsourceItems}
                        extra={
                          (estimation?.outsourceItems?.length ?? 0) > 0
                            ? `立项申请中已同步：${formatProjectOutsourceItemsText(estimation?.outsourceItems)}`
                            : "可录入多条外包明细"
                        }
                      />

                      <Form.Item
                        label="外包备注"
                        name="outsourceRemark"
                        initialValue={initialValues.outsourceRemark}
                      >
                        <Input.TextArea rows={3} placeholder="请输入外包备注" />
                      </Form.Item>

                  <div style={{ marginBottom: 8 }}>
                    <Typography.Text strong>{`外包成本：${outsourceTotal.toLocaleString("zh-CN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })} 元`}</Typography.Text>
                  </div>
                </>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm title="人力&中台成本">
          <Form.Item
            label="人力成本"
            name="laborCost"
            initialValue={initialValues.laborCost}
            rules={[{ required: true, message: "请输入人力成本" }]}
            extra={`计算方式：按成本测算-人员配置中，每个成员的(薪资 + 社保 + 公积金) / ${monthlyWorkdayBase} * 项目预估时长计算`}
          >
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="租金成本"
            name="rentCost"
            initialValue={initialValues.rentCost}
            rules={[{ required: true, message: "请输入租金成本" }]}
            extra={`计算方式：按系统参数中的(月工位费 + 月水电费) / ${monthlyWorkdayBase} * 项目预估时长计算`}
          >
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="中台成本"
            name="middleOfficeCost"
            initialValue={initialValues.middleOfficeCost}
            rules={[{ required: true, message: "请输入中台成本" }]}
            extra={`计算方式：按中台均值（${middleOfficeAverageMonthlyCost}元）/ ${middleOfficeBaseDays}天 * 项目预估时长计算`}
          >
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        </StepsForm.StepForm>

        <StepsForm.StepForm title="执行费用">
          <Form.Item label="执行费用明细" style={{ marginBottom: 20 }}>
            {executionCostItemDefinitions.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  paddingInlineStart: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {executionCostItemDefinitions.map((item, index) => (
                  <li key={item.id}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "170px minmax(220px, 1fr)",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <Typography.Text>{item.label}</Typography.Text>
                      <div>
                        <Form.Item
                          name={["executionCostItems", index, "costTypeOptionId"]}
                          initialValue={
                            initialValues.executionCostItems?.[index]?.costTypeOptionId
                          }
                          hidden
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          name={["executionCostItems", index, "budgetAmount"]}
                          initialValue={initialValues.executionCostItems?.[index]?.budgetAmount}
                          style={{ marginBottom: 0 }}
                          rules={[{ required: true, message: "请输入预算金额" }]}
                        >
                          <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                        </Form.Item>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography.Text type="secondary">
                暂无执行费用类型
              </Typography.Text>
            )}
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const suggestedExecutionCost = roundMoney(
                ((getFieldValue("executionCostItems") as ExecutionCostItemFormRow[]) ?? []).reduce(
                  (sum, item) => sum + toMoney(item.budgetAmount),
                  0,
                ),
              );

              return (
                <Form.Item label="执行费用成本">
                  <InputNumber
                    value={suggestedExecutionCost}
                    disabled
                    precision={2}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate
          >
            {({ getFieldValue }) => {
              const outsourceTotal = getProjectOutsourceTotal(
                getFieldValue("outsourceItems") as
                  | Array<{ type?: string; amount?: number }>
                  | undefined,
              );
              const total = roundMoney(
                  toMoney(getFieldValue("laborCost")) +
                  toMoney(getFieldValue("rentCost")) +
                  toMoney(getFieldValue("middleOfficeCost")) +
                  roundMoney((contractAmount * toMoney(getFieldValue("agencyFeeRate"))) / 100) +
                  outsourceTotal +
                  ((getFieldValue("executionCostItems") as ExecutionCostItemFormRow[]) ?? []).reduce(
                    (sum, item) => sum + toMoney(item.budgetAmount),
                    0,
                  ),
              );

              return (
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text type="secondary">成本合计</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    <Typography.Text strong>{`${total.toLocaleString("zh-CN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })} 元`}</Typography.Text>
                  </div>
                </div>
              );
            }}
          </Form.Item>
        </StepsForm.StepForm>
      </StepsForm>
    </Modal>
    </>
  );
};

export default ProjectFinancialStructureModal;
