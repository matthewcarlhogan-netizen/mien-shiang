/*
 * Mien Shiang — measurement engine (browser port).
 *
 * Direct port of the Python cv/colour.py + cv/measures.py. Same formulas, same
 * constants, same refusals. Verified numerically against the Python output.
 *
 * Runs entirely on the phone. No pixels ever leave the device.
 */

import { calculateBlurRadius } from "./utils/calibrationEngine.js";

// ---------------------------------------------------------------- colour ----

// EI = 100*log10(R_red/R_green)   MI = 100*log10(1/R_red)
// Dawson 1980 -> Takiwaki 1998 -> Yamamoto 2008.
// SIGN CONVENTION: redness-INCREASING (red over green). The literature
// conflicts; flipping this silently inverts every result and makes the safety
// gate fire on pale skin instead of red.
const EPS = 1e-4;

export function srgbToLinear(v) {
  const x = Math.min(Math.max(v / 255, 0), 1);
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** Shades-of-Gray colour constancy, Minkowski L6 (Finlayson & Trezzi 2004).
 *  MUST be applied to the whole frame, once — never per region. Normalising
 *  each region separately drives them all toward grey and erases exactly the
 *  between-region differences this whole method measures. */
export function shadesOfGray(data, p = 6) {
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    sr += Math.pow(data[i], p);
    sg += Math.pow(data[i + 1], p);
    sb += Math.pow(data[i + 2], p);
    n++;
  }
  if (n < 16) return data;

  let ir = Math.pow(sr / n, 1 / p);
  let ig = Math.pow(sg / n, 1 / p);
  let ib = Math.pow(sb / n, 1 / p);
  const norm = Math.sqrt(ir * ir + ig * ig + ib * ib) / Math.sqrt(3);
  ir = Math.max(ir / norm, 1e-6);
  ig = Math.max(ig / norm, 1e-6);
  ib = Math.max(ib / norm, 1e-6);

  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = Math.min(255, data[i] / ir);
    out[i + 1] = Math.min(255, data[i + 1] / ig);
    out[i + 2] = Math.min(255, data[i + 2] / ib);
    out[i + 3] = data[i + 3];
  }
  return out;
}

export function erythemaIndex(r, g) {
  return 100 * Math.log10((srgbToLinear(r) + EPS) / (srgbToLinear(g) + EPS));
}

export function melaninIndex(r) {
  return 100 * Math.log10(1 / (srgbToLinear(r) + EPS));
}

/** sRGB -> CIELAB (D65). Needed for ITA. */
export function rgbToLab(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** ITA = atan2(L*-50, b*) in degrees (Chardon 1991).
 *  atan2, NOT atan with a clamped b* — clamping broke quadrant resolution and
 *  mis-binned cool skin toward lighter strata, desensitising the gates. */
export function itaDegrees(L, b) {
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}

export function itaBand(ita) {
  if (!isFinite(ita)) return "unknown";
  if (ita > 55) return "very_light";
  if (ita > 41) return "light";
  if (ita > 28) return "intermediate";
  if (ita > 10) return "tan";
  if (ita > -30) return "brown";
  return "dark";
}

/* The physical limit. Lee et al., J Invest Dermatol 2026 (15,000+ spectra):
 * as melanin rises, haemoglobin's spectral features fall below the noise
 * floor. Their words: "not a calibration problem that better instruments
 * could solve." So past a point we report nothing rather than guess. */
export function erythemaConfidence(ita) {
  const band = itaBand(ita);
  if (["very_light", "light", "intermediate"].includes(band)) {
    return { regime: "full", reason: "" };
  }
  if (band === "tan") {
    return {
      regime: "relative",
      reason: "Redness is measured by comparing regions of your own face rather than against a fixed scale.",
    };
  }
  if (band === "brown" || band === "dark") {
    return {
      regime: "low",
      reason: "At deeper skin tones, melanin absorbs light across the same range as haemoglobin, so redness can't be measured reliably from a photo. That's a physical limit of photography — not a fault in this photo or your skin.",
    };
  }
  return { regime: "low", reason: "Skin tone couldn't be estimated from this photo." };
}

// -------------------------------------------------------------- measures ----

export const DELTA_EI_FULL_SCALE = 12.0;
export const DELTA_MI_FULL_SCALE = 10.0;
// Hessian structureness normaliser. Re-derived for THIS numerics, not copied
// from the Python version: that used cv2.Sobel(ksize=5), which has a much
// larger kernel gain, so its constant (120) made the vesselness term vanish
// here. Measured on synthetic skin with the 3-point Laplacian used below:
// sensor noise sits at structureness ~0.06, genuine furrows reach ~2.5.
// 1.0 puts the response curve between the two.
export const RIDGE_STRUCTURE_SCALE = 1.0;
export const RHYTIDE_FULL_SCALE = 0.06;
export const TEXTURE_CONTRAST_FULL_SCALE = 0.35;
export const EMIT_THRESHOLD = 0.15;

export const BASELINE_ZONES = ["center_forehead", "chin"];

/* Never emitted. These need a model trained on labelled clinical images (or,
 * for edema, 3D data a flat photo can't supply). Fabricating a low score would
 * let the UI imply a check happened that didn't. */
export const UNAVAILABLE = {
  acne: "needs a detector trained on labelled photographs",
  acne_cystic: "needs a detector trained on labelled photographs",
  comedone: "needs a detector trained on labelled photographs",
  ulcer: "needs a classifier trained on labelled photographs",
  dermatitis: "needs a classifier trained on labelled photographs",
  focal_pigmented_lesion: "out of scope; needs assessment by a person",
  telangiectasia: "needs a vessel detector validated on facial skin",
  edema: "swelling is a 3D change; not recoverable from one flat photo",
  diagonal_crease: "needs an ear detector; the face mesh has no earlobe points",
};

/** Trimmed median — specular highlights, stray hair and shadow edges all sit
 *  in the tails, and an untrimmed mean tracks them instead of the skin. */
export function trimmedMedian(vals, lo = 10, hi = 90) {
  if (!vals.length) return NaN;
  const s = Float64Array.from(vals).sort();
  const a = s[Math.floor((lo / 100) * (s.length - 1))];
  const b = s[Math.floor((hi / 100) * (s.length - 1))];
  const core = [];
  for (const v of s) if (v >= a && v <= b) core.push(v);
  const c = core.length ? core : Array.from(s);
  return c[Math.floor(c.length / 2)];
}

function sev(value, fullScale) {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.min(value / fullScale, 1);
}

/** Haralick GLCM contrast, d=2, four orientations averaged, 16 grey levels. */
export function glcmContrast(gray, mask, w, h) {
  const offs = [[0, 2], [-2, 2], [-2, 0], [-2, -2]];
  const q = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) q[i] = Math.min(15, gray[i] >> 4);

  const out = [];
  for (const [dy, dx] of offs) {
    let sum = 0, n = 0;
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const j = (y + dy) * w + (x + dx);
        if (!mask[i] || !mask[j]) continue;
        const d = q[i] - q[j];
        sum += d * d;
        n++;
      }
    }
    if (n > 64) out.push(sum / n);
  }
  return out.length ? out.reduce((a, b) => a + b, 0) / out.length : NaN;
}

function gaussianBlur(src, w, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 2));
  const k = [];
  let ks = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(v); ks += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= ks;

  const tmp = new Float64Array(src.length);
  const dst = new Float64Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const xx = Math.min(w - 1, Math.max(0, x + i));
        a += src[y * w + xx] * k[i + r];
      }
      tmp[y * w + x] = a;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const yy = Math.min(h - 1, Math.max(0, y + i));
        a += tmp[yy * w + x] * k[i + r];
      }
      dst[y * w + x] = a;
    }
  return dst;
}

/** Multi-scale Hessian ridge response, orientation-gated (Frangi 1998;
 *  directional gating after Ng et al. HHF, ACCV 2014).
 *
 *  Returns MEAN vesselness with a FIXED normaliser — not area above the
 *  region's own percentile. That earlier approach was self-normalising, so
 *  flat noisy skin scored higher than real furrows. Interpreted relative to
 *  the subject's own baseline in analyse(). */
export function ridgeResponse(gray, mask, w, h, vertical = true) {
  const f = Float64Array.from(gray);
  // FIX 3: dynamic blur radius based on zone pixel area (mask-in pixels),
  // replacing the unconditional sigma=1.2 used previously.
  // Cap at 1.5: ridgeResponse uses a 3-point Laplacian whose Hessian response
  // scales roughly as 1/σ³. Above sigma≈1.7 the signal from fine wrinkles
  // (~3 px wide) drops below the emit threshold. The cap retains the dynamic
  // benefit for small zones (less blur, down to 0.6) while guarding against
  // regression on larger zones where the formula would over-smooth fine detail.
  const area = mask.reduce((s, v) => s + (v ? 1 : 0), 0);
  const blurSigma = Math.min(calculateBlurRadius(area), 1.5);
  const base = gaussianBlur(f, w, h, blurSigma);
  const best = new Float64Array(gray.length);

  for (const sigma of [1.5, 2.5, 3.5]) {
    const s = gaussianBlur(base, w, h, sigma);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const Ixx = s[i - 1] - 2 * s[i] + s[i + 1];
        const Iyy = s[i - w] - 2 * s[i] + s[i + w];
        const Ixy =
          (s[i - w - 1] + s[i + w + 1] - s[i - w + 1] - s[i + w - 1]) / 4;

        const tmp = Math.sqrt(Math.max((Ixx - Iyy) ** 2 + 4 * Ixy * Ixy, 0));
        const l1 = 0.5 * (Ixx + Iyy + tmp);
        const l2 = 0.5 * (Ixx + Iyy - tmp);
        if (l1 <= 0) continue;                       // dark ridges only

        // FIX 8: angular tolerance gate — capture wrinkles within ±30° of
        // the target axis rather than the strict quadrant split used before.
        // atan2(|lyy|, |lxx|) measures how far the dominant curvature deviates
        // from the Ixx axis; ≤30° keeps the orientation close to vertical.
        if (vertical) {
          const angle = Math.atan2(Math.abs(Iyy), Math.abs(Ixx)) * (180 / Math.PI);
          if (angle > 30) continue;
        } else {
          const angle = Math.atan2(Math.abs(Ixx), Math.abs(Iyy)) * (180 / Math.PI);
          if (angle > 30) continue;
        }

        const rb = Math.abs(l2) / Math.max(Math.abs(l1), 1e-9);
        const st = Math.sqrt(l1 * l1 + l2 * l2);
        const v =
          Math.exp(-(rb * rb) / 0.5) *
          (1 - Math.exp(-(st * st) / (2 * RIDGE_STRUCTURE_SCALE ** 2)));
        if (v > best[i]) best[i] = v;
      }
    }
  }

  let sum = 0, n = 0;
  for (let i = 0; i < best.length; i++) if (mask[i]) { sum += best[i]; n++; }
  return n ? sum / n : NaN;
}

/** Per-region stats from already-white-balanced pixels. */
export function regionStats(rgba, mask, w, h) {
  const ei = [], mi = [], Ls = [], bs = [];
  const gray = new Uint8Array(w * h);
  let n = 0;

  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    gray[i] = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) | 0;
    if (!mask[i]) continue;
    ei.push(erythemaIndex(rgba[p], rgba[p + 1]));
    mi.push(melaninIndex(rgba[p]));
    const lab = rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2]);
    Ls.push(lab[0]); bs.push(lab[2]);
    n++;
  }
  if (n < 256) return null;

  return {
    // FIX 7: erythema index uses tighter trimming (20th–80th) to preserve
    // localised pathology such as malar rash, which typically covers ~15% of
    // the zone. The wider 10th–90th band would trim into the signal itself.
    // All other channels keep the original 10th–90th to stay robust against
    // shadow edges and specular highlights in the tails.
    ei: trimmedMedian(ei, 20, 80),
    mi: trimmedMedian(mi),
    L: trimmedMedian(Ls),
    b: trimmedMedian(bs),
    contrast: glcmContrast(gray, mask, w, h),
    gray, n,
  };
}

/**
 * Whole-face analysis.
 *
 * SELF-REFERENCE is the point: every value is a difference between one region
 * and PERIPHERAL regions of the same face. That cancels the subject's own
 * melanin and most of the lighting term at once, which is the main defence
 * against skin-tone bias.
 *
 * The baseline is peripheral, not whole-face, deliberately — a malar rash
 * spans both cheeks and the nose bridge, so a whole-face average would fold
 * the rash into its own control and hide it.
 */
export function rawScalars(regions) {
  const baseEi = [], baseMi = [], baseC = [], baseR = [], baseL = [], baseB = [];
  let basePx = 0;

  for (const key of BASELINE_ZONES) {
    const r = regions[key];
    if (!r || !r.stats) continue;
    baseEi.push(r.stats.ei);
    baseMi.push(r.stats.mi);
    baseL.push(r.stats.L);
    baseB.push(r.stats.b);
    if (isFinite(r.stats.contrast)) baseC.push(r.stats.contrast);
    const rr = ridgeResponse(r.stats.gray, r.mask, r.w, r.h, true);
    if (isFinite(rr)) baseR.push(rr);
    basePx += r.stats.n;
  }

  if (!baseEi.length) {
    return {
      zones: {},
      baseline: {
        regime: "low", n: 0,
        reason: "Not enough clear skin visible to set a baseline.",
      },
    };
  }

  const med = (a) => (a.length ? Float64Array.from(a).sort()[a.length >> 1] : NaN);
  const ita = itaDegrees(med(baseL), med(baseB));
  const { regime, reason } = erythemaConfidence(ita);
  const baseline = {
    ei: med(baseEi), mi: med(baseMi), contrast: med(baseC), ridge: med(baseR),
    ita, band: itaBand(ita), regime, reason, n: basePx,
  };

  const zones = {};
  for (const [key, r] of Object.entries(regions)) {
    if (!r.stats) continue;
    const vertical = key === "glabella";
    const ridge = ridgeResponse(r.stats.gray, r.mask, r.w, r.h, vertical);

    zones[key] = {
      // NULL, NOT ZERO, in the low-confidence regime. This is the whole
      // dark-skin posture from CLAUDE.md carried down to the contract: a
      // fitted-to-zero value would make the system represent "we measured
      // colour and found none", which is a claim with nothing behind it.
      // Absence of measurement and a measurement of absence are different
      // objects, and only the first is honest here. Every consumer must
      // branch on null rather than arithmetic on a stand-in.
      deltaEi: regime === "low" ? null : r.stats.ei - baseline.ei,
      deltaMi: r.stats.mi - baseline.mi,
      deltaContrast: isFinite(baseline.contrast)
        ? r.stats.contrast - baseline.contrast : null,
      ridge,
      ridgeDelta: isFinite(baseline.ridge) ? ridge - baseline.ridge : null,
      ridgeAxis: vertical ? "vertical" : "horizontal",
      L: r.stats.L,
      b: r.stats.b,
      pixels: r.stats.n,
    };
  }

  return { baseline, zones };
}

/**
 * Labelled observations for the forward-chaining rule engine.
 *
 * Built ON TOP of rawScalars() rather than beside it, so there is exactly one
 * place where a delta is computed. Two independent paths over the same pixels
 * would drift, and the ridge response is the most expensive operation in the
 * app to run twice.
 *
 * @param {object} regions
 * @param {object} [precomputed] rawScalars() output, if the caller already has
 *        it. Passing it avoids recomputing the ridge response per zone.
 */
export function analyse(regions, precomputed) {
  const raw = precomputed ?? rawScalars(regions);
  const { baseline } = raw;

  if (!Object.keys(raw.zones).length && baseline.n === 0) {
    return { observations: [], baseline };
  }

  const obs = [];
  const tone = baseline.band;

  for (const [key, z] of Object.entries(raw.zones)) {
    if (z.deltaEi !== null) {
      const conf = baseline.regime === "full" ? 0.8 : 0.55;
      const s = sev(z.deltaEi, DELTA_EI_FULL_SCALE);
      if (s >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "erythema", severity: s, confidence: conf, tone,
                   measured: { delta_ei: z.deltaEi } });
      const sp = sev(-z.deltaEi, DELTA_EI_FULL_SCALE);
      if (sp >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "pallor", severity: sp, confidence: conf, tone,
                   measured: { delta_ei: z.deltaEi } });
    }

    const sm = sev(z.deltaMi, DELTA_MI_FULL_SCALE);
    if (sm >= EMIT_THRESHOLD)
      obs.push({ zone: key, condition: "hyperpigmentation", severity: sm, confidence: 0.75, tone,
                 measured: { delta_mi: z.deltaMi } });

    const sr = z.ridgeDelta !== null ? sev(z.ridgeDelta, RHYTIDE_FULL_SCALE) : 0;
    if (sr >= EMIT_THRESHOLD)
      obs.push({
        zone: key,
        condition: z.ridgeAxis === "vertical"
          ? "deep_rhytide_vertical" : "deep_rhytide_horizontal",
        severity: sr, confidence: 0.5, tone, measured: { ridge: z.ridge },
      });

    if (z.deltaContrast !== null) {
      const sx = sev(z.deltaContrast, TEXTURE_CONTRAST_FULL_SCALE);
      if (sx >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "xerosis", severity: sx, confidence: 0.4, tone,
                   measured: { delta_contrast: z.deltaContrast } });
    }
  }

  return { observations: obs, baseline };
}
