/* Beta scanner — pure model layer.
 *
 * DOM-free by construction; every dependency that would reach a browser is
 * taken as an argument. beta.js is DOM wiring and nothing else.
 *
 * The split exists because `ui/qise/app.js` is the file nothing can import,
 * and this repo has twice shipped dead code behind a green suite there
 * (CLAUDE.md items 18a, 43, 44). A decision kept in a wiring file is a
 * decision nothing checks, so every decision that can be made without a
 * browser is made here.
 */

/** Verbatim tag strings. The seal's meaning is carried by these, so they are
 *  compared literally in tests rather than matched loosely. */
export const BOUNDARY_TAG = "edge-sensitive capture — read with reserve";
export const NOISE_TAG = "low light pushed the sensor — values attenuated";

export const VOICE = Object.freeze({
  banner: "Beta — instrument in calibration; readings are yours alone, nothing leaves this device.",
  boot: "The bench is open.",
  consentTitle: "Before the bench opens",
  consentBody:
    "The camera runs on this device only. Frames are measured and discarded in the same tick; no image and no mesh is ever stored or sent.",
  consentAccept: "Open the bench",
  sealed: (time) => `Sealed ${time}.`,
  abstain: "The light was untrue. No seal.",
  boundaryFlag: BOUNDARY_TAG,
  noiseFlag: NOISE_TAG,
  legend: "cooler ↔ warmer than the baseline — neither direction is better or worse",
  firstSeal: "Baseline founded. All comparison from here is to this alone.",
  calibrating: (soFar, needed) =>
    `Calibrating — reading ${soFar} of ${needed}. The compass opens once the baseline stands.`,
  libNote: "Depth is paid. Rigor is not.",
  toLibrary: "Open the study →",
  toTracker: "Return to the bench →",
});

export function formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDelta(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "--";
  return (v >= 0 ? "+" : "") + v.toFixed(1);
}

/**
 * Seal semantics.
 *
 * filled   — a clean seal.
 * dashed   — attenuated: the measurement stands but a named confidence flag
 *            travels with it, and the flag's own words are what the reader
 *            sees. Attenuate, never erase (CLAUDE.md item 29).
 * outlined — abstain. No seal at all, and the reason is the gate's own
 *            worst-first instruction rather than a rewrite of it.
 */
export function sealStateFrom({ sealed, boundarySensitive = false, noiseConfidence = "full" } = {}) {
  if (!sealed) return { type: "abstain", variant: "outlined", attenuated: false, tags: [] };
  const tags = [];
  if (boundarySensitive) tags.push(BOUNDARY_TAG);
  if (noiseConfidence === "degraded") tags.push(NOISE_TAG);
  const attenuated = tags.length > 0;
  return { type: "sealed", variant: attenuated ? "dashed" : "filled", attenuated, tags };
}

/**
 * Calibration lines, from measured values only.
 *
 * A line whose value was not measured is OMITTED rather than defaulted. A
 * placeholder here would be indistinguishable from a reading, which is the
 * distinction `zoneNotExtracted` vs `colourNotMeasurable` exists to keep
 * (CLAUDE.md item 23).
 */
export function calibrationLines({ luma, captureMode, haloLevel, coverage } = {}) {
  const lines = [];
  if (Number.isFinite(luma)) lines.push(`L* ${Math.round(luma)}`);
  if (typeof captureMode === "string" && captureMode) lines.push(`WB ${captureMode.toUpperCase()}`);
  if (Number.isFinite(haloLevel)) lines.push(`HALO ${Math.round(haloLevel * 100)}%`);
  if (Number.isFinite(coverage)) lines.push(`READABLE ${Math.round(coverage * 100)}%`);
  return lines;
}

/**
 * The abstain surface: the poetic line, then the gate's own fix instruction.
 *
 * `instruction` is `captureInstruction(report)` from qise/gates.js — the
 * worst-first failure. It is passed through, not paraphrased, so the beta
 * cannot drift from what production tells the same user about the same frame.
 */
export function abstainModel(instruction) {
  const detail = instruction && (instruction.detail || instruction.title);
  return { line: VOICE.abstain, action: detail || "", gateId: (instruction && instruction.id) || null };
}

/** Ring ticks. Reads only the seal outcome of each entry — never a value. */
export function ringModel(entries, maxTicks = 14) {
  const shown = (entries || []).slice(0, maxTicks);
  return {
    total: (entries || []).length,
    sealed: (entries || []).filter((e) => e && e.sealed).length,
    ticks: shown.map((e, i) => ({
      index: i,
      angle: (i / maxTicks) * 2 * Math.PI - Math.PI / 2,
      kind: !e || !e.sealed ? "abstain" : e.attenuated ? "attenuated" : "clean",
    })),
  };
}

/**
 * Ledger squares.
 *
 * Colour is driven by the WITHIN-PERSON delta against the subject's own
 * baseline and by nothing else. There is no population in this repo to be
 * average against, and an absolute colour drawn here would read as one
 * (CLAUDE.md item 33).
 */
export function ledgerModel(entries) {
  return (entries || []).map((e, index) => {
    const deltas = e && e.deltas;
    if (!deltas || !Number.isFinite(deltas.b)) {
      return { index, kind: "unread", attenuated: Boolean(e && e.attenuated), warmth: null, lightness: null };
    }
    return {
      index,
      kind: e.sealed ? "sealed" : "abstain",
      attenuated: Boolean(e.attenuated),
      warmth: Math.max(0, Math.min(1, (deltas.b + 1.5) / 3)),
      lightness: Number.isFinite(deltas.L) ? Math.min(Math.abs(deltas.L), 1.5) : 0,
    };
  });
}

/** The selected-entry line. Deltas only — all of them within-person. */
export function readoutLine(entry, index) {
  if (!entry) return "";
  const label = `S${String(index + 1).padStart(2, "0")}`;
  if (!entry.deltas) return `${label} · no seal`;
  const d = entry.deltas;
  const parts = [
    `ΔL ${formatDelta(d.L)}`,
    `Δa ${formatDelta(d.a)}`,
    `Δb ${formatDelta(d.b)}`,
  ];
  return `${label} · ${parts.join(" · ")}`;
}

/**
 * The share artifact.
 *
 * Date and wordmark only. No measurement value appears, because the artifact
 * is the one surface built to leave the device and a number on it is a number
 * about a person in public.
 *
 * It also carries no epigraph. The one it used to carry was sourced to
 * 麻衣相法, which src/reading/provenance.js records as
 * ATTRIBUTION_CONTRADICTED with no locator, and to the 文獻通考, which appears
 * in no provenance record at all. Stripping the citation and keeping the words
 * would present unsourced heritage material as canonical, which is the same
 * defect wearing a quieter hat.
 */
export function artifactModel(date) {
  const d = date instanceof Date ? date : new Date(date);
  return {
    dateStr: `${String(d.getMonth() + 1).padStart(2, "0")}·${String(d.getDate()).padStart(2, "0")}`,
    wordmark: "M I E N   S H I A N G",
  };
}

/**
 * The record the beta hands to the production store.
 *
 * Pure, so the field list can be checked against store.js's allow-list without
 * a camera. The beta writes to the SAME IndexedDB as production — same origin,
 * same person — so a field shape that drifts from production's would corrupt a
 * shared baseline rather than a private one.
 *
 * No pixels, no mesh, no landmark: `store.toRecord` is an allow-list and this
 * must already satisfy it before it gets there (CLAUDE.md item 39).
 */
export function buildReading({
  timestampIso, canonicalDay, captureClass, metrics, axes, interpreted, integrated = null,
  captureTier, consentVersion = null, gateMargins = null, sclera = null, roiValidity = {},
  frameJitter = null, confidence = null, valid = false, baselineVersion,
}) {
  return {
    timestampIso,
    canonicalDay,
    captureClass,
    metrics,
    axes,
    deltas: interpreted ? interpreted.deltas : null,
    compass: interpreted ? interpreted.compass : null,
    z: interpreted ? interpreted.z : null,
    integrated,
    tags: [],
    baselineVersion,
    captureTier,
    readingState: interpreted ? interpreted.state : null,
    consentVersion,
    gateMargins,
    sclera,
    roiValidity,
    frameJitter,
    confidence,
    valid,
  };
}

/**
 * Readings 1–3 are calibrating, and say so.
 *
 * `interpreted` is the return of qise/baseline.js `interpretReading`, which
 * already carries the state. Beta reads it rather than counting for itself —
 * a second count would be a second definition of "ready".
 */
export function readingStateLabel(interpreted) {
  if (!interpreted || interpreted.state !== "read") {
    // `needed` is already the target count from qise/baseline.js
    // (CALIBRATING_READINGS, or one more once a baseline exists but is not
    // ready). Only the CURRENT reading needs the +1, because readingsSoFar
    // counts the ones already banked, not this one. Adding it to both told the
    // reader the baseline was further away than it is.
    const soFar = (interpreted && interpreted.readingsSoFar) ?? 0;
    const needed = (interpreted && interpreted.needed) ?? 3;
    return { calibrating: true, text: VOICE.calibrating(soFar + 1, needed) };
  }
  return { calibrating: false, text: "" };
}
