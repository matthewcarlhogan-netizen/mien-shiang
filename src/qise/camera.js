/*
 * PHASE 4 — camera capture, burst-based.
 *
 * ── WHY EVERY BROWSER OBJECT IS AN ARGUMENT ────────────────────────────────
 * `mediaDevices`, the landmarker and the clock are all injected, for the same
 * reason `createLandmarkerWithFallback()` takes its factory (CLAUDE.md item
 * 14): the paths that matter here are the FALLBACK paths — the browser that
 * strips the constraint, the browser that throws instead — and a fallback
 * nothing can execute is a fallback nobody has run. Injecting them is also the
 * only way any of this runs under `node --test`.
 *
 * ── WHY LOCKING IS AN IMPROVEMENT AND NEVER A PRECONDITION ─────────────────
 * `applyConstraints` does not reject an unsupported constraint. It silently
 * strips it and resolves successfully, so the only way to know what you got is
 * to read `getSettings()` back afterwards. Assume 'auto' is the common case:
 * Safari's ImageCapture support is partial and late, Firefox hides it behind
 * dom.imagecapture.enabled, and even where the constraint is accepted an
 * OS-level routine may override it. Every downstream metric must be valid
 * without locking, and `captureMode` is recorded on the reading so the
 * baseline can be reset when the class of capture changes.
 */
import { assertConsentGranted } from "./consent.js";

/** Nine frames keep a real median while shortening the post-lock capture. */
export const BURST_FRAMES = 9;

/** All gates must hold for this long before the burst starts. */
export const GATES_GREEN_MS = 650;

/** Trailing frames the ROI polygon vertices are averaged over. */
export const SMOOTHING_FRAMES = 20;

/** Fraction dropped from each end by L* before the per-frame median. */
export const TRIM_FRACTION = 0.10;

export const CAPTURE_CONSTRAINTS = Object.freeze({
  video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
});

export const CAMERA_READY_TIMEOUT_MS = 8000;

/** Turn browser camera errors into a useful next action rather than a dead preview. */
export function describeCameraError(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access is off. Allow it in this site's settings, or choose a selfie below.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No front camera was found. Choose a selfie below instead.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Another app may be using the camera. Close it, retry, or choose a selfie below.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "This camera could not use the requested setup. Retry, or choose a selfie below.";
  }
  if (name === "SecurityError") {
    return "The camera needs a secure page. Open the HTTPS link, or choose a selfie below.";
  }
  return "The camera did not open. Retry, check this site's camera permission, or choose a selfie below.";
}

/**
 * Attach a stream and wait for real frame dimensions before drawing it.
 * `video.play()` can resolve while Safari still reports a 0x0 frame; drawing
 * that frame throws inside requestAnimationFrame and used to leave a frozen
 * preview with the camera light still on.
 */
export async function attachCameraPreview(video, stream, {
  timeoutMs = CAMERA_READY_TIMEOUT_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!video || !stream) throw new TypeError("attachCameraPreview requires a video and stream");
  video.srcObject = stream;
  if (typeof video.play === "function") await video.play();
  if (video.videoWidth > 0 && video.videoHeight > 0) return video;

  await new Promise((resolve, reject) => {
    let timer = null;
    const cleanup = () => {
      if (typeof video.removeEventListener === "function") {
        video.removeEventListener("loadedmetadata", ready);
        video.removeEventListener("canplay", ready);
        video.removeEventListener("error", failed);
      }
      if (timer !== null) clearTimer(timer);
    };
    const ready = () => {
      if (!(video.videoWidth > 0 && video.videoHeight > 0)) return;
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("The camera preview could not be decoded."));
    };
    if (typeof video.addEventListener !== "function") {
      reject(new Error("The camera preview did not expose frame dimensions."));
      return;
    }
    video.addEventListener("loadedmetadata", ready);
    video.addEventListener("canplay", ready);
    video.addEventListener("error", failed);
    timer = setTimer(() => {
      cleanup();
      reject(new Error("Timed out waiting for the first camera frame."));
    }, timeoutMs);
  });
  return video;
}

/* ── capture mode negotiation ────────────────────────────────────────────── */

const LOCKABLE = ["whiteBalanceMode", "exposureMode"];

/**
 * Try to lock white balance and exposure, then find out what actually stuck.
 *
 * @returns {{captureMode:"locked"|"partial"|"auto", requested:string[],
 *            locked:string[], capabilities:Object, error:string|null}}
 */
export async function negotiateCaptureMode(track) {
  const capabilities = (typeof track?.getCapabilities === "function" ? track.getCapabilities() : null) || {};

  const requested = LOCKABLE.filter((k) => {
    const values = capabilities[k];
    return Array.isArray(values) && values.includes("manual");
  });

  if (requested.length === 0) {
    return { captureMode: "auto", requested: [], locked: [], capabilities, error: null };
  }

  const advanced = Object.fromEntries(requested.map((k) => [k, "manual"]));
  let error = null;
  try {
    await track.applyConstraints({ advanced: [advanced] });
  } catch (e) {
    // Not swallowed. Some browsers DO reject rather than strip, and a silent
    // catch here would present a hard failure as a successful auto capture.
    error = String(e && e.message ? e.message : e);
    console.warn("qise/camera: applyConstraints was rejected:", error);
  }

  // The verification step. A resolved applyConstraints is not evidence.
  const settings = (typeof track.getSettings === "function" ? track.getSettings() : null) || {};
  const locked = requested.filter((k) => settings[k] === "manual");

  const captureMode = locked.length === LOCKABLE.length
    ? "locked"
    : (locked.length > 0 ? "partial" : "auto");

  return { captureMode, requested, locked, capabilities, error };
}

/**
 * Open the camera. Nothing above this line may run before consent.
 *
 * The assertion is the Phase 0a enforcement point, and it throws rather than
 * returning a status: a boolean can be ignored by a caller that forgot to
 * check it, and the whole point is that there is no path around it.
 */
export async function openCamera({ consent, mediaDevices, constraints = CAPTURE_CONSTRAINTS }) {
  assertConsentGranted(consent, "getUserMedia");

  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
    throw new Error("qise/camera: no mediaDevices.getUserMedia available on this host");
  }

  const stream = await mediaDevices.getUserMedia(constraints);
  const [track] = stream.getVideoTracks();
  const negotiated = await negotiateCaptureMode(track);

  return { stream, track, ...negotiated };
}

/**
 * Build a face landmarker, but only once consent exists.
 *
 * The factory is injected exactly as in src/landmarker.js. This wrapper exists
 * so that BOTH doors into biometric processing — the camera and the mesh —
 * carry the same assertion, rather than the camera carrying it and the mesh
 * being reachable from a still image nobody thought about.
 */
export async function createLandmarkerGuarded({ consent, factory, options }) {
  assertConsentGranted(consent, "FaceLandmarker");
  if (typeof factory !== "function") {
    throw new TypeError("createLandmarkerGuarded requires an injected factory");
  }
  return factory(options);
}

/* ── ROI polygon smoothing ───────────────────────────────────────────────── */

/**
 * Rolling mean of ROI polygon vertices over the trailing frames.
 *
 * Sampling from the instantaneous polygon means the region jitters with the
 * landmarker frame to frame, and that jitter lands directly in the colour
 * measurement as the polygon slides on and off the boundary of the feature.
 * Averaging the VERTICES is not the same as averaging the measurements: it
 * stabilises where we look, before anything is read.
 */
export class PolygonSmoother {
  constructor(window = SMOOTHING_FRAMES) {
    this.window = window;
    this.frames = [];
  }

  /** @param {Object<string, Array<Array<{x:number,y:number}>>>} polygonsByRoi */
  push(polygonsByRoi) {
    this.frames.push(polygonsByRoi);
    if (this.frames.length > this.window) this.frames.shift();
    return this;
  }

  get length() { return this.frames.length; }

  /**
   * The averaged polygons.
   *
   * Vertex counts can change between frames when a hull gains or loses a
   * point, so a frame whose vertex count disagrees with the most recent one is
   * skipped rather than averaged element-wise into nonsense.
   */
  mean() {
    if (this.frames.length === 0) return null;
    const latest = this.frames[this.frames.length - 1];
    const out = {};

    for (const [roi, polys] of Object.entries(latest)) {
      out[roi] = polys.map((poly, pi) => {
        const acc = poly.map(() => ({ x: 0, y: 0 }));
        let n = 0;
        for (const frame of this.frames) {
          const candidate = frame[roi] && frame[roi][pi];
          if (!candidate || candidate.length !== poly.length) continue;
          candidate.forEach((v, i) => { acc[i].x += v.x; acc[i].y += v.y; });
          n++;
        }
        return n === 0 ? poly : acc.map((v) => ({ x: v.x / n, y: v.y / n }));
      });
    }
    return out;
  }
}

/* ── burst reduction ─────────────────────────────────────────────────────── */

const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Linear-interpolated quantile, so the IQR is stable at small n. */
function quantile(xs, q) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const iqr = (xs) => (xs.length ? quantile(xs, 0.75) - quantile(xs, 0.25) : null);

/**
 * One frame's Lab for one region: trimmed by L*, then the median.
 *
 * The trim is by L* and the SAME pixels are then used for a* and b*, rather
 * than each channel being trimmed on its own. Trimming per channel would
 * average three different subsets of the region and report the result as one
 * colour.
 */
export function trimmedMedianLab(pixels, color, trim = TRIM_FRACTION) {
  if (!pixels || pixels.length === 0) return null;

  const labs = pixels.map((p) => color.labFromSrgb8(p.r, p.g, p.b));
  labs.sort((a, b) => a.L - b.L);

  const drop = Math.floor(labs.length * trim);
  const kept = labs.length - 2 * drop >= 1 ? labs.slice(drop, labs.length - drop) : labs;

  return {
    L: median(kept.map((l) => l.L)),
    a: median(kept.map((l) => l.a)),
    b: median(kept.map((l) => l.b)),
  };
}

/**
 * Collapse a burst to one Lab per region, plus the stability signal.
 *
 * `frameJitter` is the free by-product: the IQR across frames says how much
 * the measurement moved while the subject was holding still, which is sensor
 * noise plus residual AWB hunting. A high jitter degrades the reading's
 * confidence rather than being hidden inside a mean.
 *
 * @param {Object<string, Array<{L:number,a:number,b:number}>>} perFrame
 */
export function reduceBurst(perFrame) {
  const lab = {};
  const jitterByRoi = {};

  for (const [roi, frames] of Object.entries(perFrame)) {
    const usable = frames.filter(Boolean);
    if (usable.length === 0) { lab[roi] = null; jitterByRoi[roi] = null; continue; }

    lab[roi] = {
      L: median(usable.map((f) => f.L)),
      a: median(usable.map((f) => f.a)),
      b: median(usable.map((f) => f.b)),
      frames: usable.length,
    };
    const j = {
      L: iqr(usable.map((f) => f.L)),
      a: iqr(usable.map((f) => f.a)),
      b: iqr(usable.map((f) => f.b)),
    };
    jitterByRoi[roi] = { ...j, magnitude: Math.hypot(j.L, j.a, j.b) };
  }

  // The overall figure is the MEDIAN across regions, not the maximum. One
  // region sitting on a moving shadow should not condemn the whole reading —
  // ROI validity is what handles a region that has genuinely gone bad, and
  // making both checks fire on the same event double-counts it.
  const magnitudes = Object.values(jitterByRoi).filter(Boolean).map((j) => j.magnitude);
  return { lab, frameJitter: { byRoi: jitterByRoi, overall: median(magnitudes) } };
}

/* ── the sustained-green latch ───────────────────────────────────────────── */

/**
 * All gates green continuously for GATES_GREEN_MS, then fire once.
 *
 * There is no shutter button: the capture happens when the frame is good, and
 * the only copy on screen is one line for the worst-margin failure. A latch
 * rather than a timer, because a single bad frame must reset the clock — the
 * point is a sustained good frame, not a good frame nine hundred milliseconds
 * after a bad one.
 */
export class GreenLatch {
  constructor(holdMs = GATES_GREEN_MS) {
    this.holdMs = holdMs;
    this.since = null;
    this.fired = false;
  }

  /** @returns {{ready:boolean, heldMs:number, progress:number}} */
  update(gatesPass, nowMs) {
    if (!gatesPass) {
      this.since = null;
      return { ready: false, heldMs: 0, progress: 0 };
    }
    if (this.since === null) this.since = nowMs;
    const heldMs = nowMs - this.since;
    const ready = heldMs >= this.holdMs && !this.fired;
    if (ready) this.fired = true;
    return { ready, heldMs, progress: Math.min(1, heldMs / this.holdMs) };
  }

  reset() { this.since = null; this.fired = false; }
}

/* ── teardown ────────────────────────────────────────────────────────────── */

/**
 * Drop every pixel and every landmark, in this tick.
 *
 * The buffers are ZEROED and not merely dereferenced. Nulling a reference asks
 * the garbage collector to get round to it, on its own schedule, while the
 * bytes — a face, and a mesh that is a biometric template — sit in memory. The
 * privacy posture is that the photograph is measured and discarded, so
 * discarding it is an action, not a hint.
 *
 * @param {{canvas?:Object, images?:Array, landmarks?:Array, stream?:Object}} scratch
 */
export function releaseCapture(scratch) {
  const released = {
    images: 0, landmarkArrays: 0, canvasCleared: false, tracksStopped: 0,
    landmarkerClosed: false, previewCleared: false,
  };
  if (!scratch) return released;

  for (const image of scratch.images || []) {
    if (image && image.data && typeof image.data.fill === "function") {
      image.data.fill(0);
      released.images++;
    }
  }
  for (const arr of scratch.landmarks || []) {
    if (Array.isArray(arr)) { arr.length = 0; released.landmarkArrays++; }
  }
  if (scratch.canvas) {
    // Collapsing the backing store is what actually frees it; a clearRect
    // leaves a full-size buffer of transparent pixels allocated.
    scratch.canvas.width = 0;
    scratch.canvas.height = 0;
    released.canvasCleared = true;
  }
  if (scratch.stream && typeof scratch.stream.getTracks === "function") {
    for (const t of scratch.stream.getTracks()) {
      if (typeof t.stop === "function") { t.stop(); released.tracksStopped++; }
    }
  }
  if (scratch.landmarker && typeof scratch.landmarker.close === "function") {
    scratch.landmarker.close();
    released.landmarkerClosed = true;
  }
  if (scratch.video && "srcObject" in scratch.video) {
    if (typeof scratch.video.pause === "function") scratch.video.pause();
    scratch.video.srcObject = null;
    released.previewCleared = true;
  }

  scratch.images = null;
  scratch.landmarks = null;
  scratch.canvas = null;
  scratch.stream = null;
  scratch.landmarker = null;
  scratch.video = null;
  return released;
}
