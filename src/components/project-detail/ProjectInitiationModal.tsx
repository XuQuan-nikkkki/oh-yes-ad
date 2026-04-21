"use client";
import { toNullableTrimmedString } from "@/lib/toNullableTrimmedString";

import { useMemo, useRef, useState } from "react";
import {
  App,
  Form,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { StepsForm } from "@ant-design/pro-components";
import type { ProFormInstance } from "@ant-design/pro-components";
import OutsourceItemsFormList from "@/components/project-detail/OutsourceItemsFormList";
import ProjectEstimationMembersFormList, {
  type EstimationMemberFormRow,
} from "@/components/project-detail/ProjectEstimationMembersFormList";
import {
  getProjectOutsourceTotal,
  normalizeProjectOutsourceAmount,
  normalizeProjectOutsourceItems,
} from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";
import {
  AgencyFeeRateInput,
  ContractAmountInptut,
  EstimatedDurationInput,
  ExecutionCostTypesSelect,
  HasOutsourceCostSwitch,
  OtherExecutionCostRemarkInput,
  OutsourceRemarkInput,
} from "./ProjectCostBasisFormItems";

type Props = {
  open: boolean;
  onCancel: () => void;
  projectId: string;
  latestInitiation?: Project["latestBaselineCostEstimation"];
  prefillInitiation?: Project["latestBaselineCostEstimation"];
  employees: Employee[];
  onSaved?: (
    latestInitiation: Project["latestBaselineCostEstimation"],
  ) => Promise<void> | void;
};

type CostEstimationMemberFormRow = EstimationMemberFormRow;

type FormValues = {
  estimatedDuration?: number;
  agencyFeeRate?: number;
  hasClientBudget?: boolean;
  clientBudget?: string;
  contractAmount?: number;
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
  estimatedDuration?: number;
  agencyFeeRate: number | null;
  clientBudget: string | null;
  contractAmount: number | null;
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

type ProjectInitiationMutationResponse = {
  project?: {
    id?: string;
    latestInitiation?: Project["latestBaselineCostEstimation"];
    latestCostEstimation?: Project["latestBaselineCostEstimation"];
  };
};


const mapEstimationToFormValues = (
  estimation?: Project["latestBaselineCostEstimation"],
): FormValues => {
  const clientBudgetText =
    estimation?.clientBudget === undefined || estimation?.clientBudget === null
      ? ""
      : String(estimation.clientBudget);

  return {
    estimatedDuration: estimation?.estimatedDuration ?? undefined,
    agencyFeeRate: estimation?.agencyFeeRate ?? undefined,
    hasClientBudget: clientBudgetText.trim().length > 0,
    clientBudget: clientBudgetText,
    contractAmount: estimation?.contractAmount ?? undefined,
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
  };
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
) => {
  const normalizedOutsourceItems = values.hasOutsource
    ? normalizeProjectOutsourceItems(values.outsourceItems)
    : [];

  return {
    estimatedDuration: values.estimatedDuration,
    agencyFeeRate: values.agencyFeeRate ?? null,
    clientBudget: values.hasClientBudget
      ? toNullableTrimmedString(values.clientBudget)
      : null,
    contractAmount: values.contractAmount ?? null,
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
  estimation?: Project["latestBaselineCostEstimation"],
): CostEstimationSubmitPayload => ({
  estimatedDuration: estimation?.estimatedDuration ?? undefined,
  agencyFeeRate: estimation?.agencyFeeRate ?? null,
  clientBudget: toNullableTrimmedString(estimation?.clientBudget ?? null),
  contractAmount: estimation?.contractAmount ?? null,
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

const ProjectInitiationModal = ({
  open,
  onCancel,
  projectId,
  latestInitiation,
  prefillInitiation,
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
  const [memberDraftRows, setMemberDraftRows] = useState<
    CostEstimationMemberFormRow[]
  >([]);

  const effectivePrefillInitiation = latestInitiation ?? prefillInitiation;

  const initialValues = useMemo(() => {
    const values = mapEstimationToFormValues(effectivePrefillInitiation);
    // 首次创建立项申请时可预填成本测算字段，但项目金额必须手动录入。
    if (!latestInitiation?.id) {
      values.contractAmount = undefined;
    }
    return values;
  }, [effectivePrefillInitiation, latestInitiation?.id]);

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
          latestInitiation ? "更新立项申请" : "创建立项申请"
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
          key={`${latestInitiation?.id ?? "new-initiation"}-${effectivePrefillInitiation?.id ?? "no-prefill"}`}
          onFinish={async (values) => {
            if (submitting) return false;
            setSubmitting(true);

            const payload = toSubmitPayloadFromFormValues(values);

            if (values.hasOutsource && payload.outsourceItems.length === 0) {
              notifyError("有外包时请至少添加 1 条完整的外包项");
              setSubmitting(false);
              return false;
            }

            const isUpdate = Boolean(latestInitiation?.id);
            if (isUpdate) {
              const previousPayload = toSubmitPayloadFromEstimation(
                latestInitiation,
              );
              previousPayload.contractAmount =
                latestInitiation?.contractAmount ?? null;
              if (JSON.stringify(previousPayload) === JSON.stringify(payload)) {
                notifyInfo("未检测到变更，无需提交");
                setSubmitting(false);
                return false;
              }
            }

            const endpoint = isUpdate
              ? `/api/projects/${projectId}/project-initiations/${latestInitiation?.id}`
              : `/api/projects/${projectId}/project-initiations`;
            const method = isUpdate ? "PATCH" : "POST";

            try {
              const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                notifyError(isUpdate ? "更新立项申请失败" : "创建立项申请失败");
                setSubmitting(false);
                return false;
              }

              const data = (await res.json()) as ProjectInitiationMutationResponse;
              notifySuccess(isUpdate ? "更新立项申请成功" : "创建立项申请成功");
              setSubmitting(false);
              onCancel();
              const latestInitiationFromResponse =
                data.project?.latestInitiation ??
                data.project?.latestCostEstimation ??
                null;
              void Promise.resolve(
                onSaved?.(latestInitiationFromResponse),
              ).catch(() => {
                notifyError("刷新项目数据失败，请手动刷新页面");
              });
              return true;
            } catch {
              notifyError(isUpdate ? "更新立项申请失败" : "创建立项申请失败");
              setSubmitting(false);
              return false;
            }
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
            <EstimatedDurationInput />
            <AgencyFeeRateInput />
            <ContractAmountInptut name="contractAmount" />
          </StepsForm.StepForm>

          <StepsForm.StepForm title="人员配置">
            <ProjectEstimationMembersFormList
              employees={employees}
              memberDraftRows={memberDraftRows}
              setMemberDraftRows={setMemberDraftRows}
              editingMemberRowIndex={editingMemberRowIndex}
              setEditingMemberRowIndex={setEditingMemberRowIndex}
              onRemoveSuccess={() => notifySuccess("成员已移除")}
            />
          </StepsForm.StepForm>

          <StepsForm.StepForm title="外包费用">
            <HasOutsourceCostSwitch />
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
                    <OutsourceRemarkInput />
                    <Typography.Text strong>
                      外包费用总计：{total} 元
                    </Typography.Text>
                  </Space>
                );
              }}
            </Form.Item>
          </StepsForm.StepForm>

          <StepsForm.StepForm title="执行费用">
            <ExecutionCostTypesSelect />
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
                return <OtherExecutionCostRemarkInput />;
              }}
            </Form.Item>
          </StepsForm.StepForm>
        </StepsForm>
      </Modal>
    </>
  );
};

export default ProjectInitiationModal;
