/*
 * The optimisation guard.
 *
 * Every measurement in engine.js was made faster without being made different.
 * "Without being made different" is a claim about arithmetic, and arithmetic
 * claims are the ones this repo has been wrong about before — a flipped
 * erythema ratio, a clamped b*, a self-normalising ridge scale. Each of those
 * looked plausible and produced confident wrong numbers.
 *
 * So each fast path here is pinned against the slow one it replaced, in the
 * SAME run, on inputs chosen to include the shapes that break the fast one:
 * ties, NaN, sorted input, degenerate sizes, region edges.
 *
 * These are equality assertions, not tolerance assertions. The optimisations
 * were designed to be bit-exact — a table holding the result of the identical
 * expression, a selection returning the same order statistic, a convolution
 * summing the same taps in the same order. If one of these starts needing an
 * epsilon, the change under it is not the change that was reviewed.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  srgbToLinear, shadesOfGray, erythemaIndex, melaninIndex, rgbToLab,
  regionStats, trimmedMedian, gaussianBlur, ridgeField, ridgeMean,
} from "../src/engine.js";
import {
  robustCentre, focalExcess, selectKth, partitionNaN, scratchCopy,
  sortedSample, robustCentreSorted, focalExcessSorted,
  ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI,
} from "../src/utils/textureAnalyzer.js";
import { percentile, targetAxisRadians } from "../src/utils/calibrationEngine.js";

// Deterministic; a flaky differential test is worse than none.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────────────────────────── the sRGB transfer table ──

test("the sRGB table is the arithmetic, at every one of its 256 inputs", () => {
  // The reference is the expression the function had before the table existed.
  const reference = (v) => {
    const x = Math.min(Math.max(v / 255, 0), 1);
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  for (let v = 0; v <= 255; v++) {
    assert.ok(Object.is(srgbToLinear(v), reference(v)),
      `srgbToLinear(${v}) diverged from the arithmetic it tabulates`);
  }
  // The endpoints matter most: 0 is the linear segment, 255 must be exactly 1,
  // and the knee at 0.04045*255 is where the two segments meet.
  assert.equal(srgbToLinear(0), 0);
  assert.equal(srgbToLinear(255), 1);
});

test("a non-integer or out-of-range channel still takes the arithmetic path", () => {
  // The table's domain is the 256 integers. Anything else must not be rounded
  // into it — a float buffer or a test fixture is entitled to the real curve.
  const reference = (v) => {
    const x = Math.min(Math.max(v / 255, 0), 1);
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  for (const v of [0.5, 12.3, 128.5, 254.9, -1, -0.0001, 255.5, 1e6, 12.000001]) {
    assert.ok(Object.is(srgbToLinear(v), reference(v)), `srgbToLinear(${v})`);
  }
  assert.ok(Number.isNaN(srgbToLinear(NaN)), "NaN must not index the table");
  // 12.5 and 12 must not collapse onto each other.
  assert.notEqual(srgbToLinear(12.5), srgbToLinear(12));
});

// ────────────────────────────────────────────────── whole-frame white balance ─

test("the white-balance tables agree with the per-pixel arithmetic, byte for byte", () => {
  /* shadesOfGray() has a table-driven path for byte buffers and an arithmetic
   * path for everything else. Feeding both the SAME numbers is the only way to
   * show the table is not an approximation: a plain Array takes the arithmetic
   * path, a Uint8ClampedArray takes the tables, and the two must agree on every
   * one of the ~3.1 million output bytes. */
  const rnd = rng(4242);
  const W = 96, H = 64;
  const bytes = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    /* A WARM CAST, not uniform noise. Uniform channels drive the Shades-of-Gray
     * estimate to ir == ig == ib == 1, and against gains of one every channel
     * table is the identity — so a table built from the wrong channel's gain
     * would pass. Verified: with uniform noise this test does not detect
     * `gg[v] = min(255, v / ir)`; with the cast below it does. Skin is warm, so
     * this is also the realistic input. */
    bytes[p] = 150 + Math.floor(rnd() * 100);
    bytes[p + 1] = 90 + Math.floor(rnd() * 90);
    bytes[p + 2] = 40 + Math.floor(rnd() * 80);
    bytes[p + 3] = rnd() < 0.05 ? 0 : 255;   // exercise the alpha skip too
  }
  const plain = Array.from(bytes);

  const viaTable = shadesOfGray(bytes);
  const viaMaths = shadesOfGray(plain);

  assert.equal(viaTable.length, viaMaths.length);
  for (let i = 0; i < viaTable.length; i++) {
    assert.equal(viaTable[i], viaMaths[i],
      `white-balanced byte ${i} differs between the table and the arithmetic`);
  }
});

test("white balance still refuses a frame with too few opaque pixels", () => {
  // The n < 16 refusal returns the INPUT, not a copy. Tabulating must not have
  // moved that early return past the table build.
  const d = new Uint8ClampedArray(4 * 10);
  for (let i = 0; i < 10; i++) d[i * 4 + 3] = 255;
  assert.equal(shadesOfGray(d), d, "an unbalanceable frame is returned as-is");
});

// ──────────────────────────────────────────── selection versus a full sort ──

/**
 * The shapes that separate a working selection from a broken one.
 *
 * All-equal and two-valued are the ones that matter most here: these samples
 * are computed from 8-bit channels and carry huge runs of duplicates, which is
 * where a two-way partition degrades and where an off-by-one in the tie band
 * hides. Sorted and reverse-sorted are the classic pivot worst cases. The NaN
 * shapes pin the ordering %TypedArray%.sort defines and selection does not.
 */
function sampleShapes() {
  const rnd = rng(1234);
  const shapes = [];
  const push = (name, arr) => shapes.push({ name, vals: Float64Array.from(arr) });

  for (const n of [1, 2, 3, 15, 16, 17, 63, 64, 257, 1000]) {
    push(`random n=${n}`, Array.from({ length: n }, () => rnd() * 200 - 100));
    push(`all-equal n=${n}`, Array.from({ length: n }, () => 7.5));
    push(`two-valued n=${n}`, Array.from({ length: n }, (_, i) => (i % 2 ? 1 : 9)));
    push(`few-distinct n=${n}`,
      Array.from({ length: n }, () => Math.floor(rnd() * 5) * 3.25));
    push(`ascending n=${n}`, Array.from({ length: n }, (_, i) => i * 0.5));
    push(`descending n=${n}`, Array.from({ length: n }, (_, i) => -i * 0.5));
    push(`negatives n=${n}`, Array.from({ length: n }, () => -rnd() * 50));
  }
  push("with NaN", [3, 1, NaN, 8, 2, NaN, 5, 9, 4, 7, 6, 0, NaN, 11, 10, 12, 13]);
  push("mostly NaN", Array.from({ length: 40 }, (_, i) => (i < 3 ? i : NaN)));
  push("all NaN", Array.from({ length: 20 }, () => NaN));
  push("infinities", [Infinity, -Infinity, 0, 5, -5, Infinity, 3, -Infinity,
    1, 2, 4, 6, 7, 8, 9, 10, 11]);
  push("subnormals", [5e-324, 1e-320, 0, -5e-324, 2e-322, 1, -1,
    3e-321, 4e-323, 7e-322, 8e-324, 9e-321, 1e-310, 2e-311, 3e-312, 6e-320]);
  return shapes;
}

test("a selection agrees with a full sort, on every shape", () => {
  for (const { name, vals } of sampleShapes()) {
    const sorted = sortedSample(vals);
    for (const [lo, hi] of [[10, 90], [ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI],
      [0, 100], [25, 75], [49, 51]]) {
      const bySort = robustCentreSorted(sorted, lo, hi);
      const bySelect = robustCentre(vals, lo, hi);
      assert.ok(Object.is(bySort, bySelect),
        `robustCentre ${name} @${lo}-${hi}: sort gave ${bySort}, selection gave ${bySelect}`);
    }
    const fSort = focalExcessSorted(sorted);
    const fSelect = focalExcess(vals);
    assert.ok(Object.is(fSort, fSelect),
      `focalExcess ${name}: sort gave ${fSort}, selection gave ${fSelect}`);
  }
});

function partitionedCopy(vals) {
  const a = scratchCopy(vals);
  partitionNaN(a);
  return a;
}

test("selectKth returns what the sorted array holds at k, for every k", () => {
  let checked = 0;
  for (const { name, vals } of sampleShapes()) {
    const sorted = sortedSample(vals);
    let nn = sorted.length;
    while (nn > 0 && Number.isNaN(sorted[nn - 1])) nn--;
    if (!nn) continue;

    // Every k on the small shapes; a spread of them on the large ones, since
    // this is quadratic in the shape size and a slow suite gets skipped.
    const step = nn > 300 ? 17 : 1;
    for (let k = 0; k < nn; k += step) {
      // A FRESH scratch each time, so a partition left by the previous k
      // cannot be what makes this pass.
      const got = selectKth(partitionedCopy(vals), k, nn);
      assert.ok(Object.is(got, sorted[k]),
        `selectKth ${name} k=${k}: expected ${sorted[k]}, got ${got}`);
      checked++;
    }
  }
  assert.ok(checked > 500, `only ${checked} selections were compared`);
});

test("selection reuses a partitioned array without corrupting later answers", () => {
  // regionStats() runs two statistics over ONE scratch array on purpose, so the
  // second inherits whatever ordering the first left behind. That is only safe
  // if selection is order-independent, which is exactly what this asserts.
  const rnd = rng(777);
  const vals = Float64Array.from({ length: 500 }, () => Math.floor(rnd() * 12) * 1.5);
  const sorted = sortedSample(vals);

  const shared = scratchCopy(vals);
  partitionNaN(shared);
  const ks = [0, 1, 250, 499, 3, 498, 125, 375, 250, 0];
  for (const k of ks) {
    assert.ok(Object.is(selectKth(shared, k, shared.length), sorted[k]),
      `k=${k} wrong after ${ks.indexOf(k)} prior selections on the same array`);
  }
});

test("percentile agrees with the sorted definition it replaced", () => {
  const reference = (vals, p) => {
    if (!vals || vals.length === 0) return NaN;
    const s = Float64Array.from(vals).sort();
    if (s.length === 1) return s[0];
    const idx = (p / 100) * (s.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  for (const { name, vals } of sampleShapes()) {
    for (const p of [0, 10, 50, 90, 95, 99, 100, 33.3]) {
      const want = reference(vals, p), got = percentile(vals, p);
      assert.ok(Object.is(want, got),
        `percentile ${name} p=${p}: expected ${want}, got ${got}`);
    }
  }
  assert.ok(Number.isNaN(percentile([], 90)));
  assert.ok(Number.isNaN(percentile(null, 90)));
});

test("the public statistics do not reorder the caller's sample", () => {
  // robustCentreOf() and friends reorder in place by design. The exported
  // entry points must copy first — a caller handing the same array to two
  // statistics must get the same answer from both, in either order.
  const original = [5, 3, 9, 1, 7, 2, 8, 4, 6, 0, 11, 10, 13, 12, 15, 14, 17];
  const vals = [...original];
  trimmedMedian(vals);
  robustCentre(vals);
  focalExcess(vals);
  percentile(vals, 90);
  assert.deepEqual(vals, original, "a sample was reordered underneath its owner");
});

// ──────────────────────────────────────────────── the separable convolution ──

/**
 * The convolution as it was written before the edge/interior split: one code
 * path, clamped on every tap, column-strided on the vertical pass.
 */
function referenceBlur(src, w, h, sigma) {
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

test("the split convolution is bit-identical to the single-path one", () => {
  /* Three code paths per axis now cover what one path covered: a clamped edge
   * band, an unclamped interior, and a second clamped band. An off-by-one at a
   * band boundary changes r columns of one blur level, which reaches the
   * measurement as a small change in one zone's ridge number — plausible,
   * unattributable, and caught by nothing else in this suite.
   *
   * The sigmas are the ones ridgeField actually uses: the adaptive pre-blur
   * across its clamp range, then the three fixed pyramid scales. The sizes
   * include ones NARROWER than the kernel, where the two clamped bands overlap
   * and the interior is empty. */
  const rnd = rng(31337);
  const sizes = [[8, 8], [9, 8], [8, 9], [13, 11], [16, 16], [31, 17], [40, 64], [64, 40]];
  const sigmas = [0.8, 1.2, 1.5, 2.0, 2.5, 3.5];

  let checked = 0;
  for (const [w, h] of sizes) {
    const src = new Float64Array(w * h);
    for (let i = 0; i < src.length; i++) src[i] = rnd() * 255;
    for (const sigma of sigmas) {
      const want = referenceBlur(src, w, h, sigma);
      const got = gaussianBlur(src, w, h, sigma,
        new Float64Array(w * h), new Float64Array(w * h));
      for (let i = 0; i < want.length; i++) {
        assert.ok(Object.is(want[i], got[i]),
          `blur ${w}x${h} sigma=${sigma} px ${i} (${i % w},${(i / w) | 0}): ` +
          `expected ${want[i]}, got ${got[i]}`);
      }
      checked++;
    }
  }
  assert.equal(checked, sizes.length * sigmas.length);
  assert.ok(checked >= 48, `only ${checked} size/sigma pairs were compared`);
});

// ──────────────────────────────────────── one ridge field, either target axis ─

test("a field reduced at an axis matches a field BUILT for that axis", () => {
  /* rawScalars() now takes the baseline ridge off the zone's own field, at the
   * vertical axis, instead of building a second Hessian pyramid for it. That is
   * only sound because st/rb/ang carry no axis — the axis enters at reduction.
   * If someone folds the orientation weight back into ridgeField(), this fails.
   */
  const rnd = rng(90210);
  const w = 40, h = 40;
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // grain, plus horizontal furrows so the two axes genuinely disagree
      const furrow = (y % 9) < 2 ? -30 : 0;
      gray[y * w + x] = Math.max(0, Math.min(255, 180 + furrow + (rnd() - 0.5) * 10));
    }
  const mask = new Uint8Array(w * h).fill(1);

  const builtVertical = ridgeField(gray, mask, w, h, { vertical: true, blurSigma: 1.2 });
  const builtHorizontal = ridgeField(gray, mask, w, h, { vertical: false, blurSigma: 1.2 });

  for (const scale of [1.0, 2.0, 4.0]) {
    assert.ok(Object.is(
      ridgeMean(builtHorizontal, scale, targetAxisRadians(true)),
      ridgeMean(builtVertical, scale)),
    `a horizontal-axis field reduced at the vertical axis must equal the vertical field (scale ${scale})`);
    assert.ok(Object.is(
      ridgeMean(builtVertical, scale, targetAxisRadians(false)),
      ridgeMean(builtHorizontal, scale)),
    `and the reverse (scale ${scale})`);
  }

  // The negative control: the two axes must not be the same number, or the
  // assertions above would hold for a field that had stopped discriminating.
  assert.notEqual(ridgeMean(builtVertical, 2.0),
    ridgeMean(builtVertical, 2.0, targetAxisRadians(false)),
    "the orientation gate has stopped distinguishing the axes at all");
});

test("ridgeMean defaults to the axis its field was built for", () => {
  // The two-argument call is what the tests and the pipeline both use. If the
  // default silently changed, every ridge number would move at once.
  const gray = new Uint8Array(32 * 32);
  for (let i = 0; i < gray.length; i++) gray[i] = 150 + ((i * 7) % 23);
  const mask = new Uint8Array(32 * 32).fill(1);
  for (const vertical of [true, false]) {
    const f = ridgeField(gray, mask, 32, 32, { vertical, blurSigma: 1.2 });
    assert.ok(Object.is(ridgeMean(f, 2.0), ridgeMean(f, 2.0, targetAxisRadians(vertical))));
  }
});

// ───────────────────────────────────── the inlined colour maths in regionStats ─

test("regionStats' inlined colour maths equals the exported helpers", () => {
  /* regionStats() no longer calls erythemaIndex(), melaninIndex() or rgbToLab()
   * per pixel — it inlines them so each channel is linearised once instead of
   * six times, and so lightness and yellow-blue are taken without allocating a
   * Lab triple or computing the X channel that nothing reads.
   *
   * That is a SECOND COPY of three published formulas. The hazard is not that
   * the copy is wrong today; it is that someone corrects the sign convention in
   * erythemaIndex() (CLAUDE.md item 2) or the ITA quadrant handling in
   * rgbToLab() (item 3) and the copy inside regionStats keeps the old one, so
   * half the pipeline is fixed and the reading is silently inconsistent. This
   * test is what makes that a failure instead of a mystery. */
  const rnd = rng(20260810);
  const w = 24, h = 24;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    // Real skin bytes plus deliberate extremes, so the Lab f() branch at
    // 0.008856 and the near-black end of the transfer curve are both crossed.
    const dark = rnd() < 0.15;
    rgba[p] = dark ? Math.floor(rnd() * 12) : 150 + Math.floor(rnd() * 90);
    rgba[p + 1] = dark ? Math.floor(rnd() * 12) : 110 + Math.floor(rnd() * 80);
    rgba[p + 2] = dark ? Math.floor(rnd() * 12) : 95 + Math.floor(rnd() * 70);
    rgba[p + 3] = 255;
    mask[i] = 1;
  }
  const stats = regionStats(rgba, mask, w, h);
  assert.ok(stats, `expected stats for ${w * h} masked pixels`);

  // The same four samples, built ONLY from the exported helpers.
  const ei = [], mi = [], Ls = [], bs = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i]) continue;
    const p = i * 4;
    ei.push(erythemaIndex(rgba[p], rgba[p + 1]));
    mi.push(melaninIndex(rgba[p]));
    const lab = rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2]);
    Ls.push(lab[0]); bs.push(lab[2]);
  }

  assert.ok(Object.is(stats.ei, robustCentre(ei, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI)),
    "the inlined erythema index has diverged from erythemaIndex()");
  assert.ok(Object.is(stats.focalEi, focalExcess(ei)),
    "the inlined erythema sample has diverged from erythemaIndex()");
  assert.ok(Object.is(stats.mi, trimmedMedian(mi)),
    "the inlined melanin index has diverged from melaninIndex()");
  assert.ok(Object.is(stats.L, trimmedMedian(Ls)),
    "the inlined L* has diverged from rgbToLab()");
  assert.ok(Object.is(stats.b, trimmedMedian(bs)),
    "the inlined b* has diverged from rgbToLab()");
  assert.equal(stats.n, w * h);
});

test("regionStats still refuses a region under the 256-pixel floor", () => {
  // The refusal moved ahead of the work when the mask count moved ahead of it.
  // It must still be the same refusal, and still at the same threshold.
  const w = 20, h = 20;
  const rgba = new Uint8ClampedArray(w * h * 4).fill(200);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < 255; i++) mask[i] = 1;
  assert.equal(regionStats(rgba, mask, w, h), null, "255 masked pixels must refuse");
  mask[255] = 1;
  assert.ok(regionStats(rgba, mask, w, h), "256 masked pixels must measure");
});
