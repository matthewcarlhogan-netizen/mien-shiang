/*
 * Head pose — the input the pose gate was not receiving.
 *
 * The gate itself was correct and tested from the day it was written, and the
 * capture loop fed it `{yaw: 0, pitch: 0, roll: 0}`. A gate that can never
 * fire is worse than no gate: it reports itself passing on every frame and
 * contributes a constant to the ring. Same shape as CLAUDE.md item 23.
 *
 * The estimator is checked by ROTATING a synthetic mesh by a known angle and
 * asking for the angle back. That is the only kind of test that can catch a
 * plausible-looking trigonometric error — asserting on a hand-computed
 * expected value proves the two calculations agree, not that either is right.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  headPose, rollFromLandmarks, yawFromLandmarks, pitchFromLandmarks, correctRoll,
  ROLL_LANDMARKS, YAW_LANDMARKS, PITCH_LANDMARKS,
} from "../../src/qise/pose.js";
import { evaluateGates, POSE_ROLL_MAX, POSE_YAW_MAX, POSE_PITCH_MAX } from "../../src/qise/gates.js";
import { canonicalFace, FRAME_W } from "./fixtures/synthetic.js";

const PTS = canonicalFace();
const near = (a, b, tol, what) =>
  assert.ok(a !== null && Math.abs(a - b) <= tol, `${what}: expected ${b}, got ${a}`);

/**
 * The canonical mesh lifted into 3D, then rotated by known angles.
 *
 * z starts at 0 for every point, which makes the mesh a flat plane — enough to
 * exercise the estimator exactly, because both axes it measures are recovered
 * from the ROTATION rather than from any facial relief.
 */
function posed({ yaw = 0, pitch = 0, roll = 0 } = {}) {
  const cx = PTS.reduce((s, p) => s + p.x, 0) / PTS.length;
  const cy = PTS.reduce((s, p) => s + p.y, 0) / PTS.length;
  const r = (d) => (d * Math.PI) / 180;

  return PTS.map((p) => {
    let x = p.x - cx, y = p.y - cy, z = 0;

    // Yaw about the vertical axis.
    const cb = Math.cos(r(yaw)), sb = Math.sin(r(yaw));
    [x, z] = [x * cb + z * sb, -x * sb + z * cb];

    // Pitch about the horizontal axis.
    const ca = Math.cos(r(pitch)), sa = Math.sin(r(pitch));
    [y, z] = [y * ca - z * sa, y * sa + z * ca];

    // Roll in the image plane.
    const cc = Math.cos(r(roll)), sc = Math.sin(r(roll));
    [x, y] = [x * cc - y * sc, x * sc + y * cc];

    return { x: x + cx, y: y + cy, z };
  });
}

/* ────────────────────────────────────────────────────────── the landmarks ── */

test("the estimator uses the pairs it documents", () => {
  assert.deepEqual([...ROLL_LANDMARKS], [33, 263]);
  assert.deepEqual([...YAW_LANDMARKS], [234, 454]);
  assert.deepEqual([...PITCH_LANDMARKS], [10, 152]);
});

/* ────────────────────────────────────────────────────────────────── roll ── */

test("roll is exact from the inter-ocular axis, in both directions", () => {
  near(rollFromLandmarks(PTS), 0, 1e-9, "upright");
  for (const angle of [-25, -8, -0.5, 3, 12, 30]) {
    near(rollFromLandmarks(posed({ roll: angle })), angle, 1e-6, `roll ${angle}`);
  }
});

test("roll needs no depth, so it survives a 2D landmark array", () => {
  const flat = PTS.map((p) => ({ x: p.x, y: p.y }));
  near(rollFromLandmarks(flat), 0, 1e-9, "2D roll");
  assert.equal(yawFromLandmarks(flat), null, "yaw must refuse without depth");
  assert.equal(pitchFromLandmarks(flat), null, "pitch must refuse without depth");
});

/* ─────────────────────────────────────────────────────────── yaw and pitch ── */

test("yaw is recovered from a known rotation", () => {
  for (const angle of [-40, -12, -3, 0, 5, 18, 35]) {
    near(yawFromLandmarks(posed({ yaw: angle })), angle, 1e-6, `yaw ${angle}`);
  }
});

test("pitch is recovered from a known rotation", () => {
  for (const angle of [-30, -11, -2, 0, 4, 15, 28]) {
    near(pitchFromLandmarks(posed({ pitch: angle })), angle, 1e-6, `pitch ${angle}`);
  }
});

test("roll is recovered EXACTLY, including the yaw-by-pitch cross term", () => {
  // The projected inter-ocular angle is not the roll. Applying yaw b, pitch a
  // and roll c puts the projection at c + atan(tan b * sin a) — a bias that
  // vanishes whenever either yaw or pitch is zero, which is precisely why the
  // per-axis tests above pass and this one had to be written separately.
  //
  // Uncorrected the bias reaches 3.45 degrees over this window, and it is not
  // cosmetic: yaw -12 / pitch -11 / roll -10 projects to -7.68 and clears the
  // 8-degree roll limit.
  let worstRaw = 0, worstCorrected = 0;
  for (let y = -14; y <= 14; y += 2) {
    for (let p = -14; p <= 14; p += 2) {
      for (let c = -12; c <= 12; c += 2) {
        const pts = posed({ yaw: y, pitch: p, roll: c });
        worstRaw = Math.max(worstRaw, Math.abs(rollFromLandmarks(pts) - c));
        worstCorrected = Math.max(worstCorrected, Math.abs(headPose(pts).roll - c));
      }
    }
  }
  assert.ok(worstRaw > 2, `the raw projection should be visibly biased; measured ${worstRaw.toFixed(3)}`);
  assert.ok(worstCorrected < 0.2,
    `corrected roll error ${worstCorrected.toFixed(4)} deg (raw was ${worstRaw.toFixed(3)})`);

  // Yaw and pitch are unaffected by the correction and stay near-exact.
  let worstYaw = 0, worstPitch = 0;
  for (let y = -12; y <= 12; y += 3) {
    for (let p = -12; p <= 12; p += 3) {
      const m = headPose(posed({ yaw: y, pitch: p, roll: 5 }));
      worstYaw = Math.max(worstYaw, Math.abs(m.yaw - y));
      worstPitch = Math.max(worstPitch, Math.abs(m.pitch - p));
    }
  }
  assert.ok(worstYaw < 0.5, `yaw error ${worstYaw.toFixed(3)}`);
  assert.ok(worstPitch < 0.5, `pitch error ${worstPitch.toFixed(3)}`);
});

test("the specific head that used to slip through the roll gate now trips it", () => {
  // The regression, stated as the case rather than as a bound. Note that the
  // yaw gate does NOT catch this one: marginBelow(12, 12) is 0, and 0 passes.
  const pose = headPose(posed({ yaw: -12, pitch: -11, roll: -10 }));
  assert.ok(Math.abs(pose.yaw) <= POSE_YAW_MAX, "yaw is exactly at its limit, so it passes");
  assert.ok(Math.abs(pose.roll) > POSE_ROLL_MAX,
    `roll measured ${pose.roll.toFixed(2)}, which must exceed the ${POSE_ROLL_MAX} limit`);
  assert.ok(run(pose).failures.some((f) => f.id === "pose"), "the pose gate let a 10-degree roll through");
});

test("the correction is a no-op when there is nothing to correct", () => {
  // It must not perturb the common case, and must not fire when an axis it
  // needs is absent.
  assert.equal(correctRoll(6, 0, 0), 6);
  assert.equal(correctRoll(6, null, -10), 6);
  assert.equal(correctRoll(6, -10, null), 6);
  assert.equal(correctRoll(null, 1, 2), null);
  // Yaw alone or pitch alone leaves the projection unbiased.
  assert.ok(Math.abs(headPose(posed({ yaw: 12, roll: 7 })).roll - 7) < 1e-6);
  assert.ok(Math.abs(headPose(posed({ pitch: 12, roll: 7 })).roll - 7) < 1e-6);
});

test("yaw stays exact well past the limit, so a badly turned head is caught", () => {
  // The gate has to be right about REJECTING, and a large angle that reads
  // small would be the dangerous direction.
  for (const angle of [13, 18, 25, 40]) {
    near(yawFromLandmarks(posed({ yaw: angle })), angle, 1e-6, `yaw ${angle}`);
  }
});

test("a degenerate pair is refused rather than reported as zero", () => {
  const collapsed = PTS.map(() => ({ x: 10, y: 10, z: 0 }));
  assert.equal(yawFromLandmarks(collapsed), null);
  assert.equal(pitchFromLandmarks(collapsed), null);
  assert.equal(rollFromLandmarks([]), null);
  assert.equal(rollFromLandmarks(null), null);
  // Coincident eye corners give atan2(0, 0) === 0 — a confident report of
  // "perfectly level" from a frame that measured nothing.
  assert.equal(rollFromLandmarks(collapsed), null);
  assert.deepEqual(headPose(collapsed).axesMeasured, []);
});

/* ─────────────────────────────────────────────────────────────── headPose ── */

test("headPose reports which axes it actually measured", () => {
  const full = headPose(posed({ yaw: 5, pitch: 3, roll: 2 }));
  assert.deepEqual(full.axesMeasured, ["yaw", "pitch", "roll"]);
  assert.equal(full.source, "landmarks3d");

  const flat = headPose(PTS.map((p) => ({ x: p.x, y: p.y })));
  assert.deepEqual(flat.axesMeasured, ["roll"]);
  assert.equal(flat.source, "landmarks2d");
  assert.equal(flat.yaw, null, "an unmeasured axis is null, never zero");
  assert.equal(flat.pitch, null);

  const nothing = headPose([]);
  assert.deepEqual(nothing.axesMeasured, []);
  assert.equal(nothing.source, "none");

  // `source` is derived from what was measured, not from roll alone. A frame
  // with depth but no usable eye corners measures two axes, and reporting
  // "none" beside an axesMeasured of length two is a contradiction.
  const noEyes = posed({ yaw: 6, pitch: 4 }).map((p, i) =>
    (i === 33 || i === 263) ? { x: 100, y: 100, z: p.z } : p);
  const partial = headPose(noEyes);
  assert.deepEqual(partial.axesMeasured, ["yaw", "pitch"]);
  assert.notEqual(partial.source, "none");
});

/* ─────────────────────────────────────────── the gate, on real pose input ── */

const stats = (pose) => ({
  frameWidth: FRAME_W, pose,
  skinPixelCount: 100000, skinPixelsAtOrAbove250: 100, skinPixelsAtOrBelow12: 100,
  cheekMedianL: { left: 60, right: 60 }, landmarkDriftPx: 1.5,
  laplacianVariance: 40, validRoiCount: 8,
});
const sclera = { pixelCount: 400, rawRatios: { r: 1, g: 1, b: 1 } };
const run = (pose) => evaluateGates(stats(pose), PTS, sclera);

test("an unmeasured axis is NOT read as perfectly straight", () => {
  // Math.abs(null) is 0. Treating an unmeasured axis as a number reports it as
  // straight on every frame — the missing-input defect, one level down.
  const r = run({ yaw: null, pitch: null, roll: 2 });
  assert.equal(r.pass, true);
  assert.equal(r.failures.find((f) => f.id === "pose"), undefined);
});

test("a measured axis outside its limit trips the gate, including roll alone", () => {
  for (const [axis, limit] of [["yaw", POSE_YAW_MAX], ["pitch", POSE_PITCH_MAX], ["roll", POSE_ROLL_MAX]]) {
    const pose = { yaw: 0, pitch: 0, roll: 0, [axis]: limit + 1 };
    assert.ok(run(pose).failures.some((f) => f.id === "pose"), `${axis} did not trip`);
  }
  assert.ok(run({ yaw: null, pitch: null, roll: POSE_ROLL_MAX + 1 }).failures.some((f) => f.id === "pose"),
    "roll alone must still gate when it is the only axis measured");
});

test("a pose with nothing measurable is unevaluated, which is a failure", () => {
  const pose = run({ yaw: null, pitch: null, roll: null }).failures.find((f) => f.id === "pose");
  assert.ok(pose, "no axis was measurable and the gate passed anyway");
  assert.equal(pose.unevaluated, true);
});

test("a real posed mesh drives the gate end to end", () => {
  // The whole point of the file: pose that comes from a face, not from a
  // literal in the capture loop.
  assert.equal(run(headPose(posed({ yaw: 2, pitch: 1, roll: 1 }))).pass, true);
  assert.ok(run(headPose(posed({ yaw: 25 }))).failures.some((f) => f.id === "pose"));
  assert.ok(run(headPose(posed({ roll: 20 }))).failures.some((f) => f.id === "pose"));
  assert.ok(run(headPose(posed({ pitch: 22 }))).failures.some((f) => f.id === "pose"));
});
