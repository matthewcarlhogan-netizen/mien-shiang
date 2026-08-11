/*
 * Capture statistics, kept out of the DOM loop so camera tolerance is tested
 * against real pixel buffers rather than inferred from screenshots.
 *
 * Motion is expressed at a 1280px reference width. MediaPipe coordinates are
 * scaled into the camera buffer, so the old raw-pixel gate was twice as strict
 * on a 2560px phone stream as on a 1280px stream even when the head moved by
 * the same fraction of the frame.
 */
import * as color from "./color.js";

export const MOTION_REFERENCE_WIDTH = 1280;

export function normaliseMotionPx(samples, frameWidth, referenceWidth = MOTION_REFERENCE_WIDTH) {
  const values = (samples || []).filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!Number.isFinite(frameWidth) || frameWidth <= 0) return mean;
  return mean * (referenceWidth / frameWidth);
}

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const luminanceOf = (pixel) => 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;

/**
 * Spatial four-neighbour Laplacian variance, a real focus/softening signal.
 * The previous implementation measured ordinary cheek brightness variance;
 * an evenly lit sharp cheek could therefore fail while a blurry shadow edge
 * passed. Coordinates come from `sampleRoiPixels` and are never retained.
 */
export function spatialLaplacianVariance(pixels, { minSamples = 32 } = {}) {
  const located = (pixels || []).filter((pixel) => Number.isInteger(pixel.x)
    && Number.isInteger(pixel.y));
  if (located.length < minSamples) return null;

  const field = new Map(located.map((pixel) => [`${pixel.x}:${pixel.y}`, luminanceOf(pixel)]));
  const responses = [];
  for (const pixel of located) {
    const left = field.get(`${pixel.x - 1}:${pixel.y}`);
    const right = field.get(`${pixel.x + 1}:${pixel.y}`);
    const up = field.get(`${pixel.x}:${pixel.y - 1}`);
    const down = field.get(`${pixel.x}:${pixel.y + 1}`);
    if (![left, right, up, down].every(Number.isFinite)) continue;
    responses.push(4 * luminanceOf(pixel) - left - right - up - down);
  }
  if (responses.length < minSamples) return null;
  const mean = responses.reduce((sum, value) => sum + value, 0) / responses.length;
  return responses.reduce((sum, value) => sum + (value - mean) ** 2, 0) / responses.length;
}

/** Gather the values used by the capture gates in one pass over the ROIs. */
export function frameStats(image, rois, frameWidth, drift, pose) {
  void image; // The pixels are already reduced into `rois`; never retain them.
  let total = 0;
  let hot = 0;
  let cold = 0;
  let laplacianVariance = null;
  const cheekL = [];
  const cheekR = [];

  for (const [name, roi] of Object.entries(rois?.rois || {})) {
    for (const pixel of roi.pixels || []) {
      total++;
      const luminance = luminanceOf(pixel);
      if (luminance >= 250) hot++;
      if (luminance <= 12) cold++;
      if (name === "quan_l") cheekL.push(color.labFromSrgb8(pixel.r, pixel.g, pixel.b).L);
      if (name === "quan_r") cheekR.push(color.labFromSrgb8(pixel.r, pixel.g, pixel.b).L);
    }
  }

  // Use both cheeks so a shadow, beard edge or temporary landmark wobble on
  // one side cannot decide focus for the whole camera frame.
  const sharpness = ["quan_l", "quan_r"].map((name) =>
    spatialLaplacianVariance(rois?.rois?.[name]?.pixels)).filter(Number.isFinite);
  laplacianVariance = median(sharpness);

  return {
    frameWidth,
    pose,
    skinPixelCount: total,
    skinPixelsAtOrAbove250: hot,
    skinPixelsAtOrBelow12: cold,
    cheekMedianL: { left: median(cheekL), right: median(cheekR) },
    landmarkDriftPx: normaliseMotionPx(drift, frameWidth),
    validRoiCount: Number.isFinite(rois?.validCount) ? rois.validCount : 0,
    laplacianVariance,
  };
}
