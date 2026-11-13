import assert from "node:assert/strict";
import test from "node:test";
import { getWorkItemStatusError } from "./work-item-status";

const content = { isFinal: false, contentText: "文案正文", resources: [] };
const base = { submissionEnabled: true, sourceFilePolicy: "OPTIONAL", submissions: [] };

test("无提交内容的工作项及非完成状态不受提交校验限制", () => {
  assert.equal(getWorkItemStatusError({ ...base, submissionEnabled: false, sourceFilePolicy: "REQUIRED" }, "completed"), null);
  for (const status of ["pending", "in_progress", "paused"]) {
    assert.equal(getWorkItemStatusError(base, status), null);
  }
});

test("需要提交时，空记录、空白正文与仅源文件均不算提交内容", () => {
  for (const submissions of [[], [{ ...content, contentText: "  " }], [{ ...content, contentText: null, resources: [{ kind: "SOURCE", url: "/source.zip" }] }]]) {
    assert.match(getWorkItemStatusError({ ...base, submissions }, "completed")!, /尚未提交内容/);
  }
});

test("有提交但未确定最终版不能完成", () => {
  assert.match(getWorkItemStatusError({ ...base, submissions: [content] }, "completed")!, /尚未确定最终版/);
});

test("最终版必须有内容；正文或成果链接都支持", () => {
  assert.match(getWorkItemStatusError({ ...base, submissions: [content, { ...content, isFinal: true, contentText: null }] }, "completed")!, /最终版缺少提交内容/);
  for (const submission of [content, { ...content, contentText: null, resources: [{ kind: "OUTPUT", url: "https://example.com/design" }] }]) {
    assert.equal(getWorkItemStatusError({ ...base, submissions: [{ ...submission, isFinal: true }] }, "completed"), null);
  }
});

test("必需源文件时，只认可最终版上的非空源文件链接", () => {
  const item = { ...base, sourceFilePolicy: "REQUIRED", submissions: [{ ...content, resources: [{ kind: "SOURCE", url: "/old.zip" }] }, { ...content, isFinal: true }] };
  assert.match(getWorkItemStatusError(item, "completed")!, /最终版尚未提交源文件链接/);
  for (const url of ["", "  "]) {
    assert.match(getWorkItemStatusError({ ...item, submissions: [{ ...content, isFinal: true, resources: [{ kind: "SOURCE", url }] }] }, "completed")!, /源文件链接/);
  }
  assert.equal(getWorkItemStatusError({ ...item, submissions: [{ ...content, isFinal: true, resources: [{ kind: "SOURCE", url: "/final.zip" }] }] }, "completed"), null);
});
