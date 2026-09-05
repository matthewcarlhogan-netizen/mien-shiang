import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { balanceFrame, shadesOfGray, rawScalars } from "../src/engine.js";
import { MEASUREMENT_METHOD as METHOD, sameMeasurementMethod } from "../src/measurement-method.js";
import { computeBaseline, noiseFloor, deltasFrom, interpretReading } from "../src/qise/baseline.js";
import { segmentOf } from "../src/qise/reading-pipeline.js";
import { toRecord } from "../src/qise/store.js";

const axes = { a: 12, b: 10, L: 60, C: 16, periorbitalL: 55, ming: 1, run: 1 };
const metrics = { hueVector: { a: 12, b: 10 }, meanL: 60, meanChroma: 16, periorbitalL: 55, ming: 1, run: 1 };
const history = Array.from({ length: 8 }, (_, i) => ({
  axes: { ...axes }, valid: true, baselineVersion: "v2", captureClass: "auto",
  timestampIso: `2026-08-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
}));

test("effective WB method tags the applied path, including transparent-mask and small-sample fallbacks", () => {
  const data = new Uint8ClampedArray(40 * 4);
  for (let i = 0; i < 40; i++) data.set([180, 130, 110, i < 16 ? 0 : 255], i * 4);
  const mask = new Uint8Array(40).fill(1);
  const masked = balanceFrame(data, 6, mask);
  assert.equal(masked.methodVersion, METHOD.roiUnion);
  assert.deepEqual(masked.data, shadesOfGray(data, 6, mask));
  assert.equal(balanceFrame(data).methodVersion, METHOD.wholeFrame);
  mask.fill(0); mask.fill(1, 0, 16);
  assert.equal(balanceFrame(data, 6, mask).methodVersion, METHOD.wholeFrame,
    "geometric coverage is not enough: the selected pixels are transparent");
  data.fill(0);
  assert.equal(balanceFrame(data, 6, mask).methodVersion, null);
});

test("raw baseline carries explicit provenance, never inventing it for an untagged scalar caller", () => {
  assert.equal(rawScalars({}, { methodVersion: METHOD.roiUnion }).baseline.methodVersion, METHOD.roiUnion);
  assert.equal(rawScalars({}).baseline.methodVersion, null);
  assert.equal(sameMeasurementMethod(METHOD.roiUnion, METHOD.roiUnion), true);
  for (const value of [null, undefined, "future", METHOD.wholeFrame, METHOD.qiseCorrected]) {
    assert.equal(sameMeasurementMethod(METHOD.roiUnion, value), false);
  }
  assert.equal(sameMeasurementMethod(null, null), false);
});

test("baseline, noise floor and delta guards reject cross-method and unknown history with paired controls", () => {
  const baseline = computeBaseline(history);
  assert.equal(baseline.methodVersion, METHOD.qiseCorrected);
  assert.equal(deltasFrom(axes, baseline).a, 0);
  assert.equal(deltasFrom(axes, baseline, METHOD.roiUnion), null);
  assert.equal(deltasFrom(axes, { ...baseline, methodVersion: null }), null);
  for (const methodVersion of [METHOD.wholeFrame, METHOD.roiUnion, null, "future"]) {
    const incompatible = history.map((r) => ({ ...r, methodVersion, axes: { ...axes, a: 1e6 } }));
    assert.equal(computeBaseline(incompatible).ready, false);
    assert.deepEqual(computeBaseline([...incompatible, ...history]), baseline);
    assert.deepEqual(noiseFloor([...incompatible, ...history]), noiseFloor(history));
    assert.equal(interpretReading(metrics, incompatible).state, "calibrating");
  }
  assert.equal(interpretReading(metrics, history).state, "read");
});

test("trajectory and record projection cannot erase a method boundary", () => {
  const today = { ...history[0], timestampIso: "2026-09-01T00:00:00Z" };
  assert.equal(segmentOf(history, today).length, 8);
  const incompatible = history.map((r) => ({ ...r, methodVersion: METHOD.roiUnion }));
  assert.equal(segmentOf(incompatible, today).length, 0);
  for (const methodVersion of [METHOD.roiUnion, METHOD.wholeFrame, null, "future"]) {
    assert.throws(() => toRecord({ ...today, methodVersion }), /Incompatible measurement method/);
  }
  assert.equal(toRecord({ ...today, methodVersion: METHOD.qiseCorrected }).baselineVersion, "v2");
});

test("production callers retain their reviewed WB scope and pass effective provenance into the scalar baseline", () => {
  const classic = readFileSync(new URL("../src/analysis.js", import.meta.url), "utf8");
  const integrated = readFileSync(new URL("../src/qise/integrated.js", import.meta.url), "utf8");
  const capture = readFileSync(new URL("../src/ui/qise/app.js", import.meta.url), "utf8");
  assert.match(classic, /balanceFrame\(img\.data, 6, faceMask\)/);
  assert.match(classic, /rawScalars\(regions, \{ methodVersion \}\)/);
  assert.match(integrated, /balanceFrame\(image\.data\)/);
  assert.match(integrated, /rawScalars\(regions, \{ methodVersion: result\.methodVersion \}\)/);
  assert.doesNotMatch(integrated, /unionFootprintMask/);
  assert.match(capture, /interpretReading\(metrics\.corrected, history/);
  assert.match(capture, /axes: axesOf\(metrics\.corrected\)/);
  assert.match(capture, /baselineVersion: BASELINE_VERSION/);
});
