import { test } from "node:test";
import assert from "node:assert/strict";

import {
  percentile, calculateAdaptiveScale, calculateBlurSigma,
  rhytideFullScale, zoneFamily, crosstalkConfidence, melaninProxy,
  orientationWeight, hessianOrientation, axisSeparationDegrees, targetAxisRadians,
  NOISE_FLOOR_STRUCTURENESS, RIDGE_SCALE_MIN, RIDGE_SCALE_MAX,
  RIDGE_SCALE_FALLBACK, RIDGE_SCALE_MIN_ZONES, RIDGE_SCALE_MIN_SAMPLES,
  RHYTIDE_FULL_SCALE_BY_FAMILY, BLUR_BASE_SIGMA, BLUR_MIN_SIGMA, BLUR_MAX_SIGMA,
  RELATIVE_BASE_CONFIDENCE,
} from "../src/utils/calibrationEngine.js";

import { ridgeField, ridgeMean, melaninIndex } from "../src/engine.js";

// ---------------------------------------------------------------- helpers ---

const W = 80, H = 80;
const MASK = new Uint8Array(W * H).fill(1);

/** Deterministic synthetic grey patch, optionally with drawn furrows. */
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
  return g;
}

const structurenessOf = (field) => {
  const out = [];
  for (let i = 0; i < field.st.length; i++) if (field.st[i] > 0) out.push(field.st[i]);
  return out;
};

// ------------------------------------------------------------- percentiles --

test("percentile interpolates and never sorts lexicographically", () => {
  // Array.prototype.sort would order these 1, 10, 2, 9 and hand back nonsense.
  const vals = [1, 2, 9, 10];
  assert.equal(percentile(vals, 0), 1);
  assert.equal(percentile(vals, 100), 10);
  assert.ok(Math.abs(percentile(vals, 50) - 5.5) < 1e-9);
  assert.ok(Number.isNaN(percentile([], 90)));
});

// ---------------------------------------------------- adaptive ridge scale --

test("the adaptive scale is 2x the p90 expressed in noise floors", () => {
  // Pin the formula itself, not merely its direction: a p90 sitting exactly on
  // the measured noise floor must produce exactly 2.
  const vals = new Array(1000).fill(0.01);
  vals[999] = 0;
  const onFloor = new Array(2000).fill(NOISE_FLOOR_STRUCTURENESS);
  const c = calculateAdaptiveScale(onFloor, 12);
  assert.ok(Math.abs(c.p90 - NOISE_FLOOR_STRUCTURENESS) < 1e-12);
  assert.ok(Math.abs(c.raw - 2) < 1e-9);
  assert.equal(c.scale, 2);
  assert.equal(c.clamped, false);
  assert.equal(c.fallback, false);
  assert.ok(vals.length > 0);
});

test("a noisier image gets a larger normaliser — that is the whole point", () => {
  const quiet = calculateAdaptiveScale(new Array(2000).fill(0.05), 12);
  const loud = calculateAdaptiveScale(new Array(2000).fill(0.5), 12);
  assert.ok(loud.raw > quiet.raw,
    "raising the structureness floor must raise the normaliser");
});

test("the scale is clamped at both rails and says when it hit one", () => {
  const huge = calculateAdaptiveScale(new Array(2000).fill(50), 12);
  assert.equal(huge.scale, RIDGE_SCALE_MAX);
  assert.equal(huge.clamped, true);
  assert.ok(huge.raw > RIDGE_SCALE_MAX, "the raw value must survive for inspection");

  const tiny = calculateAdaptiveScale(new Array(2000).fill(1e-6), 12);
  assert.equal(tiny.scale, RIDGE_SCALE_MIN);
  assert.equal(tiny.clamped, true);
});

test("too few samples or too few zones falls back to the static constant", () => {
  // A contaminated estimate is worse than a known quantity. Both preconditions
  // are checked, not assumed.
  const fewSamples = calculateAdaptiveScale(
    new Array(RIDGE_SCALE_MIN_SAMPLES - 1).fill(0.2), 12);
  assert.equal(fewSamples.fallback, true);
  assert.equal(fewSamples.scale, RIDGE_SCALE_FALLBACK);

  const fewZones = calculateAdaptiveScale(
    new Array(5000).fill(0.2), RIDGE_SCALE_MIN_ZONES - 1);
  assert.equal(fewZones.fallback, true);
  assert.equal(fewZones.scale, RIDGE_SCALE_FALLBACK);
});

/**
 * THE regression guard for this whole mechanism.
 *
 * Uncapped, a face whose zones are mostly furrowed pushes its own p90 up and
 * normalises its own furrows away — the measured collapse is 7.45e-2 down to
 * 1.09e-4 as the furrowed fraction goes from 1/12 to 12/12. That is exactly the
 * self-normalising defect CLAUDE.md item 4 exists to prevent, arriving through
 * a new door. The ceiling is the only thing that stops it, so the ceiling is
 * what this test pins.
 */
test("a heavily furrowed face does not normalise its own furrows away", () => {
  const measure = (nLined) => {
    const fields = [];
    for (let z = 0; z < 12; z++) {
      fields.push({
        lined: z < nLined,
        f: ridgeField(greyPatch({ seed: z * 13 + 1, lines: z < nLined ? "h" : null }),
                      MASK, W, H, { vertical: false }),
      });
    }
    const pooled = [];
    for (const { f } of fields) pooled.push(...structurenessOf(f));
    const scale = calculateAdaptiveScale(pooled, fields.length).scale;

    const plain = fields.filter((x) => !x.lined).map((x) => ridgeMean(x.f, scale));
    const lined = fields.filter((x) => x.lined).map((x) => ridgeMean(x.f, scale));
    plain.sort((a, b) => a - b); lined.sort((a, b) => a - b);
    return lined[lined.length >> 1] - (plain.length ? plain[plain.length >> 1] : 0);
  };

  const one = measure(1);
  const most = measure(9);
  const all = measure(12);

  assert.ok(one > 0 && most > 0 && all > 0);
  // Without the ceiling this ratio was ~460. It must stay near 1.
  assert.ok(most / one > 0.5 && most / one < 2,
    `furrow signal must not collapse as more zones are furrowed (9/12 vs 1/12 = ${(most / one).toFixed(2)})`);
  assert.ok(all / one > 0.5 && all / one < 2,
    `furrow signal must survive a fully furrowed face (12/12 vs 1/12 = ${(all / one).toFixed(2)})`);
});

/**
 * The audit finding this mechanism exists to fix, stated as a measurement.
 *
 * A static normaliser lets the ordinary-skin response climb with sensor noise,
 * so on a high-ISO capture the furrow reading and the grain reading converge
 * and the detector stops distinguishing them. Measured separation between a
 * furrowed zone and the plain baseline, furrows over floor:
 *
 *   noise        2      3      8     20     45
 *   static 1.0  618x   301x    46x   8.4x   2.5x
 *   adaptive   5812x  2830x   426x    70x  14.4x
 *
 * Note what the ceiling costs: above roughly noise 4 the clamp binds, so the
 * adaptive column stops tracking the noise and becomes a better-chosen
 * constant. It still beats the static one everywhere. Raising the ceiling to 12
 * would roughly double the separation again, at the cost of a smaller absolute
 * response — which would mean re-deriving the whole rhytide table against it.
 * That is a calibration decision for labelled data, not for this test.
 */
test("adaptation separates furrows from grain better than a static scale", () => {
  const separationAt = (noise, adaptive) => {
    const fields = [];
    for (let z = 0; z < 12; z++)
      fields.push({
        lined: z === 0,
        f: ridgeField(greyPatch({ seed: z * 7 + 1, noise, lines: z === 0 ? "h" : null }),
                      MASK, W, H, { vertical: false }),
      });
    const pooled = [];
    for (const { f } of fields) pooled.push(...structurenessOf(f));
    const scale = adaptive
      ? calculateAdaptiveScale(pooled, fields.length).scale : RIDGE_SCALE_FALLBACK;

    const plain = fields.filter((x) => !x.lined)
      .map((x) => ridgeMean(x.f, scale)).sort((a, b) => a - b);
    const floor = plain[plain.length >> 1];
    return ridgeMean(fields[0].f, scale) / (floor || 1e-12);
  };

  for (const noise of [2, 8, 20, 45]) {
    const stat = separationAt(noise, false);
    const adap = separationAt(noise, true);
    assert.ok(adap > stat * 2,
      `at noise ${noise} adaptation must clearly beat the static scale ` +
      `(static ${stat.toFixed(1)}x, adaptive ${adap.toFixed(1)}x)`);
  }

  // And the failure mode it fixes: the static scale's separation collapses as
  // the sensor gets noisier. That collapse is the audit finding.
  assert.ok(separationAt(45, false) < separationAt(2, false) / 50,
    "the static scale must be shown collapsing, or this test proves nothing");
});

// ------------------------------------------------------ per-zone rhytide ----

test("rhytide full scale is per family, and unmapped zones keep the old constant", () => {
  assert.equal(zoneFamily("center_forehead"), "forehead");
  assert.equal(zoneFamily("periorbital_left"), "periorbital");
  assert.equal(zoneFamily("cheek_right"), "cheeks");
  assert.equal(zoneFamily("glabella"), "glabella");
  assert.equal(zoneFamily("nasolabial_left"), "nasolabial");
  // Deliberately unmapped rather than guessed at by string similarity.
  assert.equal(zoneFamily("nose_bridge"), null);
  assert.equal(zoneFamily("chin"), null);
  assert.equal(rhytideFullScale("nose_bridge"), 0.06);

  assert.equal(rhytideFullScale("glabella"), RHYTIDE_FULL_SCALE_BY_FAMILY.glabella);
  assert.equal(rhytideFullScale("periorbital_left"), RHYTIDE_FULL_SCALE_BY_FAMILY.periorbital);
});

test("the full-scale table reads in the direction the arithmetic uses it", () => {
  // These are DIVISORS: smaller means MORE sensitive and saturating sooner.
  // The table is easy to read backwards, so the ordering is pinned rather than
  // left to the comment.
  assert.ok(rhytideFullScale("periorbital_left") < rhytideFullScale("cheek_left"),
    "thin periorbital skin must be the more sensitive of the two");
  assert.ok(rhytideFullScale("glabella") > rhytideFullScale("cheek_left"),
    "glabella furrows need headroom before they peg at full scale");
});

// ------------------------------------------------------------ dynamic blur --

test("blur tracks zone area around the reference, and clamps", () => {
  const ref = 6400;
  assert.ok(Math.abs(calculateBlurSigma(ref, ref).sigma - BLUR_BASE_SIGMA) < 1e-12,
    "a zone at the reference area must get the sigma the detector was derived at");
  assert.ok(calculateBlurSigma(ref / 4, ref).sigma < BLUR_BASE_SIGMA,
    "a small zone gets less blur, so fine detail survives");
  assert.ok(calculateBlurSigma(ref * 4, ref).sigma > BLUR_BASE_SIGMA,
    "a large zone gets more blur, so noise is suppressed");

  assert.equal(calculateBlurSigma(ref * 1e6, ref).sigma, BLUR_MAX_SIGMA);
  assert.equal(calculateBlurSigma(1, ref).sigma, BLUR_MIN_SIGMA);
  assert.equal(calculateBlurSigma(1, ref).clamped, true);
  assert.equal(calculateBlurSigma(0, ref).fallback, true);
});

/**
 * Regression: a FIXED reference area is not adaptive, it is constant at a rail.
 *
 * ROI areas scale with capture resolution, so against a fixed 1000 every zone
 * of every real photo clamps to the ceiling. Measured cost when this was wrong:
 * the pre-blur smeared three-pixel furrows, the glabella reading fell by a
 * factor of ~360, and three existing tests failed.
 */
test("the blur reference is image-relative, not a fixed pixel count", () => {
  const small = [900, 1000, 1100];
  const large = small.map((a) => a * 25);   // same face, higher-resolution capture

  const sigmasFor = (areas) => {
    const ref = [...areas].sort((a, b) => a - b)[areas.length >> 1];
    return areas.map((a) => calculateBlurSigma(a, ref).sigma);
  };

  assert.deepEqual(sigmasFor(small), sigmasFor(large),
    "the same face at a different capture resolution must blur identically");
  assert.ok(sigmasFor(large).every((s) => s < BLUR_MAX_SIGMA),
    "no zone may sit at the ceiling merely because the photo is large");
});

// -------------------------------------------------- melanin crosstalk -------

test("the crosstalk term is normalised, so confidence stays a confidence", () => {
  // melaninIndex() here is 100*log10(1/R_red) — unbounded, routinely 20 to 120.
  // Multiplying that raw quantity into a confidence produced values above 8.
  // Every band must land inside [0, 1], and inside the base it starts from.
  for (const ita of [70, 50, 35, 20, 0, -20, -45, NaN]) {
    const e = crosstalkConfidence("erythema", ita);
    const p = crosstalkConfidence("pallor", ita);
    for (const c of [e.confidence, p.confidence]) {
      assert.ok(c > 0 && c <= RELATIVE_BASE_CONFIDENCE,
        `confidence ${c} out of range at ITA ${ita}`);
    }
  }
  assert.ok(melaninIndex(60) > 100, "the raw index really is this large");
  assert.ok(melaninProxy(-45) <= 1 && melaninProxy(70) >= 0);
});

test("melanin degrades erythema confidence faster than pallor, and downward", () => {
  // Wilkes et al.: melanin biases a photographic redness reading UPWARD, so
  // erythema fails toward a false positive — the direction that ends in an
  // unwarranted referral — and pallor toward a false negative.
  const light = crosstalkConfidence("erythema", 50).confidence;
  const deep = crosstalkConfidence("erythema", -20).confidence;
  assert.ok(deep < light, "more melanin must mean LESS erythema confidence");

  const deepPallor = crosstalkConfidence("pallor", -20).confidence;
  assert.ok(deep < deepPallor,
    "erythema must be degraded further than pallor at the same tone");
});

// -------------------------------------------------- orientation gating ------

test("axis separation wraps modulo 180, because a ridge is an axis", () => {
  const d = (a, b) => axisSeparationDegrees((a * Math.PI) / 180, (b * Math.PI) / 180);
  assert.ok(Math.abs(d(179, 1) - 2) < 1e-9, "179 and 1 are the same axis, 2 apart");
  assert.ok(Math.abs(d(0, 90) - 90) < 1e-9);
  assert.ok(Math.abs(d(10, 350) - 20) < 1e-9);
});

test("the orientation gate attenuates an angled furrow instead of discarding it", () => {
  // The defect: the old gate was a hard cut, so an oblique furrow contributed
  // exactly zero. Replacing it with a NARROWER hard cut would be worse. What is
  // wanted is a taper — full weight on axis, falling off, zero only when
  // genuinely perpendicular.
  const at = (deg) => orientationWeight((deg * Math.PI) / 180, 0);

  assert.equal(at(0), 1);
  assert.equal(at(25), 1, "inside the plateau the furrow counts in full");
  assert.ok(at(45) > 0 && at(45) < 1,
    "an oblique furrow must be attenuated, not deleted");
  assert.equal(at(90), 0, "a perpendicular furrow is still rejected outright");

  // Monotone across the taper — no step that would make the response jump as a
  // head rotates.
  for (let deg = 0; deg < 90; deg += 5) {
    assert.ok(at(deg) >= at(deg + 5) - 1e-12, `weight must not rise at ${deg} deg`);
  }
});

test("the Hessian axis is the double-angle one, and vertical means vertical", () => {
  // A vertical furrow curves across x, so its principal direction is 0; a
  // horizontal one curves across y, so its principal direction is pi/2.
  // Conflating the two inverts the gate while still looking selective.
  const verticalRidge = hessianOrientation(10, 0, 0);   // Ixx dominant
  const horizontalRidge = hessianOrientation(0, 10, 0); // Iyy dominant

  assert.ok(axisSeparationDegrees(verticalRidge, targetAxisRadians(true)) < 1e-6);
  assert.ok(axisSeparationDegrees(horizontalRidge, targetAxisRadians(false)) < 1e-6);
  assert.equal(orientationWeight(verticalRidge, targetAxisRadians(true)), 1);
  assert.equal(orientationWeight(verticalRidge, targetAxisRadians(false)), 0);
});
