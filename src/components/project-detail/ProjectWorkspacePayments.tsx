"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Popconfirm, Segmented, Space } from "antd";
import type { Project } from "@/types/projectDetail";
import ProjectReceivableInfo from "./ProjectReceivableInfo";
import ProjectPayableInfo from "./ProjectPayableInfo";
import styles from "./ProjectWorkspacePayments.module.css";

type Props = {
  projectId: string;
  project: Project;
  canManageProject: boolean;
  canCollectReceivable: boolean;
  canManageBadDebtRecords: boolean;
  onPlansChanged: () => void;
};

export default function ProjectWorkspacePayments({
  projectId,
  project,
  canManageProject,
  canCollectReceivable,
  canManageBadDebtRecords,
  onPlansChanged,
}: Props) {
  const [view, setView] = useState<"receivable" | "payable">("receivable");
  const [receivablePlanModalOpen, setReceivablePlanModalOpen] = useState(false);
  const [receivablePlanModalMode, setReceivablePlanModalMode] = useState<"create" | "edit">("create");
  const [receivableNodeModalOpen, setReceivableNodeModalOpen] = useState(false);
  const [receivableCurrentPlan, setReceivableCurrentPlan] = useState<{ id: string } | null>(null);
  const receivableCardRef = useRef<{ handleDeletePlan: () => Promise<void> }>(null);
  const [payablePlanModalOpen, setPayablePlanModalOpen] = useState(false);
  const [payablePlanModalMode, setPayablePlanModalMode] = useState<"create" | "edit">("create");
  const [payableNodeModalOpen, setPayableNodeModalOpen] = useState(false);

  const handleReceivablePlanChange = useCallback((plan: { id: string } | null) => {
    setReceivableCurrentPlan(plan);
    onPlansChanged();
  }, [onPlansChanged]);
  const handlePayablePlanChange = useCallback(() => {
    onPlansChanged();
  }, [onPlansChanged]);

  return <div className={styles.page}>
    <h2>收付款</h2>
    <div className={styles.toolbar}>
      <Segmented
        value={view}
        onChange={(value) => setView(value as "receivable" | "payable")}
        options={[{ label: "项目收款", value: "receivable" }, { label: "项目付款", value: "payable" }]}
      />
      <Space wrap>
        {view === "receivable" ? receivableCurrentPlan ? <>
          <Button disabled={!canManageProject} onClick={() => {
            setReceivablePlanModalMode("edit");
            setReceivablePlanModalOpen(true);
          }}>修改</Button>
          <Popconfirm
            title="确定删除当前收款计划吗？删除后节点也会被删除。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              await receivableCardRef.current?.handleDeletePlan();
            }}
          >
            <Button danger disabled={!canManageProject}>删除</Button>
          </Popconfirm>
        </> : <Button type="primary" disabled={!canManageProject} onClick={() => {
          setReceivablePlanModalMode("create");
          setReceivablePlanModalOpen(true);
        }}>新增收款计划</Button> : <Button type="primary" disabled={!canManageProject} onClick={() => {
          setPayablePlanModalMode("create");
          setPayablePlanModalOpen(true);
        }}>新增付款计划</Button>}
      </Space>
    </div>
    {view === "receivable" ? (
      <ProjectReceivableInfo
        ref={receivableCardRef}
        projectId={projectId}
        project={project}
        canManageProject={canManageProject}
        canManageReceivableNodes={canCollectReceivable}
        canCollectReceivable={canCollectReceivable}
        canManageBadDebtRecords={canManageBadDebtRecords}
        planModalOpen={receivablePlanModalOpen}
        planModalMode={receivablePlanModalMode}
        onPlanModalOpenChange={setReceivablePlanModalOpen}
        onPlanModalModeChange={setReceivablePlanModalMode}
        onCurrentPlanChange={handleReceivablePlanChange}
        nodeModalOpen={receivableNodeModalOpen}
        onNodeModalOpenChange={setReceivableNodeModalOpen}
      />
    ) : (
      <ProjectPayableInfo
        projectId={projectId}
        project={project}
        canManageProject={canManageProject}
        canManagePayableActivity={canCollectReceivable}
        planModalOpen={payablePlanModalOpen}
        planModalMode={payablePlanModalMode}
        onPlanModalOpenChange={setPayablePlanModalOpen}
        onPlanModalModeChange={setPayablePlanModalMode}
        onCurrentPlanChange={handlePayablePlanChange}
        nodeModalOpen={payableNodeModalOpen}
        onNodeModalOpenChange={setPayableNodeModalOpen}
      />
    )}
  </div>;
}
