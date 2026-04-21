"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import ProjectFormModal from "@/components/ProjectFormModal";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import { useClientsStore } from "@/stores/clientsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useLegalEntitiesStore } from "@/stores/legalEntitiesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";
import ProjectReceivablePlanSnapshot from "@/components/project-detail/ProjectReceivablePlanSnapshot";
import ProjectReceivableNodeTable, {
  type ProjectReceivableNodeRow,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import ProjectReceivableNodeModal, {
  type ProjectReceivableNodeFormValues,
} from "@/components/project-detail/ProjectReceivableNodeModal";
import ReceivablePlanForm, { type PlanFormValues } from "./ReceivablePlanForm";
import type { ReceivableEntryDraft } from "./types";

type Props = {
  open: boolean;
  entry: ReceivableEntryDraft | null;
  onClose: () => void;
};

type SelectedProject = {
  id: string;
  name: string;
  clientId?: string | null;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type ExistingReceivablePlan = {
  id: string;
  clientContractId?: string | null;
  contractAmount: number;
  hasVendorPayment: boolean;
  serviceContent?: string | null;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  legalEntity?: {
    id: string;
    name: string;
  } | null;
  ownerEmployee?: {
    id: string;
    name: string;
  } | null;
  clientContract?: {
    id: string;
    contractAmount?: number | string | null;
    taxAmount?: number | string | null;
    legalEntity?: {
      id: string;
      name: string;
    } | null;
  } | null;
  nodes?: Array<{
    id: string;
    planId: string;
    stageOptionId?: string | null;
    sortOrder?: number | null;
    keyDeliverable?: string | null;
    expectedAmountTaxIncluded?: number | null;
    expectedDate?: string | null;
    expectedDateChangeCount?: number | null;
    remark?: string | null;
    remarkNeedsAttention?: boolean | null;
    stageOption?: {
      id: string;
      value: string;
      color?: string | null;
    } | null;
    actualNodes?: Array<{
      id: string;
      actualAmountTaxIncluded?: number | null;
      actualDate?: string | null;
      remark?: string | null;
      remarkNeedsAttention?: boolean | null;
    }>;
  }>;
};

const TOTAL_STEPS = 3;

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

const parseImportedDate = (value: string) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = dayjs(text);
  return parsed.isValid() ? parsed : null;
};

const isInternalProject = (project: {
  type?: unknown;
  typeOption?: { value?: string | null } | null;
}) => {
  const type = typeof project.type === "string" ? project.type : "";
  return (
    type === "INTERNAL" ||
    type === "内部项目" ||
    project.typeOption?.value === "内部项目"
  );
};

const resolveProjectFromRaw = (raw: {
  id: string;
  name?: string | null;
  [key: string]: unknown;
}): SelectedProject => {
  const statusOptionRaw = raw.statusOption as
    | { id?: string; value?: string | null; color?: string | null }
    | null
    | undefined;
  const clientIdRaw = raw.clientId;
  return {
    id: raw.id,
    name: String(raw.name ?? ""),
    clientId: typeof clientIdRaw === "string" ? clientIdRaw : null,
    statusOption: statusOptionRaw ?? null,
  };
};

export default function ProcessingReceivableDrawer({ open, entry, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage();

  const [step, setStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [existingPlan, setExistingPlan] = useState<ExistingReceivablePlan | null>(null);
  const [checkingExistingPlan, setCheckingExistingPlan] = useState(false);
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
  const [loadingStageOptions, setLoadingStageOptions] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);
  const [importedNodeRows, setImportedNodeRows] = useState<ReceivableEntryDraft["nodes"]>(
    [],
  );
  const [targetNodeDraft, setTargetNodeDraft] = useState<
    ReceivableEntryDraft["nodes"][number] | null
  >(null);

  const [planForm] = Form.useForm<PlanFormValues>();

  const projectsById = useProjectsStore((state) => state.byId);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const upsertProjects = useProjectsStore((state) => state.upsertProjects);

  const clients = useClientsStore((state) => state.clients);
  const clientsLoaded = useClientsStore((state) => state.loaded);
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);
  const industryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_SELECT_OPTIONS,
  );
  const selectOptionsLoaded = useSelectOptionsStore((state) => state.loaded);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);

  const legalEntities = useLegalEntitiesStore((state) => state.legalEntities);
  const legalEntitiesLoading = useLegalEntitiesStore((state) => state.loading);
  const legalEntitiesLoaded = useLegalEntitiesStore((state) => state.loaded);
  const fetchLegalEntitiesFromStore = useLegalEntitiesStore((state) => state.fetchLegalEntities);

  const employees = useEmployeesStore((state) => state.employees);
  const employeesLoaded = useEmployeesStore((state) => state.loaded);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  // Snapshot of project IDs before creating, used to auto-select the new project afterward
  const projectIdSnapshotRef = useRef<Set<string>>(new Set());

  // Load projects and clients when drawer opens
  useEffect(() => {
    if (!open) return;
    void fetchProjectsFromStore();
  }, [open, fetchProjectsFromStore]);

  useEffect(() => {
    if (!open) return;
    if (clientsLoaded) return;
    void fetchClientsFromStore();
  }, [open, clientsLoaded, fetchClientsFromStore]);

  useEffect(() => {
    if (!open) return;
    if (legalEntitiesLoaded) return;
    void fetchLegalEntitiesFromStore();
  }, [open, legalEntitiesLoaded, fetchLegalEntitiesFromStore]);

  useEffect(() => {
    if (!open) return;
    if (employeesLoaded) return;
    void fetchEmployeesFromStore();
  }, [open, employeesLoaded, fetchEmployeesFromStore]);

  useEffect(() => {
    if (!open) return;
    setImportedNodeRows(entry?.nodes ?? []);
  }, [open, entry?.key]);

  useEffect(() => {
    if (!open) return;
    if (selectOptionsLoaded) return;
    void fetchAllOptions();
  }, [open, selectOptionsLoaded, fetchAllOptions]);

  const handleAfterOpenChange = (visible: boolean) => {
    if (!visible) {
      setStep(0);
      setSelectedProject(null);
      setCreatedPlanId(null);
      setExistingPlan(null);
      setCheckingExistingPlan(false);
      setNodeModalOpen(false);
      setImportedNodeRows([]);
      setTargetNodeDraft(null);
      planForm.resetFields();
    }
  };

  const fetchExistingPlan = useCallback(async (projectId: string) => {
    setCheckingExistingPlan(true);
    try {
      const query = new URLSearchParams({ projectId });
      const response = await fetch(
        `/api/project-receivable-plans?${query.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setExistingPlan(null);
        return;
      }
      const rows = (await response.json()) as ExistingReceivablePlan[];
      const matched = Array.isArray(rows)
        ? (rows.find((row) => Boolean(row.clientContractId)) ?? null)
        : null;
      setExistingPlan(matched);
    } catch {
      setExistingPlan(null);
    } finally {
      setCheckingExistingPlan(false);
    }
  }, []);

  const fetchStageOptions = useCallback(async () => {
    setLoadingStageOptions(true);
    try {
      const query = new URLSearchParams({ field: "projectReceivable.stage" });
      const response = await fetch(`/api/select-options?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setStageOptions([]);
        return;
      }
      const rows = (await response.json()) as StageOption[];
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
        ].sort((left, right) => left.value.localeCompare(right.value, "zh-CN")),
      );
      return createdStage.id;
    },
    [stageOptions],
  );

  const projectOptions = useMemo(() => {
    return Object.values(projectsById)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.id))
      .filter((p) => !isInternalProject(p as Parameters<typeof isInternalProject>[0]))
      .map((p) => ({
        label: `${String(p.name ?? "未命名项目")}${p.isArchived ? "（已归档）" : ""}`,
        value: p.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  }, [projectsById]);

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        id: c.id,
        name: String(c.name ?? ""),
      })),
    [clients],
  );

  const handleProjectChange = useCallback(
    (value: string | undefined) => {
      if (!value) {
        setSelectedProject(null);
        setExistingPlan(null);
        setCheckingExistingPlan(false);
        return;
      }
      const raw = projectsById[value];
      if (!raw) return;
      setSelectedProject(resolveProjectFromRaw(raw));
    },
    [projectsById],
  );

  const handleStatusSaved = useCallback(
    async (nextOption: { id: string; value: string; color: string }) => {
      if (!selectedProject) return;
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextOption.value }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "更新项目状态失败");
      }
      const updated = await response.json() as Record<string, unknown>;
      const statusOptionRaw = updated.statusOption as
        | { id?: string; value?: string | null; color?: string | null }
        | null
        | undefined;
      setSelectedProject((prev) =>
        prev ? { ...prev, statusOption: statusOptionRaw ?? null } : prev,
      );
    },
    [selectedProject],
  );

  const handleStatusUpdated = useCallback(async () => {
    const rows = await fetchProjectsFromStore({ force: true });
    upsertProjects(rows);
  }, [fetchProjectsFromStore, upsertProjects]);

  useEffect(() => {
    if (!open) return;
    if (!selectedProject?.id) return;
    void fetchExistingPlan(selectedProject.id);
  }, [fetchExistingPlan, open, selectedProject?.id]);

  useEffect(() => {
    if (!open) return;
    void fetchStageOptions();
  }, [fetchStageOptions, open]);

  const handleOpenCreateProject = useCallback(() => {
    projectIdSnapshotRef.current = new Set(Object.keys(projectsById));
    setCreateProjectOpen(true);
  }, [projectsById]);

  const handleProjectCreated = useCallback(async () => {
    setCreateProjectOpen(false);
    const rows = await fetchProjectsFromStore({ force: true });
    upsertProjects(rows);

    // Auto-select the first project ID that didn't exist before creation
    const snapshot = projectIdSnapshotRef.current;
    const newProject = rows.find((r) => !snapshot.has(r.id));
    if (newProject) {
      setSelectedProject(resolveProjectFromRaw(newProject));
    }
  }, [fetchProjectsFromStore, upsertProjects]);

  const handleClientCreated = useCallback(() => {
    setCreateClientOpen(false);
    void fetchClientsFromStore(true);
  }, [fetchClientsFromStore]);

  const isStepValid = useCallback(
    (s: number): boolean => {
      if (s === 0) return Boolean(selectedProject);
      return true;
    },
    [selectedProject],
  );

  const existingPlanSummary = useMemo(() => {
    if (!existingPlan) {
      return { expectedAmountTotal: 0, actualAmountTotal: 0 };
    }
    const expectedAmountTotal = (existingPlan.nodes ?? []).reduce(
      (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
      0,
    );
    const actualAmountTotal = (existingPlan.nodes ?? []).reduce((sum, node) => {
      const nodeActual = (node.actualNodes ?? []).reduce(
        (nodeSum, actual) => nodeSum + Number(actual.actualAmountTaxIncluded ?? 0),
        0,
      );
      return sum + nodeActual;
    }, 0);
    return { expectedAmountTotal, actualAmountTotal };
  }, [existingPlan]);

  const handleNext = useCallback(() => {
    if (!isStepValid(step)) return;
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, [isStepValid, step]);

  const handlePrev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Step 1: validate form → create ClientContract → create ReceivablePlan → advance
  const handlePlanNext = useCallback(async () => {
    if (existingPlan?.clientContractId) {
      setCreatedPlanId(existingPlan.id);
      setStep(2);
      return;
    }

    if (!selectedProject || !entry) return;

    let values: PlanFormValues;
    try {
      values = await planForm.validateFields();
    } catch {
      return; // antd shows field errors inline
    }

    const clientId = selectedProject.clientId;
    if (!clientId) {
      messageApi.error("所选项目没有关联客户，无法创建收款计划");
      return;
    }

    setPlanSubmitting(true);
    try {
      // 1. Create ClientContract
      const contractRes = await fetch("/api/client-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          legalEntityId: values.legalEntityId,
          contractAmount: values.contractAmount,
          taxAmount: values.taxAmount,
        }),
      });
      if (!contractRes.ok) {
        const text = await contractRes.text();
        if (contractRes.status === 409) {
          messageApi.error("当前项目已存在客户合同");
        } else {
          messageApi.error(text || "新建客户合同失败");
        }
        return;
      }
      const savedContract = (await contractRes.json()) as { id: string };

      // 2. Create ReceivablePlan
      const planRes = await fetch("/api/project-receivable-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          clientId,
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
      if (!planRes.ok) {
        const text = await planRes.text();
        messageApi.error(text || "新增收款计划失败");
        return;
      }
      const savedPlan = (await planRes.json()) as { id: string };
      setCreatedPlanId(savedPlan.id);
      messageApi.success("收款计划已创建");
      setStep(2);
    } catch {
      messageApi.error("操作失败，请重试");
    } finally {
      setPlanSubmitting(false);
    }
  }, [existingPlan, selectedProject, entry, planForm, messageApi]);

  const handleCreateNode = useCallback(
    async (values: ProjectReceivableNodeFormValues) => {
      const planId = createdPlanId || existingPlan?.id || null;
      if (!planId) {
        messageApi.error("未找到收款计划，请先完成上一步");
        return;
      }
      const hasActualAmount =
        values.actualAmountTaxIncluded !== undefined &&
        values.actualAmountTaxIncluded !== null;
      const hasActualDate = Boolean(values.actualDate);
      if (hasActualAmount !== hasActualDate) {
        messageApi.error("请同时填写实收金额和实收日期，或同时留空");
        return;
      }

      setCreatingNode(true);
      try {
        const stageOptionId = await resolveStageOptionId(values.stage);
        if (!stageOptionId) {
          messageApi.error("请选择收款阶段");
          return;
        }

        const response = await fetch("/api/project-receivable-nodes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
            stageOptionId,
            keyDeliverable: values.keyDeliverable,
            expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
            expectedDate: values.expectedDate?.toISOString(),
            actualAmountTaxIncluded: hasActualAmount
              ? values.actualAmountTaxIncluded
              : undefined,
            actualDate: hasActualDate
              ? values.actualDate?.toISOString()
              : undefined,
            remark: values.remark ?? null,
            remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          messageApi.error(text || "新增收款节点失败");
          return;
        }
        if (selectedProject?.id) {
          await fetchExistingPlan(selectedProject.id);
        }
        if (targetNodeDraft?.key) {
          setImportedNodeRows((prev) =>
            prev.filter((item) => item.key !== targetNodeDraft.key),
          );
        }

        messageApi.success("新增收款节点成功");
        setNodeModalOpen(false);
        setTargetNodeDraft(null);
      } finally {
        setCreatingNode(false);
      }
    },
    [
      createdPlanId,
      existingPlan?.id,
      fetchExistingPlan,
      messageApi,
      resolveStageOptionId,
      selectedProject?.id,
      targetNodeDraft?.key,
    ],
  );
  const handleEditExistingNode = useCallback(
    async (
      row: ProjectReceivableNodeRow,
      values: ProjectReceivableNodeFormValues,
    ) => {
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择收款阶段");
        return;
      }
      const response = await fetch(`/api/project-receivable-nodes/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stageOptionId,
          keyDeliverable: values.keyDeliverable,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "编辑收款节点失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
      messageApi.success("编辑收款节点成功");
    },
    [fetchExistingPlan, messageApi, resolveStageOptionId, selectedProject?.id],
  );
  const handleDeleteExistingNode = useCallback(
    async (nodeId: string) => {
      const response = await fetch(`/api/project-receivable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "删除收款节点失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
      messageApi.success("删除收款节点成功");
    },
    [fetchExistingPlan, messageApi, selectedProject?.id],
  );
  const handleDragSortExistingNodes = useCallback(
    async (nextRows: ProjectReceivableNodeRow[]) => {
      await Promise.all(
        nextRows.map((item, index) =>
          fetch(`/api/project-receivable-nodes/${item.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sortOrder: index }),
          }),
        ),
      );
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
    },
    [fetchExistingPlan, selectedProject?.id],
  );
  const handleCollectExistingNode = useCallback(
    async (
      row: ProjectReceivableNodeRow,
      values: ProjectReceivableActualNodeFormValues,
    ) => {
      const response = await fetch("/api/project-receivable-actual-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receivableNodeId: row.id,
          actualAmountTaxIncluded: values.actualAmountTaxIncluded,
          actualDate: values.actualDate?.toISOString(),
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "新增实收失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
      messageApi.success("新增实收成功");
    },
    [fetchExistingPlan, messageApi, selectedProject?.id],
  );
  const handleEditExistingActualNode = useCallback(
    async (
      actualNodeId: string,
      values: ProjectReceivableActualNodeFormValues,
    ) => {
      const response = await fetch(
        `/api/project-receivable-actual-nodes/${actualNodeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actualAmountTaxIncluded: values.actualAmountTaxIncluded,
            actualDate: values.actualDate?.toISOString(),
            remark: values.remark ?? null,
            remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
          }),
        },
      );
      if (!response.ok) {
        messageApi.error((await response.text()) || "编辑实收失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
      messageApi.success("编辑实收成功");
    },
    [fetchExistingPlan, messageApi, selectedProject?.id],
  );
  const handleDeleteExistingActualNode = useCallback(
    async (actualNodeId: string) => {
      const response = await fetch(
        `/api/project-receivable-actual-nodes/${actualNodeId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        messageApi.error((await response.text()) || "删除实收失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlan(selectedProject.id);
      }
      messageApi.success("删除实收成功");
    },
    [fetchExistingPlan, messageApi, selectedProject?.id],
  );

  const footer = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      {step > 0 && (
        <Button onClick={handlePrev} disabled={planSubmitting}>
          上一步
        </Button>
      )}
      {step < TOTAL_STEPS - 1 ? (
        step === 1 ? (
          <Button
            type="primary"
            loading={planSubmitting}
            disabled={checkingExistingPlan}
            onClick={() => void handlePlanNext()}
          >
            下一步
          </Button>
        ) : (
          <Button
            type="primary"
            disabled={!isStepValid(step)}
            onClick={handleNext}
          >
            下一步
          </Button>
        )
      ) : (
        <Button type="primary" onClick={onClose}>
          完成
        </Button>
      )}
    </div>
  );

  const nodeColumns = useMemo<ColumnsType<ReceivableEntryDraft["nodes"][number]>>(
    () => [
      {
        title: "收款阶段",
        dataIndex: "stageName",
        width: 140,
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "关键交付物",
        dataIndex: "keyDeliverable",
        width: 220,
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "预收金额",
        dataIndex: "expectedAmountTaxIncluded",
        width: 140,
        render: (value: number | null) =>
          typeof value === "number" ? `${value.toLocaleString("zh-CN")} 元` : "-",
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        width: 140,
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "备注",
        dataIndex: "remark",
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "操作",
        key: "actions",
        width: 140,
        render: (_value, row) => (
          <Button
            type="link"
            onClick={() => {
              setTargetNodeDraft(row);
              setNodeModalOpen(true);
            }}
          >
            创建收款节点
          </Button>
        ),
      },
    ],
    [],
  );

  const existingReceivableNodeRows = useMemo<ProjectReceivableNodeRow[]>(
    () =>
      (existingPlan?.nodes ?? []).map((node, index) => ({
        id: node.id,
        planId: node.planId,
        stageOptionId: node.stageOptionId ?? "",
        stageOption: node.stageOption
          ? {
              id: node.stageOption.id,
              value: node.stageOption.value,
              color: node.stageOption.color ?? null,
            }
          : null,
        sortOrder: Number(node.sortOrder ?? index),
        keyDeliverable: node.keyDeliverable ?? "",
        expectedAmountTaxIncluded: Number(node.expectedAmountTaxIncluded ?? 0),
        expectedDate: node.expectedDate ?? "",
        expectedDateChangeCount: Number(node.expectedDateChangeCount ?? 0),
        remark: node.remark ?? null,
        remarkNeedsAttention: Boolean(node.remarkNeedsAttention),
        actualNodes: (node.actualNodes ?? []).map((actual) => ({
          id: actual.id,
          actualAmountTaxIncluded:
            actual.actualAmountTaxIncluded === null ||
            actual.actualAmountTaxIncluded === undefined
              ? null
              : Number(actual.actualAmountTaxIncluded),
          actualDate: actual.actualDate ?? null,
          remark: actual.remark ?? null,
          remarkNeedsAttention: Boolean(actual.remarkNeedsAttention),
        })),
      })),
    [existingPlan?.nodes],
  );

  const shouldRenderPlanForm =
    step === 1 &&
    Boolean(entry) &&
    Boolean(selectedProject) &&
    !checkingExistingPlan &&
    !existingPlan?.clientContractId;

  return (
    <>
      {contextHolder}
      <Drawer
        title={
          entry
            ? `处理收款条目：${entry.brandName || "-"} - ${entry.serviceContent || "-"}`
            : "处理收款条目"
        }
        size="70%"
        open={open}
        onClose={onClose}
        afterOpenChange={handleAfterOpenChange}
        footer={footer}
      >
        <Steps
          current={step}
          items={[
            { title: "关联项目" },
            { title: "创建收款计划" },
            { title: "补充收款节点" },
          ]}
        />

        <div style={{ marginTop: 24 }}>
          {!shouldRenderPlanForm && <Form form={planForm} component={false} />}
          {step === 0 && entry && (
            <>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="品牌名">{entry.brandName || "-"}</Descriptions.Item>
                <Descriptions.Item label="服务内容">{entry.serviceContent || "-"}</Descriptions.Item>
                <Descriptions.Item label="跟进人">{entry.ownerName || "-"}</Descriptions.Item>
                <Descriptions.Item label="项目状态">{entry.projectStatus || "-"}</Descriptions.Item>
              </Descriptions>

              <Divider />

              <Space orientation="vertical" style={{ width: "100%" }} size={16}>
                <Select
                  allowClear
                  showSearch
                  placeholder="搜索并选择项目（必填）"
                  style={{ width: "100%" }}
                  options={projectOptions}
                  value={selectedProject?.id ?? undefined}
                  optionFilterProp="label"
                  status={selectedProject ? undefined : "warning"}
                  onChange={(value) =>
                    handleProjectChange(typeof value === "string" ? value : undefined)
                  }
                />

                {selectedProject && (
                  <Space size={8} align="center">
                    <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                      项目状态：
                    </span>
                    <SelectOptionQuickEditTag
                      field="project.status"
                      option={
                        selectedProject.statusOption?.value
                          ? {
                              id: selectedProject.statusOption.id ?? "",
                              value: selectedProject.statusOption.value,
                              color: selectedProject.statusOption.color ?? null,
                            }
                          : null
                      }
                      fallbackText="未设置"
                      modalTitle="修改项目状态"
                      onSaveSelection={handleStatusSaved}
                      onUpdated={handleStatusUpdated}
                    />
                  </Space>
                )}

                <Space size={8} align="center">
                  <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                    搜不到项目？
                  </span>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateProject}
                  >
                    创建新项目
                  </Button>
                </Space>

                <Space size={8} align="center">
                  <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                    搜不到客户？
                  </span>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateClientOpen(true)}
                  >
                    创建新客户
                  </Button>
                </Space>
              </Space>
            </>
          )}

          {step === 1 && entry && selectedProject && (
            checkingExistingPlan ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <Spin />
              </div>
            ) : existingPlan?.clientContractId ? (
              <>
                <Alert
                  style={{ marginBottom: 12 }}
                  type="info"
                  showIcon
                  title="项目已有收款计划"
                />
                <ProjectReceivablePlanSnapshot
                  contractAmount={Number(
                    existingPlan.clientContract?.contractAmount ??
                      existingPlan.contractAmount ??
                      0,
                  )}
                  taxAmount={existingPlan.clientContract?.taxAmount}
                  expectedAmountTotal={existingPlanSummary.expectedAmountTotal}
                  actualAmountTotal={existingPlanSummary.actualAmountTotal}
                  legalEntityName={
                    existingPlan.clientContract?.legalEntity?.name ||
                    existingPlan.legalEntity?.name
                  }
                  serviceContent={existingPlan.serviceContent}
                  ownerName={existingPlan.ownerEmployee?.name}
                  hasVendorPayment={Boolean(existingPlan.hasVendorPayment)}
                  remark={existingPlan.remark}
                  remarkNeedsAttention={existingPlan.remarkNeedsAttention}
                />
              </>
            ) : (
              <ReceivablePlanForm
                form={planForm}
                entry={entry}
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                legalEntities={legalEntities}
                legalEntitiesLoading={legalEntitiesLoading}
                employees={employees}
              />
            )
          )}
          {step === 2 && (
            <>
              <Table
                rowKey="key"
                columns={nodeColumns}
                dataSource={importedNodeRows}
                pagination={false}
                scroll={{ x: "max-content" }}
              />
              {existingReceivableNodeRows.length > 0 && (
                <>
                  <Divider />
                  <Alert
                    style={{ marginBottom: 12 }}
                    type="info"
                    showIcon
                    title="收款计划已有节点"
                  />
                  <ProjectReceivableNodeTable
                    title={`【${selectedProject?.name || "-"}】收款节点`}
                    rows={existingReceivableNodeRows}
                    stageOptions={stageOptions}
                    canManageProject
                    onAddNode={() => {
                      setTargetNodeDraft(null);
                      setNodeModalOpen(true);
                    }}
                    onDeleteNode={handleDeleteExistingNode}
                    onEditNode={handleEditExistingNode}
                    onDragSortNodes={handleDragSortExistingNodes}
                    onCollectNode={handleCollectExistingNode}
                    onEditActualNode={handleEditExistingActualNode}
                    onDeleteActualNode={handleDeleteExistingActualNode}
                  />
                </>
              )}
            </>
          )}
        </div>
      </Drawer>

      <ProjectFormModal
        open={createProjectOpen}
        projectType="CLIENT"
        clients={clientOptions}
        onCancel={() => setCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />
      <ClientFormModal
        open={createClientOpen}
        onCancel={() => setCreateClientOpen(false)}
        onSuccess={handleClientCreated}
        industryOptions={industryOptions}
      />
      <ProjectReceivableNodeModal
        open={nodeModalOpen}
        loading={creatingNode}
        onCancel={() => {
          setNodeModalOpen(false);
          setTargetNodeDraft(null);
        }}
        onSubmit={handleCreateNode}
        stageOptions={stageOptions.map((item) => ({
          id: item.id,
          value: item.value,
          color: item.color ?? undefined,
        }))}
        stageOptionsLoading={loadingStageOptions}
        initialValues={
          targetNodeDraft
            ? {
                stage: targetNodeDraft.stageName || undefined,
                keyDeliverable: targetNodeDraft.keyDeliverable || "",
                expectedAmountTaxIncluded:
                  targetNodeDraft.expectedAmountTaxIncluded ?? undefined,
                expectedDate: parseImportedDate(targetNodeDraft.expectedDate) ?? undefined,
                actualAmountTaxIncluded:
                  targetNodeDraft.actualAmountTaxIncluded ?? undefined,
                actualDate:
                  parseImportedDate(targetNodeDraft.actualDate) ?? undefined,
                remark: targetNodeDraft.remark || undefined,
                remarkNeedsAttention: Boolean(targetNodeDraft.remarkNeedsAttention),
              }
            : {
                remarkNeedsAttention: false,
              }
        }
        actualAmountTaxIncluded={targetNodeDraft?.actualAmountTaxIncluded ?? null}
        actualDate={
          targetNodeDraft?.actualDate
            ? parseImportedDate(targetNodeDraft.actualDate)
            : null
        }
      />
    </>
  );
}
