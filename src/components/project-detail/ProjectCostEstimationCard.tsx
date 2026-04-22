"use client";

import { useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Space, Typography } from "antd";
import MultipleSelectOptions from "@/components/MultipleSelectOptions";
import InfoGrid from "@/components/project-detail/InfoGrid";
import ProjectCostEstimationModal from "@/components/project-detail/ProjectCostEstimationModal";
import StyledStatisticCard from "@/components/project-detail/StyledStatisticCard";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import ProjectCostBasisMembersTable from "./ProjectCostBasisMembersTable";
import CopyTextButton from "../actions/CopyTextButton";

type Props = {
  projectId: string;
  projectName: string;
  latestCostEstimation?: Project["latestPlanningCostEstimation"];
  modalPrefillEstimation?: Project["latestPlanningCostEstimation"];
  syncSummarySourceEstimation?: Project["latestPlanningCostEstimation"];
  employees: Employee[];
  showProjectInBasicInfo?: boolean;
  showContractAmountInBasicInfo?: boolean;
  includeQuoteAmountInSyncSummary?: boolean;
  mode?: "full" | "actions" | "content";
  onSaved?: (
    latestCostEstimation: Project["latestPlanningCostEstimation"],
  ) => Promise<void> | void;
};

const sectionTitleStyle = { marginBottom: 12 } as const;
const statisticDescriptionStyle = { color: "rgba(0,0,0,0.45)" } as const;
const executionCostField = "projectCostEstimation.executionCostType";

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

const toNoVpnLink = (link: string) => {
  try {
    const parsed = new URL(link);
    parsed.protocol = "https:";
    parsed.host = "app.oh-yes-business.com";
    return parsed.toString();
  } catch {
    return link.replace(
      /^https?:\/\/[^/]+/i,
      "https://app.oh-yes-business.com",
    );
  }
};

const parseBudgetValue = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildSyncSummary = (
  projectName: string,
  estimation?: Project["latestCostEstimation"],
  includeQuoteAmount = false,
  detailLink?: string,
) => {
  if (!estimation) return "";

  const lines: string[] = [];
  const normalizedProjectName = toTrimmedString(projectName) || "未命名项目";
  lines.push("#成本测算");
  lines.push("");
  lines.push(normalizedProjectName);
  lines.push("");

  if (includeQuoteAmount && typeof estimation.contractAmount === "number") {
    lines.push(`报价金额：${formatAmount(estimation.contractAmount)}元`);
  }
  lines.push(`预计时长：${estimation.estimatedDuration}个工作日`);
  const clientBudget = parseBudgetValue(estimation.clientBudget);
  if (typeof clientBudget === "number") {
    lines.push(`客户报价(不含税)：${formatAmount(clientBudget)}`);
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
    lines.push("测算链接：");
    lines.push(`- 有 vpn：${detailLink}`);
    lines.push(`- 无 vpn：${toNoVpnLink(detailLink)}`);
  }

  return lines.join("\n");
};

const ProjectCostEstimationCard = ({
  projectId,
  projectName,
  latestCostEstimation,
  modalPrefillEstimation,
  syncSummarySourceEstimation,
  employees,
  includeQuoteAmountInSyncSummary = false,
  mode = "full",
  onSaved,
}: Props) => {
  const { canManageProject } = useProjectPermission();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncInfoModalOpen, setSyncInfoModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageByPmRole =
    roleCodes.includes("PROJECT_MANAGER") || roleCodes.includes("ADMIN");
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
        includeQuoteAmountInSyncSummary,
        currentPageLink,
      ),
    [
      currentPageLink,
      includeQuoteAmountInSyncSummary,
      projectName,
      syncSummaryEstimation,
    ],
  );

  const hasAgencyFeeRate =
    typeof latestCostEstimation?.agencyFeeRate === "number" &&
    latestCostEstimation.agencyFeeRate > 0;
  const hasOtherExecutionCostType = useMemo(() => {
    if (typeof latestCostEstimation?.hasOtherExecutionCostType === "boolean") {
      return latestCostEstimation.hasOtherExecutionCostType;
    }
    return (latestCostEstimation?.executionCostTypes ?? []).some(
      (item) =>
        typeof item?.value === "string" && item.value.trim() === "其他",
    );
  }, [
    latestCostEstimation?.executionCostTypes,
    latestCostEstimation?.hasOtherExecutionCostType,
  ]);
  const estimatedAgencyFee = useMemo(() => {
    if (typeof latestCostEstimation?.estimatedAgencyFee === "number") {
      return latestCostEstimation.estimatedAgencyFee;
    }
    if (!hasAgencyFeeRate) return null;
    const budget = parseBudgetValue(latestCostEstimation?.clientBudget);
    if (budget === null) return null;
    return ((latestCostEstimation?.agencyFeeRate ?? 0) / 100) * budget;
  }, [
    hasAgencyFeeRate,
    latestCostEstimation?.agencyFeeRate,
    latestCostEstimation?.clientBudget,
    latestCostEstimation?.estimatedAgencyFee,
  ]);

  const actionsNode = canManageByPmRole ? (
    hasEstimation ? (
      <>
        <Button onClick={() => setSyncInfoModalOpen(true)}>生成同步信息</Button>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          更新成本测算
        </Button>
      </>
    ) : (
      <>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          开始成本测算
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <StyledStatisticCard
            statistic={{
              title: "客户报价(不含税)",
              value:
                parseBudgetValue(latestCostEstimation?.clientBudget) ?? "-",
              suffix:
                typeof parseBudgetValue(latestCostEstimation?.clientBudget) ===
                "number"
                  ? "元"
                  : undefined,
              description:
                latestCostEstimation?.owner?.id &&
                latestCostEstimation?.owner?.name ? (
                  <span style={statisticDescriptionStyle}>
                    创建人：
                    {latestCostEstimation.owner.name}
                  </span>
                ) : (
                  <span style={statisticDescriptionStyle}>创建人：-</span>
                ),
            }}
          />
          <StyledStatisticCard
            statistic={{
              title: "预估时长",
              value: latestCostEstimation?.estimatedDuration ?? undefined,
              formatter: (value) =>
                value === null || value === undefined
                  ? "-"
                  : Number(value).toLocaleString("zh-CN"),
              description: (
                <span style={statisticDescriptionStyle}>个工作日</span>
              ),
            }}
          />
        </div>
      </div>

      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          人员配置
        </Typography.Title>
        <ProjectCostBasisMembersTable members={latestCostEstimation?.members} />
      </div>

      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          费用信息
        </Typography.Title>
        <InfoGrid
          style={{ marginBottom: 12 }}
          rows={[
            {
              columns: 2,
              title: "中介费用",
              items: [
                {
                  title: "中介费率",
                  value: hasAgencyFeeRate
                    ? `${formatAmount(latestCostEstimation.agencyFeeRate ?? 0)}%`
                    : "-",
                },
                {
                  title: "预估中介费",
                  value:
                    typeof estimatedAgencyFee === "number"
                      ? `${formatAmount(estimatedAgencyFee)} 元`
                      : "-",
                },
              ],
            },
            {
              columns: 3,
              title: "外包费用",
              items: [
                {
                  title: "外包费用",
                  value:
                    (latestCostEstimation?.outsourceItems?.length ?? 0) > 0
                      ? `${getProjectOutsourceTotal(latestCostEstimation?.outsourceItems)} 元`
                      : "-",
                },
                {
                  title: "外包费用明细",
                  value: latestCostEstimation?.outsourceInfo?.trim()
                    ? latestCostEstimation.outsourceInfo
                    : (latestCostEstimation?.outsourceItems?.length ?? 0) > 0
                      ? formatProjectOutsourceItemsText(
                          latestCostEstimation?.outsourceItems,
                        )
                      : "-",
                },
                {
                  title: "外包费用备注",
                  value: latestCostEstimation?.outsourceRemark?.trim() || "-",
                },
              ],
            },
            {
              columns: hasOtherExecutionCostType ? 2 : 1,
              title: "执行费用",
              items: [
                {
                  title: "执行费用类别",
                  value:
                    (latestCostEstimation?.executionCostTypes?.length ?? 0) >
                      0 &&
                    (latestCostEstimation?.executionCostTypes ?? []).some(
                      (item) => item?.value,
                    ) ? (
                      <MultipleSelectOptions
                        field={executionCostField}
                        options={latestCostEstimation?.executionCostTypes}
                      />
                    ) : (
                      "-"
                    ),
                },
                ...(hasOtherExecutionCostType
                  ? [
                      {
                        title: "其他执行费用备注",
                        value:
                          latestCostEstimation?.otherExecutionCostRemark?.trim() ||
                          "-",
                      },
                    ]
                  : []),
              ],
            },
          ]}
        />
      </div>
    </Space>
  ) : (
    <Empty description="暂无成本测算数据" />
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
              <CopyTextButton key="copy" text={syncSummaryText} />,
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
