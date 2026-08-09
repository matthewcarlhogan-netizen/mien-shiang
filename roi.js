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
