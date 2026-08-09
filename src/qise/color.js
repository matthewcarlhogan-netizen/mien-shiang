/*
 * PHASE 1 — Colour space maths. Pure, DOM-free, no imports.
 *
 * Everything downstream of the camera is a difference between two Lab values,
 * so an error in here is invisible everywhere and wrong everywhere. The
 * fixtures in tests/qise/color.test.js are computed independently and matched
 * to 1e-3; the CIEDE2000 implementation is checked against the published
 * Sharma-Wu-Dalal set rather than against expectations derived from this file.
 */

/* ─────────────────────────────────────────────────── transfer function ──── */

/** sRGB 8-bit -> linear light, in [0,1]. */
export function srgbToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear light -> sRGB 8-bit. Inverse of srgbToLinear to within rounding. */
export function linearToSrgb(cLin) {
  const c = cLin <= 0.0031308
    ? cLin * 12.92
    : 1.055 * Math.pow(cLin, 1 / 2.4) - 0.055;
  return c * 255;
}

/* ──────────────────────────────────────────────────────── sRGB -> XYZ ──── */

/** Rows of the sRGB D65 primaries matrix, scaled x100. */
export const SRGB_TO_XYZ = Object.freeze([
  Object.freeze([0.4124564, 0.3575761, 0.1804375]),
  Object.freeze([0.2126729, 0.7151522, 0.0721750]),
  Object.freeze([0.0193339, 0.1191920, 0.9503041]),
]);

/** D65 white point, the reference for the Lab conversion. */
export const D65 = Object.freeze({ Xn: 95.047, Yn: 100.0, Zn: 108.883 });

export function linearRgbToXyz(r, g, b) {
  const [m0, m1, m2] = SRGB_TO_XYZ;
  return {
    X: 100 * (m0[0] * r + m0[1] * g + m0[2] * b),
    Y: 100 * (m1[0] * r + m1[1] * g + m1[2] * b),
    Z: 100 * (m2[0] * r + m2[1] * g + m2[2] * b),
  };
}

/* ───────────────────────────────────────────────────────── XYZ -> Lab ──── */

const DELTA = 6 / 29;
const DELTA_CUBED = DELTA * DELTA * DELTA;

function labF(t) {
  return t > DELTA_CUBED ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29;
}

export function xyzToLab(X, Y, Z) {
  const fx = labF(X / D65.Xn);
  const fy = labF(Y / D65.Yn);
  const fz = labF(Z / D65.Zn);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** sRGB 8-bit straight through to Lab. The path every pixel takes. */
export function labFromSrgb8(r, g, b) {
  const { X, Y, Z } = linearRgbToXyz(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  return xyzToLab(X, Y, Z);
}

/* ───────────────────────────────────────────── polar Lab and skin tone ──── */

export const chroma = (a, b) => Math.hypot(a, b);

/** Hue angle in degrees, 0..360. */
export function hueDeg(a, b) {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/**
 * Individual Typology Angle.
 *
 * atan2, never atan with a clamped b* — the same constraint as CLAUDE.md
 * item 3. Clamping b* positive breaks quadrant resolution and mis-bins
 * cool-toned skin toward the lighter strata, which desensitises exactly the
 * checks that are meant to be most conservative on deeper tones.
 */
export function ita(L, b) {
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}

/**
 * A luminance-only melanin proxy, for INTERNAL stratification only.
 *
 * Never rendered, never compared between people — see the no-absolutes
 * compliance test. It exists so the ROI rejection rate can be reported per
 * tone band during device testing, which is the only way a fairness defect in
 * the landmarker becomes visible instead of averaging away.
 */
export function melaninIndexProxy(L) {
  return 100 * Math.log10(100 / Math.max(L, 1e-6));
}

/* ────────────────────────────────────────────────────── colour distance ──── */

/**
 * Euclidean CIE76.
 *
 * Retained for the regression fixtures and the von Kries recovery test only,
 * where the point is to compare against a published number in the same units.
 * ΔE00 is the primary metric everywhere in the app.
 */
export function deltaE76(lab1, lab2) {
  return Math.hypot(lab1.L - lab2.L, lab1.a - lab2.a, lab1.b - lab2.b);
}

const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

/**
 * CIEDE2000. Validated against the 34 published Sharma-Wu-Dalal pairs.
 *
 * The three places implementations go wrong, all exercised by that set:
 *   - hue difference must wrap at +/-180, not merely subtract;
 *   - the MEAN hue is not the arithmetic mean when the two hues straddle 0/360,
 *     and the correction differs depending on whether their sum is under 360;
 *   - when either chroma is zero the hue is undefined, and the mean hue must
 *     fall back to the sum rather than averaging in a meaningless angle.
 */
export function deltaE2000(lab1, lab2, weights = {}) {
  const kL = weights.kL ?? 1, kC = weights.kC ?? 1, kH = weights.kH ?? 1;

  const C1 = chroma(lab1.a, lab1.b);
  const C2 = chroma(lab2.a, lab2.b);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * lab1.a;
  const a2p = (1 + G) * lab2.a;
  const C1p = Math.hypot(a1p, lab1.b);
  const C2p = Math.hypot(a2p, lab2.b);

  // Hue is undefined at zero chroma; the standard sets it to 0 there.
  const h1p = (a1p === 0 && lab1.b === 0) ? 0 : ((deg(Math.atan2(lab1.b, a1p)) + 360) % 360);
  const h2p = (a2p === 0 && lab2.b === 0) ? 0 : ((deg(Math.atan2(lab2.b, a2p)) + 360) % 360);

  const dLp = lab2.L - lab1.L;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (lab1.L + lab2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T = 1
    - 0.17 * Math.cos(rad(hbarp - 30))
    + 0.24 * Math.cos(rad(2 * hbarp))
    + 0.32 * Math.cos(rad(3 * hbarp + 6))
    - 0.20 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  const Lbarp50 = Math.pow(Lbarp - 50, 2);
  const SL = 1 + (0.015 * Lbarp50) / Math.sqrt(20 + Lbarp50);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const tL = dLp / (kL * SL);
  const tC = dCp / (kC * SC);
  const tH = dHp / (kH * SH);

  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH);
}

/**
 * The ΔE00 chroma weighting term, exposed on its own.
 *
 * Used to scale `run` so a high-chroma and a low-chroma user get comparable
 * sensitivity from the same underlying shift. See the comment above `run` in
 * metrics.js for why the coordinate deltas are NOT replaced by ΔE00 outright.
 */
export function sCWeight(Cbar) {
  return 1 + 0.045 * Cbar;
}

/* ────────────────────────────────────────────── chromatic adaptation ──── */

/**
 * Von Kries gains that would carry the measured sclera onto neutral.
 *
 * @param {{r:number,g:number,b:number}} sclLinRGB mean LINEAR sclera RGB
 */
export function vonKriesGains(sclLinRGB) {
  const { r, g, b } = sclLinRGB;
  const mean = (r + g + b) / 3;
  return {
    r: mean / Math.max(r, 1e-9),
    g: mean / Math.max(g, 1e-9),
    b: mean / Math.max(b, 1e-9),
  };
}

export function applyGains(linRGB, gains) {
  return {
    r: linRGB.r * gains.r,
    g: linRGB.g * gains.g,
    b: linRGB.b * gains.b,
  };
}

/** Convenience: linear RGB straight to Lab, for the corrected pipeline. */
export function labFromLinear(linRGB) {
  const { X, Y, Z } = linearRgbToXyz(linRGB.r, linRGB.g, linRGB.b);
  return xyzToLab(X, Y, Z);
}
