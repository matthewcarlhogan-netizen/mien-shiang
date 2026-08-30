/*
 * THE MIGRATION GATE.
 *
 * `scripts/parity.mjs` produces the evidence. This turns the evidence into a
 * build condition, because a report nobody re-runs is a report that describes
 * the day it was written.
 *
 * The rule is not "all gates pass". It is "the set of failing gates is exactly
 * the set we have written down, with a reason and a fix". A new failure goes
 * red. A fixed blocker ALSO goes red, until someone deletes it from the list —
 * which is how a blocker gets closed instead of quietly living forever.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { runParity, KNOWN_BLOCKERS, BANNED_STEMS, CLASSES } from "../../scripts/parity.mjs";
import { READING_AFFECTING } from "../../src/qise/reading-state.js";
import { reflectionMode } from "../../src/qise/reading-flags.js";

const REPORT = runParity();

test("the harness ran against a corpus worth trusting", () => {
  assert.ok(REPORT.coverage.total >= 1000, `only ${REPORT.coverage.total} records compared`);
  assert.equal(REPORT.coverage.oldRenderable, REPORT.coverage.total,
    "the old engine failed to render a record, so parity is measured against a gap");
});

/* ── question 1 — coverage ───────────────────────────────────────────────── */

test("every record the old engine renders, the new engine renders", () => {
  assert.deepEqual(REPORT.coverage.unhandled, []);
  assert.equal(REPORT.coverage.newRenderable, REPORT.coverage.oldRenderable);
});

test("no real record derives a state the collision sweep never visits", () => {
  assert.deepEqual(REPORT.coverage.unreachableStates, [],
    "a production state outside the swept space has never been proven distinct from anything");
});

/* ── question 2 — preservation ───────────────────────────────────────────── */

test("every divergence is classified, and none is a regression", () => {
  for (const cls of Object.keys(REPORT.byClass)) assert.ok(CLASSES.includes(cls));
  assert.equal(REPORT.byClass["needs review"], 0,
    "an unclassified divergence is the one most likely to matter");
  assert.equal(REPORT.byClass.regression, 0);
});

test("no reading loses substance relative to the passage it replaces", () => {
  assert.deepEqual(REPORT.preservation.lostInformation, []);
});

test("every new reading carries a complete trace", () => {
  assert.deepEqual(REPORT.preservation.traceIncomplete, []);
  assert.equal(REPORT.preservation.traceComplete, REPORT.coverage.newRenderable);
});

/* ── question 3 — personalisation ────────────────────────────────────────── */

test("every reading-affecting dimension is exercised on real records", () => {
  const measured = Object.keys(REPORT.personalisation);
  for (const field of READING_AFFECTING) {
    assert.ok(measured.includes(field), `no production-path measurement for "${field}"`);
    assert.ok(REPORT.personalisation[field].applicable > 0,
      `"${field}" was never exercised by a real record pair; it is untested, not proven`);
  }
});

test("the new engine expresses every dimension the old one collapsed", () => {
  for (const [field, v] of Object.entries(REPORT.personalisation)) {
    assert.equal(v.newExpresses, 1,
      `"${field}" moved the state on ${v.applicable} real records but changed the reading on only ${v.newMoved}`);
  }
});

test("the measurement is capable of showing a dimension as unexpressed", () => {
  // Otherwise the previous test proves nothing. The old engine is the control:
  // it must score zero on the dimensions it structurally cannot see.
  const blind = ["confidenceBand", "historyStage", "trajectory", "heritageConstruct", "availability"];
  for (const field of blind) {
    assert.equal(REPORT.personalisation[field].oldExpresses, 0,
      `the control engine scored above zero on "${field}"; the measure is not discriminating`);
  }
  assert.equal(REPORT.personalisation.ascendant.oldExpresses, 1,
    "the control engine scored zero on a dimension it does see; the measure is broken");
});

/* ── question 4 — safety ─────────────────────────────────────────────────── */

test("the new engine introduces no clinical vocabulary the old one avoided", () => {
  assert.deepEqual(REPORT.safety.newBannedStems, []);
  const canonical = readFileSync(
    fileURLToPath(new URL("./no-medical-language.test.js", import.meta.url)), "utf8");
  for (const stem of BANNED_STEMS) {
    assert.ok(canonical.includes(`"${stem}"`),
      `the parity harness checks "${stem}" but the shipped guard does not; the two lists have drifted`);
  }
});

test("the new engine is never more assertive and never claims the future", () => {
  assert.deepEqual(REPORT.safety.moreAssertive, []);
  assert.deepEqual(REPORT.safety.newFutureClaims, []);
});

test("the new engine never asserts where the old one withheld", () => {
  assert.deepEqual(REPORT.safety.newAssertedWhereOldAbstained, []);
});

test("an abstained reading never narrates a measurement anyway", () => {
  // The decision and the prose have to agree. Verified by induced break: with
  // the abstention guard removed from the observation component, this is the
  // test in the parity suite that notices.
  assert.deepEqual(REPORT.safety.abstainedButNarrated, []);
});

test("abstention is strictly gained, not traded", () => {
  assert.ok(REPORT.safety.oldAssertedWhereNewAbstains > 0,
    "the new engine abstains nowhere the old one asserted; the safety improvement is unevidenced");
  assert.ok(REPORT.safety.hedgeDelta > 0,
    "the new readings hold themselves no more loosely than the ones they replace");
});

/* ── the gate itself ─────────────────────────────────────────────────────── */

test("the failing gates are exactly the blockers we have written down", () => {
  const failing = REPORT.gates.filter((g) => !g.pass).map((g) => g.id).sort();
  const known = KNOWN_BLOCKERS.map((b) => b.id).sort();
  assert.deepEqual(failing, known,
    `unexpected gate movement.\n  failing: ${failing.join(", ") || "none"}\n  declared: ${known.join(", ") || "none"}\n`
    + "A new failure is a regression. A gate that started passing must be removed from KNOWN_BLOCKERS.");
});

test("every declared blocker states why it blocks and how it gets fixed", () => {
  for (const b of KNOWN_BLOCKERS) {
    assert.ok(b.why && b.why.length > 30, `blocker "${b.id}" has no stated reason`);
    assert.ok(b.fix && b.fix.length > 30, `blocker "${b.id}" has no stated fix`);
  }
});

test("the Reflection Engine is on by default for closed beta while explicit comparison modes remain available", () => {
  assert.equal(reflectionMode({}), "on");
  assert.equal(reflectionMode({ hostname: "unknown.example" }), "on");
});

test("all three rollout modes remain available", () => {
  assert.equal(reflectionMode({ search: "?reflection=on" }), "on");
  assert.equal(reflectionMode({ search: "?reflection=compare" }), "compare");
  assert.equal(reflectionMode({ search: "?reflection=off" }), "off");
});
