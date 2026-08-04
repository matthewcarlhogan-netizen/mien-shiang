import { test } from "node:test";
import assert from "node:assert/strict";

import {
  erythemaIndex, melaninIndex, rgbToLab, itaDegrees, itaBand,
  erythemaConfidence, shadesOfGray, trimmedMedian, glcmContrast,
  ridgeResponse, regionStats, analyse,
} from "../src/engine.js";

// ---------------------------------------------------------------- helpers ---

const W = 80, H = 80;

/** Deterministic synthetic skin patch. rgb is [r,g,b]. */
export function patch(rgb, { seed = 1, noise = 3, lines = null } = {}) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff - 0.5) * 2; };
  const rgba = new Uint8ClampedArray(W * H * 4);
  const mask = new Uint8Array(W * H).fill(1);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = Math.max(0, Math.min(255, rgb[0] + rnd() * noise));
    rgba[i * 4 + 1] = Math.max(0, Math.min(255, rgb[1] + rnd() * noise));
    rgba[i * 4 + 2] = Math.max(0, Math.min(255, rgb[2] + rnd() * noise));
    rgba[i * 4 + 3] = 255;
  }
  if (lines === "v") {
    for (const x of [20, 40, 60])
      for (let y = 12; y < 68; y++)
        for (let d = -1; d <= 1; d++) {
          const i = y * W + x + d;
          rgba[i * 4] = 60; rgba[i * 4 + 1] = 70; rgba[i * 4 + 2] = 95;
        }
  }
  if (lines === "h") {
    for (const y of [20, 40, 60])
      for (let x = 12; x < 68; x++)
        for (let d = -1; d <= 1; d++) {
          const i = (y + d) * W + x;
          rgba[i * 4] = 60; rgba[i * 4 + 1] = 70; rgba[i * 4 + 2] = 95;
        }
  }
  return rgba;
}

export function region(rgb, opts = {}) {
  const rgba = patch(rgb, opts);
  const mask = new Uint8Array(W * H).fill(1);
  return { w: W, h: H, mask, stats: regionStats(rgba, mask, W, H) };
}

const SKIN = [175, 140, 120];
const REDDER = [195, 120, 110];
const PALER = [170, 155, 140];
const DEEP = [95, 72, 58];

const gray = (rgba) => {
  const g = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++)
    g[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) | 0;
  return g;
};
const FULL_MASK = new Uint8Array(W * H).fill(1);

// ----------------------------------------------------------- colorimetry ---

test("redder skin measures higher erythema", () => {
  assert.ok(erythemaIndex(195, 120) > erythemaIndex(175, 140));
});

test("erythema sign convention is redness-increasing", () => {
  // The literature genuinely conflicts here. Flipping the ratio inverts every
  // result and makes the malar gate fire on pale skin instead of red.
  assert.ok(erythemaIndex(220, 90) > erythemaIndex(180, 180));
});

test("darker skin measures higher melanin", () => {
  assert.ok(melaninIndex(60) > melaninIndex(200));
});

test("EI/MI match the Python reference implementation", () => {
  // Cross-checked against cv/colour.py. Guards the port against drift.
  assert.ok(Math.abs(erythemaIndex(140, 130) - 6.99) < 0.02);
  assert.ok(Math.abs(erythemaIndex(170, 110) - 41.11) < 0.02);
  assert.ok(Math.abs(melaninIndex(205) - 21.42) < 0.02);
  assert.ok(Math.abs(melaninIndex(70) - 121.22) < 0.02);
});

test("ITA orders tones and bands them per Chardon", () => {
  const ita = (rgb) => { const l = rgbToLab(...rgb); return itaDegrees(l[0], l[2]); };
  const pale = ita([235, 220, 215]), mid = ita([175, 140, 120]), deep = ita([80, 55, 45]);
  assert.ok(pale > mid && mid > deep);
  assert.ok(["very_light", "light"].includes(itaBand(pale)));
  assert.equal(itaBand(deep), "dark");
});

test("ITA uses atan2 and survives negative b*", () => {
  // Regression: an earlier revision clamped b* positive, which broke quadrant
  // resolution and mis-binned cool skin toward lighter strata — desensitising
  // the erythema safety gates.
  assert.ok(Number.isFinite(itaDegrees(60, -12)));
  assert.ok(itaDegrees(60, -12) !== itaDegrees(60, 12));
});

test("shades-of-gray removes a colour cast", () => {
  const raw = patch(SKIN);
  const cast = new Uint8ClampedArray(raw.length);
  for (let i = 0; i < raw.length; i += 4) {
    cast[i] = raw[i] * 1.4; cast[i + 1] = raw[i + 1]; cast[i + 2] = raw[i + 2] * 0.6;
    cast[i + 3] = 255;
  }
  const spread = (d) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const m = [r / n, g / n, b / n];
    return Math.max(...m) - Math.min(...m);
  };
  assert.ok(spread(shadesOfGray(cast)) < spread(cast) / 3);
});

test("deep skin puts erythema into the low-confidence regime", () => {
  // Enforces the physical limit (Lee et al., J Invest Dermatol 2026), not just
  // documents it.
  const l = rgbToLab(...DEEP);
  const { regime, reason } = erythemaConfidence(itaDegrees(l[0], l[2]));
  assert.equal(regime, "low");
  assert.ok(reason.length > 0, "user must get an explanation, not silence");
});

// ------------------------------------------------------------- detectors ---

test("ridge detector beats noise by a wide margin", () => {
  // Regression: the threshold was originally the region's own 97th percentile,
  // which is self-normalising — flat noisy skin scored HIGHER than furrows.
  const plain = ridgeResponse(gray(patch(SKIN)), FULL_MASK, W, H, true);
  const lined = ridgeResponse(gray(patch(SKIN, { lines: "v" })), FULL_MASK, W, H, true);
  assert.ok(lined > plain * 10, `lined=${lined} plain=${plain}`);
});

test("ridge detector is orientation-selective", () => {
  const g = gray(patch(SKIN, { lines: "h" }));
  assert.ok(ridgeResponse(g, FULL_MASK, W, H, true) <
            ridgeResponse(g, FULL_MASK, W, H, false));
});

test("GLCM contrast tracks roughness", () => {
  const smooth = glcmContrast(gray(patch(SKIN, { noise: 2, seed: 7 })), FULL_MASK, W, H);
  const rough = glcmContrast(gray(patch(SKIN, { noise: 60, seed: 9 })), FULL_MASK, W, H);
  assert.ok(rough > smooth);
});

test("trimmed median ignores specular outliers", () => {
  const v = [...Array(90).fill(10), ...Array(10).fill(500)];
  assert.ok(Math.abs(trimmedMedian(v) - 10) < 1);
});

// ---------------------------------------------------------- self-reference --

test("erythema is measured against the subject's own baseline", () => {
  const { observations } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    cheek_left: region(REDDER, { seed: 3 }),
  });
  const e = observations.find((o) => o.zone === "cheek_left" && o.condition === "erythema");
  assert.ok(e, "expected erythema on the redder cheek");
  assert.ok(e.measured.delta_ei > 0);
});

test("pallor is the same measurement reversed", () => {
  const { observations } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    cheek_right: region(PALER, { seed: 3 }),
  });
  const conds = new Set(observations.filter((o) => o.zone === "cheek_right").map((o) => o.condition));
  assert.ok(conds.has("pallor"));
  assert.ok(!conds.has("erythema"));
});

test("a uniform face produces no colour findings", () => {
  const { observations } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    cheek_left: region(SKIN, { seed: 3 }),
    cheek_right: region(SKIN, { seed: 4 }),
    nose_bridge: region(SKIN, { seed: 5 }),
  });
  const colourFindings = observations.filter((o) =>
    ["erythema", "pallor", "hyperpigmentation"].includes(o.condition));
  assert.deepEqual(colourFindings, []);
});

test("deep skin yields no erythema observation at all", () => {
  // The honest output is silence, not a low score.
  const { observations, baseline } = analyse({
    center_forehead: region(DEEP, { seed: 1 }),
    chin: region(DEEP, { seed: 2 }),
    cheek_left: region([120, 70, 60], { seed: 3 }),
  });
  assert.equal(baseline.regime, "low");
  assert.ok(baseline.reason.length > 0);
  assert.equal(observations.filter((o) => ["erythema", "pallor"].includes(o.condition)).length, 0);
});

test("suppressing erythema does not disable luminance-based measures", () => {
  const { observations, baseline } = analyse({
    center_forehead: region(DEEP, { seed: 1 }),
    chin: region(DEEP, { seed: 2 }),
    glabella: region(DEEP, { seed: 3, lines: "v" }),
  });
  assert.equal(baseline.regime, "low");
  assert.ok(observations.some((o) => o.condition === "deep_rhytide_vertical"));
});
