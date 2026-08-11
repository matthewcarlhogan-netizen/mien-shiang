import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PHASE_MS, illuminationSequence, createIlluminationSession, illuminationPhase,
  meanFaceRgb, recordIlluminationSample, summarizeIllumination,
  publicIlluminationSummary, illuminationInterruption, abandonedIlluminationSummary,
} from "../../src/qise/illumination.js";

test("the screen-light sequence is slow, finite, and contains no saturated red", () => {
  for (const bit of [0, 1]) {
    const sequence = illuminationSequence(bit);
    assert.equal(sequence.length, 5);
    assert.ok(PHASE_MS >= 334, "phase changes could exceed three per second");
    assert.deepEqual(sequence.filter((p) => p.id !== "neutral").map((p) => p.id).sort(), ["blue", "green"]);
    for (const phase of sequence) {
      const [, r, g, b] = phase.colour.match(/^#(..)(..)(..)$/).map((v, i) => i ? parseInt(v, 16) : v);
      assert.ok(r / (r + g + b) < 0.8, `${phase.key} is a saturated red transition`);
    }
  }
});

test("phase boundaries do not repeat or skip the final state", () => {
  const session = createIlluminationSession(1000, 0);
  assert.equal(illuminationPhase(session, 1000).phase.key, "neutral-start");
  assert.equal(illuminationPhase(session, 1000 + PHASE_MS).phase.key, "blue");
  assert.equal(illuminationPhase(session, 1000 + PHASE_MS * 5 - 1).phase.key, "neutral-end");
  assert.equal(illuminationPhase(session, 1000 + PHASE_MS * 5).done, true);
});

test("the frame sampler reads valid face regions only", () => {
  const mean = meanFaceRgb({ rois: {
    a: { valid: true, pixels: [{ r: 10, g: 20, b: 30 }, { r: 30, g: 40, b: 50 }] },
    b: { valid: false, pixels: [{ r: 255, g: 255, b: 255 }] },
  } });
  assert.deepEqual(mean, { r: 20, g: 30, b: 40, n: 2 });
  assert.equal(meanFaceRgb({ rois: {} }), null);
});

test("expected blue and green responses are described as responsive, never as identity proof", () => {
  const session = createIlluminationSession(0, 0);
  const add = (key, rgb) => {
    recordIlluminationSample(session, key, rgb);
    recordIlluminationSample(session, key, rgb);
  };
  add("neutral-start", { r: 100, g: 100, b: 100 });
  add("neutral-middle", { r: 100, g: 100, b: 100 });
  add("neutral-end", { r: 100, g: 100, b: 100 });
  add("blue", { r: 90, g: 90, b: 130 });
  add("green", { r: 90, g: 130, b: 90 });

  const result = summarizeIllumination(session);
  assert.equal(result.outcome, "responsive");
  assert.ok(result.scores.blue > 0 && result.scores.green > 0);
  assert.doesNotMatch(JSON.stringify(result), /identity|verified|live person/i);
});

test("raw response scores cannot cross the persistence boundary", () => {
  const publicResult = publicIlluminationSummary({
    outcome: "responsive", phasesRead: 2, scores: { blue: 0.1, green: 0.2 },
  }, { requested: true });
  assert.deepEqual(Object.keys(publicResult).sort(), ["outcome", "phasesRead", "reason", "requested", "version"]);
  assert.equal(JSON.stringify(publicResult).includes("0.1"), false);
});

/* ── abandoning a session part-way ───────────────────────────────────────── */

test("a LOST FACE abandons the session, not only a failed gate", () => {
  // The defect: the capture loop cleared the wash when the gates failed and
  // not when the face was lost, because the face-lost branch is the `else` of
  // `if (mesh)` and sits outside the block that owned the session. The overlay
  // stayed painted at whatever colour the sequence had reached — blue or green
  // at 0.62 opacity — so the preview went dark and stayed dark while the copy
  // underneath asked for a face.
  const lost = illuminationInterruption({ hasFace: false, gatesPass: true });
  assert.equal(lost.abandon, true, "a session cannot continue without a face to sample");
  assert.equal(lost.reason, "face-lost");

  const moved = illuminationInterruption({ hasFace: true, gatesPass: false });
  assert.equal(moved.abandon, true);
  assert.equal(moved.reason, "frame-moved");

  const fine = illuminationInterruption({ hasFace: true, gatesPass: true });
  assert.equal(fine.abandon, false);
  assert.equal(fine.reason, null);
});

test("no face beats a failed gate, because there is nothing left to sample", () => {
  // Order is load-bearing: meanFaceRgb() reads the face regions, so with no
  // mesh the remaining phases record nothing whatever the gates say. Reporting
  // "frame-moved" here would name a cause that was never measured.
  const both = illuminationInterruption({ hasFace: false, gatesPass: false });
  assert.equal(both.reason, "face-lost");
});

test("an abandoned session reports NO phases read, whatever it had reached", () => {
  // A partial sequence has no neutral to compare against, so the phases that
  // were read cannot support a response either way. A non-zero count would
  // imply a measurement no arithmetic here produced.
  const summary = abandonedIlluminationSummary("face-lost");
  assert.equal(summary.outcome, "inconclusive");
  assert.equal(summary.phasesRead, 0);
  assert.equal(summary.requested, true, "the user did opt in; the run was cut short");
  assert.equal(summary.reason, "face-lost");
  assert.equal("scores" in summary, false, "raw responses must never reach persistence");
});
