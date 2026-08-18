/*
 * THE COLLISION AUDIT.
 *
 * READING_EXPERIENCE_CONTRACT.md §2 and §4 are the reason this file exists.
 * The product promise is that materially different interpreted states produce
 * materially different readings. A promise enforced by prose in a design
 * document is not enforced. This is the enforcement.
 *
 * Six ways a build fails here, one per contract clause:
 *
 *   1. a reading-affecting field is never consumed by any component
 *   2. a component reads state the registry did not declare
 *   3. a reachable state produces no reading
 *   4. two materially different states produce the same reading, undeclared
 *   5. a reading-affecting dimension cannot move the output on its own
 *   6. an abstained reading picks up prose that assumes a measurement happened
 *
 * ── WHY THE SWEEP IS EXHAUSTIVE AND NOT SAMPLED ────────────────────────────
 * A sampled sweep finds the collisions that are common and misses the ones in
 * the corners, and the corners are where reading quality actually degrades —
 * the marked movement on a limited-confidence day, the settling trajectory
 * during a lineage variant. The declared space filtered through isReachable()
 * is a five-figure count of cheap string builds. Exhaustive is affordable, so
 * sampled would be a choice to know less for no gain.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  READING_AFFECTING, NON_READING_AFFECTING, stateKey, enumerateReachableStates,
  isReachable, REGIONS, ASCENDANTS, DIRECTIONS, MAGNITUDE_BANDS,
  CONFIDENCE_BANDS, HISTORY_STAGES, TRAJECTORIES, HERITAGE_CONSTRUCTS,
  SOURCE_LINEAGES, AVAILABILITY,
} from "../../src/qise/reading-state.js";
import {
  COMPONENTS, composeReading, consumedFields, DECLARED_EQUIVALENCES,
  explainReading, LAYERS,
} from "../../src/qise/reflection.js";

const STATES = enumerateReachableStates();

/** Components whose prose presumes the observation succeeded. */
const OBSERVATION_ASSUMING = new Set(["observation", "magnitude"]);

const VALUES = Object.freeze({
  region: REGIONS,
  ascendant: ASCENDANTS,
  direction: DIRECTIONS,
  magnitudeBand: MAGNITUDE_BANDS,
  confidenceBand: CONFIDENCE_BANDS,
  historyStage: HISTORY_STAGES,
  trajectory: TRAJECTORIES,
  heritageConstruct: HERITAGE_CONSTRUCTS,
  sourceLineage: SOURCE_LINEAGES,
  availability: AVAILABILITY,
});

/* ── 0. the audit is actually looking at something ───────────────────────── */

test("the reachable state space is large enough to be worth defending", () => {
  assert.ok(STATES.length > 1000, `only ${STATES.length} reachable states`);
  const keys = new Set(STATES.map(stateKey));
  assert.equal(keys.size, STATES.length, "enumeration produced duplicate state keys");
});

/* ── 1. every reading-affecting field is consumed ────────────────────────── */

test("every reading-affecting field is consumed by at least one component", () => {
  const consumed = consumedFields();
  const orphans = READING_AFFECTING.filter((f) => !consumed.has(f));
  assert.deepEqual(orphans, [],
    `computed but never consumed: ${orphans.join(", ")}. Either wire it into a component or move it to NON_READING_AFFECTING.`);
});

test("no component declares a dependency that is not a declared state field", () => {
  const known = new Set([...READING_AFFECTING, ...NON_READING_AFFECTING]);
  for (const c of COMPONENTS) {
    for (const f of c.dependsOn) {
      assert.ok(known.has(f), `component "${c.id}" depends on undeclared field "${f}"`);
    }
  }
});

/* ── 2. no component reads state it did not declare ──────────────────────── */

test("no component reads a state field it did not declare", () => {
  // A Proxy records every property actually touched during render. Declaring a
  // dependency is therefore not a comment — an undeclared read fails here, and
  // an over-declaration fails the inertness test below. The registry cannot
  // drift away from the code in either direction.
  const sample = STATES.filter((_, i) => i % 97 === 0);
  assert.ok(sample.length > 20, "sample too small to be meaningful");

  for (const state of sample) {
    for (const c of COMPONENTS) {
      const touched = new Set();
      const spy = new Proxy({ ...state }, {
        get(target, prop) {
          if (typeof prop === "string") touched.add(prop);
          return target[prop];
        },
      });
      c.render(spy);
      const declared = new Set(c.dependsOn);
      for (const f of touched) {
        if (!READING_AFFECTING.includes(f) && !NON_READING_AFFECTING.includes(f)) continue;
        assert.ok(declared.has(f),
          `component "${c.id}" read "${f}" without declaring it in dependsOn`);
      }
    }
  }
});

/* ── 3. coverage — every reachable state produces a reading ──────────────── */

test("every reachable state produces a complete reading", () => {
  for (const state of STATES) {
    const composed = composeReading(state);
    assert.ok(composed.text && composed.text.length > 40,
      `state produced no usable reading: ${stateKey(state)}`);
    for (const layer of LAYERS) {
      assert.ok(composed.layers[layer].length > 0,
        `state produced nothing in the "${layer}" layer: ${stateKey(state)}`);
    }
    assert.ok(composed.trace.length >= 4, `thin trace for ${stateKey(state)}`);
  }
});

test("every reading can explain itself", () => {
  const composed = composeReading(STATES[0]);
  const why = explainReading(composed);
  assert.ok(why.length >= 4);
  for (const entry of why) {
    assert.ok(entry.sentence.length > 0);
    assert.ok(LAYERS.includes(entry.layer));
    assert.ok(entry.because.length > 0, "a sentence with no stated cause");
  }
});

/* ── 4. THE COLLISION SWEEP ──────────────────────────────────────────────── */

test("no two materially different states produce the same reading", () => {
  const byText = new Map();
  for (const state of STATES) {
    const { text } = composeReading(state);
    const key = stateKey(state);
    if (!byText.has(text)) byText.set(text, []);
    byText.get(text).push(key);
  }

  const exempt = new Set();
  for (const e of DECLARED_EQUIVALENCES) {
    exempt.add([e.a, e.b].sort().join("::"));
  }

  const collisions = [];
  for (const [text, keys] of byText) {
    if (keys.length < 2) continue;
    // A declared equivalence covers a pair. A bucket of three needs all three
    // pairs declared, which is deliberate: silently widening an exemption is
    // how a two-state exception becomes a twelve-state collapse.
    let allDeclared = true;
    for (let i = 0; i < keys.length && allDeclared; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (!exempt.has([keys[i], keys[j]].sort().join("::"))) { allDeclared = false; break; }
      }
    }
    if (!allDeclared) collisions.push({ keys, text: text.slice(0, 120) });
  }

  assert.deepEqual(collisions, [],
    `${collisions.length} undeclared reading collisions. Either differentiate the corpus or add an entry to DECLARED_EQUIVALENCES with a sharedReadingReason.`);
});

/* ── 5. no inert dimension ───────────────────────────────────────────────── */

test("every reading-affecting dimension can move the reading on its own", () => {
  // For each field, find a reachable pair differing ONLY in that field and
  // prove the rendered text differs. A field with no such pair is either
  // structurally determined by another field — in which case it is not a
  // dimension — or its corpus branch is missing.
  const reachableKeys = new Set(STATES.map(stateKey));
  const byKey = new Map(STATES.map((s) => [stateKey(s), s]));

  for (const field of READING_AFFECTING) {
    let provenBy = null;

    outer:
    for (const state of STATES) {
      for (const value of VALUES[field]) {
        if (value === state[field]) continue;
        const candidate = { ...state, [field]: value };
        if (!isReachable(candidate)) continue;
        const candidateKey = stateKey(candidate);
        if (!reachableKeys.has(candidateKey)) continue;
        const a = composeReading(state).text;
        const b = composeReading(byKey.get(candidateKey)).text;
        if (a !== b) { provenBy = { from: state[field], to: value }; break outer; }
      }
    }

    assert.ok(provenBy,
      `"${field}" is declared reading-affecting but no reachable single-field change moves the reading. It is inert: wire it into a component, or move it to NON_READING_AFFECTING.`);
  }
});

/* ── 5b. per-COMPONENT responsiveness ────────────────────────────────────── */

test("every declared dependency actually moves the component that declares it", () => {
  /*
   * Test 5 works at the whole-reading level, and that is not strict enough.
   * Verified by induced break: making the headline ignore `direction` left all
   * twelve tests green, because `observation` also reads direction and the
   * assembled text still differed. The dimension survived; the sentence that
   * was supposed to respond to it had gone quietly dead.
   *
   * A component that declares a dependency is promising that sentence responds
   * to that field. This holds it to the promise at the granularity the promise
   * was made.
   */
  const byKey = new Map(STATES.map((s) => [stateKey(s), s]));

  for (const c of COMPONENTS) {
    for (const field of c.dependsOn) {
      if (NON_READING_AFFECTING.includes(field)) continue;
      let moved = false;

      outer:
      for (const state of STATES) {
        for (const value of VALUES[field]) {
          if (value === state[field]) continue;
          const candidate = { ...state, [field]: value };
          if (!isReachable(candidate)) continue;
          const other = byKey.get(stateKey(candidate));
          if (!other) continue;
          if (c.render(state) !== c.render(other)) { moved = true; break outer; }
        }
      }

      assert.ok(moved,
        `component "${c.id}" declares "${field}" but no reachable single-field change moves its output. Either the corpus branch is missing or the dependency is decorative.`);
    }
  }
});

/* ── 6. abstention never borrows prose that assumes a measurement ────────── */

test("an abstained reading never carries prose that assumes the observation succeeded", () => {
  const abstained = STATES.filter((s) => s.availability !== "read");
  assert.ok(abstained.length > 100, "no abstention states in the sweep");

  for (const state of abstained) {
    const composed = composeReading(state);
    for (const part of composed.parts) {
      assert.ok(!OBSERVATION_ASSUMING.has(part.id),
        `abstained state emitted "${part.id}": ${stateKey(state)}`);
    }
    assert.ok(composed.parts.some((p) => p.id === "availability"),
      `abstained state gave no reason for the gap: ${stateKey(state)}`);
  }
});

test("components that assume a measurement return nothing at all when abstained", () => {
  /*
   * Checking the assembled parts is not enough. Verified by induced break:
   * deleting the abstention guard from `magnitude` changed no test, because
   * every abstained state carries magnitudeBand "level", whose qualifier is the
   * empty string, so the component was dropped for being empty rather than for
   * being wrong. The guard was passing by accident, which is the same as not
   * being there when a future band is given a non-empty qualifier.
   *
   * So the components are called directly and required to return null.
   */
  const assuming = COMPONENTS.filter((c) => OBSERVATION_ASSUMING.has(c.id));
  assert.equal(assuming.length, OBSERVATION_ASSUMING.size, "the guard lost track of a component");

  for (const state of STATES.filter((s) => s.availability !== "read")) {
    for (const c of assuming) {
      assert.equal(c.render(state), null,
        `component "${c.id}" produced output for an abstained state instead of standing down: ${stateKey(state)}`);
    }
  }
});

test("every abstention states a reason rather than only a refusal", () => {
  // EVERY variant, not the one occurrence 0 happens to select. Caught by the
  // variation layer: a second wording of the confidence abstention said
  // "not separable" where the guard was looking for "separated", and the guard
  // passed anyway because it only ever read the first variant.
  const availability = COMPONENTS.find((c) => c.id === "availability");
  const seen = new Set();
  for (const s of STATES) if (s.availability !== "read") seen.add(s.availability);
  assert.ok(seen.size >= 3, `only ${seen.size} kinds of abstention in the sweep`);

  for (const kind of seen) {
    const state = STATES.find((s) => s.availability === kind);
    const variants = availability.variants(state);
    assert.ok(variants.length >= 1);
    for (const line of variants) {
      assert.ok(/because|cannot|not enough|did not|needs|until|separab|separat|too early|by design/i.test(line),
        `"${kind}" refuses without explaining why: ${line}`);
    }
  }
});

/* ── 7. determinism ──────────────────────────────────────────────────────── */

test("the same state always produces the same reading", () => {
  for (const state of STATES.filter((_, i) => i % 53 === 0)) {
    assert.equal(composeReading(state).text, composeReading({ ...state }).text);
  }
});

test("no reading module reaches for Math.random or the wall clock", () => {
  // Contract §16. Randomness in the substance of a reading makes "why did I
  // receive this" unanswerable, and makes the collision sweep above a lie.
  for (const name of ["reading-state.js", "reflection.js", "reflection-corpus.js"]) {
    const src = readFileSync(fileURLToPath(new URL(`../../src/qise/${name}`, import.meta.url)), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/Math\.random/.test(code), `${name} uses Math.random`);
    assert.ok(!/Date\.now|new Date\(\)/.test(code), `${name} reads the wall clock`);
  }
});
