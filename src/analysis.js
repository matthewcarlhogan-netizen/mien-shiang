/*
 * Mien Shiang — on-device facial analysis.
 *
 * Everything runs in the browser. The photo is drawn to a canvas, measured,
 * and discarded. Nothing is uploaded, nothing is stored, there is no server.
 * That is also the strongest privacy position available: a face photo tied to
 * an identity is biometric data, and the safest way to hold it is not to.
 */

import { analyse, rawScalars, shadesOfGray, UNAVAILABLE } from "./engine.js";
import { runRules } from "./rules.js";
import { readComplexion } from "./adapters/entertainment.js";
import { evaluateSafety } from "./adapters/safety.js";
import { composeReading } from "./reading/index.js";
import { BUILD_FLAVOUR } from "./flags.js";
import { createLandmarkerWithFallback, selectSingleFace } from "./landmarker.js";
import { geometryReport } from "./geometry.js";
import { expressionState } from "./expression.js";
import { extractRegions } from "./region-extractor.js";

const BUNDLE = new URL("./vendor/mediapipe/vision_bundle.mjs", import.meta.url).href;
const WASM = new URL("./vendor/mediapipe/wasm", import.meta.url).href;
const MODEL = new URL("./vendor/mediapipe/models/face_landmarker.task", import.meta.url).href;

const MAX_DIM = 1024;              // downscale big phone photos before analysis
const EXPECTED_LANDMARKS = 478;    // 468 mesh + 10 iris

let landmarker = null;
let activeDelegate = null;   // "GPU" | "CPU" — surfaced in the debug view

// ------------------------------------------------------------------ model ---

async function getLandmarker(onProgress) {
  if (landmarker) return landmarker;
  onProgress?.("Loading face model (first run only, ~5 MB)…");
  const { FaceLandmarker, FilesetResolver } = await import(BUNDLE);
  const fileset = await FilesetResolver.forVisionTasks(WASM);

  // GPU first, CPU if that fails. The fallback logic lives in landmarker.js
  // with the factory injected, so it can be exercised by the test suite —
  // a fallback nobody has ever run is not a fallback.
  const built = await createLandmarkerWithFallback(
    FaceLandmarker.createFromOptions.bind(FaceLandmarker),
    fileset,
    // Request one extra detection so an image with two people is refused
    // rather than silently reading whichever face MediaPipe returns first.
    { modelAssetPath: MODEL, numFaces: 2 },
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
  const face = selectSingleFace(res);
  if (face.status === "none") {
    throw new Error("No face found. Face the camera straight on, in even light.");
  }
  if (face.status === "multiple") {
    throw new Error("More than one face found. Please choose a photo with one face only.");
  }
  // Named `landmarks`, not `raw`: `raw` below is the raw SCALAR contract that
  // both modules consume, and having two different `raw` bindings in one
  // function is what broke this file.
  const landmarks = face.landmarks;
  if (landmarks.length !== EXPECTED_LANDMARKS) {
    throw new Error(`Expected ${EXPECTED_LANDMARKS} landmarks, got ${landmarks.length}.`);
  }
  const pts = landmarks.map((p) => ({ x: p.x * w, y: p.y * h }));

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

  const { regions, dropped: droppedRegions } = extractRegions(balanced, w, h, pts);

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

  // Module A's reading. Built from geometry and the entertainment adapter
  // only — it never sees `observations`, which carry condition names.
  const reading = composeReading(geometry, complexion, raw);

  return {
    canvas, regions, droppedRegions, observations, baseline, result,
    geometry, expression, delegate: activeDelegate,
    complexion, safety, reading, buildFlavour: BUILD_FLAVOUR,
    notMeasured: Object.keys(UNAVAILABLE),
  };
}
