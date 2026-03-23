"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Empty, Segmented, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import ListPageContainer from "@/components/ListPageContainer";
import AppLink from "@/components/AppLink";
import PageAccessResult from "@/components/PageAccessResult";
import RemarkText from "@/components/RemarkText";
import SelectOptionTag from "@/components/SelectOptionTag";
import BooleanTag from "@/components/BooleanTag";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Mode = "receivable" | "payable";

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
  hasVendorPayment: boolean;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: ActualNode[];
};

type ReceivablePlan = {
  id: string;
  project?: { id: string; name: string } | null;
  ownerEmployee?: { id: string; name: string } | null;
  contractAmount: number;
  nodes?: ReceivableNode[];
};

type ReceivableNodeTableRow = ReceivableNode & {
  planId: string;
  project?: { id: string; name: string } | null;
  contractAmount: number;
};

type PayableNode = {
  id: string;
  stageOptionId: string;
  stageOption?: StageOption | null;
  paymentCondition: string;
  expectedAmountTaxIncluded: number;
  expectedDate: string;
  hasCustomerCollection: boolean;
  remark?: string | null;
  remarkNeedsAttention: boolean;
  actualNodes?: ActualNode[];
};

type PayablePlan = {
  id: string;
  project?: { id: string; name: string } | null;
  ownerEmployee?: { id: string; name: string } | null;
  contractAmount: number;
  nodes?: PayableNode[];
};

const formatAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) return "-";
  return `${numberValue.toLocaleString("zh-CN")} 元`;
};

const formatDate = (value?: string | null) =>
  value ? String(value).slice(0, 10) : "-";

export default function ProjectReceivablePayablePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoaded = useAuthStore((state) => state.loaded);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const isAdmin = roleCodes.includes("ADMIN");
  const [mode, setMode] = useState<Mode>("receivable");
  const [loading, setLoading] = useState(false);
  const [receivablePlans, setReceivablePlans] = useState<ReceivablePlan[]>([]);
  const [payablePlans, setPayablePlans] = useState<PayablePlan[]>([]);

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
        Array.isArray(receivableData) ? (receivableData as ReceivablePlan[]) : [],
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

  const dataSource = mode === "receivable" ? receivablePlans : payablePlans;

  const receivableNodeRows = useMemo<ReceivableNodeTableRow[]>(
    () =>
      receivablePlans.flatMap((plan) =>
        (plan.nodes ?? []).map((node) => ({
          ...node,
          planId: plan.id,
          project: plan.project ?? null,
          contractAmount: plan.contractAmount,
        })),
      ),
    [receivablePlans],
  );

  const planColumns = useMemo<ColumnsType<ReceivablePlan | PayablePlan>>(
    () => [
      {
        title: "所属项目",
        dataIndex: "project",
        width: 260,
        render: (project: { id: string; name: string } | null | undefined) =>
          project?.id ? (
            <AppLink href={`/projects/${project.id}`}>{project.name || "-"}</AppLink>
          ) : (
            "-"
          ),
      },
      {
        title: "跟进人",
        dataIndex: "ownerEmployee",
        width: 180,
        render: (
          ownerEmployee: { id: string; name: string } | null | undefined,
        ) =>
          ownerEmployee?.id ? (
            <AppLink href={`/employees/${ownerEmployee.id}`}>
              {ownerEmployee.name || "-"}
            </AppLink>
          ) : (
            "-"
          ),
      },
      {
        title: "合同金额(含税)",
        dataIndex: "contractAmount",
        width: 180,
        render: (value) => formatAmount(value),
      },
      {
        title: "节点数",
        key: "nodeCount",
        width: 120,
        render: (_value, row) => (Array.isArray(row.nodes) ? row.nodes.length : 0),
      },
    ],
    [],
  );

  const actualColumns = useMemo<ColumnsType<ActualNode>>(
    () => [
      {
        title: "金额(含税)",
        dataIndex: "actualAmountTaxIncluded",
        width: 180,
        render: (value) => formatAmount(value),
      },
      {
        title: "日期",
        dataIndex: "actualDate",
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: "备注",
        dataIndex: "remark",
        render: (_value, row) => (
          <RemarkText
            remark={row.remark}
            remarkNeedsAttention={Boolean(row.remarkNeedsAttention)}
          />
        ),
      },
    ],
    [],
  );

  const receivableNodeColumns = useMemo<ColumnsType<ReceivableNode>>(
    () => [
      {
        title: "所属项目",
        key: "project",
        width: 240,
        render: (_value, row) => {
          const project = (row as ReceivableNodeTableRow).project;
          return project?.id ? (
            <AppLink href={`/projects/${project.id}`}>{project.name || "-"}</AppLink>
          ) : (
            "-"
          );
        },
      },
      {
        title: "合同金额(含税)",
        key: "contractAmount",
        width: 180,
        render: (_value, row) =>
          formatAmount((row as ReceivableNodeTableRow).contractAmount),
      },
      {
        title: "收款阶段",
        dataIndex: "stageOption",
        width: 160,
        render: (_value, row) => (
          <SelectOptionTag
            option={
              row.stageOption
                ? {
                    id: row.stageOption.id,
                    value: row.stageOption.value,
                    color: row.stageOption.color ?? undefined,
                  }
                : null
            }
          />
        ),
      },
      {
        title: "关键交付物",
        dataIndex: "keyDeliverable",
        width: 240,
      },
      {
        title: "收款进度",
        dataIndex: "expectedAmountTaxIncluded",
        width: 180,
        render: (value, row) => {
          const actualAmount = (row.actualNodes ?? []).reduce(
            (sum, item) => sum + (item.actualAmountTaxIncluded ?? 0),
            0,
          );
          return `${formatAmount(actualAmount)} / ${formatAmount(value)}`;
        },
      },
      {
        title: "预收日期",
        dataIndex: "expectedDate",
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: "有供应商付款",
        dataIndex: "hasVendorPayment",
        width: 140,
        render: (value) => <BooleanTag value={Boolean(value)} />,
      },
      {
        title: "备注",
        dataIndex: "remark",
        render: (_value, row) => (
          <RemarkText
            remark={row.remark}
            remarkNeedsAttention={row.remarkNeedsAttention}
          />
        ),
      },
    ],
    [],
  );

  const payableNodeColumns = useMemo<ColumnsType<PayableNode>>(
    () => [
      {
        title: "付款阶段",
        dataIndex: "stageOption",
        width: 160,
        render: (_value, row) => (
          <SelectOptionTag
            option={
              row.stageOption
                ? {
                    id: row.stageOption.id,
                    value: row.stageOption.value,
                    color: row.stageOption.color ?? undefined,
                  }
                : null
            }
          />
        ),
      },
      {
        title: "付款条件",
        dataIndex: "paymentCondition",
        width: 240,
      },
      {
        title: "预付金额(含税)",
        dataIndex: "expectedAmountTaxIncluded",
        width: 180,
        render: (value) => formatAmount(value),
      },
      {
        title: "预付日期",
        dataIndex: "expectedDate",
        width: 140,
        render: (value) => formatDate(value),
      },
      {
        title: "有客户收款",
        dataIndex: "hasCustomerCollection",
        width: 120,
        render: (value) => <BooleanTag value={Boolean(value)} />,
      },
      {
        title: "备注",
        dataIndex: "remark",
        render: (_value, row) => (
          <RemarkText
            remark={row.remark}
            remarkNeedsAttention={row.remarkNeedsAttention}
          />
        ),
      },
    ],
    [],
  );

  const showDevelopmentPlaceholder = authLoaded && !isAdmin;

  return (
    <ListPageContainer>
      <Card
        title={
          <Segmented
            value={mode}
            options={[
              { label: "收款", value: "receivable" },
              { label: "付款", value: "payable" },
            ]}
            onChange={(value) => setMode(value as Mode)}
          />
        }
      >
        {showDevelopmentPlaceholder ? (
          <PageAccessResult type="developing" />
        ) : mode === "receivable" && receivableNodeRows.length === 0 ? (
          <Empty description="暂无数据" />
        ) : mode === "payable" && dataSource.length === 0 ? (
          <Empty description="暂无数据" />
        ) : mode === "receivable" ? (
          <Table
            rowKey="id"
            loading={loading}
            columns={receivableNodeColumns as ColumnsType<ReceivableNodeTableRow>}
            dataSource={receivableNodeRows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: "max-content" }}
            expandable={{
              rowExpandable: (row) => (row.actualNodes?.length ?? 0) > 0,
              expandedRowRender: (row) => (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={actualColumns}
                  dataSource={(row.actualNodes ?? []) as ActualNode[]}
                  scroll={{ x: "max-content" }}
                />
              ),
            }}
          />
        ) : (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              嵌套结构：计划 - 节点 - 实收/实付节点
            </Typography.Paragraph>
            <Table
              rowKey="id"
              loading={loading}
              columns={planColumns}
              dataSource={dataSource}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: "max-content" }}
              expandable={{
                expandedRowRender: (plan) => {
                  const nodes = Array.isArray(plan.nodes) ? plan.nodes : [];
                  return (
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={
                        payableNodeColumns as ColumnsType<ReceivableNode | PayableNode>
                      }
                      dataSource={nodes as Array<ReceivableNode | PayableNode>}
                      scroll={{ x: "max-content" }}
                      expandable={{
                        rowExpandable: (node) =>
                          ((node as ReceivableNode | PayableNode).actualNodes?.length ?? 0) > 0,
                        expandedRowRender: (node) => (
                          <Table
                            rowKey="id"
                            size="small"
                            pagination={false}
                            columns={actualColumns}
                            dataSource={
                              ((node as ReceivableNode | PayableNode).actualNodes ??
                                []) as ActualNode[]
                            }
                            scroll={{ x: "max-content" }}
                          />
                        ),
                      }}
                    />
                  );
                },
              }}
            />
          </>
        )}
      </Card>
    </ListPageContainer>
  );
}
