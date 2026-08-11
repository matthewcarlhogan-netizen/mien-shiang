import { test } from "node:test";
import assert from "node:assert/strict";

import {
  frameStats, normaliseMotionPx, MOTION_REFERENCE_WIDTH,
} from "../../src/qise/framestats.js";

const pixels = (count, value) => Array.from({ length: count }, () => ({ r: value, g: value, b: value }));

test("motion is normalised to one camera width", () => {
  assert.equal(MOTION_REFERENCE_WIDTH, 1280);
  assert.equal(normaliseMotionPx([6, 6], 2560), 3);
  assert.equal(normaliseMotionPx([3, 3], 640), 6);
  assert.equal(normaliseMotionPx([], 1280), 0);
});

test("frame statistics read exposure and cheeks from a synthetic capture", () => {
  const rois = {
    validCount: 7,
    rois: {
      quan_l: { pixels: [...pixels(34, 80), ...pixels(2, 255)] },
      quan_r: { pixels: [...pixels(34, 72), ...pixels(2, 0)] },
    },
  };
  const stats = frameStats(null, rois, 2560, [8, 4], { yaw: 1, pitch: 2, roll: 3 });
  assert.equal(stats.skinPixelCount, 72);
  assert.equal(stats.skinPixelsAtOrAbove250, 2);
  assert.equal(stats.skinPixelsAtOrBelow12, 2);
  assert.equal(stats.validRoiCount, 7);
  assert.equal(stats.landmarkDriftPx, 3);
  assert.deepEqual(stats.pose, { yaw: 1, pitch: 2, roll: 3 });
  assert.ok(stats.cheekMedianL.left > stats.cheekMedianL.right);
  assert.ok(Number.isFinite(stats.laplacianVariance));
});
