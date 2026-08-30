/*
 * THE JOURNEY, NOT THE DESTINATION.
 *
 * `reading-collision.test.js` proves the engine keeps 15,000-odd states apart.
 * `reading-state.test.js` proves the state derives correctly from an
 * interpretation. Neither proves the thing most likely to go wrong in practice:
 * that a REAL scan carries its dimensions all the way to the assembler.
 *
 * Integration is where dimensions die. A field is dropped when the record is
 * built, or the view layer passes `null` where history should go, and every
 * unit test stays green while every user gets the same reading. So this file
 * starts at painted pixels, runs the real ROI reader, the real Lab conversion,
 * the real metrics and the real `interpretReading`, builds the record with the
 * same shape `app.js` persists — and then asserts that changing ONE thing about
 * the scan changes the reading.
 *
 * That is the only form of this test worth having. Asserting the pipeline
 * returns an object would pass on a pipeline that returns the same object every
 * time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeReadingMetrics, lumRatioP90P50 } from "../../src/qise/metrics.js";
import { readRois } from "../../src/qise/rois.js";
import { trimmedMedianLab } from "../../src/qise/camera.js";
import * as color from "../../src/qise/color.js";
import { syntheticFace } from "./fixtures/synthetic.js";

import {
  interpretReading, axesOf, readingConfidence, BASELINE_VERSION,
} from "../../src/qise/baseline.js";
import { passageFor } from "../../src/qise/passages.js";
import { READING_AFFECTING, stateKey, isReachable } from "../../src/qise/reading-state.js";
import {
  readingStateFromRecord, reflectionFor, heritageRotation, recentMovements, regionOf,
} from "../../src/qise/reading-pipeline.js";
import { LAYERS } from "../../src/qise/reflection.js";
import { readingTiersWithHeritage } from "../../src/qise/heritage-connections.js";

/* ── the real capture arithmetic ─────────────────────────────────────────── */

function measure(spec) {
  const { img, pts } = syntheticFace(spec);
  const { rois } = readRois(img, pts, { mirrored: false }, color);
  const lab = {}, lumRatio = {};
  for (const [name, r] of Object.entries(rois)) {
    if (!r.pixels.length) continue;
    lab[name] = trimmedMedianLab(r.pixels, color);
    lumRatio[name] = lumRatioP90P50(r.pixels, color);
  }
  return computeReadingMetrics({ rawLab: lab, correctedLab: lab, lumRatio });
}

const NEUTRAL = [198, 152, 138];
const WARM = [222, 138, 126];

/** A baseline built from axes that came out of the real pixel path. */
function historyFrom(axes, n = 14, jitter = 0.12) {
  return Array.from({ length: n }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 6, 1 + i)).toISOString(),
    canonicalDay: `2026-07-${String(1 + i).padStart(2, "0")}`,
    valid: true,
    baselineVersion: BASELINE_VERSION,
    captureClass: "auto",
    lineageId: "seg-1",
    confidence: 0.9,
    readingState: "read",
    compass: { ascendant: "ping", magnitude: 0.2, band: null, z: {} },
    axes: Object.fromEntries(Object.entries(axes).map(([k, v]) =>
      [k, v + ((i % 3) - 1) * jitter])),
  }));
}

/**
 * Build the record the way `app.js` builds it, from a real measurement.
 * Kept field-for-field in step with the production writer; if that shape
 * changes and this does not, the drift shows up as a dimension going flat.
 */
function scan({
  skin = NEUTRAL, history, confidence = 0.9,
  canonicalDay = "2026-08-17", timestampIso = "2026-08-17T09:00:00.000Z",
} = {}) {
  const metrics = measure({ skin });
  const interpreted = interpretReading(metrics.corrected, history, {
    confidence, timestampIso, captureMode: "auto",
  });
  return {
    timestampIso,
    canonicalDay,
    lineageId: "seg-1",
    captureClass: "auto",
    baselineVersion: BASELINE_VERSION,
    axes: axesOf(metrics.corrected),
    deltas: interpreted.deltas,
    compass: interpreted.compass,
    z: interpreted.z,
    readingState: interpreted.state,
    confidence,
    valid: true,
  };
}

const NEUTRAL_AXES = axesOf(measure({ skin: NEUTRAL }).corrected);
const BASE_HISTORY = historyFrom(NEUTRAL_AXES);

/* ── 1. a real scan arrives with every dimension intact ──────────────────── */

test("a real scan produces a complete, reachable interpreted state", () => {
  const record = scan({ history: BASE_HISTORY });
  const state = readingStateFromRecord(record, BASE_HISTORY);

  for (const field of READING_AFFECTING) {
    assert.ok(state[field] !== undefined && state[field] !== null,
      `the production path lost "${field}" between the record and the assembler`);
  }
  assert.ok(isReachable(state),
    `production produced a state the collision sweep never visits: ${stateKey(state)}`);
});

test("a real scan assembles a reading in all three layers, with a trace", () => {
  const record = scan({ history: BASE_HISTORY });
  const { composed } = reflectionFor(record, BASE_HISTORY);

  for (const layer of LAYERS) {
    assert.ok(composed.layers[layer].length > 0, `no ${layer} content from a real scan`);
  }
  assert.ok(composed.text.length > 120);
  assert.ok(composed.rotationDisclosure.length > 0, "rotation was not disclosed");
});

/* ── 2. the trace names the components AND their causes ──────────────────── */

test("the trace attributes every sentence to the state fields that produced it", () => {
  const record = scan({ history: BASE_HISTORY, confidence: 0.72 });
  const { composed } = reflectionFor(record, BASE_HISTORY);

  const byId = new Map(composed.trace.map((t) => [t.id, t]));
  for (const id of ["headline", "history", "confidence", "heritage", "reflection", "bridge"]) {
    assert.ok(byId.has(id), `the trace does not account for "${id}"`);
    assert.ok(byId.get(id).drivenBy.length > 0, `"${id}" appears in the trace with no stated cause`);
  }

  // The causes must be the ACTUAL values, not the field names alone — a trace
  // that says "driven by confidence" without saying which band is not an answer
  // to "why am I seeing this".
  assert.ok(byId.get("confidence").drivenBy.some((d) => d === "confidenceBand=moderate"));
  assert.ok(byId.get("heritage").drivenBy.some((d) => d.startsWith("heritageConstruct=")));

  const layers = new Set(composed.trace.map((t) => t.layer));
  for (const layer of LAYERS) assert.ok(layers.has(layer), `trace has no ${layer} entry`);
});

/* ── 3. one change to the scan changes the reading ───────────────────────── */

const textOf = (record, history) => reflectionFor(record, history).composed.text;

test("a warmer face changes the ascendant AND the reading", () => {
  const neutral = scan({ history: BASE_HISTORY });
  const warm = scan({ skin: WARM, history: BASE_HISTORY });

  assert.notEqual(warm.compass.ascendant, neutral.compass.ascendant,
    "the fixture no longer produces a different colour; the test has stopped testing");
  assert.notEqual(textOf(warm, BASE_HISTORY), textOf(neutral, BASE_HISTORY));
});

test("the same face at a different confidence changes the reading", () => {
  const clean = scan({ skin: WARM, history: BASE_HISTORY, confidence: 0.95 });
  const murky = scan({ skin: WARM, history: BASE_HISTORY, confidence: 0.65 });
  assert.notEqual(textOf(clean, BASE_HISTORY), textOf(murky, BASE_HISTORY));
});

test("the same scan on a different day changes the heritage passage", () => {
  const a = scan({ history: BASE_HISTORY, canonicalDay: "2026-08-17" });
  const b = scan({ history: BASE_HISTORY, canonicalDay: "2026-08-18" });
  assert.notEqual(
    heritageRotation(a.canonicalDay).heritageConstruct,
    heritageRotation(b.canonicalDay).heritageConstruct);
  assert.notEqual(textOf(a, BASE_HISTORY), textOf(b, BASE_HISTORY));
});

test("the same scan against a different personal history changes the reading", () => {
  // Contract §10 — the largest legitimate personalisation axis. Same face, same
  // day, same confidence: only what came before differs.
  const record = scan({ skin: WARM, history: BASE_HISTORY });
  const firstTime = BASE_HISTORY;
  const seenBefore = BASE_HISTORY.map((r, i) => (i >= BASE_HISTORY.length - 2
    ? { ...r, compass: { ascendant: record.compass.ascendant, magnitude: 2.2, band: "clear", z: {} } }
    : r));

  const a = readingStateFromRecord(record, firstTime);
  const b = readingStateFromRecord(record, seenBefore);
  assert.notEqual(a.trajectory, b.trajectory,
    "history reached the state model without changing the trajectory");
  assert.notEqual(textOf(record, firstTime), textOf(record, seenBefore));
});

test("recent movements come from the persisted compass, not a recomputation", () => {
  const record = scan({ history: BASE_HISTORY });
  const marked = BASE_HISTORY.map((r) =>
    ({ ...r, compass: { ascendant: "bai", magnitude: 3.4, band: "marked", z: {} } }));
  const moves = recentMovements(marked, record);
  assert.ok(moves.length > 0);
  for (const m of moves) {
    assert.equal(m.ascendant, "bai");
    assert.equal(m.magnitudeBand, "marked");
  }
});

/* ── 4. integration does not collapse dimensions ─────────────────────────── */

test("distinct production scenarios stay distinct after integration", () => {
  const scenarios = [];
  for (const skin of [NEUTRAL, WARM])
    for (const confidence of [0.95, 0.78, 0.65])
      for (const canonicalDay of ["2026-08-17", "2026-08-18", "2026-08-19"])
        for (const seen of [false, true]) {
          const history = seen
            ? BASE_HISTORY.map((r, i) => (i >= BASE_HISTORY.length - 2
              ? { ...r, compass: { ascendant: "chi", magnitude: 2.2, band: "clear", z: {} } }
              : r))
            : BASE_HISTORY;
          const record = scan({ skin, history, confidence, canonicalDay });
          scenarios.push({
            key: stateKey(readingStateFromRecord(record, history)),
            text: textOf(record, history),
          });
        }

  const byText = new Map();
  for (const s of scenarios) {
    if (!byText.has(s.text)) byText.set(s.text, new Set());
    byText.get(s.text).add(s.key);
  }
  for (const [text, keys] of byText) {
    assert.equal(keys.size, 1,
      `integration collapsed ${keys.size} distinct states onto one reading:\n  ${[...keys].join("\n  ")}\n  ${text.slice(0, 100)}`);
  }

  const distinctStates = new Set(scenarios.map((s) => s.key));
  const distinctTexts = new Set(scenarios.map((s) => s.text));
  assert.equal(distinctTexts.size, distinctStates.size,
    "the production path produced fewer distinct readings than distinct states");
  assert.ok(distinctStates.size >= 12, `only ${distinctStates.size} distinct production states exercised`);
});

/* ── 5. abstention on the real path ──────────────────────────────────────── */

test("a real scan below the confidence threshold abstains and claims nothing", () => {
  const record = scan({ skin: WARM, history: BASE_HISTORY, confidence: 0.4 });
  const { state, composed } = reflectionFor(record, BASE_HISTORY);

  assert.equal(state.availability, "abstained_confidence");
  assert.equal(state.ascendant, "ping", "an abstained reading still named a colour");
  assert.equal(state.magnitudeBand, "level");
  for (const part of composed.parts) {
    assert.ok(part.id !== "observation" && part.id !== "magnitude",
      `an abstained real scan emitted "${part.id}"`);
  }
  assert.ok(composed.parts.some((p) => p.id === "availability"));
});

test("a scan with too little history abstains as calibrating, not as a failure", () => {
  const short = BASE_HISTORY.slice(0, 2);
  const record = scan({ history: short });
  const { state, composed } = reflectionFor(record, short);
  assert.equal(state.historyStage, "calibrating");
  assert.equal(state.availability, "abstained_calibrating");
  assert.match(composed.text, /baseline|watched/i);
});

test("confidence reaching the record is the confidence the capture computed", () => {
  // Guards the seam where a view layer helpfully substitutes a default.
  const c = readingConfidence({
    scleraConfidenceValue: 0.8, validFraction: 0.9, frameJitter: 0.4, captureTier: "clean",
  });
  const record = scan({ history: BASE_HISTORY, confidence: c });
  const state = readingStateFromRecord(record, BASE_HISTORY);
  assert.equal(typeof c, "number");
  assert.notEqual(state.confidenceBand, "below");
});

test("region is derived from the periorbital axis, not from the colour", () => {
  const record = scan({ history: BASE_HISTORY });
  const orbitLed = { ...record, compass: { ...record.compass, z: { L: 0.4, periorbitalL: -2.9 } } };
  const faceLed = { ...record, compass: { ...record.compass, z: { L: -2.9, periorbitalL: 0.2 } } };
  assert.equal(regionOf(orbitLed), "periorbital");
  assert.equal(regionOf(faceLed), "centre");
});

/* ── 6. the old engine is untouched ──────────────────────────────────────── */

test("the existing passage engine still runs on the same record", () => {
  // Contract from the owner: do not remove the current engine until the new
  // path has parity evidence. Both must work on the same input, so the flag
  // comparison has something to compare.
  const record = scan({ skin: WARM, history: BASE_HISTORY });
  const old = passageFor(record.compass, record.z || {}, 0);
  assert.ok(old.text.length > 0);
  assert.equal(old.provenanceId, "qise-passages-v1");

  const fresh = reflectionFor(record, BASE_HISTORY).composed;
  assert.equal(fresh.provenance.engine, "reflection-engine-v1");
  assert.notEqual(fresh.text, old.text);
});

/*
 * ── 7. the lineage adapter through the REAL production path ─────────────────
 *
 * A prior test (tests/heritage/composition.test.js) claimed to prove
 * `five-mountains-mutual-facing` reaches `SOURCE_PANEL_CEILING`
 * "through the REAL Stage-3 production composition path" — but it called
 * `composeHeritageForReading` with the explicit canonical id "taiqing-siku"
 * supplied directly. Nothing in the real reading pipeline ever supplies
 * that string: `heritageRotation()` and `reading-state.js`'s
 * `SOURCE_LINEAGES` only ever emit the ABSTRACT labels "primary"/"variant".
 * This is the actual real path — a persisted reading, through
 * `reflectionFor()`, through `readingTiersWithHeritage()` — for the one
 * `canonicalDay` that genuinely rotates to fiveMountains/primary (see
 * `heritageRotation` above; "2026-08-20" verified against
 * `HERITAGE_CONSTRUCTS`'s fixed six-day cycle).
 *
 * The beta product decision now explicitly routes the abstract "primary"
 * slot to the Taiqing facial witness. The source records remain distinct and
 * their disagreement metadata remains available; routing is not evidence
 * promotion. This test proves that the decision reaches the real reading
 * pipeline rather than only a direct Stage-3 unit call.
 *
 * Updated 2026-08-29 (project-owned Kanripo reconciliation, errata E-8): the
 * former `five-mountains-mutual-facing-fullness` connector referenced above
 * was split into `five-mountains-mutual-facing` and `five-mountains-fullness`,
 * both byte-pinned to VERIFIED_PRIMARY. This LINEAGE_RESEARCH_ONLY abstention is
 * a whole-construct routing gate, evaluated before either connector's own
 * evidence strength — so the split and the evidence promotion change neither
 * mechanism nor outcome here, only the id under test.
 */
test("fiveMountains/primary through the REAL reflectionFor()/readingTiersWithHeritage() path reaches the routed beta graph", () => {
  const canonicalDay = "2026-08-20";
  const rotation = heritageRotation(canonicalDay);
  assert.deepEqual(rotation, { heritageConstruct: "fiveMountains", sourceLineage: "primary" },
    "fixture assumption: this canonicalDay must rotate to fiveMountains/primary — the six-day cycle moved");

  const record = scan({ history: BASE_HISTORY, canonicalDay });
  const reflection = reflectionFor(record, BASE_HISTORY);
  assert.equal(reflection.state.heritageConstruct, "fiveMountains");
  assert.equal(reflection.state.sourceLineage, "primary",
    "the Reflection Engine state only ever carries the ABSTRACT label, never a canonical lineage id");

  const tiers = readingTiersWithHeritage(reflection, { captureQualityPassed: true, safetyPassed: true });

  // Tier 2: one bounded structural relationship is selected.
  assert.equal(tiers.tier2.connectors.available, true);
  assert.ok(tiers.tier2.connectors.connector);
  assert.ok(tiers.tier2.connectors.connector.prohibitedForUserInference);

  // Tier 3 (SOURCE_DEEP): the same routed selection expands without rerolling.
  const tier3Connectors = tiers.tier3.connectors;
  assert.equal(tier3Connectors.primaryLineage, "taiqing-siku");
  assert.ok(tier3Connectors.active.some((e) => e.connectorId === "five-mountains-mutual-facing"));
  assert.ok(tier3Connectors.active.length >= 2);
  assert.equal(
    tier3Connectors.renderPlan.relationshipOrder[0],
    tiers.tier2.connectors.connector.connectorId,
    "Tier 3 must expand the Tier 2 selection rather than independently reroll it",
  );
});

test("Five Officers uses its pinned alternate witness on the second lineage rotation", () => {
  const primaryDay = "2026-08-28";
  const variantDay = "2026-08-22";
  assert.deepEqual(heritageRotation(primaryDay), { heritageConstruct: "fiveOfficers", sourceLineage: "primary" });
  assert.deepEqual(heritageRotation(variantDay), { heritageConstruct: "fiveOfficers", sourceLineage: "variant" });

  const primary = reflectionFor(scan({ history: BASE_HISTORY, canonicalDay: primaryDay }), BASE_HISTORY);
  const variant = reflectionFor(scan({ history: BASE_HISTORY, canonicalDay: variantDay }), BASE_HISTORY);
  assert.equal(primary.state.sourceLineage, "primary");
  assert.equal(variant.state.sourceLineage, "variant");
  assert.match(variant.composed.text, /Renlun Datong Fu/i);
  assert.notEqual(primary.composed.text, variant.composed.text);
  assert.doesNotMatch(variant.composed.text, /[\u3400-\u9fff]/);
});
