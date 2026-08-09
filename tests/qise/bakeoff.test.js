/*
 * PHASE 5b gate — the script runs and produces a decision table.
 *
 * The decision rule is the thing under test, not the answer. A bake-off that
 * can only ever return one verdict is not a bake-off, so both outcomes are
 * exercised here, including the tie-break that ships the simpler pipeline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  analyse, decide, report, spreadOf, syntheticReadings,
  MARGIN_TO_BEAT, DECIDING_METRICS, REQUIRED_SETTINGS, READINGS_PER_SETTING,
} from "../../scripts/qise-bakeoff.mjs";

test("the script produces a decision table from a full protocol run", () => {
  const readings = syntheticReadings();
  assert.equal(readings.length, REQUIRED_SETTINGS * READINGS_PER_SETTING);

  const { text, decision, problems, table } = report(readings);

  assert.deepEqual(problems, [], "a protocol-conforming run must report no deviations");
  assert.match(text, /DECISION: ship the (RAW|CORRECTED) pipeline\./);
  assert.match(text, /within-setting SD/);
  assert.match(text, /between-setting spread/);
  for (const metric of DECIDING_METRICS) {
    assert.ok(table.raw[metric] && table.corrected[metric], `${metric} missing from the table`);
    assert.ok(Number.isFinite(table.raw[metric].between));
    assert.ok(Number.isFinite(table.raw[metric].withinMean));
  }
  assert.ok(["raw", "corrected"].includes(decision.pipeline));
});

test("a correction that clearly works wins", () => {
  const { decision } = report(syntheticReadings({ correctionHelps: 0.9 }));
  assert.equal(decision.pipeline, "corrected");
  for (const m of DECIDING_METRICS) assert.ok(decision.perMetric[m].improvement > MARGIN_TO_BEAT);
});

test("a correction that helps only a little LOSES — the simpler pipeline wins ties", () => {
  // The rule that matters. Without the margin, any correction that helps by a
  // hair keeps a sclera dependency that carries a physiological-volatility
  // risk and unassessed patent exposure.
  const { decision } = report(syntheticReadings({ correctionHelps: 0.15 }));
  assert.equal(decision.pipeline, "raw");
  assert.match(decision.why, /simpler pipeline wins the tie/);
});

test("a correction that makes things WORSE loses, and says so with a negative", () => {
  const { decision } = report(syntheticReadings({ correctionHelps: -0.5 }));
  assert.equal(decision.pipeline, "raw");
  for (const m of DECIDING_METRICS) assert.ok(decision.perMetric[m].improvement < 0);
});

test("BOTH deciding metrics must clear the margin, not just one", () => {
  // Correcting the hue while inflating the chroma spread is not a win, it is a
  // trade nobody asked for.
  const readings = syntheticReadings({ correctionHelps: 0.9 });
  for (const r of readings) {
    // Leave hueVector alone; make `run` no better corrected than raw.
    r.metrics.corrected.run = r.metrics.raw.run;
  }
  const { decision } = report(readings);
  assert.equal(decision.perMetric.hueVector.clears, true);
  assert.equal(decision.perMetric.run.clears, false);
  assert.equal(decision.pipeline, "raw");
});

test("hueVector spread is measured on the POINTS, not on its two components", () => {
  // Adding SD(a*) to SD(b*) counts a diagonal shift twice and a purely-a*
  // shift once, which would make the comparison depend on the direction of the
  // illuminant rather than its size.
  const diagonal = [{ a: 0, b: 0 }, { a: 3, b: 3 }, { a: -3, b: -3 }];
  const axial = [{ a: 0, b: 0 }, { a: Math.hypot(3, 3), b: 0 }, { a: -Math.hypot(3, 3), b: 0 }];
  assert.ok(Math.abs(spreadOf("hueVector", diagonal) - spreadOf("hueVector", axial)) < 1e-9,
    "the same displacement in a different direction produced a different spread");
});

test("a short or slow run is analysed but flagged, never silently accepted", () => {
  // Past thirty minutes the "physiology is constant, so all variance is
  // optical" premise fails, and the whole comparison stops meaning anything.
  const slow = syntheticReadings();
  slow[slow.length - 1].timestampIso = "2026-08-09T11:30:00.000Z";
  const withSpan = report(slow);
  assert.ok(withSpan.problems.some((p) => /minutes/.test(p)), withSpan.problems.join("; "));

  const short = syntheticReadings({ n: 2 });
  const withCount = report(short);
  assert.ok(withCount.problems.some((p) => /requires 5/.test(p)), withCount.problems.join("; "));

  // Still produces a table. A protocol deviation makes the decision
  // provisional; it does not make the numbers unprintable.
  assert.match(withCount.text, /DECISION/);
  assert.match(withCount.text, /PROTOCOL DEVIATIONS/);
});

test("a reading with no lighting tag is refused rather than pooled", () => {
  const readings = syntheticReadings();
  delete readings[0].lightingSetting;
  assert.throws(() => analyse(readings), /lightingSetting/);
});

test("within-setting spread is reported separately, because a win must not inflate it", () => {
  // Between-setting spread decides, but a pipeline that removes the lighting
  // difference by adding noise to every reading has not helped anyone.
  const { table } = report(syntheticReadings({ correctionHelps: 0.9 }));
  for (const metric of DECIDING_METRICS) {
    assert.ok(table.corrected[metric].withinMean < table.raw[metric].between,
      `${metric}: the corrected pipeline's own noise floor exceeds what it removed`);
  }
});

test("decide() is pure — the same table always gives the same verdict", () => {
  const { table } = analyse(syntheticReadings());
  assert.deepEqual(decide(table), decide(table));
});
