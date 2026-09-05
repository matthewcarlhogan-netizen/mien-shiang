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
  orientedGlcm, isotropyWeight, robustCentreOf, focalExcessOf, scratchCopy,
  ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI,
} from "./utils/textureAnalyzer.js";

import { MEASUREMENT_METHOD } from "./measurement-method.js";

// ---------------------------------------------------------------- colour ----

// EI = 100*log10(R_red/R_green)   MI = 100*log10(1/R_red)
// Dawson 1980 -> Takiwaki 1998 -> Yamamoto 2008.
// SIGN CONVENTION: redness-INCREASING (red over green). The literature
// conflicts; flipping this silently inverts every result and makes the safety
// gate fire on pale skin instead of red.
const EPS = 1e-4;

/* ── THE 8-BIT TRANSFER FUNCTION IS A TABLE, NOT AN APPROXIMATION ───────────
 * srgbToLinear() is called SIX times per masked pixel — twice by
 * erythemaIndex(), once by melaninIndex(), three times by rgbToLab() — and its
 * argument is an 8-bit channel, so its whole domain is 256 values. The pow()
 * inside it was the single most expensive operation in the colour path.
 *
 * This is a lookup of a value already computed by the same expression, at the
 * same precision, so every integer input returns a bit-identical double. It is
 * NOT a piecewise fit or an interpolation, and it must never become one: the
 * ITA banding downstream is what decides whether erythema is reported at all,
 * and an approximation there would move a subject between tone strata.
 *
 * Non-integer and out-of-range inputs fall through to the arithmetic, so the
 * declared domain of the function is unchanged. NaN fails both comparisons and
 * takes that path, where it stays NaN. */
const SRGB_LINEAR_LUT = new Float64Array(256);
for (let v = 0; v < 256; v++) {
  const x = v / 255;
  SRGB_LINEAR_LUT[v] = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function srgbToLinear(v) {
  if (v >= 0 && v <= 255 && (v | 0) === v) return SRGB_LINEAR_LUT[v];
  const x = Math.min(Math.max(v / 255, 0), 1);
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** Shades-of-Gray colour constancy, Minkowski L6 (Finlayson & Trezzi 2004).
 *  MUST be applied to the whole frame, once — never per region. Normalising
 *  each region separately drives them all toward grey and erases exactly the
 *  between-region differences this whole method measures. */
/**
 * @param {Uint8ClampedArray|Uint8Array|Array} data RGBA buffer, whole frame
 * @param {number} p Minkowski order
 * @param {Uint8Array|null} sampleMask ONE ENTRY PER PIXEL (not per RGBA
 *   component — length data.length/4), restricting which pixels feed the
 *   illuminant ESTIMATE. Never restricts which pixels the resulting gain is
 *   APPLIED to: the second pass below is unconditional over every pixel,
 *   background included, exactly as it always was. That is the whole
 *   distinction CLAUDE.md item 1 exists to enforce — "applied ONCE, to the
 *   WHOLE FRAME" describes the APPLICATION, and restricting the SAMPLE that
 *   feeds a single frame-wide estimate is not the same operation as
 *   estimating and applying separately per region. Do not let sampleMask
 *   grow a second call site that also gates the application loop — that
 *   would be item 1's bug again, just reached through a mask instead of a
 *   per-zone call.
 */
export function shadesOfGray(data, p = 6, sampleMask = null) {
  return balanceFrame(data, p, sampleMask).data;
}

/** The same arithmetic with its EFFECTIVE method, including fallback. */
export function balanceFrame(data, p = 6, sampleMask = null) {
  const len = data.length;

  /* Both loops below are table-driven on the WHOLE FRAME — three pow() and
   * three divides per pixel, at 768x1024, was over half the measurement cost of
   * the app. A byte channel has 256 possible values, so both tables hold the
   * result of the identical expression at the identical precision and every
   * integer input reads back a bit-identical double. The `byteInput` test is
   * what keeps that guarantee honest: a caller passing floats (a test, or a
   * future higher-bit-depth buffer) still gets the arithmetic. */
  const byteInput = data instanceof Uint8ClampedArray || data instanceof Uint8Array;

  /* Accumulation only — never touches `out`. Kept as one function so the
   * masked and unmasked passes cannot drift into two copies of the same
   * pow-table arithmetic (item 47's lesson). Called with useMask=false this
   * is line-for-line the loop this function has always run, so the
   * no-sampleMask caller's result is unaffected — confirmed by engine-bench's
   * fingerprint, which is an EMPTY diff for every existing (unmasked) call
   * site. */
  const accumulate = (useMask) => {
    let sr = 0, sg = 0, sb = 0, n = 0;
    if (byteInput) {
      const pw = new Float64Array(256);
      for (let v = 0; v < 256; v++) pw[v] = Math.pow(v, p);
      for (let i = 0; i < len; i += 4) {
        if (data[i + 3] < 8) continue;
        if (useMask && !sampleMask[i >> 2]) continue;
        sr += pw[data[i]];
        sg += pw[data[i + 1]];
        sb += pw[data[i + 2]];
        n++;
      }
    } else {
      for (let i = 0; i < len; i += 4) {
        if (data[i + 3] < 8) continue;
        if (useMask && !sampleMask[i >> 2]) continue;
        sr += Math.pow(data[i], p);
        sg += Math.pow(data[i + 1], p);
        sb += Math.pow(data[i + 2], p);
        n++;
      }
    }
    return { sr, sg, sb, n };
  };

  let { sr, sg, sb, n } = accumulate(Boolean(sampleMask));
  let masked = Boolean(sampleMask);
  // A sample too small to trust falls back to the whole frame — the ORIGINAL
  // always-available estimate — rather than a gain fit to a handful of
  // pixels, or a refusal. This is the only fallback path; there is no
  // per-region retry, which is exactly what item 1 forbids.
  if (sampleMask && n < 16) {
    ({ sr, sg, sb, n } = accumulate(false));
    masked = false;
  }
  if (n < 16) return { data, methodVersion: null };
  const methodVersion = p === 6
    ? (masked ? MEASUREMENT_METHOD.roiUnion : MEASUREMENT_METHOD.wholeFrame)
    : null;

  let ir = Math.pow(sr / n, 1 / p);
  let ig = Math.pow(sg / n, 1 / p);
  let ib = Math.pow(sb / n, 1 / p);
  const norm = Math.sqrt(ir * ir + ig * ig + ib * ib) / Math.sqrt(3);
  ir = Math.max(ir / norm, 1e-6);
  ig = Math.max(ig / norm, 1e-6);
  ib = Math.max(ib / norm, 1e-6);

  const out = new Uint8ClampedArray(len);
  if (byteInput) {
    // Uint8ClampedArray assignment rounds, and it rounds the same double to the
    // same byte whether that double arrived from a divide or from a table.
    const gr = new Float64Array(256), gg = new Float64Array(256), gb = new Float64Array(256);
    for (let v = 0; v < 256; v++) {
      gr[v] = Math.min(255, v / ir);
      gg[v] = Math.min(255, v / ig);
      gb[v] = Math.min(255, v / ib);
    }
    for (let i = 0; i < len; i += 4) {
      out[i] = gr[data[i]];
      out[i + 1] = gg[data[i + 1]];
      out[i + 2] = gb[data[i + 2]];
      out[i + 3] = data[i + 3];
    }
  } else {
    for (let i = 0; i < len; i += 4) {
      out[i] = Math.min(255, data[i] / ir);
      out[i + 1] = Math.min(255, data[i + 1] / ig);
      out[i + 2] = Math.min(255, data[i + 2] / ib);
      out[i + 3] = data[i + 3];
    }
  }
  return { data: out, methodVersion };
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
  // The same statistic as robustCentre() at the wider default window, so it is
  // the same code. Copies first: this is a public entry point and must not
  // reorder the caller's sample, which robustCentreOf() does.
  return robustCentreOf(scratchCopy(vals), lo, hi);
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

/**
 * Separable Gaussian, edge-clamped.
 *
 * ── THIS IS THE SAME ARITHMETIC IN THE SAME ORDER, AND THAT IS THE POINT ────
 * Three things changed and none of them may change a value. Each output pixel
 * still accumulates its taps from i = -r to +r, in that order, into a double
 * initialised to zero — floating-point addition is not associative, so tap
 * order is part of the result, not an implementation detail.
 *
 *  1. The clamp is hoisted out of the interior. `Math.min(w-1, Math.max(0, …))`
 *     ran on every tap of every pixel to serve the r columns at each edge. The
 *     interior span computes the same sum without it.
 *  2. The vertical pass walks rows instead of columns. Reading `tmp[yy*w + x]`
 *     strides by a row per tap, which misses cache on every access; accumulating
 *     one output row across taps reads linearly. Per output pixel the taps are
 *     still summed low-to-high, so the sum is unchanged.
 *  3. `tmp` and `dst` are supplied by the caller. ridgeField() calls this four
 *     times per zone and was allocating two zone-sized Float64Arrays each time.
 *
 * `dst` MUST NOT alias `src` — the vertical pass accumulates in place.
 *
 * EXPORTED for the differential test only. It is the hot path of the most
 * expensive operation in the app and it now has three code paths per axis where
 * it had one, so it is checked against a naive reference rather than through
 * the ridge response, where an edge-column error would be a rounding-sized
 * change in one number and invisible.
 */
export function gaussianBlur(src, w, h, sigma, tmp, dst) {
  const r = Math.max(1, Math.ceil(sigma * 2));
  const k = new Float64Array(2 * r + 1);
  let ks = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v; ks += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= ks;

  // ── horizontal ──
  const xLo = Math.min(r, w);              // [0, xLo)   clamped left edge
  const xHi = Math.max(xLo, w - r);        // [xHi, w)   clamped right edge
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < xLo; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : (x + i > w - 1 ? w - 1 : x + i);
        a += src[row + xx] * k[i + r];
      }
      tmp[row + x] = a;
    }
    for (let x = xLo; x < xHi; x++) {
      let a = 0;
      const c = row + x;
      for (let i = -r; i <= r; i++) a += src[c + i] * k[i + r];
      tmp[c] = a;
    }
    for (let x = xHi; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : (x + i > w - 1 ? w - 1 : x + i);
        a += src[row + xx] * k[i + r];
      }
      tmp[row + x] = a;
    }
  }

  // ── vertical ──
  const yLo = Math.min(r, h);
  const yHi = Math.max(yLo, h - r);
  for (let y = 0; y < yLo; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : (y + i > h - 1 ? h - 1 : y + i);
        a += tmp[yy * w + x] * k[i + r];
      }
      dst[row + x] = a;
    }
  }
  for (let y = yLo; y < yHi; y++) {
    const row = y * w;
    dst.fill(0, row, row + w);
    for (let i = -r; i <= r; i++) {
      const ki = k[i + r], b = row + i * w;
      for (let x = 0; x < w; x++) dst[row + x] += tmp[b + x] * ki;
    }
  }
  for (let y = yHi; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : (y + i > h - 1 ? h - 1 : y + i);
        a += tmp[yy * w + x] * k[i + r];
      }
      dst[row + x] = a;
    }
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

  /* Three buffers, not nine. gaussianBlur() is called four times here and used
   * to allocate its own scratch and output each time; `f` is dead once `base`
   * exists, so it becomes the per-scale output. */
  // `new Float64Array(typedArray)` converts in one pass; Float64Array.from()
  // goes through the iterator protocol and is roughly 2.5x slower on the same
  // input. Same values either way — gray is 8-bit and every byte is exact.
  const f = new Float64Array(gray);
  const scratch = new Float64Array(gray.length);
  const base = gaussianBlur(f, w, h, blurSigma, scratch, new Float64Array(gray.length));

  const st = new Float64Array(gray.length);   // structureness, orientation-UNgated
  const rb = new Float64Array(gray.length);   // blobness
  /* The ORIENTATION, not a weight resolved against one target axis.
   *
   * st and rb do not depend on the target axis, and neither does this angle —
   * only the weight derived from it does. Storing the angle is what lets ONE
   * field serve both the zone's own axis and the vertical axis the baseline is
   * always taken on: rawScalars() previously built a second, identical Hessian
   * pyramid for each baseline zone purely to obtain a different `wt`, which is
   * the most expensive operation in the app run twice for a value that is a
   * cosine away. The weight is applied in ridgeMean() instead. */
  const ang = new Float64Array(gray.length);
  let positives = 0;

  for (const sigma of [1.5, 2.5, 3.5]) {
    const s = gaussianBlur(base, w, h, sigma, scratch, f);
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
        ang[i] = hessianOrientation(Ixx, Iyy, Ixy);
      }
    }
  }

  return { st, rb, ang, mask, positives, blurSigma, vertical, n: w * h };
}

/**
 * Mean vesselness over a prepared field, at a given normaliser. Cheap.
 *
 * @param {object} field   from ridgeField()
 * @param {number} [scale] structureness normaliser
 * @param {number} [target] ridge axis in radians. Defaults to the axis the
 *   field was built for, so an existing two-argument call is unchanged. Passing
 *   it explicitly is how one field serves a second axis without a second
 *   Hessian pass — see the note on `ang` in ridgeField().
 */
export function ridgeMean(field, scale = RIDGE_STRUCTURE_SCALE, target) {
  const { st, rb, ang, mask } = field;
  const axis = target ?? targetAxisRadians(field.vertical);
  const denom = 2 * scale * scale;
  const len = st.length;
  let sum = 0, n = 0;
  for (let i = 0; i < len; i++) {
    if (!mask[i]) continue;
    const s = st[i];
    if (s > 0) {
      const b = rb[i];
      sum += orientationWeight(ang[i], axis) *
        Math.exp(-(b * b) / 0.5) *
        (1 - Math.exp(-(s * s) / denom));
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
  const px = w * h;
  const gray = new Uint8Array(px);

  /* Count first, then fill exactly-sized typed arrays. The four samples were
   * JS arrays grown by push(), which reallocates as a region's worth of pixels
   * arrives and then has to be copied element-by-element into a Float64Array
   * by every statistic taken off it. */
  let n = 0;
  for (let i = 0; i < px; i++) if (mask[i]) n++;
  // Counting first also means the refusal happens before any of the work, not
  // after all of it. Same refusal, same null.
  if (n < 256) return null;

  const ei = new Float64Array(n), mi = new Float64Array(n);
  const Ls = new Float64Array(n), bs = new Float64Array(n);

  let j = 0;
  for (let i = 0; i < px; i++) {
    const p = i * 4;
    const R8 = rgba[p], G8 = rgba[p + 1], B8 = rgba[p + 2];
    gray[i] = (0.299 * R8 + 0.587 * G8 + 0.114 * B8) | 0;
    if (!mask[i]) continue;

    /* Linearise each channel ONCE. erythemaIndex(), melaninIndex() and
     * rgbToLab() between them called srgbToLinear() six times per pixel for
     * three distinct values. The expressions below are those functions inlined
     * verbatim — same operands, same order — not re-derived. */
    const R = srgbToLinear(R8), G = srgbToLinear(G8), B = srgbToLinear(B8);

    ei[j] = 100 * Math.log10((R + EPS) / (G + EPS));
    mi[j] = 100 * Math.log10(1 / (R + EPS));

    /* Only L* and b* are ever read, and a* needs the X channel, so X is not
     * computed. The Y and Z expressions are rgbToLab()'s, unchanged — including
     * its divide by 1.0, which is exact. */
    const y0 = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
    const z0 = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const fy = y0 > 0.008856 ? Math.cbrt(y0) : 7.787 * y0 + 16 / 116;
    const fz = z0 > 0.008856 ? Math.cbrt(z0) : 7.787 * z0 + 16 / 116;
    Ls[j] = 116 * fy - 16;
    bs[j] = 200 * (fy - fz);
    j++;
  }

  const texture = orientedGlcm(gray, mask, w, h);

  /* The four samples are local to this function and nothing reads them again,
   * so they are handed to the selectors AS the scratch space rather than being
   * copied first. Both erythema statistics run over the same array on purpose:
   * the second inherits the partial ordering the first left behind. */
  const eiCentre = robustCentreOf(ei, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);

  return {
    // The colour centre uses the 20-80 window. Note what that does and does
    // not buy: the median of a symmetric trim is the median, so this does not
    // recover a localised patch — `focalEi` below is the statistic that sees
    // one. See robustCentre() in textureAnalyzer.js.
    ei: eiCentre,
    /** How far the reddest fifth of the region sits above its own middle. A
     *  uniformly ruddy region and a region with one raised patch have similar
     *  medians and very different values here. Measured, not yet graded. */
    focalEi: focalExcessOf(ei),
    mi: robustCentreOf(mi),
    L: robustCentreOf(Ls),
    b: robustCentreOf(bs),
    contrast: texture.meanContrast,
    texture,
    gray, n,
  };
}

/**
 * How far a zone's own scalar would move if its ROI boundary had landed a
 * few pixels differently — the confidence signal for landmark jitter that
 * item 33/18's `basis` pattern already uses for other kinds of partial
 * measurement, applied here instead of touching what regionStats() returns.
 *
 * Deliberately NOT built by feeding a continuously-weighted mask into
 * regionStats(): every scalar it produces (ei, mi, L, b, focalEi) is a
 * TRIMMED-MEDIAN or percentile statistic taken by selectKth's unweighted
 * three-way partition (textureAnalyzer.js, item 46). There is no weighted
 * order-statistic anywhere in this codebase, and inventing one — a sort-and
 * -accumulate-weight algorithm, not the current O(n) selection — to answer a
 * confidence question would double the numerically delicate surface area
 * items 30/46 exist to keep small, with none of their existing NaN-partition
 * or tie-band tests protecting it. So this compares the SAME unweighted
 * statistics computed over two masks (the full one and one eroded by
 * BOUNDARY_EROSION_PX) instead: same selection code, same guarantees, zero
 * change to any existing scalar.
 *
 * BOTH the trimmed centre AND the focal excess are compared, not the centre
 * alone, and that is not redundancy — it was the first version's bug. A
 * boundary-jitter ring is, almost by construction, a MINORITY of a real
 * zone's pixels, and item 30 already proves the point that matters here: "the
 * median of a symmetric trim is the median" — robustCentreOf() picks the
 * value at a middle RANK, so any contamination under 50% of the sample cannot
 * move it, however extreme that contamination is. A synthetic test with a 34%
 * boundary ring at full saturation moved the centre by exactly zero before
 * this comment was corrected. focalExcessOf() is the statistic item 30 built
 * for precisely this shape of contamination — a raised MINORITY tail — so it
 * is what actually catches a boundary ring in the realistic case. The centre
 * comparison is kept as a backstop for thin, near-MIN_ROI_PX zones where a
 * jitter genuinely can flip a majority of the pixels.
 *
 * Only the erythema-index sample is used, not the full regionStats() — ei is
 * the cheapest of the four order statistics (two channels, no GLCM) and the
 * one the safety gate is most sensitive to (item 2), so it is the one worth
 * spending the extra pass on for every zone rather than the whole
 * regionStats() output. Centre and focal excess are taken off the SAME
 * sample, in that order, for the reason regionStats() does the same: the
 * second selection inherits the first's partial ordering.
 */
// UNCALIBRATED starting points in EI units (100*log10(linear R/linear G)),
// not CIE Delta E, error bounds or probabilities. See the low-end/device
// protocol in docs/PR52_RELEASE_GATES.md before proposing any tuning.
export const BOUNDARY_SENSITIVITY_EI_THRESHOLD = 1.5;
export const BOUNDARY_SENSITIVITY_FOCAL_THRESHOLD = 1.5;

function erythemaSampleOver(rgba, mask, w, h) {
  const px = w * h;
  let n = 0;
  for (let i = 0; i < px; i++) if (mask[i]) n++;
  if (n < 32) return null; // too few surviving pixels for a meaningful statistic

  const ei = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < px; i++) {
    if (!mask[i]) continue;
    const p = i * 4;
    const R = srgbToLinear(rgba[p]), G = srgbToLinear(rgba[p + 1]);
    ei[j++] = 100 * Math.log10((R + EPS) / (G + EPS));
  }
  return ei;
}

/**
 * @param {Uint8ClampedArray} rgba region-local RGBA, as regionStats() takes
 * @param {Uint8Array} fullMask the region's ordinary hull mask
 * @param {Uint8Array} erodedMask `erodeMask(fullMask, w, h)` from roi.js
 * @returns {{sensitive:boolean, deltaEi:number|null, deltaFocalEi:number|null, reason?:string}}
 */
export function boundarySensitivity(rgba, fullMask, erodedMask, w, h) {
  const fullEi = erythemaSampleOver(rgba, fullMask, w, h);
  const erodedEi = erythemaSampleOver(rgba, erodedMask, w, h);

  // A mask too small to evaluate is not evidence of stability — the erosion
  // ran out of interior before it ran out of jitter margin, which is itself
  // the failure mode this flag exists to surface. Fails toward "sensitive".
  if (!fullEi || !erodedEi) {
    return {
      sensitive: true, deltaEi: null, deltaFocalEi: null,
      reason: !erodedEi ? "eroded_too_small" : "full_too_small",
    };
  }

  const fullCentre = robustCentreOf(fullEi, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);
  const fullFocal = focalExcessOf(fullEi);
  const erodedCentre = robustCentreOf(erodedEi, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);
  const erodedFocal = focalExcessOf(erodedEi);

  const deltaEi = Math.abs(fullCentre - erodedCentre);
  // focalExcessOf() needs 16+ samples; below that it returns NaN, which must
  // not read as "no excess" — an eroded sample that shrank below the floor is
  // exactly the case this flag exists to catch, not a reason to stay quiet.
  const deltaFocalEi = Number.isNaN(fullFocal) || Number.isNaN(erodedFocal)
    ? null : Math.abs(fullFocal - erodedFocal);

  const sensitive = deltaEi > BOUNDARY_SENSITIVITY_EI_THRESHOLD
    || deltaFocalEi === null
    || deltaFocalEi > BOUNDARY_SENSITIVITY_FOCAL_THRESHOLD;

  return { sensitive, deltaEi, deltaFocalEi };
}

/**
 * A high-frequency-energy ceiling, in units of the four-neighbour
 * Laplacian variance laplacianResponses() returns.
 *
 * UNCALIBRATED against a real device, in the same sense every constant in
 * this file that predates labelled data is uncalibrated — there is no corpus
 * of real high-ISO phone photos here to fit against. Its initial synthetic
 * rationale uses the same style of experiment item 4 used to derive
 * NOISE_FLOOR_STRUCTURENESS — measuring this exact statistic on a flat 8-bit
 * patch at increasing Gaussian noise sigma:
 *
 *   sigma (levels)   1     2     3     4      5      6      8     10    15
 *   variance         8.3   28.8  61.8  109.1  168.8  243.4  430.6 673.3 1509.2
 *
 * 200 lies between the sigma-5 and sigma-6 synthetic values. That separation
 * does NOT establish a phone's noise distribution or ISO: texture, sharpening
 * and denoising confound it. No physical-device calibration is claimed. Keep
 * this advisory; see docs/PR52_RELEASE_GATES.md for the low-end tuning protocol.
 */
export const SENSOR_NOISE_VARIANCE_CEILING = 200;

/**
 * Four-neighbour discrete Laplacian, restricted to fully-interior masked
 * pixels — a pixel whose neighbour crosses the mask boundary is skipped
 * rather than treated as a 0-valued neighbour, so the boundary itself (which
 * is a real edge, not noise) cannot inflate the estimate.
 *
 * Same statistic as qise/framestats.js's spatialLaplacianVariance(), used
 * there in the opposite direction (LOW variance flags a blurred/filtered
 * frame; HIGH variance here flags a noisy one). Reimplemented against this
 * tree's (gray, mask, w, h) typed-array shape rather than qise's per-pixel
 * object list — the two module trees do not import from each other (see
 * CLAUDE.md's Qi Se tracker separation) and the data representations are not
 * interchangeable without a full copy. If the formula changes, change it in
 * both places.
 */
function laplacianResponses(gray, mask, w, h) {
  const responses = [];
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      if (!mask[i] || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w]) continue;
      responses.push(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]);
    }
  }
  return responses;
}

/**
 * Whole-capture sensor-noise confidence, pooled from the SAME peripheral
 * baseline zones item 6 already uses for the colour baseline.
 *
 * Pooled across zones, never taken per-zone — the identical reasoning item
 * 4/27 already established for structureness: a single small zone's
 * high-frequency energy is dominated by whatever texture that one patch
 * happens to have (a stray hair, a pore cluster), and pooling is what turns
 * "is the WHOLE capture unusually noisy" into a question with a stable
 * answer instead of one zone's luck.
 *
 * A CONFIDENCE FLAG, never a hard rejection — unlike the low-ITA erythema
 * regime, this never suppresses an observation, only degrades trust in it.
 * There is no labelled data here to say where a hard cutoff belongs, and a
 * continuum degraded into a boolean pass/fail would assert a precision this
 * measurement does not have. UI-surfaceable, not UI-blocking.
 */
export function sensorNoiseConfidence(regions, baselineZones = BASELINE_ZONES) {
  const pooled = [];
  let zonesRead = 0;
  for (const key of baselineZones) {
    const r = regions[key];
    if (!r || !r.stats || !r.stats.gray) continue;
    zonesRead++;
    for (const v of laplacianResponses(r.stats.gray, r.mask, r.w, r.h)) pooled.push(v);
  }
  // Same floor as regionStats()'s own refusal (item: "too few pixels for the
  // colorimetry to mean anything") — below it a variance estimate is noise
  // about noise, not a measurement.
  if (pooled.length < 256) {
    return { confidence: "unknown", noiseVariance: null, reason: "not_enough_baseline_pixels", zonesRead };
  }

  const mean = pooled.reduce((s, v) => s + v, 0) / pooled.length;
  const variance = pooled.reduce((s, v) => s + (v - mean) ** 2, 0) / pooled.length;
  const degraded = variance > SENSOR_NOISE_VARIANCE_CEILING;

  return {
    confidence: degraded ? "degraded" : "full",
    noiseVariance: variance,
    reason: degraded ? "high_frequency_energy_exceeds_flat_skin_ceiling" : "",
    zonesRead,
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
  const methodVersion = Object.values(MEASUREMENT_METHOD).includes(opts.methodVersion)
    ? opts.methodVersion : null;

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
    /* The baseline ridge is taken on the VERTICAL axis regardless of the zone's
     * own axis, which is the reference the deltas below are against. Reducing
     * the zone's field at the zone's OWN axis here would silently change what
     * ridgeDelta means for every zone at once — so the axis is passed
     * explicitly rather than defaulted.
     *
     * The FIELD is shared, and only the field. Phase A already built one for
     * this zone at this same blur sigma, and st/rb/ang carry no axis, so the
     * second pyramid this used to build was recomputing identical numbers to
     * apply a different cosine to them. */
    const held = fields[key];
    const blur = held?.blur ?? calculateBlurSigma(r.stats.n, referenceArea);
    baseBlur.push(blur.sigma);
    const bf = held?.field ?? ridgeField(r.stats.gray, r.mask, r.w, r.h,
                                         { vertical: true, blurSigma: blur.sigma });
    const rr = ridgeMean(bf, ridgeScale, targetAxisRadians(true));
    if (isFinite(rr)) baseR.push(rr);
    basePx += r.stats.n;
  }

  if (!baseEi.length) {
    return {
      zones: {},
      baseline: {
        methodVersion,
        regime: "low", n: 0,
        reason: "Not enough clear skin visible to set a baseline.",
      },
    };
  }

  const med = (a) => (a.length ? Float64Array.from(a).sort()[a.length >> 1] : NaN);
  const ita = itaDegrees(med(baseL), med(baseB));
  const { regime, reason } = erythemaConfidence(ita);
  const baselineBlur = med(baseBlur);
  const noise = sensorNoiseConfidence(regions, BASELINE_ZONES);
  const baseline = {
    methodVersion,
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
    /** Confidence, not a gate — see sensorNoiseConfidence(). Surfaced so the
     *  UI can flag "this light was hard on the camera" without this module
     *  deciding to withhold anything on its own. */
    sensorNoiseVariance: noise.noiseVariance,
    sensorNoiseConfidence: noise.confidence,
    sensorNoiseReason: noise.reason,
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
