import { test } from "node:test";
import assert from "node:assert/strict";

import {
  orientedGlcm, cooccurrence, isotropyWeight, robustCentre, focalExcess,
  GLCM_LEVELS, GLCM_DISPLACEMENT, GLCM_ORIENTATIONS, ISOTROPY_FLOOR,
  ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI,
} from "../src/utils/textureAnalyzer.js";

// ---------------------------------------------------------------- helpers ---

const W = 80, H = 80;
const MASK = new Uint8Array(W * H).fill(1);

function greyPatch({ seed = 1, noise = 3, level = 148, lines = null } = {}) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff - 0.5) * 2; };
  const g = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = Math.max(0, Math.min(255, level + rnd() * noise));
  if (lines === "h") {
    for (const y of [20, 40, 60])
      for (let x = 12; x < 68; x++)
        for (let d = -1; d <= 1; d++) g[(y + d) * W + x] = 70;
  }
  if (lines === "v") {
    for (const x of [20, 40, 60])
      for (let y = 12; y < 68; y++)
        for (let d = -1; d <= 1; d++) g[y * W + x + d] = 70;
  }
  return g;
}

// ------------------------------------------------------------ oriented GLCM --

test("parameters are the ones the comments claim", () => {
  assert.equal(GLCM_LEVELS, 16);
  assert.equal(GLCM_DISPLACEMENT, 2);
  assert.equal(GLCM_ORIENTATIONS.length, 4);
  assert.deepEqual(GLCM_ORIENTATIONS.map((o) => o.deg), [0, 45, 90, 135]);
});

/**
 * The information the old single averaged number threw away.
 *
 * A furrow and a patch of dry surface can reach the same MEAN contrast and are
 * not the same object: one varies in a single direction, the other in all of
 * them. Averaging the four orientations is exactly what made them
 * indistinguishable.
 */
test("directionality separates a furrowed surface from an isotropic one", () => {
  const lined = orientedGlcm(greyPatch({ lines: "h" }), MASK, W, H);
  const rough = orientedGlcm(greyPatch({ noise: 60, seed: 9 }), MASK, W, H);

  assert.ok(lined.directionality > 0.5,
    `drawn furrows must read as directional (got ${lined.directionality.toFixed(3)})`);
  assert.ok(rough.directionality < 0.25,
    `isotropic grain must not (got ${rough.directionality.toFixed(3)})`);
  assert.ok(lined.directionality > rough.directionality * 3);
});

test("the reported axis is the one the structure RUNS ALONG", () => {
  // Intensity varies LEAST along a furrow and most across it, so this is the
  // argmin of contrast. Reporting the argmax instead names the perpendicular
  // and is wrong by exactly 90 degrees — which reads as plausible either way,
  // so it is pinned in both orientations.
  assert.equal(orientedGlcm(greyPatch({ lines: "h" }), MASK, W, H).axisDegrees, 0);
  assert.equal(orientedGlcm(greyPatch({ lines: "v" }), MASK, W, H).axisDegrees, 90);
});

test("contrast is normalised, so the level count can change without rescaling", () => {
  // Raw Haralick contrast scales with the SQUARE of the level count: going from
  // 8 levels to 16 multiplies it by roughly four with nothing about the surface
  // changing. Any full-scale constant calibrated on the old numbers would then
  // saturate immediately, silently, in the over-reporting direction.
  const g = greyPatch({ noise: 40, seed: 5 });
  const at8 = orientedGlcm(g, MASK, W, H, { levels: 8 }).meanContrast;
  const at16 = orientedGlcm(g, MASK, W, H, { levels: 16 }).meanContrast;
  const at32 = orientedGlcm(g, MASK, W, H, { levels: 32 }).meanContrast;

  for (const v of [at8, at16, at32]) assert.ok(v >= 0 && v <= 1, "normalised into [0,1]");
  assert.ok(at16 / at8 > 0.5 && at16 / at8 < 2,
    `quantisation must not rescale the measurement (8: ${at8.toExponential(2)}, 16: ${at16.toExponential(2)})`);
  assert.ok(at32 / at16 > 0.5 && at32 / at16 < 2);
});

/**
 * What the wider step actually buys, measured rather than assumed.
 *
 * The first guess — that d=2 "steps past the noise" and so reads lower on grain
 * — is wrong for uncorrelated noise, and the synthetic grain here is exactly
 * that: independent per pixel, so no displacement sees any more or less of it.
 *
 * The real gain is on the other side of the ratio. Surface structure varies
 * over a spatial scale, so a wider step sees roughly twice as much of it while
 * grain is unmoved. d=2 improves the structure-to-grain ratio by raising the
 * numerator, not by lowering the denominator.
 */
test("a wider step lifts structure without lifting grain with it", () => {
  const grain = greyPatch({ noise: 25, seed: 3 });
  const structured = greyPatch({ noise: 25, seed: 3, lines: "h" });

  const at = (g, d) => orientedGlcm(g, MASK, W, H, { displacement: d }).meanContrast;

  const grain1 = at(grain, 1), grain2 = at(grain, 2);
  assert.ok(Math.abs(grain2 - grain1) / grain1 < 0.05,
    `uncorrelated grain must read the same at either step ` +
    `(${grain1.toExponential(2)} vs ${grain2.toExponential(2)})`);

  const struct1 = at(structured, 1), struct2 = at(structured, 2);
  assert.ok(struct2 > struct1 * 1.2,
    `real structure must read materially higher at the wider step ` +
    `(${struct1.toExponential(2)} vs ${struct2.toExponential(2)})`);

  assert.ok((struct2 - grain2) > (struct1 - grain1),
    "so the structure-above-grain margin must widen, which is the point");
});

test("a region with too few pairs reports nothing rather than a number", () => {
  const empty = new Uint8Array(W * H);
  const noMask = new Uint8Array(W * H);   // nothing selected
  const r = cooccurrence(empty, noMask, W, H, 0, 2, GLCM_LEVELS);
  assert.ok(Number.isNaN(r.contrast));
  const g = orientedGlcm(empty, noMask, W, H);
  assert.ok(Number.isNaN(g.meanContrast));
  assert.equal(g.axisDegrees, null);
  assert.equal(g.orientations, 0);
});

// ---------------------------------------------------------- isotropy weight --

test("directional excess is attenuated but never erased", () => {
  assert.equal(isotropyWeight(0), 1, "fully isotropic counts in full");
  assert.equal(isotropyWeight(1), ISOTROPY_FLOOR, "fully directional is floored, not zeroed");
  assert.ok(isotropyWeight(0.5) < 1 && isotropyWeight(0.5) > ISOTROPY_FLOOR);
  assert.equal(isotropyWeight(NaN), 1, "an unmeasurable ratio must not delete the reading");
  // Monotone: more directional is never weighted higher.
  for (let d = 0; d < 1; d += 0.1) {
    assert.ok(isotropyWeight(d) >= isotropyWeight(d + 0.1) - 1e-12);
  }
});

// ------------------------------------------------------ robust statistics ----

/**
 * The honest result about the trim window, which is not the one the audit
 * assumed.
 *
 * Narrowing 10-90 to 20-80 does not recover a localised patch, because the
 * median of a symmetric trim IS the median — trimming removes the same count
 * from each side of the middle. Writing this down as a test stops the window
 * from being widened or narrowed again in the belief that it does something it
 * does not.
 */
test("the trim window barely moves the centre, whichever width is used", () => {
  const vals = [];
  for (let i = 0; i < 1000; i++) vals.push(10 + Math.sin(i) * 2);
  vals.push(...new Array(40).fill(500));   // specular highlights in the tail

  const wide = robustCentre(vals, 10, 90);
  const narrow = robustCentre(vals, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);
  assert.ok(Math.abs(wide - narrow) < 0.5,
    `the window width is not what protects a localised patch (${wide} vs ${narrow})`);
  assert.ok(narrow < 20, "both must still reject the highlights");
});

/**
 * What DOES see a localised patch — the actual answer to the audit finding.
 *
 * A uniformly ruddy region and an ordinary region with one raised area have
 * similar medians and very different high tails. Two numbers separate shapes
 * that either one alone cannot.
 */
test("focal excess sees the localised patch the median cannot", () => {
  const uniform = new Array(1000).fill(0).map((_, i) => 12 + (i % 3) * 0.1);

  // Same region, ordinary apart from a fifth of it being markedly redder.
  const focal = new Array(800).fill(0).map((_, i) => 10 + (i % 3) * 0.1)
    .concat(new Array(200).fill(26));

  const mUniform = robustCentre(uniform, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);
  const mFocal = robustCentre(focal, ERYTHEMA_TRIM_LO, ERYTHEMA_TRIM_HI);
  assert.ok(Math.abs(mUniform - mFocal) < 3,
    "the medians are close — which is exactly why the median alone is not enough");

  assert.ok(focalExcess(focal) > focalExcess(uniform) * 5,
    `the focal statistic must separate them ` +
    `(uniform ${focalExcess(uniform).toFixed(2)}, focal ${focalExcess(focal).toFixed(2)})`);
  assert.ok(Number.isNaN(focalExcess([1, 2, 3])), "too small a sample reports nothing");
});
