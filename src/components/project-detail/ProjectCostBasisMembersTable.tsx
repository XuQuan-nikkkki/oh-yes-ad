"use client";

import { useMemo } from "react";
import { Progress, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import type { Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type CostBasisMembers = NonNullable<Project["latestCostEstimation"]>["members"];

type Props = {
  members?: CostBasisMembers;
};

type CostBasisMemberRow = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  functionOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
  allocationPercent?: number;
  laborCostSnapshot?: number;
  isTotalRow?: boolean;
};

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const mapMembers = (members?: CostBasisMembers): CostBasisMemberRow[] =>
  (members ?? []).map((member) => ({
    id: member.id,
    employeeId: member.employee?.id ?? member.employeeId,
    employeeName: member.employee?.name,
    functionOption:
      member.employee?.functionOption ??
      (member.employee?.function
        ? {
            id: "",
            value: member.employee.function,
            color: null,
          }
        : null),
    allocationPercent: member.allocationPercent,
    laborCostSnapshot: member.laborCostSnapshot,
  }));

const ProjectCostBasisMembersTable = ({ members }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canViewLaborCost =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");

  const memberRows = useMemo(() => mapMembers(members), [members]);

  const totalLaborCost = useMemo(
    () =>
      memberRows.reduce(
        (sum, row) =>
          sum +
          (typeof row.laborCostSnapshot === "number"
            ? row.laborCostSnapshot
            : 0),
        0,
      ),
    [memberRows],
  );

  const tableRows = useMemo<CostBasisMemberRow[]>(
    () =>
      canViewLaborCost && memberRows.length > 0
        ? [
            ...memberRows,
            {
              id: "labor-cost-total-row",
              employeeName: "人力成本总计",
              laborCostSnapshot: totalLaborCost,
              isTotalRow: true,
            },
          ]
        : memberRows,
    [canViewLaborCost, memberRows, totalLaborCost],
  );

  const memberViewColumns = useMemo<ColumnsType<CostBasisMemberRow>>(
    () => [
      {
        title: "姓名",
        dataIndex: "employeeName",
        width: 140,
        onHeaderCell: () => ({ style: { paddingLeft: 24 } }),
        onCell: (row) => ({
          style: { paddingLeft: 24, fontWeight: row.isTotalRow ? 600 : undefined },
        }),
        render: (_value: string | undefined, row) =>
          row.employeeId && row.employeeName ? (
            <AppLink href={`/employees/${row.employeeId}`}>
              {row.employeeName}
            </AppLink>
          ) : (
            row.employeeName ?? "-"
          ),
      },
      {
        title: "职能",
        dataIndex: "functionOption",
        width: 140,
        render: (value, row) =>
          row.isTotalRow ? "" :
          value?.value ? <SelectOptionTag option={value} /> : "-",
      },
      {
        title: "占比",
        dataIndex: "allocationPercent",
        width: 220,
        render: (value: number | undefined, row) => {
          if (row.isTotalRow) return "";
          if (typeof value !== "number") return "-";
          const percent = Math.min(Math.max(value, 0), 100);
          return (
            <Progress
              percent={percent}
              size="small"
              status="active"
              format={(p) => `${formatAmount(p)}%`}
              style={{ paddingRight: 16 }}
            />
          );
        },
      },
      ...(canViewLaborCost
        ? [
            {
              title: "人力成本",
              dataIndex: "laborCostSnapshot",
              width: 180,
              align: "right" as const,
              onHeaderCell: () => ({ style: { paddingRight: 24 } }),
              onCell: (row: CostBasisMemberRow) => ({
                style: {
                  paddingRight: 24,
                  fontWeight: row.isTotalRow ? 600 : undefined,
                },
              }),
              render: (value: number | undefined, row: CostBasisMemberRow) =>
                typeof value === "number"
                  ? `${formatAmount(value)} 元`
                  : row.isTotalRow
                    ? ""
                    : "-",
            },
          ]
        : []),
    ],
    [canViewLaborCost],
  );

  return (
    <Table
      rowKey="id"
      columns={memberViewColumns}
      dataSource={tableRows}
      pagination={false}
      locale={{ emptyText: "暂无成员配置" }}
      size="small"
      style={{ width: "100%", marginBottom: 8 }}
      tableLayout="fixed"
    />
  );
};

export default ProjectCostBasisMembersTable;
