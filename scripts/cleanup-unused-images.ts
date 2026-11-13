/** 默认只报告；确认环境和候选数量后添加 --execute。仅处理本功能七天前的图片。 */
import { loadEnvConfig } from "@next/env";
import { ListObjectsV2Command, DeleteObjectsCommand, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { imageStorage, IMAGE_ID } from "../src/lib/image-storage";

loadEnvConfig(process.cwd());
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { client, bucket } = imageStorage();
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const groups = new Map<string, { keys: string[]; newest: number }>();
    let token: string | undefined;
    do {
      const page: ListObjectsV2CommandOutput = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "images/", ContinuationToken: token }));
      for (const object of page.Contents ?? []) {
        if (!object.Key || !object.LastModified) continue;
        const parts = object.Key.split("/");
        if (parts.length !== 3 || !IMAGE_ID.test(parts[1]) || !["original", "thumbnail.webp"].includes(parts[2])) continue;
        const group = groups.get(parts[1]) ?? { keys: [], newest: 0 };
        group.keys.push(object.Key);
        group.newest = Math.max(group.newest, object.LastModified.getTime());
        groups.set(parts[1], group);
      }
      token = page.NextContinuationToken;
    } while (token);
    let candidates = 0;
    const execute = process.argv.includes("--execute");
    for (const [id, group] of groups) {
      if (group.newest >= cutoff) continue;
      const url = `/api/images/${id}`;
      const refs = await Promise.all([
        prisma.workItemFeedbackImage.count({ where: { url } }),
        prisma.workItemAdjustmentItemImage.count({ where: { url } }),
        prisma.workItemSubmissionResource.count({ where: { OR: [{ url }, { thumbnailUrl: url }, { thumbnailUrl: `${url}?thumbnail=1` }] } }),
      ]);
      if (refs.some(Boolean)) continue;
      candidates++;
      if (execute) {
        const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: group.keys.map(Key => ({ Key })) } }));
        if (result.Errors?.length) throw new Error("部分对象删除失败");
      }
    }
    let pendingCandidates = 0;
    token = undefined;
    do {
      const page: ListObjectsV2CommandOutput = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "pending/", ContinuationToken: token }));
      for (const object of page.Contents ?? []) {
        const parts = object.Key?.split("/");
        if (!parts || parts.length !== 3 || !IMAGE_ID.test(parts[2]) || !object.LastModified || object.LastModified.getTime() >= cutoff) continue;
        pendingCandidates++;
        if (execute) {
          const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [{ Key: object.Key! }] } }));
          if (result.Errors?.length) throw new Error("临时对象删除失败");
        }
      }
      token = page.NextContinuationToken;
    } while (token);
    console.log(`${execute ? "已清理" : "待清理"}七天前临时上传：${pendingCandidates} 个。`);
    console.log(`${execute ? "已清理" : "待清理"}七天前未关联图片：${candidates} 组。`);
  } finally { client.destroy(); await prisma.$disconnect(); }
}
main().catch(() => { console.error("清理中止：请检查数据库和 R2 配置及权限。"); process.exitCode = 1; });
