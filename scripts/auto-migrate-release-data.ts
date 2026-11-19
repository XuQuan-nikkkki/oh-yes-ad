import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("非 Vercel 生产构建，跳过上线历史数据迁移");
} else {
  const run = (script: string, args: string[]) => {
    const result = spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
      stdio: "inherit",
      env: process.env,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`${script} 执行失败，部署构建已中止`);
    }
  };

  run("scripts/migrate-segments-to-briefs.ts", ["--deployment", "--execute", "--summary"]);
  run("scripts/verify-release-data.ts", []);
  console.log("上线历史数据迁移与核验通过");
}
