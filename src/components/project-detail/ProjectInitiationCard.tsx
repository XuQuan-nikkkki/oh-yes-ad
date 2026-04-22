"use client";

import { useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Space, Typography } from "antd";
import ProjectInitiationModal from "@/components/project-detail/ProjectInitiationModal";
import ProjectCostBasisMembersTable from "@/components/project-detail/ProjectCostBasisMembersTable";
import {
  formatProjectOutsourceItemsText,
  getProjectOutsourceTotal,
} from "@/lib/project-outsource";
import type { Employee, Project } from "@/types/projectDetail";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import CopyTextButton from "../actions/CopyTextButton";
import InfoGrid from "./InfoGrid";
import MultipleSelectOptions from "../MultipleSelectOptions";
import StyledStatisticCard from "./StyledStatisticCard";

type Props = {
  projectId: string;
  projectName: string;
  canManageProject: boolean;
  latestInitiation?: Project["latestBaselineCostEstimation"];
  modalPrefillInitiation?: Project["latestBaselineCostEstimation"];
  syncSummarySourceInitiation?: Project["latestBaselineCostEstimation"];
  employees: Employee[];
  showProjectInBasicInfo?: boolean;
  showContractAmountInBasicInfo?: boolean;
  includeQuoteAmountInSyncSummary?: boolean;
  mode?: "full" | "actions" | "content";
  onSaved?: (
    latestInitiation: Project["latestBaselineCostEstimation"],
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

const buildSyncSummary = (
  projectName: string,
  estimation?: Project["latestBaselineCostEstimation"],
  includeQuoteAmount = false,
  detailLink?: string,
) => {
  if (!estimation) return "";

  const lines: string[] = [];
  const normalizedProjectName = toTrimmedString(projectName) || "未命名项目";
  lines.push("#立项申请");
  lines.push("");
  lines.push(normalizedProjectName);
  lines.push("");

  if (includeQuoteAmount && typeof estimation.contractAmount === "number") {
    lines.push(`报价金额：${formatAmount(estimation.contractAmount)}元`);
  }
  lines.push(`预计时长：${estimation.estimatedDuration}个工作日`);
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
    lines.push("申请链接：");
    lines.push(`- 有 vpn：${detailLink}`);
    lines.push(`- 无 vpn：${toNoVpnLink(detailLink)}`);
  }

  return lines.join("\n");
};

const ProjectInitiationCard = ({
  projectId,
  projectName,
  canManageProject,
  latestInitiation,
  modalPrefillInitiation,
  syncSummarySourceInitiation,
  employees,
  includeQuoteAmountInSyncSummary = false,
  mode = "full",
  onSaved,
}: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [syncInfoModalOpen, setSyncInfoModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const canManageByPmRole =
    roleCodes.includes("PROJECT_MANAGER") || roleCodes.includes("ADMIN");
  const hasInitiation = Boolean(latestInitiation);
  const syncSummaryInitiation =
    latestInitiation ?? syncSummarySourceInitiation ?? null;
  const currentPageLink =
    typeof window === "undefined" ? "" : window.location.href;

  const syncSummaryText = useMemo(
    () =>
      buildSyncSummary(
        projectName,
        syncSummaryInitiation,
        includeQuoteAmountInSyncSummary,
        currentPageLink,
      ),
    [
      currentPageLink,
      includeQuoteAmountInSyncSummary,
      projectName,
      syncSummaryInitiation,
    ],
  );

  const hasAgencyFeeRate =
    typeof latestInitiation?.agencyFeeRate === "number" &&
    latestInitiation.agencyFeeRate > 0;
  const estimatedAgencyFee =
    typeof latestInitiation?.estimatedAgencyFee === "number"
      ? latestInitiation.estimatedAgencyFee
      : null;
  const hasOtherExecutionCostType = useMemo(
    () =>
      (latestInitiation?.executionCostTypes ?? []).some(
        (item) => typeof item?.value === "string" && item.value.trim() === "其他",
      ),
    [latestInitiation?.executionCostTypes],
  );

  const actionsNode = canManageByPmRole ? (
    hasInitiation ? (
      <>
        <Button onClick={() => setSyncInfoModalOpen(true)}>生成同步信息</Button>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          更新立项申请
        </Button>
      </>
    ) : (
      <>
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          disabled={!canManageProject}
        >
          创建立项申请
        </Button>
      </>
    )
  ) : null;

  const contentNode = hasInitiation ? (
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
              title: "报价金额（含税）",
              value:
                typeof latestInitiation?.contractAmount === "number"
                  ? formatAmount(latestInitiation.contractAmount)
                  : "-",
              suffix:
                typeof latestInitiation?.contractAmount === "number"
                  ? "元"
                  : undefined,
              description:
                latestInitiation?.owner?.id && latestInitiation?.owner?.name ? (
                  <span style={statisticDescriptionStyle}>
                    创建人：
                    {latestInitiation.owner.name}
                  </span>
                ) : (
                  <span style={statisticDescriptionStyle}>创建人：-</span>
                ),
            }}
          />
          <StyledStatisticCard
            statistic={{
              title: "预估时长",
              value: latestInitiation?.estimatedDuration ?? undefined,
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
        <ProjectCostBasisMembersTable members={latestInitiation?.members} />
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
                    ? `${formatAmount(latestInitiation.agencyFeeRate ?? 0)}%`
                    : "-",
                },
                {
                  title: "中介费",
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
                    (latestInitiation?.outsourceItems?.length ?? 0) > 0
                      ? `${getProjectOutsourceTotal(latestInitiation?.outsourceItems)} 元`
                      : "-",
                },
                {
                  title: "外包费用明细",
                  value: latestInitiation?.outsourceInfo?.trim()
                    ? latestInitiation.outsourceInfo
                    : (latestInitiation?.outsourceItems?.length ?? 0) > 0
                      ? formatProjectOutsourceItemsText(
                          latestInitiation?.outsourceItems,
                        )
                      : "-",
                },
                {
                  title: "外包费用备注",
                  value: latestInitiation?.outsourceRemark?.trim() || "-",
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
                    (latestInitiation?.executionCostTypes?.length ?? 0) > 0 &&
                    (latestInitiation?.executionCostTypes ?? []).some(
                      (item) => item?.value,
                    ) ? (
                      <MultipleSelectOptions
                        field={executionCostField}
                        options={latestInitiation?.executionCostTypes}
                      />
                    ) : (
                      "-"
                    ),
                },
                ...(hasOtherExecutionCostType
                  ? [
                      {
                        title: "其他执行费用备注",
                        value: latestInitiation?.otherExecutionCostRemark?.trim() || "-",
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
    <Empty description="暂无立项申请数据" />
  );

  return (
    <>
      {mode === "full" ? (
        <Card title="立项申请" extra={<Space>{actionsNode}</Space>}>
          {contentNode}
        </Card>
      ) : null}
      {mode === "actions" ? <Space>{actionsNode}</Space> : null}
      {mode === "content" ? contentNode : null}

      {mode !== "content" ? (
        <>
          <ProjectInitiationModal
            open={modalOpen}
            onCancel={() => setModalOpen(false)}
            projectId={projectId}
            latestInitiation={latestInitiation}
            prefillInitiation={modalPrefillInitiation}
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

export default ProjectInitiationCard;
