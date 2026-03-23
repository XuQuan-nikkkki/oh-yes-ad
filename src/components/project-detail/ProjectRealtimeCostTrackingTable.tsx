"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Card, Spin, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  getSystemSettingNumberFromRecords,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";
import { calculateWorkdays } from "@/lib/workday";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import { useSystemSettingsStore } from "@/stores/systemSettingsStore";
import type { Project, WorkdayAdjustment } from "@/types/projectDetail";

type Props = {
  projectId: string;
  projectName: string;
  startDate?: string | null;
  latestBaselineCostEstimation?: Project["latestBaselineCostEstimation"];
  members?: Project["members"];
  actualWorkEntries?: Project["actualWorkEntries"];
  workdayAdjustments?: WorkdayAdjustment[];
  onDownloadReady?: ((downloadFn: (() => void) | null) => void) | undefined;
};

type ClientContract = {
  id: string;
  contractAmount?: number | null;
  taxAmount?: number | null;
};

type FinancialStructure = {
  id: string;
  agencyFeeRate?: number | null;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
};

type ReimbursementRow = {
  id: string;
  amount: number;
  categoryOption?: {
    id?: string;
    value?: string | null;
    color?: string | null;
  } | null;
};

type CostRow = {
  key: string;
  category: string;
  amount: string;
  ratio: string;
  remark: string;
  bold?: boolean;
};

const FUND_AMOUNT = 10000;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(
      value.trim().replaceAll(",", "").replaceAll("，", ""),
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(4)).toString();
};

const formatRatio = (value: number | null) =>
  value === null ? "-" : `${(value * 100).toFixed(2)}%`;

const getEntryHours = (start: string, end: string) =>
  Math.max((new Date(end).getTime() - new Date(start).getTime()) / 36e5, 0);

const getDateKey = (value: string) => value.slice(0, 10);

const calcEntryWorkdays = (hours: number, total: number) => {
  if (hours === 0) return 0;
  return total > 7.5 ? hours / total : hours / 7.5;
};

const getProjectLevel = (costRatio: number) => {
  if (costRatio < 0.55) return "A";
  if (costRatio < 0.6) return "B";
  return "C";
};

const getBonusRatio = (level: string) => {
  if (level === "A") return 0.15;
  if (level === "B") return 0.1;
  return 0.08;
};

const ProjectRealtimeCostTrackingTable = ({
  projectId,
  projectName,
  startDate,
  latestBaselineCostEstimation,
  members = [],
  actualWorkEntries = [],
  workdayAdjustments = [],
  onDownloadReady,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const downloadTableRef = useRef<(() => Promise<void>) | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientContract, setClientContract] = useState<ClientContract | null>(
    null,
  );
  const [financialStructure, setFinancialStructure] =
    useState<FinancialStructure | null>(null);
  const [reimbursementRows, setReimbursementRows] = useState<
    ReimbursementRow[]
  >([]);
  const systemSettings = useSystemSettingsStore((state) => state.records);
  const fetchSystemSettings = useSystemSettingsStore(
    (state) => state.fetchSystemSettings,
  );

  useEffect(() => {
    void fetchSystemSettings();
  }, [fetchSystemSettings]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [contractRes, structureRes, reimbursementRes] = await Promise.all(
          [
            fetch(`/api/client-contracts?projectId=${projectId}`, {
              cache: "no-store",
            }),
            fetch(`/api/project-financial-structures?projectId=${projectId}`, {
              cache: "no-store",
            }),
            fetch(`/api/projects/${projectId}/reimbursements`, {
              cache: "no-store",
            }),
          ],
        );

        const [contractRows, structureRows, reimbursements] = await Promise.all(
          [
            contractRes.ok
              ? ((await contractRes.json()) as ClientContract[])
              : [],
            structureRes.ok
              ? ((await structureRes.json()) as FinancialStructure[])
              : [],
            reimbursementRes.ok
              ? ((await reimbursementRes.json()) as ReimbursementRow[])
              : [],
          ],
        );

        if (cancelled) return;
        setClientContract(
          Array.isArray(contractRows) && contractRows[0]
            ? contractRows[0]
            : null,
        );
        setFinancialStructure(
          Array.isArray(structureRows) && structureRows[0]
            ? structureRows[0]
            : null,
        );
        setReimbursementRows(
          Array.isArray(reimbursements) ? reimbursements : [],
        );
      } catch {
        if (cancelled) return;
        setClientContract(null);
        setFinancialStructure(null);
        setReimbursementRows([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const elapsedWorkdays = useMemo(() => {
    if (!startDate) return 0;
    return calculateWorkdays(
      new Date(startDate),
      new Date(),
      workdayAdjustments,
    );
  }, [startDate, workdayAdjustments]);

  const monthlyWorkdayBase = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeMonthlyWorkdayBase,
      ),
    [systemSettings],
  );
  const defaultMonthlyRentCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultWorkstationCost,
      ) +
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.employeeDefaultUtilityCost,
      ),
    [systemSettings],
  );
  const middleOfficeDailyCost = useMemo(
    () =>
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeAverageMonthlyCost,
      ) /
      getSystemSettingNumberFromRecords(
        systemSettings,
        SYSTEM_SETTING_KEYS.pricingMiddleOfficeBaseDays,
      ),
    [systemSettings],
  );

  const expectedWorkdays = latestBaselineCostEstimation?.estimatedDuration ?? 0;

  const actualLaborCost = useMemo(() => {
    const groupedHours = new Map<string, number>();
    actualWorkEntries.forEach((entry) => {
      const employeeId = entry.employee?.id ?? "";
      if (!employeeId) return;
      const key = `${employeeId}__${getDateKey(entry.startDate)}`;
      groupedHours.set(
        key,
        (groupedHours.get(key) ?? 0) +
          getEntryHours(entry.startDate, entry.endDate),
      );
    });

    return actualWorkEntries.reduce((sum, entry) => {
      const employee = entry.employee;
      if (!employee?.id) return sum;
      const monthlyHumanCost =
        toNumber(employee.salary) +
        toNumber(employee.socialSecurity) +
        toNumber(employee.providentFund);
      const hours = getEntryHours(entry.startDate, entry.endDate);
      const total =
        groupedHours.get(`${employee.id}__${getDateKey(entry.startDate)}`) ??
        hours;
      const entryWorkdays = calcEntryWorkdays(hours, total);
      return sum + (monthlyHumanCost / monthlyWorkdayBase) * entryWorkdays;
    }, 0);
  }, [actualWorkEntries, monthlyWorkdayBase]);

  const rentCost = useMemo(
    () =>
      members.reduce(
        (sum) =>
          sum + (defaultMonthlyRentCost / monthlyWorkdayBase) * elapsedWorkdays,
        0,
      ),
    [defaultMonthlyRentCost, elapsedWorkdays, members, monthlyWorkdayBase],
  );

  const income = toNumber(clientContract?.contractAmount);
  const tax = toNumber(clientContract?.taxAmount);
  const netIncome = income - tax;
  const agencyFee =
    income > 0
      ? (income * toNumber(financialStructure?.agencyFeeRate)) / 100
      : 0;
  const outsourceRemark = useMemo(
    () =>
      (financialStructure?.outsourceItems ?? [])
        .filter((item) => item.type && Number.isFinite(toNumber(item.amount)))
        .map(
          (item) => `${item.type}：${formatAmount(toNumber(item.amount))}元`,
        )
        .join("\n"),
    [financialStructure?.outsourceItems],
  );
  const outsourceCost = getProjectOutsourceTotal(
    financialStructure?.outsourceItems,
  );
  const executionRemark = useMemo(
    () =>
      reimbursementRows
        .map((item) => {
          const category = item.categoryOption?.value?.trim() || "未分类";
          return `${category}：${formatAmount(toNumber(item.amount))}元`;
        })
        .join("\n"),
    [reimbursementRows],
  );
  const executionCost = useMemo(
    () =>
      reimbursementRows.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [reimbursementRows],
  );
  const middleOfficeCost = middleOfficeDailyCost * elapsedWorkdays;
  const totalCost =
    agencyFee +
    outsourceCost +
    actualLaborCost +
    rentCost +
    executionCost +
    middleOfficeCost;
  const projectProfit = income - totalCost;
  const totalCostRatio = income > 0 ? totalCost / income : null;
  const projectLevel = getProjectLevel(totalCostRatio ?? 1);
  const bonusRatio = getBonusRatio(projectLevel);
  const projectBonus = projectProfit * bonusRatio;
  const finalProfit = projectProfit - projectBonus - FUND_AMOUNT;

  const rows = useMemo<CostRow[]>(
    () => [
      {
        key: "income",
        category: "收入",
        amount: formatAmount(income),
        ratio: "",
        remark: "-",
      },
      {
        key: "tax",
        category: "税费",
        amount: formatAmount(tax),
        ratio: "",
        remark: "-",
      },
      {
        key: "netIncome",
        category: "净收入",
        amount: formatAmount(netIncome),
        ratio: "",
        remark: "-",
      },
      {
        key: "agencyFee",
        category: "中介费",
        amount: formatAmount(agencyFee),
        ratio: formatRatio(income > 0 ? agencyFee / income : null),
        remark:
          financialStructure?.agencyFeeRate != null
            ? `费率：${financialStructure.agencyFeeRate}%`
            : "-",
      },
      {
        key: "outsourceCost",
        category: "外包成本",
        amount: formatAmount(outsourceCost),
        ratio: "",
        remark: outsourceRemark || "-",
      },
      {
        key: "laborCost",
        category: "人力成本",
        amount: formatAmount(actualLaborCost),
        ratio: formatRatio(income > 0 ? actualLaborCost / income : null),
        remark: "-",
      },
      {
        key: "rentCost",
        category: "租金成本",
        amount: formatAmount(rentCost),
        ratio: formatRatio(income > 0 ? rentCost / income : null),
        remark: "-",
      },
      {
        key: "executionCost",
        category: "执行费用成本",
        amount: formatAmount(executionCost),
        ratio: formatRatio(income > 0 ? executionCost / income : null),
        remark: executionRemark || "-",
      },
      {
        key: "middleOfficeCost",
        category: "中台成本",
        amount: formatAmount(middleOfficeCost),
        ratio: formatRatio(income > 0 ? middleOfficeCost / income : null),
        remark: "-",
      },
      {
        key: "totalCost",
        category: "总费用成本",
        amount: formatAmount(totalCost),
        ratio: formatRatio(totalCostRatio),
        remark: "-",
        bold: true,
      },
      {
        key: "projectProfit",
        category: "项目利润",
        amount: formatAmount(projectProfit),
        ratio: formatRatio(income > 0 ? projectProfit / income : null),
        remark: "-",
      },
      {
        key: "projectLevel",
        category: "项目级别",
        amount: projectLevel,
        ratio: "",
        remark: "-",
      },
      {
        key: "bonusRatio",
        category: "奖金比例",
        amount: formatRatio(bonusRatio),
        ratio: "",
        remark: "-",
      },
      {
        key: "projectBonus",
        category: "项目奖金",
        amount: formatAmount(projectBonus),
        ratio: formatRatio(income > 0 ? projectBonus / income : null),
        remark: "-",
      },
      {
        key: "fund",
        category: "基金",
        amount: formatAmount(FUND_AMOUNT),
        ratio: formatRatio(income > 0 ? FUND_AMOUNT / income : null),
        remark: "-",
      },
      {
        key: "finalProfit",
        category: "利润",
        amount: formatAmount(finalProfit),
        ratio: formatRatio(income > 0 ? finalProfit / income : null),
        remark: "-",
      },
    ],
    [
      actualLaborCost,
      agencyFee,
      bonusRatio,
      executionCost,
      executionRemark,
      finalProfit,
      financialStructure?.agencyFeeRate,
      income,
      middleOfficeCost,
      netIncome,
      outsourceRemark,
      outsourceCost,
      projectBonus,
      projectLevel,
      projectProfit,
      rentCost,
      tax,
      totalCost,
      totalCostRatio,
    ],
  );

  const columns = useMemo<ColumnsType<CostRow>>(
    () => [
      {
        title: "类别",
        dataIndex: "category",
        key: "category",
        width: 120,
        render: (value, row) => (row.bold ? <strong>{value}</strong> : value),
      },
      {
        title: "金额",
        dataIndex: "amount",
        key: "amount",
        width: 100,
        render: (value, row) => (row.bold ? <strong>{value}</strong> : value),
      },
      {
        title: "占比",
        dataIndex: "ratio",
        key: "ratio",
        width: 140,
        render: (value, row) => (row.bold ? <strong>{value}</strong> : value),
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 220,
        render: (value, row) =>
          row.bold ? (
            <strong style={{ whiteSpace: "pre-line" }}>{value}</strong>
          ) : (
            <span style={{ whiteSpace: "pre-line" }}>{value}</span>
          ),
      },
    ],
    [],
  );

  const actualDurationNode =
    expectedWorkdays > 0 && elapsedWorkdays > expectedWorkdays ? (
      <span style={{ color: "#ff4d4f", fontWeight: 700 }}>
        {elapsedWorkdays}
      </span>
    ) : (
      <span>{elapsedWorkdays}</span>
    );

  const tableTitleText = `${projectName || "未命名项目"} - 预计：${
    expectedWorkdays || 0
  } / 实际：${elapsedWorkdays}个工作日`;

  const downloadTable = useCallback(async () => {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("项目成本追踪");

      worksheet.addRow([tableTitleText, "", "", ""]);
      worksheet.mergeCells("A1:D1");
      worksheet.addRow(["类别", "金额", "占比", "备注"]);
      rows.forEach((row) => {
        worksheet.addRow([row.category, row.amount, row.ratio, row.remark]);
      });

      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(2).font = { bold: true };
      worksheet.getRow(2).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: rowNumber <= 2 ? "center" : "left",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD9D9D9" } },
            left: { style: "thin", color: { argb: "FFD9D9D9" } },
            bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
            right: { style: "thin", color: { argb: "FFD9D9D9" } },
          };
          if (rowNumber > 2) {
            const matchedRow = rows[rowNumber - 3];
            if (matchedRow?.bold) {
              cell.font = { bold: true };
            }
          }
        });
      });

      worksheet.columns = [
        { width: 18 },
        { width: 16 },
        { width: 12 },
        { width: 30 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      link.href = url;
      link.download = `${projectName || "项目"}-项目成本追踪-${yyyy}${mm}${dd}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (typeof app?.message?.success === "function") {
        app.message.success("表格已下载");
      } else {
        void messageApi.success("表格已下载");
      }
    } catch (error) {
      console.error(error);
      if (typeof app?.message?.error === "function") {
        app.message.error("下载失败，请稍后重试");
      } else {
        void messageApi.error("下载失败，请稍后重试");
      }
    }
  }, [app, messageApi, projectName, rows, tableTitleText]);

  useEffect(() => {
    downloadTableRef.current = downloadTable;
  }, [downloadTable]);

  useEffect(() => {
    if (!onDownloadReady) return;
    onDownloadReady(() => {
      void downloadTableRef.current?.();
    });
    return () => {
      onDownloadReady(null);
    };
  }, [onDownloadReady]);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      {contextHolder}
      <Table<CostRow>
        rowKey="key"
        pagination={false}
        columns={columns}
        dataSource={rows}
        bordered
        title={() => (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                whiteSpace: "nowrap",
                fontWeight: 700,
                flex: 1,
              }}
            >
              <span>{projectName || "未命名项目"}</span>
              <span style={{ margin: "0 8px" }}>-</span>
              <span>预计:{expectedWorkdays || 0}</span>
              <span style={{ margin: "0 4px" }}>/</span>
              实际:{actualDurationNode}
              {` `}个工作日
            </div>
          </div>
        )}
        styles={{
          root: {
            display: "flex",
            justifyContent: "center",
          },
        }}
        size="small"
      />
    </>
  );
};

export default ProjectRealtimeCostTrackingTable;
