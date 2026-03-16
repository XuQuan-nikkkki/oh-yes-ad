"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Progress, Space, Spin, Tag, Typography } from "antd";

type SystemOperationAction = "migrate-notion" | "sync-option-colors";
type SystemOperationJobStatus = "running" | "success" | "failed";

type SystemOperationJob = {
  id: string;
  action: SystemOperationAction;
  status: SystemOperationJobStatus;
  startedAt: string;
  endedAt?: string;
  logs: string[];
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
  exitCode?: number;
};

const actionLabelMap: Record<SystemOperationAction, string> = {
  "migrate-notion": "执行 migrate-notion",
  "sync-option-colors": "同步 option color",
};

const statusTagMap: Record<
  SystemOperationJobStatus,
  { color: string; label: string }
> = {
  running: { color: "processing", label: "运行中" },
  success: { color: "success", label: "成功" },
  failed: { color: "error", label: "失败" },
};

const SystemOperationsPanel = () => {
  const [startingAction, setStartingAction] =
    useState<SystemOperationAction | null>(null);
  const [activeJob, setActiveJob] = useState<SystemOperationJob | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pickFallbackJob = (
    jobs: SystemOperationJob[],
    currentJobId: string,
    action: SystemOperationAction,
  ) => {
    const sameId = jobs.find((item) => item.id === currentJobId);
    if (sameId) return sameId;
    const sameActionRunning = jobs.find(
      (item) => item.action === action && item.status === "running",
    );
    if (sameActionRunning) return sameActionRunning;
    return jobs.find((item) => item.action === action) ?? null;
  };

  const fetchJob = async (jobId: string, action: SystemOperationAction) => {
    const res = await fetch(`/api/system-operations?id=${jobId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const payload = (await res.json()) as {
      job?: SystemOperationJob | null;
      jobs?: SystemOperationJob[];
      missing?: boolean;
    };
    if (payload.job) return payload.job;
    if (Array.isArray(payload.jobs) && payload.jobs.length > 0) {
      const fallback = pickFallbackJob(payload.jobs, jobId, action);
      if (fallback) return fallback;
    }
    return null;
  };

  const startJob = async (action: SystemOperationAction) => {
    setStartingAction(action);
    setErrorText(null);
    try {
      const res = await fetch("/api/system-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const payload = (await res.json()) as { job?: SystemOperationJob };
      if (payload.job) {
        setActiveJob(payload.job);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "触发脚本失败");
    } finally {
      setStartingAction(null);
    }
  };

  useEffect(() => {
    if (!activeJob?.id || activeJob.status !== "running") return;

    const timer = setInterval(async () => {
      try {
        const nextJob = await fetchJob(activeJob.id, activeJob.action);
        if (nextJob) {
          setActiveJob(nextJob);
          setErrorText(null);
        }
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "获取任务进度失败");
      }
    }, 1200);

    return () => {
      clearInterval(timer);
    };
  }, [activeJob?.id, activeJob?.status]);

  const refreshCurrentJob = async () => {
    if (!activeJob?.id) return;
    setLoadingJob(true);
    setErrorText(null);
    try {
      const nextJob = await fetchJob(activeJob.id, activeJob.action);
      if (nextJob) {
        setActiveJob(nextJob);
        setErrorText(null);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "获取任务进度失败");
    } finally {
      setLoadingJob(false);
    }
  };

  const progressStatus = useMemo(() => {
    if (!activeJob) return "normal" as const;
    if (activeJob.status === "failed") return "exception" as const;
    if (activeJob.status === "success") return "success" as const;
    return "active" as const;
  }, [activeJob]);

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <Card>
        <Space wrap>
          <Button
            type="primary"
            loading={startingAction === "migrate-notion"}
            onClick={() => void startJob("migrate-notion")}
          >
            触发 migrate-notion
          </Button>
          <Button
            type="primary"
            loading={startingAction === "sync-option-colors"}
            onClick={() => void startJob("sync-option-colors")}
          >
            触发同步 option color
          </Button>
          <Button
            disabled={!activeJob}
            loading={loadingJob}
            onClick={() => void refreshCurrentJob()}
          >
            刷新进度
          </Button>
        </Space>
      </Card>

      <Card title="执行进度">
        {!activeJob ? (
          <Typography.Text type="secondary">暂无执行任务</Typography.Text>
        ) : (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            <Space wrap>
              <span>任务：{actionLabelMap[activeJob.action]}</span>
              <Tag color={statusTagMap[activeJob.status].color}>
                {statusTagMap[activeJob.status].label}
              </Tag>
              <span>
                开始时间：{new Date(activeJob.startedAt).toLocaleString("zh-CN")}
              </span>
              {activeJob.endedAt ? (
                <span>
                  结束时间：{new Date(activeJob.endedAt).toLocaleString("zh-CN")}
                </span>
              ) : null}
            </Space>
            <Progress
              percent={Math.max(0, Math.min(100, activeJob.progressPercent || 0))}
              status={progressStatus}
            />
            <Typography.Text type="secondary">
              步骤：{activeJob.completedSteps}/{activeJob.totalSteps}
            </Typography.Text>
            <Card
              size="small"
              styles={{ body: { padding: 12 } }}
              style={{ background: "#0f172a", color: "#e5e7eb" }}
            >
              <div
                style={{
                  maxHeight: "48vh",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {activeJob.logs.length === 0 ? (
                  <Spin size="small" />
                ) : (
                  activeJob.logs.join("\n")
                )}
              </div>
            </Card>
          </Space>
        )}
      </Card>

      {errorText ? <Alert type="error" message={errorText} showIcon /> : null}
    </Space>
  );
};

export default SystemOperationsPanel;
