/*
 * PHASE 6 gate — the `ping` test, and the outlier-resistance of the median.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeBaseline, noiseFloor, deltasFrom, projectCompass, axesOf,
  interpretReading, shouldResetBaseline, readingConfidence, isLowConfidence,
  median, mad, BASELINE_WINDOW, BASELINE_EXCLUDE_RECENT, CALIBRATING_READINGS,
  NOISE_FLOOR_MADS, RESET_GAP_DAYS, LOW_CONFIDENCE, MAGNITUDE_BANDS,
  AXIS_MAD_FLOOR, COMPASS_AXES,
} from "../../src/qise/baseline.js";

/** A history of near-identical readings, with a little honest jitter. */
function steadyHistory(n = 34, jitter = 0.2) {
  return Array.from({ length: n }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 6, 1 + i)).toISOString(),
    valid: true,
    axes: {
      a: 14 + ((i % 3) - 1) * jitter,
      b: 12 + ((i % 2) - 0.5) * jitter,
      L: 62 + ((i % 5) - 2) * jitter,
      C: 18 + ((i % 3) - 1) * jitter,
      periorbitalL: 55 + ((i % 4) - 1.5) * jitter,
    },
  }));
}

const typical = () => ({ a: 14, b: 12, L: 62, C: 18, periorbitalL: 55 });

const readToday = (axes, history) => {
  const baseline = computeBaseline(history);
  const floor = noiseFloor(history);
  return projectCompass(deltasFrom(axes, baseline), floor);
};

/* ────────────────────────────────────────────────────────────── the gate ── */

test("thirty near-identical readings plus one typical give `ping`", () => {
  // The expected daily result. An app that finds drama every day is an app
  // nobody believes by week three.
  const c = readToday(typical(), steadyHistory(30));
  assert.equal(c.ascendant, "ping");
  assert.equal(c.band, null);
  assert.ok(c.magnitude < 1, `magnitude ${c.magnitude} cleared the floor on an unremarkable day`);
});

test("one extreme outlier moves the median baseline by under 10% of its deviation", () => {
  const history = steadyHistory(34);
  const before = computeBaseline(history).axes.a;

  // A wild reading — a passing cloud, a lamp switched on mid-capture.
  const spiked = [...history];
  spiked[10] = { ...spiked[10], axes: { ...spiked[10].axes, a: history[10].axes.a + 40 } };
  const after = computeBaseline(spiked).axes.a;

  const moved = Math.abs(after - before);
  assert.ok(moved < 0.1 * 40,
    `the baseline moved ${moved.toFixed(3)} of a 40-unit outlier; a mean would have moved 1.3`);

  // And the paired positive control: a mean genuinely would have moved.
  const values = spiked.slice(0, -BASELINE_EXCLUDE_RECENT).map((r) => r.axes.a);
  const meanShift = Math.abs(values.reduce((s, x) => s + x, 0) / values.length
    - history.slice(0, -BASELINE_EXCLUDE_RECENT).map((r) => r.axes.a).reduce((s, x) => s + x, 0) / values.length);
  assert.ok(meanShift > moved, "the test proves nothing if a mean would have been just as stable");
});

/* ─────────────────────────────────────────────────────────── the baseline ── */

test("the baseline excludes the most recent three readings", () => {
  assert.equal(BASELINE_EXCLUDE_RECENT, 3);
  // Otherwise today is compared against a baseline today helped build, and a
  // slow genuine drift is absorbed into the reference it should be measured
  // against.
  const history = steadyHistory(10, 0);
  for (let i = 7; i < 10; i++) history[i].axes.a = 99;

  const b = computeBaseline(history);
  assert.equal(b.n, 7);
  assert.ok(Math.abs(b.axes.a - 14) < 1e-9, `the recent three leaked in: ${b.axes.a}`);
});

test("the baseline window is the trailing thirty, not everything ever recorded", () => {
  assert.equal(BASELINE_WINDOW, 30);
  const ancient = Array.from({ length: 40 }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    valid: true, axes: { a: 99, b: 99, L: 99, C: 99, periorbitalL: 99 },
  }));
  const b = computeBaseline([...ancient, ...steadyHistory(33, 0)]);
  assert.equal(b.n, 30);
  assert.ok(Math.abs(b.axes.a - 14) < 1e-9, "readings outside the window are still counting");
});

test("invalid readings are excluded from the baseline entirely", () => {
  const history = steadyHistory(20, 0);
  history[5] = { ...history[5], valid: false, axes: { a: 99, b: 99, L: 99, C: 99, periorbitalL: 99 } };
  const b = computeBaseline(history);
  assert.ok(Math.abs(b.axes.a - 14) < 1e-9);
  assert.equal(b.n, 16, "the invalid reading should not occupy a slot either");
});

test("an empty or too-short history is not ready, rather than being a baseline of zero", () => {
  assert.equal(computeBaseline([]).ready, false);
  assert.equal(computeBaseline([]).axes, null);
  assert.equal(computeBaseline(steadyHistory(3)).ready, false);
  assert.equal(computeBaseline(null).ready, false);
});

/* ───────────────────────────────────────────────────────── the noise floor ── */

test("the floor is two MADs of the user's OWN variability", () => {
  assert.equal(NOISE_FLOOR_MADS, 2);
  const jumpy = steadyHistory(34, 3);
  const steady = steadyHistory(34, 0.2);
  assert.ok(noiseFloor(jumpy).a > noiseFloor(steady).a,
    "a user whose readings vary more must need a bigger move to be told about it");
});

test("a perfectly flat history cannot make every reading remarkable", () => {
  // MAD = 0 without the floor, and then every subsequent reading clears it by
  // an infinite margin — the exact failure `ping` exists to prevent.
  const flat = Array.from({ length: 34 }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 6, 1 + i)).toISOString(),
    valid: true, axes: typical(),
  }));
  const floor = noiseFloor(flat);
  for (const key of COMPASS_AXES) {
    assert.equal(floor[key], AXIS_MAD_FLOOR[key], `${key} has no floor under it`);
  }
  // A reading a hair off the flat baseline must still read as level.
  const c = readToday({ ...typical(), a: 14.05 }, flat);
  assert.equal(c.ascendant, "ping");
});

/* ────────────────────────────────────────────────────────────── the compass ── */

const push = (history, axes) => readToday(axes, history);

test("each colour is reachable, and only on its own precondition", () => {
  const h = steadyHistory(34);
  const f = noiseFloor(h);

  // chi: +da* dominant.
  assert.equal(push(h, { ...typical(), a: 14 + 6 * f.a }).ascendant, "chi");
  // huang: +db* dominant.
  assert.equal(push(h, { ...typical(), b: 12 + 6 * f.b }).ascendant, "huang");
  // qing: -da* WITH -db*.
  assert.equal(push(h, { ...typical(), a: 14 - 6 * f.a, b: 12 - 6 * f.b }).ascendant, "qing");
  // bai: -dC* with +dL*.
  assert.equal(push(h, { ...typical(), C: 18 - 6 * f.C, L: 62 + 6 * f.L }).ascendant, "bai");
  // hei: -dL* dominant, weighted by periorbital.
  assert.equal(push(h, {
    ...typical(), L: 62 - 6 * f.L, periorbitalL: 55 - 6 * f.periorbitalL,
  }).ascendant, "hei");
});

test("a conjunction scores as its WEAKER leg, not its stronger", () => {
  // "-dC* with +dL*" must not be satisfied by a large chroma drop and a flat
  // luminance, or `bai` fires on half its own definition.
  const h = steadyHistory(34);
  const f = noiseFloor(h);
  const halfSatisfied = push(h, { ...typical(), C: 18 - 10 * f.C });
  assert.notEqual(halfSatisfied.ascendant, "bai");
  assert.equal(halfSatisfied.components.bai, 0);

  const both = push(h, { ...typical(), C: 18 - 10 * f.C, L: 62 + 2 * f.L });
  assert.ok(Math.abs(both.components.bai - 2) < 0.3,
    `bai scored ${both.components.bai}; it should be capped by the +2 luminance leg`);
});

test("hei is weighted by periorbital, and survives its absence", () => {
  const h = steadyHistory(34);
  const f = noiseFloor(h);

  const both = push(h, { ...typical(), L: 62 - 4 * f.L, periorbitalL: 55 - 8 * f.periorbitalL });
  const faceOnly = push(h, { ...typical(), L: 62 - 4 * f.L });
  assert.ok(both.components.hei > faceOnly.components.hei,
    "a darkened periorbital must strengthen hei");

  // A missing region costs precision, not a direction.
  const noOrbit = push(h, { ...typical(), L: 62 - 4 * f.L, periorbitalL: null });
  assert.equal(noOrbit.ascendant, "hei");
  assert.ok(Math.abs(noOrbit.components.hei - 4) < 0.3);
});

test("the magnitude is banded, and the bands are ordered", () => {
  const h = steadyHistory(34);
  const f = noiseFloor(h);
  assert.equal(push(h, { ...typical(), a: 14 + 1.2 * f.a }).band, "slight");
  assert.equal(push(h, { ...typical(), a: 14 + 2.0 * f.a }).band, "clear");
  assert.equal(push(h, { ...typical(), a: 14 + 4.0 * f.a }).band, "marked");
  for (let i = 1; i < MAGNITUDE_BANDS.length; i++) {
    assert.ok(MAGNITUDE_BANDS[i].from > MAGNITUDE_BANDS[i - 1].from);
  }
});

test("the compass never ranks the reader against anybody else", () => {
  // There is no population in this repository to be average against, and the
  // design depends on there never being one.
  const c = push(steadyHistory(34), { ...typical(), a: 20 });
  const keys = JSON.stringify(c).toLowerCase();
  for (const term of ["percentile", "rank", "average", "population", "compared"]) {
    assert.ok(!keys.includes(term), `the compass result mentions "${term}"`);
  }
});

test("missing deltas or floor give a defined empty result, not a throw", () => {
  assert.equal(projectCompass(null, null).ascendant, null);
  assert.deepEqual(projectCompass(null, null).components, {});
});

/* ──────────────────────────────────────────────────────────── calibrating ── */

test("readings 1 to 3 are `calibrating`, not a compass built from nothing", () => {
  assert.equal(CALIBRATING_READINGS, 3);
  const metrics = { hueVector: { a: 14, b: 12 }, meanL: 62, meanChroma: 18, periorbitalL: 55, basis: "x" };
  for (let n = 0; n < 3; n++) {
    const r = interpretReading(metrics, steadyHistory(n));
    assert.equal(r.state, "calibrating", `n=${n}`);
    assert.equal(r.compass, null);
  }
  assert.equal(interpretReading(metrics, steadyHistory(10)).state, "read");
});

test("axesOf refuses a metric set that measured nothing", () => {
  assert.equal(axesOf(null), null);
  assert.equal(axesOf({ hueVector: null }), null);
});

/* ────────────────────────────────────────────────────────────────── resets ── */

test("the baseline resets on a device change, a capture-class change, or a long gap", () => {
  const base = { deviceFingerprint: "A", captureMode: "auto", timestampIso: "2026-06-01T00:00:00.000Z" };

  assert.equal(shouldResetBaseline(base, { ...base, timestampIso: "2026-06-02T00:00:00.000Z" }).reset, false);

  const device = shouldResetBaseline(base, { ...base, deviceFingerprint: "B", timestampIso: "2026-06-02T00:00:00.000Z" });
  assert.deepEqual(device.reasons, ["device_changed"]);

  const mode = shouldResetBaseline(base, { ...base, captureMode: "locked", timestampIso: "2026-06-02T00:00:00.000Z" });
  assert.deepEqual(mode.reasons, ["capture_mode_changed"]);

  const gap = shouldResetBaseline(base, { ...base, timestampIso: "2026-08-01T00:00:00.000Z" });
  assert.deepEqual(gap.reasons, ["gap_exceeded"]);
  assert.equal(RESET_GAP_DAYS, 45);

  // Just inside the gap must NOT reset — an off-by-one here silently discards
  // six weeks of somebody's history.
  const inside = new Date(Date.parse(base.timestampIso) + (RESET_GAP_DAYS - 1) * 86400000).toISOString();
  assert.equal(shouldResetBaseline(base, { ...base, timestampIso: inside }).reset, false);

  assert.equal(shouldResetBaseline(null, base).reset, false);
});

/* ────────────────────────────────────────────────────────────── confidence ── */

test("confidence is the MINIMUM of the three, not their product or their mean", () => {
  // Three mediocre inputs must not multiply down to near-zero, and one bad
  // input must not be averaged away by two good ones.
  assert.equal(readingConfidence({ scleraConfidenceValue: 1, validFraction: 1, frameJitter: 0 }), 1);
  assert.equal(readingConfidence({ scleraConfidenceValue: 0.3, validFraction: 1, frameJitter: 0 }), 0.3);
  assert.equal(readingConfidence({ scleraConfidenceValue: 1, validFraction: 0.75, frameJitter: 0 }), 0.75);

  const threeMediocre = readingConfidence({ scleraConfidenceValue: 0.7, validFraction: 0.7, frameJitter: 0.64 });
  assert.ok(Math.abs(threeMediocre - 0.7) < 1e-9, `a product would give ~0.34, got ${threeMediocre}`);
});

test("an assisted capture stays usable but cannot claim clean-capture confidence", () => {
  const clean = readingConfidence({
    scleraConfidenceValue: 1, validFraction: 1, frameJitter: 0, captureTier: "clean",
  });
  const assisted = readingConfidence({
    scleraConfidenceValue: 1, validFraction: 1, frameJitter: 0, captureTier: "assisted",
  });
  assert.equal(clean, 1);
  assert.equal(assisted, 0.78);
  assert.ok(assisted > LOW_CONFIDENCE);
});

test("jitter degrades confidence monotonically and never below zero", () => {
  const at = (j) => readingConfidence({ scleraConfidenceValue: 1, validFraction: 1, frameJitter: j });
  assert.ok(at(0) > at(1) && at(1) > at(5) && at(5) > at(50));
  assert.ok(at(1e6) >= 0);
  // A missing jitter figure must not be read as infinite jitter.
  assert.equal(readingConfidence({ scleraConfidenceValue: 1, validFraction: 1 }), 1);
});

test("low-confidence readings are identified, for the hollow dot and the pattern engine", () => {
  assert.equal(isLowConfidence(LOW_CONFIDENCE - 0.01), true);
  assert.equal(isLowConfidence(LOW_CONFIDENCE), false);
  assert.equal(isLowConfidence(0.3), true);
});

/* ───────────────────────────────────────────────────── robust statistics ── */

test("median and mad ignore nulls rather than propagating NaN", () => {
  assert.equal(median([1, 2, 3]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([1, null, 3]), 2);
  assert.equal(median([]), null);
  assert.equal(median([null, undefined]), null);
  assert.equal(mad([1, 1, 1]), 0);
  assert.equal(mad([]), null);
});
