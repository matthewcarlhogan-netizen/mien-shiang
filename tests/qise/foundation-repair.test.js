import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretReading, BASELINE_VERSION } from "../../src/qise/baseline.js";

test("baseline reset and lineage segmentation", () => {
  const base = { 
    axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 1, run: 1 }, 
    timestampIso: "2026-06-01T00:00:00.000Z",
    baselineVersion: BASELINE_VERSION,
    captureMode: "auto"
  };
  const metrics = { ming: 1, run: 1, hueVector: { a: 0, b: 0 }, meanL: 50, meanChroma: 10, periorbitalL: 50, basis: "x" };
  
  // Test algorithm version segmentation: older version in history should be ignored
  const oldBase = { ...base, baselineVersion: "v1" };
  const res = interpretReading(metrics, [oldBase], { timestampIso: "2026-06-02T00:00:00.000Z", captureMode: "auto" });
  assert.equal(res.state, "calibrating");

  // Test capture mode segmentation
  const diffModeBase = { ...base, captureMode: "locked" };
  const res2 = interpretReading(metrics, [diffModeBase], { timestampIso: "2026-06-02T00:00:00.000Z", captureMode: "auto" });
  assert.equal(res2.state, "calibrating");
});

test("z-score persistence and deterministic replay", () => {
  const base = { 
    axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 1, run: 1 }, 
    timestampIso: "2026-06-01T00:00:00.000Z",
    baselineVersion: BASELINE_VERSION,
    captureMode: "auto",
    valid: true
  };
  const history = [base, base, base, base];
  const metrics = { ming: 2, run: 3, hueVector: { a: 0, b: 0 }, meanL: 50, meanChroma: 10, periorbitalL: 50, basis: "x" };
  
  const res = interpretReading(metrics, history, { timestampIso: "2026-06-05T00:00:00.000Z", captureMode: "auto" });
  
  // Normalised against baseline 1, floor 0.15.
  // ming: (2-1)/0.15 = 6.666
  // run: (3-1)/0.15 = 13.333
  
  assert.equal(Math.abs(res.z.ming - 6.666) < 0.01, true);
  assert.equal(Math.abs(res.z.run - 13.333) < 0.01, true);
});
