/** 仅使用生成图片验证 R2，不访问业务数据库或构造登录会话。 */
import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { DeleteObjectsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { imageStorage, createImageUpload, imageReadUrl } from "../src/lib/image-storage";
loadEnvConfig(process.cwd());
async function main() {
  const { client, bucket } = imageStorage();
  const generatedKeys: string[] = [];
  try {
    try {
      const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
      console.log("当前 CORS：", JSON.stringify(cors.CORSRules ?? []));
    } catch (error) {
      console.log("CORS 查询结果：", error instanceof Error ? error.name : "未知错误");
    }
    const bytes = await sharp(randomBytes(1536 * 1536 * 3), { raw: { width: 1536, height: 1536, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
    assert.ok(bytes.length > 4.5 * 1024 * 1024);
    const upload = await createImageUpload(bytes.length, "image/png");
    const id = upload.url.split("/").pop()!;
    generatedKeys.push(`images/${id}/original`);
    const signedHeaders = new URL(upload.uploadUrl).searchParams.get("X-Amz-SignedHeaders") || "";
    assert.ok(signedHeaders.includes("content-length") && signedHeaders.includes("content-type"));
    for (const origin of ["http://localhost:3000", "https://app.oh-yes-business.com"]) {
      const preflight = await fetch(upload.uploadUrl, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" }, signal: AbortSignal.timeout(20_000) });
      console.log("浏览器跨域预检", origin, preflight.status, preflight.headers.get("access-control-allow-origin") === origin ? "通过" : "需配置");
    }
    const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: new Uint8Array(bytes), signal: AbortSignal.timeout(120_000) });
    assert.equal(put.status, 200, `直传 HTTP ${put.status}`);
    const original = await fetch(await imageReadUrl(id));
    assert.equal(original.status, 200);
    assert.deepEqual(Buffer.from(await original.arrayBuffer()), bytes);
    console.log(`通过：${(bytes.length / 1024 / 1024).toFixed(2)} MB 单对象预签名直传及逐字节读回。`);
  } finally {
    if (generatedKeys.length) {
      const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: generatedKeys.map(Key => ({ Key })) } }));
      assert.ok(!result.Errors?.length, "测试对象清理失败");
      console.log("生成的测试对象已清理。");
    }
    client.destroy();
  }
}
main().catch(error => { console.error("直传验证失败：", error instanceof Error ? error.message : "未知错误"); process.exitCode = 1; });
