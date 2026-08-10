import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PHASE_MS, illuminationSequence, createIlluminationSession, illuminationPhase,
  meanFaceRgb, recordIlluminationSample, summarizeIllumination,
  publicIlluminationSummary,
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
