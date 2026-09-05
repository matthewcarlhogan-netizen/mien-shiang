/*
 * ROI footprint geometry — pure, no DOM.
 *
 * Split out of analysis.js for the reason geometry.js and expression.js are:
 * analysis.js imports the MediaPipe bundle from a CDN at module scope, so it
 * cannot be loaded under `node --test` at all, and anything living inside it is
 * therefore covered by nothing (CLAUDE.md item 18a).
 *
 * That is not a hypothetical here. The nose_bridge ROI was defined from five
 * COLLINEAR midline landmarks, so its convex hull was ~4px wide and the size
 * floor below dropped it on every real face — which silently disabled the
 * Module B malar gate that reads that zone. Every test supplied nose_bridge by
 * hand and bypassed this code, so 199 tests passed while the gate was dead.
 * The decision of whether a zone survives extraction now lives here, where a
 * test can reach it without a browser or a face photo.
 *
 * The canvas rasterisation of the hull to a mask stays in analysis.js: it needs
 * a real 2D context, and it is not where the defect was.
 */

/**
 * Minimum bounding-box side, in pixels, for a region to be measurable.
 *
 * Below this there are too few pixels for the colorimetry to mean anything —
 * this floor is correct and is NOT what to relax if a zone goes missing. A zone
 * that trips it has a badly chosen landmark set; fix the landmarks.
 */
export const MIN_ROI_PX = 8;

/**
 * Diagnostic probe radius in WORKING-IMAGE pixels, not a measured guarantee
 * about MediaPipe jitter. The design assumption is a 2px shift plus a 1px
 * rasterisation margin. Both are uncalibrated. A fixed 3px means a different
 * fraction of a zone at each resolution; changing it needs device evidence,
 * not a convenient pass rate. See docs/PR52_RELEASE_GATES.md for scale and
 * low-end tuning limitations. The translated-hull test proves the mechanism
 * on a synthetic +/-3px sweep, not this assumption on real faces.
 */
export const BOUNDARY_EROSION_PX = 3;

/**
 * Binary morphological erosion: a masked pixel survives only if every pixel
 * within `radiusPx` (Chebyshev / box neighbourhood, not a circular one — a
 * square structuring element is what a `radiusPx`-wide jitter in any
 * direction actually threatens, and it is cheap to get exactly right) is
 * ALSO masked. What remains is the pixels that would stay inside the region
 * even if the hull that produced `mask` had landed `radiusPx` px differently.
 *
 * Pure array math over an already-rasterised mask, not a polygon offset of
 * the hull — the hull is a geometric contour, but what a boundary-sensitivity
 * check actually needs to know is which raster pixels are robust to a small
 * shift of that contour, and eroding the raster answers that directly without
 * a second, only-approximately-equivalent computational-geometry codepath.
 */
export function erodeMask(mask, w, h, radiusPx = BOUNDARY_EROSION_PX) {
  const r = Math.max(0, radiusPx | 0);
  const eroded = new Uint8Array(w * h);
  if (r === 0) { eroded.set(mask); return eroded; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;

      let survives = true;
      for (let dy = -r; dy <= r && survives; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) { survives = false; break; }
        const rowBase = ny * w;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || !mask[rowBase + nx]) { survives = false; break; }
        }
      }
      eroded[i] = survives ? 1 : 0;
    }
  }
  return eroded;
}

/**
 * Convex hull of the selected landmarks, expanded about its centroid by `pad`.
 *
 * @returns {Array<{x:number,y:number}>|null} null when fewer than 3 landmarks
 *   resolve, which is the only case the caller cannot do anything with.
 */
export function hullFor(idx, pts, pad) {
  const sel = idx.map((i) => pts[i]).filter(Boolean);
  if (sel.length < 3) return null;

  // Monotone chain convex hull.
  const p = [...sel].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [], upper = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));

  const cx = hull.reduce((s, q) => s + q.x, 0) / hull.length;
  const cy = hull.reduce((s, q) => s + q.y, 0) / hull.length;
  return hull.map((q) => ({
    x: cx + (q.x - cx) * (1 + pad),
    y: cy + (q.y - cy) * (1 + pad),
  }));
}

/**
 * Even-odd fill of a hull into a full-frame mask, in the hull's own
 * (frame-absolute) coordinates — no DOM, no canvas, so it is reachable from
 * `node --test` where region-extractor.js's real 2D context is not.
 * Pixel centres are sampled at `+0.5`, matching the convention
 * scripts/engine-bench.mjs already uses for its own non-DOM equivalent of
 * region-extractor.js's canvas fill.
 *
 * @param {Array<{x:number,y:number}>} hull
 * @param {Uint8Array} into a w*h mask, OR'd in place (existing 1s untouched)
 */
export function rasteriseHullInto(hull, into, w, h) {
  const n = hull.length;
  if (n < 3) return;
  for (let y = 0; y < h; y++) {
    const py = y + 0.5;
    for (let x = 0; x < w; x++) {
      if (into[y * w + x]) continue; // already covered by an earlier hull
      const px = x + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = hull[i].y, yj = hull[j].y;
        if ((yi > py) !== (yj > py)) {
          const xint = hull[i].x + ((py - yi) / (yj - yi)) * (hull[j].x - hull[i].x);
          if (px < xint) inside = !inside;
        }
      }
      if (inside) into[y * w + x] = 1;
    }
  }
}

/**
 * The union of every zone's hull, as one full-frame mask — "the face, as far
 * as the measurement config already knows how to find it", built from
 * existing, already-tested ROI geometry rather than a new face-oval landmark
 * set with its own degenerate-hull risk (item 23's whole lesson).
 *
 * A zone that drops (roiFootprint's `dropped` reason) contributes nothing
 * and is skipped rather than failing the whole union — losing one zone's
 * worth of sample pixels out of a dozen-plus is not the same failure as
 * losing the only zone a caller supplied one of, and shadesOfGray()'s own
 * too-small-sample fallback is what protects the pathological case where
 * every zone drops.
 *
 * @param {Array<{idx:number[], pad:number}>} defs e.g. Object.values(ROIS)
 * @param {Array<{x:number,y:number}>} pts
 * @returns {Uint8Array} w*h, one entry per pixel
 */
export function unionFootprintMask(defs, pts, w, h) {
  const mask = new Uint8Array(w * h);
  for (const def of defs) {
    const fp = roiFootprint(def, pts, w, h);
    if (fp.dropped) continue;
    rasteriseHullInto(fp.hull, mask, w, h);
  }
  return mask;
}

/**
 * Where a zone lands on the frame, and whether it survives at all.
 *
 * Returns a `dropped` REASON rather than a bare null. A zone vanishing and a
 * zone legitimately refusing to measure are different events, and collapsing
 * them is exactly how the malar gate stayed dead: the safety adapter's honest
 * deep-skin refusal and a missing zone produced an identical result object.
 *
 * @returns {{dropped:null, hull:Array, x0:number, y0:number, rw:number, rh:number}
 *          |{dropped:"no_hull"|"too_small", hull:Array|null, rw:number, rh:number}}
 */
export function roiFootprint(def, pts, w, h) {
  const hull = hullFor(def.idx, pts, def.pad);
  if (!hull) return { dropped: "no_hull", hull: null, rw: 0, rh: 0 };

  const x0 = Math.max(0, Math.floor(Math.min(...hull.map((q) => q.x))));
  const y0 = Math.max(0, Math.floor(Math.min(...hull.map((q) => q.y))));
  const x1 = Math.min(w, Math.ceil(Math.max(...hull.map((q) => q.x))));
  const y1 = Math.min(h, Math.ceil(Math.max(...hull.map((q) => q.y))));
  const rw = x1 - x0, rh = y1 - y0;

  if (rw < MIN_ROI_PX || rh < MIN_ROI_PX) return { dropped: "too_small", hull, rw, rh };
  return { dropped: null, hull, x0, y0, rw, rh };
}
