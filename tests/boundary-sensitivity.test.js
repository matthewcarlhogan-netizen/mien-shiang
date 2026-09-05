/*
 * Landmark-jitter confidence for ROI extraction.
 *
 * Deliberately does NOT touch regionStats() or any of its scalars — see the
 * comment on boundarySensitivity() in engine.js for why a weighted-mask
 * retrofit was rejected in favour of comparing the SAME unweighted erythema
 * centre over two masks (full vs eroded). This file is what proves that
 * comparison actually distinguishes the failure mode it exists to catch: a
 * hull crossing a high-contrast boundary reads as sensitive, a flat region
 * does not, and a region too small to erode fails safe rather than silently
 * reporting itself stable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { erodeMask, BOUNDARY_EROSION_PX } from "../src/roi.js";
import {
  boundarySensitivity, regionStats, BOUNDARY_SENSITIVITY_EI_THRESHOLD, BOUNDARY_SENSITIVITY_FOCAL_THRESHOLD,
} from "../src/engine.js";

const W = 40, H = 40;

/** A filled square mask, `inset` px in from every edge of the W×H frame. */
function squareMask(inset) {
  const mask = new Uint8Array(W * H);
  for (let y = inset; y < H - inset; y++) {
    for (let x = inset; x < W - inset; x++) mask[y * W + x] = 1;
  }
  return mask;
}

/** Deterministic near-uniform patch, optionally with a differently-coloured
 *  ring `ringPx` wide around the very edge of the mask's bounding square. */
function rgbaWithRing(rgb, ringRgb, inset, ringPx) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  let s = 7;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff - 0.5) * 2; };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const nearEdge = ringRgb && (
        x < inset + ringPx || x >= W - inset - ringPx ||
        y < inset + ringPx || y >= H - inset - ringPx
      );
      const base = nearEdge ? ringRgb : rgb;
      rgba[i * 4] = Math.max(0, Math.min(255, base[0] + rnd() * 2));
      rgba[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + rnd() * 2));
      rgba[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + rnd() * 2));
      rgba[i * 4 + 3] = 255;
    }
  }
  return rgba;
}

// ------------------------------------------------------------- erodeMask ---

test("erodeMask shrinks a filled square by exactly its radius", () => {
  const inset = 5;
  const mask = squareMask(inset);
  const eroded = erodeMask(mask, W, H, 3);

  // A pixel `inset + 3` from the edge was 3px inside the mask on every side —
  // it must survive.
  const survivorIndex = (inset + 3) * W + (inset + 3);
  assert.equal(eroded[survivorIndex], 1);

  // A pixel exactly on the mask's own edge is 0px from the boundary in at
  // least one direction and must not survive erosion by any radius > 0.
  const edgeIndex = inset * W + inset;
  assert.equal(mask[edgeIndex], 1, "test setup: this pixel is inside the un-eroded mask");
  assert.equal(eroded[edgeIndex], 0);
});

test("erodeMask(radius=0) is the identity", () => {
  const mask = squareMask(5);
  const eroded = erodeMask(mask, W, H, 0);
  assert.deepEqual(Array.from(eroded), Array.from(mask));
});

test("erodeMask empties a region no wider than twice its radius", () => {
  // A 4px-inset-from-a-40px-frame square is 32px wide — comfortably larger
  // than 2*BOUNDARY_EROSION_PX, so shrink it further until it genuinely
  // cannot survive a BOUNDARY_EROSION_PX erosion: an 3px-wide filled strip.
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 18; x < 21; x++) mask[y * W + x] = 1;
  const eroded = erodeMask(mask, W, H, BOUNDARY_EROSION_PX);
  assert.equal(eroded.reduce((n, v) => n + v, 0), 0,
    "a 3px-wide strip has no pixel with a full BOUNDARY_EROSION_PX neighbourhood inside it");
});

// ------------------------------------------------------- boundarySensitivity ---

test("a flat region stays quiet — boundarySensitive is false", () => {
  const inset = 4;
  const mask = squareMask(inset);
  const rgba = rgbaWithRing([180, 130, 110], null, inset, 0); // no ring: uniform
  const eroded = erodeMask(mask, W, H, BOUNDARY_EROSION_PX);

  const result = boundarySensitivity(rgba, mask, eroded, W, H);
  assert.equal(result.sensitive, false);
  assert.ok(result.deltaEi < BOUNDARY_SENSITIVITY_EI_THRESHOLD);
});

test("a hull crossing a high-contrast boundary fires boundarySensitive", () => {
  const inset = 4;
  const mask = squareMask(inset);
  // A visibly redder ring exactly BOUNDARY_EROSION_PX wide sits at the mask's
  // own edge — the pixels erosion removes are precisely the contaminated
  // ones, so the full-mask centre is pulled toward red and the eroded-mask
  // centre is not.
  const rgba = rgbaWithRing([180, 130, 110], [230, 60, 60], inset, BOUNDARY_EROSION_PX);
  const eroded = erodeMask(mask, W, H, BOUNDARY_EROSION_PX);

  const result = boundarySensitivity(rgba, mask, eroded, W, H);
  assert.equal(result.sensitive, true);
  // The centre stays put — a 34%-of-region ring is a minority, and item 30
  // already establishes robustCentreOf() cannot see minority contamination
  // whatever its magnitude. focalExcess is what catches it; asserting on
  // deltaEi here would be asserting the wrong statistic moved.
  assert.ok(result.deltaEi <= BOUNDARY_SENSITIVITY_EI_THRESHOLD,
    `expected the centre to stay put (this is the case item 30 predicts it must), got deltaEi=${result.deltaEi}`);
  assert.ok(result.deltaFocalEi > BOUNDARY_SENSITIVITY_FOCAL_THRESHOLD,
    `expected the ring to move the focal excess past the threshold, got deltaFocalEi=${result.deltaFocalEi}`);
});

test("a neutral (non-reddening) contamination at the boundary stays quiet", () => {
  // White/grey contamination has R===G, so erythemaIndex = 100*log10(1) = 0 —
  // it does not read as REDNESS even though it is visually a strong contrast.
  // boundarySensitivity is scoped to the erythema-relevant scalar on purpose
  // (the safety gate's most sensitive one, item 2), not to "any pixel-value
  // difference at all", so this must not fire.
  const inset = 4;
  const mask = squareMask(inset);
  const rgba = rgbaWithRing([180, 130, 110], [255, 255, 255], inset, BOUNDARY_EROSION_PX);
  const eroded = erodeMask(mask, W, H, BOUNDARY_EROSION_PX);

  const result = boundarySensitivity(rgba, mask, eroded, W, H);
  assert.equal(result.sensitive, false);
});

test("a region too small to erode fails SENSITIVE, not silently stable", () => {
  const mask = new Uint8Array(W * H);
  for (let y = 15; y < 20; y++) for (let x = 15; x < 20; x++) mask[y * W + x] = 1; // 5x5
  const eroded = erodeMask(mask, W, H, BOUNDARY_EROSION_PX);
  assert.equal(eroded.reduce((n, v) => n + v, 0), 0, "test setup: 5x5 does not survive a 3px erosion");

  const rgba = rgbaWithRing([180, 130, 110], null, 0, 0);
  const result = boundarySensitivity(rgba, mask, eroded, W, H);
  assert.equal(result.sensitive, true);
  assert.equal(result.reason, "eroded_too_small");
});

test("boundary sensitivity correlates with measured focal-EI variation under translated hull jitter", (t) => {
  // Fixed pixels, moving hulls: unlike the static ring fixture, this actually
  // changes which samples a landmark shift admits. Sweep boundary contrast,
  // not the decision thresholds. This is a mechanism test, not device proof.
  const rows = [0, 10, 20, 40, 60, 80].map((contrast) => {
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = x < 9;
      rgba.set([180 + (edge ? contrast / 2 : 0), 130 - (edge ? contrast : 0), 110, 255], (y * W + x) * 4);
    }
    const masks = [-3, -2, -1, 0, 1, 2, 3].map((dx) => {
      const mask = new Uint8Array(W * H);
      for (let y = 7; y < 33; y++) for (let x = 7 + dx; x < 33 + dx; x++) mask[y * W + x] = 1;
      return mask;
    });
    const observed = masks.map((mask) => regionStats(rgba, mask, W, H).focalEi);
    const diagnostics = masks.map((mask) => boundarySensitivity(rgba, mask, erodeMask(mask, W, H), W, H));
    return {
      contrast,
      variation: Math.max(...observed) - Math.min(...observed),
      sensitivity: Math.max(...diagnostics.map((d) => d.deltaFocalEi)),
      flagged: diagnostics.some((d) => d.sensitive),
    };
  });
  assert.equal(rows[0].variation, 0, "negative control: shifting a uniform patch changes nothing");
  assert.equal(rows[0].flagged, false);
  assert.ok(rows.at(-1).variation > 1.5, "positive control: moving the hull changes the measured statistic");
  assert.equal(rows.at(-1).flagged, true);
  const mean = (key) => rows.reduce((s, r) => s + r[key], 0) / rows.length;
  const mx = mean("variation"), my = mean("sensitivity");
  const cov = rows.reduce((s, r) => s + (r.variation - mx) * (r.sensitivity - my), 0);
  const vx = rows.reduce((s, r) => s + (r.variation - mx) ** 2, 0);
  const vy = rows.reduce((s, r) => s + (r.sensitivity - my) ** 2, 0);
  const correlation = cov / Math.sqrt(vx * vy);
  assert.ok(Number.isFinite(correlation) && correlation > 0.9, `mechanism correlation: ${correlation}`);
  t.diagnostic(JSON.stringify({ correlation, rows }));
});
