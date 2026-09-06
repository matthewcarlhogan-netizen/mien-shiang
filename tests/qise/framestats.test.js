import { test } from "node:test";
import assert from "node:assert/strict";

import {
  frameStats, normaliseMotionPx, spatialLaplacianVariance, MOTION_REFERENCE_WIDTH,
} from "../../src/qise/framestats.js";

const pixels = (count, value) => Array.from({ length: count }, () => ({ r: value, g: value, b: value }));
const gridPixels = (width, height, valueAt, xOffset = 0) => Array.from(
  { length: width * height },
  (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const value = valueAt(x, y, index);
    return { x: x + xOffset, y, r: value, g: value, b: value };
  },
);

test("motion is normalised to one camera width", () => {
  assert.equal(MOTION_REFERENCE_WIDTH, 1280);
  assert.equal(normaliseMotionPx([6, 6], 2560), 3);
  assert.equal(normaliseMotionPx([3, 3], 640), 6);
  // Empty is not a measurement of stillness. It is the absence of one — the
  // shape literally the first mesh frame of a capture produces, since drift
  // needs a previous frame to exist. Reporting 0 there was a fabricated
  // pass, exactly the class of defect CLAUDE.md item 43 already names for an
  // unmeasured pose axis.
  assert.equal(normaliseMotionPx([], 1280), null);
});

test("frame statistics read exposure and cheeks from a synthetic capture", () => {
  const rois = {
    validCount: 7,
    rois: {
      quan_l: { pixels: gridPixels(8, 8, (x, y, index) => index >= 62 ? 255 : ((x + y) % 2 ? 88 : 72)) },
      quan_r: { pixels: gridPixels(8, 8, (x, y, index) => index >= 62 ? 0 : ((x + y) % 2 ? 80 : 64), 12) },
    },
  };
  const stats = frameStats(null, rois, 2560, [8, 4], { yaw: 1, pitch: 2, roll: 3 });
  assert.equal(stats.skinPixelCount, 128);
  assert.equal(stats.skinPixelsAtOrAbove250, 2);
  assert.equal(stats.skinPixelsAtOrBelow12, 2);
  assert.equal(stats.validRoiCount, 7);
  assert.equal(stats.landmarkDriftPx, 3);
  assert.deepEqual(stats.pose, { yaw: 1, pitch: 2, roll: 3 });
  assert.ok(stats.cheekMedianL.left > stats.cheekMedianL.right);
  assert.ok(Number.isFinite(stats.laplacianVariance));
});

test("spatial Laplacian distinguishes sharp texture from a smooth gradient", () => {
  const sharp = gridPixels(10, 10, (x, y) => (x + y) % 2 ? 180 : 60);
  const smooth = gridPixels(10, 10, (x, y) => 80 + x + y);
  assert.ok(spatialLaplacianVariance(sharp) > 1000);
  assert.ok(spatialLaplacianVariance(smooth) < 0.001);
  assert.equal(spatialLaplacianVariance(pixels(100, 80)), null,
    "colour samples without spatial coordinates must not pretend to measure focus");
});
