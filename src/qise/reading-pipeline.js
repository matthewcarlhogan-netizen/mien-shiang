/*
 * THE PRODUCTION PATH: a stored reading becomes an interpreted state.
 *
 * ── WHY THIS IS A SEPARATE MODULE AND NOT A FEW LINES IN app.js ────────────
 * `deriveReadingState` takes an already-shaped argument object. Left there, the
 * shaping would happen inline in the view layer, where it cannot be tested
 * without a browser and where the next person to touch it will quietly drop a
 * field. Every dimension the engine preserves has to survive the journey from
 * the persisted record to the assembler, and the journey is exactly where
 * dimensions get lost.
 *
 * So the journey is a pure function over the SAME object the store persists.
 * `tests/qise/reading-production-path.test.js` builds a record through the real
 * capture arithmetic and asserts each dimension arrives — not that the function
 * can be called, but that a real scan moves it.
 *
 * ── WHY ROTATION WALKS RATHER THAN HASHES ──────────────────────────────────
 * Contract §13 forbids implying a heritage construct was chosen by the user's
 * measurement. A hash of the date would be deterministic and satisfy the letter
 * of that, but it would also be unpredictable to the user, which makes the
 * rotation feel like a claim about them. Walking the constructs in order makes
 * the mechanism legible: someone who notices it moved from Five Mountains to
 * Four Rivers can see it is a cycle, not a verdict.
 */

import {
  deriveReadingState, magnitudeBandOf, historyStageOf, HERITAGE_CONSTRUCTS,
} from "./reading-state.js";
import { composeReading } from "./reflection.js";
import { stateKey } from "./reading-state.js";
import { sameMeasurementMethod, qiseMethodOf } from "../measurement-method.js";

/** Days since the Unix epoch for a canonical `YYYY-MM-DD`. Pure; no clock. */
export function dayIndex(canonicalDay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(canonicalDay || ""));
  if (!m) return 0;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

/**
 * Today's heritage study. Deterministic, legible, and disclosed as a rotation.
 *
 * The lineage alternates on a slower cycle than the construct, so a user who
 * reaches Four Rivers twice sees the two competing readings of 目 and 口 rather
 * than the same one forever. The disagreement is the point (B-020 §7).
 */
export function heritageRotation(canonicalDay) {
  const d = dayIndex(canonicalDay);
  const n = HERITAGE_CONSTRUCTS.length;
  const heritageConstruct = HERITAGE_CONSTRUCTS[((d % n) + n) % n];
  const cycle = Math.floor(d / n);
  const sourceLineage = heritageConstruct === "fourRivers" && (((cycle % 2) + 2) % 2) === 1
    ? "variant"
    : "primary";
  return { heritageConstruct, sourceLineage };
}

/** Readings in the same comparable segment as `reading`, oldest first. */
export function segmentOf(history, reading) {
  if (!Array.isArray(history) || !reading) return [];
  return history.filter((r) =>
    r
    && r.valid !== false
    && r.baselineVersion === reading.baselineVersion
    && sameMeasurementMethod(qiseMethodOf(r), qiseMethodOf(reading))
    && r.captureClass === reading.captureClass
    && (reading.lineageId ? r.lineageId === reading.lineageId : true)
    && r.timestampIso !== reading.timestampIso);
}

/**
 * The trajectory input: what moved on each earlier reading in this segment.
 *
 * Derived from the persisted compass rather than recomputed, because the
 * baseline those readings were measured against no longer exists — recomputing
 * would compare an old face to today's baseline and call the difference a
 * trend.
 */
export function recentMovements(history, reading, window = 6) {
  return segmentOf(history, reading)
    .slice(-window)
    .map((r) => {
      const compass = r.compass || null;
      const ascendant = (compass && compass.ascendant) || "ping";
      const magnitude = compass && typeof compass.magnitude === "number" ? compass.magnitude : 0;
      return { ascendant, magnitudeBand: magnitudeBandOf(magnitude) };
    });
}

/**
 * Which region the movement sits in.
 *
 * `hei` is weighted by the periorbital axis, so when that axis is the stronger
 * leg the observation genuinely is about the eyes. Any colour can lead there,
 * which is why region is a dimension and not a synonym for the colour.
 */
export function regionOf(reading) {
  const z = (reading && reading.compass && reading.compass.z) || null;
  if (!z) return "overall";
  const orbit = typeof z.periorbitalL === "number" ? Math.abs(z.periorbitalL) : 0;
  const face = typeof z.L === "number" ? Math.abs(z.L) : 0;
  // Neither axis moved: there is no region to name, and naming one anyway is
  // how a default becomes a claim.
  if (orbit < 1 && face < 1) return "overall";
  return orbit > face ? "periorbital" : "centre";
}

/**
 * The whole journey: persisted record + history → interpreted state.
 *
 * `availability` is left to `deriveReadingState` unless the caller knows
 * something the record cannot say — a region the camera can never support, for
 * instance, which is B-025's business rather than this path's.
 */
export function readingStateFromRecord(reading, history = [], options = {}) {
  if (!reading) return null;

  const segment = segmentOf(history, reading);
  const validCount = segment.length;
  const rotation = options.rotation || heritageRotation(reading.canonicalDay);

  const interpreted = reading.readingState === "read" && reading.compass
    ? {
      state: "read",
      compass: reading.compass,
      validCount,
    }
    : { state: "calibrating", readingsSoFar: validCount };

  return deriveReadingState({
    interpreted,
    recent: recentMovements(history, reading),
    confidence: typeof reading.confidence === "number" ? reading.confidence : null,
    region: regionOf(reading),
    heritageConstruct: rotation.heritageConstruct,
    sourceLineage: rotation.sourceLineage,
    availability: options.availability || null,
    selfReport: reading.selfReport || null,
  });
}

/**
 * How many times this exact interpreted state has occurred before.
 *
 * This is the input the variation layer walks, and it has to be derived rather
 * than stored: the state key depends on the corpus and rotation versions, so a
 * count persisted under an older version would silently mean something else.
 * Recomputing is O(n) derivations over the segment and costs nothing a user can
 * feel, and it has the property that matters — the same history always yields
 * the same count, on any device, for ever.
 *
 * Each earlier record is derived against ITS OWN past, not today's, because a
 * reading's state is a fact about the day it was taken.
 */
export function occurrenceIndexFor(reading, history = [], options = {}) {
  const target = readingStateFromRecord(reading, history, options);
  if (!target) return 0;
  const key = stateKey(target);
  const earlier = segmentOf(history, reading);

  let count = 0;
  for (let i = 0; i < earlier.length; i++) {
    const past = readingStateFromRecord(earlier[i], earlier.slice(0, i));
    if (past && stateKey(past) === key) count++;
  }
  return count;
}

/** The state and the assembled reading, from one persisted record. */
export function reflectionFor(reading, history = [], options = {}) {
  const state = readingStateFromRecord(reading, history, options);
  if (!state) return null;
  const occurrence = Number.isFinite(options.occurrence)
    ? options.occurrence
    : occurrenceIndexFor(reading, history, options);
  return {
    state,
    occurrence,
    composed: composeReading(state, { ...options, occurrence }),
    historyStage: historyStageOf(segmentOf(history, reading).length),
  };
}
