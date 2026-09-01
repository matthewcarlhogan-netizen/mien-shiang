/*
 * FaceLandmarker construction with a real GPU→CPU fallback.
 *
 * ── WHY THIS IS ITS OWN FILE ───────────────────────────────────────────────
 * `analysis.js` imports the MediaPipe bundle from a CDN at module scope, so it
 * cannot be imported under `node --test` at all — the import would try to hit
 * the network. Putting the fallback logic here, with the factory INJECTED
 * rather than imported, is what makes it testable.
 *
 * That matters more than it looks. The requirement is a CPU fallback "that is
 * actually tested, not assumed", and a fallback path is exactly the kind of
 * code that is written once, never executed, and quietly broken. The tests for
 * this file drive the GPU factory to throw and assert that CPU is reached, the
 * delegate is reported honestly, and a double failure surfaces BOTH errors
 * rather than just the last one.
 */

/** Delegates are attempted in this order. */
export const DELEGATE_ORDER = ["GPU", "CPU"];

/**
 * Build a FaceLandmarker, falling back from GPU to CPU.
 *
 * @param {(fileset:any, opts:any)=>Promise<any>} createFromOptions
 *        Injected. In the app this is `FaceLandmarker.createFromOptions`.
 * @param {any} fileset  Resolved WASM fileset.
 * @param {{modelAssetPath:string, numFaces?:number}} model
 * @param {(msg:string)=>void} [onProgress]
 * @returns {Promise<{landmarker:any, delegate:"GPU"|"CPU", attempts:Array}>}
 */
export async function createLandmarkerWithFallback(
  createFromOptions, fileset, model, onProgress,
) {
  const attempts = [];

  for (const delegate of DELEGATE_ORDER) {
    try {
      onProgress?.(
        delegate === "GPU"
          ? "Starting the face model…"
          : "Graphics acceleration unavailable — using the slower path…",
      );

      const landmarker = await createFromOptions(fileset, {
        baseOptions: { modelAssetPath: model.modelAssetPath, delegate },
        runningMode: model.runningMode || "IMAGE",
        // Ask for the configured number of faces. Callers that need to
        // reject ambiguous captures can request two and use selectSingleFace
        // instead of silently analysing whichever face happened to be first.
        numFaces: model.numFaces ?? 1,
        // 52 blendshape coefficients. Used for EXPRESSION and ASYMMETRY only —
        // expression is a state at the moment of capture, never a personality
        // signal. See src/expression.js.
        outputFaceBlendshapes: model.outputFaceBlendshapes ?? true,
      });

      attempts.push({ delegate, ok: true });
      return { landmarker, delegate, attempts };
    } catch (err) {
      // Not swallowed: recorded, logged, and re-surfaced below if every
      // delegate fails. An empty catch here would turn "no GPU and no CPU"
      // into a blank screen with no explanation.
      attempts.push({ delegate, ok: false, error: err?.message ?? String(err) });
      console.warn(`FaceLandmarker: ${delegate} delegate failed.`, err);
    }
  }

  // Every delegate failed. Report all of them — reporting only the last one
  // hides the GPU error, which is usually the informative one.
  const detail = attempts.map((a) => `${a.delegate}: ${a.error}`).join(" | ");
  throw new Error(`Could not start the face model on this device. ${detail}`);
}

/**
 * Classify a detector result without ever choosing a face implicitly.
 *
 * A face reading is meaningful only when the image contains exactly one
 * detected face. Returning a status rather than throwing keeps this helper
 * usable by live-camera loops, where "no face" is an ordinary frame state.
 *
 * @param {{faceLandmarks?:Array<Array<any>>}|null|undefined} result
 * @returns {{status:"none"|"single"|"multiple", landmarks:Array<any>|null}}
 */
export function selectSingleFace(result) {
  const faces = Array.isArray(result?.faceLandmarks) ? result.faceLandmarks : [];
  if (faces.length === 0) return { status: "none", landmarks: null };
  if (faces.length > 1) return { status: "multiple", landmarks: null };
  return { status: "single", landmarks: faces[0] };
}
