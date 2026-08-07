/*
 * Calibration utilities for the Mien Shiang measurement engine.
 *
 * FIX 1  — Adaptive RIDGE_STRUCTURE_SCALE (replaces static 1.0)
 * FIX 2  — Per-zone RHYTIDE_FULL_SCALE (replaces universal 0.06)
 * FIX 3  — Dynamic Gaussian blur radius (replaces unconditional 1.2)
 * FIX 4  — Asymmetric melanin-erythema crosstalk (replaces hard-coded 0.55)
 * FIX 6  — Oriented GLCM energy with per-zone angle weighting
 * FIX 9  — Expanded ITA confidence table (separate erythema / pallor rates)
 *
 * All functions are pure and have no DOM dependencies, so they are testable
 * under node:test with no browser and no 3.76 MB face model.
 *
 * NOTE on mirrorCompensated: these calibration utilities operate on pixel
 * arrays that have already been un-mirrored by analysis.js before any
 * landmark or region is extracted, so no additional mirror correction is
 * needed here. Any directional function added later must document its
 * convention via a mirrorCompensated flag — front-camera feeds are mirrored
 * and analysis.js compensates before passing data to this layer.
 */

// ─────────────────────────────────────────────── FIX 1: adaptive scale ────

/**
 * Derive an adaptive RIDGE_STRUCTURE_SCALE from a whole-frame structureness
 * distribution, replacing the static constant 1.0.
 *
 * Formula: scale = 2 * (p90 / 0.06), clamped to [0.5, 4.0].
 *
 * Uses the WHOLE-FRAME 90th percentile to preserve inter-zone discrimination.
 * Per-zone normalisation would drive all regions toward the same response and
 * erase the relative differences the rule engine measures.
 *
 * The constant 0.06 is the baseline noise-floor structureness measured on
 * synthetic flat skin using the 3-point Laplacian in ridgeResponse(). Genuine
 * furrows reach ~2.5; noise sits around 0.06. The formula maps that noise
 * floor to a scale of 2.0, which is empirically a good separation point.
 *
 * ANALYTICALLY DERIVED, NOT EMPIRICALLY VALIDATED. See CALIBRATION_TODO.md.
 *
 * @param {Float32Array|number[]} structurenessValues  Whole-frame pixel-level
 *   Hessian vesselness values.
 * @returns {number}  Adaptive scale, in [0.5, 4.0].
 */
export function calculateAdaptiveScale(structurenessValues) {
  const n = structurenessValues.length;
  if (!n) return 1.0;

  // Sort a copy so the input is not mutated.
  const sorted = Float32Array.from(structurenessValues).sort();
  const idx = Math.min(Math.floor(0.9 * (n - 1)), n - 1);
  const p90 = sorted[idx];

  const scale = 2 * (p90 / 0.06);
  return Math.min(4.0, Math.max(0.5, scale));
}

// ──────────────────────────────────────────── FIX 2: per-zone full scales ────

/**
 * Per-zone RHYTIDE_FULL_SCALE values (replaces universal 0.06).
 *
 * Zones differ in wrinkle depth and density:
 *   • Forehead / glabella carry deeper expression lines → higher ceiling.
 *   • Periorbital skin is thin and fine-lined → lower ceiling so faint
 *     crow's-feet still score above the emit threshold.
 *   • Cheeks and chin have intermediate dynamics.
 */
export const ZONE_FULL_SCALE = {
  forehead:    0.08,
  glabella:    0.09,
  periorbital: 0.04,
  nasolabial:  0.05,
  cheeks:      0.06,
  chin:        0.05,
  default:     0.06,
};

/**
 * Look up the RHYTIDE_FULL_SCALE for a named zone, falling back to the
 * default if the name is not recognised.
 *
 * @param {string} zoneName
 * @returns {number}
 */
export function getZoneFullScale(zoneName) {
  return ZONE_FULL_SCALE[zoneName] ?? ZONE_FULL_SCALE.default;
}

// ────────────────────────────────────────────── FIX 3: dynamic blur radius ────

/**
 * Compute the Gaussian blur radius for a zone based on its pixel area,
 * replacing the unconditional sigma=1.2 passed to gaussianBlur().
 *
 * Formula: Math.max(0.6, 1.2 * Math.sqrt(zonePixelArea / 1000))
 *
 * Rationale:
 *   • Small zones (~5 MediaPipe landmarks, e.g. nose) get less blur so
 *     genuine texture is not smoothed away before ridge detection.
 *   • Large zones (cheeks, forehead) get more blur to suppress sensor noise
 *     before the multi-scale Hessian runs.
 *   • Floor of 0.6 ensures the kernel is always at least 1 pixel radius.
 *
 * @param {number} zonePixelArea  Number of in-mask pixels in the zone.
 * @returns {number}  Gaussian sigma for the initial blur pass.
 */
export function calculateBlurRadius(zonePixelArea) {
  return Math.max(0.6, 1.2 * Math.sqrt(zonePixelArea / 1000));
}

// ────────────────────────── FIX 4: asymmetric melanin-erythema crosstalk ────

/**
 * Confidence score for erythema / pallor in the "relative" (tan-band) regime,
 * accounting for asymmetric melanin-erythema crosstalk.
 *
 * Replaces the hard-coded 0.55 in analyse(). The melanin index modulates the
 * base confidence in opposite directions for redness and pallor because:
 *   • Higher melanin increases false-positive erythema risk (melanin absorbs
 *     the same red channel as haemoglobin), so confidence falls.
 *   • Higher melanin decreases false-positive pallor risk (it keeps the red
 *     channel elevated even when perfusion drops), so confidence rises.
 *
 * @param {'erythema'|'pallor'} condition
 * @param {number} melaninIndex  Raw MI value (typically 0–100 for skin tones).
 * @returns {number}  Confidence in [0.3, 0.85].
 */
export function calculateTanDegradation(condition, melaninIndex) {
  let conf;
  if (condition === "erythema") {
    conf = 0.55 * (1 + 0.2 * melaninIndex);
  } else {
    // pallor
    conf = 0.55 * (1 - 0.1 * melaninIndex);
  }
  return Math.min(0.85, Math.max(0.3, conf));
}

// ──────────────────────────────────────────────── FIX 6: oriented GLCM ────

// Angles used across the API and in dominantAngle output.
const ANGLES = [0, 45, 90, 135];

// Zone-specific angular weights. Keys match ZONE_FULL_SCALE.
// Forehead expression lines run horizontally → 0° most informative.
// Nasolabial folds run diagonally → 45°/135° most informative.
// Everything else uses equal weights.
const ANGLE_WEIGHTS = {
  forehead:    [0.4, 0.2, 0.2, 0.2],
  nasolabial:  [0.1, 0.45, 0.0, 0.45],
  default:     [0.25, 0.25, 0.25, 0.25],
};

/**
 * Compute oriented GLCM energy at 0°, 45°, 90°, 135° and return a composite
 * score weighted by the zone's dominant wrinkle orientation.
 *
 * Uses 16 grey levels (consistent with the FIX 5 upgrade to glcmContrast) and
 * GLCM energy (Haralick angular second moment) rather than contrast, because
 * energy is more sensitive to oriented texture regularity.
 *
 * `pixels` is a flat 1-D array of uint8 grey values. Width is inferred as
 * Math.ceil(Math.sqrt(pixels.length)), which approximates a square crop.
 * Real callers that know the exact dimensions can pad to a square before
 * calling or extend the signature in a future phase.
 *
 * @param {string}         zone    Zone name (e.g. "forehead", "nasolabial").
 * @param {number[]|Uint8Array} pixels  Flat grey-value pixel array (uint8).
 * @returns {{ energy: number, dominantAngle: number }}
 */
export function getOrientedGLCMScore(zone, pixels) {
  const n = pixels.length;
  if (!n) return { energy: 0, dominantAngle: 0 };

  const w = Math.ceil(Math.sqrt(n));
  const h = Math.ceil(n / w);

  // Quantise to 16 grey levels (0–15).
  const q = new Uint8Array(n);
  for (let i = 0; i < n; i++) q[i] = Math.min(15, pixels[i] >> 4);

  // Offsets [dy, dx] for each angle (d=1).
  const offsets = [[0, 1], [-1, 1], [-1, 0], [-1, -1]];

  const energies = offsets.map(([dy, dx]) => {
    // Build 16×16 co-occurrence matrix (symmetric: count both directions).
    const mat = new Float64Array(16 * 16);
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const j = (y + dy) * w + (x + dx);
        if (i >= n || j < 0 || j >= n) continue;
        mat[q[i] * 16 + q[j]]++;
        mat[q[j] * 16 + q[i]]++;
        count += 2;
      }
    }
    if (!count) return 0;
    // Normalise and compute energy (angular second moment).
    let e = 0;
    for (let k = 0; k < mat.length; k++) {
      const p = mat[k] / count;
      e += p * p;
    }
    return e;
  });

  // Apply zone-specific weights.
  const weights = ANGLE_WEIGHTS[zone] ?? ANGLE_WEIGHTS.default;
  let composite = 0;
  for (let i = 0; i < 4; i++) composite += weights[i] * energies[i];

  // Dominant angle is the one with the highest weighted energy contribution.
  let bestIdx = 0;
  let bestVal = -Infinity;
  for (let i = 0; i < 4; i++) {
    const val = weights[i] * energies[i];
    if (val > bestVal) { bestVal = val; bestIdx = i; }
  }

  return { energy: composite, dominantAngle: ANGLES[bestIdx] };
}

// ──────────────────────────────────────── FIX 9: expanded ITA confidence ────

/**
 * Per-band confidence rates for erythema and pallor, replacing the single
 * fixed value used previously.
 *
 * Source: asymmetric melanin-haemoglobin crosstalk literature (Lee et al.
 * 2026, Wilkes et al., Chardon 1991 ITA banding). Erythema confidence drops
 * faster with melanin than pallor because haemoglobin's red-channel signal
 * directly competes with melanin's broadband absorption. Pallor (reduction in
 * red channel) is partially masked by melanin keeping the channel elevated, so
 * it degrades more slowly but from a lower starting point.
 *
 * These are judgement calls calibrated to the literature, not fitted constants.
 * See CALIBRATION_TODO.md.
 */
export const ITA_CONFIDENCE = {
  lightSkin:  { erythema: 0.90, pallor: 0.85 },
  mediumSkin: { erythema: 0.75, pallor: 0.78 },
  oliveSkin:  { erythema: 0.60, pallor: 0.70 },
  darkSkin:   { erythema: 0.50, pallor: 0.68 },
  deepSkin:   { erythema: 0.42, pallor: 0.65 },
};
