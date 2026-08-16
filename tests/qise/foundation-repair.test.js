/**
 * B-015 foundation repair.
 *
 * Every test here must fail when the production code it names is broken.
 * A test that re-implements the logic locally and asserts on its own copy
 * proves nothing; that was the defect this file was rewritten to remove.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpretReading, planSegment, shouldResetBaseline, BASELINE_VERSION,
} from "../../src/qise/baseline.js";

const AXES = { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 1, run: 1 };
const METRICS = {
  ming: 1, run: 1, hueVector: { a: 0, b: 0 },
  meanL: 50, meanChroma: 10, periorbitalL: 50, basis: "x",
};
const row = (day, over = {}) => ({
  axes: { ...AXES }, valid: true,
  timestampIso: `2026-06-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  canonicalDay: `2026-06-${String(day).padStart(2, "0")}`,
  baselineVersion: BASELINE_VERSION, captureClass: "auto", lineageId: "v1",
  ...over,
});
const read = (history) => interpretReading(METRICS, history, {
  timestampIso: "2026-06-20T00:00:00.000Z", captureMode: "auto",
}).state;

/* T2 — the capture-class reset, called the way production calls it. */

test("capture-class reset fires from the PRODUCTION argument shape", () => {
  // In finish(), `current` is metrics.corrected + a timestamp. It carries no
  // captureClass and no captureMode. If the option is not read, nothing else
  // supplies the class and the reset silently never fires.
  const previous = row(1, { captureClass: "auto" });
  const current = { ...METRICS, timestampIso: "2026-06-02T00:00:00.000Z" };

  const changed = shouldResetBaseline(previous, current, { captureClass: "upload" });
  assert.deepEqual(changed.reasons, ["capture_mode_changed"]);
  assert.equal(changed.reset, true);

  const same = shouldResetBaseline(previous, current, { captureClass: "auto" });
  assert.deepEqual(same.reasons, []);
});

test("planSegment starts a fresh lineage when the capture class changes", () => {
  const history = [row(1), row(2), row(3), row(4)];
  const plan = planSegment(history, {
    timestampIso: "2026-06-05T00:00:00.000Z",
    canonicalDay: "2026-06-05",
    captureClass: "upload",          // history is all "auto"
    current: METRICS,
  });
  assert.deepEqual(plan.reset.reasons, ["capture_mode_changed"]);
  assert.deepEqual(plan.history, []);
  assert.notEqual(plan.lineageId, "v1");
});

/* T3 — segmentation genuinely excludes non-matching history. */

test("off-version and off-class rows are excluded from the baseline itself", () => {
  // BASELINE_EXCLUDE_RECENT holds the newest three rows out of the window, so
  // the contaminants have to sit at the OLD end to be eligible at all. Two of
  // them, because the centre is a median and one outlier is shrugged off.
  //
  // Asserting on the baseline VALUE rather than the calibrating/read state is
  // deliberate: a state assertion passes or fails on where the history length
  // happens to sit relative to a threshold, which is not the same thing as
  // proving the filter ran.
  const clean = [1, 2, 3, 4, 5, 6].map((d) => row(d, { axes: { ...AXES, ming: 5 } }));
  const dirty = (over) => [
    row(1, { axes: { ...AXES, ming: 50 }, ...over }),
    row(2, { axes: { ...AXES, ming: 50 }, ...over }),
    ...clean.slice(2),
  ];

  const base = (h) => interpretReading(METRICS, h, {
    timestampIso: "2026-06-20T00:00:00.000Z", captureMode: "auto",
  }).baseline.axes.ming;

  assert.equal(base(clean), 5);
  assert.notEqual(base(dirty({})), 5, "control: in-segment outliers DO move the baseline");
  assert.equal(base(dirty({ baselineVersion: "v1" })), 5, "off-version rows must not reach the baseline");
  assert.equal(base(dirty({ captureClass: "upload" })), 5, "off-class rows must not reach the baseline");
});

/* T4 — the canonical-day retake, through the production planner. */

test("planSegment nominates the same-day row for deletion and drops it", () => {
  const history = [row(1), row(2), row(3)];
  const plan = planSegment(history, {
    timestampIso: "2026-06-03T11:00:00.000Z",
    canonicalDay: "2026-06-03",       // a retake of day 3
    captureClass: "auto",
    current: METRICS,
  });
  assert.equal(plan.replacedTimestampIso, "2026-06-03T00:00:00.000Z");
  assert.equal(plan.history.length, 2);
  assert.equal(plan.history.some((r) => r.canonicalDay === "2026-06-03"), false);
});

test("planSegment nominates nothing when the day is new", () => {
  const plan = planSegment([row(1), row(2)], {
    timestampIso: "2026-06-03T00:00:00.000Z",
    canonicalDay: "2026-06-03",
    captureClass: "auto",
    current: METRICS,
  });
  assert.equal(plan.replacedTimestampIso, null);
  assert.equal(plan.history.length, 2);
});

/* Lineage: the boundary a reset creates must survive the NEXT reading. */

test("a lineage boundary excludes pre-reset rows on the following reading", () => {
  const old = [row(1), row(2), row(3), row(4)];
  const afterReset = { ...row(20), lineageId: "v2-2026-06-20T00:00:00.000Z" };

  const plan = planSegment([...old, afterReset], {
    timestampIso: "2026-06-21T00:00:00.000Z",
    canonicalDay: "2026-06-21",
    captureClass: "auto",
    current: METRICS,
  });
  assert.equal(plan.reset.reset, false, "no new reset — the gap is one day");
  assert.deepEqual(plan.history.map((r) => r.lineageId), ["v2-2026-06-20T00:00:00.000Z"]);
});

/* z is produced once the baseline is ready, for both new axes. */

test("ming and run z-scores are produced once the baseline is ready", () => {
  const history = [1, 2, 3, 4, 5, 6].map((d) =>
    row(d, { axes: { ...AXES, ming: 5, run: 10 } }));
  const res = interpretReading(
    { ...METRICS, ming: 10, run: 20 },
    history,
    { timestampIso: "2026-06-20T00:00:00.000Z", captureMode: "auto" },
  );
  assert.equal(res.state, "read");
  assert.ok(res.z.ming > 0, "a raised ming must read positive");
  assert.ok(res.z.run > 0, "a raised run must read positive");
});
