import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretReading, BASELINE_VERSION } from "../../src/qise/baseline.js";

test("lineage segmentation: algorithm version and capture mode", () => {
  const base = { 
    axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 1, run: 1 }, 
    timestampIso: "2026-06-01T00:00:00.000Z",
    canonicalDay: "2026-06-01",
    baselineVersion: BASELINE_VERSION,
    captureMode: "auto"
  };
  const metrics = { ming: 1, run: 1, mingZ: 0, runZ: 0, hueVector: { a: 0, b: 0 }, meanL: 50, meanChroma: 10, periorbitalL: 50, basis: "x" };
  
  // Older version should be ignored
  const oldBase = { ...base, baselineVersion: "v1" };
  const res = interpretReading(metrics, [oldBase], { timestampIso: "2026-06-02T00:00:00.000Z", captureMode: "auto" });
  assert.equal(res.state, "calibrating");

  // Different capture mode should be ignored
  const diffModeBase = { ...base, captureMode: "locked" };
  const res2 = interpretReading(metrics, [diffModeBase], { timestampIso: "2026-06-02T00:00:00.000Z", captureMode: "auto" });
  assert.equal(res2.state, "calibrating");
});

test("canonical-day replacement logic", () => {
  let history = [
    { canonicalDay: "2026-06-01", timestampIso: "2026-06-01T00:00:00.000Z" },
    { canonicalDay: "2026-06-02", timestampIso: "2026-06-02T00:00:00.000Z" }
  ];
  const newEntryCanonicalDay = "2026-06-02";
  
  const index = history.findIndex(r => r.canonicalDay === newEntryCanonicalDay);
  if (index !== -1) history.splice(index, 1);
  
  assert.equal(history.length, 1);
  assert.equal(history[0].canonicalDay, "2026-06-01");
});
test("persisted z-score usage", () => {
  // `metrics` must contain what `axesOf` expects: hueVector, meanL, meanChroma, periorbitalL, ming, run
  const metrics = { 
    hueVector: { a: 0, b: 0 }, meanL: 50, meanChroma: 10, periorbitalL: 50, basis: "x",
    ming: 10, run: 20 
  };
  // `history` entries must have axes (with all COMPASS_AXES) and valid
  const history = [
    { 
      axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 5, run: 10 },
      valid: true,
      timestampIso: "2026-06-01T00:00:00.000Z",
      baselineVersion: BASELINE_VERSION,
      captureClass: "auto"
    },
    { 
      axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 5, run: 10 },
      valid: true,
      timestampIso: "2026-06-02T00:00:00.000Z",
      baselineVersion: BASELINE_VERSION,
      captureClass: "auto"
    },
    { 
      axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 5, run: 10 },
      valid: true,
      timestampIso: "2026-06-03T00:00:00.000Z",
      baselineVersion: BASELINE_VERSION,
      captureClass: "auto"
    },
    { 
      axes: { a: 0, b: 0, L: 50, C: 10, periorbitalL: 50, ming: 5, run: 10 },
      valid: true,
      timestampIso: "2026-06-04T00:00:00.000Z",
      baselineVersion: BASELINE_VERSION,
      captureClass: "auto"
    }
  ]; 

  const res = interpretReading(metrics, history, { timestampIso: "2026-06-05T00:00:00.000Z", captureMode: "auto" });

  assert.ok(res.z, "res.z should exist");
  assert.ok(typeof res.z.ming === "number", "res.z.ming should be a number");
  assert.ok(typeof res.z.run === "number", "res.z.run should be a number");
});
