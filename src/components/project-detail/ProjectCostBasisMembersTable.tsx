"use client";

import { useEffect, useMemo } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Progress, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import type { Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";

type CostBasisMembers = NonNullable<Project["latestCostEstimation"]>["members"];

type Props = {
  members?: CostBasisMembers;
  projectMembers?: Project["members"];
  estimatedDuration?: number;
};

type CostBasisMemberRow = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  memberSalary?: number;
  memberSocialSecurity?: number;
  memberProvidentFund?: number;
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
const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const mapMembers = (members?: CostBasisMembers): CostBasisMemberRow[] =>
  (members ?? []).map((member) => ({
    id: member.id,
    employeeId: member.employee?.id ?? member.employeeId,
    employeeName: member.employee?.name,
    memberSalary: toNumber(member.employee?.salary),
    memberSocialSecurity: toNumber(member.employee?.socialSecurity),
    memberProvidentFund: toNumber(member.employee?.providentFund),
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

const ProjectCostBasisMembersTable = ({
  members,
  projectMembers,
  estimatedDuration,
}: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );
  const canViewLaborCost =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const monthlyWorkdayBase = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
      ),
    [systemSettings],
  );

  const memberRows = useMemo(() => mapMembers(members), [members]);
  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

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
  const projectMemberCostMap = useMemo(() => {
    const map = new Map<
      string,
      { salary: number; socialSecurity: number; providentFund: number }
    >();
    const mapByName = new Map<
      string,
      { salary: number; socialSecurity: number; providentFund: number }
    >();
    for (const member of projectMembers ?? []) {
      const cost = {
        salary: toNumber(member.salary),
        socialSecurity: toNumber(member.socialSecurity),
        providentFund: toNumber(member.providentFund),
      };
      if (member.id) {
        map.set(member.id, cost);
      }
      const nameKey = String(member.name ?? "").trim();
      if (nameKey) {
        mapByName.set(nameKey, cost);
      }
    }
    return { byId: map, byName: mapByName };
  }, [projectMembers]);

  const memberViewColumns = useMemo<ColumnsType<CostBasisMemberRow>>(
    () => [
      {
        title: "姓名",
        dataIndex: "employeeName",
        width: 140,
        onHeaderCell: () => ({ style: { paddingLeft: 24 } }),
        onCell: (row) => ({
          style: {
            paddingLeft: 24,
            fontWeight: row.isTotalRow ? 600 : undefined,
          },
        }),
        render: (_value: string | undefined, row) =>
          row.employeeId && row.employeeName ? (
            <AppLink href={`/employees/${row.employeeId}`}>
              {row.employeeName}
            </AppLink>
          ) : (
            (row.employeeName ?? "-")
          ),
      },
      {
        title: "职能",
        dataIndex: "functionOption",
        width: 140,
        render: (value, row) =>
          row.isTotalRow ? (
            ""
          ) : value?.value ? (
            <SelectOptionTag option={value} />
          ) : (
            "-"
          ),
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
                typeof value === "number" ? (
                  row.isTotalRow ? (
                    `${formatAmount(value)} 元`
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{`${formatAmount(value)} 元`}</span>
                      <Tooltip
                        title={(() => {
                          const memberCostById = row.employeeId
                            ? projectMemberCostMap.byId.get(row.employeeId)
                            : undefined;
                          const memberCostByName = row.employeeName
                            ? projectMemberCostMap.byName.get(
                                row.employeeName.trim(),
                              )
                            : undefined;
                          const memberCost = memberCostById ?? memberCostByName;
                          const salary =
                            memberCost?.salary ?? row.memberSalary ?? 0;
                          const socialSecurity =
                            memberCost?.socialSecurity ??
                            row.memberSocialSecurity ??
                            0;
                          const providentFund =
                            memberCost?.providentFund ??
                            row.memberProvidentFund ??
                            0;
                          const total = salary + socialSecurity + providentFund;
                          const allocationPercent = Number(
                            row.allocationPercent ?? 0,
                          );
                          const duration = Number(estimatedDuration ?? 0);
                          return (
                            <div style={{ lineHeight: 1.55, width: 500 }}>
                              <div>{`${row.employeeName ?? "成员"}人力成本：`}</div>
                              <div>{`- 薪资：${formatAmount(salary)}元`}</div>
                              <div>{`- 社保：${formatAmount(socialSecurity)}元`}</div>
                              <div>{`- 公积金：${formatAmount(providentFund)}元`}</div>
                              <div>{`合计：${formatAmount(total)}元`}</div>
                              <br />
                              <div>项目成本：</div>
                              <div>{`人力成本（${formatAmount(total)}元）`}</div>
                              <div>{`/ 月工作日基数（${formatAmount(monthlyWorkdayBase)}天）`}</div>
                              <div>{`* 项目预估时长（${formatAmount(duration)}个工作日）`}</div>
                              <div>{`* 成员占比（${formatAmount(allocationPercent)}%）`}</div>
                              <div>{`= ${formatAmount(value)} 元`}</div>
                            </div>
                          );
                        })()}
                      >
                        <InfoCircleOutlined
                          style={{ color: "rgba(0,0,0,0.45)" }}
                        />
                      </Tooltip>
                    </span>
                  )
                ) : row.isTotalRow ? (
                  ""
                ) : (
                  "-"
                ),
            },
          ]
        : []),
    ],
    [
      canViewLaborCost,
      estimatedDuration,
      monthlyWorkdayBase,
      projectMemberCostMap,
    ],
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
