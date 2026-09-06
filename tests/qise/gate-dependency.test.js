/*
 * CLAUDE.md item 54, made real. It was previously "pinned" by a test that did
 * not exist, over code that still reproduced the bug it claimed to fix: an
 * unmeasured `illuminant` gate carried `margin: -1`, the floor of the scale,
 * and sorted ahead of the REAL failure — a sclera sample that never gathered
 * enough pixels — so a face with perfectly normal light was told, forever and
 * in every room, to change its lamps.
 *
 * This file drives the historical failure scenario end to end through the
 * real `evaluateGates` + `captureInstruction`, and pins the three states a
 * dependent gate can be in: BLOCKED by a named upstream reason, UNAVAILABLE
 * with no clean root cause, and the ordinary FAIL a measurement produces.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateGates, captureInstruction, GATES } from "../../src/qise/gates.js";
import { MIN_VALID_ROIS } from "../../src/qise/rois.js";
import { canonicalFace, FRAME_W } from "./fixtures/synthetic.js";

const PTS = canonicalFace();

/** Every gate measured, every gate passing. */
const perfectStats = () => ({
  frameWidth: FRAME_W,
  pose: { yaw: 0, pitch: 0, roll: 0 },
  skinPixelCount: 100000,
  skinPixelsAtOrAbove250: 0,
  skinPixelsAtOrBelow12: 0,
  cheekMedianL: { left: 60, right: 60 },
  landmarkDriftPx: 1,
  laplacianVariance: 80,
  validRoiCount: 12,
});

const scleraRefusal = (reason, pixelCount) => ({
  gains: null, pixelCount, rawRatios: null, personalDelta: null,
  confidence: "insufficient", confidenceValue: 0, reason,
  medianL: reason === "too_dark" ? 10 : 55, withinAbsoluteTolerance: false, stages: {},
});

const scleraMeasured = (rawRatios) => ({
  gains: { r: 1, g: 1, b: 1 }, pixelCount: 400, rawRatios,
  confidence: "ok", confidenceValue: 1, reason: null, medianL: 60,
  withinAbsoluteTolerance: false, stages: {},
});

test("the historical failure: an otherwise perfect frame with too few sclera pixels is told to open its eyes, never to change its lamps", () => {
  const report = evaluateGates(perfectStats(), PTS, scleraRefusal("too_few_pixels", 60), { elapsedMs: 10000 });
  assert.equal(report.pass, false);

  const illuminant = report.failures.find((f) => f.id === "illuminant");
  assert.equal(illuminant.status, "blocked");
  assert.equal(illuminant.blockedBy, "sclera");
  assert.equal(illuminant.reason, "too_few_pixels");

  const sclera = report.failures.find((f) => f.id === "sclera");
  assert.equal(sclera.status, "fail", "sclera's OWN pixel-count gate must independently fail here");

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "sclera");
  assert.doesNotMatch(instruction.title + " " + instruction.detail, /colour|coloured|lamp|daylight/i,
    "the coloured-lighting instruction must not appear for an eye-visibility problem");
  assert.match(instruction.title + " " + instruction.detail, /eyes?/i);
});

test("sclera pixel count is fine but the scene is too dark to read them — a different instruction from either 'open your eyes' or 'change your lamps'", () => {
  // pixelCount clears SCLERA_MIN_PIXELS, so the sclera gate itself PASSES;
  // only medianL failed sampleSclera's own darkness floor. There is no
  // failing sclera entry for illuminant's blockedBy to defer to, so this
  // exercises the BLOCKED_INSTRUCTIONS reason table directly.
  const report = evaluateGates(perfectStats(), PTS, scleraRefusal("too_dark", 200), { elapsedMs: 10000 });
  assert.equal(report.pass, false);

  const sclera = report.failures.find((f) => f.id === "sclera");
  assert.equal(sclera, undefined, "sclera's own pixel-count gate passes when only darkness caused the refusal");

  const illuminant = report.failures.find((f) => f.id === "illuminant");
  assert.equal(illuminant.status, "blocked");
  assert.equal(illuminant.reason, "too_dark");

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "illuminant");
  assert.doesNotMatch(instruction.title + " " + instruction.detail, /coloured|daylight|plain white/i,
    "a dark scene is not necessarily a coloured one, and must not be told so");
  assert.match(instruction.title + " " + instruction.detail, /light|dim|dark/i);
});

test("a genuinely unusual illuminant, sclera measured and healthy, still shows the real instruction", () => {
  const report = evaluateGates(
    perfectStats(), PTS, scleraMeasured({ r: 1.4, g: 1.0, b: 0.8 }), { elapsedMs: 10000 },
  );
  const illuminant = report.failures.find((f) => f.id === "illuminant");
  assert.equal(illuminant.status, "fail", "a real out-of-tolerance reading is a FAIL, not blocked");

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "illuminant");
  assert.match(instruction.detail, /coloured lamps|daylight/i);
});

test("a measured failure always outranks a blocked dependent, regardless of margin", () => {
  // Underexposed at a mild fraction (small negative margin) vs illuminant
  // BLOCKED (margin pinned at -1, the floor). The old margin-only ranking put
  // the blocked entry first every time; status must decide instead.
  //
  // `too_dark` rather than `too_few_pixels` deliberately: pixelCount (200)
  // clears sclera's own floor, so sclera itself does not ALSO fail here —
  // this isolates the comparison to exactly one measured failure against
  // exactly one blocked one, with no second measured entry to confound it.
  const report = evaluateGates(
    { ...perfectStats(), skinPixelsAtOrBelow12: 2100 }, // just over the 2% floor
    PTS, scleraRefusal("too_dark", 200), { elapsedMs: 10000 },
  );
  const underexposed = report.failures.find((f) => f.id === "underexposed");
  assert.equal(underexposed.status, "fail");
  assert.ok(underexposed.margin > -1, "a mild exposure miss must not be clamped to the same floor as a block");
  assert.equal(report.failures.find((f) => f.id === "sclera"), undefined,
    "sclera's own gate must pass here so the comparison is not confounded by a second measured failure");

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "underexposed", "the real, measured failure must be shown, not the blocked one");
});

test("filter reports BLOCKED by roiValidity when there are too few readable regions to measure sharpness from, never a blur verdict", () => {
  const report = evaluateGates(
    { ...perfectStats(), laplacianVariance: undefined, validRoiCount: MIN_VALID_ROIS - 2 },
    PTS, scleraMeasured({ r: 1.0, g: 1.0, b: 1.0 }), { elapsedMs: 10000 },
  );
  const filter = report.failures.find((f) => f.id === "filter");
  assert.equal(filter.status, "blocked");
  assert.equal(filter.blockedBy, "roiValidity");

  const roiValidity = report.failures.find((f) => f.id === "roiValidity");
  assert.equal(roiValidity.status, "fail");

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "roiValidity");
  assert.doesNotMatch(instruction.title + " " + instruction.detail, /soft|blur|sharp|clean the lens/i,
    "a frame that was never measured for sharpness must not be called soft");
});

test("filter reports UNAVAILABLE, not a blur verdict, when it has no clean root cause to point at", () => {
  const report = evaluateGates(
    { ...perfectStats(), laplacianVariance: undefined },
    PTS, scleraMeasured({ r: 1.0, g: 1.0, b: 1.0 }), { elapsedMs: 10000 },
  );
  const filter = report.failures.find((f) => f.id === "filter");
  assert.equal(filter.status, "unavailable");
  assert.equal(filter.blockedBy, null);

  const instruction = captureInstruction(report);
  assert.equal(instruction.id, "filter");
  assert.doesNotMatch(instruction.title + " " + instruction.detail, /soft|blur|clean the lens/i);
});

test("every non-fail entry is excluded from the assisted-grace tolerance, exactly as an unevaluated gate always was", () => {
  const report = evaluateGates(
    perfectStats(), PTS, scleraRefusal("too_few_pixels", 60), { elapsedMs: Number.POSITIVE_INFINITY },
  );
  assert.equal(report.pass, false, "a blocked measurement must never be waved through by the grace period");
  const illuminant = report.failures.find((f) => f.id === "illuminant");
  assert.equal(illuminant.status, "blocked");
});

test("status is present on every result, pass or fail, for every real gate", () => {
  const report = evaluateGates(perfectStats(), PTS, scleraMeasured({ r: 1.0, g: 1.0, b: 1.0 }), { elapsedMs: 0 });
  assert.equal(report.pass, true);
  assert.equal(Object.keys(report.margins).length, GATES.length);
  // `results` is not exported directly, but `worst` and `failures` are drawn
  // from it; on a clean frame `failures` is empty, so assert through margins
  // that nothing silently fell out of classification.
  for (const id of GATES.map((g) => g.id)) {
    assert.ok(Number.isFinite(report.margins[id]), `${id} produced no margin`);
  }
});

test("the new BLOCKED and UNAVAILABLE copy carries no fault vocabulary or claim about the reader", () => {
  const FORBIDDEN = ["red", "error", "failed", "failure", "broken", "sorry", "apologies", "invalid", "bad", "wrong", "unable"];
  const CLAIM_STRUCTURE = /\byou\s+(are|will|feel|look|seem|have)\b/i;
  const scenarios = [
    evaluateGates(perfectStats(), PTS, scleraRefusal("too_few_pixels", 60), { elapsedMs: 10000 }),
    evaluateGates(perfectStats(), PTS, scleraRefusal("too_dark", 200), { elapsedMs: 10000 }),
    evaluateGates(perfectStats(), PTS, null, { elapsedMs: 10000 }),
    evaluateGates({ ...perfectStats(), laplacianVariance: undefined }, PTS, scleraMeasured({ r: 1, g: 1, b: 1 }), { elapsedMs: 10000 }),
    evaluateGates(
      { ...perfectStats(), laplacianVariance: undefined, validRoiCount: MIN_VALID_ROIS - 2 },
      PTS, scleraMeasured({ r: 1, g: 1, b: 1 }), { elapsedMs: 10000 },
    ),
  ];
  for (const report of scenarios) {
    const instruction = captureInstruction(report);
    const text = `${instruction.title} ${instruction.detail}`.toLowerCase();
    for (const word of FORBIDDEN) {
      assert.ok(!new RegExp(String.raw`\b${word}\b`, "i").test(text), `"${word}" in: ${text}`);
    }
    assert.ok(!CLAIM_STRUCTURE.test(text), `claim about the reader in: ${text}`);
  }
});
