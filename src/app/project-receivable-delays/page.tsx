"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Divider,
  Empty,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatisticCard } from "@ant-design/pro-components";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppLink from "@/components/AppLink";
import type { ProjectReceivableActualNodeFormValues } from "@/components/project-detail/ProjectReceivableActualNodeModal";
import ReceivableCollectionModal from "@/components/project-receivable-delays/ReceivableCollectionModal";
import ReceivableDelayChangesTable, {
  type ReceivableDelayChangeRow,
} from "@/components/project-receivable-delays/ReceivableDelayChangesTable";
import SelectOptionTag from "@/components/SelectOptionTag";
import { getSigningCompanyTagColor } from "@/lib/constants";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectsStore } from "@/stores/projectsStore";

type LegalEntityOption = {
  id: string;
  name?: string | null;
};
type ActualNode = {
  id: string;
  actualAmountTaxIncluded?: number | null;
};
type ReceivableNode = {
  id: string;
  stageOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  keyDeliverable?: string | null;
  expectedAmountTaxIncluded?: number | null;
  expectedDate?: string | null;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    changedAt: string;
    changedByEmployee?: {
      id?: string;
      name?: string | null;
    } | null;
    reason?: string | null;
    remark?: string | null;
  }>;
  actualNodes?: ActualNode[];
};
type ReceivablePlan = {
  id: string;
  project?: { id: string; name?: string | null } | null;
  legalEntity?: { id: string; name?: string | null } | null;
  clientContract?: {
    legalEntity?: { id: string; name?: string | null } | null;
  } | null;
  nodes?: ReceivableNode[];
};
type ForecastNodeRow = {
  key: string;
  nodeId: string;
  expectedDate: string;
  expectedDateTs: number;
  monthKey: string;
  legalEntityId: string | null;
  accountName: string;
  projectId: string | null;
  projectName: string;
  stageOption?: {
    id: string;
    value: string;
    color?: string | null;
  } | null;
  stageName: string;
  keyDeliverable: string;
  expectedAmount: number;
  actualAmount: number;
  isDelayed: boolean;
};
const ALL_PROJECTS_QUERY_KEY = JSON.stringify({
  type: "",
  ownerId: "",
  clientId: "",
  vendorId: "",
});
const toTabKey = (value: string | null): "forecast" | "changes" =>
  value === "changes" ? "changes" : "forecast";
const formatAmountWithYen = (value?: number | null) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "-";
  return `¥${numberValue.toLocaleString("zh-CN")}`;
};
const renderAccountTag = (name: string) => (
  <Tag
    style={{
      marginInlineEnd: 0,
      border: "none",
      borderRadius: 999,
      paddingInline: 10,
      color: "rgba(0,0,0,0.88)",
      backgroundColor: getSigningCompanyTagColor(name),
    }}
  >
    {name || "-"}
  </Tag>
);

function ProjectReceivableDelaysPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<"forecast" | "changes">(
    "forecast",
  );
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [receivablePlans, setReceivablePlans] = useState<ReceivablePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [legalEntityFilterIds, setLegalEntityFilterIds] = useState<string[]>(
    [],
  );
  const [projectFilterIds, setProjectFilterIds] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>();
  const [monthFilter, setMonthFilter] = useState<string>();
  const [changeSortMode, setChangeSortMode] = useState<
    "changedAt" | "fromExpectedDate" | "toExpectedDate"
  >("fromExpectedDate");
  const [detailModalRow, setDetailModalRow] =
    useState<ReceivableDelayChangeRow | null>(null);
  const [collectingRow, setCollectingRow] = useState<ForecastNodeRow | null>(
    null,
  );
  const [collecting, setCollecting] = useState(false);
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = useMemo(
    () => getRoleCodesFromUser(currentUser),
    [currentUser],
  );
  const canCollectReceivable = useMemo(
    () => canManageProjectResources(roleCodes),
    [roleCodes],
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

  useEffect(() => {
    if (!authLoaded) {
      void fetchMe();
    }
  }, [authLoaded, fetchMe]);
  useEffect(() => {
    setActiveTab(toTabKey(searchParams.get("tab")));
  }, [searchParams]);
  useEffect(() => {
    if (!authLoaded) return;
    if (projectsLoaded) return;
    void fetchProjectsFromStore({ force: true });
  }, [authLoaded, fetchProjectsFromStore, projectsLoaded]);
  const fetchReceivablePlans = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/project-receivable-plans", {
        cache: "no-store",
      });
      if (!response.ok) {
        setReceivablePlans([]);
        return;
      }
      const rows = (await response.json()) as ReceivablePlan[];
      setReceivablePlans(Array.isArray(rows) ? rows : []);
    } catch {
      setReceivablePlans([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoaded) return;
    void fetchReceivablePlans();
  }, [authLoaded]);
  useEffect(() => {
    if (!authLoaded) return;
    (async () => {
      try {
        const response = await fetch("/api/legal-entities", {
          cache: "no-store",
        });
        if (!response.ok) {
          setLegalEntities([]);
          return;
        }
        const rows = (await response.json()) as LegalEntityOption[];
        setLegalEntities(Array.isArray(rows) ? rows : []);
      } catch {
        setLegalEntities([]);
      }
    })();
  }, [authLoaded]);

  const legalEntityOptions = useMemo(
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
  const projectOptions = useMemo(
    () =>
      (projectIds ?? [])
        .map((id) => projectsById[id])
        .filter((item): item is { id: string; name?: string | null } =>
          Boolean(item?.id && item?.name?.trim()),
        )
        .map((item) => ({
          value: item.id,
          label: String(item.name).trim(),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "zh-CN")),
    [projectIds, projectsById],
  );
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => {
        const month = String(index + 1).padStart(2, "0");
        return { value: month, label: `${month}月` };
      }),
    [],
  );
  const forecastRows = useMemo<ForecastNodeRow[]>(() => {
    const todayStart = dayjs().startOf("day");
    return receivablePlans.flatMap((plan) => {
      const accountName =
        plan.clientContract?.legalEntity?.name?.trim() ||
        plan.legalEntity?.name?.trim() ||
        "-";
      const legalEntityId =
        plan.clientContract?.legalEntity?.id || plan.legalEntity?.id || null;
      const projectName = plan.project?.name?.trim() || "未关联项目";
      const projectId = plan.project?.id ?? null;
      return (plan.nodes ?? []).flatMap((node) => {
        const expectedAmount = Number(node.expectedAmountTaxIncluded ?? 0);
        const actualAmount = (node.actualNodes ?? []).reduce(
          (sum, actual) => sum + Number(actual.actualAmountTaxIncluded ?? 0),
          0,
        );
        const isCompleted = actualAmount >= expectedAmount;
        if (isCompleted) return [];
        const expectedDateDayjs = dayjs(String(node.expectedDate ?? ""));
        if (!expectedDateDayjs.isValid()) return [];
        const expectedDate = expectedDateDayjs.format("YYYY-MM-DD");
        return [
          {
            key: `${plan.id}-${node.id}`,
            nodeId: node.id,
            expectedDate,
            expectedDateTs: expectedDateDayjs.valueOf(),
            monthKey: expectedDateDayjs.format("YYYY-MM"),
            legalEntityId,
            accountName,
            projectId,
            projectName,
            stageOption: node.stageOption?.value
              ? {
                  id: node.id,
                  value: node.stageOption.value,
                  color: null,
                }
              : null,
            stageName: node.stageOption?.value?.trim() || "-",
            keyDeliverable: node.keyDeliverable?.trim() || "-",
            expectedAmount,
            actualAmount,
            isDelayed: expectedDateDayjs.isBefore(todayStart, "day"),
          },
        ];
      });
    });
  }, [receivablePlans]);
  const yearSourceRows = useMemo(
    () =>
      forecastRows.filter((row) => {
        const matchesLegalEntity =
          legalEntityFilterIds.length > 0
            ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
            : true;
        const matchesProject =
          projectFilterIds.length > 0
            ? projectFilterIds.includes(row.projectId ?? "")
            : true;
        const monthValue = dayjs(row.expectedDate).format("MM");
        const matchesMonth = monthFilter ? monthValue === monthFilter : true;
        return matchesLegalEntity && matchesProject && matchesMonth;
      }),
    [forecastRows, legalEntityFilterIds, monthFilter, projectFilterIds],
  );
  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          yearSourceRows.map((row) => dayjs(row.expectedDate).format("YYYY")),
        ),
      )
        .filter((year) => Boolean(year))
        .sort((left, right) => Number(left) - Number(right))
        .map((year) => ({ value: year, label: `${year}年` })),
    [yearSourceRows],
  );
  const filteredForecastRows = useMemo(
    () =>
      forecastRows.filter((row) => {
        const matchesLegalEntity =
          legalEntityFilterIds.length > 0
            ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
            : true;
        const matchesProject =
          projectFilterIds.length > 0
            ? projectFilterIds.includes(row.projectId ?? "")
            : true;
        const yearValue = dayjs(row.expectedDate).format("YYYY");
        const monthValue = dayjs(row.expectedDate).format("MM");
        const matchesYear = yearFilter ? yearValue === yearFilter : true;
        const matchesMonth = monthFilter ? monthValue === monthFilter : true;
        return (
          matchesLegalEntity && matchesProject && matchesYear && matchesMonth
        );
      }),
    [
      forecastRows,
      legalEntityFilterIds,
      projectFilterIds,
      yearFilter,
      monthFilter,
    ],
  );
  const { changeRows, changeRowsByNode } = useMemo(() => {
    const latestRows: ReceivableDelayChangeRow[] = [];
    const rowsByNode = new Map<string, ReceivableDelayChangeRow[]>();

    for (const plan of receivablePlans) {
      const accountName =
        plan.clientContract?.legalEntity?.name?.trim() ||
        plan.legalEntity?.name?.trim() ||
        "-";
      const legalEntityId =
        plan.clientContract?.legalEntity?.id || plan.legalEntity?.id || null;
      const projectName = plan.project?.name?.trim() || "未关联项目";
      const projectId = plan.project?.id ?? null;

      for (const node of plan.nodes ?? []) {
        const histories = Array.isArray(node.expectedDateHistories)
          ? node.expectedDateHistories
          : [];
        if (histories.length === 0) continue;

        const expectedAmount = Number(node.expectedAmountTaxIncluded ?? 0);
        const actualAmount = (node.actualNodes ?? []).reduce(
          (sum, actual) => sum + Number(actual.actualAmountTaxIncluded ?? 0),
          0,
        );
        if (actualAmount >= expectedAmount) continue;

        const sortedValidHistories = histories
          .filter((history) => {
            const fromExpectedDate = dayjs(history.fromExpectedDate);
            const toExpectedDate = dayjs(history.toExpectedDate);
            if (!fromExpectedDate.isValid() || !toExpectedDate.isValid()) {
              return false;
            }
            return !toExpectedDate.isSame(fromExpectedDate, "day");
          })
          .slice()
          .sort((left, right) => {
            const leftTs = dayjs(left.changedAt).isValid()
              ? dayjs(left.changedAt).valueOf()
              : 0;
            const rightTs = dayjs(right.changedAt).isValid()
              ? dayjs(right.changedAt).valueOf()
              : 0;
            return leftTs - rightTs;
          });
        if (sortedValidHistories.length === 0) continue;
        const earliestFromDate = dayjs(
          sortedValidHistories[0].fromExpectedDate,
        );

        const detailRowsAsc = sortedValidHistories.map((history, index) => {
          const fromExpectedDate = dayjs(history.fromExpectedDate);
          const toExpectedDate = dayjs(history.toExpectedDate);
          return {
            key: `${node.id}-${history.id}`,
            nodeId: node.id,
            legalEntityId,
            accountName,
            projectId,
            projectName,
            stageOption: node.stageOption?.value
              ? {
                  id: node.stageOption.id ?? node.id,
                  value: node.stageOption.value,
                  color: node.stageOption.color ?? null,
                }
              : null,
            stageName: node.stageOption?.value?.trim() || "-",
            keyDeliverable: node.keyDeliverable?.trim() || "-",
            expectedAmount,
            actualAmount,
            collectionProgressPercent:
              expectedAmount > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round((actualAmount / expectedAmount) * 100),
                    ),
                  )
                : 0,
            fromExpectedDate: fromExpectedDate.format("YYYY-MM-DD"),
            fromExpectedDateTs: fromExpectedDate.valueOf(),
            toExpectedDate: toExpectedDate.format("YYYY-MM-DD"),
            toExpectedDateTs: toExpectedDate.valueOf(),
            delayCount: index + 1,
            createdDate: dayjs(history.changedAt).isValid()
              ? dayjs(history.changedAt).format("YYYY-MM-DD")
              : "-",
            createdTs: dayjs(history.changedAt).isValid()
              ? dayjs(history.changedAt).valueOf()
              : 0,
            createdBy: history.changedByEmployee?.name?.trim() || "-",
            changeReason: String(history.reason ?? "").trim() || "-",
            changeRemark: String(history.remark ?? "").trim() || "-",
          };
        });

        const detailRows = detailRowsAsc.slice().reverse();
        rowsByNode.set(node.id, detailRows);
        const latestRow = detailRows[0];
        latestRows.push({
          ...latestRow,
          fromExpectedDate: earliestFromDate.isValid()
            ? earliestFromDate.format("YYYY-MM-DD")
            : latestRow.fromExpectedDate,
          fromExpectedDateTs: earliestFromDate.isValid()
            ? earliestFromDate.valueOf()
            : latestRow.fromExpectedDateTs,
        });
      }
    }

    return { changeRows: latestRows, changeRowsByNode: rowsByNode };
  }, [receivablePlans]);
  const filteredChangeRows = useMemo(
    () =>
      changeRows
        .filter((row) => {
          const matchesLegalEntity =
            legalEntityFilterIds.length > 0
              ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
              : true;
          const matchesProject =
            projectFilterIds.length > 0
              ? projectFilterIds.includes(row.projectId ?? "")
              : true;
          const yearValue = dayjs(row.toExpectedDate).format("YYYY");
          const matchesYear = yearFilter ? yearValue === yearFilter : true;
          return matchesLegalEntity && matchesProject && matchesYear;
        })
        .sort((left, right) => {
          if (changeSortMode === "fromExpectedDate") {
            return left.fromExpectedDateTs - right.fromExpectedDateTs;
          }
          if (changeSortMode === "toExpectedDate") {
            return left.toExpectedDateTs - right.toExpectedDateTs;
          }
          return right.createdTs - left.createdTs;
        }),
    [
      changeRows,
      legalEntityFilterIds,
      projectFilterIds,
      yearFilter,
      changeSortMode,
    ],
  );
  const changeYearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          changeRows
            .filter((row) =>
              legalEntityFilterIds.length > 0
                ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
                : true,
            )
            .filter((row) =>
              projectFilterIds.length > 0
                ? projectFilterIds.includes(row.projectId ?? "")
                : true,
            )
            .map((row) => dayjs(row.toExpectedDate).format("YYYY")),
        ),
      )
        .filter((year) => Boolean(year))
        .sort((left, right) => Number(left) - Number(right))
        .map((year) => ({ value: year, label: `${year}年` })),
    [changeRows, legalEntityFilterIds, projectFilterIds],
  );
  const changeSummary = useMemo(() => {
    const changedAmountTotal = filteredChangeRows.reduce(
      (sum, row) => sum + Number(row.expectedAmount ?? 0),
      0,
    );
    const collectedAmountTotal = filteredChangeRows.reduce(
      (sum, row) => sum + Number(row.actualAmount ?? 0),
      0,
    );
    const delayedAmountTotal = Math.max(
      changedAmountTotal - collectedAmountTotal,
      0,
    );
    return {
      changedAmountTotal,
      changedNodeCount: filteredChangeRows.length,
      collectedAmountTotal,
      delayedAmountTotal,
    };
  }, [filteredChangeRows]);
  const detailModalRows = useMemo(
    () =>
      detailModalRow
        ? (changeRowsByNode.get(detailModalRow.nodeId) ?? [detailModalRow])
        : [],
    [changeRowsByNode, detailModalRow],
  );
  useEffect(() => {
    if (!yearFilter) return;
    const effectiveYearOptions =
      activeTab === "changes" ? changeYearOptions : yearOptions;
    const exists = effectiveYearOptions.some(
      (item) => item.value === yearFilter,
    );
    if (exists) return;
    setYearFilter(undefined);
  }, [activeTab, changeYearOptions, yearFilter, yearOptions]);
  const summary = useMemo(() => {
    const now = dayjs();
    const currentMonth = now.format("YYYY-MM");
    const nextMonth = now.add(1, "month").format("YYYY-MM");
    const currentMonthTotal = filteredForecastRows
      .filter((row) => row.monthKey === currentMonth)
      .reduce((sum, row) => sum + row.expectedAmount, 0);
    const nextMonthTotal = filteredForecastRows
      .filter((row) => row.monthKey === nextMonth)
      .reduce((sum, row) => sum + row.expectedAmount, 0);
    return {
      currentMonthTotal,
      nextMonthTotal,
      pendingCount: filteredForecastRows.length,
      delayedCount: filteredForecastRows.filter((row) => row.isDelayed).length,
    };
  }, [filteredForecastRows]);
  const groupedRows = useMemo(() => {
    const grouped = new Map<string, ForecastNodeRow[]>();
    filteredForecastRows
      .slice()
      .sort((left, right) => left.expectedDateTs - right.expectedDateTs)
      .forEach((row) => {
        const current = grouped.get(row.monthKey) ?? [];
        current.push(row);
        grouped.set(row.monthKey, current);
      });
    return Array.from(grouped.entries()).sort(([left], [right]) =>
      left.localeCompare(right, "zh-CN"),
    );
  }, [filteredForecastRows]);
  const columns = useMemo<ColumnsType<ForecastNodeRow>>(
    () => [
      {
        title: "预计进账日期",
        dataIndex: "expectedDate",
        width: 130,
        render: (value, row) => {
          const dateText = String(value ?? "-");
          const overdueDays = row.isDelayed
            ? dayjs()
                .startOf("day")
                .diff(dayjs(row.expectedDate).startOf("day"), "day")
            : 0;
          return (
            <div style={{ lineHeight: 1.3 }}>
              <div>{dateText}</div>
              {overdueDays > 0 ? (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#BE2E2C",
                  }}
                >
                  {`已逾期${overdueDays}天`}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "项目名称",
        dataIndex: "projectName",
        width: 220,
        render: (value, row) =>
          row.projectId ? (
            <AppLink href={`/projects/${row.projectId}?step=3&tab=receivable`}>
              {value || "-"}
            </AppLink>
          ) : (
            <span>{value || "-"}</span>
          ),
      },
      {
        title: "阶段",
        dataIndex: "stageName",
        width: 120,
        render: (_value, row) => (
          <SelectOptionTag
            option={
              row.stageOption
                ? {
                    id: row.stageOption.id,
                    value: row.stageOption.value,
                    color: row.stageOption.color ?? undefined,
                  }
                : row.stageName && row.stageName !== "-"
                  ? { id: `${row.key}-stage`, value: row.stageName }
                  : null
            }
          />
        ),
      },
      {
        title: "关键交付物",
        dataIndex: "keyDeliverable",
        // width: 180,
        render: (value) => value || "-",
      },
      {
        title: "金额",
        dataIndex: "expectedAmount",
        width: 160,
        render: (value, row) => (
          <div style={{ lineHeight: 1.3 }}>
            <div
              style={{
                fontWeight: 700,
                ...(row.isDelayed ? { color: "#BE2E2C" } : {}),
              }}
            >
              {formatAmountWithYen(Number(value ?? 0))}
            </div>
            {Number(row.actualAmount ?? 0) > 0 ? (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                {`已收${formatAmountWithYen(Number(row.actualAmount ?? 0))}`}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: "收款账户",
        dataIndex: "accountName",
        width: 120,
        render: (value) => renderAccountTag(String(value ?? "-")),
      },
      {
        title: "操作",
        key: "actions",
        width: 90,
        align: "center",
        render: (_value, row) => (
          <Button
            type="link"
            size="small"
            disabled={!canCollectReceivable}
            onClick={() => setCollectingRow(row)}
          >
            收款
          </Button>
        ),
      },
    ],
    [canCollectReceivable],
  );
  return (
    <Card
      variant="borderless"
      tabList={[
        { key: "forecast", tab: "进账预测" },
        { key: "changes", tab: "进账变动情况" },
      ]}
      activeTabKey={activeTab}
      onTabChange={(key) => {
        const nextTab = key === "changes" ? "changes" : "forecast";
        setActiveTab(nextTab);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("tab", nextTab);
        router.replace(`${pathname}?${nextParams.toString()}`, {
          scroll: false,
        });
      }}
    >
      {contextHolder}
      {activeTab === "forecast" ? (
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
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择账户"
                style={{ width: 180 }}
                optionFilterProp="label"
                options={legalEntityOptions}
                value={legalEntityFilterIds}
                onChange={(value) =>
                  setLegalEntityFilterIds(
                    Array.isArray(value) ? (value as string[]) : [],
                  )
                }
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="选择项目"
                style={{ width: 260 }}
                optionFilterProp="label"
                options={projectOptions}
                value={projectFilterIds}
                onChange={(value) =>
                  setProjectFilterIds(
                    Array.isArray(value) ? (value as string[]) : [],
                  )
                }
              />
              <Select
                allowClear
                showSearch
                placeholder="选择年份"
                style={{ width: 140 }}
                optionFilterProp="label"
                options={yearOptions}
                value={yearFilter}
                onChange={(value) => setYearFilter(value)}
              />
              <Select
                allowClear
                showSearch
                placeholder="选择月份"
                style={{ width: 140 }}
                optionFilterProp="label"
                options={monthOptions}
                value={monthFilter}
                onChange={(value) => setMonthFilter(value)}
              />
            </Space>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "本月预计进账",
                value: summary.currentMonthTotal,
                formatter: (value) =>
                  `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "下个月预计进账",
                value: summary.nextMonthTotal,
                formatter: (value) =>
                  `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "待进账数量",
                value: summary.pendingCount,
                suffix: "笔",
                formatter: (value) =>
                  Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "延期进账数量",
                value: summary.delayedCount,
                suffix: "笔",
                formatter: (value) =>
                  Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
          </div>
          <Divider
            style={{
              margin: "0 -24px 16px",
              width: "calc(100% + 48px)",
              minWidth: "calc(100% + 48px)",
            }}
          />
          {groupedRows.length === 0 ? (
            <Empty description="暂无未完成预收节点" />
          ) : (
            <Space orientation="vertical" size={20} style={{ width: "100%" }}>
              {groupedRows.map(([monthKey, rows]) => {
                const monthDate = dayjs(`${monthKey}-01`);
                const monthText = `${monthDate.year()}年${monthDate.month() + 1}月`;
                const monthTotal = rows.reduce(
                  (sum, row) => sum + row.expectedAmount,
                  0,
                );
                const currentMonthStart = dayjs().startOf("month");
                const isOverdueMonth = monthDate.isBefore(
                  currentMonthStart,
                  "month",
                );
                const isCurrentMonth = monthDate.isSame(
                  currentMonthStart,
                  "month",
                );
                const isFutureMonth = monthDate.isAfter(
                  currentMonthStart,
                  "month",
                );
                return (
                  <Card
                    key={monthKey}
                    title={
                      <Space size={8}>
                        <span style={{ fontSize: 14 }}>{monthText}</span>
                        {isCurrentMonth ? (
                          <Tag color="green">本月</Tag>
                        ) : isOverdueMonth ? (
                          <Tag color="red">已逾期</Tag>
                        ) : isFutureMonth ? (
                          <Tag color="blue">待收</Tag>
                        ) : null}
                      </Space>
                    }
                    extra={
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        合计 {formatAmountWithYen(monthTotal)}
                      </span>
                    }
                    styles={{
                      header: { padding: "2px 16px", minHeight: 48 },
                      body: { padding: "0 0 4px" },
                    }}
                  >
                    <Table
                      className="forecast-month-table"
                      rowKey="key"
                      loading={loading}
                      columns={columns}
                      dataSource={rows}
                      rowClassName={(record) =>
                        record.isDelayed
                          ? "forecast-month-table-row-overdue"
                          : "forecast-month-table-row-normal"
                      }
                      pagination={false}
                      scroll={{ x: "max-content" }}
                    />
                  </Card>
                );
              })}
            </Space>
          )}
          <style jsx global>{`
            .forecast-month-table
              .ant-table-tbody
              > tr.forecast-month-table-row-overdue
              > td:first-child {
              border-left: 3px solid #be2e2c;
            }
            .forecast-month-table
              .ant-table-tbody
              > tr.forecast-month-table-row-normal
              > td:first-child {
              border-left: 3px solid green;
            }
            .forecast-month-table .ant-table-tbody > tr:last-child > td {
              border-bottom: none;
            }
          `}</style>
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
            <Space size={8} wrap>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="收款账户"
                style={{ width: 120 }}
                optionFilterProp="label"
                options={legalEntityOptions}
                value={legalEntityFilterIds}
                onChange={(value) =>
                  setLegalEntityFilterIds(
                    Array.isArray(value) ? (value as string[]) : [],
                  )
                }
              />
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="项目"
                style={{ width: 220 }}
                optionFilterProp="label"
                options={projectOptions}
                value={projectFilterIds}
                onChange={(value) =>
                  setProjectFilterIds(
                    Array.isArray(value) ? (value as string[]) : [],
                  )
                }
              />
              <Select
                allowClear
                showSearch
                placeholder="选择年份"
                style={{ width: 100 }}
                optionFilterProp="label"
                options={changeYearOptions}
                value={yearFilter}
                onChange={(value) => setYearFilter(value)}
              />
            </Space>
            <Select
              style={{ width: 160 }}
              options={[
                { value: "fromExpectedDate", label: "按原预收日期排序" },
                { value: "toExpectedDate", label: "按现预收日期排序" },
                { value: "changedAt", label: "按变更日期排序" },
              ]}
              value={changeSortMode}
              onChange={(value) =>
                setChangeSortMode(
                  value as "changedAt" | "fromExpectedDate" | "toExpectedDate",
                )
              }
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "变动节点合计",
                value: changeSummary.changedNodeCount,
                suffix: "个",
                formatter: (value) =>
                  Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "变动金额合计",
                value: changeSummary.changedAmountTotal,
                formatter: (value) =>
                  `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "变动金额已收合计",
                value: changeSummary.collectedAmountTotal,
                formatter: (value) =>
                  `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "延后金额合计",
                value: changeSummary.delayedAmountTotal,
                formatter: (value) =>
                  `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
          </div>
          <Divider
            style={{
              margin: "0 -24px 16px",
              width: "calc(100% + 48px)",
              minWidth: "calc(100% + 48px)",
            }}
          />
          <ReceivableDelayChangesTable
            rows={filteredChangeRows}
            loading={loading}
            showOverdueHintInToDate
            showStatusBorderOnFirstCol
            onDetailClick={(row) => setDetailModalRow(row)}
          />
          <Modal
            open={Boolean(detailModalRow)}
            onCancel={() => setDetailModalRow(null)}
            footer={null}
            width={800}
            destroyOnHidden
            title={`${detailModalRow?.projectName || "-"} ${detailModalRow?.stageName || "-"} 变动详情`}
          >
            <ReceivableDelayChangesTable
              rows={detailModalRows}
              loading={loading}
              hideProjectDeliverableColumn
              hideStageColumn
              hideAmountColumn
              showDelayCount={false}
              showIndexColumn
              sortByCreatedAt="asc"
              showDetailLink={false}
            />
          </Modal>
        </>
      )}
      <ReceivableCollectionModal
        open={Boolean(collectingRow)}
        loading={collecting}
        expectedAmount={Number(collectingRow?.expectedAmount ?? 0)}
        actualAmount={Number(collectingRow?.actualAmount ?? 0)}
        expectedDate={collectingRow?.expectedDate ?? null}
        onCancel={() => setCollectingRow(null)}
        onSubmit={async (values: ProjectReceivableActualNodeFormValues) => {
          if (!collectingRow) return;
          setCollecting(true);
          try {
            const response = await fetch("/api/project-receivable-actual-nodes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                receivableNodeId: collectingRow.nodeId,
                actualAmountTaxIncluded: Math.round(
                  Number(values.actualAmountTaxIncluded ?? 0),
                ),
                actualDate: values.actualDate?.toISOString(),
                remark: values.remark?.trim() || null,
                remarkNeedsAttention: Boolean(values.remarkNeedsAttention),
              }),
            });
            if (!response.ok) {
              messageApi.error((await response.text()) || "新增实收失败");
              return;
            }
            messageApi.success("新增实收成功");
            setCollectingRow(null);
            await fetchReceivablePlans();
          } finally {
            setCollecting(false);
          }
        }}
      />
    </Card>
  );
}

export default function ProjectReceivableDelaysPage() {
  return (
    <Suspense fallback={<Card loading />}>
      <ProjectReceivableDelaysPageContent />
    </Suspense>
  );
}
