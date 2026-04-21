"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Card, Empty, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatisticCard } from "@ant-design/pro-components";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SelectOptionTag from "@/components/SelectOptionTag";
import { getSigningCompanyTagColor } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
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
  stageOption?: { id?: string; value?: string | null; color?: string | null } | null;
  keyDeliverable?: string | null;
  expectedAmountTaxIncluded?: number | null;
  expectedDate?: string | null;
  expectedDateHistories?: Array<{
    id: string;
    fromExpectedDate: string;
    toExpectedDate: string;
    changedAt: string;
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
  isDelayed: boolean;
};
type ForecastChangeRow = {
  key: string;
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
  fromExpectedDate: string;
  toExpectedDate: string;
  toExpectedDateTs: number;
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
  const [activeTab, setActiveTab] = useState<"forecast" | "changes">(
    "forecast",
  );
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [receivablePlans, setReceivablePlans] = useState<ReceivablePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [legalEntityFilterIds, setLegalEntityFilterIds] = useState<string[]>([]);
  const [projectFilterIds, setProjectFilterIds] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>();
  const [monthFilter, setMonthFilter] = useState<string>();
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const projectsById = useProjectsStore((state) => state.byId);
  const projectIds = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.ids,
  );
  const projectsLoaded = useProjectsStore(
    (state) => state.queryState[ALL_PROJECTS_QUERY_KEY]?.loaded ?? false,
  );
  const fetchProjectsFromStore = useProjectsStore((state) => state.fetchProjects);

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
  useEffect(() => {
    if (!authLoaded) return;
    (async () => {
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
    })();
  }, [authLoaded]);
  useEffect(() => {
    if (!authLoaded) return;
    (async () => {
      try {
        const response = await fetch("/api/legal-entities", { cache: "no-store" });
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
        return [{
          key: `${plan.id}-${node.id}`,
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
          isDelayed: expectedDateDayjs.isBefore(todayStart, "day"),
        }];
      });
    });
  }, [receivablePlans]);
  const yearSourceRows = useMemo(
    () =>
      forecastRows.filter((row) => {
        const matchesLegalEntity = legalEntityFilterIds.length > 0
          ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
          : true;
        const matchesProject = projectFilterIds.length > 0
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
        new Set(yearSourceRows.map((row) => dayjs(row.expectedDate).format("YYYY"))),
      )
        .filter((year) => Boolean(year))
        .sort((left, right) => Number(left) - Number(right))
        .map((year) => ({ value: year, label: `${year}年` })),
    [yearSourceRows],
  );
  useEffect(() => {
    if (!yearFilter) return;
    const exists = yearOptions.some((item) => item.value === yearFilter);
    if (exists) return;
    setYearFilter(undefined);
  }, [yearFilter, yearOptions]);
  const filteredForecastRows = useMemo(
    () =>
      forecastRows.filter((row) => {
        const matchesLegalEntity = legalEntityFilterIds.length > 0
          ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
          : true;
        const matchesProject = projectFilterIds.length > 0
          ? projectFilterIds.includes(row.projectId ?? "")
          : true;
        const yearValue = dayjs(row.expectedDate).format("YYYY");
        const monthValue = dayjs(row.expectedDate).format("MM");
        const matchesYear = yearFilter ? yearValue === yearFilter : true;
        const matchesMonth = monthFilter ? monthValue === monthFilter : true;
        return (
          matchesLegalEntity &&
          matchesProject &&
          matchesYear &&
          matchesMonth
        );
      }),
    [forecastRows, legalEntityFilterIds, projectFilterIds, yearFilter, monthFilter],
  );
  const changeRows = useMemo<ForecastChangeRow[]>(
    () =>
      receivablePlans.flatMap((plan) => {
        const accountName =
          plan.clientContract?.legalEntity?.name?.trim() ||
          plan.legalEntity?.name?.trim() ||
          "-";
        const legalEntityId =
          plan.clientContract?.legalEntity?.id || plan.legalEntity?.id || null;
        const projectName = plan.project?.name?.trim() || "未关联项目";
        const projectId = plan.project?.id ?? null;
        return (plan.nodes ?? []).flatMap((node) => {
          const histories = Array.isArray(node.expectedDateHistories)
            ? node.expectedDateHistories
            : [];
          if (histories.length === 0) return [];
          const expectedAmount = Number(node.expectedAmountTaxIncluded ?? 0);
          const actualAmount = (node.actualNodes ?? []).reduce(
            (sum, actual) => sum + Number(actual.actualAmountTaxIncluded ?? 0),
            0,
          );
          const isCompleted = actualAmount >= expectedAmount;
          if (isCompleted) return [];

          const rows: ForecastChangeRow[] = [];
          for (const history of histories) {
            const fromExpectedDate = dayjs(history.fromExpectedDate);
            const toExpectedDate = dayjs(history.toExpectedDate);
            if (!fromExpectedDate.isValid() || !toExpectedDate.isValid()) {
              continue;
            }
            rows.push({
              key: `${node.id}-${history.id}`,
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
              fromExpectedDate: fromExpectedDate.format("YYYY-MM-DD"),
              toExpectedDate: toExpectedDate.format("YYYY-MM-DD"),
              toExpectedDateTs: toExpectedDate.valueOf(),
            });
          }
          return rows;
        });
      }),
    [receivablePlans],
  );
  const filteredChangeRows = useMemo(
    () =>
      changeRows
        .filter((row) => {
          const matchesLegalEntity = legalEntityFilterIds.length > 0
            ? legalEntityFilterIds.includes(row.legalEntityId ?? "")
            : true;
          const matchesProject = projectFilterIds.length > 0
            ? projectFilterIds.includes(row.projectId ?? "")
            : true;
          const yearValue = dayjs(row.toExpectedDate).format("YYYY");
          const monthValue = dayjs(row.toExpectedDate).format("MM");
          const matchesYear = yearFilter ? yearValue === yearFilter : true;
          const matchesMonth = monthFilter ? monthValue === monthFilter : true;
          return (
            matchesLegalEntity &&
            matchesProject &&
            matchesYear &&
            matchesMonth
          );
        })
        .sort((left, right) => right.toExpectedDateTs - left.toExpectedDateTs),
    [changeRows, legalEntityFilterIds, monthFilter, projectFilterIds, yearFilter],
  );
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
        width: 120,
      },
      {
        title: "项目名称",
        dataIndex: "projectName",
        width: 260,
        render: (value, row) => (
          <Space size={8}>
            <span>{value || "-"}</span>
            {row.isDelayed ? <Tag color="gold">已延期</Tag> : null}
          </Space>
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
        render: (value) => formatAmountWithYen(Number(value ?? 0)),
      },
      {
        title: "收款账户",
        dataIndex: "accountName",
        width: 120,
        render: (value) => renderAccountTag(String(value ?? "-")),
      },
    ],
    [],
  );
  const changeColumns = useMemo<ColumnsType<ForecastChangeRow>>(
    () => [
      {
        title: "项目名称",
        dataIndex: "projectName",
        width: 280,
      },
      {
        title: "阶段",
        dataIndex: "stageName",
        width: 180,
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
        title: "原预收日期",
        dataIndex: "fromExpectedDate",
        width: 160,
      },
      {
        title: "现预收日期",
        dataIndex: "toExpectedDate",
        width: 160,
      },
      {
        title: "收款账户",
        dataIndex: "accountName",
        width: 160,
        render: (value) => renderAccountTag(String(value ?? "-")),
      },
    ],
    [],
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
                  setLegalEntityFilterIds(Array.isArray(value) ? value as string[] : [])
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
                  setProjectFilterIds(Array.isArray(value) ? value as string[] : [])
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
                formatter: (value) => `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "下个月预计进账",
                value: summary.nextMonthTotal,
                formatter: (value) => `¥${Number(value ?? 0).toLocaleString("zh-CN")}`,
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "待进账数量",
                value: summary.pendingCount,
                suffix: "笔",
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
            <StatisticCard
              style={{ background: "#F5F4EE" }}
              statistic={{
                title: "延期进账数量",
                value: summary.delayedCount,
                suffix: "笔",
                formatter: (value) => Number(value ?? 0).toLocaleString("zh-CN"),
              }}
            />
          </div>
          {groupedRows.length === 0 ? (
            <Empty description="暂无未完成预收节点" />
          ) : (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {groupedRows.map(([monthKey, rows]) => {
                const monthDate = dayjs(`${monthKey}-01`);
                const monthText = `${monthDate.year()}年${monthDate.month() + 1}月`;
                const monthTotal = rows.reduce(
                  (sum, row) => sum + row.expectedAmount,
                  0,
                );
                const currentMonthStart = dayjs().startOf("month");
                const isOverdueMonth = monthDate.isBefore(currentMonthStart, "month");
                const isCurrentMonth = monthDate.isSame(currentMonthStart, "month");
                return (
                  <div key={monthKey}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <Space size={8}>
                        <span style={{ fontSize: 14 }}>{monthText}</span>
                        {isCurrentMonth ? (
                          <Tag color="green">本月</Tag>
                        ) : isOverdueMonth ? (
                          <Tag color="blue">已过期</Tag>
                        ) : null}
                      </Space>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        合计 {formatAmountWithYen(monthTotal)}
                      </span>
                    </div>
                    <Table
                      rowKey="key"
                      loading={loading}
                      columns={columns}
                      dataSource={rows}
                      pagination={false}
                      scroll={{ x: "max-content" }}
                    />
                  </div>
                );
              })}
            </Space>
          )}
        </>
      ) : (
        <Table
          rowKey="key"
          loading={loading}
          size="small"
          columns={changeColumns}
          dataSource={filteredChangeRows}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "暂无变动数据" }}
        />
      )}
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
