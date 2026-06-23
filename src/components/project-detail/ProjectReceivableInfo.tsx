"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Button,
  Descriptions,
  Empty,
  message,
  Space,
} from "antd";
import ProjectReceivableActivityModal from "@/components/project-detail/ProjectReceivableActivityModal";
import ClientContractModal from "@/components/project-detail/ClientContractModal";
import ProjectReceivableNodeTable, {
  type ProjectReceivableNodeRow,
  type ReceivableNodeDelayFormValues,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import ProjectReceivablePlanSnapshot from "@/components/project-detail/ProjectReceivablePlanSnapshot";
import ProjectReceivablePlanModal, {
  type ProjectReceivablePlanFormValues,
} from "@/components/project-detail/ProjectReceivablePlanModal";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import type { ProjectReceivableBadDebtRecordFormValues } from "@/components/project-detail/ProjectReceivableBadDebtRecordModal";
import type { Project } from "@/types/projectDetail";
import { buildPlanOwnerOptions } from "@/lib/build-plan-owner-options";
import { useClientContractsStore } from "@/stores/clientContractsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useLegalEntitiesStore } from "@/stores/legalEntitiesStore";

type Props = {
  projectId: string;
  project: Project;
  canManageProject: boolean;
  canCollectReceivable?: boolean;
  canManageBadDebtRecords?: boolean;
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
  projectId: string;
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
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    reason?: string | null;
    changedAt?: string;
  }>;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: Array<{
    id: string;
    actualAmountTaxIncluded: number;
    actualDate: string;
    invoiceDate?: string | null;
    remark?: string | null;
    remarkNeedsAttention: boolean;
  }>;
  badDebtRecords?: Array<{
    id: string;
    actualNodeId?: string | null;
    type: "WRITE_OFF" | "RECOVERY";
    amountTaxIncluded?: number | string | null;
    occurredAt?: string | null;
    reason?: string | null;
    remark?: string | null;
    createdByEmployee?: {
      id: string;
      name: string;
    } | null;
    createdAt?: string;
  }>;
  receivableAmountTaxIncluded?: number;
  actualAmountTotal?: number;
  badDebtWriteOffAmountTotal?: number;
  badDebtRecoveryAmountTotal?: number;
  badDebtAmountTotal?: number;
  actualBadDebtAmount?: number;
  pendingAmount?: number;
  collectionProgressPercent?: number;
  isCollectionAmountMatched?: boolean;
};

type ReceivablePlan = {
  id: string;
  projectId: string;
  clientId: string;
  legalEntityId: string;
  ownerEmployeeId: string;
  contractAmount: number;
  hasVendorPayment: boolean;
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
  expectedAmountTotal?: number;
  receivableAmountTotal?: number;
  actualExpectedAmountTotal?: number;
  actualAmountTotal?: number;
  badDebtWriteOffAmountTotal?: number;
  badDebtRecoveryAmountTotal?: number;
  badDebtAmountTotal?: number;
  actualBadDebtAmountTotal?: number;
  pendingAmountTotal?: number;
  collectionProgressPercent?: number;
  isFullyCollected?: boolean;
};

const formatYuanNumber = (value: unknown) => {
  const num =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
};

const formatAmountWithUnit = (value: unknown) =>
  `${formatYuanNumber(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} 元`;

const ProjectReceivableInfo = forwardRef<
  { handleDeletePlan: () => Promise<void> },
  Props
>(
  (
    {
      projectId,
      project,
      canManageProject,
      canCollectReceivable = canManageProject,
      canManageBadDebtRecords = false,
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
    const [internalNodeModalOpen, setInternalNodeModalOpen] = useState(false);
    const [contractModalOpen, setContractModalOpen] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [nodeTargetPlanId, setNodeTargetPlanId] = useState<string | null>(
      null,
    );

    // Use external state if provided, otherwise use internal state
    const planModalOpen =
      externalPlanModalOpen !== undefined
        ? externalPlanModalOpen
        : internalPlanModalOpen;
    const setPlanModalOpen = onPlanModalOpenChange || setInternalPlanModalOpen;
    const planModalMode = externalPlanModalMode ?? "create";
    const nodeModalOpen =
      externalNodeModalOpen !== undefined
        ? externalNodeModalOpen
        : internalNodeModalOpen;
    const setNodeModalOpen = onNodeModalOpenChange || setInternalNodeModalOpen;
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [creatingNode, setCreatingNode] = useState(false);
    const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
    const [loadingStageOptions, setLoadingStageOptions] = useState(false);
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [activityTargetStageOptionIds, setActivityTargetStageOptionIds] =
      useState<string[]>([]);
    const employeesFull = useEmployeesStore((state) => state.employeesFull);
    const employeesLoadedFull = useEmployeesStore((state) => state.loadedFull);
    const fetchEmployeesFromStore = useEmployeesStore(
      (state) => state.fetchEmployees,
    );
    const legalEntities = useLegalEntitiesStore((state) => state.legalEntities);
    const legalEntitiesLoaded = useLegalEntitiesStore((state) => state.loaded);
    const legalEntitiesLoading = useLegalEntitiesStore(
      (state) => state.loading,
    );
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
      return buildPlanOwnerOptions({
        allEmployees: employeesFull,
        projectMembers: project.members ?? [],
      });
    }, [employeesFull, project.members]);

    const defaultOwnerFromProject = useMemo(() => {
      const ownerId = project.owner?.id ?? "";
      if (!ownerId) return undefined;
      return activeProjectMemberOptions.some((group) =>
        Array.isArray(group.options)
          ? group.options.some((item) => item.value === ownerId)
          : group.value === ownerId,
      )
        ? ownerId
        : undefined;
    }, [activeProjectMemberOptions, project.owner?.id]);

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
    const getContractForPlan = useCallback(
      (plan: ReceivablePlan) =>
        (plan.clientContractId
          ? (contracts.find((item) => item.id === plan.clientContractId) ??
            null)
          : null) ?? defaultContract,
      [contracts, defaultContract],
    );
    const editingPlan = useMemo(
      () =>
        editingPlanId
          ? (plans.find((item) => item.id === editingPlanId) ?? null)
          : null,
      [editingPlanId, plans],
    );

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

    useEffect(() => {
      if (employeesLoadedFull) return;
      void fetchEmployeesFromStore({ full: true });
    }, [employeesLoadedFull, fetchEmployeesFromStore]);

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
              typeof stage === "string"
                ? undefined
                : (stage?.color ?? undefined),
          }),
        });
        if (!createdStageRes.ok) return null;
        const createdStage = (await createdStageRes.json()) as StageOption;
        if (!createdStage?.id) return null;

        setStageOptions((prev) =>
          [
            ...prev.filter((item) => item.id !== createdStage.id),
            createdStage,
          ].sort((left, right) =>
            left.value.localeCompare(right.value, "zh-CN"),
          ),
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
      if (!projectId) return;
      if (contractsLoaded) return;
      void fetchContractsFromStore(projectId);
    }, [contractsLoaded, fetchContractsFromStore, projectId]);

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

    useEffect(() => {
      if (!planModalOpen || planModalMode !== "edit") return;
      if (!currentPlan?.id) return;
      if (editingPlanId === currentPlan.id) return;
      setEditingPlanId(currentPlan.id);
    }, [currentPlan?.id, editingPlanId, planModalMode, planModalOpen]);

    useImperativeHandle(
      ref,
      () => ({
        handleDeletePlan: async () => {
          if (!currentPlan) return;
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
        planModalMode === "edit" && editingPlan
          ? {
              legalEntityId: editingPlan.legalEntityId,
              ownerEmployeeId: editingPlan.ownerEmployeeId,
              contractAmount: editingPlan.contractAmount,
              taxAmount:
                typeof contracts.find(
                  (item) => item.id === editingPlan.clientContractId,
                )?.taxAmount === "number"
                  ? (contracts.find(
                      (item) => item.id === editingPlan.clientContractId,
                    )?.taxAmount as number)
                  : Number(
                      contracts.find(
                        (item) => item.id === editingPlan.clientContractId,
                      )?.taxAmount ?? 0,
                    ) || undefined,
              serviceContent: editingPlan.serviceContent ?? undefined,
              hasVendorPayment: editingPlan.hasVendorPayment,
              remark: editingPlan.remark ?? undefined,
              remarkNeedsAttention: editingPlan.remarkNeedsAttention,
            }
          : {
              // Only prefill owner for create; other fields stay empty.
              ownerEmployeeId: defaultOwnerFromProject,
            },
      [defaultOwnerFromProject, editingPlan, planModalMode, contracts],
    );

    const handleSubmitPlan = async (
      values: ProjectReceivablePlanFormValues,
    ) => {
      try {
        setCreatingPlan(true);
        const targetPlan = planModalMode === "edit" ? editingPlan : null;
        const matchedContract =
          contracts.find((item) => item.id === targetPlan?.clientContractId) ??
          contracts[0] ??
          null;
        const normalizeMoney = (input: unknown) => {
          if (input === null || input === undefined || input === "")
            return null;
          const num =
            typeof input === "number"
              ? input
              : typeof input === "string"
                ? Number(input.trim())
                : Number(input);
          if (!Number.isFinite(num)) return null;
          // Receivable plan modal uses 2-decimal precision; normalize to cents.
          return Math.round(num * 100) / 100;
        };

        const contractId = matchedContract?.id ?? null;
        const isEdit = planModalMode === "edit" && Boolean(targetPlan?.id);
        const nextLegalEntityId = String(values.legalEntityId ?? "").trim();
        const shouldSkipContractRequest =
          isEdit &&
          Boolean(contractId) &&
          Boolean(nextLegalEntityId) &&
          matchedContract?.legalEntityId === nextLegalEntityId &&
          normalizeMoney(matchedContract?.contractAmount) ===
            normalizeMoney(values.contractAmount) &&
          normalizeMoney(matchedContract?.taxAmount) ===
            normalizeMoney(values.taxAmount);

        let savedContract: ClientContract | null = matchedContract;
        if (!shouldSkipContractRequest) {
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
              messageApi.error(
                contractId ? "更新客户合同失败" : "新建客户合同失败",
              );
            }
            setCreatingPlan(false);
            return;
          }
          savedContract = (await contractRes.json()) as ClientContract;
        }

        if (!savedContract?.id) {
          messageApi.error("客户合同数据异常，请刷新后重试");
          setCreatingPlan(false);
          return;
        }
        const url = isEdit
          ? `/api/project-receivable-plans/${targetPlan?.id}`
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
            hasVendorPayment: Boolean(values.hasVendorPayment),
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
        setEditingPlanId(null);
        await fetchContractsFromStore(projectId, { force: true });
        await fetchPlans();
      } catch {
        setCreatingPlan(false);
      }
    };

    const handleCreateNode = async (
      values: ProjectReceivableNodeFormValues,
    ) => {
      const planId = nodeTargetPlanId ?? currentPlan?.id ?? "";
      if (!planId) return;
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
            planId,
            stageOptionId,
            keyDeliverable: values.keyDeliverable,
            expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
            expectedDate: values.expectedDate?.toISOString() ?? null,
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
        setNodeTargetPlanId(null);
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
          keyDeliverable: values.keyDeliverable,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString() ?? null,
          skipExpectedDateHistory: true,
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

    const handleDelayNode = useCallback(
      async (
        row: ProjectReceivableNodeRow,
        values: ReceivableNodeDelayFormValues,
      ) => {
        const res = await fetch(`/api/project-receivable-nodes/${row.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expectedDate: values.delayedExpectedDate?.toISOString(),
            expectedDateChangeReason: values.delayReason?.trim() || null,
            expectedDateChangeRemark: values.delayRemark?.trim() || null,
          }),
        });
        if (!res.ok) {
          messageApi.error((await res.text()) || "延迟收款失败");
          return;
        }
        messageApi.success("延迟收款成功");
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
            actualDate: values.actualDate?.toISOString() ?? null,
            invoiceDate: values.invoiceDate?.toISOString() ?? null,
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

    const handleCreateBadDebtRecord = useCallback(
      async (
        row: ReceivableNode,
        values: ProjectReceivableBadDebtRecordFormValues,
      ) => {
        const res = await fetch("/api/project-receivable-bad-debt-records", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receivableNodeId: row.id,
            type: values.type,
            amountTaxIncluded: values.amountTaxIncluded,
            occurredAt: values.occurredAt?.toISOString(),
            createActualNode: Boolean(values.createActualNode),
            reason: values.reason?.trim() ? values.reason.trim() : null,
            remark: values.remark?.trim() ? values.remark.trim() : null,
          }),
        });

        if (!res.ok) {
          messageApi.error((await res.text()) || "新增坏账记录失败");
          return;
        }

        messageApi.success(
          values.type === "RECOVERY" && values.createActualNode
            ? "新增坏账收回成功，已自动生成实收记录"
            : "新增坏账记录成功",
        );
        await fetchPlans();
      },
      [fetchPlans, messageApi],
    );

    const handleEditBadDebtRecord = useCallback(
      async (
        badDebtRecordId: string,
        values: ProjectReceivableBadDebtRecordFormValues,
      ) => {
        const res = await fetch(
          `/api/project-receivable-bad-debt-records/${badDebtRecordId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: values.type,
              amountTaxIncluded: values.amountTaxIncluded,
              occurredAt: values.occurredAt?.toISOString(),
              createActualNode: Boolean(values.createActualNode),
              reason: values.reason?.trim() ? values.reason.trim() : null,
              remark: values.remark?.trim() ? values.remark.trim() : null,
            }),
          },
        );

        if (!res.ok) {
          messageApi.error((await res.text()) || "修改坏账记录失败");
          return;
        }

        messageApi.success(
          values.type === "RECOVERY" && values.createActualNode
            ? "修改坏账收回成功，已同步实收记录"
            : "修改坏账记录成功",
        );
        await fetchPlans();
      },
      [fetchPlans, messageApi],
    );

    const handleDeleteBadDebtRecord = useCallback(
      async (badDebtRecordId: string) => {
        const res = await fetch(
          `/api/project-receivable-bad-debt-records/${badDebtRecordId}`,
          {
            method: "DELETE",
          },
        );

        if (!res.ok) {
          messageApi.error("删除坏账记录失败");
          return;
        }

        messageApi.success("删除坏账记录成功");
        await fetchPlans();
      },
      [fetchPlans, messageApi],
    );

    const handleEditActualNode = useCallback(
      async (
        actualNodeId: string,
        values: ProjectReceivableActualNodeFormValues,
      ) => {
        const res = await fetch(
          `/api/project-receivable-actual-nodes/${actualNodeId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              actualAmountTaxIncluded: values.actualAmountTaxIncluded,
              actualDate: values.actualDate?.toISOString() ?? null,
              invoiceDate: values.invoiceDate?.toISOString() ?? null,
              remark: values.remark?.trim() ? values.remark.trim() : null,
              remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
            }),
          },
        );

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
        const res = await fetch(
          `/api/project-receivable-actual-nodes/${actualNodeId}`,
          {
            method: "DELETE",
          },
        );

        if (!res.ok) {
          messageApi.error("删除实收失败");
          return;
        }

        messageApi.success("删除实收成功");
        await fetchPlans();
      },
      [fetchPlans, messageApi],
    );

    return (
      <>
        {contextHolder}
        {plans.length === 0 ? (
          defaultContract ? (
            <div>
              <Space
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontWeight: 600 }}>客户合同</span>
                <Button
                  disabled={!canManageProject}
                  onClick={() => setContractModalOpen(true)}
                >
                  修改客户合同
                </Button>
              </Space>
              <Descriptions bordered column={3} size="small">
                <Descriptions.Item label="签约主体">
                  {defaultContract.legalEntity?.fullName ||
                    defaultContract.legalEntity?.name ||
                    "-"}
                </Descriptions.Item>
                <Descriptions.Item label="合同金额">
                  {formatAmountWithUnit(defaultContract.contractAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="税费金额">
                  {formatAmountWithUnit(defaultContract.taxAmount)}
                </Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 16 }}>
                <Empty description="暂无收款计划" />
              </div>
            </div>
          ) : (
            <Empty description="暂无收款计划" />
          )
        ) : (
          (() => {
            const plan = plans[0];
            const contract = getContractForPlan(plan);
            const contractAmount = formatYuanNumber(
              contract?.contractAmount ?? plan.contractAmount,
            );
            const actualExpectedAmountTotal = formatYuanNumber(
              plan.actualExpectedAmountTotal,
            );
            const expectedAmountTotal = formatYuanNumber(
              plan.expectedAmountTotal,
            );
            const actualAmountTotal = formatYuanNumber(plan.actualAmountTotal);

            return (
              <div>
                <ProjectReceivablePlanSnapshot
                  contractAmount={contractAmount}
                  taxAmount={contract?.taxAmount}
                  expectedAmountTotal={expectedAmountTotal}
                  actualExpectedAmountTotal={actualExpectedAmountTotal}
                  actualAmountTotal={actualAmountTotal}
                  badDebtAmountTotal={plan.actualBadDebtAmountTotal}
                  badDebtWriteOffAmountTotal={plan.badDebtWriteOffAmountTotal}
                  badDebtRecoveryAmountTotal={plan.badDebtRecoveryAmountTotal}
                  collectionProgressPercent={plan.collectionProgressPercent}
                  legalEntityName={
                    contract?.legalEntity?.name || plan.legalEntity?.name
                  }
                  serviceContent={plan.serviceContent}
                  ownerName={plan.ownerEmployee?.name}
                  hasVendorPayment={Boolean(plan.hasVendorPayment)}
                  remark={plan.remark}
                  remarkNeedsAttention={plan.remarkNeedsAttention}
                />
                <div style={{ marginTop: 16 }}>
                  <ProjectReceivableNodeTable
                    title={`【${projectName}】收款节点`}
                    rows={
                      (plan.nodes ?? []).map((node) => ({
                        ...node,
                        expectedDate: node.expectedDate,
                      })) as ProjectReceivableNodeRow[]
                    }
                    stageOptions={stageOptions.map((item) => ({
                      id: item.id,
                      value: item.value,
                    }))}
                    canManageProject={canManageProject}
                    canCollectReceivable={canCollectReceivable}
                    canManageBadDebtRecords={canManageBadDebtRecords}
                    onAddNode={() => {
                      setNodeTargetPlanId(plan.id);
                      setNodeModalOpen(true);
                    }}
                    onDeleteNode={handleDeleteNode}
                    onEditNode={async (row, values) => {
                      await handleEditNode(row as ReceivableNode, values);
                    }}
                    onCollectNode={async (row, values) => {
                      await handleCollectNode(row as ReceivableNode, values);
                    }}
                    onEditActualNode={handleEditActualNode}
                    onDeleteActualNode={handleDeleteActualNode}
                    onDelayNode={handleDelayNode}
                    onCreateBadDebtRecord={async (row, values) => {
                      await handleCreateBadDebtRecord(
                        row as ReceivableNode,
                        values,
                      );
                    }}
                    onEditBadDebtRecord={handleEditBadDebtRecord}
                    onDeleteBadDebtRecord={handleDeleteBadDebtRecord}
                    onHistoryChanged={fetchPlans}
                    onViewDetails={(row) => {
                      setActivityTargetStageOptionIds(
                        row.stageOptionId ? [row.stageOptionId] : [],
                      );
                      setActivityModalOpen(true);
                    }}
                  />
                </div>
              </div>
            );
          })()
        )}

        <ClientContractModal
          open={contractModalOpen}
          onCancel={() => setContractModalOpen(false)}
          projectId={projectId}
          projectName={projectName}
          isClientProject={project.type === "CLIENT"}
          contract={defaultContract}
          onSaved={async () => {
            await fetchContractsFromStore(projectId, { force: true });
          }}
        />
        <ProjectReceivableActivityModal
          open={activityModalOpen}
          rows={
            (plans[0]?.nodes ?? []).map((node) => ({
              ...node,
              expectedDate: node.expectedDate,
            })) as ProjectReceivableNodeRow[]
          }
          stageOptions={stageOptions}
          initialSelectedStageOptionIds={activityTargetStageOptionIds}
          onCancel={() => {
            setActivityModalOpen(false);
            setActivityTargetStageOptionIds([]);
          }}
          canManageProject={canManageProject}
          canManageBadDebtRecords={canManageBadDebtRecords}
          onEditNode={async (row, values) => {
            await handleEditNode(row as ReceivableNode, values);
          }}
          onDeleteNode={handleDeleteNode}
          onEditActualNode={handleEditActualNode}
          onDeleteActualNode={handleDeleteActualNode}
          onEditBadDebtRecord={handleEditBadDebtRecord}
          onDeleteBadDebtRecord={handleDeleteBadDebtRecord}
          onHistoryChanged={fetchPlans}
        />

        <ProjectReceivablePlanModal
          open={planModalOpen}
          mode={planModalMode}
          loading={creatingPlan}
          onCancel={() => {
            setPlanModalOpen(false);
            setEditingPlanId(null);
          }}
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
          onCancel={() => {
            setNodeModalOpen(false);
            setNodeTargetPlanId(null);
          }}
          onSubmit={handleCreateNode}
          stageOptions={stageOptions.map((item) => ({
            id: item.id,
            value: item.value,
            color: item.color ?? undefined,
          }))}
          stageOptionsLoading={loadingStageOptions}
          initialValues={{
            remarkNeedsAttention: false,
          }}
        />
      </>
    );
  },
);

ProjectReceivableInfo.displayName = "ProjectReceivableInfo";

export default ProjectReceivableInfo;
