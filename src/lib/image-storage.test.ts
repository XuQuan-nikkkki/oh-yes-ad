import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_IMAGE_BYTES } from "./image-storage";

test("反馈解析保留系统图片地址和历史外部图片地址", async () => {
  const { parseFeedbackInput } = await import("./work-item-submission-input");
  const url = "/api/images/00000000-0000-4000-8000-000000000000";
  const input = parseFeedbackInput({ content: "整体说明", images: [{ url, name: "截图.png" }], adjustmentItems: [{ title: "调整", images: [{ url: "https://example.com/old.png", name: "历史图片" }] }] });
  assert.equal(input?.images[0].url, url);
  assert.equal(input?.adjustmentItems[0].images[0].url, "https://example.com/old.png");
});

test("直传元数据允许大于旧限额的图片，拒绝超限、非法大小及类型", async () => {
  const { validImageUpload } = await import("./image-upload-config");
  assert.equal(validImageUpload(10 * 1024 * 1024, "image/png"), true);
  assert.equal(validImageUpload(MAX_IMAGE_BYTES, "image/jpeg"), true);
  for (const size of [0, -1, 1.5, NaN, Infinity, MAX_IMAGE_BYTES + 1, "100"]) {
    assert.equal(validImageUpload(size, "image/png"), false);
  }
  assert.equal(validImageUpload(100, "image/svg+xml"), false);
});
