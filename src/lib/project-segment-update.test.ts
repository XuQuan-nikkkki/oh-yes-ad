import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectSegmentScalarUpdate,
  hasProjectSegmentStatusUpdate,
} from "./project-segment-update";

test("status-only patch leaves owner and dates omitted", () => {
  const body = { status: { value: "进行中", color: "#1677ff" } };

  assert.deepEqual(buildProjectSegmentScalarUpdate(body), {});
  assert.equal(hasProjectSegmentStatusUpdate(body), true);
});

test("explicit nulls still clear owner and dates", () => {
  assert.deepEqual(
    buildProjectSegmentScalarUpdate({ ownerId: null, startDate: null, endDate: null }),
    { ownerId: null, startDate: null, endDate: null },
  );
});

test("submitted values are mapped and dueDate remains a supported end-date alias", () => {
  const startDate = "2026-08-01T00:00:00.000Z";
  const dueDate = "2026-08-31T00:00:00.000Z";

  assert.deepEqual(
    buildProjectSegmentScalarUpdate({
      name: "制作",
      projectId: "project-1",
      ownerId: "employee-1",
      startDate,
      dueDate,
    }),
    {
      name: "制作",
      projectId: "project-1",
      ownerId: "employee-1",
      startDate: new Date(startDate),
      endDate: new Date(dueDate),
    },
  );
});

test("omitted status is distinguishable from an explicit status clear", () => {
  assert.equal(hasProjectSegmentStatusUpdate({ ownerId: "employee-1" }), false);
  assert.equal(hasProjectSegmentStatusUpdate({ status: null }), true);
});
