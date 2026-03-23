"use client";

import { useCallback, useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import {
  Descriptions,
  Empty,
  message,
  Progress,
} from "antd";
import AppLink from "@/components/AppLink";
import ProjectReceivableNodeTable, {
  type ProjectReceivableNodeRow,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import RemarkText from "@/components/RemarkText";
import ProjectReceivablePlanModal, {
  type ProjectReceivablePlanFormValues,
} from "@/components/project-detail/ProjectReceivablePlanModal";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import type { Project } from "@/types/projectDetail";
import { useClientContractsStore } from "@/stores/clientContractsStore";
import { useLegalEntitiesStore } from "@/stores/legalEntitiesStore";

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

type ClientContract = {
  id: string;
  legalEntityId: string;
  contractAmount?: number | string | null;
  taxAmount?: number | string | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
};

type StageOption = {
  id: string;
  field?: string;
  value: string;
  color?: string | null;
};

type ReceivableNode = {
  id: string;
  planId: string;
  stageOptionId: string;
  stageOption?: StageOption | null;
  sortOrder: number;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  expectedDateChangeCount: number;
  hasVendorPayment: boolean;
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

type ReceivablePlan = {
  id: string;
  projectId: string;
  clientId: string;
  legalEntityId: string;
  ownerEmployeeId: string;
  contractAmount: number;
  serviceContent?: string | null;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  clientContractId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  legalEntity?: {
    id: string;
    name: string;
    fullName?: string | null;
  } | null;
  ownerEmployee?: {
    id: string;
    name: string;
  } | null;
  nodes?: ReceivableNode[];
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

const ProjectReceivableInfo = forwardRef<
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
      onCurrentPlanChange,
      nodeModalOpen: externalNodeModalOpen,
      onNodeModalOpenChange,
    }: Props,
    ref,
  ) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [plans, setPlans] = useState<ReceivablePlan[]>([]);
    const [internalPlanModalOpen, setInternalPlanModalOpen] = useState(false);
    const [internalPlanModalMode] = useState<"create" | "edit">("create");
    const [internalNodeModalOpen, setInternalNodeModalOpen] = useState(false);

    // Use external state if provided, otherwise use internal state
    const planModalOpen =
      externalPlanModalOpen !== undefined ? externalPlanModalOpen : internalPlanModalOpen;
    const setPlanModalOpen = onPlanModalOpenChange || setInternalPlanModalOpen;
    const planModalMode =
      externalPlanModalMode !== undefined ? externalPlanModalMode : internalPlanModalMode;
    const nodeModalOpen =
      externalNodeModalOpen !== undefined ? externalNodeModalOpen : internalNodeModalOpen;
    const setNodeModalOpen = onNodeModalOpenChange || setInternalNodeModalOpen;
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
  const [loadingStageOptions, setLoadingStageOptions] = useState(false);
  const legalEntities = useLegalEntitiesStore((state) => state.legalEntities);
  const legalEntitiesLoaded = useLegalEntitiesStore((state) => state.loaded);
  const legalEntitiesLoading = useLegalEntitiesStore((state) => state.loading);
  const fetchLegalEntitiesFromStore = useLegalEntitiesStore(
    (state) => state.fetchLegalEntities,
  );
  const contractsByProjectId = useClientContractsStore(
    (state) => state.byProjectId,
  );
  const contractsLoaded = useClientContractsStore(
    (state) => state.loadedByProjectId[projectId] ?? false,
  );
  const contractsLoading = useClientContractsStore(
    (state) => state.loadingByProjectId[projectId] ?? false,
  );
  const fetchContractsFromStore = useClientContractsStore(
    (state) => state.fetchByProjectId,
  );

  const projectClientId = project.client?.id ?? "";
  const projectName = project.name ?? "未命名项目";
  const contracts = useMemo<ClientContract[]>(
    () => (contractsByProjectId[projectId] ?? []) as ClientContract[],
    [contractsByProjectId, projectId],
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

  const legalEntityOptions = useMemo(
    () =>
      legalEntities
        .map((item) => ({
          label: item.fullName || item.name,
          value: item.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    [legalEntities],
  );

  const defaultContract = contracts[0] ?? null;
  const currentPlan = plans[0] ?? null;
  const currentContract = useMemo(
    () =>
      (currentPlan?.clientContractId
        ? contracts.find((item) => item.id === currentPlan.clientContractId) ?? null
        : null) ?? defaultContract,
    [contracts, currentPlan, defaultContract],
  );
  const receivableSummary = useMemo(() => {
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
      const res = await fetch(
        `/api/project-receivable-plans?${query.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        setPlans([]);
        return;
      }
      const rows = (await res.json()) as ReceivablePlan[];
      setPlans(Array.isArray(rows) ? rows : []);
    } catch {
      setPlans([]);
    }
  }, [projectId]);

  const fetchStageOptions = useCallback(async () => {
    setLoadingStageOptions(true);
    try {
      const query = new URLSearchParams({ field: "projectReceivable.stage" });
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
    async (stage: ProjectReceivableNodeFormValues["stage"]) => {
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
          field: "projectReceivable.stage",
          value: stageValue,
          color:
            typeof stage === "string" ? undefined : (stage?.color ?? undefined),
        }),
      });
      if (!createdStageRes.ok) return null;
      const createdStage = (await createdStageRes.json()) as StageOption;
      if (!createdStage?.id) return null;

      setStageOptions((prev) =>
        [
          ...prev.filter((item) => item.id !== createdStage.id),
          createdStage,
        ].sort((left, right) => left.value.localeCompare(right.value, "zh-CN")),
      );
      return createdStage.id;
    },
    [stageOptions],
  );

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    void fetchStageOptions();
  }, [fetchStageOptions]);

  useEffect(() => {
    if (onCurrentPlanChange) {
      onCurrentPlanChange(plans[0] ? { id: plans[0].id } : null);
    }
  }, [plans, onCurrentPlanChange]);

  useEffect(() => {
    if (!planModalOpen) return;
    const tasks: Array<Promise<unknown>> = [];
    if (!contractsLoaded) {
      tasks.push(fetchContractsFromStore(projectId));
    }
    if (!legalEntitiesLoaded) {
      tasks.push(fetchLegalEntitiesFromStore());
    }
    if (tasks.length > 0) {
      void Promise.all(tasks);
    }
  }, [
    contractsLoaded,
    fetchContractsFromStore,
    fetchLegalEntitiesFromStore,
    legalEntitiesLoaded,
    planModalOpen,
    projectId,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      handleDeletePlan: async () => {
        if (!currentPlan) return;
        const confirmed = window.confirm(
          "确定删除当前收款计划吗？删除后节点也会被删除。",
        );
        if (!confirmed) return;

        const res = await fetch(
          `/api/project-receivable-plans/${currentPlan.id}`,
          {
            method: "DELETE",
          },
        );
        if (!res.ok) {
          messageApi.error("删除收款计划失败");
          return;
        }
        messageApi.success("删除收款计划成功");
        await fetchPlans();
      },
    }),
    [currentPlan, fetchPlans, messageApi],
  );

  const planModalInitialValues = useMemo<
    Partial<ProjectReceivablePlanFormValues>
  >(
    () =>
      planModalMode === "edit" && currentPlan
        ? {
            legalEntityId: currentPlan.legalEntityId,
            ownerEmployeeId: currentPlan.ownerEmployeeId,
            contractAmount: currentPlan.contractAmount,
            taxAmount:
              typeof contracts.find((item) => item.id === currentPlan.clientContractId)
                ?.taxAmount === "number"
                ? (contracts.find((item) => item.id === currentPlan.clientContractId)
                    ?.taxAmount as number)
                : Number(
                    contracts.find((item) => item.id === currentPlan.clientContractId)
                      ?.taxAmount ?? 0,
                  ) || undefined,
            serviceContent: currentPlan.serviceContent ?? undefined,
            remark: currentPlan.remark ?? undefined,
            remarkNeedsAttention: currentPlan.remarkNeedsAttention,
          }
        : {
            legalEntityId: defaultContract?.legalEntityId ?? undefined,
            ownerEmployeeId: defaultOwnerFromProject,
            contractAmount:
              typeof defaultContract?.contractAmount === "number"
                ? defaultContract.contractAmount
                : Number(defaultContract?.contractAmount ?? 0) || undefined,
            taxAmount:
              typeof defaultContract?.taxAmount === "number"
                ? defaultContract.taxAmount
                : Number(defaultContract?.taxAmount ?? 0) || undefined,
            serviceContent: undefined,
            remark: undefined,
            remarkNeedsAttention: false,
          },
    [
      currentPlan,
      defaultContract?.contractAmount,
      defaultContract?.legalEntityId,
      defaultContract?.taxAmount,
      defaultOwnerFromProject,
      planModalMode,
      contracts,
    ],
  );

  const handleSubmitPlan = async (values: ProjectReceivablePlanFormValues) => {
    try {
      setCreatingPlan(true);
      const matchedContract =
        contracts.find((item) => item.id === currentPlan?.clientContractId) ??
        contracts[0] ??
        null;
      const contractId = matchedContract?.id ?? null;
      const contractMethod = contractId ? "PATCH" : "POST";
      const contractUrl = contractId
        ? `/api/client-contracts/${contractId}`
        : "/api/client-contracts";

      const contractRes = await fetch(contractUrl, {
        method: contractMethod,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          legalEntityId: values.legalEntityId,
          contractAmount: values.contractAmount,
          taxAmount: values.taxAmount,
        }),
      });

      if (!contractRes.ok) {
        if (!contractId && contractRes.status === 409) {
          messageApi.error("当前项目已存在客户合同");
        } else {
          messageApi.error(contractId ? "更新客户合同失败" : "新建客户合同失败");
        }
        setCreatingPlan(false);
        return;
      }
      const savedContract = (await contractRes.json()) as ClientContract;
      const isEdit = planModalMode === "edit" && Boolean(currentPlan?.id);
      const url = isEdit
        ? `/api/project-receivable-plans/${currentPlan?.id}`
        : "/api/project-receivable-plans";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          clientId: projectClientId,
          clientContractId: savedContract.id,
          legalEntityId: values.legalEntityId,
          ownerEmployeeId: values.ownerEmployeeId,
          contractAmount: values.contractAmount,
          serviceContent: values.serviceContent?.trim() || null,
          remark: values.remark?.trim() || null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });

      if (!res.ok) {
        messageApi.error(isEdit ? "修改收款计划失败" : "新增收款计划失败");
        setCreatingPlan(false);
        return;
      }
      messageApi.success(isEdit ? "修改收款计划成功" : "新增收款计划成功");
      setCreatingPlan(false);
      setPlanModalOpen(false);
      await fetchContractsFromStore(projectId, { force: true });
      await fetchPlans();
    } catch {
      setCreatingPlan(false);
    }
  };

  const handleCreateNode = async (values: ProjectReceivableNodeFormValues) => {
    if (!currentPlan) return;
    try {
      setCreatingNode(true);
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择收款阶段");
        setCreatingNode(false);
        return;
      }

      const res = await fetch("/api/project-receivable-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: currentPlan.id,
          stageOptionId,
          keyDeliverable: values.keyDeliverable,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          hasVendorPayment: values.hasVendorPayment,
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!res.ok) {
        messageApi.error("新增收款节点失败");
        setCreatingNode(false);
        return;
      }
      messageApi.success("新增收款节点成功");
      setCreatingNode(false);
      setNodeModalOpen(false);
      await fetchPlans();
    } catch {
      setCreatingNode(false);
    }
  };

  const handleEditNode = useCallback(
    async (row: ReceivableNode, values: ProjectReceivableNodeFormValues) => {
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择收款阶段");
        return;
      }
      const payload = {
        stageOptionId,
        sortOrder: row.sortOrder,
        keyDeliverable: values.keyDeliverable,
        expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
        expectedDate: values.expectedDate?.toISOString(),
        hasVendorPayment: Boolean(values.hasVendorPayment),
        remark: values.remark?.trim() ? values.remark.trim() : null,
        remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
      };
      const res = await fetch(`/api/project-receivable-nodes/${row.id}`, {
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
      const res = await fetch(`/api/project-receivable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        messageApi.error("删除收款节点失败");
        return;
      }
      messageApi.success("删除收款节点成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleCollectNode = useCallback(
    async (
      row: ReceivableNode,
      values: ProjectReceivableActualNodeFormValues,
    ) => {
      const res = await fetch("/api/project-receivable-actual-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receivableNodeId: row.id,
          actualAmountTaxIncluded: values.actualAmountTaxIncluded,
          actualDate: values.actualDate?.toISOString(),
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });

      if (!res.ok) {
        messageApi.error("新增实收失败");
        return;
      }

      messageApi.success("新增实收成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleEditActualNode = useCallback(
    async (
      actualNodeId: string,
      values: ProjectReceivableActualNodeFormValues,
    ) => {
      const res = await fetch(`/api/project-receivable-actual-nodes/${actualNodeId}`, {
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
        messageApi.error("修改实收失败");
        return;
      }

      messageApi.success("修改实收成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleDeleteActualNode = useCallback(
    async (actualNodeId: string) => {
      const res = await fetch(`/api/project-receivable-actual-nodes/${actualNodeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        messageApi.error("删除实收失败");
        return;
      }

      messageApi.success("删除实收成功");
      await fetchPlans();
    },
    [fetchPlans, messageApi],
  );

  const handleNodesDraftChange = useCallback(
    (planId: string, nextRows: readonly ReceivableNode[]) => {
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
    async (planId: string, newDataSource: ReceivableNode[]) => {
      const nextRows = newDataSource.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));
      handleNodesDraftChange(planId, nextRows);

      try {
        await Promise.all(
          nextRows.map((row) =>
            fetch(`/api/project-receivable-nodes/${row.id}`, {
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
          <Empty description="暂无收款计划" />
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
                <Descriptions size="small" column={3} title="客户合同">
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
                    收款计划
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
                        {currentPlan.serviceContent?.trim()
                          ? currentPlan.serviceContent
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
                      <Descriptions.Item label="预收金额总计">
                        {formatAmount(receivableSummary.expectedAmountTotal)}
                      </Descriptions.Item>
                      <Descriptions.Item label="实收金额总计">
                        {formatAmount(receivableSummary.actualAmountTotal)}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <Progress
                  type="dashboard"
                  percent={receivableSummary.percent}
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
                        收款进度
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>

            <ProjectReceivableNodeTable
              title={`【${projectName}】收款明细`}
              rows={
                (currentPlan.nodes ?? []).map((node) => ({
                  ...node,
                  expectedDate: node.expectedDate,
                })) as ProjectReceivableNodeRow[]
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
                await handleEditNode(row as ReceivableNode, values);
              }}
              onDragSortNodes={async (nextRows) => {
                await handleDragSortNodes(
                  currentPlan.id,
                  nextRows as ReceivableNode[],
                );
              }}
              onCollectNode={async (row, values) => {
                await handleCollectNode(row as ReceivableNode, values);
              }}
              onEditActualNode={handleEditActualNode}
              onDeleteActualNode={handleDeleteActualNode}
            />
          </div>
        )}

      <ProjectReceivablePlanModal
        open={planModalOpen}
        mode={planModalMode}
        loading={creatingPlan}
        onCancel={() => setPlanModalOpen(false)}
        onSubmit={handleSubmitPlan}
          initialValues={planModalInitialValues}
          projectId={projectId}
          projectName={projectName}
          legalEntityOptions={legalEntityOptions}
          legalEntityLoading={legalEntitiesLoading || contractsLoading}
          ownerOptions={activeProjectMemberOptions}
      />

      <ProjectReceivableNodeModal
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
        initialValues={{ hasVendorPayment: false, remarkNeedsAttention: false }}
      />
    </>
  );
  },
);

ProjectReceivableInfo.displayName = "ProjectReceivableInfo";

export default ProjectReceivableInfo;
