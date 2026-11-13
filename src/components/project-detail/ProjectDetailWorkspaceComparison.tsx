"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, Empty, Segmented, Tag } from "antd";
import dayjs from "dayjs";
import {
  AppstoreOutlined,
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { Employee, Project, WorkdayAdjustment } from "@/types/projectDetail";
import ProjectRealtimeCostTrackingTable from "./ProjectRealtimeCostTrackingTable";
import ProjectWorkspaceMembers from "./ProjectWorkspaceMembers";
import ProjectWorkspaceMilestones from "./ProjectWorkspaceMilestones";
import ProjectWorkspaceWork from "./ProjectWorkspaceWork";
import ProjectWorkspaceVendors from "./ProjectWorkspaceVendors";
import ProjectWorkspaceSubmissions from "./ProjectWorkspaceSubmissions";
import ProjectWorkspaceReimbursements from "./ProjectWorkspaceReimbursements";
import ProjectCostEstimationCard from "./ProjectCostEstimationCard";
import ProjectPricingStrategyCard from "./ProjectPricingStrategyCard";
import styles from "./ProjectDetailWorkspaceComparison.module.css";

type Workspace = "execution" | "finance";
type ExecutionTab = "overview" | "members" | "vendors" | "milestones" | "progress" | "work" | "submissions";
type LegacyDestination = { step: number; tab: string };

type Props = {
  projectId: string;
  projectName: string;
  startDate?: Project["startDate"];
  endDate?: Project["endDate"];
  costSourceMode?: Project["costSourceMode"];
  manualCost?: Project["manualCost"];
  latestCostEstimation?: Project["latestCostEstimation"];
  onCostEstimationSaved?: (latest: Project["latestCostEstimation"]) => void;
  latestInitiation?: Project["latestInitiation"];
  workdayAdjustments?: WorkdayAdjustment[];
  costTrackingActions?: ReactNode;
  onCostDownloadReady?: (downloadFn: (() => void) | null) => void;
  members: NonNullable<Project["members"]>;
  vendors: NonNullable<Project["vendors"]>;
  milestones: NonNullable<Project["milestones"]>;
  briefs: NonNullable<Project["briefs"]>;
  actualWorkEntries: NonNullable<Project["actualWorkEntries"]>;
  briefProgressContent: ReactNode;
  onCreateBrief: () => void;
  employees: Employee[];
  canManageProject: boolean;
  canManageReimbursements: boolean;
  onMembersChanged: () => Promise<void> | void;
  onOpenActualWorkCreate: () => void;
  onEditActualWork: (entry: NonNullable<Project["actualWorkEntries"]>[number]) => void;
  onDeleteActualWork: (entry: NonNullable<Project["actualWorkEntries"]>[number]) => Promise<void>;
  canManageActualWorkEntry: (entry: NonNullable<Project["actualWorkEntries"]>[number]) => boolean;
  onOpenLegacy: (destination: LegacyDestination) => void;
};

const executionLinks = [
  { label: "供应商", icon: BankOutlined, tab: "vendors" },
  { label: "里程碑", icon: CalendarOutlined, tab: "milestones" },
  { label: "需求单 / 工作项", icon: FileTextOutlined, tab: "progress" },
  { label: "项目提交内容", icon: FolderOpenOutlined, tab: "submissions" },
  { label: "工时", icon: ClockCircleOutlined, tab: "work" },
];

const financeLinks = [
  { label: "报价测算", detail: "项目成本测算、报价参考", icon: FileTextOutlined, step: 0, tab: "cost-estimation" },
  { label: "项目立项", detail: "立项申请、项目财务结构", icon: BankOutlined, step: 1, tab: "project-initiation" },
  { label: "收付款", detail: "项目收款、项目付款", icon: WalletOutlined, step: 3, tab: "receivable" },
  { label: "成本追踪", detail: "收入、税费、成本明细与利润分配", icon: DollarOutlined, step: 4, tab: "realtime-cost" },
  { label: "项目报销记录", detail: "查看和登记项目报销", icon: FileTextOutlined, step: 4, tab: "expense-records" },
];

const statusLabels: Record<string, string> = {
  in_progress: "进行中",
  completed: "已完成",
  paused: "暂停",
  waiting_assignment: "待分配任务",
  pending: "待推进",
};

const summarizeStatuses = (statuses: string[]) =>
  ["in_progress", "completed", "paused", "waiting_assignment", "pending"]
    .map((status) => {
      const count = statuses.filter((value) => value === status).length;
      return count ? `${statusLabels[status]} ${count}` : null;
    })
    .filter(Boolean)
    .join(" / ");

const milestoneDate = (milestone: NonNullable<Project["milestones"]>[number]) => {
  const raw = milestone.endAt ?? milestone.startAt ?? milestone.date;
  const parsed = raw ? dayjs(raw) : null;
  return parsed?.isValid() ? parsed : null;
};

export default function ProjectDetailWorkspaceComparison({
  projectId,
  projectName,
  startDate,
  endDate,
  costSourceMode,
  manualCost,
  latestCostEstimation,
  onCostEstimationSaved,
  latestInitiation,
  workdayAdjustments,
  costTrackingActions,
  onCostDownloadReady,
  members,
  vendors,
  milestones,
  briefs,
  actualWorkEntries,
  briefProgressContent,
  onCreateBrief,
  employees,
  canManageProject,
  canManageReimbursements,
  onMembersChanged,
  onOpenActualWorkCreate,
  onEditActualWork,
  onDeleteActualWork,
  canManageActualWorkEntry,
  onOpenLegacy,
}: Props) {
  const [workspace, setWorkspace] = useState<Workspace>("execution");
  const [activeExecution, setActiveExecution] = useState<ExecutionTab>("overview");
  const [activeFinance, setActiveFinance] = useState<"overview" | "quote" | "cost" | "expenses">("overview");
  const [activeQuoteTab, setActiveQuoteTab] = useState<"cost-estimation" | "pricing-reference">("cost-estimation");
  const [financeCounts, setFinanceCounts] = useState<{ receivable: number | null; payable: number | null; reimbursements: number | null }>({ receivable: null, payable: null, reimbursements: null });
  const loadFinanceCounts = useCallback(async () => {
    const count = async (url: string) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return null;
        const rows: unknown = await response.json();
        return Array.isArray(rows) ? rows.length : null;
      } catch {
        return null;
      }
    };
    const [receivable, payable, reimbursements] = await Promise.all([
      count(`/api/project-receivable-plans?projectId=${encodeURIComponent(projectId)}`),
      count(`/api/project-payable-plans?projectId=${encodeURIComponent(projectId)}`),
      count(`/api/projects/${encodeURIComponent(projectId)}/reimbursements`),
    ]);
    setFinanceCounts({ receivable, payable, reimbursements });
  }, [projectId]);
  useEffect(() => {
    if (workspace !== "finance") return;
    const initialLoad = window.setTimeout(() => { void loadFinanceCounts(); }, 0);
    const refresh = () => { void loadFinanceCounts(); };
    window.addEventListener("project-reimbursements-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("project-reimbursements-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [workspace, loadFinanceCounts]);
  const financeBadge = (tab: string) => {
    if (tab === "cost-estimation") return latestCostEstimation ? `v${latestCostEstimation.version}` : null;
    if (tab === "project-initiation") return latestInitiation ? `v${latestInitiation.version}` : null;
    if (tab === "receivable") return financeCounts.receivable !== null && financeCounts.payable !== null
      ? `应收 ${financeCounts.receivable} / 应付 ${financeCounts.payable}` : null;
    if (tab === "realtime-cost") return costSourceMode === "MANUAL" ? "人工录入" : "自动计算";
    if (tab === "expense-records") return financeCounts.reimbursements !== null ? `${financeCounts.reimbursements} 条` : null;
    return null;
  };
  const workItemCount = briefs.reduce((total, brief) => total + (brief.workItems?.length ?? 0), 0);
  const submissionCount = briefs.reduce((total, brief) => total + (brief.workItems ?? []).reduce((count, item) => count + (item.submissions?.length ?? 0), 0), 0);
  const workItems = briefs.flatMap((brief) => (brief.workItems ?? []).map((item) => ({ brief, item })));
  const currentWorkItems = workItems.filter(({ item }) => item.status === "in_progress");
  const today = dayjs();
  const milestoneSummary = [
    ["即将到来", milestones.filter((milestone) => milestoneDate(milestone)?.isAfter(today, "day")).length],
    ["今天", milestones.filter((milestone) => milestoneDate(milestone)?.isSame(today, "day")).length],
    ["日期已过", milestones.filter((milestone) => milestoneDate(milestone)?.isBefore(today, "day")).length],
  ].filter(([, count]) => count).map(([label, count]) => `${label} ${count}`).join(" / ");
  const recentMilestones = [...milestones].sort((left, right) => {
    const leftDate = milestoneDate(left)?.valueOf() ?? -Infinity;
    const rightDate = milestoneDate(right)?.valueOf() ?? -Infinity;
    return rightDate - leftDate;
  }).slice(0, 4);
  const memberGroups = [...members.reduce((groups, member) => {
    const group = member.function || "其他";
    groups.set(group, [...(groups.get(group) ?? []), member]);
    return groups;
  }, new Map<string, typeof members>()).entries()]
    .sort(([left], [right]) => {
      const order = ["项目组", "设计组"];
      const rank = (group: string) => order.indexOf(group) < 0 ? order.length : order.indexOf(group);
      return rank(left) - rank(right) || left.localeCompare(right, "zh-CN");
    });
  const submittedWorkItemCount = workItems.filter(({ item }) => (item.submissions?.length ?? 0) > 0).length;

  return (
    <>
      <div className={styles.switch} role="group" aria-label="项目内容分区">
        <button type="button" className={workspace === "execution" ? styles.selected : ""}
          aria-pressed={workspace === "execution"} onClick={() => setWorkspace("execution")}>
          <AppstoreOutlined /><strong>项目执行</strong><span>人员、供应商、里程碑、需求单与工作项、工时和提交内容</span>
        </button>
        <button type="button" className={workspace === "finance" ? styles.selected : ""}
          aria-pressed={workspace === "finance"} onClick={() => { if (workspace === "finance") void loadFinanceCounts(); setWorkspace("finance"); setActiveFinance("overview"); }}>
          <WalletOutlined /><strong>商务财务</strong><span>报价、立项、收付款、成本与报销</span>
        </button>
      </div>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={workspace === "execution" ? "项目执行内容" : "商务财务内容"}>
          {workspace === "execution" ? <>
            <button type="button" className={activeExecution === "overview" ? styles.activeItem : ""}
              aria-current={activeExecution === "overview" ? "page" : undefined} onClick={() => setActiveExecution("overview")}>
              <AppstoreOutlined /><span>执行概览</span>
            </button>
            <button type="button" className={activeExecution === "members" ? styles.activeItem : ""}
              aria-current={activeExecution === "members" ? "page" : undefined} onClick={() => setActiveExecution("members")}>
              <TeamOutlined /><span>人员信息</span><em>{members.length}</em>
            </button>
            {executionLinks.map(({ label, icon: Icon, tab }) => (
              <button type="button" key={tab} className={tab === activeExecution ? styles.activeItem : ""}
                aria-current={tab === activeExecution ? "page" : undefined}
                onClick={() => tab === "vendors" || tab === "milestones" || tab === "progress" || tab === "work" || tab === "submissions"
                  ? setActiveExecution(tab)
                  : onOpenLegacy({ step: 2, tab })}>
                <Icon /><span>{label}</span>{tab === "vendors" && <em>{vendors.length}</em>}{tab === "milestones" && <em>{milestones.length}</em>}{tab === "progress" && <em>{briefs.length} / {workItemCount}</em>}{tab === "work" && <em>{actualWorkEntries.length}</em>}{tab === "submissions" && <em>{submissionCount}</em>}
              </button>
            ))}
          </> : financeLinks.map(({ label, icon: Icon, step, tab }) => (
            <button type="button" key={tab} className={(tab === "cost-estimation" && activeFinance === "quote") || (tab === "expense-records" && activeFinance === "expenses") || (tab === "realtime-cost" && activeFinance === "cost") ? styles.activeItem : ""}
              aria-current={(tab === "cost-estimation" && activeFinance === "quote") || (tab === "expense-records" && activeFinance === "expenses") || (tab === "realtime-cost" && activeFinance === "cost") ? "page" : undefined}
              onClick={() => {
                if (tab === "expense-records") setActiveFinance("expenses");
                else if (tab === "realtime-cost") setActiveFinance("cost");
                else if (tab === "cost-estimation") setActiveFinance("quote");
                else { setActiveFinance("overview"); onOpenLegacy({ step, tab }); }
              }}>
              <Icon /><span>{label}</span>{financeBadge(tab) && <em>{financeBadge(tab)}</em>}
            </button>
          ))}
        </nav>

        <section className={styles.content} aria-label={workspace === "execution" ? ({ overview: "执行概览", members: "人员信息", vendors: "供应商", milestones: "里程碑", progress: "需求单 / 工作项", work: "工时", submissions: "项目提交内容" }[activeExecution]) : activeFinance === "expenses" ? "项目报销记录" : activeFinance === "cost" ? "成本追踪" : activeFinance === "quote" ? "报价测算" : "商务财务导航"}>
          {workspace === "execution" ? <>
            {activeExecution === "overview" ? <div><h2 className={styles.overviewTitle}>执行概览</h2><div className={styles.overview}>
              <div className={styles.overviewMain}>
                <div className={styles.metrics}>
                  {[
                    { label: "需求单", value: briefs.length, caption: summarizeStatuses(briefs.map((brief) => brief.status)), tab: "progress" as ExecutionTab },
                    { label: "工作项", value: workItems.length, caption: summarizeStatuses(workItems.map(({ item }) => item.status)), tab: "progress" as ExecutionTab },
                    { label: "里程碑", value: milestones.length, caption: milestoneSummary, tab: "milestones" as ExecutionTab },
                    { label: "实际工时记录", value: actualWorkEntries.length, caption: "", tab: "work" as ExecutionTab },
                  ].map(({ label, value, caption, tab }) => <button type="button" className={styles.metric} key={label} onClick={() => setActiveExecution(tab)}>
                    <span>{label}</span><strong>{value}</strong>{caption && <small>{caption}</small>}
                  </button>)}
                </div>
                <section className={styles.overviewPanel}>
                  <div className={styles.overviewHeading}><h2>当前工作项</h2><Button type="link" onClick={() => setActiveExecution("progress")}>查看全部 →</Button></div>
                  {currentWorkItems.length ? <div className={styles.overviewTable}>
                    <div className={`${styles.overviewRow} ${styles.overviewRowHead}`}><span>所属需求单</span><span>工作项</span><span>状态</span><span>提交</span></div>
                    {currentWorkItems.map(({ brief, item }) => <div className={styles.overviewRow} key={item.id}>
                      <span className={styles.overviewMuted}>{brief.title}</span><strong>{item.title}</strong><Tag color="blue">进行中</Tag>
                      <span className={styles.overviewMuted}>{item.submissionEnabled === false ? "无需提交" : item.submissions?.length ? "已有提交" : "暂无提交"}</span>
                    </div>)}
                  </div> : <Empty description="暂无进行中的工作项" />}
                </section>
                <section className={styles.overviewPanel}>
                  <div className={styles.overviewHeading}><h2>项目里程碑</h2><Button type="link" onClick={() => setActiveExecution("milestones")}>查看全部 {milestones.length} 条 →</Button></div>
                  {recentMilestones.length ? recentMilestones.map((milestone) => <div className={styles.overviewMilestone} key={milestone.id}>
                    <time>{milestoneDate(milestone)?.format("YYYY/MM/DD") ?? "日期待定"}</time><strong>{milestone.name}</strong><Tag>{milestone.typeOption?.value ?? milestone.type ?? "未分类"}</Tag>
                  </div>) : <Empty description="暂无里程碑" />}
                </section>
              </div>
              <aside className={styles.overviewAside}>
                <section className={styles.overviewPanel}>
                  <div className={styles.overviewHeading}><h2>项目成员</h2><Button type="link" onClick={() => setActiveExecution("members")}>查看</Button></div>
                  {memberGroups.length ? memberGroups.map(([group, people]) => <div className={styles.memberGroup} key={group}>
                    <span>{group}</span><div>{[...(people ?? [])].sort((left, right) => Number(left.employmentStatus === "离职") - Number(right.employmentStatus === "离职") || left.name.localeCompare(right.name, "zh-CN")).map((person) =>
                      <Tag key={person.id}>{person.name}{person.employmentStatus === "离职" ? "（离职）" : ""}</Tag>)}</div>
                  </div>) : <Empty description="暂无项目成员" />}
                </section>
                <section className={styles.overviewPanel}>
                  <div className={styles.overviewHeading}><h2>合作供应商</h2><Button type="link" onClick={() => setActiveExecution("vendors")}>查看</Button></div>
                  {vendors.length ? <strong>{vendors.map((vendor) => vendor.name).join("、")}</strong> : <Empty description="暂无合作供应商" />}
                </section>
                <section className={styles.overviewPanel}>
                  <div className={styles.overviewHeading}><h2>项目提交内容</h2><Button type="link" onClick={() => setActiveExecution("submissions")}>查看</Button></div>
                  <strong className={styles.overviewCount}>{submissionCount}</strong><span className={styles.overviewMuted}> 条提交版本，来自 {submittedWorkItemCount} 个工作项</span>
                </section>
              </aside>
            </div></div> : activeExecution === "members" ? <ProjectWorkspaceMembers projectId={projectId} members={members} employees={employees}
              canManageProject={canManageProject} onMembersChanged={onMembersChanged} /> : activeExecution === "vendors" ?
              <ProjectWorkspaceVendors projectId={projectId} vendors={vendors} /> : activeExecution === "milestones" ?
              <ProjectWorkspaceMilestones milestones={milestones} /> : activeExecution === "progress" ?
              <div>
                <div className={styles.progressToolbar}>
                  <h2>需求单 / 工作项</h2>
                  {canManageProject && <Button type="primary" onClick={onCreateBrief}>创建需求单</Button>}
                </div>
                {briefProgressContent}
              </div> : activeExecution === "submissions" ?
              <ProjectWorkspaceSubmissions briefs={briefs} /> :
              <ProjectWorkspaceWork entries={actualWorkEntries} members={members} onCreate={onOpenActualWorkCreate}
                onEdit={onEditActualWork} onDelete={onDeleteActualWork} canManageEntry={canManageActualWorkEntry} />}
          </> : activeFinance === "quote" ? <div className={styles.quotePage}>
            <h2>报价测算</h2>
            <div className={styles.quoteToolbar}>
              <Segmented
                value={activeQuoteTab}
                onChange={(value) => setActiveQuoteTab(value as "cost-estimation" | "pricing-reference")}
                options={[{ label: "成本测算", value: "cost-estimation" }, { label: "报价参考", value: "pricing-reference" }]}
              />
              {activeQuoteTab === "cost-estimation" ? (
                <ProjectCostEstimationCard
                  mode="actions"
                  projectId={projectId}
                  projectName={projectName}
                  projectMembers={members}
                  latestCostEstimation={latestCostEstimation}
                  employees={employees}
                  onSaved={onCostEstimationSaved}
                />
              ) : (
                <ProjectPricingStrategyCard
                  mode="actions"
                  projectId={projectId}
                  projectName={projectName}
                  latestCostEstimation={latestCostEstimation}
                />
              )}
            </div>
            {activeQuoteTab === "cost-estimation" ? (
              <ProjectCostEstimationCard
                mode="content"
                workspaceLayout
                projectId={projectId}
                projectName={projectName}
                projectMembers={members}
                latestCostEstimation={latestCostEstimation}
                employees={employees}
              />
            ) : (
              <ProjectPricingStrategyCard
                mode="content"
                projectId={projectId}
                projectName={projectName}
                latestCostEstimation={latestCostEstimation}
              />
            )}
          </div> : activeFinance === "cost" ? <div className={styles.costPage}>
            <div className={styles.costPageHeader}><h2>成本追踪</h2>{costTrackingActions}</div>
            <ProjectRealtimeCostTrackingTable projectId={projectId} projectName={projectName}
              startDate={startDate} endDate={endDate} costSourceMode={costSourceMode}
              manualCost={manualCost} latestInitiation={latestInitiation} members={members}
              actualWorkEntries={actualWorkEntries} workdayAdjustments={workdayAdjustments}
              onDownloadReady={onCostDownloadReady} embedded />
          </div> : activeFinance === "expenses" ? <ProjectWorkspaceReimbursements projectId={projectId} projectName={projectName}
            employees={members.map((member) => ({ id: member.id, name: member.name }))}
            canManageReimbursements={canManageReimbursements} /> : <>
            <div className={styles.financeGrid}>
              {financeLinks.map(({ label, detail, icon: Icon, step, tab }) => (
                <button type="button" key={tab} onClick={() => tab === "cost-estimation" ? setActiveFinance("quote") : tab === "expense-records" ? setActiveFinance("expenses") : tab === "realtime-cost" ? setActiveFinance("cost") : onOpenLegacy({ step, tab })}>
                  <Icon /><span><strong>{label}</strong><small>{detail}</small></span><span className={styles.linkText}>{tab === "cost-estimation" || tab === "realtime-cost" || tab === "expense-records" ? "进入 →" : "查看现有内容 →"}</span>
                </button>
              ))}
            </div>
          </>}
        </section>
      </div>
    </>
  );
}
