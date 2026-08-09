/*
 * Texture measurement — grey-level co-occurrence, with orientation kept.
 *
 * PURE. Takes a grey plane and a mask, returns numbers. No DOM, no labels, no
 * grades. Like calibrationEngine.js this is measurement configuration owned by
 * neither module.
 *
 * ── WHAT CHANGED FROM THE SINGLE glcmContrast() IN engine.js ───────────────
 * That one quantised to 8 levels, stepped one pixel, and AVERAGED its four
 * orientations into a single number. Averaging is where the information went:
 * a forehead line and a patch of dry skin can produce the same mean contrast,
 * and they are not the same object. One is anisotropic — high contrast across
 * the line, low along it — and the other is isotropic in every direction.
 *
 * So the four orientations are kept separate here, and the spread between them
 * is itself a measurement.
 */

// ────────────────────────────────────────────────────────────── parameters ──

/**
 * Grey levels.
 *
 * 8 levels is a 32-value bucket, which is coarser than the between-pixel
 * differences that carry fine surface texture: on ordinary skin most adjacent
 * pairs land in the SAME bucket and contribute a difference of exactly zero.
 * 16 halves the bucket to 16 values and recovers that range.
 *
 * Higher is not automatically better — the co-occurrence matrix grows as the
 * square, and past the sensor's own noise amplitude the extra levels measure
 * the noise rather than the skin. 16 is the point where the buckets are
 * comparable to the noise amplitude rather than well above it.
 */
export const GLCM_LEVELS = 16;

/**
 * Step, in pixels.
 *
 * d=1 asks how a pixel differs from the one beside it, which on a smooth
 * gradient is dominated by the sensor. d=2 steps past the immediate noise
 * correlation and reaches the scale that dry, flaking surface texture actually
 * varies on. It is also why the level count could go up without the result
 * turning into a noise meter — the two changes have to be made together.
 */
export const GLCM_DISPLACEMENT = 2;

/**
 * The four orientations, as [dy, dx] at unit displacement, in image
 * coordinates — y increases DOWNWARD, so [-1, 1] is up-and-right, i.e. 45
 * degrees. Getting that sign wrong swaps 45 and 135 and is invisible in any
 * test that uses only horizontal and vertical structure.
 */
export const GLCM_ORIENTATIONS = [
  { deg: 0, dy: 0, dx: 1 },
  { deg: 45, dy: -1, dx: 1 },
  { deg: 90, dy: -1, dx: 0 },
  { deg: 135, dy: -1, dx: -1 },
];

/** Fewer co-occurring pairs than this and the matrix is not an estimate. */
export const GLCM_MIN_PAIRS = 64;

// ───────────────────────────────────────────────────────────────── co-occur ─

/**
 * One normalised co-occurrence matrix, plus the Haralick features taken off it.
 *
 * ── CONTRAST IS NORMALISED BY (levels - 1)^2, AND THAT IS LOAD-BEARING ─────
 * Raw Haralick contrast is sum p(i,j)(i-j)^2, so it scales with the SQUARE of
 * the level count. Going from 8 levels to 16 multiplies it by roughly four
 * without anything about the skin changing. Any full-scale constant calibrated
 * against the old numbers would then saturate immediately — silently, and in
 * the direction that over-reports.
 *
 * Dividing by the largest possible squared difference puts contrast in [0, 1]
 * regardless of quantisation, so the level count can be changed again later
 * without invalidating the constant that consumes it. The constant still has to
 * be re-derived once, at the point of the change; it does not have to be
 * re-derived every time.
 */
export function cooccurrence(q, mask, w, h, dy, dx, levels) {
  const m = new Float64Array(levels * levels);
  let pairs = 0;

  const y0 = Math.max(0, -dy);
  const y1 = Math.min(h, h - dy);
  const x0 = Math.max(0, -dx);
  const x1 = Math.min(w, w - dx);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      const j = (y + dy) * w + (x + dx);
      if (!mask[i] || !mask[j]) continue;
      m[q[i] * levels + q[j]]++;
      m[q[j] * levels + q[i]]++;   // symmetric form
      pairs++;
    }
  }

  if (pairs < GLCM_MIN_PAIRS) return { contrast: NaN, energy: NaN, pairs };

  const total = pairs * 2;
  let contrast = 0, energy = 0;
  for (let a = 0; a < levels; a++) {
    for (let b = 0; b < levels; b++) {
      const p = m[a * levels + b] / total;
      if (p === 0) continue;
      const d = a - b;
      contrast += p * d * d;
      energy += p * p;
    }
  }

  return {
    contrast: contrast / ((levels - 1) * (levels - 1)),
    energy,
    pairs,
  };
}

/**
 * Oriented GLCM over one region.
 *
 * @returns {{
 *   byOrientation: {deg:number, contrast:number, energy:number}[],
 *   meanContrast: number, meanEnergy: number,
 *   directionality: number, axisDegrees: number|null,
 *   levels: number, displacement: number, orientations: number
 * }}
 *
 * `axisDegrees` is the orientation the surface structure RUNS ALONG, which is
 * the one with the LOWEST contrast — intensity varies least along a furrow and
 * most across it. Reporting the argmax instead would name the perpendicular and
 * be wrong by exactly 90 degrees, which reads as plausible in every direction.
 */
export function orientedGlcm(gray, mask, w, h, opts = {}) {
  const levels = opts.levels ?? GLCM_LEVELS;
  const d = opts.displacement ?? GLCM_DISPLACEMENT;

  const shift = Math.round(Math.log2(256 / levels));
  const q = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) q[i] = Math.min(levels - 1, gray[i] >> shift);

  const byOrientation = [];
  for (const o of GLCM_ORIENTATIONS) {
    const r = cooccurrence(q, mask, w, h, o.dy * d, o.dx * d, levels);
    byOrientation.push({ deg: o.deg, contrast: r.contrast, energy: r.energy, pairs: r.pairs });
  }

  const usable = byOrientation.filter((o) => Number.isFinite(o.contrast));
  if (!usable.length) {
    return {
      byOrientation, meanContrast: NaN, meanEnergy: NaN,
      directionality: NaN, axisDegrees: null,
      levels, displacement: d, orientations: 0,
    };
  }

  const contrasts = usable.map((o) => o.contrast);
  const hi = Math.max(...contrasts);
  const lo = Math.min(...contrasts);

  return {
    byOrientation,
    meanContrast: contrasts.reduce((a, b) => a + b, 0) / contrasts.length,
    meanEnergy: usable.reduce((a, o) => a + o.energy, 0) / usable.length,
    /** 0 when the surface varies the same in every direction, approaching 1
     *  when it varies in one direction only. */
    directionality: hi + lo > 0 ? (hi - lo) / (hi + lo) : 0,
    axisDegrees: usable.find((o) => o.contrast === lo).deg,
    levels, displacement: d, orientations: usable.length,
  };
}

// ──────────────────────────────────────────────── isotropy weighting ────────

/**
 * Floor on the isotropy weight.
 *
 * Dry, flaking surface texture is isotropic; a furrow is not. So excess
 * contrast that is strongly directional is more likely to be a line already
 * counted by the ridge measurement than a change in surface quality, and
 * counting it twice would report one thing as two.
 *
 * The weight is floored rather than allowed to reach zero because
 * directionality is a ratio of four noisy numbers, and a hard zero would let a
 * single bad orientation delete a real measurement outright. Attenuate, do not
 * erase — the same reasoning as the orientation taper in calibrationEngine.js.
 */
export const ISOTROPY_FLOOR = 0.4;

export function isotropyWeight(directionality) {
  if (!Number.isFinite(directionality)) return 1;
  const d = Math.min(Math.max(directionality, 0), 1);
  return ISOTROPY_FLOOR + (1 - ISOTROPY_FLOOR) * (1 - d);
}

// ───────────────────────────────────────────────────── robust statistics ────

/**
 * Trimmed centre of a sample.
 *
 * Specular highlights, stray hair and shadow edges all sit in the tails, and an
 * untrimmed mean tracks them instead of the skin.
 *
 * ── WHAT WIDENING OR NARROWING THE WINDOW ACTUALLY DOES ────────────────────
 * Very little, and it is worth writing down because the opposite is easy to
 * assume. This returns the MEDIAN of the trimmed core, and the median of a
 * symmetric trim is the median of the whole sample — trimming the top and
 * bottom deciles removes the same count from each side of the middle. Moving
 * the window from 10-90 to 20-80 therefore does not recover a localised patch
 * that a wider window was hiding, because neither window was hiding it: a patch
 * covering under half the region does not move the median either way.
 *
 * The statistic that DOES see such a patch is focalExcess() below. If the goal
 * is to keep a localised area of raised redness from being averaged away, that
 * is the function to read, not this window.
 */
export function robustCentre(vals, lo = 10, hi = 90) {
  if (!vals || !vals.length) return NaN;
  const s = Float64Array.from(vals).sort();
  const a = s[Math.floor((lo / 100) * (s.length - 1))];
  const b = s[Math.floor((hi / 100) * (s.length - 1))];
  const core = [];
  for (const v of s) if (v >= a && v <= b) core.push(v);
  const c = core.length ? core : Array.from(s);
  return c[Math.floor(c.length / 2)];
}

/** Window used for the colour readings. See the note in robustCentre(). */
export const ERYTHEMA_TRIM_LO = 20;
export const ERYTHEMA_TRIM_HI = 80;

/**
 * How far the region's high tail sits above its own centre.
 *
 * ── THIS IS THE ANSWER TO "A TRIMMED MEDIAN HIDES A LOCALISED PATCH" ───────
 * It is true that a region-wide median describes the region and not a patch
 * inside it. The fix is not a different trim — see above — it is a second
 * statistic that is sensitive to exactly what the median is insensitive to.
 *
 * A uniformly ruddy region has a high median and a small focal excess. A region
 * that is ordinary apart from one raised area has an ordinary median and a
 * LARGE focal excess. Those are different shapes and the two numbers together
 * separate them, where either alone cannot.
 *
 * Reported as a measurement only. Nothing downstream grades it yet, and it
 * should not be graded until there is labelled data to fit against — the same
 * position the severity constants are in.
 */
export function focalExcess(vals, hi = 90) {
  if (!vals || vals.length < 16) return NaN;
  const s = Float64Array.from(vals).sort();
  const mid = s[Math.floor(0.5 * (s.length - 1))];
  const top = s[Math.floor((hi / 100) * (s.length - 1))];
  return top - mid;
}
