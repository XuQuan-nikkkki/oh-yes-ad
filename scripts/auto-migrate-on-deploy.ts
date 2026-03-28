import "dotenv/config";
import { spawnSync } from "node:child_process";

const truthyValues = new Set(["1", "true", "yes", "on"]);

const toBool = (value: string | undefined) =>
  Boolean(value && truthyValues.has(value.trim().toLowerCase()));

const AUTO_MIGRATE = toBool(process.env.AUTO_MIGRATE_NOTION_ON_DEPLOY);
const STRICT_MODE = toBool(process.env.AUTO_MIGRATE_NOTION_STRICT);

const runCommand = (cmd: string, args: string[]) => {
  const result = spawnSync(cmd, args, {
     stdio: "inherit",
     env: process.env,
  });
  return result.status ?? 1;
};
 const fail = (message: string) => {
   if (STRICT_MODE) {
     console.error(message);
     process.exit(1);
   }
   console.warn(`${message}（已忽略，STRICT 未开启）`);
   process.exit(0);
};

const main = () => {
   if (!AUTO_MIGRATE) {
     console.log(
       "AUTO_MIGRATE_NOTION_ON_DEPLOY 未开启，跳过自动执行 migrate-notion。",
     );
     return;
   }

   console.log("检测到开关已开启，开始自动执行 migrate-notion...");
   const migrateCode = runCommand("npx", ["tsx", "scripts/migrate-notion.ts"]);
   if (migrateCode !== 0) {
     fail(`migrate-notion 执行失败，退出码: ${migrateCode}`);
   }

   console.log("migrate-notion 完成，开始同步 option color...");
  const syncOptionColorCode = runCommand("npx", [
     "tsx",
     "scripts/sync-new-select-option-colors.ts",
   ]);
   if (syncOptionColorCode !== 0) {
     fail(`同步 option color 失败，退出码: ${syncOptionColorCode}`);
   }

   console.log("option color 同步完成，开始执行 prisma db seed...");
   const seedCode = runCommand("npx", ["prisma", "db", "seed"]);
   if (seedCode !== 0) {
     fail(`prisma db seed 执行失败，退出码: ${seedCode}`);
   }

   console.log("自动 migrate-notion + 同步 option color + seed 执行完成。");
};


 main();
