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
  return robustCentreOf(scratchCopy(vals), lo, hi);
}

// ───────────────────────────────────────── selection over a scratch sample ──

/**
 * A REORDERABLE copy of a sample.
 *
 * `slice()` on a typed array is a memcpy; `Float64Array.from` goes through the
 * iterator protocol and is about 2.5x slower on the same input.
 */
export function scratchCopy(vals) {
  return vals instanceof Float64Array ? vals.slice() : Float64Array.from(vals);
}

/**
 * Move every NaN to the end, in place. Returns the count of non-NaN elements.
 *
 * %TypedArray%.sort places NaN last, and every statistic here is defined
 * against that ordering — they read percentile INDICES, so where the NaNs sit
 * decides which value an index names. Selection compares with `<`, which is
 * false for NaN in both directions, so the NaNs must be put where sort would
 * have put them before any selecting happens.
 */
export function partitionNaN(a) {
  let end = a.length;
  for (let i = 0; i < end;) {
    if (Number.isNaN(a[i])) { end--; a[i] = a[end]; a[end] = NaN; }
    else i++;
  }
  return end;
}

/**
 * The k-th smallest of `a[0..n)`, by partitioning in place. Same value a full
 * sort would put at index k; `a` is left partially ordered around it.
 *
 * ── WHY SELECTION RATHER THAN A SORT ───────────────────────────────────────
 * Every statistic taken off a colour sample here is an ORDER STATISTIC — a
 * trimmed centre reads three percentile indices, a focal excess reads two.
 * Sorting computes the whole ordering to answer for a handful of positions, and
 * on a facial ROI that is the dominant cost of the colour path: measured at
 * 15.74 ms of regionStats' 24.52 ms across twelve zones.
 *
 * ── THE THREE-WAY PARTITION IS CORRECTNESS, NOT SPEED ──────────────────────
 * These samples are computed from 8-bit channels, so they carry enormous runs
 * of exact duplicates — a 6,568-pixel ROI routinely holds fewer than thirty
 * distinct erythema values, because the erythema index is a function of two
 * bytes. A two-way partition degrades to O(n^2) on runs of equal keys, which is
 * exactly and always the input this gets. Equal keys are gathered into the
 * middle band and never recursed into, so a sample of one repeated value
 * finishes in a single pass.
 *
 * Callers must pass 0 <= k < n and n > 0, and must pass a copy: this reorders.
 */
export function selectKth(a, k, n = a.length) {
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    // Median of three. These samples arrive in raster order and are partly
    // ordered by the lighting gradient across the ROI, so a first-element or
    // middle-element pivot meets its worst case on real input, not on a
    // contrived one.
    const x = a[lo], y = a[lo + ((hi - lo) >> 1)], z = a[hi];
    const p = x < y
      ? (y < z ? y : (x < z ? z : x))
      : (x < z ? x : (y < z ? z : y));

    let i = lo, j = hi, m = lo;
    while (m <= j) {
      const v = a[m];
      if (v < p) { a[m] = a[i]; a[i] = v; i++; m++; }
      else if (v > p) { a[m] = a[j]; a[j] = v; j--; }
      else m++;
    }
    // a[lo..i) < p,  a[i..j] == p,  a(j..hi] > p
    if (k < i) hi = i - 1;
    else if (k > j) lo = j + 1;
    else return p;
  }
  return a[lo];
}

/**
 * robustCentre() over a scratch sample, by selection instead of sorting.
 *
 * Returns the value robustCentreSorted() returns for the same sample —
 * `a scratch-copy selection agrees with a full sort, on every shape` pins the
 * two against each other over randomised, tied, NaN-bearing and degenerate
 * input, because "these compute the same order statistic" is an argument, and
 * an argument is not evidence.
 *
 * REORDERS `a`.
 */
export function robustCentreOf(a, lo = 10, hi = 90) {
  const len = a.length;
  if (!len) return NaN;
  const nn = partitionNaN(a);
  // An index at or past the non-NaN count names a NaN, exactly as it would in
  // the sorted array.
  const at = (k) => (k >= nn ? NaN : selectKth(a, k, nn));

  const A = at(Math.floor((lo / 100) * (len - 1)));
  const B = at(Math.floor((hi / 100) * (len - 1)));
  // Only reachable when a percentile index lands on a NaN, and then every
  // comparison against it is false and the trimmed core is empty. Same
  // fallback as the sorted path: the middle of the untrimmed sample.
  if (Number.isNaN(A) || Number.isNaN(B)) return at(len >> 1);

  // The core is {v : A <= v <= B}. Its bounds in sorted order are the count of
  // values strictly below A, and the count at or below B. NaNs satisfy neither
  // comparison, so they fall outside both, which is where sort would put them.
  let below = 0, atOrBelow = 0;
  for (let i = 0; i < nn; i++) {
    const v = a[i];
    if (v < A) below++;
    if (v <= B) atOrBelow++;
  }
  const count = atOrBelow - below;
  return count > 0 ? at(below + (count >> 1)) : at(len >> 1);
}

/** focalExcess() over a scratch sample, by selection. REORDERS `a`. */
export function focalExcessOf(a, hi = 90) {
  const len = a.length;
  if (len < 16) return NaN;
  const nn = partitionNaN(a);
  const at = (k) => (k >= nn ? NaN : selectKth(a, k, nn));
  return at(Math.floor((hi / 100) * (len - 1))) - at(Math.floor(0.5 * (len - 1)));
}

/**
 * Ascending copy of a sample, as a Float64Array.
 *
 * `Float64Array.prototype.sort` is NUMERIC; `Array.prototype.sort` is
 * lexicographic and would put 10 before 9, silently corrupting every statistic
 * taken here. Converting first is load-bearing, not tidying — the same point
 * percentile() makes in calibrationEngine.js.
 *
 * Exported so a caller measuring several statistics off one sample can sort it
 * ONCE. regionStats() takes both a trimmed centre and a focal excess off the
 * same erythema sample, and sorting a region's worth of pixels twice to do it
 * was pure duplicated work.
 */
export function sortedSample(vals) {
  return scratchCopy(vals).sort();
}

/**
 * robustCentre() on an already-sorted sample.
 *
 * Identical value, without the copy: because `s` is sorted, the trimmed core is
 * a CONTIGUOUS run, so it is located by walking in from each end rather than by
 * copying four-fifths of the sample into a new array and taking its middle.
 */
export function robustCentreSorted(s, lo = 10, hi = 90) {
  const len = s.length;
  if (!len) return NaN;
  const a = s[Math.floor((lo / 100) * (len - 1))];
  const b = s[Math.floor((hi / 100) * (len - 1))];

  let first = 0;
  while (first < len && !(s[first] >= a)) first++;
  let last = len - 1;
  while (last >= first && !(s[last] <= b)) last--;
  const count = last - first + 1;

  /* An empty core is reachable only when a or b is NaN — %TypedArray%.sort
   * places NaN last, so a high percentile can land on one, and every comparison
   * against it is false. The original fell back to the middle of the untrimmed
   * sample in that case; so does this. */
  return count > 0 ? s[first + (count >> 1)] : s[len >> 1];
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
  return focalExcessOf(scratchCopy(vals), hi);
}

/** focalExcess() on an already-sorted sample. See sortedSample(). */
export function focalExcessSorted(s, hi = 90) {
  if (!s || s.length < 16) return NaN;
  const mid = s[Math.floor(0.5 * (s.length - 1))];
  const top = s[Math.floor((hi / 100) * (s.length - 1))];
  return top - mid;
}
