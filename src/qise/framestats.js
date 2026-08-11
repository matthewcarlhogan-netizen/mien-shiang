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
      const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
      if (luminance >= 250) hot++;
      if (luminance <= 12) cold++;
      if (name === "quan_l") cheekL.push(color.labFromSrgb8(pixel.r, pixel.g, pixel.b).L);
      if (name === "quan_r") cheekR.push(color.labFromSrgb8(pixel.r, pixel.g, pixel.b).L);
    }
  }

  // Variance over the cheek samples is the existing conservative smoothing
  // backstop. It is deliberately not histogram-equalised: doing so would make
  // a beauty filter look like texture that the camera never captured.
  const cheek = rois?.rois?.quan_l;
  if (cheek && cheek.pixels && cheek.pixels.length > 32) {
    const values = cheek.pixels.map((pixel) => color.labFromSrgb8(pixel.r, pixel.g, pixel.b).L);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    laplacianVariance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  }

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
