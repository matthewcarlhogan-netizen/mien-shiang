/*
 * Synthetic frames, built from MediaPipe's canonical reference mesh.
 *
 * No real face appears in this repository, and none should: a 478-point mesh
 * of a real subject is a biometric template. The canonical model is a
 * published average that ships with the library, and every property under test
 * here is a property of the mesh TOPOLOGY, which is identical for every user.
 *
 * Not a test file — the runner matches /\.test\.m?js$/, so this is imported
 * rather than discovered.
 */
import { canonicalFace } from "../../fixtures/canonical-face.js";
import { hullFor } from "../../../src/roi.js";
import { QISE_ROIS, ROI_INSET, pointInPolygon } from "../../../src/qise/rois.js";

export const FRAME_W = 768;
export const FRAME_H = 1024;

export { canonicalFace };

/** The four scleral triangles, in the same order sclera.js samples them. */
export const SCLERA_TRIANGLES = [
  [133, 158, 153], [33, 160, 144], [362, 385, 380], [263, 387, 373],
];

export function blankImage(w = FRAME_W, h = FRAME_H, rgb = [0, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

/** Paint every pixel inside a hull. `rgb` may be a function of (x, y). */
export function fillPolygon(img, hull, rgb) {
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const x1 = Math.min(img.width, Math.ceil(Math.max(...xs)));
  const y1 = Math.min(img.height, Math.ceil(Math.max(...ys)));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!pointInPolygon(x + 0.5, y + 0.5, hull)) continue;
      const c = typeof rgb === "function" ? rgb(x, y) : rgb;
      const i = (y * img.width + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  return img;
}

/** Horizontal flip — what a front camera does to the preview. */
export function flipHorizontal(img) {
  const out = blankImage(img.width, img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (y * img.width + (img.width - 1 - x)) * 4;
      const dst = (y * img.width + x) * 4;
      for (let k = 0; k < 4; k++) out.data[dst + k] = img.data[src + k];
    }
  }
  return out;
}

/** The un-mirrored hull for one named region, as the pixels actually land. */
export function roiHull(pts, name, which = 0) {
  return hullFor(QISE_ROIS[name].polygons[which], pts, -ROI_INSET);
}

/**
 * A synthetic face: uniform skin in every region, with per-region overrides.
 *
 * @param {{skin?:number[], sclera?:number[], perRoi?:Object<string,number[]>,
 *          background?:number[], pts?:Array}} spec
 */
export function syntheticFace(spec = {}) {
  const pts = spec.pts ?? canonicalFace();
  const skin = spec.skin ?? [200, 150, 140];
  const sclera = spec.sclera ?? [230, 230, 228];
  const img = blankImage(FRAME_W, FRAME_H, spec.background ?? [20, 20, 24]);

  for (const [name, def] of Object.entries(QISE_ROIS)) {
    for (let i = 0; i < def.polygons.length; i++) {
      const hull = hullFor(def.polygons[i], pts, -ROI_INSET);
      if (!hull) continue;
      fillPolygon(img, hull, (spec.perRoi && spec.perRoi[name]) || skin);
    }
  }
  for (const idx of SCLERA_TRIANGLES) {
    const hull = hullFor(idx, pts, -0.25);
    if (hull) fillPolygon(img, hull, sclera);
  }
  return { img, pts };
}

/** Mean sRGB of the pixels a region covers, for assertions. */
export function meanOf(img, hull) {
  let r = 0, g = 0, b = 0, n = 0;
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(img.height, Math.ceil(Math.max(...ys))); y++) {
    for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(img.width, Math.ceil(Math.max(...xs))); x++) {
      if (!pointInPolygon(x + 0.5, y + 0.5, hull)) continue;
      const i = (y * img.width + x) * 4;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
    }
  }
  return n ? { r: r / n, g: g / n, b: b / n, n } : { r: 0, g: 0, b: 0, n: 0 };
}
