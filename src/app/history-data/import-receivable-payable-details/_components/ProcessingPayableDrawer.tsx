"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Switch,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import ClientFormModal from "@/components/ClientFormModal";
import ProjectFormModal from "@/components/ProjectFormModal";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import VendorFormModal from "@/components/VendorFormModal";
import ProjectPayableNodeModal, {
  type ProjectPayableNodeFormValues,
} from "@/components/project-detail/ProjectPayableNodeModal";
import ProjectPayableNodeTable, {
  type ProjectPayableNodeRow,
} from "@/components/project-detail/ProjectPayableNodeTable";
import ProjectPayablePlanSnapshot from "@/components/project-detail/ProjectPayablePlanSnapshot";
import type { ProjectPayableActualNodeFormValues } from "@/components/project-detail/ProjectPayableActualNodeModal";
import { useClientsStore } from "@/stores/clientsStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useLegalEntitiesStore } from "@/stores/legalEntitiesStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { useSelectOptionsStore } from "@/stores/selectOptionsStore";
import { useVendorsStore } from "@/stores/vendorsStore";
import { EMPTY_SELECT_OPTIONS } from "@/types/selectOption";
import type { PayableEntryDraft } from "./types";

type Props = {
  open: boolean;
  entry: PayableEntryDraft | null;
  onClose: () => void;
};

type SelectedProject = {
  id: string;
  name: string;
  statusOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type ExistingPayablePlan = {
  id: string;
  contractAmount: number;
  hasCustomerCollection: boolean;
  serviceContent?: string | null;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  ownerEmployee?: {
    id: string;
    name: string;
  } | null;
  vendorContract?: {
    id: string;
    serviceContent?: string | null;
    contractAmount?: number | string | null;
    vendor?: {
      id: string;
      name?: string | null;
      fullName?: string | null;
    } | null;
    legalEntity?: {
      id: string;
      name?: string | null;
    } | null;
  } | null;
  nodes?: Array<{
    id: string;
    planId: string;
    stageOptionId?: string | null;
    sortOrder?: number | null;
    paymentCondition?: string | null;
    expectedAmountTaxIncluded?: number | null;
    expectedDate?: string | null;
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
      remarkNeedsAttention?: boolean;
    }>;
  }>;
};

type PayablePlanFormValues = {
  legalEntityId?: string;
  ownerEmployeeId?: string;
  contractAmount?: number;
  serviceContent?: string;
  hasCustomerCollection?: boolean;
  remark?: string;
  remarkNeedsAttention?: boolean;
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
  return {
    id: raw.id,
    name: String(raw.name ?? ""),
    statusOption: statusOptionRaw ?? null,
  };
};

export default function ProcessingPayableDrawer({ open, entry, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage();

  const [step, setStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [existingPlans, setExistingPlans] = useState<ExistingPayablePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkingExistingPlans, setCheckingExistingPlans] = useState(false);
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
  const [loadingStageOptions, setLoadingStageOptions] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);
  const [importedNodeRows, setImportedNodeRows] = useState<PayableEntryDraft["nodes"]>([]);
  const [targetNodeDraft, setTargetNodeDraft] = useState<
    PayableEntryDraft["nodes"][number] | null
  >(null);

  const [planForm] = Form.useForm<PayablePlanFormValues>();

  const projectsById = useProjectsStore((state) => state.byId);
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);
  const upsertProjects = useProjectsStore((state) => state.upsertProjects);

  const clients = useClientsStore((state) => state.clients);
  const clientsLoaded = useClientsStore((state) => state.loaded);
  const fetchClientsFromStore = useClientsStore((state) => state.fetchClients);

  const vendors = useVendorsStore((state) => state.vendors);
  const vendorsLoaded = useVendorsStore((state) => state.loaded);
  const fetchVendorsFromStore = useVendorsStore((state) => state.fetchVendors);

  const legalEntities = useLegalEntitiesStore((state) => state.legalEntities);
  const legalEntitiesLoading = useLegalEntitiesStore((state) => state.loading);
  const legalEntitiesLoaded = useLegalEntitiesStore((state) => state.loaded);
  const fetchLegalEntitiesFromStore = useLegalEntitiesStore((state) => state.fetchLegalEntities);

  const employees = useEmployeesStore((state) => state.employees);
  const employeesLoaded = useEmployeesStore((state) => state.loaded);
  const fetchEmployeesFromStore = useEmployeesStore((state) => state.fetchEmployees);

  const clientIndustryOptions = useSelectOptionsStore(
    (state) => state.optionsByField["client.industry"] ?? EMPTY_SELECT_OPTIONS,
  );
  const vendorTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.vendorType"] ?? EMPTY_SELECT_OPTIONS,
  );
  const businessTypeOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.businessType"] ?? EMPTY_SELECT_OPTIONS,
  );
  const servicesOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.services"] ?? EMPTY_SELECT_OPTIONS,
  );
  const cooperationStatusOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.cooperationStatus"] ?? EMPTY_SELECT_OPTIONS,
  );
  const ratingOptions = useSelectOptionsStore(
    (state) => state.optionsByField["vendor.rating"] ?? EMPTY_SELECT_OPTIONS,
  );
  const selectOptionsLoaded = useSelectOptionsStore((state) => state.loaded);
  const fetchAllOptions = useSelectOptionsStore((state) => state.fetchAllOptions);

  const projectIdSnapshotRef = useRef<Set<string>>(new Set());
  const vendorIdSnapshotRef = useRef<Set<string>>(new Set());
  const vendorAutoMatchTriedForEntryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetchProjectsFromStore();
  }, [fetchProjectsFromStore, open]);

  useEffect(() => {
    if (!open) return;
    if (clientsLoaded) return;
    void fetchClientsFromStore();
  }, [clientsLoaded, fetchClientsFromStore, open]);

  useEffect(() => {
    if (!open) return;
    if (vendorsLoaded) return;
    void fetchVendorsFromStore();
  }, [fetchVendorsFromStore, open, vendorsLoaded]);

  useEffect(() => {
    if (!open) return;
    if (legalEntitiesLoaded) return;
    void fetchLegalEntitiesFromStore();
  }, [fetchLegalEntitiesFromStore, legalEntitiesLoaded, open]);

  useEffect(() => {
    if (!open) return;
    if (employeesLoaded) return;
    void fetchEmployeesFromStore();
  }, [employeesLoaded, fetchEmployeesFromStore, open]);

  useEffect(() => {
    if (!open) return;
    if (selectOptionsLoaded) return;
    void fetchAllOptions();
  }, [fetchAllOptions, open, selectOptionsLoaded]);

  const fetchExistingPlans = useCallback(async (projectId: string) => {
    setCheckingExistingPlans(true);
    try {
      const query = new URLSearchParams({ projectId });
      const response = await fetch(`/api/project-payable-plans?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setExistingPlans([]);
        setSelectedPlanId(null);
        return;
      }
      const rows = (await response.json()) as ExistingPayablePlan[];
      const nextPlans = Array.isArray(rows) ? rows : [];
      setExistingPlans(nextPlans);
      setSelectedPlanId((prev) => {
        if (!prev) return null;
        return nextPlans.some((plan) => plan.id === prev) ? prev : null;
      });
    } catch {
      setExistingPlans([]);
      setSelectedPlanId(null);
    } finally {
      setCheckingExistingPlans(false);
    }
  }, []);

  const fetchStageOptions = useCallback(async () => {
    setLoadingStageOptions(true);
    try {
      const query = new URLSearchParams({ field: "projectPayable.stage" });
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
        ].sort((left, right) => left.value.localeCompare(right.value, "zh-CN")),
      );
      return createdStage.id;
    },
    [stageOptions],
  );

  useEffect(() => {
    if (!open) return;
    if (!selectedProject?.id) return;
    void fetchExistingPlans(selectedProject.id);
  }, [fetchExistingPlans, open, selectedProject?.id]);

  useEffect(() => {
    if (!open) return;
    setImportedNodeRows(entry?.nodes ?? []);
  }, [entry?.nodes, open]);

  useEffect(() => {
    if (!open) return;
    void fetchStageOptions();
  }, [fetchStageOptions, open]);

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

  const legalEntityOptions = useMemo(
    () => legalEntities.map((item) => ({ label: item.name, value: item.id })),
    [legalEntities],
  );

  const ownerOptions = useMemo(
    () => employees.map((item) => ({ label: item.name, value: item.id })),
    [employees],
  );

  const matchedLegalEntityId = useMemo(() => {
    const company = String(entry?.contractCompany ?? "").trim();
    if (!company || legalEntities.length === 0) return undefined;
    return legalEntities.find(
      (le) => company.includes(le.name) || le.name.includes(company),
    )?.id;
  }, [entry?.contractCompany, legalEntities]);

  const matchedOwnerId = useMemo(() => {
    const ownerName = String(entry?.ownerName ?? "").trim();
    if (!ownerName || employees.length === 0) return undefined;
    return employees.find((item) => item.name === ownerName)?.id;
  }, [employees, entry?.ownerName]);

  useEffect(() => {
    if (!open) return;
    planForm.setFieldsValue({
      legalEntityId: matchedLegalEntityId,
      ownerEmployeeId: matchedOwnerId,
      contractAmount: entry?.contractAmount ?? undefined,
      serviceContent: entry?.serviceContent || undefined,
      hasCustomerCollection: Boolean(entry?.hasCustomerCollection),
      remarkNeedsAttention: false,
    });
  }, [
    entry?.contractAmount,
    entry?.hasCustomerCollection,
    entry?.serviceContent,
    matchedLegalEntityId,
    matchedOwnerId,
    open,
    planForm,
  ]);

  useEffect(() => {
    if (!open) return;
    if (selectedVendorId) return;
    if (!entry?.key) return;
    if (vendorAutoMatchTriedForEntryRef.current === entry.key) return;

    const normalize = (value: string) => value.trim().toLowerCase();
    const supplierName = normalize(String(entry.supplierName ?? ""));
    const shortName = normalize(String(entry.vendorShortName ?? ""));
    const fullName = normalize(String(entry.vendorFullName ?? ""));
    const keywords = [supplierName, shortName, fullName].filter(Boolean);

    if (keywords.length === 0) {
      vendorAutoMatchTriedForEntryRef.current = entry.key;
      return;
    }

    const exactMatched = vendors.find((item) => {
      const vendorName = normalize(String(item.name ?? ""));
      const vendorFullName = normalize(String(item.fullName ?? ""));
      return keywords.some((target) => target === vendorName || target === vendorFullName);
    });

    const fuzzyMatched =
      exactMatched ??
      vendors.find((item) => {
        const vendorName = normalize(String(item.name ?? ""));
        const vendorFullName = normalize(String(item.fullName ?? ""));
        return keywords.some(
          (target) =>
            vendorName.includes(target) ||
            vendorFullName.includes(target) ||
            target.includes(vendorName),
        );
      });

    if (fuzzyMatched?.id) {
      setSelectedVendorId(fuzzyMatched.id);
    }

    vendorAutoMatchTriedForEntryRef.current = entry.key;
  }, [entry, open, selectedVendorId, vendors]);

  const handleAfterOpenChange = (visible: boolean) => {
    if (!visible) {
      setStep(0);
      setSelectedProject(null);
      setSelectedVendorId(null);
      setCreateClientOpen(false);
      setCreateVendorOpen(false);
      setExistingPlans([]);
      setSelectedPlanId(null);
      setCheckingExistingPlans(false);
      setNodeModalOpen(false);
      setTargetNodeDraft(null);
      setImportedNodeRows([]);
      vendorAutoMatchTriedForEntryRef.current = null;
      planForm.resetFields();
    }
  };

  const handleProjectChange = useCallback(
    (value: string | undefined) => {
      if (!value) {
        setSelectedProject(null);
        setExistingPlans([]);
        setSelectedPlanId(null);
        setCheckingExistingPlans(false);
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
      const updated = (await response.json()) as Record<string, unknown>;
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

  const handleOpenCreateProject = useCallback(() => {
    projectIdSnapshotRef.current = new Set(Object.keys(projectsById));
    setCreateProjectOpen(true);
  }, [projectsById]);

  const handleProjectCreated = useCallback(async () => {
    setCreateProjectOpen(false);
    const rows = await fetchProjectsFromStore({ force: true });
    upsertProjects(rows);
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

  const handleOpenCreateVendor = useCallback(() => {
    vendorIdSnapshotRef.current = new Set(vendors.map((item) => item.id));
    setCreateVendorOpen(true);
  }, [vendors]);

  const handleVendorCreated = useCallback(async () => {
    setCreateVendorOpen(false);
    const rows = await fetchVendorsFromStore(true);
    const snapshot = vendorIdSnapshotRef.current;
    const newVendor = rows.find((r) => !snapshot.has(r.id));
    if (newVendor?.id) {
      setSelectedVendorId(newVendor.id);
    }
  }, [fetchVendorsFromStore]);

  const handleCreatePlan = useCallback(async () => {
    if (!selectedProject?.id) {
      messageApi.error("请先选择项目");
      return;
    }
    if (!selectedVendorId) {
      messageApi.error("请先选择供应商");
      return;
    }

    let values: PayablePlanFormValues;
    try {
      values = await planForm.validateFields();
    } catch {
      return;
    }

    setCreatingPlan(true);
    try {
      const contractRes = await fetch("/api/vendor-contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          vendorId: selectedVendorId,
          legalEntityId: values.legalEntityId,
          serviceContent: values.serviceContent?.trim() || null,
          contractAmount:
            values.contractAmount === undefined || values.contractAmount === null
              ? null
              : Math.trunc(values.contractAmount),
        }),
      });
      if (!contractRes.ok) {
        const text = await contractRes.text();
        messageApi.error(text || "新建供应商合同失败");
        return;
      }
      const savedContract = (await contractRes.json()) as { id?: string };
      if (!savedContract.id) {
        messageApi.error("新建供应商合同失败");
        return;
      }

      const planRes = await fetch("/api/project-payable-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          vendorContractId: savedContract.id,
          ownerEmployeeId: values.ownerEmployeeId,
          contractAmount:
            values.contractAmount === undefined || values.contractAmount === null
              ? null
              : Math.trunc(values.contractAmount),
          hasCustomerCollection: Boolean(values.hasCustomerCollection),
          remark: values.remark?.trim() || null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!planRes.ok) {
        const text = await planRes.text();
        messageApi.error(text || "新增付款计划失败");
        return;
      }
      const savedPlan = (await planRes.json()) as { id?: string };

      messageApi.success("付款计划已创建");
      await fetchExistingPlans(selectedProject.id);
      if (savedPlan?.id) {
        setSelectedPlanId(savedPlan.id);
      }
    } finally {
      setCreatingPlan(false);
    }
  }, [fetchExistingPlans, messageApi, planForm, selectedProject?.id, selectedVendorId]);

  const handleCreateNode = useCallback(
    async (values: ProjectPayableNodeFormValues) => {
      const planId = selectedPlanId ?? null;
      if (!planId) {
        messageApi.error("请先在上一步关联付款计划");
        return;
      }
      const hasActualAmount =
        values.actualAmountTaxIncluded !== undefined &&
        values.actualAmountTaxIncluded !== null;
      const hasActualDate = Boolean(values.actualDate);
      if (hasActualAmount !== hasActualDate) {
        messageApi.error("请同时填写实付金额和实付日期，或同时留空");
        return;
      }

      setCreatingNode(true);
      try {
        const stageOptionId = await resolveStageOptionId(values.stage);
        if (!stageOptionId) {
          messageApi.error("请选择付款阶段");
          return;
        }

        const response = await fetch("/api/project-payable-nodes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
            stageOptionId,
            paymentCondition: values.paymentCondition,
            expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
            expectedDate: values.expectedDate?.toISOString(),
            remark: values.remark ?? null,
            remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          messageApi.error(text || "新增付款节点失败");
          return;
        }
        const createdNode = (await response.json()) as { id?: string };
        if (hasActualAmount && hasActualDate && createdNode?.id) {
          const actualRes = await fetch("/api/project-payable-actual-nodes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payableNodeId: createdNode.id,
              actualAmountTaxIncluded: values.actualAmountTaxIncluded,
              actualDate: values.actualDate?.toISOString(),
            }),
          });
          if (!actualRes.ok) {
            const text = await actualRes.text();
            messageApi.error(text || "新增实付节点失败");
            return;
          }
        }

        if (selectedProject?.id) {
          await fetchExistingPlans(selectedProject.id);
        }
        if (targetNodeDraft?.key) {
          setImportedNodeRows((prev) =>
            prev.filter((item) => item.key !== targetNodeDraft.key),
          );
        }

        messageApi.success("新增付款节点成功");
        setNodeModalOpen(false);
        setTargetNodeDraft(null);
      } finally {
        setCreatingNode(false);
      }
    },
    [
      fetchExistingPlans,
      messageApi,
      resolveStageOptionId,
      selectedPlanId,
      selectedProject?.id,
      targetNodeDraft?.key,
    ],
  );
  const handleEditExistingNode = useCallback(
    async (
      row: ProjectPayableNodeRow,
      values: ProjectPayableNodeFormValues,
    ) => {
      const stageOptionId = await resolveStageOptionId(values.stage);
      if (!stageOptionId) {
        messageApi.error("请选择付款阶段");
        return;
      }
      const response = await fetch(`/api/project-payable-nodes/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stageOptionId,
          paymentCondition: values.paymentCondition,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "编辑付款节点失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
      messageApi.success("编辑付款节点成功");
    },
    [fetchExistingPlans, messageApi, resolveStageOptionId, selectedProject?.id],
  );
  const handleDeleteExistingNode = useCallback(
    async (nodeId: string) => {
      const response = await fetch(`/api/project-payable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "删除付款节点失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
      messageApi.success("删除付款节点成功");
    },
    [fetchExistingPlans, messageApi, selectedProject?.id],
  );
  const handleDragSortExistingNodes = useCallback(
    async (nextRows: ProjectPayableNodeRow[]) => {
      await Promise.all(
        nextRows.map((item, index) =>
          fetch(`/api/project-payable-nodes/${item.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sortOrder: index }),
          }),
        ),
      );
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
    },
    [fetchExistingPlans, selectedProject?.id],
  );
  const handlePayExistingNode = useCallback(
    async (
      row: ProjectPayableNodeRow,
      values: ProjectPayableActualNodeFormValues,
    ) => {
      const response = await fetch("/api/project-payable-actual-nodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payableNodeId: row.id,
          actualAmountTaxIncluded: values.actualAmountTaxIncluded,
          actualDate: values.actualDate?.toISOString(),
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "新增实付失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
      messageApi.success("新增实付成功");
    },
    [fetchExistingPlans, messageApi, selectedProject?.id],
  );
  const handleEditExistingActualNode = useCallback(
    async (
      actualNodeId: string,
      values: ProjectPayableActualNodeFormValues,
    ) => {
      const response = await fetch(
        `/api/project-payable-actual-nodes/${actualNodeId}`,
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
        messageApi.error((await response.text()) || "编辑实付失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
      messageApi.success("编辑实付成功");
    },
    [fetchExistingPlans, messageApi, selectedProject?.id],
  );
  const handleDeleteExistingActualNode = useCallback(
    async (actualNodeId: string) => {
      const response = await fetch(
        `/api/project-payable-actual-nodes/${actualNodeId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        messageApi.error((await response.text()) || "删除实付失败");
        return;
      }
      if (selectedProject?.id) {
        await fetchExistingPlans(selectedProject.id);
      }
      messageApi.success("删除实付成功");
    },
    [fetchExistingPlans, messageApi, selectedProject?.id],
  );

  const isStepValid = useCallback(
    (s: number): boolean => {
      if (s === 0) return Boolean(selectedProject && selectedVendorId);
      if (s === 1) return Boolean(selectedPlanId);
      return true;
    },
    [selectedPlanId, selectedProject, selectedVendorId],
  );

  const handleNext = useCallback(() => {
    if (!isStepValid(step)) return;
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, [isStepValid, step]);

  const handlePrev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const footer = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      {step > 0 && <Button onClick={handlePrev}>上一步</Button>}
      {step < TOTAL_STEPS - 1 ? (
        <Button type="primary" disabled={!isStepValid(step)} onClick={handleNext}>
          下一步
        </Button>
      ) : (
        <Button type="primary" onClick={onClose}>
          完成
        </Button>
      )}
    </div>
  );

  const selectedPlan = useMemo(
    () => existingPlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [existingPlans, selectedPlanId],
  );

  const nodeColumns = useMemo<ColumnsType<PayableEntryDraft["nodes"][number]>>(
    () => [
      {
        title: "付款阶段",
        dataIndex: "stageName",
        width: 140,
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "付款节点",
        dataIndex: "paymentCondition",
        width: 220,
        render: (value: string) => value?.trim() || "-",
      },
      {
        title: "预付金额（含税）",
        dataIndex: "expectedAmountTaxIncluded",
        width: 140,
        render: (value: number | null) =>
          typeof value === "number" ? `${value.toLocaleString("zh-CN")} 元` : "-",
      },
      {
        title: "预付日期",
        dataIndex: "expectedDate",
        width: 140,
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
            创建付款节点
          </Button>
        ),
      },
    ],
    [],
  );

  const existingPayableNodeRows = useMemo<ProjectPayableNodeRow[]>(
    () =>
      (selectedPlan?.nodes ?? []).map((node, index) => ({
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
        paymentCondition: node.paymentCondition ?? "",
        expectedAmountTaxIncluded: Number(node.expectedAmountTaxIncluded ?? 0),
        expectedDate: node.expectedDate ?? "",
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
    [selectedPlan?.nodes],
  );

  return (
    <>
      {contextHolder}
      <Drawer
        title={
          entry
            ? `处理付款条目：${entry.brandName || "-"} - ${entry.serviceContent || "-"}`
            : "处理付款条目"
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
            { title: "创建付款计划" },
            { title: "添加付款节点" },
          ]}
        />

        <div style={{ marginTop: 24 }}>
          {step !== 1 && <Form form={planForm} component={false} />}
          {step === 0 && entry && (
            <>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="品牌名">{entry.brandName || "-"}</Descriptions.Item>
                <Descriptions.Item label="服务内容">{entry.serviceContent || "-"}</Descriptions.Item>
                <Descriptions.Item label="供应商">{entry.vendorShortName || "-"}</Descriptions.Item>
                <Descriptions.Item label="供应商全称">{entry.vendorFullName || "-"}</Descriptions.Item>
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
                  <Button size="small" icon={<PlusOutlined />} onClick={handleOpenCreateProject}>
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

              <Divider />

              <Space orientation="vertical" style={{ width: "100%" }} size={16}>
                <Select
                  allowClear
                  showSearch
                  placeholder="搜索并选择供应商（必填）"
                  style={{ width: "100%" }}
                  options={vendorOptions}
                  value={selectedVendorId ?? undefined}
                  optionFilterProp="label"
                  status={selectedVendorId ? undefined : "warning"}
                  onChange={(value) =>
                    setSelectedVendorId(typeof value === "string" ? value : null)
                  }
                />
                <Space size={8} align="center">
                  <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>
                    搜不到供应商？
                  </span>
                  <Button size="small" icon={<PlusOutlined />} onClick={handleOpenCreateVendor}>
                    创建供应商
                  </Button>
                </Space>
              </Space>
            </>
          )}

          {step === 1 && (
            <>
              <Form form={planForm} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="项目">
                      <Select
                        disabled
                        options={
                          selectedProject
                            ? [{ label: selectedProject.name, value: selectedProject.id }]
                            : []
                        }
                        value={selectedProject?.id}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="供应商">
                      <Select
                        disabled
                        options={vendorOptions}
                        value={selectedVendorId ?? undefined}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="签约主体"
                      name="legalEntityId"
                      rules={[{ required: true, message: "请选择签约主体" }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        loading={legalEntitiesLoading}
                        placeholder="请选择签约主体"
                        options={legalEntityOptions}
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="跟进人"
                      name="ownerEmployeeId"
                      rules={[{ required: true, message: "请选择跟进人" }]}
                    >
                      <Select
                        showSearch
                        placeholder="请选择跟进人"
                        options={ownerOptions}
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="合同金额（含税）"
                      name="contractAmount"
                      rules={[{ required: true, message: "请输入合同金额" }]}
                    >
                      <InputNumber min={0} precision={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="有客户收款"
                      name="hasCustomerCollection"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="是" unCheckedChildren="否" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="服务内容"
                  name="serviceContent"
                  rules={[{ required: true, message: "请输入服务内容" }]}
                >
                  <Input placeholder="请输入服务内容" />
                </Form.Item>

                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: "rgba(0,0,0,0.88)" }}>备注</span>
                    <Space size={8}>
                      <span style={{ fontWeight: 400 }}>标红</span>
                      <Form.Item name="remarkNeedsAttention" valuePropName="checked" noStyle>
                        <Switch size="small" />
                      </Form.Item>
                    </Space>
                  </div>
                  <Form.Item name="remark" style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={3} placeholder="请输入备注" />
                  </Form.Item>
                </div>
              </Form>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="primary" loading={creatingPlan} onClick={() => void handleCreatePlan()}>
                  创建付款计划
                </Button>
              </div>

              {checkingExistingPlans ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <Spin />
                </div>
              ) : existingPlans.length > 0 ? (
                <>
                  <Divider />
                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {existingPlans.map((plan) => {
                      const expectedAmountTotal = (plan.nodes ?? []).reduce(
                        (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
                        0,
                      );
                      const actualAmountTotal = (plan.nodes ?? []).reduce((sum, node) => {
                        const nodeActual = (node.actualNodes ?? []).reduce(
                          (nodeSum, actual) => nodeSum + Number(actual.actualAmountTaxIncluded ?? 0),
                          0,
                        );
                        return sum + nodeActual;
                      }, 0);

                      return (
                        <div key={plan.id}>
                          <Checkbox
                            checked={selectedPlanId === plan.id}
                            onChange={(event) => {
                              setSelectedPlanId(event.target.checked ? plan.id : null);
                            }}
                            style={{ marginBottom: 8 }}
                          >
                            关联这个付款计划
                          </Checkbox>
                          <ProjectPayablePlanSnapshot
                            vendorName={
                              plan.vendorContract?.vendor?.fullName ||
                              plan.vendorContract?.vendor?.name ||
                              "-"
                            }
                            contractAmount={Number(
                              plan.vendorContract?.contractAmount ??
                                plan.contractAmount ??
                                0,
                            )}
                            expectedAmountTotal={expectedAmountTotal}
                            actualAmountTotal={actualAmountTotal}
                            legalEntityName={plan.vendorContract?.legalEntity?.name || "-"}
                            serviceContent={
                              plan.vendorContract?.serviceContent || plan.serviceContent || ""
                            }
                            ownerName={plan.ownerEmployee?.name || "-"}
                            hasCustomerCollection={Boolean(plan.hasCustomerCollection)}
                            remark={plan.remark}
                            remarkNeedsAttention={plan.remarkNeedsAttention}
                          />
                        </div>
                      );
                    })}
                  </Space>
                </>
              ) : null}
            </>
          )}

          {step === 2 && (
            selectedPlan ? (
              <>
                <Alert
                  style={{ marginBottom: 12 }}
                  type="info"
                  showIcon
                  title="付款节点将创建到已关联的付款计划下"
                />
                <Table
                  rowKey="key"
                  columns={nodeColumns}
                  dataSource={importedNodeRows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: <Empty description="暂无可创建的导入付款节点" /> }}
                />
                {existingPayableNodeRows.length > 0 && (
                  <>
                    <Divider />
                    <Alert
                      style={{ marginBottom: 12 }}
                      type="info"
                      showIcon
                      title="关联付款计划已有节点"
                    />
                    <ProjectPayableNodeTable
                      title={`【${selectedProject?.name || "-"}】付款节点`}
                      rows={existingPayableNodeRows}
                      stageOptions={stageOptions}
                      canManageProject
                      onAddNode={() => {
                        setTargetNodeDraft(null);
                        setNodeModalOpen(true);
                      }}
                      onDeleteNode={handleDeleteExistingNode}
                      onEditNode={handleEditExistingNode}
                      onDragSortNodes={handleDragSortExistingNodes}
                      onPayNode={handlePayExistingNode}
                      onEditActualNode={handleEditExistingActualNode}
                      onDeleteActualNode={handleDeleteExistingActualNode}
                    />
                  </>
                )}
              </>
            ) : (
              <Empty description="请先在上一步关联付款计划" />
            )
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
        industryOptions={clientIndustryOptions}
      />
      <VendorFormModal
        open={createVendorOpen}
        onCancel={() => setCreateVendorOpen(false)}
        onSuccess={handleVendorCreated}
        vendorTypeOptions={vendorTypeOptions}
        businessTypeOptions={businessTypeOptions}
        servicesOptions={servicesOptions}
        cooperationStatusOptions={cooperationStatusOptions}
        ratingOptions={ratingOptions}
      />
      <ProjectPayableNodeModal
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
                paymentCondition: targetNodeDraft.paymentCondition || "",
                expectedAmountTaxIncluded:
                  targetNodeDraft.expectedAmountTaxIncluded ?? undefined,
                expectedDate: parseImportedDate(targetNodeDraft.expectedDate) ?? undefined,
                actualAmountTaxIncluded:
                  targetNodeDraft.actualAmountTaxIncluded ?? undefined,
                actualDate: parseImportedDate(targetNodeDraft.actualDate) ?? undefined,
                remark: targetNodeDraft.remark || undefined,
                remarkNeedsAttention: false,
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
