"use client";

import { useMemo } from "react";
import { Button, Progress, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import AppLink from "@/components/AppLink";

export type ActualWorkAnalysisRow = {
  key: string;
  memberKey: string;
  name: string;
  hoursDisplay: string;
  daysDisplay: string;
  ratio: string;
  ratioValue: number;
  isTotal: boolean;
  employeeId?: string | null;
  isDeparted?: boolean;
};

type Props = {
  entries: {
    id: string;
    startDate: string;
    endDate: string;
    employee?: { id: string; name: string };
  }[];
  members: {
    id: string;
    name: string;
    employmentStatus?: string | null;
  }[];
  onViewDetail: (target: { memberKey: string; memberName: string }) => void;
};

const ActualWorkAnalysisTable = ({ entries, members, onViewDetail }: Props) => {
  const rows = useMemo<ActualWorkAnalysisRow[]>(() => {
    const round2 = (value: number) => Number(value.toFixed(2));
    const departedMatcher = (status?: string | null) =>
      (status ?? "").includes("离职") ||
      (status ?? "").toUpperCase().includes("LEFT");
    const memberById = new Map(members.map((member) => [member.id, member]));
    const memberByName = new Map(members.map((member) => [member.name, member]));
    const memberMap = new Map<
      string,
      { id: string; name: string; hours: number; isDeparted: boolean }
    >();

    for (const entry of entries) {
      const start = dayjs(entry.startDate);
      const end = dayjs(entry.endDate);
      const hours = round2(Math.max(end.diff(start, "minute") / 60, 0));
      const employeeId = entry.employee?.id ?? `unknown-${entry.id}`;
      const employeeName = entry.employee?.name ?? "未分配成员";
      const matchedMember =
        (entry.employee?.id ? memberById.get(entry.employee.id) : undefined) ??
        (entry.employee?.name ? memberByName.get(entry.employee.name) : undefined);
      const existing = memberMap.get(employeeId);
      if (existing) {
        existing.hours = round2(existing.hours + hours);
      } else {
        memberMap.set(employeeId, {
          id: employeeId,
          name: employeeName,
          hours,
          isDeparted: departedMatcher(matchedMember?.employmentStatus),
        });
      }
    }

    for (const member of members) {
      if (!memberMap.has(member.id)) {
        memberMap.set(member.id, {
          id: member.id,
          name: member.name,
          hours: 0,
          isDeparted: departedMatcher(member.employmentStatus),
        });
      }
    }

    const memberRows = Array.from(memberMap.values())
      .filter(
        (row) =>
          !(
            row.hours === 0 &&
            ["Johnny", "Icy", "张弛"].includes((row.name ?? "").trim())
          ),
      )
      .sort((left, right) => {
        if (right.hours !== left.hours) return right.hours - left.hours;
        return left.name.localeCompare(right.name, "zh-CN");
      });

    const totalHours = round2(
      memberRows.reduce((sum, row) => sum + row.hours, 0),
    );
    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
    const formatHours = (hours: number) =>
      hours.toFixed(2).replace(/\.?0+$/, "");
    const formatDays = (hours: number) =>
      (hours / 8).toFixed(2).replace(/\.?0+$/, "");

    return [
      {
        key: "total",
        memberKey: "total",
        name: "项目总工时",
        hours: totalHours,
        ratioValue: totalHours > 0 ? 100 : 0,
        ratio: totalHours > 0 ? "100.00%" : "0.00%",
        isTotal: true,
      },
      ...memberRows.map((row) => ({
        key: row.id,
        memberKey: row.id,
        employeeId: row.id.startsWith("unknown-") ? null : row.id,
        name: row.name,
        hours: row.hours,
        isDeparted: row.isDeparted,
        ratioValue: totalHours > 0 ? round2((row.hours / totalHours) * 100) : 0,
        ratio: totalHours > 0 ? formatPercent(row.hours / totalHours) : "0.00%",
        isTotal: false,
      })),
    ].map((row) => ({
      ...row,
      hoursDisplay: `${formatHours(row.hours)}h`,
      daysDisplay: `${formatDays(row.hours)}d`,
    }));
  }, [entries, members]);

  const columns: ColumnsType<ActualWorkAnalysisRow> = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      render: (value, row) => {
        const displayName = row.isDeparted ? `${value}（离职）` : value;
        if (row.isTotal) {
          return <strong>{displayName}</strong>;
        }
        if (row.employeeId) {
          return (
            <AppLink href={`/employees/${row.employeeId}`}>{displayName}</AppLink>
          );
        }
        return displayName;
      },
    },
    {
      title: "工时（小时）",
      dataIndex: "hoursDisplay",
      key: "hoursDisplay",
      render: (value, row) => (row.isTotal ? <strong>{value}</strong> : value),
    },
    {
      title: "工时（天）",
      dataIndex: "daysDisplay",
      key: "daysDisplay",
      render: (value, row) => (row.isTotal ? <strong>{value}</strong> : value),
    },
    {
      title: "占比",
      dataIndex: "ratio",
      key: "ratio",
      render: (value, row) => (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 180,
          }}
        >
          <Progress
            percent={Number(row.ratioValue.toFixed(2))}
            showInfo={false}
            size="small"
            strokeColor={row.isTotal ? "#1677ff" : undefined}
            style={{ width: 120, margin: 0 }}
          />
          {row.isTotal ? <strong>{value}</strong> : value}
        </div>
      ),
    },
    {
      title: "查看详情",
      key: "detail",
      render: (_, row) =>
        row.isTotal ? (
          "-"
        ) : (
          <Button
            type="link"
            onClick={() =>
              onViewDetail({
                memberKey: row.memberKey,
                memberName: row.name,
              })
            }
            style={{ paddingInline: 0 }}
          >
            查看详情
          </Button>
        ),
    },
  ];

  return <Table rowKey="key" pagination={false} columns={columns} dataSource={rows} />;
};

export default ActualWorkAnalysisTable;
