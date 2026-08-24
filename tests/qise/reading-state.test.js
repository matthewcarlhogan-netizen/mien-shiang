/*
 * The state model itself: derivation, banding, trajectory, and the stability of
 * the key.
 *
 * `reading-collision.test.js` proves the state space maps onto distinct
 * readings. It cannot prove the state is DERIVED correctly from a real
 * interpretation — a derivation that always returned the same state would sail
 * through a collision sweep, because one state cannot collide with itself.
 * That is this file's job.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deriveReadingState, stateKey, magnitudeBandOf, confidenceBandOf,
  historyStageOf, trajectoryOf, isReachable, READING_AFFECTING,
  NON_READING_AFFECTING, STATE_KEY_SEPARATOR,
} from "../../src/qise/reading-state.js";

const readAt = (ascendant, z, extra = {}) => ({
  state: "read",
  compass: { ascendant, z },
  validCount: 12,
  ...extra,
});

/* ── banding ─────────────────────────────────────────────────────────────── */

test("magnitude bands are read off the noise-floor multiple, not a raw delta", () => {
  assert.equal(magnitudeBandOf(0), "level");
  assert.equal(magnitudeBandOf(0.99), "level");
  assert.equal(magnitudeBandOf(1.0), "slight");
  assert.equal(magnitudeBandOf(1.79), "slight");
  assert.equal(magnitudeBandOf(1.8), "clear");
  assert.equal(magnitudeBandOf(2.99), "clear");
  assert.equal(magnitudeBandOf(3.0), "marked");
  // Direction is a separate dimension; magnitude is unsigned.
  assert.equal(magnitudeBandOf(-3.4), "marked");
  assert.equal(magnitudeBandOf(NaN), "level");
});

test("confidence bands include a below-threshold value rather than clamping", () => {
  assert.equal(confidenceBandOf(0.95), "high");
  assert.equal(confidenceBandOf(0.7), "moderate");
  assert.equal(confidenceBandOf(0.6), "limited");
  assert.equal(confidenceBandOf(0.59), "below");
  // A missing confidence is not a good one. Absent input is not a pass.
  assert.equal(confidenceBandOf(null), "below");
  assert.equal(confidenceBandOf(undefined), "below");
});

test("history stage tracks the count of usable readings", () => {
  assert.equal(historyStageOf(0), "calibrating");
  assert.equal(historyStageOf(2), "calibrating");
  assert.equal(historyStageOf(3), "establishing");
  assert.equal(historyStageOf(9), "establishing");
  assert.equal(historyStageOf(10), "established");
});

/* ── trajectory: the largest legitimate personalisation axis ─────────────── */

test("a movement never seen before in this segment reads as first", () => {
  assert.equal(trajectoryOf("chi", "clear", []), "first");
  assert.equal(trajectoryOf("chi", "clear", [
    { ascendant: "ping", magnitudeBand: "level" },
    { ascendant: "bai", magnitudeBand: "slight" },
  ]), "first");
});

test("a movement present across the last consecutive readings reads as persisting", () => {
  assert.equal(trajectoryOf("chi", "slight", [
    { ascendant: "chi", magnitudeBand: "slight" },
    { ascendant: "chi", magnitudeBand: "clear" },
  ]), "persisting");
});

test("a movement seen before but absent from the last reading reads as settling", () => {
  assert.equal(trajectoryOf("chi", "slight", [
    { ascendant: "chi", magnitudeBand: "clear" },
    { ascendant: "ping", magnitudeBand: "level" },
  ]), "settling");
});

test("a single earlier occurrence with the last reading also moving reads as repeating", () => {
  assert.equal(trajectoryOf("chi", "slight", [
    { ascendant: "chi", magnitudeBand: "clear" },
    { ascendant: "ping", magnitudeBand: "level" },
    { ascendant: "chi", magnitudeBand: "slight" },
  ]), "repeating");
});

test("a run of level days is not a pattern", () => {
  assert.equal(trajectoryOf("ping", "level", [
    { ascendant: "ping", magnitudeBand: "level" },
    { ascendant: "ping", magnitudeBand: "level" },
  ]), "steady");
});

test("trajectory is only claimed for the ascendant that actually moved", () => {
  // A history full of a DIFFERENT colour must not make today look repeated.
  assert.equal(trajectoryOf("chi", "clear", [
    { ascendant: "bai", magnitudeBand: "marked" },
    { ascendant: "bai", magnitudeBand: "marked" },
  ]), "first");
});

/* ── derivation ──────────────────────────────────────────────────────────── */

test("a read state carries every declared reading-affecting field", () => {
  const s = deriveReadingState({
    interpreted: readAt("chi", { a: 2.4, b: 0.1 }),
    confidence: 0.9,
    recent: [],
  });
  for (const f of READING_AFFECTING) {
    assert.ok(s[f] !== undefined && s[f] !== null, `derivation left "${f}" unset`);
  }
  assert.equal(s.availability, "read");
  assert.equal(s.magnitudeBand, "clear");
  assert.equal(s.direction, "up");
  assert.equal(s.confidenceBand, "high");
  assert.ok(isReachable(s), `derivation produced an unreachable state: ${stateKey(s)}`);
});

test("too little history abstains rather than inventing a baseline", () => {
  const s = deriveReadingState({
    interpreted: { state: "calibrating", readingsSoFar: 1 },
    confidence: 0.9,
  });
  assert.equal(s.historyStage, "calibrating");
  assert.equal(s.availability, "abstained_calibrating");
  assert.equal(s.trajectory, "steady");
  assert.ok(isReachable(s));
});

test("below-threshold confidence abstains even when the measurement moved", () => {
  const s = deriveReadingState({
    interpreted: readAt("hei", { periorbitalL: -3.6 }),
    confidence: 0.41,
    recent: [],
  });
  assert.equal(s.confidenceBand, "below");
  assert.equal(s.availability, "abstained_confidence");
  assert.ok(isReachable(s));
});

test("opposing axes read as mixed rather than being averaged into one direction", () => {
  const s = deriveReadingState({
    interpreted: readAt("qing", { a: 2.2, b: -2.6 }),
    confidence: 0.88,
  });
  assert.equal(s.direction, "mixed");
});

test("derivation over the plausible input range only ever produces reachable states", () => {
  // The collision sweep is over isReachable(). If derivation can produce a
  // state the sweep never visits, that state has never been proven distinct
  // from any other — the guarantee would have a hole exactly where real users
  // are.
  const ascendants = ["chi", "huang", "qing", "bai", "hei", "ping"];
  const zs = [0, 0.4, 1.2, 2.5, 4.1, -1.9, -3.3];
  const confidences = [0.95, 0.8, 0.62, 0.4, null];
  const counts = [0, 2, 5, 40];
  const histories = [
    [],
    [{ ascendant: "chi", magnitudeBand: "clear" }],
    [{ ascendant: "chi", magnitudeBand: "clear" }, { ascendant: "chi", magnitudeBand: "slight" }],
    [{ ascendant: "chi", magnitudeBand: "clear" }, { ascendant: "ping", magnitudeBand: "level" }],
  ];

  let checked = 0;
  for (const a of ascendants)
    for (const z of zs)
      for (const c of confidences)
        for (const n of counts)
          for (const recent of histories) {
            const interpreted = n < 3
              ? { state: "calibrating", readingsSoFar: n }
              : readAt(a, { a: z, b: z / 2 }, { validCount: n });
            const s = deriveReadingState({ interpreted, confidence: c, recent });
            assert.ok(isReachable(s), `derivation produced an unreachable state: ${stateKey(s)}`);
            checked++;
          }
  assert.ok(checked > 1000, `only ${checked} derivations exercised`);
});

/* ── the key ─────────────────────────────────────────────────────────────── */

test("the state key is stable, ordered, and covers exactly the declared fields", () => {
  const s = deriveReadingState({
    interpreted: readAt("chi", { a: 2.4 }),
    confidence: 0.9,
    heritageConstruct: "fourRivers",
    sourceLineage: "variant",
    region: "centre",
  });
  const key = stateKey(s);

  // Pinned literally. Reordering or renaming a field silently invalidates every
  // stored key and every declared equivalence, so it must be a visible change.
  assert.equal(key,
    "region=centre|ascendant=chi|direction=up|magnitudeBand=clear|confidenceBand=high|"
    + "historyStage=established|trajectory=first|heritageConstruct=fourRivers|"
    + "sourceLineage=variant|availability=read");

  assert.equal(key.split(STATE_KEY_SEPARATOR).length, READING_AFFECTING.length);
});

test("no non-reading-affecting field leaks into the key", () => {
  const base = { interpreted: readAt("chi", { a: 2.4 }), confidence: 0.9 };
  const plain = deriveReadingState(base);
  const annotated = deriveReadingState({ ...base, selfReport: { sleep: "low", mood: "flat" } });
  assert.equal(stateKey(plain), stateKey(annotated),
    "self-report changed the state identity; it is declared additive, not identifying");
  assert.ok(NON_READING_AFFECTING.includes("selfReport"));
});

test("the same inputs always derive the same key", () => {
  const args = { interpreted: readAt("bai", { L: -2.1 }), confidence: 0.72, recent: [] };
  assert.equal(stateKey(deriveReadingState(args)), stateKey(deriveReadingState(args)));
});
