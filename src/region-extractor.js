/* Shared browser-side extraction for the classic facial zones. */

import { regionStats } from "./engine.js";
import { ROIS } from "./zones.js";
import { roiFootprint } from "./roi.js";

/** Extract all configured regions from an already white-balanced RGBA buffer. */
export function extractRegions(balanced, w, h, pts, documentRef = document, deps = {}) {
  const regions = {};
  const dropped = {};
  const statsFor = deps.regionStats || regionStats;

  try {
    for (const [key, def] of Object.entries(ROIS)) {
    const fp = roiFootprint(def, pts, w, h);
    if (fp.dropped) {
      dropped[key] = { reason: fp.dropped, rw: fp.rw, rh: fp.rh };
      continue;
    }
    const { hull, x0, y0, rw, rh } = fp;
    const canvas = documentRef.createElement("canvas");
    canvas.width = rw;
    canvas.height = rh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.beginPath();
    hull.forEach((point, index) => index
      ? ctx.lineTo(point.x - x0, point.y - y0)
      : ctx.moveTo(point.x - x0, point.y - y0));
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    const maskData = ctx.getImageData(0, 0, rw, rh).data;
    const mask = new Uint8Array(rw * rh);
    const rgba = new Uint8ClampedArray(rw * rh * 4);
    let committed = false;

    try {
      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          const i = y * rw + x;
          mask[i] = maskData[i * 4 + 3] > 128 ? 1 : 0;
          const source = ((y + y0) * w + (x + x0)) * 4;
          rgba[i * 4] = balanced[source];
          rgba[i * 4 + 1] = balanced[source + 1];
          rgba[i * 4 + 2] = balanced[source + 2];
          rgba[i * 4 + 3] = 255;
        }
      }

      regions[key] = {
        ...def, key, hull, w: rw, h: rh, mask,
        stats: statsFor(rgba, mask, rw, rh),
      };
      committed = true;
    } finally {
      rgba.fill(0);
      maskData.fill(0);
      canvas.width = 0;
      canvas.height = 0;
      if (!committed) mask.fill(0);
    }
    }
    return { regions, dropped };
  } catch (error) {
    eraseExtractedRegions(regions);
    throw error;
  }
}

/** Erase transient typed arrays after their scalar reading has been built. */
export function eraseExtractedRegions(regions) {
  for (const region of Object.values(regions || {})) {
    region.mask?.fill?.(0);
    region.stats?.gray?.fill?.(0);
    region.hull = [];
  }
}
