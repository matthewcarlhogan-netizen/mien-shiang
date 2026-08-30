/*
 * SHARED READING-SIMULATION PRIMITIVES — the real pixel path, factored out.
 *
 * Both `scripts/parity.mjs` (the migration-gate harness) and
 * `scripts/retention-sim.mjs` (the four-analysis retention/exhaustion
 * simulator) need the same base capability: a synthetic face measured
 * through the REAL capture arithmetic — real ROI reads, real Lab
 * conversion, real metrics, real `interpretReading` — with only the
 * day-to-day "weather" synthesised on top. That capability belongs in one
 * place so the two scripts can never quietly diverge on what a simulated
 * day actually measures.
 *
 * Nothing here is migration-gate-specific (classification, claim profiles,
 * dimension sensitivity, the parity report) — that stays in parity.mjs,
 * which is the one place asking "are the two engines the same shape of
 * good?". This file only answers "what would a real capture, and a
 * plausible run of real captures, measure?".
 */

import { computeReadingMetrics, lumRatioP90P50 } from "../../src/qise/metrics.js";
import { readRois } from "../../src/qise/rois.js";
import { trimmedMedianLab } from "../../src/qise/camera.js";
import * as color from "../../src/qise/color.js";
import { syntheticFace } from "../../tests/qise/fixtures/synthetic.js";

import { interpretReading, axesOf, BASELINE_VERSION } from "../../src/qise/baseline.js";
import { passageFor, passageOccurrenceFor } from "../../src/qise/passages.js";
import { reflectionFor } from "../../src/qise/reading-pipeline.js";
import { stateKey } from "../../src/qise/reading-state.js";

/* ── the real capture arithmetic ─────────────────────────────────────────── */

export function measure(skin) {
  const { img, pts } = syntheticFace({ skin });
  const { rois } = readRois(img, pts, { mirrored: false }, color);
  const lab = {}, lumRatio = {};
  for (const [name, r] of Object.entries(rois)) {
    if (!r.pixels.length) continue;
    lab[name] = trimmedMedianLab(r.pixels, color);
    lumRatio[name] = lumRatioP90P50(r.pixels, color);
  }
  return computeReadingMetrics({ rawLab: lab, correctedLab: lab, lumRatio });
}

export const SKINS = Object.freeze({
  neutral: [198, 152, 138],
  warm: [222, 138, 126],
  pale: [214, 186, 178],
  sallow: [206, 168, 120],
  cool: [176, 152, 152],
  dim: [150, 116, 108],
});

export const MEASURED = Object.fromEntries(
  Object.entries(SKINS).map(([name, rgb]) => [name, axesOf(measure(rgb).corrected)]));

export const dayString = (i) => {
  const t = Date.UTC(2026, 0, 1) + i * 86400000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export function historyRows(axes, n, { captureClass = "auto", jitter = 0.12, compassOf = null } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    canonicalDay: dayString(i),
    valid: true,
    baselineVersion: BASELINE_VERSION,
    captureClass,
    lineageId: "seg-1",
    confidence: 0.9,
    readingState: "read",
    compass: compassOf ? compassOf(i) : { ascendant: "ping", magnitude: 0.2, band: null, z: {} },
    axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, v + ((i % 3) - 1) * jitter])),
  }));
}

/** Build one record exactly as `app.js` persists it. */
export function recordFor({ axesSource, history, confidence, dayIdx, captureClass = "auto" }) {
  const metricsLike = { hueVector: { a: axesSource.a, b: axesSource.b }, meanL: axesSource.L,
    meanChroma: axesSource.C, periorbitalL: axesSource.periorbitalL,
    ming: axesSource.ming, run: axesSource.run };
  const timestampIso = new Date(Date.UTC(2026, 0, 1 + dayIdx, 9)).toISOString();
  const interpreted = interpretReading(metricsLike, history, {
    confidence, timestampIso, captureMode: captureClass,
  });
  return {
    timestampIso,
    canonicalDay: dayString(dayIdx),
    lineageId: "seg-1",
    captureClass,
    baselineVersion: BASELINE_VERSION,
    axes: axesOf(metricsLike),
    deltas: interpreted.deltas,
    compass: interpreted.compass,
    z: interpreted.z,
    readingState: interpreted.state,
    confidence,
    valid: true,
  };
}

/* ── what the OLD (publicly shipped) engine renders for a record ────────── */

/**
 * Mirrors `screens.js`: below four comparable readings the passage slot holds a
 * fixed calibration story; above it, `passageFor`. Modelled rather than
 * imported because the real one needs a full view model, and the thing under
 * test is what reaches the user's eye.
 */
export function oldReading(record, history) {
  const valid = history.filter((r) => r && r.valid !== false).length;
  if (valid < 4) {
    return {
      text: "Your first readings set the anchor. The tradition reads a face against itself, so the app needs a few more before a personal change can be told from ordinary variation.",
      calibration: true,
      renderable: true,
    };
  }
  if (!record.compass) return { text: "", calibration: false, renderable: false };
  const p = passageFor(record.compass, record.z || {}, passageOccurrenceFor(record, history));
  return { text: p.text, calibration: false, renderable: true, provenanceId: p.provenanceId };
}

/* ── near-duplicate / repeat-exposure measurement ────────────────────────── */

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
export function jaccard(a, b) {
  const sh = (t) => {
    const w = words(t);
    if (w.length < 3) return new Set(w);
    const out = new Set();
    for (let i = 0; i < w.length - 1; i++) out.add(`${w[i]} ${w[i + 1]}`);
    return out;
  };
  const A = sh(a), B = sh(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * A plausible year of daily scans: slow seasonal drift, weekly rhythm, noise,
 * and occasional bad-light days. Deterministic — a seeded LCG, because a flaky
 * migration gate is worse than none.
 */
export function simulateDays(n) {
  let seed = 20260817;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const base = MEASURED.neutral;
  const history = [];
  const days = [];

  for (let i = 0; i < n; i++) {
    const season = Math.sin((i / 365) * Math.PI * 2) * 0.8;
    const weekly = Math.sin((i / 7) * Math.PI * 2) * 0.35;
    const shock = rnd() < 0.06 ? (rnd() - 0.5) * 6 : 0;
    const axes = {
      a: base.a + season + weekly + (rnd() - 0.5) * 0.6 + shock * 0.4,
      b: base.b + season * 0.6 + (rnd() - 0.5) * 0.5,
      L: base.L + weekly * 0.8 + (rnd() - 0.5) * 0.7 - Math.max(0, shock) * 0.3,
      C: base.C + (rnd() - 0.5) * 0.6,
      periorbitalL: base.periorbitalL - Math.max(0, weekly) * 1.2 + (rnd() - 0.5) * 0.8,
      ming: base.ming + (rnd() - 0.5) * 0.4,
      run: base.run + season * 0.5 + (rnd() - 0.5) * 0.5,
    };
    const confidence = rnd() < 0.12 ? 0.45 + rnd() * 0.14 : 0.72 + rnd() * 0.26;
    const record = recordFor({ axesSource: axes, history: [...history], confidence, dayIdx: i });
    const oldOut = oldReading(record, history);
    const fresh = reflectionFor(record, history);
    days.push({
      i,
      stateKey: fresh ? stateKey(fresh.state) : null,
      oldText: oldOut.text,
      newText: fresh ? fresh.composed.text : "",
      availability: fresh ? fresh.state.availability : null,
    });
    history.push({ ...record, axes, valid: true });
  }
  return days;
}

export function exposureStats(days, pick) {
  const texts = days.map(pick);
  const distinctTexts = new Set(texts).size;
  const distinctStates = new Set(days.map((d) => d.stateKey)).size;
  let consecutiveRepeats = 0;
  for (let i = 1; i < texts.length; i++) if (texts[i] === texts[i - 1]) consecutiveRepeats++;

  // Near-duplicate rate among DISTINCT texts: how much of the apparent variety
  // is a reader actually able to feel?
  const uniq = [...new Set(texts)];
  let nearPairs = 0, pairs = 0;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      pairs++;
      if (jaccard(uniq[i], uniq[j]) > 0.9) nearPairs++;
    }
  }
  /*
   * THE NUMBER THAT MATTERS FOR A DAILY RITUAL.
   *
   * Distinct-text counts flatter an engine that reworders itself. What a
   * returning user actually experiences is how often today's reading is one
   * they have already read word for word — which is a different question from
   * whether two readings are near-duplicates, and the one that "worth
   * returning to" turns on.
   */
  const seen = new Set();
  let alreadyRead = 0;
  for (const t of texts) {
    if (seen.has(t)) alreadyRead++;
    seen.add(t);
  }

  return {
    days: days.length,
    verbatimRepeatRate: days.length ? alreadyRead / days.length : 0,
    distinctTexts,
    distinctStates,
    textsPerState: distinctStates ? distinctTexts / distinctStates : 0,
    consecutiveRepeatRate: days.length > 1 ? consecutiveRepeats / (days.length - 1) : 0,
    nearDuplicateRate: pairs ? nearPairs / pairs : 0,
  };
}

export function repeatExposure(horizons = [30, 90, 365]) {
  const out = {};
  for (const n of horizons) {
    const days = simulateDays(n);
    out[n] = {
      old: exposureStats(days, (d) => d.oldText),
      next: exposureStats(days, (d) => d.newText),
      abstentionRate: days.filter((d) => d.availability !== "read").length / days.length,
    };
  }
  return out;
}
