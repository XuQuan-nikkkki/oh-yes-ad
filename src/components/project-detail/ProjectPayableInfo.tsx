"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Empty, message, Progress } from "antd";
import { ProCard, StatisticCard } from "@ant-design/pro-components";
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
import { useVendorsStore } from "@/stores/vendorsStore";

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
    const [internalPlanModalMode, setInternalPlanModalMode] = useState<
      "create" | "edit"
    >("create");
    const [internalNodeModalOpen, setInternalNodeModalOpen] = useState(false);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [creatingNode, setCreatingNode] = useState(false);
    const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
    const [loadingStageOptions, setLoadingStageOptions] = useState(false);
    const [vendorContracts, setVendorContracts] = useState<VendorContract[]>(
      [],
    );
    const [vendorContractsLoading, setVendorContractsLoading] = useState(false);
    const vendors = useVendorsStore((state) => state.vendors);
    const vendorsLoaded = useVendorsStore((state) => state.loaded);
    const vendorsLoading = useVendorsStore((state) => state.loading);
    const fetchVendors = useVendorsStore((state) => state.fetchVendors);
    const [legalEntityOptions, setLegalEntityOptions] = useState<Option[]>([]);
    const [legalEntityLoading, setLegalEntityLoading] = useState(false);

    // Use external state if provided, otherwise use internal state
    const planModalOpen =
      externalPlanModalOpen !== undefined
        ? externalPlanModalOpen
        : internalPlanModalOpen;
    const setPlanModalOpen = onPlanModalOpenChange || setInternalPlanModalOpen;
    const planModalMode =
      externalPlanModalMode !== undefined
        ? externalPlanModalMode
        : internalPlanModalMode;
    const setPlanModalMode = onPlanModalModeChange || setInternalPlanModalMode;
    const nodeModalOpen =
      externalNodeModalOpen !== undefined
        ? externalNodeModalOpen
        : internalNodeModalOpen;
    const setNodeModalOpen = onNodeModalOpenChange || setInternalNodeModalOpen;

    const projectName = project.name ?? "未命名项目";
    const currentPlan = plans[0] ?? null;
    const currentContract = useMemo(
      () =>
        (currentPlan?.vendorContractId
          ? (vendorContracts.find(
              (item) => item.id === currentPlan.vendorContractId,
            ) ?? null)
          : null) ??
        currentPlan?.vendorContract ??
        vendorContracts[0] ??
        null,
      [
        currentPlan?.vendorContract,
        currentPlan?.vendorContractId,
        vendorContracts,
      ],
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
        (vendors ?? [])
          .map((item) => ({
            label: item.fullName || item.name,
            value: item.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
      [vendors],
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
              Math.min(
                100,
                Math.round((actualAmountTotal / expectedAmountTotal) * 100),
              ),
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
          `/api/project-payable-plans?${query.toString()}`,
          {
            cache: "no-store",
          },
        );
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

    useImperativeHandle(
      ref,
      () => ({
        handleDeletePlan: async () => {
          if (!currentPlan) return;
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
            const contractRes = await fetch(
              `/api/vendor-contracts/${currentContract.id}`,
              {
                method: "DELETE",
              },
            );
            if (!contractRes.ok) {
              messageApi.error("删除供应商合同失败");
              return;
            }
          }
          messageApi.success("删除付款计划成功");
          await Promise.all([fetchPlans(), fetchVendorContracts()]);
        },
      }),
      [
        currentContract?.id,
        currentPlan,
        fetchPlans,
        fetchVendorContracts,
        messageApi,
      ],
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
      if (!vendorsLoaded) {
        void fetchVendors();
      }
    }, [
      fetchLegalEntities,
      fetchPlans,
      fetchStageOptions,
      fetchVendorContracts,
      fetchVendors,
      vendorsLoaded,
    ]);

    const planModalInitialValues = useMemo<
      Partial<ProjectPayablePlanFormValues>
    >(
      () =>
        planModalMode === "edit" && currentPlan
          ? {
              vendorId: currentPlan.vendorContract?.vendor?.id ?? undefined,
              legalEntityId:
                currentPlan.vendorContract?.legalEntity?.id ?? undefined,
              serviceContent:
                currentPlan.vendorContract?.serviceContent ?? undefined,
              ownerEmployeeId: currentPlan.ownerEmployeeId,
              contractAmount: currentPlan.contractAmount,
              remark: currentPlan.remark ?? undefined,
              remarkNeedsAttention: currentPlan.remarkNeedsAttention,
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
              remarkNeedsAttention: false,
            },
      [currentPlan, defaultOwnerFromProject, planModalMode, vendorContracts],
    );

    const handleSubmitPlan = async (values: ProjectPayablePlanFormValues) => {
      try {
        setCreatingPlan(true);
        const isEdit = planModalMode === "edit" && Boolean(currentPlan?.id);

        const currentContract =
          (currentPlan?.vendorContractId
            ? vendorContracts.find(
                (item) => item.id === currentPlan.vendorContractId,
              )
            : null) ??
          vendorContracts[0] ??
          null;

        const contractPayload = {
          projectId,
          vendorId: values.vendorId,
          legalEntityId: values.legalEntityId,
          serviceContent: values.serviceContent?.trim() || null,
          contractAmount:
            values.contractAmount === undefined ||
            values.contractAmount === null
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
            messageApi.error(
              currentContract ? "修改供应商合同失败" : "新增供应商合同失败",
            );
          }
          setCreatingPlan(false);
          return;
        }

        const savedContract = (await contractRes.json()) as VendorContract;
        const planRes = await fetch(
          isEdit
            ? `/api/project-payable-plans/${currentPlan?.id}`
            : "/api/project-payable-plans",
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
              remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
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
      async (row: PayableNode, values: ProjectPayableActualNodeFormValues) => {
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
        const res = await fetch(
          `/api/project-payable-actual-nodes/${actualNodeId}`,
          {
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
          },
        );

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
        const res = await fetch(
          `/api/project-payable-actual-nodes/${actualNodeId}`,
          {
            method: "DELETE",
          },
        );

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
            <ProCard split="horizontal" bordered>
              <ProCard split="vertical">
                <StatisticCard
                  style={{
                    background: "var(--ant-colorFillAlter, #fafafa)",
                  }}
                  statistic={{
                    title: "供应商",
                    value:
                      currentContract?.vendor?.fullName ||
                      currentContract?.vendor?.name ||
                      "-",
                    formatter: (value) =>
                      currentContract?.vendor?.id ? (
                        <AppLink href={`/vendors/${currentContract.vendor.id}`}>
                          {String(value || "-")}
                        </AppLink>
                      ) : (
                        String(value || "-")
                      ),
                    styles: { content: { fontSize: 18 } },
                  }}
                />
                <StatisticCard
                  style={{
                    background: "var(--ant-colorFillAlter, #fafafa)",
                  }}
                  statistic={{
                    title: "合同金额（含税）",
                    value:
                      currentContract?.contractAmount ??
                      currentPlan.contractAmount,
                    suffix: "元",
                    styles: { content: { fontSize: 18 } },
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{
                    background: "var(--ant-colorFillAlter, #fafafa)",
                  }}
                  statistic={{
                    title: "预付金额总计",
                    value: payableSummary.expectedAmountTotal,
                    suffix: "元",
                    styles: { content: { fontSize: 18 } },
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{
                    background: "var(--ant-colorFillAlter, #fafafa)",
                  }}
                  statistic={{
                    title: "实付金额总计",
                    value: payableSummary.actualAmountTotal,
                    suffix: "元",
                    styles: { content: { fontSize: 18 } },
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
              </ProCard>
              <ProCard>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 12,
                    color: "rgba(0,0,0,0.65)",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ minWidth: 30 }}>
                    {(payableSummary.percent ?? 0).toFixed(0)}%
                  </span>
                  <Progress
                    percent={payableSummary.percent ?? 0}
                    showInfo={false}
                    strokeColor="#1677ff"
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <span
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    实付{" "}
                    {Number(
                      payableSummary.actualAmountTotal ?? 0,
                    ).toLocaleString("zh-CN")}{" "}
                    / 预付{" "}
                    {Number(
                      payableSummary.expectedAmountTotal ?? 0,
                    ).toLocaleString("zh-CN")}{" "}
                    元
                  </span>
                </div>
              </ProCard>
              <ProCard split="vertical" bordered>
                <ProCard colSpan={10}>
                  <div
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    签约主体
                  </div>
                  <div style={{ wordBreak: "break-word" }}>
                    {currentContract?.legalEntity?.id ? (
                      <AppLink
                        href={`/legal-entities/${currentContract.legalEntity.id}`}
                      >
                        {currentContract.legalEntity.fullName ||
                          currentContract.legalEntity.name ||
                          "-"}
                      </AppLink>
                    ) : (
                      "-"
                    )}
                  </div>
                </ProCard>

                <ProCard colSpan={6}>
                  <div
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    服务内容
                  </div>
                  <div style={{ wordBreak: "break-word" }}>
                    {currentContract?.serviceContent?.trim()
                      ? currentContract.serviceContent
                      : "-"}
                  </div>
                </ProCard>

                <ProCard colSpan={4}>
                  <div
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    跟进人
                  </div>
                  <div style={{ wordBreak: "break-word" }}>
                    {currentPlan.ownerEmployee?.id ? (
                      <AppLink
                        href={`/employees/${currentPlan.ownerEmployee.id}`}
                      >
                        {currentPlan.ownerEmployee.name || "-"}
                      </AppLink>
                    ) : (
                      "-"
                    )}
                  </div>
                </ProCard>

                <ProCard>
                  <div
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    备注
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <RemarkText
                      remark={currentPlan.remark}
                      remarkNeedsAttention={currentPlan.remarkNeedsAttention}
                    />
                  </div>
                </ProCard>
              </ProCard>
            </ProCard>
            <ProjectPayableNodeTable
              title={`【${projectName}-${
                currentPlan.vendorContract?.vendor?.fullName ||
                currentPlan.vendorContract?.vendor?.name ||
                "-"
              }】付款节点`}
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
          vendorLoading={vendorsLoading || vendorContractsLoading}
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
          initialValues={{
            hasCustomerCollection: false,
            remarkNeedsAttention: false,
          }}
        />
      </>
    );
  },
);

ProjectPayableInfo.displayName = "ProjectPayableInfo";

export default ProjectPayableInfo;
