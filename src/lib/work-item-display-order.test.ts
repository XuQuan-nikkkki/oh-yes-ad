import assert from "node:assert/strict";
import test from "node:test";
import { reconcileWorkItemDisplayOrder as reconcile } from "./work-item-display-order";

test("异步首次加载按状态排序，同状态保留接口的创建时间顺序", () => {
  const empty = reconcile({}, [{ id: "brief", workItems: [] }]);
  const result = reconcile(empty, [{ id: "brief", workItems: [
    { id: "paused", status: "paused" }, { id: "active", status: "in_progress" },
    { id: "z", status: "pending" }, { id: "a", status: "pending" },
  ] }]);
  assert.deepEqual(result.brief, ["z", "a", "active", "paused"]);
});

test("状态变化、接口顺序变化和刷新不会重排，重新初始化才排序", () => {
  const initial = reconcile({}, [{ id: "b", workItems: [{ id: "1", status: "pending" }, { id: "2", status: "in_progress" }] }]);
  const updated = [{ id: "b", workItems: [{ id: "2", status: "pending" }, { id: "1", status: "paused" }] }];
  assert.equal(reconcile(initial, updated), initial);
  assert.deepEqual(reconcile({}, updated).b, ["2", "1"]);
});

test("新增追加、删除移除，完成不丢失原位置", () => {
  const initial = { b: ["1", "2", "3"] };
  const result = reconcile(initial, [{ id: "b", workItems: [
    { id: "4", status: "pending" }, { id: "3", status: "completed" }, { id: "1", status: "paused" },
  ] }]);
  assert.deepEqual(result.b, ["1", "3", "4"]);
  assert.deepEqual(initial.b, ["1", "2", "3"]);
});
