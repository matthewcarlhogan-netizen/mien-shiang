/*
 * Mien Shiang — measurement engine (browser port).
 *
 * Direct port of the Python cv/colour.py + cv/measures.py. Same formulas, same
 * constants, same refusals. Verified numerically against the Python output.
 *
 * Runs entirely on the phone. No pixels ever leave the device.
 */

import {
  calculateAdaptiveScale, calculateBlurSigma, rhytideFullScale,
  crosstalkConfidence, orientationWeight, hessianOrientation, targetAxisRadians,
  BLUR_BASE_SIGMA,
} from "./utils/calibrationEngine.js";
import {
  orientedGlcm, isotropyWeight, robustCentre, focalExcess,
  ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI,
} from "./utils/textureAnalyzer.js";

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
/* GLCM contrast is now NORMALISED by (levels-1)^2 in textureAnalyzer.js, so it
 * lands in [0,1] and no longer moves when the quantisation changes. The old
 * 0.35 was in raw 8-level units and does not transfer: re-derived here on the
 * same synthetic smooth-versus-rough pair the old constant sat between, at 16
 * levels and d=2. Still a reasoned starting point, not a fitted value. */
export const TEXTURE_CONTRAST_FULL_SCALE = 0.006;
export const EMIT_THRESHOLD = 0.15;
/* Rhytide confidence when the per-image ridge normaliser hit its ceiling. See
 * the note at the emit site: at the rail, a noisy capture and a textured face
 * are indistinguishable, so the reading survives but says less. */
export const RHYTIDE_CLAMPED_CONFIDENCE = 0.35;

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

/** Haralick GLCM contrast, d=1, four orientations averaged, 8 grey levels. */
export function glcmContrast(gray, mask, w, h) {
  const offs = [[0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const q = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) q[i] = Math.min(7, gray[i] >> 5);

  const out = [];
  for (const [dy, dx] of offs) {
    let sum = 0, n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
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
export function ridgeField(gray, mask, w, h, opts = {}) {
  const vertical = opts.vertical ?? true;
  const blurSigma = opts.blurSigma ?? BLUR_BASE_SIGMA;
  const target = targetAxisRadians(vertical);

  const f = Float64Array.from(gray);
  const base = gaussianBlur(f, w, h, blurSigma);

  const st = new Float64Array(gray.length);   // structureness, orientation-UNgated
  const rb = new Float64Array(gray.length);   // blobness
  const wt = new Float64Array(gray.length);   // orientation weight in [0,1]
  let positives = 0;

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

        // Scale selection by MAXIMUM STRUCTURENESS rather than maximum
        // vesselness. Vesselness depends on the normaliser, and the normaliser
        // is not known yet at this point — it is estimated from these very
        // values. Selecting on structureness keeps the field independent of the
        // scale, which is the only reason one pass can serve both jobs.
        const s2 = Math.sqrt(l1 * l1 + l2 * l2);
        if (s2 <= st[i]) continue;
        if (st[i] === 0) positives++;
        st[i] = s2;
        rb[i] = Math.abs(l2) / Math.max(Math.abs(l1), 1e-9);
        wt[i] = orientationWeight(hessianOrientation(Ixx, Iyy, Ixy), target);
      }
    }
  }

  return { st, rb, wt, mask, positives, blurSigma, vertical, n: w * h };
}

/** Mean vesselness over a prepared field, at a given normaliser. Cheap. */
export function ridgeMean(field, scale = RIDGE_STRUCTURE_SCALE) {
  const { st, rb, wt, mask } = field;
  const denom = 2 * scale * scale;
  let sum = 0, n = 0;
  for (let i = 0; i < st.length; i++) {
    if (!mask[i]) continue;
    if (st[i] > 0) {
      sum += wt[i] *
        Math.exp(-(rb[i] * rb[i]) / 0.5) *
        (1 - Math.exp(-(st[i] * st[i]) / denom));
    }
    n++;
  }
  return n ? sum / n : NaN;
}

/**
 * Multi-scale Hessian ridge response, orientation-gated (Frangi 1998;
 * directional gating after Ng et al. HHF, ACCV 2014).
 *
 * Returns MEAN vesselness with a FIXED normaliser — not area above the
 * region's own percentile. That earlier approach was self-normalising, so flat
 * noisy skin scored higher than real furrows. Interpreted relative to the
 * subject's own baseline in analyse().
 *
 * Kept as a single-call convenience. The pipeline uses ridgeField() +
 * ridgeMean() instead, so that the per-image normaliser can be estimated from
 * the field before the response is reduced — computing the Hessian twice would
 * double the most expensive operation in the app.
 */
export function ridgeResponse(gray, mask, w, h, vertical = true, opts = {}) {
  const field = ridgeField(gray, mask, w, h, { vertical, blurSigma: opts.blurSigma });
  return ridgeMean(field, opts.scale ?? RIDGE_STRUCTURE_SCALE);
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

  const texture = orientedGlcm(gray, mask, w, h);

  return {
    // The colour centre uses the 20-80 window. Note what that does and does
    // not buy: the median of a symmetric trim is the median, so this does not
    // recover a localised patch — `focalEi` below is the statistic that sees
    // one. See robustCentre() in textureAnalyzer.js.
    ei: robustCentre(ei, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI),
    /** How far the reddest fifth of the region sits above its own middle. A
     *  uniformly ruddy region and a region with one raised patch have similar
     *  medians and very different values here. Measured, not yet graded. */
    focalEi: focalExcess(ei),
    mi: trimmedMedian(mi),
    L: trimmedMedian(Ls),
    b: trimmedMedian(bs),
    contrast: texture.meanContrast,
    texture,
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
export function rawScalars(regions, opts = {}) {
  const adaptive = opts.adaptive !== false;

  /* ── PHASE A ──────────────────────────────────────────────────────────────
   * One Hessian pass per zone, producing a field that does NOT yet depend on
   * the normaliser. The normaliser is estimated from these fields, so it
   * cannot be applied while building them, and building them twice would
   * double the most expensive operation in the app. */
  /* The blur reference is the MEDIAN ZONE AREA OF THIS IMAGE, not a constant.
   * ROI areas scale with capture resolution, so a fixed reference puts every
   * zone of every real photo at the clamp — an adaptive parameter that is
   * silently constant, and constant at the wrong value. Against the median, a
   * typical zone gets the 1.2 the detector was derived at and the rest vary
   * around it, which is what "small zones less, large zones more" requires. */
  const areas = Object.values(regions)
    .filter((r) => r.stats).map((r) => r.stats.n).sort((a, b) => a - b);
  const referenceArea = areas.length ? areas[areas.length >> 1] : undefined;

  const fields = {};
  let totalMasked = 0;
  for (const [key, r] of Object.entries(regions)) {
    if (!r.stats) continue;
    const vertical = key === "glabella";
    const blur = calculateBlurSigma(r.stats.n, referenceArea);
    fields[key] = {
      field: ridgeField(r.stats.gray, r.mask, r.w, r.h,
                        { vertical, blurSigma: blur.sigma }),
      vertical, blur,
    };
    totalMasked += r.stats.n;
  }

  /* Structureness is pooled ACROSS ZONES — per image, never per zone. Per-zone
   * normalisation is the defect CLAUDE.md item 4 exists to prevent: a region
   * normalised by its own content lets furrows raise their own divisor, so
   * flat noisy skin outscores real furrows. Pooling makes furrows a small
   * minority of the sample, and the clamp inside calculateAdaptiveScale()
   * bounds what is left of the effect. */
  const stride = Math.max(1, Math.ceil(totalMasked / 20000));
  const pooled = [];
  let seen = 0;
  for (const { field } of Object.values(fields)) {
    const { st, mask } = field;
    for (let i = 0; i < st.length; i++) {
      if (!mask[i] || st[i] <= 0) continue;
      if (seen++ % stride === 0) pooled.push(st[i]);
    }
  }
  const calibration = calculateAdaptiveScale(pooled, Object.keys(fields).length);
  const ridgeScale = adaptive ? calibration.scale : RIDGE_STRUCTURE_SCALE;

  const baseEi = [], baseMi = [], baseC = [], baseR = [], baseL = [], baseB = [];
  const baseBlur = [];
  let basePx = 0;

  for (const key of BASELINE_ZONES) {
    const r = regions[key];
    if (!r || !r.stats) continue;
    baseEi.push(r.stats.ei);
    baseMi.push(r.stats.mi);
    baseL.push(r.stats.L);
    baseB.push(r.stats.b);
    if (isFinite(r.stats.contrast)) baseC.push(r.stats.contrast);
    // The baseline ridge is taken on the VERTICAL axis regardless of the
    // zone's own axis, which is the reference the deltas below are against.
    // Reusing the zone's field here instead would silently change what
    // ridgeDelta means for every zone at once.
    const blur = fields[key]?.blur ?? calculateBlurSigma(r.stats.n, referenceArea);
    baseBlur.push(blur.sigma);
    const bf = ridgeField(r.stats.gray, r.mask, r.w, r.h,
                          { vertical: true, blurSigma: blur.sigma });
    const rr = ridgeMean(bf, ridgeScale);
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
  const baselineBlur = med(baseBlur);
  const baseline = {
    ei: med(baseEi), mi: med(baseMi), contrast: med(baseC), ridge: med(baseR),
    ita, band: itaBand(ita), regime, reason, n: basePx,
    /** The per-image ridge normaliser actually used, and how it was reached.
     *  Carried on the result rather than left implicit because two runs at
     *  different normalisers produce ridge numbers that are not comparable —
     *  the same hazard the `basis` tag guards on glowIndex. */
    ridgeScale, ridgeScaleRaw: calibration.raw, ridgeScaleP90: calibration.p90,
    ridgeScaleClamped: calibration.clamped, ridgeScaleFallback: calibration.fallback,
    ridgeScaleSamples: calibration.n,
    blurSigma: baselineBlur,
  };

  const zones = {};
  for (const [key, r] of Object.entries(regions)) {
    if (!r.stats) continue;
    const held = fields[key];
    const vertical = held.vertical;
    const ridge = ridgeMean(held.field, ridgeScale);

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

      /* ── CALIBRATION PROVENANCE, CARRIED NOT IMPLIED ───────────────────────
       * The pre-blur is now a function of the zone's own pixel area, so two
       * ridge numbers taken at different sigmas are measuring at different
       * spatial scales. `ridgeDelta` is exactly such a comparison — zone
       * against baseline — so the mismatch has to travel with the number
       * rather than be re-derived by whoever plots it. Same reasoning as the
       * `basis` tag on glowIndex: a value whose comparability depends on a
       * hidden parameter will eventually be compared across it. */
      blurSigma: held.blur.sigma,
      blurClamped: held.blur.clamped,
      blurMatched: Math.abs(held.blur.sigma - baselineBlur) < 0.05,
      rhytideFullScale: rhytideFullScale(key),

      /** Which way the surface structure runs, and how one-directional it is.
       *  Measured only — nothing grades these yet, and nothing should until
       *  there is labelled data to fit against. */
      textureAxis: r.stats.texture?.axisDegrees ?? null,
      textureDirectionality: r.stats.texture?.directionality ?? null,
      focalEi: r.stats.focalEi ?? null,

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
      /* Confidence in the relative regime is now asymmetric between the two
       * readings taken off the SAME delta. Melanin biases a photographic
       * redness reading upward (Wilkes et al., rho up to 0.78), so erythema
       * fails toward a false positive and pallor toward a false negative. The
       * first is the direction that ends in an unwarranted referral, so it is
       * degraded faster. The full regime is unchanged at 0.8. */
      const full = baseline.regime === "full";
      const confE = full ? 0.8 : crosstalkConfidence("erythema", baseline.ita).confidence;
      const confP = full ? 0.8 : crosstalkConfidence("pallor", baseline.ita).confidence;

      const s = sev(z.deltaEi, DELTA_EI_FULL_SCALE);
      if (s >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "erythema", severity: s, confidence: confE, tone,
                   measured: { delta_ei: z.deltaEi, focal_ei: z.focalEi } });
      const sp = sev(-z.deltaEi, DELTA_EI_FULL_SCALE);
      if (sp >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "pallor", severity: sp, confidence: confP, tone,
                   measured: { delta_ei: z.deltaEi } });
    }

    const sm = sev(z.deltaMi, DELTA_MI_FULL_SCALE);
    if (sm >= EMIT_THRESHOLD)
      obs.push({ zone: key, condition: "hyperpigmentation", severity: sm, confidence: 0.75, tone,
                 measured: { delta_mi: z.deltaMi } });

    // Full scale is per anatomical family now: thin periorbital skin saturates
    // at a smaller delta than a glabella furrow does. See the direction note on
    // RHYTIDE_FULL_SCALE_BY_FAMILY — these are divisors, so smaller is more
    // sensitive, and the table is easy to read backwards.
    const rFull = z.rhytideFullScale ?? RHYTIDE_FULL_SCALE;
    const sr = z.ridgeDelta !== null ? sev(z.ridgeDelta, rFull) : 0;
    if (sr >= EMIT_THRESHOLD)
      obs.push({
        zone: key,
        condition: z.ridgeAxis === "vertical"
          ? "deep_rhytide_vertical" : "deep_rhytide_horizontal",
        /* A clamped normaliser means the pooled structureness ran past the
         * ceiling, and NOTHING HERE CAN TELL WHY: a high-ISO capture and a
         * genuinely textured face raise it identically. The reading is still
         * emitted — the clamp keeps it usable — but it is emitted knowing less
         * than usual, and the number that says so has to travel with it. */
        severity: sr,
        confidence: baseline.ridgeScaleClamped ? RHYTIDE_CLAMPED_CONFIDENCE : 0.5,
        tone,
        measured: {
          ridge: z.ridge, full_scale: rFull, blur_sigma: z.blurSigma,
          ridge_scale: baseline.ridgeScale,
          ridge_scale_clamped: !!baseline.ridgeScaleClamped,
        },
      });

    if (z.deltaContrast !== null) {
      /* Excess contrast that runs in ONE direction is more likely to be a line
       * the ridge measurement has already counted than a change in surface
       * quality, and counting it in both places would report one thing twice.
       * Attenuated in proportion to how directional it is, with a floor — a
       * ratio of four noisy numbers must not be able to delete a measurement
       * outright. */
      const iso = isotropyWeight(z.textureDirectionality);
      const sx = sev(z.deltaContrast, TEXTURE_CONTRAST_FULL_SCALE) * iso;
      if (sx >= EMIT_THRESHOLD)
        obs.push({ zone: key, condition: "xerosis", severity: sx, confidence: 0.4, tone,
                   measured: {
                     delta_contrast: z.deltaContrast,
                     directionality: z.textureDirectionality,
                     isotropy_weight: iso,
                   } });
    }
  }

  return { observations: obs, baseline };
}
