/*
 * scripts/retention-sim.mjs — the B4 four-analysis retention/exhaustion
 * simulator. This suite deliberately runs SMALL horizons (a handful of
 * days), not the real script's 30/90/365-day production runs — the full
 * `main()` (exercised directly via `npm run retention:sim`, not part of
 * `npm test`) takes tens of seconds because it walks real occurrence
 * periods up to 648 for several constructs; that cost belongs in the
 * dedicated verification step, not in every `npm test` run. What this file
 * pins is the LOGIC: missed-day gaps are real gaps, determinism holds, and
 * importing the module does not run the whole harness.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runScenario, weatherMostlySteady, weatherIntermittentMissedDays,
  exhaustionTimeline,
} from "../../scripts/retention-sim.mjs";
import { exposureStats } from "../../scripts/lib/reading-simulation.mjs";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";

test("importing scripts/retention-sim.mjs as a module does not execute main() or exit", () => {
  // If the entrypoint guard were absent or wrong, importing this module
  // would already have called process.exit() before this assertion ran.
  assert.equal(typeof runScenario, "function");
});

test("runScenario is deterministic for a fixed seed", () => {
  const a = runScenario(10, weatherMostlySteady());
  const b = runScenario(10, weatherMostlySteady());
  assert.deepEqual(a, b);
});

test("a missed day is a real gap: fewer days are appended than the calendar horizon covers", () => {
  const n = 9; // i % 3 === 2 skips days 2, 5, 8 -> 6 captured
  const days = runScenario(n, weatherIntermittentMissedDays());
  assert.equal(days.length, 6);
  // The calendar itself still advances across the gap — canonicalDay for the
  // captured days must span the full window, not compact down to 6
  // consecutive dates, because a missed day is a gap, never interpolated.
  const dayIndices = days.map((d) => d.i);
  assert.deepEqual(dayIndices, [0, 1, 3, 4, 6, 7]);
});

test("runScenario output feeds exposureStats() without modification (real primitive reuse)", () => {
  const days = runScenario(12, weatherMostlySteady());
  const stats = exposureStats(days, (d) => d.oldText);
  assert.equal(stats.days, 12);
  assert.ok(stats.verbatimRepeatRate >= 0 && stats.verbatimRepeatRate <= 1);
});

test("exhaustionTimeline reports CONSTRUCT_NEVER_REACHED_WITHIN_HORIZON on too short a horizon", () => {
  // heritageRotation cycles every 6 days; a 2-day run cannot reach every construct.
  const days = runScenario(2, weatherMostlySteady());
  const reachedAny = HERITAGE_CONSTRUCT_IDS.map((id) => exhaustionTimeline(days, id));
  assert.ok(reachedAny.some((r) => r.status === "CONSTRUCT_NEVER_REACHED_WITHIN_HORIZON"),
    "a 2-day horizon should not reach every one of the six rotating constructs");
});

test("exhaustionTimeline never reports more distinct presentations than days on that construct", () => {
  const days = runScenario(24, weatherMostlySteady());
  for (const id of HERITAGE_CONSTRUCT_IDS) {
    const r = exhaustionTimeline(days, id);
    assert.ok(r.distinctTier2PresentationsSeen <= Math.max(1, r.daysOnThisConstructWithinHorizon));
  }
});
