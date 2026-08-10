/*
 * Adaptive calibration for the measurement layer.
 *
 * PURE — no DOM, no MediaPipe, no network. Every function takes numbers and
 * returns numbers, so the whole calibration layer is testable under
 * `node --test` with no browser and no face photo. Same reasoning as
 * geometry.js: the thing most likely to be wrong is the arithmetic, and the
 * arithmetic must be checkable on its own.
 *
 * ── WHAT THIS LAYER IS AND IS NOT ──────────────────────────────────────────
 * This file decides HOW MUCH of a physical quantity counts as full scale. It
 * assigns no meaning to the result — no label, no grade, no trait. It is
 * measurement configuration in the same category as zones.js and the constants
 * at the top of engine.js, and like those it is owned by NEITHER module. Both
 * consume it.
 *
 * ── THESE ARE STILL REASONED STARTING POINTS, NOT FITTED CONSTANTS ─────────
 * Making a constant adaptive does not make it calibrated. There is no labelled
 * ground truth in this repo, so every number below is the same category of
 * object CLAUDE.md describes under "Severity scaling is uncalibrated": a
 * defensible starting point that must be re-derived against labelled data, per
 * tone stratum, before anything here is presented as a grade. What adaptation
 * buys is robustness to CAPTURE conditions (sensor noise, compression, zone
 * size), not correctness of the scale itself.
 */

import { scratchCopy, partitionNaN, selectKth } from "./textureAnalyzer.js";

// ───────────────────────────────────────────────────────────── percentiles ──

/**
 * Linear-interpolated percentile. Works on a COPY — callers pass raw sample
 * arrays and must not have them reordered underneath.
 *
 * Float64Array ordering is numeric; Array.prototype.sort is lexicographic,
 * which would put 10 before 9 and silently corrupt every percentile taken here.
 * Converting to a Float64Array first is load-bearing, not tidying — and it is
 * why scratchCopy() below is the right entry point rather than a bare slice.
 */
export function percentile(vals, p) {
  if (!vals || vals.length === 0) return NaN;
  /* Two order statistics, so two selections rather than a full ordering. This
   * runs once per image over the pooled structureness sample — up to 20,000
   * values — and sorting all of them to read two positions was measured at 4%
   * of the whole ridge path. selectKth() reorders, so it gets a copy. */
  const s = scratchCopy(vals);
  if (s.length === 1) return s[0];
  const n = s.length;
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  /* NaN sorts last, and these indices are defined against that ordering, so an
   * index at or past the non-NaN count names a NaN just as it would in the
   * sorted array. */
  const nn = partitionNaN(s);
  const at = (k) => (k >= nn ? NaN : selectKth(s, k, nn));
  if (lo === hi) return at(lo);
  const a = at(lo), b = at(hi);
  return a + (b - a) * (idx - lo);
}

// ──────────────────────────────────────────────────── adaptive ridge scale ──

/**
 * Structureness of sensor noise, measured on synthetic skin with the 3-point
 * Laplacian in engine.js. This is the SAME measurement that produced the static
 * RIDGE_STRUCTURE_SCALE = 1.0: noise sits near 0.06, genuine furrows reach
 * ~2.5. Here it is used as the unit rather than as a threshold — the adaptive
 * scale asks "how many noise floors is this image running at?".
 *
 * It is specific to that derivative kernel. Change the kernel and this number
 * is meaningless until it is re-measured on noise versus furrows.
 */
export const NOISE_FLOOR_STRUCTURENESS = 0.06;

/** Static fallback, used when there are too few samples to estimate from. */
export const RIDGE_SCALE_FALLBACK = 1.0;

/**
 * Bounds on the adaptive scale.
 *
 * ── WHY A CLAMP IS NOT OPTIONAL HERE ───────────────────────────────────────
 * The whole reason CLAUDE.md item 4 fixes the ridge normaliser is that a
 * SELF-normalising one is wrong: when a region is normalised by its own
 * content, flat noisy skin scores higher than real furrows, because the furrows
 * raise their own divisor. Taking the percentile across the whole IMAGE rather
 * than one zone weakens that failure a great deal — furrows in one or two zones
 * are a small minority of pooled face-skin pixels — but it does not abolish it.
 * A heavily lined face can push its own p90 up and normalise its own lines
 * partly away.
 *
 * The clamp is what keeps the mechanism honest: inside these bounds adaptation
 * corrects for capture conditions, which is what it is for; outside them it
 * would be erasing signal, which is what it must not do. A clamped result is
 * reported as `clamped: true` rather than silently returned, so the caller can
 * see that the estimate hit a rail.
 *
 * ── THE CEILING IS 4.0 BECAUSE IT WAS MEASURED, NOT CHOSEN ─────────────────
 * Twelve synthetic zones, one to twelve of them carrying drawn furrows, pooled
 * exactly as rawScalars() pools them. The delta between a lined zone and the
 * plain baseline, at four ceilings:
 *
 *   lined zones   1/12      3/12      6/12      9/12     12/12
 *   ceiling 4    6.90e-2   6.90e-2   6.90e-2   6.90e-2   6.91e-2
 *   ceiling 12   1.56e-2   1.56e-2   1.56e-2   1.56e-2   1.56e-2
 *   uncapped     7.45e-2   2.65e-3   2.48e-4   1.61e-4   1.09e-4
 *
 * Read the bottom row: uncapped, the face with the MOST furrows reports the
 * FEWEST — a 680-fold collapse, because the furrows raise their own divisor.
 * That is item 4's defect returning through the adaptive door, and the ceiling
 * is the only thing standing in front of it.
 *
 * 4.0 rather than 12.0 because a higher ceiling costs signal (1.56e-2 against
 * 6.90e-2, a 4.4x loss) and buys nothing a lined face can use: raw runs to 30
 * or more once three zones carry lines, so a high ceiling binds there anyway,
 * just at a less sensitive value. p90 rises for BOTH a noisy image and a
 * textured face, and this measurement cannot tell those apart — which is
 * exactly why `clamped` must reach the confidence, and does, in analyse().
 *
 * The floor is 1.0 because that is the static constant the response curve was
 * originally derived against. Going below it would make the detector more
 * sensitive than a clean image justifies, which only amplifies noise.
 */
export const RIDGE_SCALE_MIN = 1.0;
export const RIDGE_SCALE_MAX = 4.0;

/** Below this many samples the percentile is not an estimate of anything. */
export const RIDGE_SCALE_MIN_SAMPLES = 256;

/**
 * Minimum number of pooled ZONES before the estimate is used at all.
 *
 * Pooling is only safe because of a premise: that furrows in one or two zones
 * are a small minority of the pooled pixels, so they cannot set the percentile
 * that normalises them. That premise is a statement about zone COUNT, and it is
 * simply false at small counts — with three zones and one of them furrowed, a
 * third of the pool is the very signal being measured, and the furrows push
 * their own divisor up exactly as they would under per-zone normalisation.
 *
 * So the precondition is checked rather than assumed. Below it the static
 * constant is used, which is a known quantity rather than a contaminated
 * estimate. The full ROI set in zones.js is twelve, so this affects degenerate
 * captures — a heavily occluded or mostly out-of-frame face — and not ordinary
 * use.
 */
export const RIDGE_SCALE_MIN_ZONES = 6;

/**
 * Per-image ridge normaliser, from the distribution of Hessian structureness.
 *
 * scale = 2 · (p90(structureness) / NOISE_FLOOR_STRUCTURENESS)
 *
 * A noisy sensor, a high ISO or a hard JPEG quantiser all raise structureness
 * everywhere at once. A fixed normaliser reads that rise as texture; scaling by
 * the image's own p90 divides it back out, which is the point.
 *
 * SAMPLES MUST BE POOLED ACROSS ZONES, not taken per zone — per-zone is the
 * self-normalising defect above. The caller is responsible for pooling; this
 * function cannot tell where its samples came from, so the contract is stated
 * here and pinned by a test rather than assumed.
 *
 * @param {ArrayLike<number>} structurenessValues pooled, ungated by orientation
 * @param {number} [zoneCount] how many zones contributed to the pool
 * @returns {{scale:number, raw:number, p90:number, clamped:boolean,
 *            fallback:boolean, n:number, zones:number}}
 */
export function calculateAdaptiveScale(structurenessValues, zoneCount = Infinity) {
  const n = structurenessValues ? structurenessValues.length : 0;
  if (n < RIDGE_SCALE_MIN_SAMPLES || zoneCount < RIDGE_SCALE_MIN_ZONES) {
    return {
      scale: RIDGE_SCALE_FALLBACK, raw: NaN, p90: NaN,
      clamped: false, fallback: true, n, zones: zoneCount,
    };
  }

  const p90 = percentile(structurenessValues, 90);
  const raw = 2 * (p90 / NOISE_FLOOR_STRUCTURENESS);

  if (!Number.isFinite(raw) || raw <= 0) {
    return { scale: RIDGE_SCALE_FALLBACK, raw, p90, clamped: false, fallback: true,
             n, zones: zoneCount };
  }

  const scale = Math.min(Math.max(raw, RIDGE_SCALE_MIN), RIDGE_SCALE_MAX);
  return { scale, raw, p90, clamped: scale !== raw, fallback: false,
           n, zones: zoneCount };
}

// ──────────────────────────────────────────────── per-zone rhytide scaling ──

/**
 * Full-scale rhytide delta, per anatomical family.
 *
 * ── READ THE DIRECTION BEFORE CHANGING A NUMBER ────────────────────────────
 * These are DIVISORS: severity = delta / fullScale, clamped at 1. So a SMALLER
 * number is MORE sensitive and saturates SOONER; a LARGER number has more
 * headroom before it pegs at 1.
 *
 * That direction is worth stating explicitly because it is easy to state
 * backwards. The values below read, in those terms, as:
 *
 *   glabella   0.09  deep frown furrows would peg a 0.06 scale — most headroom
 *   forehead   0.08  deep horizontal furrows, same reasoning
 *   cheeks     0.06  unchanged; this is the scale the others are relative to
 *   nasolabial 0.05  a fold rather than a wrinkle, slightly more sensitive
 *   periorbital 0.04 thin skin, fine lines — the most sensitive of the set
 *
 * Every one is a reasoned starting point, not a fitted value. None has been
 * checked against labelled data, and the whole table should be re-derived per
 * tone stratum along with the constants in engine.js.
 */
export const RHYTIDE_FULL_SCALE_BY_FAMILY = {
  forehead: 0.08,
  glabella: 0.09,
  periorbital: 0.04,
  nasolabial: 0.05,
  cheeks: 0.06,
};

/** Zones with no family entry keep the original single constant. */
export const RHYTIDE_FULL_SCALE_DEFAULT = 0.06;

/**
 * Map a zones.js ROI key onto a family above.
 *
 * The families are anatomical, the ROI keys are lateralised, and the two sets
 * are NOT the same shape — `cheek_left` and `cheek_right` are one family,
 * `nose_bridge` and `chin` are in none of them. Returning null for an unmapped
 * zone (rather than guessing a nearest family) is deliberate: an unmapped zone
 * gets the original constant, which is a known quantity, instead of one chosen
 * by string similarity.
 */
export function zoneFamily(zoneKey) {
  if (typeof zoneKey !== "string") return null;
  if (zoneKey === "glabella") return "glabella";
  if (zoneKey.includes("forehead")) return "forehead";
  if (zoneKey.startsWith("periorbital")) return "periorbital";
  if (zoneKey.startsWith("nasolabial")) return "nasolabial";
  if (zoneKey.startsWith("cheek")) return "cheeks";
  return null;
}

/** Full-scale rhytide delta for one ROI key. */
export function rhytideFullScale(zoneKey) {
  const fam = zoneFamily(zoneKey);
  return fam ? RHYTIDE_FULL_SCALE_BY_FAMILY[fam] : RHYTIDE_FULL_SCALE_DEFAULT;
}

// ───────────────────────────────────────────────────────── adaptive blur ────

export const BLUR_BASE_SIGMA = 1.2;
export const BLUR_MIN_SIGMA = 0.8;
export const BLUR_MAX_SIGMA = 2.0;

/**
 * Fallback reference area, used only when the caller cannot supply one.
 *
 * ── WHY THE REFERENCE IS THE IMAGE'S OWN MEDIAN ZONE, NOT A CONSTANT ───────
 * A fixed reference area cannot work, and the failure is silent rather than
 * loud. ROI areas scale with capture resolution: the same cheek is a few
 * thousand pixels on one phone and tens of thousands on another. Against a
 * fixed 1000, every zone on every real photo lands above the ceiling, so the
 * sigma is not adaptive at all — it is a constant at the rail, and one that
 * happens to be well above the 1.2 the detector was derived at.
 *
 * This was measured, not reasoned about after the fact. With a fixed 1000 and
 * the 6400-pixel zones used in the tests, every zone clamped to the ceiling,
 * the pre-blur smeared three-pixel furrows away, and the glabella rhytide
 * reading dropped by a factor of roughly 360 and stopped being emitted. Three
 * tests caught it.
 *
 * Normalising by the median zone area of THIS image restores the stated
 * intent — a typical zone gets the original 1.2, the nose bridge gets less,
 * a cheek gets more — and makes the result independent of capture resolution,
 * which a fixed constant can never be.
 */
export const BLUR_REFERENCE_AREA = 6400;

/**
 * Pre-blur sigma for the Hessian, scaled by ROI area against a reference.
 *
 *   sigma = BLUR_BASE_SIGMA · sqrt(area / referenceArea)
 *
 * The pre-blur exists to put a floor under sensor noise before differentiating
 * twice. A single fixed sigma is wrong in both directions at once: on a small
 * ROI (the nose bridge is a few hundred pixels) it removes the detail it was
 * meant to protect, and on a large one it leaves noise the Hessian then
 * amplifies.
 *
 * ── THE HONEST CAVEAT, BECAUSE IT LIMITS WHAT THIS BUYS ────────────────────
 * ROI pixel area varies with TWO things — the capture resolution and the
 * anatomical size of the zone — and this formula cannot tell them apart. A
 * cheek is anatomically larger than a nose bridge at the same resolution, but a
 * wrinkle on it is not proportionally wider in pixels. So the sqrt(area) term
 * is a proxy for resolution that is partly contaminated by anatomy. It is an
 * improvement on a constant and it is not a calibration.
 *
 * The clamp bounds the damage either way: at the rails the sigma stops tracking
 * area at all, and `clamped` says so.
 *
 * CONSEQUENCE THE CALLER MUST CARRY: because sigma now varies per zone, two
 * ridge responses computed at different sigmas are not directly comparable, and
 * `ridgeDelta` is exactly such a comparison. See the `blurMatched` flag in
 * engine.js — this is the same class of hazard as the `basis` tag on glowIndex.
 */
export function calculateBlurSigma(zoneArea, referenceArea = BLUR_REFERENCE_AREA) {
  const ref = Number.isFinite(referenceArea) && referenceArea > 0
    ? referenceArea : BLUR_REFERENCE_AREA;
  if (!Number.isFinite(zoneArea) || zoneArea <= 0) {
    return { sigma: BLUR_BASE_SIGMA, raw: NaN, clamped: false, fallback: true, ref };
  }
  const raw = BLUR_BASE_SIGMA * Math.sqrt(zoneArea / ref);
  const sigma = Math.min(Math.max(raw, BLUR_MIN_SIGMA), BLUR_MAX_SIGMA);
  return { sigma, raw, clamped: sigma !== raw, fallback: false, ref };
}

// ─────────────────────────────────────── melanin / erythema crosstalk ───────

/**
 * Normalised melanin proxy in [0, 1], from ITA.
 *
 * ITA runs high for light skin and low for deep skin, so this inverts and
 * rescales it across the span the bands in engine.js already use: 55 degrees is
 * the very_light boundary and -30 the dark boundary. 0 means no expected
 * crosstalk, 1 means the most this app will model.
 *
 * A PROXY, not a measurement of melanin. ITA is a coordinate in CIELAB, and the
 * relation between it and melanin content is monotone but not linear. It is
 * used here only to grade a confidence downward, which is the safe direction.
 */
export const ITA_MELANIN_CEILING = 55;
export const ITA_MELANIN_FLOOR = -30;

export function melaninProxy(ita) {
  if (!Number.isFinite(ita)) return 1;   // unknown tone -> assume worst case
  const span = ITA_MELANIN_CEILING - ITA_MELANIN_FLOOR;
  const m = (ITA_MELANIN_CEILING - ita) / span;
  return Math.min(Math.max(m, 0), 1);
}

/** The confidence a within-face colour reading starts from, before crosstalk. */
export const RELATIVE_BASE_CONFIDENCE = 0.55;

/**
 * Asymmetric crosstalk coefficients.
 *
 * Wilkes et al. (n=503) found device erythema readings correlated with the
 * subject's OWN melanin at rho up to 0.78 — and the correlation is POSITIVE, so
 * melanin pushes the erythema reading UP. A melanometry review found the same
 * crosstalk above |R| 0.70 in six of seven commercial device comparisons.
 *
 * That asymmetry is the whole point of having two coefficients:
 *
 *   erythema is pushed toward a FALSE POSITIVE by melanin. Over-calling redness
 *     is the direction that ends in an unwarranted referral, so its confidence
 *     is degraded faster.
 *   pallor is measured from the same delta reversed, so melanin pushes it
 *     toward a FALSE NEGATIVE. Under-calling is the safer failure, so its
 *     confidence is degraded more slowly.
 *
 * ── DEVIATION FROM THE BRIEF, STATED RATHER THAN BURIED ────────────────────
 * The brief wrote these as `0.55 * (1 + 0.2 * melaninIndex)` for erythema. Two
 * things had to change for that to be evaluable:
 *
 *   1. `melaninIndex` in this codebase is 100·log10(1/R_red) — unbounded, and
 *      typically 20 to 120. `0.55 * (1 + 0.2 * 70)` is 8.25, which is not a
 *      confidence. The term must be normalised, hence melaninProxy() above,
 *      which is also what the brief's own instruction to "use ITA to estimate
 *      melanin" implies.
 *   2. The sign was raising erythema confidence as melanin rose. That is
 *      backwards against both cited results and against the physical limit in
 *      CLAUDE.md, where more melanin means LESS recoverable haemoglobin signal.
 *
 * The magnitudes asked for (0.2 and 0.1) and the asymmetry between them are
 * kept exactly. Only the normalisation and the sign are corrected.
 */
export const CROSSTALK_ERYTHEMA_COEFF = 0.2;
export const CROSSTALK_PALLOR_COEFF = 0.1;

/**
 * Confidence for a within-face colour reading, degraded by expected crosstalk.
 *
 * @param {"erythema"|"pallor"} kind
 * @param {number} ita
 * @returns {{confidence:number, melanin:number, coefficient:number}}
 */
export function crosstalkConfidence(kind, ita) {
  const melanin = melaninProxy(ita);
  const coefficient =
    kind === "pallor" ? CROSSTALK_PALLOR_COEFF : CROSSTALK_ERYTHEMA_COEFF;
  const confidence = RELATIVE_BASE_CONFIDENCE * (1 - coefficient * melanin);
  return { confidence, melanin, coefficient };
}

// ────────────────────────────────────────────── ridge orientation gating ────

/**
 * Angular tolerance, in degrees, around the target ridge axis.
 *
 * ── WHY THIS IS A TAPER AND NOT A WIDER GATE ───────────────────────────────
 * The gate this replaces was binary: keep the pixel if |Ixx| > |Iyy|, drop it
 * otherwise. That is a hard cut at 45 degrees, and everything past it — an
 * angled crow's foot, a nasolabial fold running obliquely — contributed exactly
 * zero.
 *
 * Replacing it with a hard cut at 30 degrees would make that WORSE, not better:
 * a narrower hard gate discards more. So the tolerance is a plateau, not a
 * boundary. Inside PLATEAU the pixel counts in full; from there it tapers
 * smoothly to zero at CUTOFF. An oblique wrinkle is now attenuated in
 * proportion to how oblique it is, instead of deleted at a threshold, and the
 * response no longer steps discontinuously as a head rotates.
 *
 * Selectivity is preserved where it matters: a ridge perpendicular to the
 * target axis is still weighted zero, which is what keeps the glabella's
 * vertical furrows from being read as forehead lines.
 */
export const ORIENTATION_PLATEAU_DEG = 30;
export const ORIENTATION_CUTOFF_DEG = 60;

/**
 * Principal Hessian direction, in radians.
 *
 * This is the eigenvector angle of the LARGER eigenvalue, which for a dark
 * ridge points ACROSS the ridge. The double-angle form is the correct one for a
 * symmetric 2x2 — atan2(dy, dx) on a difference of positions would answer a
 * different question, since the ridge axis here comes out of second
 * derivatives, not out of two points.
 *
 * The result is an axis, not a direction: it is only meaningful modulo pi.
 */
export function hessianOrientation(Ixx, Iyy, Ixy) {
  return 0.5 * Math.atan2(2 * Ixy, Ixx - Iyy);
}

/**
 * Smallest angle between two axes, in degrees, in [0, 90].
 *
 * Axes, not directions — 179 degrees and 1 degree are the same axis, one degree
 * apart. Getting this wrap wrong makes the taper fire at the wrong places and
 * is invisible in any test that only uses angles near zero.
 */
export function axisSeparationDegrees(aRad, bRad) {
  let d = Math.abs(((aRad - bRad) * 180) / Math.PI) % 180;
  if (d > 90) d = 180 - d;
  return d;
}

/**
 * Weight in [0, 1] for a ridge at `orientationRad` against a target axis.
 *
 * @param {number} orientationRad principal Hessian direction
 * @param {number} targetRad axis the caller is looking for
 */
export function orientationWeight(orientationRad, targetRad) {
  const d = axisSeparationDegrees(orientationRad, targetRad);
  if (d <= ORIENTATION_PLATEAU_DEG) return 1;
  if (d >= ORIENTATION_CUTOFF_DEG) return 0;
  const t = (d - ORIENTATION_PLATEAU_DEG) /
            (ORIENTATION_CUTOFF_DEG - ORIENTATION_PLATEAU_DEG);
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/**
 * Target Hessian axis for a wrinkle running vertically or horizontally.
 *
 * A VERTICAL ridge — a glabella frown line — curves across x, so its principal
 * Hessian direction is horizontal, i.e. 0. A HORIZONTAL ridge — a forehead line
 * — curves across y, so its principal direction is pi/2. The names refer to the
 * line on the face, and the returned angle is perpendicular to it. Conflating
 * the two inverts the whole gate while still looking orientation-selective.
 */
export function targetAxisRadians(vertical) {
  return vertical ? 0 : Math.PI / 2;
}
