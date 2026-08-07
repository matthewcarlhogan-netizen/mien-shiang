/*
 * Mien Shiang — on-device facial analysis.
 *
 * Everything runs in the browser. The photo is drawn to a canvas, measured,
 * and discarded. Nothing is uploaded, nothing is stored, there is no server.
 * That is also the strongest privacy position available: a face photo tied to
 * an identity is biometric data, and the safest way to hold it is not to.
 */

import {
  FaceLandmarker, FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

import { analyse, rawScalars, shadesOfGray, regionStats, UNAVAILABLE } from "./engine.js";
import { ROIS } from "./zones.js";
import { runRules } from "./rules.js";
import { readComplexion } from "./adapters/entertainment.js";
import { evaluateSafety } from "./adapters/safety.js";
import { BUILD_FLAVOUR } from "./flags.js";
import { createLandmarkerWithFallback } from "./landmarker.js";
import { geometryReport } from "./geometry.js";
import { expressionState } from "./expression.js";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const MAX_DIM = 1024;              // downscale big phone photos before analysis
const EXPECTED_LANDMARKS = 478;    // 468 mesh + 10 iris

let landmarker = null;
let activeDelegate = null;   // "GPU" | "CPU" — surfaced in the debug view

// ------------------------------------------------------------------ model ---

async function getLandmarker(onProgress) {
  if (landmarker) return landmarker;
  onProgress?.("Loading face model (first run only, ~5 MB)…");
  const fileset = await FilesetResolver.forVisionTasks(WASM);

  // GPU first, CPU if that fails. The fallback logic lives in landmarker.js
  // with the factory injected, so it can be exercised by the test suite —
  // a fallback nobody has ever run is not a fallback.
  const built = await createLandmarkerWithFallback(
    FaceLandmarker.createFromOptions.bind(FaceLandmarker),
    fileset,
    { modelAssetPath: MODEL },
    onProgress,
  );
  landmarker = built.landmarker;
  activeDelegate = built.delegate;
  return landmarker;
}

/** Which delegate the current session actually got. Null before first load. */
export const getActiveDelegate = () => activeDelegate;

// ------------------------------------------------------------------ pixels --

function drawToCanvas(bitmap, unmirror) {
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });

  // Front cameras mirror the preview. Landmarking a mirrored frame inverts
  // laterality, which would swap the Liver and Lung cheek readings.
  if (unmirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(bitmap, 0, 0, w, h);
  return c;
}

/** Padded convex hull of a landmark set, in pixels. */
function hullFor(idx, pts, pad) {
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
 * Extract every region from the ALREADY WHITE-BALANCED full frame.
 *
 * Colour constancy is applied once to the whole frame upstream. Never
 * re-balance a crop: normalising each region separately drives them all toward
 * grey and erases the between-region differences the whole method measures.
 */
function extractRegions(balanced, w, h, pts) {
  const regions = {};

  for (const [key, def] of Object.entries(ROIS)) {
    const hull = hullFor(def.idx, pts, def.pad);
    if (!hull) continue;

    let x0 = Math.max(0, Math.floor(Math.min(...hull.map((q) => q.x))));
    let y0 = Math.max(0, Math.floor(Math.min(...hull.map((q) => q.y))));
    let x1 = Math.min(w, Math.ceil(Math.max(...hull.map((q) => q.x))));
    let y1 = Math.min(h, Math.ceil(Math.max(...hull.map((q) => q.y))));
    const rw = x1 - x0, rh = y1 - y0;
    if (rw < 8 || rh < 8) continue;

    // Rasterise the hull to a mask so background and hair pixels don't
    // contaminate the colour statistics.
    const mc = document.createElement("canvas");
    mc.width = rw; mc.height = rh;
    const mctx = mc.getContext("2d", { willReadFrequently: true });
    mctx.beginPath();
    hull.forEach((q, i) =>
      i ? mctx.lineTo(q.x - x0, q.y - y0) : mctx.moveTo(q.x - x0, q.y - y0));
    mctx.closePath();
    mctx.fillStyle = "#fff";
    mctx.fill();
    const maskData = mctx.getImageData(0, 0, rw, rh).data;

    const mask = new Uint8Array(rw * rh);
    const rgba = new Uint8ClampedArray(rw * rh * 4);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const i = y * rw + x;
        mask[i] = maskData[i * 4 + 3] > 128 ? 1 : 0;
        const src = ((y + y0) * w + (x + x0)) * 4;
        rgba[i * 4] = balanced[src];
        rgba[i * 4 + 1] = balanced[src + 1];
        rgba[i * 4 + 2] = balanced[src + 2];
        rgba[i * 4 + 3] = 255;
      }
    }

    regions[key] = {
      ...def, key, hull, w: rw, h: rh, mask,
      stats: regionStats(rgba, mask, rw, rh),
    };
  }
  return regions;
}

// ---------------------------------------------------------------- pipeline --

export async function runAnalysis(file, unmirror, onProgress) {
  const lm = await getLandmarker(onProgress);

  onProgress?.("Reading photo…");
  const bitmap = await createImageBitmap(file);
  const canvas = drawToCanvas(bitmap, unmirror);
  bitmap.close?.();

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width: w, height: h } = canvas;

  onProgress?.("Finding face…");
  const res = lm.detect(canvas);
  if (!res.faceLandmarks?.length) {
    throw new Error("No face found. Face the camera straight on, in even light.");
  }
  const raw = res.faceLandmarks[0];
  if (raw.length !== EXPECTED_LANDMARKS) {
    throw new Error(`Expected ${EXPECTED_LANDMARKS} landmarks, got ${raw.length}.`);
  }
  const pts = raw.map((p) => ({ x: p.x * w, y: p.y * h }));

  // Geometry and expression are computed from the landmark set only — no
  // pixels — so they are independent of the colorimetry path and of its
  // skin-tone confidence regime.
  onProgress?.("Measuring proportions…");
  const geometry = geometryReport(pts);
  const expression = res.faceBlendshapes?.length
    ? expressionState(res.faceBlendshapes[0])
    : null;

  onProgress?.("Measuring…");
  const img = ctx.getImageData(0, 0, w, h);
  const balanced = shadesOfGray(img.data);      // ONCE, whole frame

  const regions = extractRegions(balanced, w, h, pts);

  // ── the module boundary ─────────────────────────────────────────────────
  // One measurement pass produces neutral physical scalars. Both modules
  // consume THE SAME object and neither owns it. `rawScalars()` sits below
  // labelling on purpose: `analyse()` emits condition names, which are
  // clinical vocabulary, so Module A must never be built on it.
  const raw = rawScalars(regions);

  // Module A — entertainment. Glow/vitality values only.
  const complexion = readComplexion(raw);

  // Module B — safety referral. Health-adjacent, flag-gated, never billed.
  // Returns an empty, disabled result when the flag is off.
  const safety = evaluateSafety(raw);

  // Shared labelled view for the existing forward-chaining engine. Passed the
  // precomputed scalars so the ridge response is not recomputed per zone.
  const { observations, baseline } = analyse(regions, raw);
  const facts = observations.map((o) => ({ fact: "observation", ...o }));
  const result = runRules(facts);

  return {
    canvas, regions, observations, baseline, result,
    geometry, expression, delegate: activeDelegate,
    complexion, safety, buildFlavour: BUILD_FLAVOUR,
    notMeasured: Object.keys(UNAVAILABLE),
  };
}
