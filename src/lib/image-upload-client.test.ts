import test from "node:test";
import assert from "node:assert/strict";
import { startImageUpload } from "./image-upload-client";

test("立即开始上传，最多两个并发，成功复用，失败可重试", async () => {
  const original = globalThis.fetch;
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  let active = 0;
  let peak = 0;
  let prepares = 0;
  let fail = false;
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "PUT") {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return fail ? new Response(null, { status: 503 }) : new Response(null, { status: 200 });
    }
    const body = JSON.parse(String(options?.body));
    if (body.action === "prepare") {
      prepares++;
      return Response.json({ uploadUrl: "https://example.test/upload", url: `/api/images/${prepares}` });
    }
    throw new Error("Unexpected request");
  };
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => ({ width: 10, height: 10, close() {} }) });
  try {
    const file = new File(["image"], "test.png", { type: "image/png" });
    const tasks = Array.from({ length: 5 }, () => startImageUpload(file));
    assert.equal(tasks[2].status, "queued");
    await Promise.all(tasks.map((task) => task.promise));
    assert.equal(peak, 2);
    assert(tasks.every((task) => task.status === "done"));
    tasks[0].retry(); await tasks[0].promise;
    assert.equal(prepares, 5);
    fail = true;
    const task = startImageUpload(file);
    await assert.rejects(task.promise, /图片上传失败/);
    assert.equal(task.status, "error");
    fail = false; task.retry(); await task.promise;
    assert.equal(task.status, "done");
  } finally {
    globalThis.fetch = original;
    if (bitmapDescriptor) Object.defineProperty(globalThis, "createImageBitmap", bitmapDescriptor);
    else Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
});
