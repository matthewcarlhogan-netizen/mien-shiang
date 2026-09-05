/*
 * Skin-masked Minkowski-6 sampling for shadesOfGray (Initiative 3 of the
 * lighting-consistency review).
 *
 * CLAUDE.md item 1 is not optional background here: white balance is applied
 * ONCE, to the WHOLE FRAME, and per-region colour constancy is a documented,
 * previously-shipped bug (a visibly red patch once measured ΔEI of exactly
 * 0.000 because each region normalised itself toward grey). This file exists
 * to prove the distinction the safe reading depends on: restricting WHICH
 * PIXELS FEED THE ESTIMATE is not the same operation as restricting WHERE
 * THE CORRECTION IS APPLIED, and only the first is what changed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { shadesOfGray } from "../src/engine.js";
import { roiFootprint, unionFootprintMask, rasteriseHullInto } from "../src/roi.js";
import { ROIS } from "../src/zones.js";
import { canonicalFace } from "./fixtures/canonical-face.js";

const W = 120, H = 120;
// A centred "face" rectangle used as a hand-built sample mask — shadesOfGray
// does not know or care how a mask was built, so a rectangle is exactly as
// valid a fixture as a real hull for testing the accumulation/application
// split, and easier to reason precisely about pixel-by-pixel.
const FACE = { x0: 30, y0: 30, x1: 90, y1: 90 };

function rectMask() {
  const mask = new Uint8Array(W * H);
  for (let y = FACE.y0; y < FACE.y1; y++) {
    for (let x = FACE.x0; x < FACE.x1; x++) mask[y * W + x] = 1;
  }
  return mask;
}

/** Warm "skin" everywhere, with a `bg` colour painted OUTSIDE the face rect. */
function frameWithBackground(bg) {
  const data = new Uint8ClampedArray(W * H * 4);
  const inFace = (x, y) => x >= FACE.x0 && x < FACE.x1 && y >= FACE.y0 && y < FACE.y1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const [r, g, b] = inFace(x, y) ? [180, 130, 110] : bg;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

const DIM_BG = [40, 38, 42];       // an unremarkable dim wall behind the subject
const BRIGHT_BG = [250, 248, 245]; // a window or white shirt in frame

// ---------------------------------------------------------- core behaviour ---

test("a masked sample is unaffected by what the background changes to", () => {
  const mask = rectMask();
  const withDimBg = shadesOfGray(frameWithBackground(DIM_BG), 6, mask);
  const withBrightBg = shadesOfGray(frameWithBackground(BRIGHT_BG), 6, mask);

  // Compare only the face-region pixels: the estimate must not have moved,
  // so the correction applied to the identical face content must not either.
  for (let y = FACE.y0; y < FACE.y1; y++) {
    for (let x = FACE.x0; x < FACE.x1; x++) {
      const i = (y * W + x) * 4;
      assert.equal(withDimBg[i], withBrightBg[i], `R differs at (${x},${y})`);
      assert.equal(withDimBg[i + 1], withBrightBg[i + 1], `G differs at (${x},${y})`);
      assert.equal(withDimBg[i + 2], withBrightBg[i + 2], `B differs at (${x},${y})`);
    }
  }
});

test("NEGATIVE CONTROL: without a mask, the same background swap DOES move the estimate", () => {
  // Proves the fixture is sensitive and the fix above is fixing something
  // real, not asserting a property the old code already had.
  const withDimBg = shadesOfGray(frameWithBackground(DIM_BG));
  const withBrightBg = shadesOfGray(frameWithBackground(BRIGHT_BG));

  const i = ((FACE.y0 + 5) * W + (FACE.x0 + 5)) * 4;
  const moved = withDimBg[i] !== withBrightBg[i]
    || withDimBg[i + 1] !== withBrightBg[i + 1]
    || withDimBg[i + 2] !== withBrightBg[i + 2];
  assert.ok(moved, "expected the unmasked estimate to be pulled by the background swap");
});

test("the correction is still applied to EVERY pixel, background included — never per-region", () => {
  // Two pixels with the SAME input colour, one inside the sampled face
  // region and one outside it, must get the SAME output colour. A per-region
  // implementation (item 1's forbidden shape) would give them different
  // corrections; a single frame-wide estimate applied everywhere gives them
  // the same one regardless of which pixel fed the estimate.
  const mask = rectMask();
  const data = frameWithBackground(BRIGHT_BG);
  const shared = [160, 120, 100];
  const faceX = FACE.x0 + 2, faceY = FACE.y0 + 2;
  const bgX = 5, bgY = 5; // well outside FACE
  for (const [x, y] of [[faceX, faceY], [bgX, bgY]]) {
    const i = (y * W + x) * 4;
    data[i] = shared[0]; data[i + 1] = shared[1]; data[i + 2] = shared[2];
  }

  const out = shadesOfGray(data, 6, mask);
  const iFace = (faceY * W + faceX) * 4;
  const iBg = (bgY * W + bgX) * 4;
  assert.equal(out[iFace], out[iBg], "same input colour must get the same correction everywhere");
  assert.equal(out[iFace + 1], out[iBg + 1]);
  assert.equal(out[iFace + 2], out[iBg + 2]);
  // And it must actually have BEEN corrected (not silently skipped/identity
  // for the out-of-mask pixel) — the input was neutral-ish grey-brown, not
  // already colour-balanced, so the output must differ from the input.
  assert.notEqual(out[iBg], shared[0]);
});

test("a mask matching nothing falls back to the whole-frame estimate, not a refusal", () => {
  const emptyMask = new Uint8Array(W * H); // all zero
  const data = frameWithBackground(DIM_BG);
  const masked = shadesOfGray(data, 6, emptyMask);
  const unmasked = shadesOfGray(data);
  assert.deepEqual(Array.from(masked), Array.from(unmasked));
});

test("passing no mask reproduces the pre-existing whole-frame result bit-for-bit", () => {
  // The default-parameter path must be untouched by this change. This is the
  // unit-level version of the engine-bench fingerprint's empty diff for
  // every unmasked call site.
  const data = frameWithBackground(BRIGHT_BG);
  const a = shadesOfGray(data, 6);
  const b = shadesOfGray(data, 6, null);
  assert.deepEqual(Array.from(a), Array.from(b));
});

// -------------------------------------------------------- mask geometry ---

test("rasteriseHullInto fills a simple square hull exactly", () => {
  const hull = [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 20 }];
  const mask = new Uint8Array(30 * 30);
  rasteriseHullInto(hull, mask, 30, 30);
  assert.equal(mask[15 * 30 + 15], 1, "centre of the square must be filled");
  assert.equal(mask[5 * 30 + 5], 0, "well outside the square must not be filled");
  assert.equal(mask[25 * 30 + 25], 0, "well outside the square must not be filled");
});

test("rasteriseHullInto is additive — an already-set pixel from an earlier hull stays set", () => {
  const mask = new Uint8Array(30 * 30);
  mask[15 * 30 + 15] = 1;
  // A hull that does NOT cover (15,15) must not be able to clear it.
  rasteriseHullInto([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }], mask, 30, 30);
  assert.equal(mask[15 * 30 + 15], 1);
});

test("unionFootprintMask skips a dropped zone instead of throwing", () => {
  const degenerate = { idx: [0, 1], pad: 0 }; // fewer than 3 points resolve → hullFor returns null
  const pts = [{ x: 5, y: 5 }, { x: 6, y: 6 }];
  const mask = unionFootprintMask([degenerate], pts, 20, 20);
  assert.equal(mask.reduce((s, v) => s + v, 0), 0);
});

test("the real face union covers a plausible minority of the working canvas, on the canonical face", () => {
  const W2 = 768, H2 = 1024;
  const pts = canonicalFace();
  const mask = unionFootprintMask(Object.values(ROIS), pts, W2, H2);
  const covered = mask.reduce((s, v) => s + v, 0);
  const fraction = covered / (W2 * H2);
  // Every configured zone is a real facial feature, not the whole frame —
  // this is a sanity band, not a precise claim, and it also proves the union
  // is non-empty (roiFootprint's own extraction test already proves every
  // individual zone survives on this fixture).
  assert.ok(fraction > 0.05 && fraction < 0.6,
    `face union covers ${(fraction * 100).toFixed(1)}% of the frame — expected a real minority`);
});

test("the production ROI union pins a background swap, with an unmasked negative control", () => {
  const w = 192, h = 256;
  const points = canonicalFace({ bizygomatic: 115.25, cx: 96, cy: 128 });
  const mask = unionFootprintMask(Object.values(ROIS), points, w, h);
  assert.ok(mask.some(Boolean), "non-empty production geometry is required");
  const frame = (background) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < mask.length; i++) {
      const skin = [180 + (i % w < w / 2 ? 8 : 0), 130, 110];
      data.set([...(mask[i] ? skin : background), 255], i * 4);
    }
    return data;
  };
  const dim = frame(DIM_BG), bright = frame(BRIGHT_BG);
  const a = shadesOfGray(dim, 6, mask), b = shadesOfGray(bright, 6, mask);
  const oldA = shadesOfGray(dim), oldB = shadesOfGray(bright);
  let changedWithoutMask = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    for (let c = 0; c < 3; c++) {
      assert.equal(a[i * 4 + c], b[i * 4 + c]);
      if (oldA[i * 4 + c] !== oldB[i * 4 + c]) changedWithoutMask++;
    }
  }
  assert.ok(changedWithoutMask > 0, "negative control must detect the old background dependence");
});
