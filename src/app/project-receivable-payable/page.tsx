"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Divider,
  Empty,
  Progress,
  Select,
  Segmented,
  Space,
  Tag,
  Table,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatisticCard } from "@ant-design/pro-components";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppLink from "@/components/AppLink";
import PageAccessResult from "@/components/PageAccessResult";
import BooleanTag from "@/components/BooleanTag";
import SelectOptionQuickEditTag from "@/components/SelectOptionQuickEditTag";
import SelectOptionTag from "@/components/SelectOptionTag";
import ReceivableProjectSection from "@/components/project-receivable-payable/ReceivableProjectSection";
import PayableProjectSection from "@/components/project-receivable-payable/PayableProjectSection";
import type {
  ProjectReceivableNodeRow,
  ReceivableNodeDelayFormValues,
} from "@/components/project-detail/ProjectReceivableNodeTable";
import type { ProjectReceivableNodeFormValues } from "@/components/project-detail/ProjectReceivableNodeModal";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import type { ProjectPayableNodeRow } from "@/components/project-detail/ProjectPayableNodeTable";
import type { ProjectPayableNodeFormValues } from "@/components/project-detail/ProjectPayableNodeModal";
import type { ProjectPayableActualNodeFormValues } from "@/components/project-detail/ProjectPayableActualNodeModal";
import { getSigningCompanyTagColor } from "@/lib/constants";
import type { Vendor } from "@/types/vendor";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useProjectsStore } from "@/stores/projectsStore";

type TabKey = "summary" | "receivable" | "payable";
type ReceivableViewMode = "card" | "table";
type PayableViewMode = "card" | "table";
type SummarySettlementFilter =
  | "all"
  | "receivable_unfinished"
  | "payable_unfinished"
  | "settled";
const TAB_KEYS: TabKey[] = ["summary", "receivable", "payable"];
const ALL_PROJECTS_QUERY_KEY = JSON.stringify({
  type: "",
  ownerId: "",
  clientId: "",
  vendorId: "",
});

const toTabKey = (value: string | null): TabKey => {
  if (!value) return "summary";
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "summary";
};
const toReceivableViewMode = (value: string | null): ReceivableViewMode => {
  if (value === "table") return "table";
  return "card";
};
const toPayableViewMode = (value: string | null): PayableViewMode => {
  if (value === "table") return "table";
  return "card";
};

type StageOption = {
  id: string;
  value: string;
  color?: string | null;
};

type ActualNode = {
  id: string;
  actualAmountTaxIncluded?: number | null;
  actualDate?: string | null;
  remark?: string | null;
  remarkNeedsAttention?: boolean;
};

type ReceivableNode = {
  id: string;
  stageOptionId: string;
  stageOption?: StageOption | null;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    reason?: string | null;
    changedAt?: string;
  }>;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: ActualNode[];
};

type ReceivablePlan = {
  id: string;
  project?: {
    id: string;
    name: string;
    statusOption?: {
      id?: string;
      value?: string | null;
      color?: string | null;
    } | null;
  } | null;
  clientContract?: {
    id: string;
    legalEntity?: {
      id: string;
      name?: string | null;
      fullName?: string | null;
    } | null;
  } | null;
  legalEntity?: {
    id: string;
    name?: string | null;
    fullName?: string | null;
  } | null;
  ownerEmployee?: { id: string; name: string } | null;
  contractAmount: number;
  hasVendorPayment: boolean;
  nodes?: ReceivableNode[];
};

type ReceivableNodeTableRow = ReceivableNode & {
  planId: string;
  project?: { id: string; name: string } | null;
  contractAmount: number;
  hasVendorPayment: boolean;
};

type ReceivableNodeTableViewRow = {
  key: string;
  planId: string;
  planRowSpan: number;
  expectedRowSpan: number;
  hasVendorPayment: boolean;
  isPlanFullyCollected: boolean;
  isNodeFullyCollected: boolean;
  signingCompanyName: string;
  projectName: string;
  ownerName: string;
  contractAmountTaxIncluded: number;
  projectStatus: string;
  planRemark: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageName: string;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  actualAmountTaxIncluded: number | null;
  actualDate: string | null;
  nodeRemark: string;
};
type PayableNodeTableViewRow = {
  key: string;
  nodeId: string;
  planId: string;
  planRowSpan: number;
  expectedRowSpan: number;
  hasCustomerCollection: boolean;
  planRemark: string;
  signingCompanyName: string;
  projectName: string;
  vendorName: string;
  vendorFullName: string;
  ownerName: string;
  contractAmountTaxIncluded: number;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageName: string;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  actualAmountTaxIncluded: number | null;
  actualDate: string | null;
  nodeRemark: string;
};

type PayableNode = {
  id: string;
  stageOptionId: string;
  stageOption?: StageOption | null;
  sortOrder?: number;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: ActualNode[];
};

type PayablePlan = {
  id: string;
  project?: { id: string; name: string } | null;
  vendorContract?: {
    id: string;
    legalEntity?: {
      id: string;
      name?: string | null;
      fullName?: string | null;
    } | null;
    vendor?: {
      id: string;
      name?: string | null;
      fullName?: string | null;
    } | null;
  } | null;
  ownerEmployee?: { id: string; name: string } | null;
  contractAmount: number;
  hasCustomerCollection: boolean;
  nodes?: PayableNode[];
};

type SortableProject = {
  name?: string | null;
  isArchived?: boolean | null;
};
type SummaryProjectRow = {
  key: string;
  projectId: string | null;
  projectName: string;
  signingCompanyNames: string[];
  ownerEmployees: Array<{ id: string; name: string }>;
  hasReceivablePlan: boolean;
  hasPayablePlan: boolean;
  receivableExpectedAmountTotal: number;
  receivableActualAmountTotal: number;
  receivableProgressPercent: number;
  payableExpectedAmountTotal: number;
  payableActualAmountTotal: number;
  payableProgressPercent: number;
};

type LegalEntityOption = {
  id: string;
  name?: string | null;
};

type FilterEmployee = {
  id: string;
  name: string;
  employmentStatus?: string | null;
  employmentStatusOption?: { value?: string | null } | null;
  roles?: Array<{
    role?: {
      code?: string | null;
      name?: string | null;
    } | null;
  }> | null;
};

const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

const namePrefixRank = (name?: string | null) => {
  const normalized = String(name ?? "").trim();
  if (/^[a-zA-Z]\./.test(normalized)) return 0;
  return 1;
};

const compareProjectName = (
  leftName?: string | null,
  rightName?: string | null,
) => {
  const leftPrefixRank = namePrefixRank(leftName);
  const rightPrefixRank = namePrefixRank(rightName);
  if (leftPrefixRank !== rightPrefixRank) {
    return leftPrefixRank - rightPrefixRank;
  }
  return pinyinCollator.compare(
    String(leftName ?? ""),
    String(rightName ?? ""),
  );
};

const compareProjectByArchiveAndName = (
  left: SortableProject,
  right: SortableProject,
) => {
  const leftArchived = Boolean(left.isArchived);
  const rightArchived = Boolean(right.isArchived);
  if (leftArchived !== rightArchived) {
    return leftArchived ? 1 : -1;
  }
  return compareProjectName(left.name, right.name);
};

const isInternalProject = (project: {
  type?: string | null;
  typeOption?: { value?: string | null } | null;
}) => {
  return (
    project.type === "INTERNAL" ||
    project.type === "内部项目" ||
    project.typeOption?.value === "内部项目"
  );
};

const formatAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) return "-";
  return `${numberValue.toLocaleString("zh-CN")} 元`;
};
const formatAmountWithYen = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) return "-";
  return `¥${numberValue.toLocaleString("zh-CN")}`;
};

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD") : "-";
const renderSigningCompanyTag = (name: string) => {
  const displayName = name.trim() || "-";
  const backgroundColor = getSigningCompanyTagColor(displayName);
  return (
    <Tag
      style={{
        marginInlineEnd: 0,
        border: "none",
        borderRadius: 999,
        paddingInline: 10,
        backgroundColor,
        color: "rgba(0,0,0,0.88)",
      }}
    >
      {displayName}
    </Tag>
  );
};
const FULLY_COLLECTED_CELL_STYLE = { backgroundColor: "#F5F5F5" } as const;
const getEarliestExpectedDateTimestamp = (
  rows: Array<{ expectedDate?: string | null }>,
) => {
  let earliest = Number.POSITIVE_INFINITY;
  rows.forEach((row) => {
    const dateValue = String(row.expectedDate ?? "").trim();
    if (!dateValue) return;
    const timestamp = dayjs(dateValue).valueOf();
    if (!Number.isFinite(timestamp)) return;
    if (timestamp < earliest) earliest = timestamp;
  });
  return earliest;
};
const getFirstExpectedDateTimestamp = (
  nodes?: Array<{ expectedDate?: string | null }>,
) => {
  const firstExpectedDate = String(nodes?.[0]?.expectedDate ?? "").trim();
  if (!firstExpectedDate) return Number.POSITIVE_INFINITY;
  const timestamp = dayjs(firstExpectedDate).valueOf();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

function ProjectReceivablePayablePageContent() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const roleCodes = useMemo(
    () => getRoleCodesFromUser(currentUser),
    [currentUser],
  );
  const projectsById = useProjectsStore((state) => state.byId);
  const projectIds = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.ids,
  );
  const projectsLoaded = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.loaded ?? false,
  );
  const fetchProjectsFromStore = useProjectsStore(
    (state) => state.fetchProjects,
  );
  const isAdmin = roleCodes.includes("ADMIN");
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [receivableViewMode, setReceivableViewMode] =
    useState<ReceivableViewMode>("card");
  const [payableViewMode, setPayableViewMode] =
    useState<PayableViewMode>("card");
  const [loading, setLoading] = useState(false);
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);
  const [payableStageOptions, setPayableStageOptions] = useState<StageOption[]>(
    [],
  );
  const [receivablePlans, setReceivablePlans] = useState<ReceivablePlan[]>([]);
  const [payablePlans, setPayablePlans] = useState<PayablePlan[]>([]);
  const [vendors, setVendors] = useState<
    Array<Pick<Vendor, "id" | "name" | "fullName">>
  >([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [receivableProjectFilterIds, setReceivableProjectFilterIds] = useState<
    string[]
  >([]);
  const [receivableLegalEntityFilterIds, setReceivableLegalEntityFilterIds] =
    useState<string[]>([]);
  const [receivableOwnerFilterIds, setReceivableOwnerFilterIds] = useState<
    string[]
  >([]);
  const [payableProjectFilterIds, setPayableProjectFilterIds] = useState<
    string[]
  >([]);
  const [payableLegalEntityFilterIds, setPayableLegalEntityFilterIds] =
    useState<string[]>([]);
  const [payableVendorFilterIds, setPayableVendorFilterIds] = useState<
    string[]
  >([]);
  const [payableOwnerFilterIds, setPayableOwnerFilterIds] = useState<string[]>(
    [],
  );
  const [summarySettlementFilter, setSummarySettlementFilter] =
    useState<SummarySettlementFilter>("all");
  const [summarySigningCompanyFilters, setSummarySigningCompanyFilters] =
    useState<string[]>([]);
  const [summaryProjectFilters, setSummaryProjectFilters] = useState<string[]>(
    [],
  );
  const [summaryOwnerFilters, setSummaryOwnerFilters] = useState<string[]>([]);
  const deferredReceivableProjectFilterIds = useDeferredValue(
    receivableProjectFilterIds,
  );
  const deferredReceivableLegalEntityFilterIds = useDeferredValue(
    receivableLegalEntityFilterIds,
  );
  const deferredReceivableOwnerFilterIds = useDeferredValue(
    receivableOwnerFilterIds,
  );
  const deferredPayableProjectFilterIds = useDeferredValue(
    payableProjectFilterIds,
  );
  const deferredPayableLegalEntityFilterIds = useDeferredValue(
    payableLegalEntityFilterIds,
  );
  const deferredPayableVendorFilterIds = useDeferredValue(
    payableVendorFilterIds,
  );
  const deferredPayableOwnerFilterIds = useDeferredValue(payableOwnerFilterIds);
  const deferredSummarySettlementFilter = useDeferredValue(summarySettlementFilter);
  const deferredSummarySigningCompanyFilters = useDeferredValue(
    summarySigningCompanyFilters,
  );
  const deferredSummaryProjectFilters = useDeferredValue(summaryProjectFilters);
  const deferredSummaryOwnerFilters = useDeferredValue(summaryOwnerFilters);
  const employeesFull = useEmployeesStore((state) => state.employeesFull);
  const fetchEmployeesFromStore = useEmployeesStore(
    (state) => state.fetchEmployees,
  );

  useEffect(() => {
    if (!authLoaded) {
      void fetchMe();
    }
  }, [authLoaded, fetchMe]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [receivableRes, payableRes] = await Promise.all([
        fetch("/api/project-receivable-plans", { cache: "no-store" }),
        fetch("/api/project-payable-plans", { cache: "no-store" }),
      ]);

      const receivableData = receivableRes.ok ? await receivableRes.json() : [];
      const payableData = payableRes.ok ? await payableRes.json() : [];

      setReceivablePlans(
        Array.isArray(receivableData)
          ? (receivableData as ReceivablePlan[])
          : [],
      );
      setPayablePlans(
        Array.isArray(payableData) ? (payableData as PayablePlan[]) : [],
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    void fetchData();
  }, [authLoaded, isAdmin, fetchData]);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    if (projectsLoaded) return;
    void fetchProjectsFromStore();
  }, [authLoaded, fetchProjectsFromStore, isAdmin, projectsLoaded]);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    (async () => {
      try {
        const response = await fetch("/api/legal-entities", {
          cache: "no-store",
        });
        if (!response.ok) {
          setLegalEntities([]);
          return;
        }
        const data = (await response.json()) as LegalEntityOption[];
        setLegalEntities(Array.isArray(data) ? data : []);
      } catch {
        setLegalEntities([]);
      }
    })();
  }, [authLoaded, isAdmin]);
  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    (async () => {
      try {
        const response = await fetch("/api/vendors", {
          cache: "no-store",
        });
        if (!response.ok) {
          setVendors([]);
          return;
        }
        const data = (await response.json()) as Vendor[];
        setVendors(
          Array.isArray(data)
            ? data
                .filter((item) => Boolean(item?.id && item?.name?.trim()))
                .map((item) => ({
                  id: item.id,
                  name: item.name,
                  fullName: item.fullName ?? null,
                }))
            : [],
        );
      } catch {
        setVendors([]);
      }
    })();
  }, [authLoaded, isAdmin]);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    void fetchEmployeesFromStore({ full: true });
  }, [authLoaded, fetchEmployeesFromStore, isAdmin]);

  const fetchStageOptions = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    void fetchStageOptions();
  }, [authLoaded, fetchStageOptions, isAdmin]);
  const fetchPayableStageOptions = useCallback(async () => {
    try {
      const query = new URLSearchParams({ field: "projectPayable.stage" });
      const response = await fetch(`/api/select-options?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setPayableStageOptions([]);
        return;
      }
      const rows = (await response.json()) as StageOption[];
      setPayableStageOptions(Array.isArray(rows) ? rows : []);
    } catch {
      setPayableStageOptions([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoaded || !isAdmin) return;
    void fetchPayableStageOptions();
  }, [authLoaded, fetchPayableStageOptions, isAdmin]);

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
  const resolvePayableStageOptionId = useCallback(
    async (stage: ProjectPayableNodeFormValues["stage"]) => {
      const stageValueRaw =
        typeof stage === "string" ? stage : (stage?.value ?? "");
      const stageValue = stageValueRaw.trim();
      if (!stageValue) return null;

      const existingStageId =
        payableStageOptions.find((item) => item.value === stageValue)?.id ?? "";
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

      setPayableStageOptions((prev) =>
        [
          ...prev.filter((item) => item.id !== createdStage.id),
          createdStage,
        ].sort((left, right) => left.value.localeCompare(right.value, "zh-CN")),
      );
      return createdStage.id;
    },
    [payableStageOptions],
  );

  useEffect(() => {
    const nextTab = toTabKey(searchParams.get("tab"));
    setActiveTab(nextTab);
    const nextReceivableViewMode = toReceivableViewMode(
      searchParams.get("receivableView"),
    );
    setReceivableViewMode(nextReceivableViewMode);
    const nextPayableViewMode = toPayableViewMode(
      searchParams.get("payableView"),
    );
    setPayableViewMode(nextPayableViewMode);
  }, [searchParams]);

  const allNonInternalProjects = useMemo(() => {
    return (projectIds ?? [])
      .map((id) => projectsById[id])
      .filter(
        (
          item,
        ): item is {
          id: string;
          name?: string | null;
          isArchived?: boolean | null;
          type?: string | null;
          typeOption?: { value?: string | null } | null;
        } => Boolean(item?.id),
      )
      .filter((item) => !isInternalProject(item));
  }, [projectIds, projectsById]);

  const searchableProjectOptions = useMemo(
    () =>
      allNonInternalProjects
        .slice()
        .sort(compareProjectByArchiveAndName)
        .map((item) => ({
          label: `${item.name ?? "未命名项目"}${item.isArchived ? "（已归档）" : ""}`,
          value: item.id,
        })),
    [allNonInternalProjects],
  );
  const searchableLegalEntityOptions = useMemo(
    () =>
      legalEntities
        .filter((item) => Boolean(item.id && item.name?.trim()))
        .map((item) => ({
          value: item.id,
          label: String(item.name).trim(),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    [legalEntities],
  );
  const searchableOwnerOptions = useMemo(() => {
    const projectManagers = (employeesFull as FilterEmployee[])
      .filter((employee) =>
        (employee.roles ?? []).some(
          (roleItem) =>
            roleItem.role?.code === "PROJECT_MANAGER" ||
            roleItem.role?.name === "项目经理",
        ),
      )
      .map((employee) => {
        const isResigned =
          employee.employmentStatus === "离职" ||
          employee.employmentStatusOption?.value === "离职";
        return {
          value: employee.id,
          label: `${employee.name}${isResigned ? "（已离职）" : ""}`,
          isResigned,
          name: employee.name,
        };
      })
      .sort((left, right) => {
        if (left.isResigned !== right.isResigned) {
          return left.isResigned ? 1 : -1;
        }
        return left.name.localeCompare(right.name, "zh-CN");
      });

    return projectManagers.map(({ value, label }) => ({ value, label }));
  }, [employeesFull]);
  const searchableVendorOptions = useMemo(
    () =>
      vendors
        .map((item) => ({
          value: item.id,
          label: item.fullName?.trim() || item.name.trim(),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    [vendors],
  );

  useEffect(() => {
    if (receivableProjectFilterIds.length === 0) return;
    const validIds = receivableProjectFilterIds.filter((id) =>
      allNonInternalProjects.some((item) => item.id === id),
    );
    if (validIds.length === receivableProjectFilterIds.length) return;
    setReceivableProjectFilterIds(validIds);
  }, [allNonInternalProjects, receivableProjectFilterIds]);

  useEffect(() => {
    if (payableProjectFilterIds.length === 0) return;
    const validIds = payableProjectFilterIds.filter((id) =>
      allNonInternalProjects.some((item) => item.id === id),
    );
    if (validIds.length === payableProjectFilterIds.length) return;
    setPayableProjectFilterIds(validIds);
  }, [allNonInternalProjects, payableProjectFilterIds]);

  const handleReceivableProjectSearchChange = useCallback(
    (values: string[]) => {
      setReceivableProjectFilterIds(values);
    },
    [],
  );
  const handleReceivableLegalEntitySearchChange = useCallback(
    (values: string[]) => {
      setReceivableLegalEntityFilterIds(values);
    },
    [],
  );
  const handleReceivableOwnerSearchChange = useCallback((values: string[]) => {
    setReceivableOwnerFilterIds(values);
  }, []);
  const handlePayableProjectSearchChange = useCallback((values: string[]) => {
    setPayableProjectFilterIds(values);
  }, []);
  const handlePayableLegalEntitySearchChange = useCallback(
    (values: string[]) => {
      setPayableLegalEntityFilterIds(values);
    },
    [],
  );
  const handlePayableOwnerSearchChange = useCallback((values: string[]) => {
    setPayableOwnerFilterIds(values);
  }, []);
  const handlePayableVendorSearchChange = useCallback((values: string[]) => {
    setPayableVendorFilterIds(values);
  }, []);

  const handleReceivableViewModeChange = useCallback(
    (value: ReceivableViewMode) => {
      setReceivableViewMode(value);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("receivableView", value);
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  const handlePayableViewModeChange = useCallback(
    (value: PayableViewMode) => {
      setPayableViewMode(value);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("payableView", value);
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (receivableLegalEntityFilterIds.length === 0) return;
    const validSet = new Set(
      searchableLegalEntityOptions.map((item) => item.value),
    );
    const validIds = receivableLegalEntityFilterIds.filter((id) =>
      validSet.has(id),
    );
    if (validIds.length === receivableLegalEntityFilterIds.length) return;
    setReceivableLegalEntityFilterIds(validIds);
  }, [receivableLegalEntityFilterIds, searchableLegalEntityOptions]);
  useEffect(() => {
    if (payableLegalEntityFilterIds.length === 0) return;
    const validSet = new Set(
      searchableLegalEntityOptions.map((item) => item.value),
    );
    const validIds = payableLegalEntityFilterIds.filter((id) =>
      validSet.has(id),
    );
    if (validIds.length === payableLegalEntityFilterIds.length) return;
    setPayableLegalEntityFilterIds(validIds);
  }, [payableLegalEntityFilterIds, searchableLegalEntityOptions]);
  useEffect(() => {
    if (receivableOwnerFilterIds.length === 0) return;
    const validSet = new Set(searchableOwnerOptions.map((item) => item.value));
    const validIds = receivableOwnerFilterIds.filter((id) => validSet.has(id));
    if (validIds.length === receivableOwnerFilterIds.length) return;
    setReceivableOwnerFilterIds(validIds);
  }, [receivableOwnerFilterIds, searchableOwnerOptions]);
  useEffect(() => {
    if (payableOwnerFilterIds.length === 0) return;
    const validSet = new Set(searchableOwnerOptions.map((item) => item.value));
    const validIds = payableOwnerFilterIds.filter((id) => validSet.has(id));
    if (validIds.length === payableOwnerFilterIds.length) return;
    setPayableOwnerFilterIds(validIds);
  }, [payableOwnerFilterIds, searchableOwnerOptions]);
  useEffect(() => {
    if (payableVendorFilterIds.length === 0) return;
    const validSet = new Set(searchableVendorOptions.map((item) => item.value));
    const validIds = payableVendorFilterIds.filter((id) => validSet.has(id));
    if (validIds.length === payableVendorFilterIds.length) return;
    setPayableVendorFilterIds(validIds);
  }, [payableVendorFilterIds, searchableVendorOptions]);

  const filteredReceivablePlans = useMemo(
    () =>
      receivablePlans.filter((plan) => {
        const matchesProject =
          deferredReceivableProjectFilterIds.length > 0
            ? deferredReceivableProjectFilterIds.includes(
                plan.project?.id ?? "",
              )
            : true;
        const planLegalEntityId =
          plan.clientContract?.legalEntity?.id || plan.legalEntity?.id || "";
        const matchesLegalEntity =
          deferredReceivableLegalEntityFilterIds.length > 0
            ? deferredReceivableLegalEntityFilterIds.includes(planLegalEntityId)
            : true;
        const matchesOwner =
          deferredReceivableOwnerFilterIds.length > 0
            ? deferredReceivableOwnerFilterIds.includes(
                plan.ownerEmployee?.id ?? "",
              )
            : true;
        return matchesProject && matchesLegalEntity && matchesOwner;
      }),
    [
      deferredReceivableLegalEntityFilterIds,
      deferredReceivableOwnerFilterIds,
      deferredReceivableProjectFilterIds,
      receivablePlans,
    ],
  );
  const filteredPayablePlans = useMemo(
    () =>
      payablePlans.filter((plan) => {
        const planLegalEntityId = plan.vendorContract?.legalEntity?.id || "";
        const matchesProject =
          deferredPayableProjectFilterIds.length > 0
            ? deferredPayableProjectFilterIds.includes(plan.project?.id ?? "")
            : true;
        const matchesLegalEntity =
          deferredPayableLegalEntityFilterIds.length > 0
            ? deferredPayableLegalEntityFilterIds.includes(planLegalEntityId)
            : true;
        const matchesVendor =
          deferredPayableVendorFilterIds.length > 0
            ? deferredPayableVendorFilterIds.includes(
                plan.vendorContract?.vendor?.id ?? "",
              )
            : true;
        const matchesOwner =
          deferredPayableOwnerFilterIds.length > 0
            ? deferredPayableOwnerFilterIds.includes(
                plan.ownerEmployee?.id ?? "",
              )
            : true;
        return (
          matchesProject && matchesLegalEntity && matchesVendor && matchesOwner
        );
      }),
    [
      deferredPayableLegalEntityFilterIds,
      deferredPayableOwnerFilterIds,
      deferredPayableProjectFilterIds,
      deferredPayableVendorFilterIds,
      payablePlans,
    ],
  );
  const dataSource = filteredPayablePlans;
  const payableNodeTableRows = useMemo<PayableNodeTableViewRow[]>(() => {
    const rows: PayableNodeTableViewRow[] = [];
    const sortedPlans = [...filteredPayablePlans].sort((left, right) => {
      const leftTimestamp = getFirstExpectedDateTimestamp(left.nodes);
      const rightTimestamp = getFirstExpectedDateTimestamp(right.nodes);
      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }
      return compareProjectName(left.project?.name, right.project?.name);
    });

    sortedPlans.forEach((plan) => {
      const planRemark =
        "remark" in plan && typeof plan.remark === "string"
          ? plan.remark.trim() || "-"
          : "-";
      const signingCompanyName =
        plan.vendorContract?.legalEntity?.name?.trim() ||
        plan.vendorContract?.legalEntity?.fullName?.trim() ||
        "-";
      const projectName = plan.project?.name?.trim() || "-";
      const vendorName =
        plan.vendorContract?.vendor?.name?.trim() ||
        plan.vendorContract?.vendor?.fullName?.trim() ||
        "-";
      const vendorFullName =
        plan.vendorContract?.vendor?.fullName?.trim() || "";
      const ownerName = plan.ownerEmployee?.name?.trim() || "-";
      const contractAmountTaxIncluded = Number(plan.contractAmount ?? 0);
      const planRows: PayableNodeTableViewRow[] = [];

      (plan.nodes ?? []).forEach((node) => {
        const actualNodes = Array.isArray(node.actualNodes)
          ? node.actualNodes
          : [];
        if (actualNodes.length === 0) {
          planRows.push({
            key: `${plan.id}-${node.id}`,
            nodeId: node.id,
            planId: plan.id,
            planRowSpan: 0,
            expectedRowSpan: 1,
            hasCustomerCollection: Boolean(plan.hasCustomerCollection),
            planRemark,
            signingCompanyName,
            projectName,
            vendorName,
            vendorFullName,
            ownerName,
            contractAmountTaxIncluded,
            stageOption: node.stageOption
              ? {
                  id: node.stageOption.id,
                  value: node.stageOption.value,
                  color: node.stageOption.color ?? null,
                }
              : null,
            stageName: node.stageOption?.value?.trim() || "-",
            paymentCondition: node.paymentCondition?.trim() || "-",
            expectedAmountTaxIncluded: Number(
              node.expectedAmountTaxIncluded ?? 0,
            ),
            expectedDate: node.expectedDate
              ? dayjs(node.expectedDate).format("YYYY-MM-DD")
              : "-",
            actualAmountTaxIncluded: null,
            actualDate: null,
            nodeRemark: node.remark?.trim() || "-",
          });
          return;
        }

        actualNodes.forEach((actual, actualIndex) => {
          planRows.push({
            key: `${plan.id}-${node.id}-${actual.id}`,
            nodeId: node.id,
            planId: plan.id,
            planRowSpan: 0,
            expectedRowSpan: actualIndex === 0 ? actualNodes.length : 0,
            hasCustomerCollection: Boolean(plan.hasCustomerCollection),
            planRemark,
            signingCompanyName,
            projectName,
            vendorName,
            vendorFullName,
            ownerName,
            contractAmountTaxIncluded,
            stageOption: node.stageOption
              ? {
                  id: node.stageOption.id,
                  value: node.stageOption.value,
                  color: node.stageOption.color ?? null,
                }
              : null,
            stageName: node.stageOption?.value?.trim() || "-",
            paymentCondition: node.paymentCondition?.trim() || "-",
            expectedAmountTaxIncluded: Number(
              node.expectedAmountTaxIncluded ?? 0,
            ),
            expectedDate: node.expectedDate
              ? dayjs(node.expectedDate).format("YYYY-MM-DD")
              : "-",
            actualAmountTaxIncluded:
              actual.actualAmountTaxIncluded === null ||
              actual.actualAmountTaxIncluded === undefined
                ? null
                : Number(actual.actualAmountTaxIncluded),
            actualDate: actual.actualDate
              ? dayjs(actual.actualDate).format("YYYY-MM-DD")
              : null,
            nodeRemark: node.remark?.trim() || "-",
          });
        });
      });
      if (planRows.length > 0) {
        planRows[0]!.planRowSpan = planRows.length;
        rows.push(...planRows);
      }
    });
    return rows;
  }, [filteredPayablePlans]);

  const receivableNodeRows = useMemo<ReceivableNodeTableRow[]>(
    () =>
      filteredReceivablePlans.flatMap((plan) =>
        (plan.nodes ?? []).map((node) => ({
          ...node,
          planId: plan.id,
          project: plan.project ?? null,
          contractAmount: plan.contractAmount,
          hasVendorPayment: Boolean(plan.hasVendorPayment),
        })),
      ),
    [filteredReceivablePlans],
  );
  const receivableNodeTableRows = useMemo<ReceivableNodeTableViewRow[]>(() => {
    const rows: ReceivableNodeTableViewRow[] = [];
    const sortedPlans = [...filteredReceivablePlans].sort((left, right) => {
      const leftTimestamp = getFirstExpectedDateTimestamp(left.nodes);
      const rightTimestamp = getFirstExpectedDateTimestamp(right.nodes);
      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }
      return compareProjectName(left.project?.name, right.project?.name);
    });

    sortedPlans.forEach((plan) => {
      const nodes = Array.isArray(plan.nodes) ? plan.nodes : [];
      const signingCompanyName =
        plan.clientContract?.legalEntity?.name?.trim() ||
        plan.legalEntity?.name?.trim() ||
        "-";
      const projectName = plan.project?.name?.trim() || "-";
      const ownerName = plan.ownerEmployee?.name?.trim() || "-";
      const contractAmountTaxIncluded = Number(plan.contractAmount ?? 0);
      const projectStatus = plan.project?.statusOption?.value?.trim() || "-";
      const planRemark =
        "remark" in plan && typeof plan.remark === "string"
          ? plan.remark.trim() || "-"
          : "-";
      if (nodes.length === 0) return;
      const planExpectedAmountTotal = nodes.reduce(
        (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
        0,
      );
      const planActualAmountTotal = nodes.reduce((sum, node) => {
        const actualSum = (node.actualNodes ?? []).reduce(
          (actualAcc, actual) =>
            actualAcc + Number(actual.actualAmountTaxIncluded ?? 0),
          0,
        );
        return sum + actualSum;
      }, 0);
      const isPlanFullyCollected =
        planExpectedAmountTotal > 0 &&
        planActualAmountTotal >= planExpectedAmountTotal;
      const hasVendorPayment = Boolean(plan.hasVendorPayment);

      const planRows: ReceivableNodeTableViewRow[] = [];

      nodes.forEach((node) => {
        const actualNodes = Array.isArray(node.actualNodes)
          ? node.actualNodes
          : [];
        if (actualNodes.length === 0) return;
        const nodeExpectedAmount = Number(node.expectedAmountTaxIncluded ?? 0);
        const nodeActualAmount = actualNodes.reduce(
          (sum, actual) => sum + Number(actual.actualAmountTaxIncluded ?? 0),
          0,
        );
        const isNodeFullyCollected =
          nodeExpectedAmount > 0 && nodeActualAmount >= nodeExpectedAmount;

        actualNodes.forEach((actual, actualIndex) => {
          planRows.push({
            key: `${node.id}-${actual.id}`,
            planId: plan.id,
            planRowSpan: 0,
            expectedRowSpan: actualIndex === 0 ? actualNodes.length : 0,
            hasVendorPayment,
            isPlanFullyCollected,
            isNodeFullyCollected,
            signingCompanyName,
            projectName,
            ownerName,
            contractAmountTaxIncluded,
            projectStatus,
            planRemark,
            stageOption: node.stageOption
              ? {
                  id: node.stageOption.id,
                  value: node.stageOption.value,
                  color: node.stageOption.color ?? null,
                }
              : null,
            stageName: node.stageOption?.value?.trim() || "-",
            keyDeliverable: node.keyDeliverable?.trim() || "-",
            expectedAmountTaxIncluded: Number(
              node.expectedAmountTaxIncluded ?? 0,
            ),
            expectedDate: node.expectedDate
              ? dayjs(node.expectedDate).format("YYYY-MM-DD")
              : "-",
            actualAmountTaxIncluded:
              actual.actualAmountTaxIncluded === null ||
              actual.actualAmountTaxIncluded === undefined
                ? null
                : Number(actual.actualAmountTaxIncluded),
            actualDate: actual.actualDate
              ? dayjs(actual.actualDate).format("YYYY-MM-DD")
              : null,
            nodeRemark: node.remark?.trim() || "-",
          });
        });
      });

      if (planRows.length > 0) {
        planRows[0].planRowSpan = planRows.length;
        rows.push(...planRows);
      }
    });

    return rows;
  }, [filteredReceivablePlans]);

  const receivableSummary = useMemo(() => {
    const planCount = filteredReceivablePlans.length;
    const contractAmountTotal = filteredReceivablePlans.reduce(
      (sum, plan) => sum + Number(plan.contractAmount ?? 0),
      0,
    );
    const actualAmountTotal = filteredReceivablePlans.reduce(
      (planSum, plan) => {
        const nodeActualSum = (plan.nodes ?? []).reduce((nodeSum, node) => {
          const actualNodeSum = (node.actualNodes ?? []).reduce(
            (actualSum, actual) =>
              actualSum + Number(actual.actualAmountTaxIncluded ?? 0),
            0,
          );
          return nodeSum + actualNodeSum;
        }, 0);
        return planSum + nodeActualSum;
      },
      0,
    );
    const pendingAmountTotal = Math.max(
      0,
      contractAmountTotal - actualAmountTotal,
    );
    const actualPercent =
      contractAmountTotal > 0
        ? (actualAmountTotal / contractAmountTotal) * 100
        : 0;
    const pendingPercent =
      contractAmountTotal > 0
        ? (pendingAmountTotal / contractAmountTotal) * 100
        : 0;

    return {
      planCount,
      contractAmountTotal,
      actualAmountTotal,
      pendingAmountTotal,
      actualPercent,
      pendingPercent,
    };
  }, [filteredReceivablePlans]);
  const payableSummary = useMemo(() => {
    const projectCount = filteredPayablePlans.length;
    const contractAmountTotal = filteredPayablePlans.reduce(
      (sum, plan) => sum + Number(plan.contractAmount ?? 0),
      0,
    );
    const actualAmountTotal = filteredPayablePlans.reduce((planSum, plan) => {
      const nodeActualSum = (plan.nodes ?? []).reduce((nodeSum, node) => {
        const actualNodeSum = (node.actualNodes ?? []).reduce(
          (actualSum, actual) =>
            actualSum + Number(actual.actualAmountTaxIncluded ?? 0),
          0,
        );
        return nodeSum + actualNodeSum;
      }, 0);
      return planSum + nodeActualSum;
    }, 0);
    const pendingAmountTotal = Math.max(
      0,
      contractAmountTotal - actualAmountTotal,
    );
    const actualPercent =
      contractAmountTotal > 0
        ? (actualAmountTotal / contractAmountTotal) * 100
        : 0;
    const pendingPercent =
      contractAmountTotal > 0
        ? (pendingAmountTotal / contractAmountTotal) * 100
        : 0;

    return {
      projectCount,
      contractAmountTotal,
      actualAmountTotal,
      pendingAmountTotal,
      actualPercent,
      pendingPercent,
    };
  }, [filteredPayablePlans]);

  const receivableProjects = useMemo(() => {
    const projectMap = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        signingCompanyName: string;
        contractAmountTotal: number;
        ownerName: string;
        projectStatusOption?: {
          id?: string;
          value?: string | null;
          color?: string | null;
        } | null;
        planCount: number;
        primaryPlanId: string;
        rows: ProjectReceivableNodeRow[];
        stageOptionMap: Map<
          string,
          { id: string; value: string; color?: string | null }
        >;
      }
    >();

    filteredReceivablePlans.forEach((plan) => {
      const projectId = plan.project?.id || `unknown-${plan.id}`;
      const projectName = plan.project?.name || "未关联项目";
      const signingCompanyName =
        plan.clientContract?.legalEntity?.name?.trim() ||
        plan.legalEntity?.name?.trim() ||
        "未设置签约公司";
      const current = projectMap.get(projectId);
      if (!current) {
        projectMap.set(projectId, {
          projectId,
          projectName,
          signingCompanyName,
          contractAmountTotal: Number(plan.contractAmount ?? 0),
          ownerName: plan.ownerEmployee?.name?.trim() || "-",
          projectStatusOption: plan.project?.statusOption ?? null,
          planCount: 1,
          primaryPlanId: plan.id,
          rows: (plan.nodes ?? []).map((node, index) => ({
            id: node.id,
            planId: plan.id,
            stageOptionId: node.stageOptionId ?? "",
            stageOption: node.stageOption
              ? {
                  id: node.stageOption.id,
                  value: node.stageOption.value,
                  color: node.stageOption.color ?? null,
                }
              : null,
            sortOrder: index,
            keyDeliverable: node.keyDeliverable ?? "",
            expectedAmountTaxIncluded: Number(
              node.expectedAmountTaxIncluded ?? 0,
            ),
            expectedDate: node.expectedDate ?? "",
            expectedDateChangeCount: 0,
            expectedDateHistories: (node.expectedDateHistories ?? []).map((history) => ({
              id: history.id,
              fromExpectedDate: history.fromExpectedDate,
              toExpectedDate: history.toExpectedDate,
              reason: history.reason ?? null,
              changedAt: history.changedAt,
            })),
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
          stageOptionMap: new Map(
            (plan.nodes ?? [])
              .filter((node) =>
                Boolean(node.stageOption?.id && node.stageOption?.value),
              )
              .map((node) => [
                node.stageOption!.id,
                {
                  id: node.stageOption!.id,
                  value: node.stageOption!.value,
                  color: node.stageOption!.color ?? null,
                },
              ]),
          ),
        });
        return;
      }
      current.planCount += 1;
      current.contractAmountTotal += Number(plan.contractAmount ?? 0);
      if (
        (!current.ownerName || current.ownerName === "-") &&
        plan.ownerEmployee?.name
      ) {
        current.ownerName = plan.ownerEmployee.name.trim();
      }
      if (
        !current.projectStatusOption?.value &&
        plan.project?.statusOption?.value
      ) {
        current.projectStatusOption = plan.project.statusOption;
      }
      if (
        (!current.signingCompanyName ||
          current.signingCompanyName === "未设置签约公司") &&
        signingCompanyName
      ) {
        current.signingCompanyName = signingCompanyName;
      }
      current.rows.push(
        ...(plan.nodes ?? []).map((node, index) => ({
          id: node.id,
          planId: plan.id,
          stageOptionId: node.stageOptionId ?? "",
          stageOption: node.stageOption
            ? {
                id: node.stageOption.id,
                value: node.stageOption.value,
                color: node.stageOption.color ?? null,
              }
            : null,
          sortOrder: index,
          keyDeliverable: node.keyDeliverable ?? "",
          expectedAmountTaxIncluded: Number(
            node.expectedAmountTaxIncluded ?? 0,
          ),
          expectedDate: node.expectedDate ?? "",
          expectedDateChangeCount: 0,
          expectedDateHistories: (node.expectedDateHistories ?? []).map((history) => ({
            id: history.id,
            fromExpectedDate: history.fromExpectedDate,
            toExpectedDate: history.toExpectedDate,
            reason: history.reason ?? null,
            changedAt: history.changedAt,
          })),
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
      );
      (plan.nodes ?? []).forEach((node) => {
        if (!node.stageOption?.id || !node.stageOption?.value) return;
        current.stageOptionMap.set(node.stageOption.id, {
          id: node.stageOption.id,
          value: node.stageOption.value,
          color: node.stageOption.color ?? null,
        });
      });
    });

    return Array.from(projectMap.values()).sort((a, b) => {
      const leftEarliest = getEarliestExpectedDateTimestamp(a.rows);
      const rightEarliest = getEarliestExpectedDateTimestamp(b.rows);
      if (leftEarliest !== rightEarliest) {
        return leftEarliest - rightEarliest;
      }
      return a.projectName.localeCompare(b.projectName, "zh-CN");
    });
  }, [filteredReceivablePlans]);
  const payableProjects = useMemo(() => {
    const sortedPlans = [...filteredPayablePlans].sort((left, right) => {
      const leftTimestamp = getEarliestExpectedDateTimestamp(left.nodes ?? []);
      const rightTimestamp = getEarliestExpectedDateTimestamp(
        right.nodes ?? [],
      );
      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }
      return compareProjectName(left.project?.name, right.project?.name);
    });

    return sortedPlans.map((plan) => {
      const projectId = plan.project?.id || `unknown-${plan.id}`;
      const projectStatusOption =
        projectId && !projectId.startsWith("unknown-")
          ? (projectsById[projectId]?.statusOption ?? null)
          : null;
      return {
        projectId,
        projectName: plan.project?.name || "未关联项目",
        signingCompanyName:
          plan.vendorContract?.legalEntity?.name?.trim() ||
          plan.vendorContract?.legalEntity?.fullName?.trim() ||
          "未设置签约公司",
        contractAmountTotal: Number(plan.contractAmount ?? 0),
        ownerName: plan.ownerEmployee?.name?.trim() || "-",
        projectStatusOption,
        primaryPlanId: plan.id,
        rows: (plan.nodes ?? []).map((node, index) => ({
          id: node.id,
          planId: plan.id,
          stageOptionId: node.stageOptionId ?? "",
          stageOption: node.stageOption
            ? {
                id: node.stageOption.id,
                value: node.stageOption.value,
                color: node.stageOption.color ?? null,
              }
            : null,
          sortOrder: Number(node.sortOrder ?? index + 1),
          paymentCondition: node.paymentCondition ?? "",
          expectedAmountTaxIncluded: Number(
            node.expectedAmountTaxIncluded ?? 0,
          ),
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
        stageOptionMap: new Map(
          (plan.nodes ?? [])
            .filter((node) =>
              Boolean(node.stageOption?.id && node.stageOption?.value),
            )
            .map((node) => [
              node.stageOption!.id,
              {
                id: node.stageOption!.id,
                value: node.stageOption!.value,
                color: node.stageOption!.color ?? null,
              },
            ]),
        ),
      };
    });
  }, [filteredPayablePlans, projectsById]);

  const handleCreatePayableNode = useCallback(
    async (planId: string, values: ProjectPayableNodeFormValues) => {
      const stageOptionId = await resolvePayableStageOptionId(values.stage);
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
        messageApi.error("新增付款节点失败");
        return;
      }
      messageApi.success("新增付款节点成功");
      await fetchData();
    },
    [fetchData, messageApi, resolvePayableStageOptionId],
  );

  const handleEditPayableNode = useCallback(
    async (
      row: ProjectPayableNodeRow,
      values: ProjectPayableNodeFormValues,
    ) => {
      const stageOptionId = await resolvePayableStageOptionId(values.stage);
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
          sortOrder: row.sortOrder,
          paymentCondition: values.paymentCondition,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error("修改付款节点失败");
        return;
      }
      messageApi.success("修改付款节点成功");
      await fetchData();
    },
    [fetchData, messageApi, resolvePayableStageOptionId],
  );

  const handleDeletePayableNode = useCallback(
    async (nodeId: string) => {
      const response = await fetch(`/api/project-payable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        messageApi.error("删除付款节点失败");
        return;
      }
      messageApi.success("删除付款节点成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handlePayPayableNode = useCallback(
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
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error("新增实付失败");
        return;
      }
      messageApi.success("新增实付成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleEditPayableActualNode = useCallback(
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
            remark: values.remark?.trim() ? values.remark.trim() : null,
            remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
          }),
        },
      );
      if (!response.ok) {
        messageApi.error("修改实付失败");
        return;
      }
      messageApi.success("修改实付成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleDeletePayableActualNode = useCallback(
    async (actualNodeId: string) => {
      const response = await fetch(
        `/api/project-payable-actual-nodes/${actualNodeId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        messageApi.error("删除实付失败");
        return;
      }
      messageApi.success("删除实付成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleDragSortPayableNodes = useCallback(
    async (nextRows: ProjectPayableNodeRow[]) => {
      const planSortCounter = new Map<string, number>();
      const payloads = nextRows.map((row) => {
        const nextSortOrder = (planSortCounter.get(row.planId) ?? 0) + 1;
        planSortCounter.set(row.planId, nextSortOrder);
        return { id: row.id, sortOrder: nextSortOrder };
      });

      try {
        await Promise.all(
          payloads.map((item) =>
            fetch(`/api/project-payable-nodes/${item.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sortOrder: item.sortOrder }),
            }),
          ),
        );
        await fetchData();
      } catch {
        messageApi.error("更新节点排序失败");
        await fetchData();
      }
    },
    [fetchData, messageApi],
  );

  const handleCreateReceivableNode = useCallback(
    async (planId: string, values: ProjectReceivableNodeFormValues) => {
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
          remark: values.remark ?? null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });

      if (!response.ok) {
        messageApi.error("新增收款节点失败");
        return;
      }
      messageApi.success("新增收款节点成功");
      await fetchData();
    },
    [fetchData, messageApi, resolveStageOptionId],
  );

  const handleEditReceivableNode = useCallback(
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
          sortOrder: row.sortOrder,
          keyDeliverable: values.keyDeliverable,
          expectedAmountTaxIncluded: values.expectedAmountTaxIncluded,
          expectedDate: values.expectedDate?.toISOString(),
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error("修改收款节点失败");
        return;
      }
      messageApi.success("修改收款节点成功");
      await fetchData();
    },
    [fetchData, messageApi, resolveStageOptionId],
  );

  const handleDeleteReceivableNode = useCallback(
    async (nodeId: string) => {
      const response = await fetch(`/api/project-receivable-nodes/${nodeId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        messageApi.error("删除收款节点失败");
        return;
      }
      messageApi.success("删除收款节点成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleDelayReceivableNode = useCallback(
    async (
      row: ProjectReceivableNodeRow,
      values: ReceivableNodeDelayFormValues,
    ) => {
      const response = await fetch(`/api/project-receivable-nodes/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedDate: values.delayedExpectedDate?.toISOString(),
          expectedDateChangeReason: values.delayReason?.trim() || null,
        }),
      });
      if (!response.ok) {
        messageApi.error((await response.text()) || "延迟收款失败");
        return;
      }
      messageApi.success("延迟收款成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleCollectReceivableNode = useCallback(
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
          remark: values.remark?.trim() ? values.remark.trim() : null,
          remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
        }),
      });
      if (!response.ok) {
        messageApi.error("新增实收失败");
        return;
      }
      messageApi.success("新增实收成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleEditReceivableActualNode = useCallback(
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
            remark: values.remark?.trim() ? values.remark.trim() : null,
            remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
          }),
        },
      );
      if (!response.ok) {
        messageApi.error("修改实收失败");
        return;
      }
      messageApi.success("修改实收成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleDeleteReceivableActualNode = useCallback(
    async (actualNodeId: string) => {
      const response = await fetch(
        `/api/project-receivable-actual-nodes/${actualNodeId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        messageApi.error("删除实收失败");
        return;
      }
      messageApi.success("删除实收成功");
      await fetchData();
    },
    [fetchData, messageApi],
  );

  const handleDragSortReceivableNodes = useCallback(
    async (nextRows: ProjectReceivableNodeRow[]) => {
      const planSortCounter = new Map<string, number>();
      const payloads = nextRows.map((row) => {
        const nextSortOrder = (planSortCounter.get(row.planId) ?? 0) + 1;
        planSortCounter.set(row.planId, nextSortOrder);
        return { id: row.id, sortOrder: nextSortOrder };
      });

      try {
        await Promise.all(
          payloads.map((item) =>
            fetch(`/api/project-receivable-nodes/${item.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sortOrder: item.sortOrder }),
            }),
          ),
        );
        await fetchData();
      } catch {
        messageApi.error("更新节点排序失败");
        await fetchData();
      }
    },
    [fetchData, messageApi],
  );

  const summaryProjectRows = useMemo<SummaryProjectRow[]>(() => {
    const projectMap = new Map<string, SummaryProjectRow>();

    filteredReceivablePlans.forEach((plan) => {
      const projectId = plan.project?.id ?? null;
      const projectName = plan.project?.name?.trim() || "未关联项目";
      const signingCompanyName =
        plan.clientContract?.legalEntity?.name?.trim() ||
        plan.legalEntity?.name?.trim() ||
        "-";
      const key = projectId
        ? `project-${projectId}`
        : `receivable-plan-${plan.id}`;
      const existing = projectMap.get(key);
      const receivableExpectedAmountTotal = (plan.nodes ?? []).reduce(
        (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
        0,
      );
      const receivableActualAmountTotal = (plan.nodes ?? []).reduce(
        (sum, node) =>
          sum +
          (node.actualNodes ?? []).reduce(
            (actualSum, actual) =>
              actualSum + Number(actual.actualAmountTaxIncluded ?? 0),
            0,
          ),
        0,
      );
      if (existing) {
        existing.hasReceivablePlan = true;
        existing.receivableExpectedAmountTotal += receivableExpectedAmountTotal;
        existing.receivableActualAmountTotal += receivableActualAmountTotal;
        if (
          signingCompanyName &&
          signingCompanyName !== "-" &&
          !existing.signingCompanyNames.includes(signingCompanyName)
        ) {
          existing.signingCompanyNames.push(signingCompanyName);
        }
        if (
          plan.ownerEmployee?.id &&
          !existing.ownerEmployees.some((item) => item.id === plan.ownerEmployee?.id)
        ) {
          existing.ownerEmployees.push({
            id: plan.ownerEmployee.id,
            name: plan.ownerEmployee.name?.trim() || "-",
          });
        }
        return;
      }
      projectMap.set(key, {
        key,
        projectId,
        projectName,
        signingCompanyNames:
          signingCompanyName && signingCompanyName !== "-"
            ? [signingCompanyName]
            : [],
        ownerEmployees: plan.ownerEmployee?.id
          ? [{
              id: plan.ownerEmployee.id,
              name: plan.ownerEmployee.name?.trim() || "-",
            }]
          : [],
        hasReceivablePlan: true,
        hasPayablePlan: false,
        receivableExpectedAmountTotal,
        receivableActualAmountTotal,
        receivableProgressPercent: 0,
        payableExpectedAmountTotal: 0,
        payableActualAmountTotal: 0,
        payableProgressPercent: 0,
      });
    });

    filteredPayablePlans.forEach((plan) => {
      const projectId = plan.project?.id ?? null;
      const projectName = plan.project?.name?.trim() || "未关联项目";
      const signingCompanyName =
        plan.vendorContract?.legalEntity?.name?.trim() ||
        plan.vendorContract?.legalEntity?.fullName?.trim() ||
        "-";
      const key = projectId
        ? `project-${projectId}`
        : `payable-plan-${plan.id}`;
      const existing = projectMap.get(key);
      const payableExpectedAmountTotal = (plan.nodes ?? []).reduce(
        (sum, node) => sum + Number(node.expectedAmountTaxIncluded ?? 0),
        0,
      );
      const payableActualAmountTotal = (plan.nodes ?? []).reduce(
        (sum, node) =>
          sum +
          (node.actualNodes ?? []).reduce(
            (actualSum, actual) =>
              actualSum + Number(actual.actualAmountTaxIncluded ?? 0),
            0,
          ),
        0,
      );
      if (existing) {
        existing.hasPayablePlan = true;
        existing.payableExpectedAmountTotal += payableExpectedAmountTotal;
        existing.payableActualAmountTotal += payableActualAmountTotal;
        if (
          signingCompanyName &&
          signingCompanyName !== "-" &&
          !existing.signingCompanyNames.includes(signingCompanyName)
        ) {
          existing.signingCompanyNames.push(signingCompanyName);
        }
        if (
          plan.ownerEmployee?.id &&
          !existing.ownerEmployees.some((item) => item.id === plan.ownerEmployee?.id)
        ) {
          existing.ownerEmployees.push({
            id: plan.ownerEmployee.id,
            name: plan.ownerEmployee.name?.trim() || "-",
          });
        }
        return;
      }
      projectMap.set(key, {
        key,
        projectId,
        projectName,
        signingCompanyNames:
          signingCompanyName && signingCompanyName !== "-"
            ? [signingCompanyName]
            : [],
        ownerEmployees: plan.ownerEmployee?.id
          ? [{
              id: plan.ownerEmployee.id,
              name: plan.ownerEmployee.name?.trim() || "-",
            }]
          : [],
        hasReceivablePlan: false,
        hasPayablePlan: true,
        receivableExpectedAmountTotal: 0,
        receivableActualAmountTotal: 0,
        receivableProgressPercent: 0,
        payableExpectedAmountTotal,
        payableActualAmountTotal,
        payableProgressPercent: 0,
      });
    });

    return Array.from(projectMap.values())
      .map((row) => ({
        ...row,
        signingCompanyNames: [...row.signingCompanyNames].sort((left, right) =>
          compareProjectName(left, right),
        ),
        receivableProgressPercent:
          row.receivableExpectedAmountTotal > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  (row.receivableActualAmountTotal /
                    row.receivableExpectedAmountTotal) *
                    100,
                ),
              )
            : 0,
        payableProgressPercent:
          row.payableExpectedAmountTotal > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  (row.payableActualAmountTotal /
                    row.payableExpectedAmountTotal) *
                    100,
                ),
              )
            : 0,
      }))
      .sort((left, right) =>
        compareProjectName(left.projectName, right.projectName),
      );
  }, [filteredPayablePlans, filteredReceivablePlans]);
  const summaryProjectColumns = useMemo<ColumnsType<SummaryProjectRow>>(
    () => [
      {
        title: "签约公司",
        dataIndex: "signingCompanyNames",
        width: 100,
        render: (value: string[]) =>
          Array.isArray(value) && value.length > 0 ? (
            <Space size={6} wrap>
              {value.map((name) => (
                <span key={name}>{renderSigningCompanyTag(name)}</span>
              ))}
            </Space>
          ) : (
            renderSigningCompanyTag("-")
          ),
      },
      {
        title: "项目",
        dataIndex: "projectName",
        width: 240,
        render: (_value, row) =>
          row.projectId ? (
            <AppLink href={`/projects/${row.projectId}`}>
              {row.projectName || "-"}
            </AppLink>
          ) : (
            row.projectName || "-"
          ),
      },
      {
        title: "收款",
        children: [
          {
            title: "预收金额总计",
            dataIndex: "receivableExpectedAmountTotal",
            width: 120,
            render: (value, row) =>
              row.hasReceivablePlan ? formatAmountWithYen(value) : "-",
          },
          {
            title: "实收金额总计",
            dataIndex: "receivableActualAmountTotal",
            width: 120,
            render: (value, row) =>
              row.hasReceivablePlan ? formatAmountWithYen(value) : "-",
          },
          {
            title: "收款进度",
            dataIndex: "receivableProgressPercent",
            width: 140,
            render: (value, row) => {
              if (!row.hasReceivablePlan) return "-";
              const percent = Math.round(Number(value ?? 0));
              return (
                <Progress
                  percent={percent}
                  size="small"
                  percentPosition={{ align: "end", type: "outer" }}
                />
              );
            },
          },
        ],
      },
      {
        title: "付款",
        children: [
          {
            title: "预付金额总计",
            dataIndex: "payableExpectedAmountTotal",
            width: 120,
            render: (value, row) =>
              row.hasPayablePlan ? formatAmountWithYen(value) : "-",
          },
          {
            title: "实付金额总计",
            dataIndex: "payableActualAmountTotal",
            width: 120,
            render: (value, row) =>
              row.hasPayablePlan ? formatAmountWithYen(value) : "-",
          },
          {
            title: "付款进度",
            dataIndex: "payableProgressPercent",
            width: 140,
            render: (value, row) => {
              if (!row.hasPayablePlan) return "-";
              const percent = Math.round(Number(value ?? 0));
              return (
                <Progress
                  percent={percent}
                  size="small"
                  percentPosition={{ align: "end", type: "outer" }}
                />
              );
            },
          },
        ],
      },
    ],
    [],
  );
  const summarySigningCompanyOptions = useMemo(
    () =>
      Array.from(
        new Set(summaryProjectRows.flatMap((row) => row.signingCompanyNames)),
      )
        .filter((name) => Boolean(name && name !== "-"))
        .sort((left, right) => compareProjectName(left, right))
        .map((name) => ({ label: name, value: name })),
    [summaryProjectRows],
  );
  const summaryProjectOptions = useMemo(
    () =>
      summaryProjectRows
        .map((row) => ({
          label: row.projectName || "-",
          value: row.key,
        }))
        .sort((left, right) => compareProjectName(left.label, right.label)),
    [summaryProjectRows],
  );
  const summaryOwnerOptions = useMemo(
    () =>
      Array.from(
        new Map(
          summaryProjectRows
            .flatMap((row) => row.ownerEmployees)
            .filter((item) => Boolean(item.id))
            .map((item) => [item.id, item]),
        ).values(),
      )
        .sort((left, right) => compareProjectName(left.name, right.name))
        .map((item) => ({
          label: item.name || "-",
          value: item.id,
        })),
    [summaryProjectRows],
  );
  const filteredSummaryProjectRows = useMemo(
    () =>
      summaryProjectRows.filter((row) => {
        const receivableUnfinished =
          row.receivableExpectedAmountTotal > 0 &&
          row.receivableActualAmountTotal < row.receivableExpectedAmountTotal;
        const payableUnfinished =
          row.payableExpectedAmountTotal > 0 &&
          row.payableActualAmountTotal < row.payableExpectedAmountTotal;

        const matchesSettlementFilter =
          deferredSummarySettlementFilter === "all"
            ? true
            : deferredSummarySettlementFilter === "receivable_unfinished"
              ? receivableUnfinished
              : deferredSummarySettlementFilter === "payable_unfinished"
                ? payableUnfinished
                : !receivableUnfinished && !payableUnfinished;
        const matchesSigningCompany =
          deferredSummarySigningCompanyFilters.length > 0
            ? row.signingCompanyNames.some((name) =>
                deferredSummarySigningCompanyFilters.includes(name),
              )
            : true;
        const matchesProject =
          deferredSummaryProjectFilters.length > 0
            ? deferredSummaryProjectFilters.includes(row.key)
            : true;
        const matchesOwner =
          deferredSummaryOwnerFilters.length > 0
            ? row.ownerEmployees.some((owner) =>
                deferredSummaryOwnerFilters.includes(owner.id),
              )
            : true;

        return (
          matchesSettlementFilter &&
          matchesSigningCompany &&
          matchesProject &&
          matchesOwner
        );
      }),
    [
      deferredSummaryOwnerFilters,
      deferredSummaryProjectFilters,
      deferredSummarySettlementFilter,
      deferredSummarySigningCompanyFilters,
      summaryProjectRows,
    ],
  );
  const summaryOverview = useMemo(() => {
    const projectCount = filteredSummaryProjectRows.length;
    const receivableExpectedTotal = filteredSummaryProjectRows.reduce(
      (sum, row) => sum + Number(row.receivableExpectedAmountTotal ?? 0),
      0,
    );
    const receivableActualTotal = filteredSummaryProjectRows.reduce(
      (sum, row) => sum + Number(row.receivableActualAmountTotal ?? 0),
      0,
    );
    const payableExpectedTotal = filteredSummaryProjectRows.reduce(
      (sum, row) => sum + Number(row.payableExpectedAmountTotal ?? 0),
      0,
    );
    const payableActualTotal = filteredSummaryProjectRows.reduce(
      (sum, row) => sum + Number(row.payableActualAmountTotal ?? 0),
      0,
    );
    const receivableActualPercent =
      receivableExpectedTotal > 0
        ? (receivableActualTotal / receivableExpectedTotal) * 100
        : 0;
    const payableActualPercent =
      payableExpectedTotal > 0
        ? (payableActualTotal / payableExpectedTotal) * 100
        : 0;

    return {
      projectCount,
      receivableExpectedTotal,
      receivableActualTotal,
      payableExpectedTotal,
      payableActualTotal,
      receivableActualPercent,
      payableActualPercent,
    };
  }, [filteredSummaryProjectRows]);

  const receivableTableViewColumns = useMemo<
    ColumnsType<ReceivableNodeTableViewRow>
  >(
    () => [
      {
        title: "签约公司",
        dataIndex: "signingCompanyName",
        width: 100,
        render: (value) => renderSigningCompanyTag(String(value ?? "")),
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "项目名称",
        dataIndex: "projectName",
        width: 220,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "跟进人",
        dataIndex: "ownerName",
        width: 100,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "合同金额(含税)",
        dataIndex: "contractAmountTaxIncluded",
        width: 140,
        render: (value) => formatAmount(value),
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "项目状态",
        dataIndex: "projectStatus",
        width: 100,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "收款阶段",
        dataIndex: "stageName",
        width: 120,
        render: (_value, record) => (
          <SelectOptionTag
            option={
              record.stageOption
                ? {
                    id: record.stageOption.id,
                    value: record.stageOption.value,
                    color: record.stageOption.color ?? undefined,
                  }
                : null
            }
          />
        ),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "收款关键交付物",
        dataIndex: "keyDeliverable",
        width: 160,
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "预收金额(含税)",
        dataIndex: "expectedAmountTaxIncluded",
        width: 140,
        render: (value) => formatAmount(value),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        width: 140,
        render: (value) => formatDate(value),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "实收金额(含税)",
        dataIndex: "actualAmountTaxIncluded",
        width: 160,
        render: (value) => formatAmount(value),
        onCell: (record) => ({
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "实收日期",
        dataIndex: "actualDate",
        width: 140,
        render: (value) => formatDate(value),
        onCell: (record) => ({
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "节点备注",
        dataIndex: "nodeRemark",
        width: 180,
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
          style: record.isNodeFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "是否有供应商付款",
        dataIndex: "hasVendorPayment",
        width: 160,
        render: (value) => <BooleanTag value={Boolean(value)} />,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
      {
        title: "备注",
        dataIndex: "planRemark",
        width: 140,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
          style: record.isPlanFullyCollected
            ? FULLY_COLLECTED_CELL_STYLE
            : undefined,
        }),
      },
    ],
    [],
  );
  const payableTableViewColumns = useMemo<ColumnsType<PayableNodeTableViewRow>>(
    () => [
      {
        title: "签约公司",
        dataIndex: "signingCompanyName",
        width: 100,
        render: (value) => renderSigningCompanyTag(String(value ?? "")),
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "项目名称",
        dataIndex: "projectName",
        width: 220,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "供应商",
        dataIndex: "vendorName",
        width: 220,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "供应商全称",
        dataIndex: "vendorFullName",
        width: 240,
        render: (value, record) => {
          const normalizedFullName = String(value ?? "").trim();
          if (!normalizedFullName || normalizedFullName === "-") return "-";
          if (normalizedFullName === record.vendorName) return "-";
          return normalizedFullName;
        },
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "跟进人",
        dataIndex: "ownerName",
        width: 120,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "合同金额(含税)",
        dataIndex: "contractAmountTaxIncluded",
        width: 160,
        render: (value) => formatAmount(value),
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "付款阶段",
        dataIndex: "stageName",
        width: 140,
        render: (_value, record) => (
          <SelectOptionQuickEditTag
            field="projectPayable.stage"
            option={
              record.stageOption
                ? {
                    id: record.stageOption.id,
                    value: record.stageOption.value,
                    color: record.stageOption.color ?? undefined,
                  }
                : null
            }
            fallbackText={record.stageName}
            modalTitle="修改付款阶段"
            saveSuccessText="付款阶段已保存"
            onSaveSelection={async (nextOption) => {
              const response = await fetch(
                `/api/project-payable-nodes/${record.nodeId}`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    stageOptionId: nextOption.id,
                  }),
                },
              );
              if (!response.ok) {
                throw new Error((await response.text()) || "修改付款阶段失败");
              }
            }}
            onUpdated={fetchData}
          />
        ),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
        }),
      },
      {
        title: "付款条件",
        dataIndex: "paymentCondition",
        width: 240,
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
        }),
      },
      {
        title: "预付金额(含税)",
        dataIndex: "expectedAmountTaxIncluded",
        width: 160,
        render: (value) => formatAmount(value),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
        }),
      },
      {
        title: "预付日期",
        dataIndex: "expectedDate",
        width: 140,
        render: (value) => formatDate(value),
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
        }),
      },
      {
        title: "实付金额(含税)",
        dataIndex: "actualAmountTaxIncluded",
        width: 160,
        render: (value) => formatAmount(value),
      },
      {
        title: "实付日期",
        dataIndex: "actualDate",
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: "节点备注",
        dataIndex: "nodeRemark",
        width: 180,
        onCell: (record) => ({
          rowSpan: record.expectedRowSpan,
        }),
      },
      {
        title: "是否有客户收款",
        dataIndex: "hasCustomerCollection",
        width: 160,
        render: (value) => <BooleanTag value={Boolean(value)} />,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
      {
        title: "备注",
        dataIndex: "planRemark",
        width: 180,
        onCell: (record) => ({
          rowSpan: record.planRowSpan,
        }),
      },
    ],
    [fetchData],
  );

  const showDevelopmentPlaceholder = authLoaded && !isAdmin;

  const tabList = useMemo(
    () => [
      { key: "summary", tab: "收付款汇总" },
      { key: "receivable", tab: "收款明细" },
      { key: "payable", tab: "付款明细" },
    ],
    [],
  );

  return (
    <Card
      title="收付款明细"
      variant="borderless"
      tabList={tabList}
      activeTabKey={activeTab}
      extra={activeTab === "receivable" ? <Button>下载表格</Button> : undefined}
      onTabChange={(key) => {
        const nextTab = toTabKey(key);
        setActiveTab(nextTab);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("tab", nextTab);
        router.replace(`${pathname}?${nextParams.toString()}`, {
          scroll: false,
        });
      }}
    >
      {contextHolder}
      {showDevelopmentPlaceholder ? (
        <PageAccessResult type="developing" />
      ) : activeTab === "summary" ? (
        filteredReceivablePlans.length === 0 &&
        filteredPayablePlans.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Space size={8} wrap>
                <Segmented
                  options={[
                    { label: "全部", value: "all" },
                    { label: "收款未完成", value: "receivable_unfinished" },
                    { label: "付款未完成", value: "payable_unfinished" },
                    { label: "结算完毕", value: "settled" },
                  ]}
                  value={summarySettlementFilter}
                  onChange={(value) =>
                    setSummarySettlementFilter(value as SummarySettlementFilter)
                  }
                />
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="选择签约公司"
                  style={{ width: 180 }}
                  options={summarySigningCompanyOptions}
                  value={summarySigningCompanyFilters}
                  optionFilterProp="label"
                  onChange={(value) => {
                    setSummarySigningCompanyFilters(
                      Array.isArray(value) ? (value as string[]) : [],
                    );
                  }}
                />
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="选择项目"
                  style={{ width: 260 }}
                  options={summaryProjectOptions}
                  value={summaryProjectFilters}
                  optionFilterProp="label"
                  onChange={(value) => {
                    setSummaryProjectFilters(
                      Array.isArray(value) ? (value as string[]) : [],
                    );
                  }}
                />
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="选择跟进人"
                  style={{ width: 160 }}
                  options={summaryOwnerOptions}
                  value={summaryOwnerFilters}
                  optionFilterProp="label"
                  onChange={(value) => {
                    setSummaryOwnerFilters(
                      Array.isArray(value) ? (value as string[]) : [],
                    );
                  }}
                />
              </Space>
            </div>
            <Divider
              style={{
                width: "calc(100% + 48px)",
                margin: "0 -24px 12px",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <StatisticCard
                style={{ background: "#F5F4EE" }}
                statistic={{
                  title: "项目总数",
                  value: summaryOverview.projectCount,
                  formatter: (value) =>
                    Number(value ?? 0).toLocaleString("zh-CN"),
                }}
              />
              <StatisticCard
                style={{ background: "#F5F4EE" }}
                statistic={{
                  title: "预收合计",
                  value: summaryOverview.receivableExpectedTotal,
                  formatter: (value) =>
                    `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
                }}
              />
              <StatisticCard
                style={{ background: "#F5F4EE" }}
                statistic={{
                  title: "实收合计",
                  value: summaryOverview.receivableActualTotal,
                  description: (
                    <Progress
                      percent={Math.round(summaryOverview.receivableActualPercent)}
                      strokeColor="green"
                    />
                  ),
                  formatter: (value) =>
                    `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
                }}
              />
              <StatisticCard
                style={{ background: "#F5F4EE" }}
                statistic={{
                  title: "预付合计",
                  value: summaryOverview.payableExpectedTotal,
                  formatter: (value) =>
                    `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
                }}
              />
              <StatisticCard
                style={{ background: "#F5F4EE" }}
                statistic={{
                  title: "实付合计",
                  value: summaryOverview.payableActualTotal,
                  description: (
                    <Progress
                      percent={Math.round(summaryOverview.payableActualPercent)}
                      strokeColor="green"
                    />
                  ),
                  formatter: (value) =>
                    `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
                }}
              />
            </div>
            <Table
              rowKey="key"
              loading={loading}
              bordered
              size="small"
              columns={summaryProjectColumns}
              dataSource={filteredSummaryProjectRows}
              pagination={false}
              scroll={{ x: "max-content" }}
              style={{ marginBottom: 16 }}
            />
          </>
        )
      ) : activeTab === "receivable" ? (
        <>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Space size={8}>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择签约公司"
                style={{ width: 130 }}
                options={searchableLegalEntityOptions}
                value={receivableLegalEntityFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handleReceivableLegalEntitySearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择项目"
                style={{ width: 260 }}
                options={searchableProjectOptions}
                value={receivableProjectFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handleReceivableProjectSearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择跟进人"
                style={{ width: 140 }}
                options={searchableOwnerOptions}
                value={receivableOwnerFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handleReceivableOwnerSearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
            </Space>
            <Space size={8}>
              <Segmented
                options={[
                  { label: "卡片", value: "card" },
                  { label: "表格", value: "table" },
                ]}
                value={receivableViewMode}
                onChange={(value) =>
                  handleReceivableViewModeChange(value as ReceivableViewMode)
                }
              />
            </Space>
          </div>
          <Divider
            style={{
              width: "calc(100% + 48px)",
              margin: "0 -24px 12px",
            }}
          />
          {receivableViewMode === "table" ? (
            <Table
              rowKey="key"
              loading={loading}
              bordered
              size="small"
              columns={receivableTableViewColumns}
              dataSource={receivableNodeTableRows}
              pagination={false}
              scroll={{ x: "max-content" }}
            />
          ) : receivableNodeRows.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "项目个数",
                    value: receivableSummary.planCount,
                    suffix: "个",
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "合同总金额(含税)",
                    value: receivableSummary.contractAmountTotal,
                    suffix: "元",
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "实收金额",
                    value: receivableSummary.actualAmountTotal,
                    suffix: "元",
                    description: (
                      <Progress
                        percent={Math.round(receivableSummary.actualPercent)}
                        strokeColor="green"
                      />
                    ),
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "待收金额",
                    value: receivableSummary.pendingAmountTotal,
                    suffix: "元",
                    description: (
                      <Progress
                        percent={Math.round(receivableSummary.pendingPercent)}
                        strokeColor="gray"
                      />
                    ),
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
              </div>
              <Divider
                style={{
                  width: "calc(100% + 48px)",
                  margin: "0 -24px 24px",
                }}
              />
              {receivableProjects.length > 0 ? (
                receivableProjects.map((project) => (
                  <ReceivableProjectSection
                    key={project.projectId}
                    projectId={project.projectId}
                    projectName={project.projectName}
                    signingCompanyName={project.signingCompanyName}
                    contractAmountTotal={project.contractAmountTotal}
                    ownerName={project.ownerName}
                    projectStatusOption={project.projectStatusOption}
                    onProjectStatusUpdated={fetchData}
                    primaryPlanId={project.primaryPlanId}
                    rows={project.rows}
                    stageOptions={
                      stageOptions.length > 0
                        ? stageOptions
                        : Array.from(project.stageOptionMap.values())
                    }
                    canManageProject
                    onCreateNode={handleCreateReceivableNode}
                    onDeleteNode={handleDeleteReceivableNode}
                    onEditNode={handleEditReceivableNode}
                    onDragSortNodes={handleDragSortReceivableNodes}
                    onCollectNode={handleCollectReceivableNode}
                    onEditActualNode={handleEditReceivableActualNode}
                    onDeleteActualNode={handleDeleteReceivableActualNode}
                    onDelayNode={handleDelayReceivableNode}
                  />
                ))
              ) : (
                <Empty description="暂无项目数据" />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Space size={8}>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择签约公司"
                style={{ width: 130 }}
                options={searchableLegalEntityOptions}
                value={payableLegalEntityFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handlePayableLegalEntitySearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择项目"
                style={{ width: 260 }}
                options={searchableProjectOptions}
                value={payableProjectFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handlePayableProjectSearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择供应商"
                style={{ width: 160 }}
                options={searchableVendorOptions}
                value={payableVendorFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handlePayableVendorSearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择跟进人"
                style={{ width: 140 }}
                options={searchableOwnerOptions}
                value={payableOwnerFilterIds}
                optionFilterProp="label"
                onChange={(value) => {
                  handlePayableOwnerSearchChange(
                    Array.isArray(value) ? (value as string[]) : [],
                  );
                }}
              />
            </Space>
            <Space size={8}>
              <Segmented
                options={[
                  { label: "卡片", value: "card" },
                  { label: "表格", value: "table" },
                ]}
                value={payableViewMode}
                onChange={(value) =>
                  handlePayableViewModeChange(value as PayableViewMode)
                }
              />
            </Space>
          </div>
          <Divider
            style={{
              width: "calc(100% + 48px)",
              margin: "0 -24px 12px",
            }}
          />
          {dataSource.length === 0 ? (
            <Empty description="暂无数据" />
          ) : payableViewMode === "table" ? (
            <Table
              rowKey="key"
              loading={loading}
              bordered
              size="small"
              columns={payableTableViewColumns}
              dataSource={payableNodeTableRows}
              pagination={false}
              scroll={{ x: "max-content" }}
            />
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "项目个数",
                    value: payableSummary.projectCount,
                    suffix: "个",
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "合同总金额(含税)",
                    value: payableSummary.contractAmountTotal,
                    suffix: "元",
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "实付金额",
                    value: payableSummary.actualAmountTotal,
                    suffix: "元",
                    description: (
                      <Progress
                        percent={Math.round(payableSummary.actualPercent)}
                        strokeColor="green"
                      />
                    ),
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
                <StatisticCard
                  style={{ background: "#F5F4EE" }}
                  statistic={{
                    title: "待付金额",
                    value: payableSummary.pendingAmountTotal,
                    suffix: "元",
                    description: (
                      <Progress
                        percent={Math.round(payableSummary.pendingPercent)}
                        strokeColor="gray"
                      />
                    ),
                    formatter: (value) =>
                      Number(value ?? 0).toLocaleString("zh-CN"),
                  }}
                />
              </div>
              <Divider
                style={{
                  width: "calc(100% + 48px)",
                  margin: "0 -24px 24px",
                }}
              />
              {payableProjects.length > 0 ? (
                payableProjects.map((project) => (
                  <PayableProjectSection
                    key={project.primaryPlanId}
                    projectId={project.projectId}
                    projectName={project.projectName}
                    signingCompanyName={project.signingCompanyName}
                    contractAmountTotal={project.contractAmountTotal}
                    ownerName={project.ownerName}
                    projectStatusOption={project.projectStatusOption}
                    primaryPlanId={project.primaryPlanId}
                    rows={project.rows}
                    stageOptions={
                      payableStageOptions.length > 0
                        ? payableStageOptions
                        : Array.from(project.stageOptionMap.values())
                    }
                    canManageProject
                    onCreateNode={handleCreatePayableNode}
                    onDeleteNode={handleDeletePayableNode}
                    onEditNode={handleEditPayableNode}
                    onDragSortNodes={handleDragSortPayableNodes}
                    onPayNode={handlePayPayableNode}
                    onEditActualNode={handleEditPayableActualNode}
                    onDeleteActualNode={handleDeletePayableActualNode}
                    onProjectStatusUpdated={fetchData}
                  />
                ))
              ) : (
                <Empty description="暂无项目数据" />
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}

export default function ProjectReceivablePayablePage() {
  return (
    <Suspense fallback={<Card loading />}>
      <ProjectReceivablePayablePageContent />
    </Suspense>
  );
}
