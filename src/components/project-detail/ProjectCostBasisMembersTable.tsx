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

  const memberViewColumns = useMemo<ColumnsType<CostBasisMemberRow>>(
    () => [
      {
        title: "姓名",
        dataIndex: "employeeName",
        width: 140,
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
        render: (value) =>
          value?.value ? <SelectOptionTag option={value} /> : "-",
      },
      {
        title: "占比",
        dataIndex: "allocationPercent",
        width: 220,
        render: (value: number | undefined) => {
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
              render: (value: number | undefined) =>
                typeof value === "number" ? `${formatAmount(value)} 元` : "-",
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
      dataSource={memberRows}
      pagination={false}
      locale={{ emptyText: "暂无成员配置" }}
      size="small"
      style={{ width: "100%", marginBottom: 8 }}
      tableLayout="fixed"
      summary={
        canViewLaborCost
          ? () => (
              <Table.Summary.Row style={{ fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  人力成本总计
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  {`${formatAmount(totalLaborCost)} 元`}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          : undefined
      }
    />
  );
};

export default ProjectCostBasisMembersTable;
