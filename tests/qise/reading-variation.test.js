/*
 * THE VARIATION LAYER.
 *
 * Repetition was the one blocker on making the Reflection Engine default: over
 * a simulated year it showed prose the reader had already met on 69% of days,
 * because seeding from the state key — the thing that made collisions
 * detectable — also made a returning state return the same words.
 *
 * The fix must not buy variety with the guarantees. So this file holds the two
 * halves of the promise against each other:
 *
 *   EQUIVALENCE   every variant of one state makes the same claim, at the same
 *                 confidence, with the same relationship to the source, and is
 *                 explained by the same components and causes. Only the framing
 *                 moves.
 *
 *   DISTINCTNESS  no variant of one state is ever the text of another state, at
 *                 any occurrence. The collision guarantee is not weakened by
 *                 variation; it is extended across it.
 *
 * ── WHY AN ODOMETER AND NOT A HASH ─────────────────────────────────────────
 * A hashed pick repeats by the birthday bound: with 648 combinations it is more
 * likely than not to repeat within about thirty occurrences. A mixed-radix
 * walk visits every combination exactly once before any repeat, so
 * non-repetition is a property of the construction rather than a number that
 * happened to come out well on one simulated year.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { enumerateReachableStates, stateKey } from "../../src/qise/reading-state.js";
import {
  composeReading, COMPONENTS, variationCycle, variantIndices, LAYERS,
} from "../../src/qise/reflection.js";
import { HERITAGE } from "../../src/qise/reflection-corpus.js";

const STATES = enumerateReachableStates();
const READ = STATES.filter((s) => s.availability === "read");
const ABSTAINED = STATES.filter((s) => s.availability !== "read");

const ASSERTIVE = /\byou are\b|\byou have\b|\byou will\b|\byou'll\b/i;
const BANNED = /\b(diagnos|disease|symptom|treat|cure|healthy|unhealthy|deficien|organ|liver|kidney|spleen|lung|heart|predict|forecast|illness|medical|patient|therapy)/i;

const profileOf = (composed) => ({
  ids: composed.parts.map((p) => p.id).join(">"),
  causes: composed.trace.map((t) => `${t.id}:${t.drivenBy.join(",")}`).join("|"),
  layers: LAYERS.map((l) => composed.layers[l].length).join("/"),
  banned: BANNED.test(composed.text),
  assertive: (composed.text.match(ASSERTIVE) || []).length,
});

/* ── 1. the cycle is big enough to matter ────────────────────────────────── */

test("every state can say itself many ways before it must repeat", () => {
  // A year of daily scans on one persistent state is the worst case a real user
  // can present. The cycle must clear it comfortably.
  for (const s of READ.filter((_, i) => i % 401 === 0)) {
    assert.ok(variationCycle(s) >= 365,
      `a read state exhausts its wordings in ${variationCycle(s)} occurrences: ${stateKey(s)}`);
  }
  for (const s of ABSTAINED.filter((_, i) => i % 401 === 0)) {
    assert.ok(variationCycle(s) >= 24,
      `an abstained state exhausts its wordings in ${variationCycle(s)} occurrences: ${stateKey(s)}`);
  }
});

/* ── 2. the odometer visits every combination before repeating ───────────── */

test("consecutive occurrences of one state never repeat until the cycle is spent", () => {
  for (const s of [READ[0], READ[Math.floor(READ.length / 2)], ABSTAINED[0]]) {
    const cycle = variationCycle(s);
    const seen = new Set();
    for (let o = 0; o < cycle; o++) seen.add(composeReading(s, { occurrence: o }).text);
    assert.equal(seen.size, cycle,
      `state repeats a wording inside its own cycle (${seen.size} of ${cycle}): ${stateKey(s)}`);
    // And it wraps rather than drifting off the end.
    assert.equal(composeReading(s, { occurrence: cycle }).text,
      composeReading(s, { occurrence: 0 }).text);
  }
});

test("two states do not march through their variants in lockstep", () => {
  // Without a per-state phase offset, every state would show its first wording
  // on day one, its second on day two, and the product would feel like one
  // template being turned by a crank.
  const a = variantIndices(READ[0], 0).join(",");
  const b = variantIndices(READ[1], 0).join(",");
  assert.notEqual(a, b);
});

/* ── 3. EQUIVALENCE within a state ───────────────────────────────────────── */

test("every wording of one state makes the same claim in the same structure", () => {
  const sample = STATES.filter((_, i) => i % 149 === 0);
  assert.ok(sample.length > 50);

  for (const s of sample) {
    const base = profileOf(composeReading(s, { occurrence: 0 }));
    for (let o = 1; o < 12; o++) {
      const p = profileOf(composeReading(s, { occurrence: o }));
      assert.equal(p.ids, base.ids, `occurrence ${o} emits different components: ${stateKey(s)}`);
      assert.equal(p.causes, base.causes, `occurrence ${o} is explained differently: ${stateKey(s)}`);
      assert.equal(p.layers, base.layers, `occurrence ${o} shifts content between layers: ${stateKey(s)}`);
      assert.equal(p.banned, base.banned);
      assert.equal(p.assertive, base.assertive, `occurrence ${o} changes how assertive the reading is: ${stateKey(s)}`);
    }
  }
});

test("no wording of any state carries a claim the others avoid", () => {
  for (const s of STATES.filter((_, i) => i % 211 === 0)) {
    for (let o = 0; o < 8; o++) {
      const text = composeReading(s, { occurrence: o }).text;
      assert.ok(!BANNED.test(text), `clinical vocabulary at occurrence ${o}: ${stateKey(s)}`);
      assert.ok(!/\byou will\b|\byou'll\b/i.test(text), `a claim about the future at occurrence ${o}`);
    }
  }
});

test("the source passage and its attribution never vary", () => {
  // Provenance is not a surface to re-angle. What a Ming text says must not
  // depend on how many times the app has been opened.
  const heritage = COMPONENTS.find((c) => c.id === "heritage");
  const note = COMPONENTS.find((c) => c.id === "heritageNote");
  for (const s of STATES.filter((_, i) => i % 97 === 0)) {
    assert.equal(heritage.variants(s).length, 1, "the heritage passage has more than one wording");
    assert.equal(note.variants(s).length, 1, "the heritage note has more than one wording");
    const entry = (HERITAGE[s.heritageConstruct] || {})[s.sourceLineage]
      || HERITAGE[s.heritageConstruct].primary;
    for (let o = 0; o < 6; o++) {
      assert.ok(composeReading(s, { occurrence: o }).text.includes(entry.text),
        `the source passage changed at occurrence ${o}`);
    }
  }
});

test("abstention holds across every wording", () => {
  for (const s of ABSTAINED.filter((_, i) => i % 41 === 0)) {
    for (let o = 0; o < 10; o++) {
      const composed = composeReading(s, { occurrence: o });
      for (const part of composed.parts) {
        assert.ok(part.id !== "observation" && part.id !== "magnitude",
          `wording ${o} of an abstained state narrates a measurement: ${stateKey(s)}`);
      }
      assert.ok(composed.parts.some((p) => p.id === "availability"),
        `wording ${o} of an abstained state gives no reason`);
    }
  }
});

/* ── 4. DISTINCTNESS between states, across occurrences ──────────────────── */

function fnv(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

test("no wording of one state is ever the reading of another", () => {
  /*
   * The collision sweep proves distinctness at occurrence 0. Variation would be
   * worthless if the third wording of one state happened to be the first
   * wording of another — the guarantee has to hold across the whole product of
   * states and occurrences, not one slice of it.
   *
   * Hashed rather than stored: 15,000 states across four occurrences is sixty
   * thousand paragraphs, and holding them all costs more memory than the check
   * is worth. Hash collisions are resolved by recomputing both texts.
   */
  const seen = new Map();
  const collisions = [];
  const OCCURRENCES = 4;

  for (const s of STATES) {
    const key = stateKey(s);
    for (let o = 0; o < OCCURRENCES; o++) {
      const text = composeReading(s, { occurrence: o }).text;
      const h = fnv(text);
      const prior = seen.get(h);
      if (prior && prior.key !== key) {
        if (composeReading(prior.state, { occurrence: prior.o }).text === text) {
          collisions.push(`${prior.key} @${prior.o}  ==  ${key} @${o}`);
        }
      } else if (!prior) {
        seen.set(h, { key, state: s, o });
      }
    }
  }

  assert.deepEqual(collisions.slice(0, 5), [],
    `${collisions.length} readings shared between different states across occurrences`);
  assert.ok(seen.size > 40000, `only ${seen.size} distinct readings across the sweep`);
});

/* ── 5. determinism ──────────────────────────────────────────────────────── */

test("the same state and occurrence always give the same reading", () => {
  for (const s of STATES.filter((_, i) => i % 307 === 0)) {
    for (const o of [0, 3, 17, 400]) {
      assert.equal(composeReading(s, { occurrence: o }).text,
        composeReading({ ...s }, { occurrence: o }).text);
    }
  }
});

test("the trace records which wording was used, and the occurrence", () => {
  const s = READ[0];
  const composed = composeReading(s, { occurrence: 5 });
  assert.equal(composed.occurrence, 5);
  assert.equal(composed.variationCycle, variationCycle(s));
  const varied = composed.trace.filter((t) => t.variant !== "only");
  assert.ok(varied.length >= 3, "the trace does not say which wording was chosen");
  for (const t of varied) assert.match(t.variant, /^\d+ of \d+$/);
});

test("a negative or absurd occurrence is handled, not thrown", () => {
  const s = READ[0];
  assert.ok(composeReading(s, { occurrence: -4 }).text.length > 0);
  assert.ok(composeReading(s, { occurrence: 1e9 }).text.length > 0);
  assert.ok(composeReading(s, {}).text.length > 0);
});

test("the variation layer reaches for no clock and no randomness", () => {
  for (const name of ["reflection.js", "reflection-corpus.js", "reading-pipeline.js"]) {
    const src = readFileSync(fileURLToPath(new URL(`../../src/qise/${name}`, import.meta.url)), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/Math\.random/.test(code), `${name} uses Math.random`);
    assert.ok(!/Date\.now|new Date\(\)/.test(code), `${name} reads the wall clock`);
  }
});
