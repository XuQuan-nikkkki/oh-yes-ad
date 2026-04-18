"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Space, Spin, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Project } from "@/types/projectDetail";
import ProjectFinancialStructureModal from "@/components/project-detail/ProjectFinancialStructureModal";
import { getProjectOutsourceTotal } from "@/lib/project-outsource";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Props = {
  projectId: string;
  projectName: string;
  canManageProject: boolean;
  latestBaselineCostEstimation?: Project["latestBaselineCostEstimation"];
  mode?: "full" | "actions" | "content";
  refreshKey?: number;
  onSaved?: () => void | Promise<void>;
};

type ProjectFinancialStructure = {
  id: string;
  projectId: string;
  estimationId: string;
  laborCost: number;
  rentCost: number;
  middleOfficeCost: number;
  executionCost: number;
  agencyFeeRate: number;
  totalCost: number;
  outsourceItems?: Array<{
    id: string;
    type: string;
    amount: number;
  }>;
  outsourceRemark?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
  estimation?: {
    id: string;
    projectId: string;
    version: number;
    type: "planning" | "baseline";
  } | null;
  executionCostItems?: Array<{
    id: string;
    costTypeOptionId: string;
    budgetAmount: number;
    remark?: string | null;
    costTypeOption?: {
      id?: string;
      value?: string | null;
    } | null;
  }>;
};

type FinancialStructureTableRow = {
  key: string;
  name: string;
  amount: string;
  remark: React.ReactNode;
};

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatAmountWithUnit = (value?: number | null) => {
  const amount = formatAmount(value);
  return amount === "-" ? "-" : `${amount} 元`;
};

const formatAmountPlain = (value?: number | null) => formatAmount(value);

const toMoney = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").replaceAll("，", "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const ProjectFinancialStructureCard = ({
  projectId,
  projectName,
  canManageProject,
  latestBaselineCostEstimation,
  mode = "full",
  refreshKey = 0,
  onSaved,
}: Props) => {
  const app = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [financialStructure, setFinancialStructure] =
    useState<ProjectFinancialStructure | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageFinancialStructureActions =
    roleCodes.includes("ADMIN") || roleCodes.includes("FINANCE");

  const fetchFinancialStructure = useCallback(async () => {
    if (!projectId) {
      setFinancialStructure(null);
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({ projectId });
      if (latestBaselineCostEstimation?.id) {
        query.set("estimationId", latestBaselineCostEstimation.id);
      }

      const res = await fetch(`/api/project-financial-structures?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setFinancialStructure(null);
        return;
      }
      const rows = (await res.json()) as ProjectFinancialStructure[];
      setFinancialStructure(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
    } catch {
      setFinancialStructure(null);
    } finally {
      setLoading(false);
    }
  }, [latestBaselineCostEstimation?.id, projectId]);

  useEffect(() => {
    void fetchFinancialStructure();
  }, [fetchFinancialStructure, refreshKey]);

  const tableRows = useMemo<FinancialStructureTableRow[]>(() => {
    if (!financialStructure) return [];

    const projectAmount =
      (typeof latestBaselineCostEstimation?.contractAmountSnapshot === "number"
        ? latestBaselineCostEstimation.contractAmountSnapshot
        : null) ?? toMoney(latestBaselineCostEstimation?.clientBudget);
    const outsourceCost = getProjectOutsourceTotal(financialStructure.outsourceItems);
    const agencyFeeAmount =
      typeof projectAmount === "number"
        ? (projectAmount * (financialStructure.agencyFeeRate ?? 0)) / 100
        : null;
    const recomputedTotalCost =
      (agencyFeeAmount ?? 0) +
      outsourceCost +
      financialStructure.laborCost +
      financialStructure.rentCost +
      financialStructure.middleOfficeCost +
      financialStructure.executionCost;
    const benchmarkRemark =
      typeof projectAmount === "number"
        ? `成本基准参考：${formatAmount(projectAmount * 0.53)}`
        : "成本基准参考：-";
    const totalCostRatioRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `${Math.round((recomputedTotalCost / projectAmount) * 100)}%`
        : "-";
    const laborCostRateRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `人力成本率 ${Math.round((financialStructure.laborCost / projectAmount) * 100)}%`
        : "-";

    const executionCostDetailNode =
      (financialStructure.executionCostItems?.length ?? 0) > 0 ? (
        <div style={{ lineHeight: 1.6 }}>
          {(financialStructure.executionCostItems ?? []).map((item) => (
            <div key={item.id}>
              {(item.costTypeOption?.value ?? "未命名费用类型") +
                `：${formatAmountWithUnit(item.budgetAmount)}`}
            </div>
          ))}
        </div>
      ) : (
        "-"
      );

    const outsourceDetailNode =
      (financialStructure.outsourceItems?.length ?? 0) > 0 ? (
        <div style={{ lineHeight: 1.6 }}>
          {(financialStructure.outsourceItems ?? []).map((item) => (
            <div key={item.id}>
              {item.type}：{formatAmountWithUnit(item.amount)}
            </div>
          ))}
          {financialStructure.outsourceRemark?.trim() ? (
            <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
              {financialStructure.outsourceRemark.trim()}
            </div>
          ) : null}
        </div>
      ) : (
        (financialStructure.outsourceRemark?.trim() ? (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {financialStructure.outsourceRemark.trim()}
          </div>
        ) : (
          "-"
        ))
      );

    const rows: FinancialStructureTableRow[] = [
      {
        key: "income",
        name: "收入",
        amount: formatAmount(projectAmount),
        remark: benchmarkRemark,
      },
      {
        key: "agencyFee",
        name: "中介费",
        amount: formatAmount(agencyFeeAmount),
        remark:
          typeof financialStructure.agencyFeeRate === "number"
            ? `费率：${formatAmount(financialStructure.agencyFeeRate)}%`
            : "-",
      },
      {
        key: "outsourceCost",
        name: "外包成本",
        amount: formatAmount(outsourceCost),
        remark: outsourceDetailNode,
      },
      {
        key: "laborCost",
        name: "人力成本",
        amount: formatAmount(financialStructure.laborCost),
        remark: laborCostRateRemark,
      },
      {
        key: "rentCost",
        name: "租金成本",
        amount: formatAmount(financialStructure.rentCost),
        remark: "-",
      },
      {
        key: "middleOfficeCost",
        name: "中台成本",
        amount: formatAmount(financialStructure.middleOfficeCost),
        remark: "-",
      },
      {
        key: "executionCost",
        name: "执行费用成本",
        amount: formatAmount(financialStructure.executionCost),
        remark: executionCostDetailNode,
      },
      {
        key: "totalCost",
        name: "成本合计",
        amount: formatAmount(recomputedTotalCost),
        remark: totalCostRatioRemark,
      },
    ];

    return rows;
  }, [
    financialStructure,
    latestBaselineCostEstimation?.clientBudget,
    latestBaselineCostEstimation?.contractAmountSnapshot,
  ]);

  const columns = useMemo<ColumnsType<FinancialStructureTableRow>>(
    () => [
      {
        title: "名称",
        dataIndex: "name",
        key: "name",
        width: 280,
      },
      {
        title: "金额",
        dataIndex: "amount",
        key: "amount",
        width: 280,
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 400,
      },
    ],
    [],
  );

  const downloadFinancialStructureTable = useCallback(async () => {
    if (!financialStructure) return;

    const projectAmount =
      (typeof latestBaselineCostEstimation?.contractAmountSnapshot === "number"
        ? latestBaselineCostEstimation.contractAmountSnapshot
        : null) ?? toMoney(latestBaselineCostEstimation?.clientBudget);
    const outsourceCost = getProjectOutsourceTotal(financialStructure.outsourceItems);
    const agencyFeeAmount =
      typeof projectAmount === "number"
        ? (projectAmount * (financialStructure.agencyFeeRate ?? 0)) / 100
        : null;
    const recomputedTotalCost =
      (agencyFeeAmount ?? 0) +
      outsourceCost +
      financialStructure.laborCost +
      financialStructure.rentCost +
      financialStructure.middleOfficeCost +
      financialStructure.executionCost;
    const benchmarkRemark =
      typeof projectAmount === "number"
        ? `成本基准参考：${formatAmount(projectAmount * 0.53)}`
        : "成本基准参考：-";
    const totalCostRatioRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `${Math.round((recomputedTotalCost / projectAmount) * 100)}%`
        : "-";
    const laborCostRateRemark =
      typeof projectAmount === "number" && projectAmount > 0
        ? `人力成本率 ${Math.round((financialStructure.laborCost / projectAmount) * 100)}%`
        : "-";
    const executionCostRemark =
      (financialStructure.executionCostItems?.length ?? 0) > 0
        ? (financialStructure.executionCostItems ?? [])
            .map(
              (item) =>
                `${item.costTypeOption?.value ?? "未命名费用类型"}：${formatAmountPlain(item.budgetAmount)}`,
            )
            .join("\n")
        : "-";
    const outsourceRemarkText = (() => {
      const lines: string[] = [];
      if ((financialStructure.outsourceItems?.length ?? 0) > 0) {
        lines.push(
          ...(financialStructure.outsourceItems ?? []).map(
            (item) => `${item.type}：${formatAmountPlain(item.amount)}`,
          ),
        );
      }
      const remark = financialStructure.outsourceRemark?.trim();
      if (remark) {
        if (lines.length > 0) lines.push("");
        lines.push(remark);
      }
      return lines.join("\n") || "-";
    })();

    const exportRows: Array<[string, string, string]> = [
      ["收入", formatAmountPlain(projectAmount), benchmarkRemark],
      [
        "中介费",
        formatAmountPlain(agencyFeeAmount),
        typeof financialStructure.agencyFeeRate === "number"
          ? `费率：${formatAmount(financialStructure.agencyFeeRate)}%`
          : "-",
      ],
      ["外包成本", formatAmountPlain(outsourceCost), outsourceRemarkText],
      ["人力成本", formatAmountPlain(financialStructure.laborCost), laborCostRateRemark],
      ["租金成本", formatAmountPlain(financialStructure.rentCost), "-"],
      ["中台成本", formatAmountPlain(financialStructure.middleOfficeCost), "-"],
      ["执行费用成本", formatAmountPlain(financialStructure.executionCost), executionCostRemark],
      ["成本合计", formatAmountPlain(recomputedTotalCost), totalCostRatioRemark],
    ];

    setDownloading(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("项目财务结构");
      const tableTitle = `【${projectName || "未命名项目"}】${
        latestBaselineCostEstimation?.estimatedDuration ?? "-"
      }个工作日财务结构`;

      worksheet.addRow([tableTitle, "", ""]);
      worksheet.mergeCells("A1:C1");
      worksheet.addRow(["名称", "金额", "备注"]);
      exportRows.forEach((row) => worksheet.addRow(row));

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
            vertical: "top",
            horizontal: rowNumber <= 2 ? "center" : "left",
            wrapText: true,
          };
        });
      });

      const lastRow = worksheet.rowCount;
      for (let rowIndex = 1; rowIndex <= lastRow; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= 3; columnIndex += 1) {
          const cell = worksheet.getCell(rowIndex, columnIndex);
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
      }

      worksheet.columns = [
        { width: 22 },
        { width: 32 },
        { width: 44 },
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
      link.download = `${projectName || "项目"}-财务结构-${yyyy}${mm}${dd}.xlsx`;
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
    } finally {
      setDownloading(false);
    }
  }, [app, financialStructure, latestBaselineCostEstimation, messageApi, projectName]);

  const actionsNode = canManageFinancialStructureActions ? (
    <Space>
      <Button
        onClick={() => void downloadFinancialStructureTable()}
        disabled={!financialStructure}
        loading={downloading}
      >
        下载表格
      </Button>
      <Button
        type="primary"
        onClick={() => setModalOpen(true)}
        disabled={!canManageProject || !latestBaselineCostEstimation?.id}
      >
        {financialStructure ? "更新财务结构" : "新增财务结构"}
      </Button>
    </Space>
  ) : null;

  const contentNode = loading ? (
    <div style={{ width: "100%", padding: "24px 0", textAlign: "center" }}>
      <Spin />
    </div>
  ) : financialStructure ? (
    <div style={{ overflowX: "auto" }}>
      <div style={{ width: 960, margin: "0 auto" }}>
        <Table<FinancialStructureTableRow>
          rowKey="key"
          pagination={false}
          bordered
          columns={columns}
          dataSource={tableRows}
          size="small"
          tableLayout="fixed"
          style={{ width: 960 }}
          title={() => (
            <div style={{ textAlign: "center", fontWeight: 700 }}>
              {`【${projectName || "未命名项目"}】${
                latestBaselineCostEstimation?.estimatedDuration ?? "-"
              }个工作日财务结构`}
            </div>
          )}
        />
      </div>
    </div>
  ) : (
    <Empty description="暂无项目财务结构数据" />
  );

  return (
    <>
      {contextHolder}
      {mode === "full" ? (
        <Card title="项目财务结构" extra={actionsNode}>
          {contentNode}
        </Card>
      ) : null}
      {mode === "actions" ? actionsNode : null}
      {mode === "content" ? contentNode : null}

      {mode !== "content" ? (
        <ProjectFinancialStructureModal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          projectId={projectId}
          estimation={latestBaselineCostEstimation}
          existingStructure={financialStructure}
          onSaved={async () => {
            await fetchFinancialStructure();
            await onSaved?.();
          }}
        />
      ) : null}
    </>
  );
};

export default ProjectFinancialStructureCard;
