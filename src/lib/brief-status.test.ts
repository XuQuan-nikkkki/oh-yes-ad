import assert from "node:assert/strict";
import test from "node:test";
import { getBriefStatusError } from "./brief-status";

test("需求单完成要求全部工作项已完成，暂停也算未完成", () => {
  for (const status of ["pending", "in_progress", "paused"]) {
    assert.match(getBriefStatusError([{ status: "completed" }, { status }], "completed")!, /还有 1 个工作项未完成/);
  }
  assert.equal(getBriefStatusError([{ status: "completed" }, { status: "completed" }], "completed"), null);
  assert.match(getBriefStatusError([{ status: "pending" }, { status: "paused" }], "completed")!, /还有 2 个/);
});

test("切换到非完成状态不受完成检查限制", () => {
  for (const status of ["waiting_assignment", "in_progress", "paused"]) {
    assert.equal(getBriefStatusError([{ status: "pending" }], status), null);
  }
});
