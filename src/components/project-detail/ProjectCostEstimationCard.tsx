"use client";

import { useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Space, Typography } from "antd";
import ProjectCostFeesInfo from "@/components/project-detail/ProjectCostFeesInfo";
import ProjectCostEstimationModal from "@/components/project-detail/ProjectCostEstimationModal";
import {
  ProjectMinimumQuoteDetails,
  ProjectMinimumQuoteSummary,
  useMinimumQuote,
} from "@/components/project-detail/ProjectMinimumQuoteEstimate";
import minimumQuoteStyles from "@/components/project-detail/ProjectMinimumQuoteEstimate.module.css";
import StyledStatisticCard from "@/components/project-detail/StyledStatisticCard";
import { normalizeProjectOutsourceItems } from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useProjectPermission } from "@/hooks/useProjectPermission";
import ProjectCostBasisMembersTable from "./ProjectCostBasisMembersTable";
import CopyTextButton from "../actions/CopyTextButton";

type Props = {
  projectId: string;
  projectName: string;
  projectMembers?: Project["members"];
  latestCostEstimation?: Project["latestPlanningCostEstimation"];
  modalPrefillEstimation?: Project["latestPlanningCostEstimation"];
  syncSummarySourceEstimation?: Project["latestPlanningCostEstimation"];
  employees: Employee[];
  showProjectInBasicInfo?: boolean;
  showContractAmountInBasicInfo?: boolean;
  includeQuoteAmountInSyncSummary?: boolean;
  workspaceLayout?: boolean;
  mode?: "full" | "actions" | "content";
  onSaved?: (
    latestCostEstimation: Project["latestPlanningCostEstimation"],
  ) => Promise<void> | void;
};

const sectionTitleStyle = { marginBottom: 12 } as const;
const statisticDescriptionStyle = { color: "rgba(0,0,0,0.45)" } as const;

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
  lines.push(`预估时长：${estimation.estimatedDuration}个工作日`);
  const clientBudget = parseBudgetValue(estimation.clientBudget);
  if (typeof clientBudget === "number") {
    lines.push(`客户预算（不含税）：${formatAmount(clientBudget)}`);
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

  const outsourceItems = normalizeProjectOutsourceItems(estimation.outsourceItems);
  lines.push(
    `外包费用：${outsourceItems.length > 0
      ? outsourceItems.map((item) => `${item.type} ${item.amount} 元`).join("、")
      : "-"}`,
  );
  const outsourceRemark = toTrimmedString(estimation.outsourceRemark);
  if (outsourceRemark) lines.push(`外包费用备注：${outsourceRemark}`);

  const otherExecutionCostRemark = toTrimmedString(
    estimation.otherExecutionCostRemark,
  );
  const executionCostValues = (estimation.executionCostTypes ?? [])
    .map((item) => toTrimmedString(item.value))
    .filter(Boolean)
    .map((value) => {
      const label = value === "其他" && otherExecutionCostRemark
        ? `其他（${otherExecutionCostRemark}）`
        : value;
      const amount = estimation.executionCostItems?.find(
        (item) => item.costTypeOption?.value === value,
      )?.requestedAmount;
      return typeof amount === "number"
        ? `${label} ${formatAmount(amount)} 元`
        : label;
    });
  lines.push(`执行费用：${executionCostValues.join("、") || "-"}`);

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
  projectMembers,
  latestCostEstimation,
  modalPrefillEstimation,
  syncSummarySourceEstimation,
  employees,
  includeQuoteAmountInSyncSummary = false,
  workspaceLayout = false,
  mode = "full",
  onSaved,
}: Props) => {
  const { canManageProject } = useProjectPermission();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncInfoModalOpen, setSyncInfoModalOpen] = useState(false);
  const minimumQuote = useMinimumQuote(
    mode === "actions" ? undefined : latestCostEstimation,
  );
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

  const contentNode = latestCostEstimation ? (
    <Space orientation="vertical" size={18} style={{ width: "100%" }}>
      <div>
        {!workspaceLayout && (
          <Typography.Title level={5} style={sectionTitleStyle}>
            基础信息
          </Typography.Title>
        )}
        <div className={minimumQuoteStyles.basicCards}>
          <StyledStatisticCard
            statistic={{
              title: "客户预算（不含税）",
              value:
                parseBudgetValue(latestCostEstimation?.clientBudget) ?? "-",
              suffix:
                typeof parseBudgetValue(latestCostEstimation?.clientBudget) ===
                "number"
                  ? "元"
                  : undefined,
              description: workspaceLayout ? undefined :
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
          <ProjectMinimumQuoteSummary
            quote={minimumQuote.estimate?.quote ?? null}
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
        <ProjectCostBasisMembersTable
          members={latestCostEstimation?.members}
          projectMembers={projectMembers}
          estimatedDuration={latestCostEstimation?.estimatedDuration}
        />
      </div>

      <div>
        <Typography.Title level={5} style={sectionTitleStyle}>
          费用信息
        </Typography.Title>
        <ProjectCostFeesInfo estimation={latestCostEstimation} />
      </div>

      {minimumQuote.estimate ? (
        <div>
          <Typography.Title level={5} style={sectionTitleStyle}>
            最低报价推算
          </Typography.Title>
          <ProjectMinimumQuoteDetails
            estimate={minimumQuote.estimate}
            costBaselineRatio={minimumQuote.costBaselineRatio}
            agencyFeeRate={latestCostEstimation.agencyFeeRate}
          />
        </div>
      ) : null}
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
