/*
 * PHASE 3 gate — one test per capture gate, tripping on synthetic failure and
 * passing on synthetic clean. Ten gates, so ten paired tests, plus the
 * properties that hold across all of them.
 *
 * Every case asserts BOTH halves in the same run. "The gate trips on bad
 * input" is worth nothing on its own: a gate that rejects everything trips on
 * bad input too, and that is the exact shape of defect this repo has shipped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateGates, GATES, interocularPx,
  POSE_YAW_MAX, POSE_PITCH_MAX, POSE_ROLL_MAX, DISTANCE_MIN_FRACTION,
  EXPOSURE_MAX_FRACTION, SIDELIGHT_MAX_DELTA_L, MOTION_MAX_PX,
  FILTER_MIN_LAPLACIAN_VARIANCE, OUTER_CANTHI,
} from "../../src/qise/gates.js";
import { SCLERA_MIN_PIXELS } from "../../src/qise/sclera.js";
import { MIN_VALID_ROIS } from "../../src/qise/rois.js";
import { canonicalFace, FRAME_W } from "./fixtures/synthetic.js";

const PTS = canonicalFace();

/** A frame that passes every gate. Each test spoils exactly one field. */
const cleanStats = () => ({
  frameWidth: FRAME_W,
  pose: { yaw: 0, pitch: 0, roll: 0 },
  skinPixelCount: 100000,
  skinPixelsAtOrAbove250: 100,
  skinPixelsAtOrBelow12: 100,
  cheekMedianL: { left: 60, right: 60 },
  landmarkDriftPx: 1.5,
  laplacianVariance: 40,
  validRoiCount: 8,
});

const cleanSclera = () => ({
  pixelCount: 400,
  rawRatios: { r: 1.01, g: 1.0, b: 0.99 },
  confidence: "ok",
});

const run = (statsPatch = {}, scleraPatch = {}) =>
  evaluateGates({ ...cleanStats(), ...statsPatch }, PTS, { ...cleanSclera(), ...scleraPatch });

const failed = (result, id) => result.failures.some((f) => f.id === id);

/* ─────────────────────────────────────────────────── the positive control ── */

test("a clean frame passes every gate", () => {
  const r = run();
  assert.equal(r.pass, true,
    "the clean fixture fails: " + r.failures.map((f) => `${f.id}@${f.margin.toFixed(3)}`).join(", "));
  assert.deepEqual(r.failures, []);
  assert.equal(Object.keys(r.margins).length, 10, "ten gates, ten margins");
  for (const [id, m] of Object.entries(r.margins)) {
    assert.ok(m >= 0, `${id} margin ${m} is negative on a clean frame`);
  }
});

/* ────────────────────────────────────────────────────── one test per gate ── */

test("gate: pose — trips past the limit on each axis independently", () => {
  assert.equal(run({ pose: { yaw: 0, pitch: 0, roll: 0 } }).pass, true);

  for (const [axis, limit] of [["yaw", POSE_YAW_MAX], ["pitch", POSE_PITCH_MAX], ["roll", POSE_ROLL_MAX]]) {
    const bad = run({ pose: { yaw: 0, pitch: 0, roll: 0, [axis]: limit + 1 } });
    assert.ok(failed(bad, "pose"), `${axis} of ${limit + 1} did not trip the pose gate`);

    // Negative angles too — a missing Math.abs is invisible on one side.
    const neg = run({ pose: { yaw: 0, pitch: 0, roll: 0, [axis]: -(limit + 1) } });
    assert.ok(failed(neg, "pose"), `${axis} of ${-(limit + 1)} did not trip the pose gate`);

    // And just inside still passes: the worst axis governs, but it must not
    // govern by being wrong.
    assert.equal(run({ pose: { yaw: 0, pitch: 0, roll: 0, [axis]: limit - 0.5 } }).pass, true);
  }

  // Roll is the tightest axis, so a tilt that clears yaw must still trip.
  assert.ok(failed(run({ pose: { yaw: 0, pitch: 0, roll: 10 } }), "pose"),
    "10 degrees of roll clears the yaw limit but must not clear the roll limit");
});

test("gate: distance — measured on the OUTER canthi, not the inner", () => {
  // On the canonical mesh at nominal framing the outer span is ~35% of frame
  // width and the inner span ~15%. Reading the 22% threshold against the inner
  // canthi rejects every correctly framed capture, and presents as a user who
  // can never get close enough.
  const span = interocularPx(PTS);
  assert.ok(span / FRAME_W > DISTANCE_MIN_FRACTION,
    `the canonical face at nominal framing measures ${(span / FRAME_W * 100).toFixed(1)}% and must pass`);
  assert.deepEqual([...OUTER_CANTHI], [33, 263]);

  assert.equal(run().pass, true);
  // Same landmarks, a much wider frame: the face is now too small in it.
  const tooFar = evaluateGates({ ...cleanStats(), frameWidth: span / (DISTANCE_MIN_FRACTION * 0.8) }, PTS, cleanSclera());
  assert.ok(failed(tooFar, "distance"));
});

test("gate: overexposed — trips past 2% of skin pixels at or above 250", () => {
  assert.equal(run({ skinPixelsAtOrAbove250: 1000 }).pass, true);         // 1%
  assert.ok(failed(run({ skinPixelsAtOrAbove250: 3000 }), "overexposed")); // 3%
  assert.equal(EXPOSURE_MAX_FRACTION, 0.02);
});

test("gate: underexposed — trips past 2% of skin pixels at or below 12", () => {
  assert.equal(run({ skinPixelsAtOrBelow12: 1000 }).pass, true);
  assert.ok(failed(run({ skinPixelsAtOrBelow12: 3000 }), "underexposed"));
  // And the two exposure gates are independent: blowing one must not trip the
  // other, or the message shown will point at the wrong fix.
  const over = run({ skinPixelsAtOrAbove250: 3000 });
  assert.ok(failed(over, "overexposed") && !failed(over, "underexposed"));
});

test("gate: sidelight — trips past 6 L* between the cheeks, in either direction", () => {
  assert.equal(run({ cheekMedianL: { left: 62, right: 58 } }).pass, true);
  assert.ok(failed(run({ cheekMedianL: { left: 68, right: 58 } }), "sidelight"));
  assert.ok(failed(run({ cheekMedianL: { left: 58, right: 68 } }), "sidelight"),
    "a missing Math.abs only shows on one side");
  assert.equal(SIDELIGHT_MAX_DELTA_L, 6);
});

test("gate: illuminant — the coarse +/-25% backstop", () => {
  assert.equal(run({}, { rawRatios: { r: 1.2, g: 1.0, b: 0.85 } }).pass, true);
  assert.ok(failed(run({}, { rawRatios: { r: 1.4, g: 1.0, b: 0.8 } }), "illuminant"));
  // Below neutral trips too.
  assert.ok(failed(run({}, { rawRatios: { r: 0.6, g: 1.0, b: 1.2 } }), "illuminant"));
});

test("gate: sclera — trips below 150 surviving pixels", () => {
  assert.equal(run({}, { pixelCount: SCLERA_MIN_PIXELS }).pass, true, "exactly at the floor must pass");
  assert.ok(failed(run({}, { pixelCount: SCLERA_MIN_PIXELS - 1 }), "sclera"));
});

test("gate: motion — 6px, because 2px is below the floor human physiology allows", () => {
  assert.equal(MOTION_MAX_PX, 6,
    "2px is unachievable handheld: breathing and ballistocardiographic head "
    + "motion put a floor under it, and a gate nobody can pass kills the product");
  assert.equal(run({ landmarkDriftPx: 5.9 }).pass, true);
  assert.ok(failed(run({ landmarkDriftPx: 6.1 }), "motion"));
  // The specific regression: a 3px drift is normal human stillness and must
  // not be rejected.
  assert.equal(run({ landmarkDriftPx: 3 }).pass, true);
});

test("gate: filter — trips below a Laplacian variance of 8", () => {
  assert.equal(run({ laplacianVariance: FILTER_MIN_LAPLACIAN_VARIANCE }).pass, true);
  assert.ok(failed(run({ laplacianVariance: 2 }), "filter"),
    "a smoothing filter collapses high-frequency detail and must be caught");
});

test("gate: roiValidity — trips below six of eight readable regions", () => {
  assert.equal(run({ validRoiCount: MIN_VALID_ROIS }).pass, true, "six of eight is the floor and must pass");
  assert.ok(failed(run({ validRoiCount: MIN_VALID_ROIS - 1 }), "roiValidity"));
});

/* ─────────────────────────────────────────────── properties across gates ── */

test("a gate whose input is missing FAILS rather than passing silently", () => {
  // Treating an absent input as "nothing to complain about" is how a capture
  // path ships with half its checks inert while every reading looks clean.
  const r = evaluateGates({}, null, null);
  assert.equal(r.pass, false);
  assert.equal(r.failures.length, GATES.length,
    "every gate should have reported itself unevaluated");
  for (const f of r.failures) {
    assert.equal(f.unevaluated, true, `${f.id} did not mark itself unevaluated`);
    assert.equal(f.margin, -1);
  }
});

test("failures are ordered worst-first, so the UI shows one line and it is the right one", () => {
  const r = run({ landmarkDriftPx: 30, cheekMedianL: { left: 68, right: 61 } });
  assert.ok(r.failures.length >= 2);
  for (let i = 1; i < r.failures.length; i++) {
    assert.ok(r.failures[i - 1].margin <= r.failures[i].margin, "failures are not sorted by margin");
  }
  assert.equal(r.failures[0].id, "motion", "30px of drift is far worse than 7 L* of sidelight");
  assert.equal(r.worst.id, "motion");
});

test("the ring is driven by the worst margin even when nothing has failed", () => {
  // The ring has to fill continuously as the user improves, not snap from
  // empty to full at the threshold.
  const comfortable = run();
  const marginal = run({ landmarkDriftPx: MOTION_MAX_PX - 0.1 });
  assert.equal(marginal.pass, true);
  assert.ok(marginal.worst.margin < comfortable.worst.margin,
    "a barely-passing frame must report a smaller margin than a comfortable one");
  assert.ok(marginal.worst.margin >= 0);
});

test("margins are normalised, so `worst` is comparable across gates", () => {
  // Degrees against pixels against a variance: without normalisation, "worst"
  // is whichever gate happens to use the largest units.
  const r = run({ pose: { yaw: 24, pitch: 0, roll: 0 }, landmarkDriftPx: 6.6 });
  assert.ok(Math.abs(r.margins.pose - -1) < 1e-9, `pose margin ${r.margins.pose}`);
  assert.ok(Math.abs(r.margins.motion - -0.1) < 1e-9, `motion margin ${r.margins.motion}`);
  for (const m of Object.values(r.margins)) {
    assert.ok(m >= -1 && m <= 1, `margin ${m} is outside [-1, 1]`);
  }
});

test("every margin is persisted, passing or failing", () => {
  // Persisted on the reading so a capture that scraped through can be told
  // apart later from one that sailed through.
  const r = run({ landmarkDriftPx: 5.9 });
  assert.deepEqual(Object.keys(r.margins).sort(), GATES.map((g) => g.id).sort());
  assert.ok(r.margins.motion > 0 && r.margins.motion < 0.05);
});

/* ───────────────────────────────────────────────────────────── the copy ── */

test("every message states the fix and never blames the user", () => {
  const ids = new Set();
  for (const g of GATES) {
    assert.ok(g.message.length > 0, `${g.id} has no message`);
    assert.doesNotMatch(g.message, /\b(sorry|invalid|failed|error|wrong|bad)\b/i,
      `${g.id}: "${g.message}" states a fault rather than a fix`);
    // The user is taking a photograph, not passing an exam.
    assert.doesNotMatch(g.message, /\byou (are|have|will)\b/i, `${g.id}: "${g.message}"`);
    assert.ok(!ids.has(g.id), `duplicate gate id ${g.id}`);
    ids.add(g.id);
  }
  assert.equal(GATES.length, 10, "the brief specifies ten gates");
});

test("the gate ids are exactly the ten the brief names", () => {
  assert.deepEqual(GATES.map((g) => g.id).sort(), [
    "distance", "filter", "illuminant", "motion", "overexposed", "pose",
    "roiValidity", "sclera", "sidelight", "underexposed",
  ]);
});
