"use client";

import { useCallback, useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { Descriptions, Empty, message, Progress } from "antd";
import AppLink from "@/components/AppLink";
import ProjectPayableNodeTable, {
  type ProjectPayableNodeRow,
} from "@/components/project-detail/ProjectPayableNodeTable";
import RemarkText from "@/components/RemarkText";
import ProjectPayablePlanModal, {
  type ProjectPayablePlanFormValues,
} from "@/components/project-detail/ProjectPayablePlanModal";
import ProjectPayableNodeModal, {
  type ProjectPayableNodeFormValues,
} from "@/components/project-detail/ProjectPayableNodeModal";
import type { ProjectPayableActualNodeFormValues } from "@/components/project-detail/ProjectPayableActualNodeModal";
import type { Project } from "@/types/projectDetail";

type Props = {
  projectId: string;
  project: Project;
  canManageProject: boolean;
  planModalOpen?: boolean;
  planModalMode?: "create" | "edit";
  onPlanModalOpenChange?: (open: boolean) => void;
  onPlanModalModeChange?: (mode: "create" | "edit") => void;
  onCurrentPlanChange?: (plan: { id: string } | null) => void;
  nodeModalOpen?: boolean;
  onNodeModalOpenChange?: (open: boolean) => void;
};

type StageOption = {
  id: string;
  field?: string;
  value: string;
  color?: string | null;
};

type Option = {
  label: string;
  value: string;
};

type VendorContract = {
  id: string;
  projectId: string;
  vendorId: string;
  legalEntityId: string;
  serviceContent?: string | null;
  contractAmount?: number | string | null;
  taxAmount?: number | string | null;
  vendor?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
};

type PayableNode = {
  id: string;
  planId: string;
  stageOptionId: string;
  stageOption?: StageOption | null;
  sortOrder: number;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  hasCustomerCollection: boolean;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded: number;
    actualDate: string;
    remark?: string | null;
    remarkNeedsAttention: boolean;
  }>;
};

type PayablePlan = {
  id: string;
  projectId: string;
  ownerEmployeeId: string;
  vendorContractId?: string | null;
  contractAmount: number;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  project?: {
    id: string;
    name: string;
  } | null;
  ownerEmployee?: {
    id: string;
    name: string;
  } | null;
  vendorContract?: VendorContract | null;
  nodes?: PayableNode[];
};

const formatAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) return "-";
  return `${numberValue.toLocaleString("zh-CN")} 元`;
};

const isActiveMember = (member: { employmentStatus?: string | null }) =>
  (member.employmentStatus ?? "").includes("在职");

const ProjectPayableInfo = forwardRef<
  { handleDeletePlan: () => Promise<void> },
  Props
>(
  (
    {
      projectId,
      project,
      canManageProject,
      planModalOpen: externalPlanModalOpen,
      planModalMode: externalPlanModalMode,
      onPlanModalOpenChange,
      onPlanModalModeChange,
      onCurrentPlanChange,
      nodeModalOpen: externalNodeModalOpen,
      onNodeModalOpenChange,
    }: Props,
    ref,
  ) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [plans, setPlans] = useState<PayablePlan[]>([]);
    const [internalPlanModalOpen, setInternalPlanModalOpen] = useState(false);
    const [internalPlanModalMode, setInternalPlanModalMode] = useState<"create" | "edit">("create");
    const [internalNodeModalOpen, setInternalNodeModalOpen] = useState(false);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [creatingNode, setCreatingNode] = useState(false);
    const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
    const [loadingStageOptions, setLoadingStageOptions] = useState(false);
  const [vendorContracts, setVendorContracts] = useState<VendorContract[]>([]);
  const [vendorContractsLoading, setVendorContractsLoading] = useState(false);
  const [legalEntityOptions, setLegalEntityOptions] = useState<Option[]>([]);
  const [legalEntityLoading, setLegalEntityLoading] = useState(false);

    // Use external state if provided, otherwise use internal state
    const planModalOpen =
      externalPlanModalOpen !== undefined ? externalPlanModalOpen : internalPlanModalOpen;
    const setPlanModalOpen = onPlanModalOpenChange || setInternalPlanModalOpen;
    const planModalMode =
      externalPlanModalMode !== undefined ? externalPlanModalMode : internalPlanModalMode;
    const setPlanModalMode = onPlanModalModeChange || setInternalPlanModalMode;
    const nodeModalOpen =
      externalNodeModalOpen !== undefined ? externalNodeModalOpen : internalNodeModalOpen;
    const setNodeModalOpen = onNodeModalOpenChange || setInternalNodeModalOpen;

  const projectName = project.name ?? "未命名项目";
  const currentPlan = plans[0] ?? null;
  const currentContract = useMemo(
    () =>
      (currentPlan?.vendorContractId
        ? vendorContracts.find((item) => item.id === currentPlan.vendorContractId) ?? null
        : null) ?? currentPlan?.vendorContract ?? vendorContracts[0] ?? null,
    [currentPlan?.vendorContract, currentPlan?.vendorContractId, vendorContracts],
  );

  const activeProjectMemberOptions = useMemo(() => {
    const members = (project.members ?? []).filter(isActiveMember);
    return members
      .map((member) => ({
        label: member.name,
        value: member.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  }, [project.members]);

  const vendorOptions = useMemo(
    () =>
      (project.vendors ?? [])
        .map((item) => ({
          label: item.name,
          value: item.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    [project.vendors],
  );

  const payableSummary = useMemo(() => {
    const nodes = currentPlan?.nodes ?? [];
    const expectedAmountTotal = nodes.reduce(
      (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
      0,
    );
    const actualAmountTotal = nodes.reduce((sum, node) => {
      const nodeActual = (node.actualNodes ?? []).reduce(
        (nodeSum, actual) =>
          nodeSum + Number(actual.actualAmountTaxIncluded ?? 0),
        0,
      );
      return sum + nodeActual;
    }, 0);
    const percent =
      expectedAmountTotal > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((actualAmountTotal / expectedAmountTotal) * 100)),
          )
        : 0;

    return {
      expectedAmountTotal,
      actualAmountTotal,
      percent,
    };
  }, [currentPlan?.nodes]);

  const defaultOwnerFromProject = useMemo(() => {
    const ownerId = project.owner?.id ?? "";
    if (!ownerId) return undefined;
    return activeProjectMemberOptions.some((item) => item.value === ownerId)
      ? ownerId
      : undefined;
  }, [activeProjectMemberOptions, project.owner?.id]);

  const fetchPlans = useCallback(async () => {
    if (!projectId) return;
    try {
      const query = new URLSearchParams({ projectId });
      const res = await fetch(`/api/project-payable-plans?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setPlans([]);
        return;
      }
      const rows = (await res.json()) as PayablePlan[];
      setPlans(Array.isArray(rows) ? rows : []);
    } catch {
      setPlans([]);
    }
  }, [projectId]);

  const fetchVendorContracts = useCallback(async () => {
    if (!projectId) return;
    setVendorContractsLoading(true);
    try {
      const query = new URLSearchParams({ projectId });
      const res = await fetch(`/api/vendor-contracts?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setVendorContracts([]);
        return;
      }
      const rows = (await res.json()) as VendorContract[];
      setVendorContracts(Array.isArray(rows) ? rows : []);
    } catch {
      setVendorContracts([]);
    } finally {
      setVendorContractsLoading(false);
    }
  }, [projectId]);

  const fetchLegalEntities = useCallback(async () => {
    setLegalEntityLoading(true);
    try {
      const res = await fetch("/api/legal-entities", { cache: "no-store" });
      if (!res.ok) {
        setLegalEntityOptions([]);
        return;
      }
      const rows = (await res.json()) as Array<{
        id: string;
        name: string;
        fullName?: string | null;
      }>;
      setLegalEntityOptions(
        (Array.isArray(rows) ? rows : [])
          .map((item) => ({
            value: item.id,
            label: item.fullName || item.name,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
      );
    } catch {
      setLegalEntityOptions([]);
    } finally {
      setLegalEntityLoading(false);
    }
  }, []);

  const fetchStageOptions = useCallback(async () => {
    setLoadingStageOptions(true);
    try {
      const query = new URLSearchParams({ field: "projectPayable.stage" });
      const res = await fetch(`/api/select-options?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setStageOptions([]);
        return;
      }
      const rows = (await res.json()) as StageOption[];
      setStageOptions(Array.isArray(rows) ? rows : []);
    } catch {
      setStageOptions([]);
    } finally {
      setLoadingStageOptions(false);
    }
  }, []);

  const resolveStageOptionId = useCallback(
    async (stage: ProjectPayableNodeFormValues["stage"]) => {
      const stageValueRaw =
        typeof stage === "string" ? stage : (stage?.value ?? "");
      const stageValue = stageValueRaw.trim();
      if (!stageValue) return null;

      const existingStageId =
        stageOptions.find((item) => item.value === stageValue)?.id ?? "";
      if (existingStageId) return existingStageId;

      const createdStageRes = await fetch("/api/select-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "projectPayable.stage",
          value: stageValue,
          color:
            typeof stage === "string" ? undefined : (stage?.color ?? undefined),
        }),
      });
      if (!createdStageRes.ok) return null;
      const createdStage = (await createdStageRes.json()) as StageOption;
      if (!createdStage?.id) return null;

      setStageOptions((prev) =>
        [...prev.filter((item) => item.id !== createdStage.id), createdStage].sort(
          (left, right) => left.value.localeCompare(right.value, "zh-CN"),
        ),
      );
      return createdStage.id;
    },
    [stageOptions],
  );

  useImperativeHandle(
    ref,
    () => ({
      handleDeletePlan: async () => {
        if (!currentPlan) return;
        const confirmed = window.confirm(
          "确定删除当前付款计划吗？删除后节点也会被删除。",
        );
        if (!confirmed) return;

        const planRes = await fetch(
          `/api/project-payable-plans/${currentPlan.id}`,
          {
            method: "DELETE",
          },
        );
        if (!planRes.ok) {
          messageApi.error("删除付款计划失败");
          return;
        }

        if (currentContract?.id) {
          const contractRes = await fetch(`/api/vendor-contracts/${currentContract.id}`, {
            method: "DELETE",
          });
          if (!contractRes.ok) {
            messageApi.error("删除供应商合同失败");
            return;
          }
        }
        messageApi.success("删除付款计划成功");
        await Promise.all([fetchPlans(), fetchVendorContracts()]);
      },
    }),
    [currentContract?.id, currentPlan, fetchPlans, fetchVendorContracts, messageApi],
  );

  useEffect(() => {
    if (onCurrentPlanChange) {
      onCurrentPlanChange(plans[0] ? { id: plans[0].id } : null);
    }
  }, [plans, onCurrentPlanChange]);

  useEffect(() => {
    void fetchPlans();
    void fetchStageOptions();
    void fetchVendorContracts();
    void fetchLegalEntities();
  }, [fetchLegalEntities, fetchPlans, fetchStageOptions, fetchVendorContracts]);

  const planModalInitialValues = useMemo<Partial<ProjectPayablePlanFormValues>>(
    () =>
      planModalMode === "edit" && currentPlan
        ? {
            vendorId: currentPlan.vendorContract?.vendor?.id ?? undefined,
            legalEntityId: currentPlan.vendorContract?.legalEntity?.id ?? undefined,
            serviceContent: currentPlan.vendorContract?.serviceContent ?? undefined,
            ownerEmployeeId: currentPlan.ownerEmployeeId,
            contractAmount: currentPlan.contractAmount,
            remark: currentPlan.remark ?? undefined,
          }
        : {
            vendorId: vendorContracts[0]?.vendorId ?? undefined,
            legalEntityId: vendorContracts[0]?.legalEntityId ?? undefined,
            serviceContent: vendorContracts[0]?.serviceContent ?? undefined,
            ownerEmployeeId: defaultOwnerFromProject,
            contractAmount:
              typeof vendorContracts[0]?.contractAmount === "number"
                ? vendorContracts[0].contractAmount
                : 0,
          },
    [
      currentPlan,
      defaultOwnerFromProject,
      planModalMode,
      vendorContracts,
    ],
  );

  const handleSubmitPlan = async (values: ProjectPayablePlanFormValues) => {
    try {
      setCreatingPlan(true);
      const isEdit = planModalMode === "edit" && Boolean(currentPlan?.id);

      const currentContract =
        (currentPlan?.vendorContractId
          ? vendorContracts.find((item) => item.id === currentPlan.vendorContractId)
          : null) ??
        vendorContracts[0] ??
        null;

      const contractPayload = {
        projectId,
        vendorId: values.vendorId,
        legalEntityId: values.legalEntityId,
        serviceContent: values.serviceContent?.trim() || null,
        contractAmount:
          values.contractAmount === undefined || values.contractAmount === null
            ? null
            : Math.trunc(values.contractAmount),
      };

      const contractRes = await fetch(
        currentContract
          ? `/api/vendor-contracts/${currentContract.id}`
          : "/api/vendor-contracts",
        {
          method: currentContract ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contractPayload),
        },
      );

      if (!contractRes.ok) {
        if (!currentContract && contractRes.status === 409) {
          messageApi.error("当前项目已存在供应商合同");
        } else {
          messageApi.error(currentContract ? "修改供应商合同失败" : "新增供应商合同失败");
        }
        setCreatingPlan(false);
        return;
      }

      const savedContract = (await contractRes.json()) as VendorContract;
      const planRes = await fetch(
        isEdit ? `/api/project-payable-plans/${currentPlan?.id}` : "/api/project-payable-plans",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            vendorContractId: savedContract.id,
            ownerEmployeeId: values.ownerEmployeeId,
            contractAmount: contractPayload.contractAmount,
            remark: values.remark ?? null,
            remarkNeedsAttention: currentPlan?.remarkNeedsAttention ?? false,
          }),
        },
      );
      if (!planRes.ok) {
        messageApi.error(isEdit ? "修改付款计划失败" : "新增付款计划失败");
        setCreatingPlan(false);
        return;
      }

      messageApi.success(isEdit ? "修改付款计划成功" : "新增付款计划成功");
      setCreatingPlan(false);
      setPlanModalMode("create");
      setPlanModalOpen(false);
      await Promise.all([fetchVendorContracts(), fetchPlans()]);
    } catch {
      setCreatingPlan(false);
    }
  };

  const handleCreateNode = async (values: ProjectPayableNodeFormValues) => {
    if (!currentPlan) return;
    try {
      setCreatingNode(true);
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择付款阶段");
        setCreatingNode(false);
        return;
      }

      const res = await fetch("/api/project-payable-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: currentPlan.id,
          stageOptionId,
          paymentCondition: values.paymentCondition,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          hasCustomerCollection: values.hasCustomerCollection,
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!res.ok) {
        messageApi.error("新增付款节点失败");
        setCreatingNode(false);
        return;
      }
      messageApi.success("新增付款节点成功");
      setCreatingNode(false);
      setNodeModalOpen(false);
      await fetchPlans();
    } catch {
      setCreatingNode(false);
    }
  };

  const handleEditNode = useCallback(
    async (row: PayableNode, values: ProjectPayableNodeFormValues) => {
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择付款阶段");
        return;
      }
      const payload = {
        stageOptionId,
        sortOrder: row.sortOrder,
        paymentCondition: values.paymentCondition,
        expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
        expectedDate: values.expectedDate?.toISOString(),
        hasCustomerCollection: Boolean(values.hasCustomerCollection),
        remark: values.remark?.trim() ? values.remark.trim() : null,
        remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
      };
      const res = await fetch(`/api/project-payable-nodes/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("更新失败");
      }
      await fetchPlans();
    },
    [fetchPlans, messageApi, resolveStageOptionId],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const res = await fetch(`/api/project-payable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        messageApi.error("删除付款节点失败");
        return;
      }
      messageApi.success("删除付款节点成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handlePayNode = useCallback(
    async (
      row: PayableNode,
      values: ProjectPayableActualNodeFormValues,
    ) => {
      const res = await fetch("/api/project-payable-actual-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payableNodeId: row.id,
          actualAmountTaxIncluded: values.actualAmountTaxIncluded,
          actualDate: values.actualDate?.toISOString(),
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });

      if (!res.ok) {
        messageApi.error("新增实付失败");
        return;
      }

      messageApi.success("新增实付成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleEditActualNode = useCallback(
    async (
      actualNodeId: string,
      values: ProjectPayableActualNodeFormValues,
    ) => {
      const res = await fetch(`/api/project-payable-actual-nodes/${actualNodeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualAmountTaxIncluded: values.actualAmountTaxIncluded,
          actualDate: values.actualDate?.toISOString(),
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });

      if (!res.ok) {
        messageApi.error("修改实付失败");
        return;
      }

      messageApi.success("修改实付成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleDeleteActualNode = useCallback(
    async (actualNodeId: string) => {
      const res = await fetch(`/api/project-payable-actual-nodes/${actualNodeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        messageApi.error("删除实付失败");
        return;
      }

      messageApi.success("删除实付成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleNodesDraftChange = useCallback(
    (planId: string, nextRows: readonly PayableNode[]) => {
      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                nodes: [...nextRows],
              }
            : plan,
        ),
      );
    },
    [],
  );

  const handleDragSortNodes = useCallback(
    async (planId: string, newDataSource: PayableNode[]) => {
      const nextRows = newDataSource.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));
      handleNodesDraftChange(planId, nextRows);

      try {
        await Promise.all(
          nextRows.map((row) =>
            fetch(`/api/project-payable-nodes/${row.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sortOrder: row.sortOrder,
              }),
            }),
          ),
        );
        await fetchPlans();
      } catch {
        messageApi.error("更新节点排序失败");
        await fetchPlans();
      }
    },
    [fetchPlans, handleNodesDraftChange, messageApi],
  );

  return (
    <>
      {contextHolder}
      {currentPlan === null ? (
          <Empty description="暂无付款计划" />
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 220px",
                gap: 24,
                marginBottom: 24,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "auto auto",
                  gap: 24,
                  minWidth: 0,
                }}
              >
                <Descriptions size="small" column={3} title="供应商合同">
                  <Descriptions.Item label="供应商">
                    {currentContract?.vendor?.id ? (
                      <AppLink href={`/vendors/${currentContract.vendor.id}`}>
                        {currentContract.vendor.fullName ||
                          currentContract.vendor.name ||
                          "-"}
                      </AppLink>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="签约主体">
                    {currentContract?.legalEntity?.id ? (
                      <AppLink href={`/legal-entities/${currentContract.legalEntity.id}`}>
                        {currentContract.legalEntity.fullName ||
                          currentContract.legalEntity.name ||
                          "-"}
                      </AppLink>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="合同金额(含税)">
                    {formatAmount(currentContract?.contractAmount ?? currentPlan.contractAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="税费金额">
                    {formatAmount(currentContract?.taxAmount)}
                  </Descriptions.Item>
                </Descriptions>

                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    付款计划
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 280px)",
                      gap: 24,
                      alignItems: "start",
                    }}
                  >
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="服务内容">
                        {currentContract?.serviceContent?.trim()
                          ? currentContract.serviceContent
                          : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="跟进人">
                        {currentPlan.ownerEmployee?.id ? (
                          <AppLink href={`/employees/${currentPlan.ownerEmployee.id}`}>
                            {currentPlan.ownerEmployee.name || "-"}
                          </AppLink>
                        ) : (
                          "-"
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="备注">
                        <RemarkText
                          remark={currentPlan.remark}
                          remarkNeedsAttention={currentPlan.remarkNeedsAttention}
                        />
                      </Descriptions.Item>
                    </Descriptions>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="预付金额总计">
                        {formatAmount(payableSummary.expectedAmountTotal)}
                      </Descriptions.Item>
                      <Descriptions.Item label="实付金额总计">
                        {formatAmount(payableSummary.actualAmountTotal)}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <Progress
                  type="dashboard"
                  percent={payableSummary.percent}
                  size={140}
                  strokeColor="#1677ff"
                  format={(percent) => (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      <span>{`${percent ?? 0}%`}</span>
                      <span
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "rgba(0,0,0,0.45)",
                        }}
                      >
                        付款进度
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>

            <ProjectPayableNodeTable
              title={`【${projectName}-${
                currentPlan.vendorContract?.vendor?.fullName ||
                currentPlan.vendorContract?.vendor?.name ||
                "-"
              }】付款明细`}
              rows={
                (currentPlan.nodes ?? []).map((node) => ({
                  ...node,
                  expectedDate: node.expectedDate,
                })) as ProjectPayableNodeRow[]
              }
              stageOptions={stageOptions.map((item) => ({
                id: item.id,
                value: item.value,
              }))}
              canManageProject={canManageProject}
              onAddNode={() => {
                setNodeModalOpen(true);
              }}
              onDeleteNode={handleDeleteNode}
              onEditNode={async (row, values) => {
                await handleEditNode(row as PayableNode, values);
              }}
              onDragSortNodes={async (nextRows) => {
                await handleDragSortNodes(
                  currentPlan.id,
                  nextRows as PayableNode[],
                );
              }}
              onPayNode={async (row, values) => {
                await handlePayNode(row as PayableNode, values);
              }}
              onEditActualNode={handleEditActualNode}
              onDeleteActualNode={handleDeleteActualNode}
            />
          </div>
        )}

      <ProjectPayablePlanModal
        open={planModalOpen}
        mode={planModalMode}
        loading={creatingPlan}
        onCancel={() => {
          setPlanModalMode("create");
          setPlanModalOpen(false);
        }}
        onSubmit={handleSubmitPlan}
        initialValues={planModalInitialValues}
        projectId={projectId}
        projectName={projectName}
        vendorOptions={vendorOptions}
        vendorLoading={vendorContractsLoading}
        legalEntityOptions={legalEntityOptions}
        legalEntityLoading={legalEntityLoading}
        ownerOptions={activeProjectMemberOptions}
      />

      <ProjectPayableNodeModal
        open={nodeModalOpen}
        loading={creatingNode}
        onCancel={() => setNodeModalOpen(false)}
        onSubmit={handleCreateNode}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        stageOptionsLoading={loadingStageOptions}
        initialValues={{ hasCustomerCollection: false, remarkNeedsAttention: false }}
      />
    </>
  );
  },
);

ProjectPayableInfo.displayName = "ProjectPayableInfo";

export default ProjectPayableInfo;
