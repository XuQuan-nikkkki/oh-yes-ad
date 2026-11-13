"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Segmented, Spin } from "antd";
import MultipleSelectOptions from "@/components/MultipleSelectOptions";
import ProjectExecutionCostMonitoringCard from "@/components/execution-cost-monitoring/ProjectExecutionCostMonitoringCard";
import { EXECUTION_COST_FIELD } from "@/lib/execution-cost";
import ProjectReimbursementCreateAction from "./ProjectReimbursementCreateAction";
import ProjectReimbursementRecordsContent from "./ProjectReimbursementRecordsContent";
import styles from "./ProjectWorkspaceReimbursements.module.css";

type BudgetItem = {
  budgetAmount: number | string | null;
  costTypeOption?: { id?: string; value?: string | null; color?: string | null; field?: string } | null;
};

type Reimbursement = {
  amount: number | string | null;
};

type Props = {
  projectId: string;
  projectName: string;
  employees: { id: string; name: string }[];
  canManageReimbursements: boolean;
};

const toNumber = (value: number | string | null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const money = (value: number) => `${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`;

export default function ProjectWorkspaceReimbursements({ projectId, projectName, employees, canManageReimbursements }: Props) {
  const [view, setView] = useState<"summary" | "records">("summary");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [structureResponse, reimbursementResponse] = await Promise.all([
        fetch(`/api/project-financial-structures?projectId=${projectId}`, { cache: "no-store" }),
        fetch(`/api/projects/${projectId}/reimbursements`, { cache: "no-store" }),
      ]);
      if (!structureResponse.ok || !reimbursementResponse.ok) throw new Error("读取报销汇总失败");
      const structures = await structureResponse.json() as Array<{ executionCostItems?: BudgetItem[] }>;
      const records = await reimbursementResponse.json() as Reimbursement[];
      setBudgetItems(Array.isArray(structures?.[0]?.executionCostItems) ? structures[0].executionCostItems : []);
      setReimbursements(Array.isArray(records) ? records : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent<{ projectId?: string }>).detail?.projectId === projectId) void load();
    };
    window.addEventListener("project-reimbursements-updated", handler);
    return () => window.removeEventListener("project-reimbursements-updated", handler);
  }, [load, projectId]);

  const summary = useMemo(() => {
    const budget = budgetItems.reduce((total, item) => total + toNumber(item.budgetAmount), 0);
    const used = reimbursements.reduce((total, item) => total + toNumber(item.amount), 0);
    return { budget, used, remaining: budget - used };
  }, [budgetItems, reimbursements]);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h2>项目报销记录</h2>
      </div>

      {error ? <Alert type="error" showIcon message="报销汇总读取失败" description="请稍后重新打开此页面。" /> : <Spin spinning={loading}>
        <div className={styles.metrics}>
          <div>
            <span>执行费用预算</span>
            <strong>{money(summary.budget)}</strong>
            {budgetItems.some((item) => item.costTypeOption?.value) && <div className={styles.budgetTags}>
              <MultipleSelectOptions field={EXECUTION_COST_FIELD} options={budgetItems.map((item) => item.costTypeOption)} disabled />
            </div>}
          </div>
          <div><span>累计已报销</span><strong>{money(summary.used)}</strong><small>{reimbursements.length} 条实际报销记录</small></div>
          <div><span>剩余可报销</span><strong className={summary.remaining < 0 ? styles.overBudget : ""}>{money(summary.remaining)}</strong><small>预算减去全部已报销金额</small></div>
        </div>

        <Segmented className={styles.viewSwitch} value={view} onChange={(value) => setView(value as typeof view)} options={[{ label: "预算汇总", value: "summary" }, { label: "报销明细", value: "records" }]} />

        {view === "summary" ? <section className={styles.panel}>
          <div className={styles.panelHeader}><h3>按执行费用类别</h3></div>
          <ProjectExecutionCostMonitoringCard projectId={projectId} projectName={projectName} embedded />
        </section> : <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h3>实际报销明细</h3><span>按费用发生日期排列</span></div>
            {canManageReimbursements && <ProjectReimbursementCreateAction projectId={projectId} projectName={projectName} employees={employees} buttonLabel="添加报销" />}
          </div>
          <ProjectReimbursementRecordsContent projectId={projectId} projectName={projectName} employees={employees} canManageProject={canManageReimbursements} />
        </section>}
      </Spin>}
    </div>
  );
}
