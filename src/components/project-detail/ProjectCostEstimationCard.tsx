"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import AppLink from "@/components/AppLink";
import RemarkText from "@/components/RemarkText";
import SelectOptionTag from "@/components/SelectOptionTag";
import ProjectCostEstimationModal from "@/components/project-detail/ProjectCostEstimationModal";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";

type Props = {
  projectId: string;
  projectName: string;
  canManageProject: boolean;
  latestCostEstimation?: Project["latestCostEstimation"];
  modalPrefillEstimation?: Project["latestCostEstimation"];
  syncSummarySourceEstimation?: Project["latestCostEstimation"];
  estimationType?: "planning" | "baseline";
  employees: Employee[];
  showProjectInBasicInfo?: boolean;
  showContractAmountInBasicInfo?: boolean;
  includeQuoteAmountInSyncSummary?: boolean;
  mode?: "full" | "actions" | "content";
  onSaved?: (
    latestCostEstimation: Project["latestCostEstimation"],
  ) => Promise<void> | void;
};

type CostEstimationMemberRow = {
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
  rentCostSnapshot?: number;
};

const sectionTitleStyle = { marginBottom: 12 } as const;

const mapEstimationMembers = (
  estimation?: Project["latestCostEstimation"],
): CostEstimationMemberRow[] =>
  (estimation?.members ?? []).map((member) => ({
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
    rentCostSnapshot: member.rentCostSnapshot,
  }));

const formatAmount = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const toTrimmedString = (value?: string | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildSyncSummary = (
  projectName: string,
  estimation?: Project["latestCostEstimation"],
  estimationType: "planning" | "baseline" = "planning",
  includeQuoteAmount = false,
  detailLink?: string,
) => {
  if (!estimation) return "";

  const lines: string[] = [];
  const normalizedProjectName = toTrimmedString(projectName) || "未命名项目";
  lines.push(estimationType === "baseline" ? "#立项申请" : "#成本测算");
  lines.push("");
  lines.push(normalizedProjectName);
  lines.push("");

  if (
    includeQuoteAmount &&
    typeof estimation.contractAmountSnapshot === "number"
  ) {
    lines.push(
      `报价金额：${formatAmount(estimation.contractAmountSnapshot)}元`,
    );
  }
  lines.push(`预计时长：${estimation.estimatedDuration}个工作日`);
  const clientBudget = toTrimmedString(estimation.clientBudget);
  if (clientBudget) {
    lines.push(`客户报价(不含税)：${clientBudget}`);
  }
  lines.push("");

  lines.push("人员配置：");
  const memberLines = (estimation.members ?? []).map((member) => {
    const name = toTrimmedString(member.employee?.name) || "未命名成员";
    const percent = member.allocationPercent;
    if (typeof percent === "number") {
      return `- ${name} ${percent}%`;
    }
    return `- ${name}`;
  });
  lines.push(...(memberLines.length > 0 ? memberLines : ["- 暂无成员"]));
  lines.push("");

  lines.push(
    `外包费用：${formatProjectOutsourceItemsText(estimation.outsourceItems)}`,
  );

  const otherExecutionCostRemark = toTrimmedString(
    estimation.otherExecutionCostRemark,
  );
  const executionCostValues = (estimation.executionCostTypes ?? [])
    .map((item) => toTrimmedString(item.value))
    .filter(Boolean)
    .map((value) =>
      value === "其他" && otherExecutionCostRemark
        ? `其他（${otherExecutionCostRemark}）`
        : value,
    );
  lines.push(`执行费用需求：${executionCostValues.join("、") || "-"}`);

  if (detailLink) {
    lines.push("");
    lines.push(
      `${estimationType === "baseline" ? "申请" : "测算"}链接：${detailLink}`,
    );
  }

  return lines.join("\n");
};

const ProjectCostEstimationCard = ({
  projectId,
  projectName,
  canManageProject,
  latestCostEstimation,
  modalPrefillEstimation,
  syncSummarySourceEstimation,
  estimationType = "planning",
  employees,
  showProjectInBasicInfo = false,
  showContractAmountInBasicInfo = false,
  includeQuoteAmountInSyncSummary = false,
  mode = "full",
  onSaved,
}: Props) => {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncInfoModalOpen, setSyncInfoModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canViewLaborCost =
    roleCodes.includes("ADMIN") ||
    roleCodes.includes("HR") ||
    roleCodes.includes("FINANCE");
  const canManageByPmRole = roleCodes.includes("PROJECT_MANAGER");
  const hasEstimation = Boolean(latestCostEstimation);
  const syncSummaryEstimation =
    latestCostEstimation ?? syncSummarySourceEstimation ?? null;
  const currentPageLink =
    typeof window === "undefined" ? "" : window.location.href;

  const syncSummaryText = useMemo(
    () =>
      buildSyncSummary(
        projectName,
        syncSummaryEstimation,
        estimationType,
        includeQuoteAmountInSyncSummary,
        currentPageLink,
      ),
    [
      currentPageLink,
      estimationType,
      includeQuoteAmountInSyncSummary,
      projectName,
      syncSummaryEstimation,
    ],
  );

  const memberViewColumns = useMemo<ColumnsType<CostEstimationMemberRow>>(
    () => [
      {
        title: "姓名",
        dataIndex: "employeeName",
        width: 220,
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
        width: 180,
        render: (value) =>
          value?.value ? <SelectOptionTag option={value} /> : "-",
      },
      {
        title: "占比",
        dataIndex: "allocationPercent",
        width: 150,
        render: (value: number | undefined) =>
          typeof value === "number" ? `${value}%` : "-",
      },
      ...(canViewLaborCost
        ? [
            {
              title: "人力成本",
              dataIndex: "laborCostSnapshot",
              width: 180,
              render: (value: number | undefined) =>
                typeof value === "number" ? `${formatAmount(value)} 元` : "-",
            },
          ]
        : []),
    ],
    [canViewLaborCost],
  );

  const memberRows = useMemo(
    () => mapEstimationMembers(latestCostEstimation),
    [latestCostEstimation],
  );
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
  const hasAgencyFeeRate =
    typeof latestCostEstimation?.agencyFeeRate === "number" &&
    latestCostEstimation.agencyFeeRate > 0;

  const actionsNode = canManageByPmRole ? (
    hasEstimation ? (
      <>
        <Button onClick={() => setSyncInfoModalOpen(true)}>生成同步信息</Button>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          {estimationType === "baseline" ? "更新立项申请" : "更新成本测算"}
        </Button>
      </>
    ) : (
      <>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          {estimationType === "baseline" ? "创建立项申请" : "开始成本测算"}
        </Button>
      </>
    )
  ) : null;

  const contentNode = hasEstimation ? (
    <Space orientation="vertical" size={18} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          基础信息
        </Typography.Title>
        <Descriptions
          size="small"
          column={2}
          styles={{
            label: { paddingBottom: 12 },
            content: { paddingBottom: 12 },
          }}
          items={[
            ...(showProjectInBasicInfo
              ? [
                  {
                    key: "project",
                    label: "所属项目",
                    children: (
                      <AppLink href={`/projects/${projectId}`}>
                        {projectName || "未命名项目"}
                      </AppLink>
                    ),
                  },
                ]
              : []),
            {
              key: "estimatedDuration",
              label: "预估时长(工作日)",
              children: latestCostEstimation?.estimatedDuration ?? "-",
            },
            ...(estimationType !== "baseline"
              ? [
                  {
                    key: "clientBudget",
                    label: "客户报价(不含税)",
                    children: latestCostEstimation?.clientBudget || "无",
                  },
                ]
              : []),
            {
              key: "owner",
              label: "创建人",
              children:
                latestCostEstimation?.owner?.id &&
                latestCostEstimation?.owner?.name ? (
                  <AppLink href={`/employees/${latestCostEstimation.owner.id}`}>
                    {latestCostEstimation.owner.name}
                  </AppLink>
                ) : (
                  "-"
                ),
            },
            ...(showContractAmountInBasicInfo
              ? [
                  {
                    key: "contractAmountSnapshot",
                    label: "合同金额(含税)",
                    children:
                      typeof latestCostEstimation?.contractAmountSnapshot ===
                      "number"
                        ? `${formatAmount(latestCostEstimation.contractAmountSnapshot)} 元`
                        : "-",
                  },
                ]
              : []),
          ]}
        />
      </div>

      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          人员配置
        </Typography.Title>
        <Table
          rowKey="id"
          columns={memberViewColumns}
          dataSource={memberRows}
          pagination={false}
          locale={{ emptyText: "暂无成员配置" }}
          size="small"
          style={{ width: "100%" }}
          tableLayout="fixed"
          summary={
            canViewLaborCost
              ? () => (
                  <Table.Summary.Row style={{ fontWeight: 600 }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      人力成本总计
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      {`${formatAmount(totalLaborCost)} 元`}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              : undefined
          }
        />
      </div>

      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          费用信息
        </Typography.Title>
        <Descriptions
          title={<h5>中介费</h5>}
          size="small"
          column={3}
          styles={{
            label: { paddingBottom: 12 },
            header: { marginBottom: 8 },
            content: { paddingBottom: 12, marginBottom: 8 },
          }}
          items={[
            {
              key: "agencyFeeRate",
              label: "中介费率",
              children:
                hasAgencyFeeRate
                  ? `${formatAmount(latestCostEstimation.agencyFeeRate ?? 0)}%`
                  : "-",
            },
            {
              key: "agencyFee",
              label: "中介费金额",
              children:
                hasAgencyFeeRate &&
                typeof latestCostEstimation?.contractAmountSnapshot === "number"
                  ? `${formatAmount(
                      ((latestCostEstimation.agencyFeeRate ?? 0) / 100) *
                        latestCostEstimation.contractAmountSnapshot,
                    )} 元`
                  : "-",
            },
          ]}
        />
        <Descriptions
          title={<h5>外包费用</h5>}
          size="small"
          column={3}
          styles={{
            label: { paddingBottom: 12 },
            header: { marginBottom: 8 },
            content: { paddingBottom: 12, marginBottom: 8 },
          }}
          items={[
            {
              key: "outsourceCost",
              label: "外包费用",
              children:
                (latestCostEstimation?.outsourceItems?.length ?? 0) > 0
                  ? `${getProjectOutsourceTotal(latestCostEstimation?.outsourceItems)} 元`
                  : "-",
            },
            {
              key: "outsourceItems",
              label: "外包费用明细",
              children:
                (latestCostEstimation?.outsourceItems?.length ?? 0) > 0 ? (
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {formatProjectOutsourceItemsText(
                      latestCostEstimation?.outsourceItems,
                    )}
                  </div>
                ) : (
                  "-"
                ),
            },
            {
              key: "outsourceRemark",
              label: "外包费用备注",
              children: (
                <RemarkText remark={latestCostEstimation?.outsourceRemark} />
              ),
            },
          ]}
        />
        <Descriptions
          title={<h5>执行费用</h5>}
          size="small"
          column={
            latestCostEstimation?.otherExecutionCostRemark?.trim() ? 2 : 1
          }
          styles={{
            label: { paddingBottom: 12 },
            header: { marginBottom: 8 },
            content: { paddingBottom: 12, marginBottom: 8 },
          }}
          items={[
            {
              key: "executionCostTypes",
              label: "执行费用类别",
              children:
                (latestCostEstimation?.executionCostTypes?.length ?? 0) > 0 &&
                (latestCostEstimation?.executionCostTypes ?? []).some(
                  (item) => item?.value,
                ) ? (
                  <Space size={[8, 8]} wrap>
                    {(latestCostEstimation?.executionCostTypes ?? [])
                      .filter((item): item is NonNullable<typeof item> =>
                        Boolean(item),
                      )
                      .filter((item) => Boolean(item.value))
                      .map((item, index) => (
                        <SelectOptionTag
                          key={
                            item.id ?? `${item.value ?? "execution"}-${index}`
                          }
                          option={item}
                        />
                      ))}
                  </Space>
                ) : (
                  "-"
                ),
            },
            ...(latestCostEstimation?.otherExecutionCostRemark?.trim()
              ? [
                  {
                    key: "otherExecutionCostRemark",
                    label: "其他费用备注",
                    children: (
                      <RemarkText
                        remark={latestCostEstimation.otherExecutionCostRemark}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </Space>
  ) : (
    <Empty
      description={
        estimationType === "baseline" ? "暂无立项申请数据" : "暂无成本测算数据"
      }
    />
  );

  return (
    <>
      {mode === "full" ? (
        <Card title="项目成本测算" extra={<Space>{actionsNode}</Space>}>
          {contentNode}
        </Card>
      ) : null}
      {mode === "actions" ? <Space>{actionsNode}</Space> : null}
      {mode === "content" ? contentNode : null}

      {mode !== "content" ? (
        <>
          <ProjectCostEstimationModal
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            projectId={projectId}
            latestCostEstimation={latestCostEstimation}
            prefillEstimation={modalPrefillEstimation}
            estimationType={estimationType}
            employees={employees}
            onSaved={onSaved}
          />

          <Modal
            title="生成同步信息"
            open={syncInfoModalOpen}
            onCancel={() => setSyncInfoModalOpen(false)}
            width={760}
            footer={[
              <Button key="cancel" onClick={() => setSyncInfoModalOpen(false)}>
                关闭
              </Button>,
              <Button
                key="copy"
                type="primary"
                onClick={async () => {
                  try {
                    if (navigator?.clipboard?.writeText) {
                      await navigator.clipboard.writeText(syncSummaryText);
                    } else {
                      const textarea = document.createElement("textarea");
                      textarea.value = syncSummaryText;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textarea);
                    }
                    message.success("已复制");
                  } catch {
                    message.error("复制失败，请手动复制");
                  }
                }}
              >
                复制
              </Button>,
            ]}
          >
            <div
              style={{
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 12,
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
              }}
            >
              {syncSummaryText || "暂无可同步的测算信息"}
            </div>
          </Modal>
        </>
      ) : null}
    </>
  );
};

export default ProjectCostEstimationCard;
