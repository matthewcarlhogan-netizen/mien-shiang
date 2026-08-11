/*
 * PHASE 9 — the seal. Pure geometry, no DOM.
 *
 * The compass rendered as a carved 印章: a square outline, the five colours as
 * axes, and the reading pressed into it as a single dot with the irregularity
 * of ink on paper.
 *
 * ── WHY IT IS SEEDED FROM THE TIMESTAMP ────────────────────────────────────
 * A reading must always render identically. The irregularity is what makes it
 * read as a pressed seal rather than a chart, but irregularity regenerated on
 * every paint is an animation nobody asked for, and it would mean the record
 * of a day looked different each time it was opened. Seeded, the wobble is a
 * property of the reading.
 *
 * ── WHERE THIS DEPARTS FROM "FIVE AXES" ────────────────────────────────────
 * The classical compass has four directions and a centre: qing east, chi
 * south, bai west, hei north — and huang at the centre, which has no
 * direction at all. So huang is drawn as a ring about the middle rather than
 * as a fifth spoke. Five colours, five axes, but the fifth is where the
 * tradition actually puts it. Recorded in docs/QISE_NOTES.md.
 *
 * South is at the top, which is the Chinese cartographic convention and the
 * one the five-colour scheme was written in.
 */
import { PALETTE, COLOUR_ORDER } from "./palette.js";
import { compositionOf } from "../../qise/composition.js";

export const SEAL_SIZE = 100;
export const SEAL_MARGIN = 8;

/** Longest an axis may draw, as a fraction of the half-width. */
export const AXIS_MAX = 0.82;

/** Component score at which an axis reaches AXIS_MAX. */
export const AXIS_FULL_SCALE = 4;

/** Degrees, with south at the top. huang has no direction; it is the centre. */
export const AXIS_ANGLE = Object.freeze({
  chi: -90,    // south, top
  bai: 0,      // west, right
  hei: 90,     // north, bottom
  qing: 180,   // east, left
  huang: null, // centre
});

/** Deterministic PRNG. Small, stable, and dependency-free by necessity. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Geometry for one reading's seal.
 *
 * @param {{timestampIso:string, compass:Object, confidence:number}} reading
 * @param {{lowConfidence?:boolean}} [opts]
 */
export function sealModel(reading, opts = {}) {
  const seedText = (reading && reading.timestampIso) || "no-timestamp";
  const rnd = mulberry32(hashSeed(seedText));

  const readingComposition = compositionOf(reading);
  const hasCompass = Boolean(reading?.compass)
    && (reading.compass.ascendant === "ping" || (reading.compass.components
      && Object.values(reading.compass.components).some((value) => Number.isFinite(value) && value > 0)));
  const compass = hasCompass
    ? reading.compass
    : {
      ascendant: readingComposition.lead,
      magnitude: Math.max(...Object.values(readingComposition.segments)) / 25,
      components: Object.fromEntries(Object.entries(readingComposition.segments)
        .map(([key, value]) => [key, value / 25])),
    };
  const components = compass.components || {};
  const hollow = Boolean(opts.lowConfidence);

  const half = (SEAL_SIZE - 2 * SEAL_MARGIN) / 2;
  const cx = SEAL_SIZE / 2, cy = SEAL_SIZE / 2;

  // A carved border: four sides, each corner nudged. The wobble is small
  // enough to read as a tool mark rather than as a mistake.
  const jitter = (amount) => (rnd() - 0.5) * 2 * amount;
  const border = [
    { x: SEAL_MARGIN + jitter(1.2), y: SEAL_MARGIN + jitter(1.2) },
    { x: SEAL_SIZE - SEAL_MARGIN + jitter(1.2), y: SEAL_MARGIN + jitter(1.2) },
    { x: SEAL_SIZE - SEAL_MARGIN + jitter(1.2), y: SEAL_SIZE - SEAL_MARGIN + jitter(1.2) },
    { x: SEAL_MARGIN + jitter(1.2), y: SEAL_SIZE - SEAL_MARGIN + jitter(1.2) },
  ];

  const axes = COLOUR_ORDER.map((name) => {
    const score = clamp01((components[name] || 0) / AXIS_FULL_SCALE);
    const angle = AXIS_ANGLE[name];
    const length = score * half * AXIS_MAX;

    if (angle === null) {
      // huang: the centre. A ring whose radius grows with the score, so it is
      // visible as an axis without pretending to point anywhere.
      return {
        name, colour: PALETTE[name].hex, kind: "ring", score,
        radius: 2 + score * half * 0.35, x2: cx, y2: cy,
      };
    }
    const rad = (angle * Math.PI) / 180;
    return {
      name, colour: PALETTE[name].hex, kind: "spoke", score, angle,
      x2: cx + Math.cos(rad) * length,
      y2: cy + Math.sin(rad) * length,
    };
  });

  // Where the reading is pressed: the vector sum of the directional axes. A
  // face with nothing ascendant presses at the centre, which is what `ping`
  // should look like.
  let dx = 0, dy = 0;
  for (const a of axes) {
    if (a.kind !== "spoke") continue;
    dx += (a.x2 - cx);
    dy += (a.y2 - cy);
  }
  const reach = Math.hypot(dx, dy);
  const cap = half * 0.55;
  if (reach > cap) { dx *= cap / reach; dy *= cap / reach; }

  const magnitude = clamp01((compass.magnitude || 0) / AXIS_FULL_SCALE);
  const dotR = 3.2 + magnitude * 4.5;

  // Ink bleed: an irregular ring of points around the dot. Deterministic, so
  // it is a property of the reading rather than of this paint.
  const bleedPoints = 14;
  const bleed = Array.from({ length: bleedPoints }, (_, i) => {
    const t = (i / bleedPoints) * Math.PI * 2;
    const r = dotR * (1 + (rnd() - 0.35) * 0.28);
    return { x: cx + dx + Math.cos(t) * r, y: cy + dy + Math.sin(t) * r };
  });

  return {
    size: SEAL_SIZE,
    seed: seedText,
    ascendant: compass.ascendant || "ping",
    basis: hasCompass ? "personal-shift" : "capture-impression",
    hollow,
    border,
    axes,
    dot: { x: cx + dx, y: cy + dy, r: dotR, bleed },
    inkColour: PALETTE[compass.ascendant] ? PALETTE[compass.ascendant].hex : PALETTE.hei.hex,
  };
}

const pts = (list) => list.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

/**
 * The seal as SVG.
 *
 * A string rather than DOM calls, so the same renderer serves the screen, the
 * history column and the share card, and so it can be asserted on without a
 * browser.
 */
export function sealSvg(model, { title = "Today's reading", reducedMotion = false } = {}) {
  const spokes = model.axes.filter((a) => a.kind === "spoke" && a.score > 0)
    .map((a) => `<line x1="${(model.size / 2).toFixed(2)}" y1="${(model.size / 2).toFixed(2)}" `
      + `x2="${a.x2.toFixed(2)}" y2="${a.y2.toFixed(2)}" stroke="${a.colour}" `
      + `stroke-width="2.4" stroke-linecap="round" data-axis="${a.name}" />`)
    .join("");

  const ring = model.axes.filter((a) => a.kind === "ring" && a.score > 0)
    .map((a) => `<circle cx="${(model.size / 2).toFixed(2)}" cy="${(model.size / 2).toFixed(2)}" `
      + `r="${a.radius.toFixed(2)}" fill="none" stroke="${a.colour}" stroke-width="1.6" `
      + `data-axis="${a.name}" />`)
    .join("");

  // Hollow is how a low-confidence reading declares itself. It must be visible
  // at a glance in a column of thirty, so it is the fill that changes, not a
  // badge in a corner.
  const dot = model.hollow
    ? `<polygon points="${pts(model.dot.bleed)}" fill="none" stroke="${model.inkColour}" `
      + `stroke-width="1.4" stroke-dasharray="2 2" data-dot="hollow" />`
    : `<polygon points="${pts(model.dot.bleed)}" fill="${model.inkColour}" data-dot="pressed" />`;

  const motion = reducedMotion ? ' data-reduced-motion="true"' : "";

  return `<svg viewBox="0 0 ${model.size} ${model.size}" class="qise-seal" role="img"`
    + ` aria-label="${title}" data-ascendant="${model.ascendant}"${motion}>`
    + `<polygon points="${pts(model.border)}" fill="none" stroke="currentColor" stroke-width="2.2" />`
    + spokes + ring + dot
    + `</svg>`;
}
