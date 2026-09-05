/* Everything the ledger and the ring show is within-person.
 *
 * Self-reference is the bias defence: nothing is compared to a population
 * scale, and there is no population in this repo to be average against
 * (CLAUDE.md, "The measurement layer", and item 33). The ledger's colour is
 * driven by the delta against the subject's OWN baseline, never by an absolute
 * Lab value — an absolute drawn here would read as a rating.
 *
 * Driven through the real model functions, with deltas of the shape
 * qise/baseline.js `deltasFrom` actually produces.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { stripComments } from "../../scripts/copy-scan.js";
import { ledgerModel, ringModel, readoutLine } from "../../src/beta/beta-model.js";
import { deltasFrom, computeBaseline } from "../../src/qise/baseline.js";

const BETA_DIR = fileURLToPath(new URL("../../src/beta", import.meta.url));

/* A short history of the same person, in the shape computeBaseline reads:
 * `axes` per row, and baselineVersion "v2" so qiseMethodOf resolves to the
 * sclera-corrected method. computeBaseline excludes the most recent three
 * rows, so a usable baseline needs more than three. */
function historyOf(values) {
  return values.map((b, i) => ({
    timestampIso: `2026-09-${String(i + 1).padStart(2, "0")}T09:00:00.000Z`,
    valid: true,
    baselineVersion: "v2",
    axes: { a: 8, b, L: 60, C: 15, periorbitalL: 58, ming: 0.5, run: 0.5 },
  }));
}

test("the ledger consumes within-person deltas and nothing else", () => {
  const entries = [
    { sealed: true, attenuated: false, deltas: { L: 0.4, a: -0.2, b: 1.1 } },
    { sealed: true, attenuated: true, deltas: { L: -0.9, a: 0.1, b: -1.2 } },
    { sealed: false, attenuated: false, deltas: null },
  ];
  const model = ledgerModel(entries);

  assert.equal(model.length, 3);
  // Warmth is a position between the two ends of the subject's own range.
  assert.ok(model[0].warmth > model[1].warmth,
    "a warmer delta must sit warmer than a cooler one");
  for (const square of model) {
    if (square.warmth === null) continue;
    assert.ok(square.warmth >= 0 && square.warmth <= 1,
      "warmth is a within-person position, always bounded");
  }
  // A reading with no delta is UNREAD, not zero. Absence of measurement and a
  // measurement of absence are different objects.
  assert.equal(model[2].kind, "unread");
  assert.equal(model[2].warmth, null);
});

test("the ledger never reads an absolute colour value", () => {
  // Same absolute Lab, opposite deltas: if an absolute leaked into the colour,
  // these two would render the same.
  const warm = ledgerModel([{ sealed: true, deltas: { L: 0, a: 0, b: 1.4 } }])[0];
  const cool = ledgerModel([{ sealed: true, deltas: { L: 0, a: 0, b: -1.4 } }])[0];
  assert.notEqual(warm.warmth, cool.warmth);

  // And an entry carrying an absolute Lab but no delta stays unread.
  const absoluteOnly = ledgerModel([
    { sealed: true, lab: { L: 62, a: 9, b: 14 }, deltas: null },
  ])[0];
  assert.equal(absoluteOnly.warmth, null,
    "an absolute Lab must not be able to colour a square");
});

test("the deltas the ledger receives are the store's own within-person deltas", () => {
  const history = historyOf([12, 13, 12.5, 13.2, 12.8, 12.9, 13.1]);
  const baseline = computeBaseline(history);
  assert.ok(baseline.ready, "the fixture must produce a usable baseline");

  const current = { a: 8, b: 14.5, L: 60, C: 15, periorbitalL: 58, ming: 0.5, run: 0.5 };
  const deltas = deltasFrom(current, baseline);
  assert.ok(deltas, "deltasFrom must produce within-person deltas");

  // The pipeline's own delta drives the model; nothing is recomputed here.
  const square = ledgerModel([{ sealed: true, deltas }])[0];
  assert.ok(Number.isFinite(square.warmth) || square.warmth === null);
  if (Number.isFinite(deltas.b)) {
    assert.ok(square.warmth !== null, "a measured delta must colour the square");
  }
});

test("the ring counts seals, and reads no value at all", () => {
  const model = ringModel([
    { sealed: true, attenuated: false, deltas: { L: 9, a: 9, b: 9 } },
    { sealed: true, attenuated: true, deltas: null },
    { sealed: false, attenuated: false, deltas: null },
  ]);
  assert.equal(model.total, 3);
  assert.equal(model.sealed, 2);
  assert.deepEqual(model.ticks.map((t) => t.kind), ["clean", "attenuated", "abstain"]);
  for (const tick of model.ticks) {
    assert.deepEqual(Object.keys(tick).sort(), ["angle", "index", "kind"],
      "a tick carries geometry and outcome; never a measured value");
  }
});

test("the readout states deltas as deltas, signed", () => {
  const line = readoutLine({ sealed: true, deltas: { L: 0.4, a: -0.2, b: 1.15 } }, 0);
  assert.match(line, /ΔL \+0\.4/);
  assert.match(line, /Δa -0\.2/);
  assert.ok(!/\b6[0-9]\.\d\b/.test(line), "no absolute lightness may appear");
  assert.equal(readoutLine({ sealed: false, deltas: null }, 1), "S02 · no seal");
});

test("no beta surface compares the reader to other people", () => {
  /* Anchored patterns, not substrings. A bare "top " matched inside "stop
   * agreeing" and a bare "rank" would match "frank" — the same segment-vs-
   * substring defect as CLAUDE.md item 40, which this file has now hit once
   * in each direction. The phrase has to be the comparison, not a fragment
   * of an unrelated word. */
  const POPULATION = [
    /\baverage\b/, /\bpercentile\b/, /\branked?\b/, /\bcompared to others\b/,
    /\bpopulation\b/, /\bthan most\b/, /\b(better|worse) than\b/,
    /\bscore of\b/, /\btop \d/, /\babove average\b/,
  ];
  for (const name of readdirSync(BETA_DIR)) {
    const raw = readFileSync(join(BETA_DIR, name), "utf8");
    // A comment explaining why a comparison is forbidden is not a comparison.
    const text = (/\.(js|css)$/.test(name) ? stripComments(raw) : raw).toLowerCase();
    for (const pattern of POPULATION) {
      assert.ok(!pattern.test(text),
        `beta/${name} contains a population comparison: ${pattern}`);
    }
  }

  // Positive control: the scan must still catch a real one.
  assert.ok(POPULATION.some((p) => p.test("you are in the top 10% of faces")));
  assert.ok(POPULATION.some((p) => p.test("above average symmetry")));
});
