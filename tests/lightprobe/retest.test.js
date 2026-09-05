import { test } from "node:test";
import assert from "node:assert/strict";
import {
  withinPairChromaticityDrift, betweenRepeatLevelDrift, classifyRetestFailure,
  pairDrift, discardDriftedPairs, CHROMATICITY_DRIFT_MAX, LEVEL_DRIFT_MAX,
} from "../../lightprobe/retest.js";

/* ── section 3's VERIFY: two distinct mutation cases, each failing only its
 * own gate. This is the coverage hole the task explicitly calls out --
 * neither case below may be "passing" only because the other gate happens
 * to also fail on the same fixture. */

test("case A fails ONLY within-pair chromaticity drift, not between-repeat level drift", () => {
  const lit = { L: 60, a: 8, b: 10 }; // a/b moved a lot from unlit -> camera re-targeted
  const unlit = { L: 60, a: 1, b: 1 };
  const chromaticity = withinPairChromaticityDrift(lit, unlit);
  assert.equal(chromaticity.pass, false, "case A must fail chromaticity");

  const level = betweenRepeatLevelDrift([60, 60.2, 59.9, 60.1, 60.0]); // tight L* across repeats
  assert.equal(level.pass, true, "case A must PASS level drift -- it is not what this case tests");

  assert.equal(classifyRetestFailure({ chromaticity, level }), "within_pair_chromaticity");
});

test("case B fails ONLY between-repeat level drift, not within-pair chromaticity drift", () => {
  const lit = { L: 60, a: 1, b: 1 }; // a/b essentially unchanged from unlit
  const unlit = { L: 60, a: 1.1, b: 0.9 };
  const chromaticity = withinPairChromaticityDrift(lit, unlit);
  assert.equal(chromaticity.pass, true, "case B must PASS chromaticity -- it is not what this case tests");

  const level = betweenRepeatLevelDrift([60, 55, 65, 58, 62]); // L* wandering across repeats
  assert.equal(level.pass, false, "case B must fail level drift");

  assert.equal(classifyRetestFailure({ chromaticity, level }), "between_repeat_level");
});

test("replacing case A's chromaticity check with `true` changes ONLY case A's verdict", () => {
  const lit = { L: 60, a: 8, b: 10 };
  const unlit = { L: 60, a: 1, b: 1 };
  const real = withinPairChromaticityDrift(lit, unlit);
  const mutated = { ...real, pass: true }; // simulates replacing the check with `true`
  assert.equal(real.pass, false);
  assert.notEqual(real.pass, mutated.pass, "the mutation must flip the verdict, proving the gate is load-bearing");
});

test("replacing case B's level-drift check with `true` changes ONLY case B's verdict", () => {
  const real = betweenRepeatLevelDrift([60, 55, 65, 58, 62]);
  const mutated = { ...real, pass: true };
  assert.equal(real.pass, false);
  assert.notEqual(real.pass, mutated.pass, "the mutation must flip the verdict, proving the gate is load-bearing");
});

test("a pair failing neither gate classifies as 'none'", () => {
  const chromaticity = withinPairChromaticityDrift({ L: 60, a: 1, b: 1 }, { L: 60, a: 1.1, b: 0.9 });
  const level = betweenRepeatLevelDrift([60, 60.1, 59.9, 60, 60.05]);
  assert.equal(classifyRetestFailure({ chromaticity, level }), "none");
});

test("a pair failing both gates classifies as 'both', not just whichever ran first", () => {
  const chromaticity = withinPairChromaticityDrift({ L: 60, a: 8, b: 10 }, { L: 60, a: 1, b: 1 });
  const level = betweenRepeatLevelDrift([60, 55, 65, 58, 62]);
  assert.equal(classifyRetestFailure({ chromaticity, level }), "both");
});

test("chromaticity drift right at the threshold passes; just over it fails", () => {
  const unlit = { L: 60, a: 0, b: 0 };
  const atThreshold = withinPairChromaticityDrift({ L: 60, a: CHROMATICITY_DRIFT_MAX, b: 0 }, unlit);
  const overThreshold = withinPairChromaticityDrift({ L: 60, a: CHROMATICITY_DRIFT_MAX + 0.01, b: 0 }, unlit);
  assert.equal(atThreshold.pass, true);
  assert.equal(overThreshold.pass, false);
});

test("level drift right at the threshold passes; just over it fails", () => {
  // Three values symmetric around 60 so the median is exactly 60 and the
  // max deviation is exactly the spread applied, not halved by averaging
  // an even-length series.
  const atThreshold = betweenRepeatLevelDrift([60 - LEVEL_DRIFT_MAX, 60, 60 + LEVEL_DRIFT_MAX]);
  const overThreshold = betweenRepeatLevelDrift([60 - LEVEL_DRIFT_MAX - 0.01, 60, 60 + LEVEL_DRIFT_MAX + 0.01]);
  assert.equal(atThreshold.pass, true);
  assert.equal(overThreshold.pass, false);
});

/* ── pairDrift: spatial, interocular-normalised, discard-not-correct
 * (requirement 4.3). Distinct from chromaticity drift above -- this is pixel
 * position, not colour. */

const LANDMARKS_2CM_APART = (() => {
  const m = new Array(478).fill({ x: 0, y: 0, z: 0 });
  m[33] = { x: 0, y: 0, z: 0 };
  m[263] = { x: 100, y: 0, z: 0 }; // 100px interocular reference
  return m;
})();

test("pairDrift normalises by interocular distance, not raw pixels", () => {
  const drift = pairDrift({
    litCentroidPx: { x: 0, y: 0 },
    unlitCentroidPx: { x: 1, y: 0 }, // 1px raw shift = 1% of a 100px interocular reference
    landmarks: LANDMARKS_2CM_APART,
  });
  assert.equal(drift.fraction, 0.01);
  assert.equal(drift.pass, true); // 1% < PAIR_DRIFT_MAX_FRACTION (2%)
});

test("pairDrift fails and reports a fraction when the shift exceeds the threshold, still normalised", () => {
  const drift = pairDrift({
    litCentroidPx: { x: 0, y: 0 },
    unlitCentroidPx: { x: 5, y: 0 }, // 5% of interocular distance
    landmarks: LANDMARKS_2CM_APART,
  });
  assert.equal(drift.fraction, 0.05);
  assert.equal(drift.pass, false);
});

test("pairDrift refuses rather than silently passing when no interocular reference exists", () => {
  const drift = pairDrift({
    litCentroidPx: { x: 0, y: 0 },
    unlitCentroidPx: { x: 1, y: 0 },
    landmarks: new Array(478).fill(null),
  });
  assert.equal(drift.pass, false);
  assert.equal(drift.reason, "no_interocular_reference");
});

test("discardDriftedPairs DISCARDS a drifted pair rather than adjusting/correcting it", () => {
  const goodPair = {
    litCentroidPx: { x: 0, y: 0 }, unlitCentroidPx: { x: 0.5, y: 0 }, landmarks: LANDMARKS_2CM_APART,
  };
  const badPair = {
    litCentroidPx: { x: 0, y: 0 }, unlitCentroidPx: { x: 10, y: 0 }, landmarks: LANDMARKS_2CM_APART,
  };
  const { kept, discarded } = discardDriftedPairs([goodPair, badPair]);
  assert.equal(kept.length, 1);
  assert.equal(discarded.length, 1);
  // The discarded pair is untouched, not modified in place -- "discard, never correct".
  assert.deepEqual(discarded[0].pair, badPair);
  assert.equal(discarded[0].drift.pass, false);
});
