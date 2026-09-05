/* Abstention is scarcity, not failure.
 *
 * When the light is untrue the beta shows no seal. The words around that must
 * not turn a refusal to measure into an accusation or an apology — and the
 * fix instruction beside it is the GATES' own, passed through rather than
 * paraphrased, so the beta cannot drift from what production tells the same
 * user about the same frame.
 *
 * Driven through the real captureInstruction over every real gate id, so a
 * new gate message written in the wrong register fails here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { GATES, captureInstruction } from "../../src/qise/gates.js";
import { abstainModel, VOICE } from "../../src/beta/beta-model.js";

/* Words that would recast an unmeasurable frame as a fault or an apology.
 *
 * Matched at WORD BOUNDARIES, not as substrings. "red" inside "coloured" is
 * the false positive that CLAUDE.md item 40 is about, and the gate copy
 * legitimately says "coloured lamps". A scanner confidently wrong about the
 * text it misread is worse than no scanner. */
const FORBIDDEN = [
  "red", "error", "failed", "failure", "broken", "sorry", "apologies",
  "invalid", "bad", "wrong", "unable",
];
const hasForbidden = (text, word) =>
  new RegExp(String.raw`\b${word}\b`, "i").test(text);

/** A statement ABOUT the reader is a claim; the app makes none. */
const CLAIM_STRUCTURE = /\byou\s+(are|will|feel|look|seem|have)\b/i;

function reportFor(id) {
  return { pass: false, failures: [{ id, message: `${id} gate`, unevaluated: false }], margins: {} };
}

const everyGateId = GATES.map((gate) => gate.id);

test("every real gate id produces an abstain surface with no fault vocabulary", () => {
  assert.ok(everyGateId.length >= 8, `expected the full gate set, saw ${everyGateId.length}`);

  for (const id of everyGateId) {
    const model = abstainModel(captureInstruction(reportFor(id)));
    const surface = `${model.line} ${model.action}`.toLowerCase();

    for (const word of FORBIDDEN) {
      assert.ok(!hasForbidden(surface, word),
        `gate "${id}" abstain surface contains "${word}": ${surface}`);
    }
    assert.ok(!CLAIM_STRUCTURE.test(surface),
      `gate "${id}" abstain surface makes a claim about the reader: ${surface}`);
    assert.ok(model.action.length > 0,
      `gate "${id}" must carry an actionable instruction, not a bare refusal`);
  }
});

test("the scan matches whole words, and can still fail", () => {
  // Positive control beside the negative one: the filter must reject a real
  // fault-register line while accepting "coloured lamps".
  assert.ok(!hasForbidden("turn off coloured lamps", "red"));
  assert.ok(hasForbidden("the capture failed", "failed"));
});

test("the abstain line is the poetic one, and it names the light rather than the person", () => {
  const model = abstainModel(captureInstruction(reportFor("underexposed")));
  assert.equal(model.line, "The light was untrue. No seal.");
  assert.equal(model.line, VOICE.abstain);
  assert.ok(!CLAIM_STRUCTURE.test(model.line));
});

test("the instruction is the gate's own worst-first message, not a rewrite", () => {
  // captureInstruction reports failures[0] — the worst margin, which gates.js
  // has already ordered. abstainModel must pass it through unchanged.
  const report = {
    pass: false,
    failures: [{ id: "motion", message: "motion" }, { id: "pose", message: "pose" }],
    margins: {},
  };
  const instruction = captureInstruction(report);
  const model = abstainModel(instruction);
  assert.equal(model.gateId, "motion", "the worst-first failure decides the message");
  assert.equal(model.action, instruction.detail || instruction.title);
});

test("an abstain with no report still refuses in the same register", () => {
  const model = abstainModel(null);
  assert.equal(model.line, VOICE.abstain);
  assert.ok(!CLAIM_STRUCTURE.test(`${model.line} ${model.action}`));
});
