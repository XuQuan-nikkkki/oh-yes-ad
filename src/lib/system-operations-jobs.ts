import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export type SystemOperationAction = "migrate-notion" | "sync-option-colors";
export type SystemOperationJobStatus = "running" | "success" | "failed";

export type SystemOperationJob = {
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

declare global {
  var __systemOperationJobs: Map<string, SystemOperationJob> | undefined;
}

const jobsStore = globalThis.__systemOperationJobs ?? new Map<string, SystemOperationJob>();
if (!globalThis.__systemOperationJobs) {
  globalThis.__systemOperationJobs = jobsStore;
}

const ACTION_CONFIG: Record<
  SystemOperationAction,
  { args: string[]; totalSteps: number; title: string }
> = {
  "migrate-notion": {
    args: ["tsx", "scripts/migrate-notion.ts"],
    totalSteps: 18,
    title: "migrate-notion",
  },
  "sync-option-colors": {
    args: ["tsx", "scripts/sync-new-select-option-colors.ts"],
    totalSteps: 1,
    title: "sync-option-colors",
  },
};

const appendLog = (job: SystemOperationJob, raw: string) => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) {
    const withTime = `[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${line}`;
    job.logs.push(withTime);
    if (job.logs.length > 1000) {
      job.logs.shift();
    }

    if (job.action === "migrate-notion") {
      if (
        line.includes("数据库重置完成") ||
        line.includes("同步完成")
      ) {
        job.completedSteps = Math.min(job.completedSteps + 1, job.totalSteps);
        job.progressPercent = Math.min(
          99,
          Math.max(
            job.progressPercent,
            Math.round((job.completedSteps / job.totalSteps) * 100),
          ),
        );
      }
    }

    if (job.action === "sync-option-colors") {
      if (job.progressPercent < 60) {
        job.progressPercent = 60;
      }
    }
  }
};

export const getSystemOperationJob = (id: string) => jobsStore.get(id);

export const getLatestSystemOperationJobs = (limit = 20) =>
  Array.from(jobsStore.values())
    .sort(
      (left, right) =>
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
    )
    .slice(0, limit);

export const findRunningJobByAction = (action: SystemOperationAction) => {
  for (const job of jobsStore.values()) {
    if (job.action === action && job.status === "running") {
      return job;
    }
  }
  return null;
};

export const runSystemOperation = (action: SystemOperationAction) => {
  const running = findRunningJobByAction(action);
  if (running) return running;

  const config = ACTION_CONFIG[action];
  const job: SystemOperationJob = {
    id: randomUUID(),
    action,
    status: "running",
    startedAt: new Date().toISOString(),
    logs: [`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] 开始执行 ${config.title}`],
    progressPercent: 5,
    completedSteps: 0,
    totalSteps: config.totalSteps,
  };
  jobsStore.set(job.id, job);

  const child = spawn("npx", config.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk: Buffer) => {
    appendLog(job, chunk.toString("utf8"));
  });

  child.stderr.on("data", (chunk: Buffer) => {
    appendLog(job, chunk.toString("utf8"));
  });

  child.on("error", (error: Error) => {
    appendLog(job, `执行失败: ${error.message}`);
    job.status = "failed";
    job.endedAt = new Date().toISOString();
    job.progressPercent = Math.min(job.progressPercent, 99);
  });

  child.on("close", (code) => {
    const finalizeJob = (finalCode: number | null | undefined) => {
      job.exitCode = finalCode ?? undefined;
      job.endedAt = new Date().toISOString();
      if (finalCode === 0) {
        job.status = "success";
        job.completedSteps = job.totalSteps;
        job.progressPercent = 100;
        appendLog(job, `${config.title} 执行完成`);
      } else {
        job.status = "failed";
        job.progressPercent = Math.min(job.progressPercent, 99);
        appendLog(job, `${config.title} 执行失败，退出码: ${String(finalCode)}`);
      }
    };

    if (code !== 0) {
      finalizeJob(code);
      return;
    }

    if (action !== "migrate-notion") {
      finalizeJob(0);
      return;
    }

    appendLog(job, "migrate-notion 完成，开始执行 seed（prisma db seed）...");
    job.completedSteps = Math.min(job.completedSteps + 1, job.totalSteps);
    job.progressPercent = Math.min(
      99,
      Math.max(
        job.progressPercent,
        Math.round((job.completedSteps / job.totalSteps) * 100),
      ),
    );

    const seedChild = spawn("npx", ["prisma", "db", "seed"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    seedChild.stdout.on("data", (chunk: Buffer) => {
      appendLog(job, chunk.toString("utf8"));
    });

    seedChild.stderr.on("data", (chunk: Buffer) => {
      appendLog(job, chunk.toString("utf8"));
    });

    seedChild.on("error", (error: Error) => {
      appendLog(job, `seed 执行失败: ${error.message}`);
      finalizeJob(1);
    });

    seedChild.on("close", (seedCode) => {
      if (seedCode === 0) {
        appendLog(job, "seed 执行完成");
      } else {
        appendLog(job, `seed 执行失败，退出码: ${String(seedCode)}`);
      }
      finalizeJob(seedCode);
    });
  });

  return job;
};
