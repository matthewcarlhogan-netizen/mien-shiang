/*
 * PHASE 2 — sclera sampling, as an illuminant estimate.
 *
 * ── WHY GEOMETRY ALONE IS NOT ENOUGH ───────────────────────────────────────
 * Cutting a triangle out of the eye opening and averaging it does not sample
 * sclera. Lid shadow, lashes and conjunctival vessels all land in the MIDDLE
 * of the luminance distribution, so a naive luminance trim leaves every one of
 * them in. Four filters, layered, each aimed at a different contaminant:
 *
 *   1. geometric   -- medial and lateral triangles, inset off limbus and lid
 *   2. luminance   -- drop the darkest and brightest fifths (shadow, glare)
 *   3. chromaticity-- drop the most chromatic 30%: vessels are red, sclera is not
 *   4. specular    -- drop the corneal catchlight, which is bright AND neutral
 *
 * ── WHY THE FIXED +/-25% RATIO GATE IS NOT THE PRIMARY TEST ────────────────
 * The sclera is not a stable neutral. It yellows and darkens with age, and
 * reddens acutely with sleep deprivation, alcohol and irritation. A fixed
 * tolerance cannot tell "unusual light" from "bloodshot eyes", and both wreck
 * the correction in the same direction. So the primary test is the user's own
 * rolling sclera baseline, exactly as the face is tracked against itself; the
 * absolute gate is kept only as a coarse backstop for wildly non-neutral
 * illuminants.
 *
 * A drifting sclera does not discard the reading. It stores it, flags it, and
 * keeps it out of the pattern engine -- and says so as an observation about
 * today's light and today's eyes, never as an observation about the person.
 */
import { hullFor } from "../roi.js";
import {
  srgbToLinear, labFromSrgb8, chroma, vonKriesGains,
} from "./color.js";
import { pointInPolygon } from "./rois.js";

/** Below this many surviving pixels the estimate is not worth having. */
export const SCLERA_MIN_PIXELS = 150;

/** Coarse backstop only: a ratio this far off neutral is a strange illuminant. */
export const SCLERA_ABSOLUTE_TOLERANCE = 0.25;

/** Drift fires past this many MADs on any channel. */
export const SCLERA_DRIFT_MADS = 2;

/** Trailing samples the personal sclera baseline is taken over. */
export const SCLERA_HISTORY_LENGTH = 30;

/** Fewest samples before drift may fire at all. */
export const SCLERA_MIN_HISTORY = 5;

/**
 * Floor under the MAD.
 *
 * Without it a run of near-identical samples produces MAD = 0, and then every
 * subsequent reading is infinitely many MADs away and drift fires forever. The
 * floor is a statement about measurement noise, not about eyes.
 */
export const SCLERA_MAD_FLOOR = 0.005;

/** Inset off the limbus and the lid margin, where lashes and vessels live. */
export const SCLERA_INSET = 0.25;

/** Radius, in pixels, of the catchlight halo around a local luminance peak. */
export const SPECULAR_RADIUS_PX = 5;

/**
 * L* the brightest pixels must clear the middle by before ANY of them is
 * treated as specular.
 *
 * ── WHY A RANK TEST IS NOT ENOUGH ──────────────────────────────────────────
 * "Top 5% luminance" is a rank, and a rank is degenerate on a flat region:
 * where every pixel has the same L*, every pixel is simultaneously in the top
 * 5% and a local maximum, so a purely rank-based filter deletes the entire
 * sample. That is not hypothetical — it removed all 524 pixels of an evenly
 * lit synthetic sclera, and it would do the same to a real one photographed in
 * soft, diffuse light, which is the BEST case for this measurement.
 *
 * A catchlight is defined by contrast, not by rank. So the filter runs only
 * where there is a peak to find.
 */
export const SPECULAR_MIN_CONTRAST_L = 2;

/**
 * Median L* the surviving sample must clear to be treated as sclera at all.
 *
 * ── WHY A PIXEL COUNT IS NOT A SUFFICIENT GUARD ────────────────────────────
 * A closed eye, a deep lid shadow or a mis-placed triangle yields plenty of
 * pixels — they are simply all near black. Near black, the three channels are
 * equal because 8-bit quantisation has flattened them, not because the light
 * is neutral, so the estimate comes back as a confident 1.00/1.00/1.00 and
 * every downstream correction is a no-op justified by nothing.
 *
 * Absence of measurement and a measurement of absence are different objects,
 * and only the first is honest here. The floor is deliberately well below any
 * usable capture: the `underexposed` gate in Phase 3 is what catches merely
 * dim light, and this catches "there is no sclera in this polygon".
 */
export const SCLERA_MIN_MEDIAN_L = 20;

/*
 * Scleral triangles, named by the SUBJECT's anatomy.
 *
 * Medial = toward the nose, lateral = toward the temple. Each is a corner
 * landmark plus one upper-lid and one lower-lid point, which brackets the
 * exposed white without reaching the iris.
 */
const EYES = Object.freeze({
  subjectRight: { medial: [133, 158, 153], lateral: [33, 160, 144] },
  subjectLeft: { medial: [362, 385, 380], lateral: [263, 387, 373] },
});

const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Median absolute deviation. Median and MAD throughout, never mean and SD. */
export function mad(xs) {
  const m = median(xs);
  if (m === null) return null;
  return median(xs.map((x) => Math.abs(x - m)));
}

/** Value at a percentile of a sorted copy. p in [0,1]. */
function percentile(xs, p) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))));
  return s[i];
}

/**
 * The corneal catchlight, and the halo around it.
 *
 * ── WHY THE PERCENTILES ARE TAKEN ON THE GEOMETRIC SET ─────────────────────
 * The specular test is "top 5% luminance AND bottom 20% chroma AND near a
 * local luminance maximum", and all three have to be evaluated against the
 * pixels as sampled. Evaluating them after the luminance trim would be
 * self-defeating: the trim has already removed the catchlight's core, so the
 * only thing left to find is its penumbra -- which is dimmer than the pixels
 * the trim kept, and would therefore never be in anybody's top 5%. The
 * penumbra is precisely what a trim cannot catch, and precisely what this
 * filter is for.
 */
function specularMask(pixels, lum, chr) {
  if (pixels.length === 0) return new Set();

  // Top 5% by rank, but never closer to the body of the distribution than
  // SPECULAR_MIN_CONTRAST_L. Taking the rank alone fails in both directions: a
  // flat region makes every pixel a top-5% local maximum and the filter eats
  // the whole sample, while a catchlight smaller than 5% of the region sits
  // ABOVE the 95th percentile and the rank cut lands on ordinary sclera.
  const dullCut = percentile(chr, 0.20);
  const brightCut = Math.max(
    percentile(lum, 0.95),
    percentile(lum, 0.50) + SPECULAR_MIN_CONTRAST_L
  );

  // Local maxima: brighter than every sampled neighbour within one pixel, AND
  // strictly brighter than at least one of them. The second clause is what
  // stops a flat patch from being one continuous plateau of "maxima".
  const at = new Map();
  pixels.forEach((p, i) => at.set(`${p.x},${p.y}`, i));

  const peaks = [];
  for (let i = 0; i < pixels.length; i++) {
    if (lum[i] < brightCut) continue;
    let isPeak = true, rises = false;
    for (let dy = -1; dy <= 1 && isPeak; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const j = at.get(`${pixels[i].x + dx},${pixels[i].y + dy}`);
        if (j === undefined) continue;
        if (lum[j] > lum[i]) { isPeak = false; break; }
        if (lum[j] < lum[i]) rises = true;
      }
    }
    if (isPeak && rises) peaks.push(pixels[i]);
  }
  if (peaks.length === 0) return new Set();

  const r2 = SPECULAR_RADIUS_PX * SPECULAR_RADIUS_PX;
  const drop = new Set();
  for (let i = 0; i < pixels.length; i++) {
    if (lum[i] < brightCut) continue;
    if (chr[i] > dullCut) continue;
    for (const pk of peaks) {
      const dx = pixels[i].x - pk.x, dy = pixels[i].y - pk.y;
      if (dx * dx + dy * dy <= r2) { drop.add(i); break; }
    }
  }
  return drop;
}

/**
 * Sample the sclera and estimate the illuminant.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray|number[]}} imageData
 * @param {Array<{x:number,y:number}>} landmarks
 * @param {{mirrored:boolean}} options `mirrored` is REQUIRED, as in extractRois
 * @param {{samples?: Array<{r:number,g:number,b:number}>}} [scleraBaseline]
 *        the user's trailing raw ratios, oldest first
 */
export function sampleSclera(imageData, landmarks, options, scleraBaseline) {
  if (!options || typeof options.mirrored !== "boolean") {
    throw new TypeError(
      "sampleSclera requires an explicit `mirrored` flag, for the same reason " +
      "extractRois does: the anatomical names on the landmark indices are only " +
      "true for an un-mirrored frame"
    );
  }

  // Both eyes are pooled, so the UNION of the four triangles is the same set
  // either way and the estimate is laterality-invariant. The flag still swaps
  // the labels, because a medial triangle reported as lateral is a lie that
  // costs nothing today and misleads whoever reads the trace tomorrow.
  const eyes = options.mirrored
    ? { subjectRight: EYES.subjectLeft, subjectLeft: EYES.subjectRight }
    : EYES;

  const triangles = [];
  for (const eye of Object.values(eyes)) {
    for (const idx of [eye.medial, eye.lateral]) {
      const hull = hullFor(idx, landmarks, -SCLERA_INSET);
      if (hull) triangles.push(hull);
    }
  }

  /* 1. Geometric. */
  const { width, height, data } = imageData;
  const geometric = [];
  for (const hull of triangles) {
    const x0 = Math.max(0, Math.floor(Math.min(...hull.map((p) => p.x))));
    const y0 = Math.max(0, Math.floor(Math.min(...hull.map((p) => p.y))));
    const x1 = Math.min(width, Math.ceil(Math.max(...hull.map((p) => p.x))));
    const y1 = Math.min(height, Math.ceil(Math.max(...hull.map((p) => p.y))));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!pointInPolygon(x + 0.5, y + 0.5, hull)) continue;
        const i = (y * width + x) * 4;
        geometric.push({ x, y, r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }
  }

  const labOf = geometric.map((p) => labFromSrgb8(p.r, p.g, p.b));
  const lum = labOf.map((l) => l.L);
  const chr = labOf.map((l) => chroma(l.a, l.b));

  const specular = specularMask(geometric, lum, chr);

  /* 2. Luminance trim: drop the darkest fifth and the brightest fifth. */
  const loL = percentile(lum, 0.20);
  const hiL = percentile(lum, 0.80);

  /* 3. Chromaticity: vessels are chromatic, sclera is not. */
  const hiC = percentile(chr, 0.70);

  const kept = [];
  for (let i = 0; i < geometric.length; i++) {
    if (specular.has(i)) continue;               // 4, identified on the geometric set
    if (lum[i] < loL || lum[i] > hiL) continue;  // 2
    if (chr[i] > hiC) continue;                  // 3
    kept.push(geometric[i]);
  }

  const stages = {
    geometric: geometric.length,
    afterSpecular: geometric.length - specular.size,
    kept: kept.length,
  };

  const keptL = kept.map((p) => labFromSrgb8(p.r, p.g, p.b).L);
  const medianL = median(keptL);

  const refusal = kept.length < SCLERA_MIN_PIXELS
    ? "too_few_pixels"
    : (medianL < SCLERA_MIN_MEDIAN_L ? "too_dark" : null);

  if (refusal) {
    return {
      gains: null, pixelCount: kept.length, rawRatios: null, personalDelta: null,
      confidence: "insufficient", confidenceValue: 0, reason: refusal,
      medianL, withinAbsoluteTolerance: false, stages,
    };
  }

  /* Mean LINEAR RGB. Averaging gamma-encoded values is a different quantity
   * and biases the estimate toward the darker pixels. */
  let r = 0, g = 0, b = 0;
  for (const p of kept) {
    r += srgbToLinear(p.r);
    g += srgbToLinear(p.g);
    b += srgbToLinear(p.b);
  }
  r /= kept.length; g /= kept.length; b /= kept.length;

  const mean = (r + g + b) / 3;
  const rawRatios = { r: r / mean, g: g / mean, b: b / mean };
  const gains = vonKriesGains({ r, g, b });

  const withinAbsoluteTolerance = ["r", "g", "b"].every(
    (k) => Math.abs(rawRatios[k] - 1) <= SCLERA_ABSOLUTE_TOLERANCE
  );

  /* Personal baseline: today against the user's own trailing sclera. */
  const history = ((scleraBaseline && scleraBaseline.samples) || []).slice(-SCLERA_HISTORY_LENGTH);
  let personalDelta = null;
  let drifted = false;

  if (history.length >= SCLERA_MIN_HISTORY) {
    personalDelta = {};
    const mads = {};
    for (const k of ["r", "g", "b"]) {
      const series = history.map((s) => s[k]);
      personalDelta[k] = rawRatios[k] - median(series);
      mads[k] = Math.max(mad(series) ?? 0, SCLERA_MAD_FLOOR);
    }
    personalDelta.mads = mads;
    drifted = ["r", "g", "b"].some(
      (k) => Math.abs(personalDelta[k]) > SCLERA_DRIFT_MADS * mads[k]
    );
  }

  return {
    gains,
    pixelCount: kept.length,
    rawRatios,
    personalDelta,
    confidence: drifted ? "sclera-drift" : "ok",
    reason: null,
    medianL,
    // Drift does not zero the confidence: the reading is still stored and still
    // shown, it is only kept out of the pattern engine.
    confidenceValue: drifted ? 0.3 : 1,
    withinAbsoluteTolerance,
    stages,
  };
}

/**
 * The message for a drifting sclera.
 *
 * Kept as an exported constant so the compliance lint scans it, and worded as
 * an observation about today's light rather than about the reader. Eyes that
 * look different are not a finding about a person.
 */
export const SCLERA_DRIFT_MESSAGE =
  "Your eyes look different today, so today's colour reading is less reliable.";
