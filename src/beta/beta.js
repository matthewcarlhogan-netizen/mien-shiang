/* Beta scanner — DOM wiring.
 *
 * This file is the beta's equivalent of src/ui/qise/app.js: it wires the DOM
 * and orchestrates, and it holds no decisions of its own. Everything that can
 * be decided without a browser lives in ./beta-model.js, and every measurement
 * comes from the production modules imported below — there is no beta engine,
 * no beta store and no simulation. The beta differs from the production
 * scanner in its URL, its skin tokens, its banner line, and in having no
 * offline shell; nowhere else.
 *
 * NO TOP-LEVEL SIDE EFFECTS. Nothing here touches document or window until
 * init() is called, so a test can import this module purely to prove its
 * import graph resolves. The previous revision registered a `beforeunload`
 * listener at module scope, which made the module unimportable and let a
 * broken import path ("../engine.js", a file that does not exist) sit behind a
 * green suite — CLAUDE.md item 18a, exactly.
 *
 * WHY THIS LIVES UNDER src/. dist/ is a FLATTENED copy of src/ (build.js does
 * no transform), so a beta sitting beside src/ can never have one relative
 * specifier that is correct in both trees: "../engine.js" resolves in the
 * artifact and not in the source, and "../src/engine.js" the reverse. Shipping
 * either breaks one of them. Inside src/, "../engine.js" is the same file in
 * both, and the beta falls under source-integrity's every-local-import-resolves
 * check for free.
 *
 * NO SERVICE WORKER. Registering the root sw from /beta/ is a scope conflict,
 * so the beta runs without the offline shell. That is the one functional
 * difference from production and it is named in the owner ruling.
 */

import {
  VOICE, sealStateFrom, calibrationLines, abstainModel, ringModel, ledgerModel,
  readoutLine, artifactModel, readingStateLabel, formatTime, buildReading,
} from "./beta-model.js";
import { createConsent, assertConsentGranted } from "../qise/consent.js";
import {
  openCamera, attachCameraPreview, ensureContinuousFocus, settleAndNegotiate,
  releaseCaptureMode, releaseCapture, createLandmarkerGuarded, GreenLatch,
  PolygonSmoother, BURST_FRAMES, trimmedMedianLab, reduceBurst, describeCameraError,
  requestCameraRefocus,
} from "../qise/camera.js";
import { createLandmarkerWithFallback } from "../landmarker.js";
import {
  evaluateGates, captureInstruction, captureGuide, canUseCurrentLight, DISTANCE_MIN_FRACTION,
} from "../qise/gates.js";
import { frameStats } from "../qise/framestats.js";
import { createScreenWakeLock } from "../qise/wakelock.js";
import { createExposureHalo, haloStateFromCapture, shouldUseScreenFlash } from "../ui/qise/exposure-halo.js";
import { readRois } from "../qise/rois.js";
import { sampleSclera } from "../qise/sclera.js";
import { headPose } from "../qise/pose.js";
import * as color from "../qise/color.js";
import { computeReadingMetrics, lumRatioP90P50 } from "../qise/metrics.js";
import {
  interpretReading, readingConfidence, axesOf, BASELINE_VERSION,
} from "../qise/baseline.js";
import { openStore } from "../qise/store.js";
import { extractRegions, eraseExtractedRegions } from "../region-extractor.js";
import { shadesOfGray, rawScalars, sensorNoiseConfidence } from "../engine.js";
import { measureIntegratedReading } from "../qise/integrated.js";
import { createFrameScheduler } from "../qise/frame-scheduler.js";
import { ScreenAssistGuard, RefocusRecovery, StallTracker } from "../qise/capture-runtime.js";
import { faceGuideRect } from "../qise/frame-geometry.js";
import { createDiagnosticsSession, diagnosticsRequested } from "../qise/diagnostics.js";

const MEDIAPIPE_BUNDLE = new URL("../vendor/mediapipe/vision_bundle.mjs", import.meta.url).href;
const MEDIAPIPE_WASM = new URL("../vendor/mediapipe/wasm", import.meta.url).href;
const FACE_MODEL = new URL("../vendor/mediapipe/models/face_landmarker.task", import.meta.url).href;

const CINNABAR = "#C8452A";
const TRACKER_GROUND = "#0B0B0C";
const TRACKER_TYPE = "#EDEAE3";
const TRACKER_HAIR = "#2A2A2C";
const TRACKER_DIM = "#8A857C";
const COOL_RGB = [62, 124, 107];
const WARM_RGB = [200, 69, 42];

/* Session view state. The readings themselves live in the production store;
 * this is only what the current screen is showing. */
const state = { entries: [], selectedIdx: null };

let consent = null;
let store = null;
let exposureHalo = null;
let scratch = null;
let captureRun = 0;
/**
 * Set while a capture is live, so the three assist buttons — wired ONCE in
 * init(), long before any given capture's closures exist — have something to
 * act on without threading state through every render function. Cleared on
 * every way out of a capture, same discipline as `scratch`.
 * Shape: { track, assist, requestManualRefocus, getCaptureMode,
 *          setCaptureMode, applyAssistTransition, requestLightOverride }
 */
let activeCapture = null;

const $ = (id) => document.getElementById(id);

/* ── rendering ─────────────────────────────────────────────────────────── */

function renderSeal(seal, timestamp) {
  const el = $("seal");
  el.className = "seal";
  el.textContent = "";
  if (seal.type === "sealed") {
    el.classList.add(seal.variant);
    el.textContent = formatTime(timestamp);
    el.classList.add("stamp");
    setTimeout(() => el.classList.remove("stamp"), 90);
  } else {
    el.classList.add("outlined");
  }
}

function renderTags(tags) {
  const el = $("tags");
  el.textContent = "";
  for (const text of tags) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = text;
    el.appendChild(tag);
  }
}

function renderCalibration(lines) {
  const el = $("calibration");
  el.textContent = "";
  for (const text of lines) {
    const line = document.createElement("div");
    line.className = "line";
    line.textContent = text;
    el.appendChild(line);
  }
}

function renderRing() {
  const model = ringModel(state.entries);
  const parts = ['<circle cx="100" cy="100" r="70" fill="none" stroke="#2A2A2C" stroke-width="1"/>'];
  for (const tick of model.ticks) {
    const x1 = (100 + 78 * Math.cos(tick.angle)).toFixed(1);
    const y1 = (100 + 78 * Math.sin(tick.angle)).toFixed(1);
    const x2 = (100 + 90 * Math.cos(tick.angle)).toFixed(1);
    const y2 = (100 + 90 * Math.sin(tick.angle)).toFixed(1);
    const stroke = tick.kind === "clean"
      ? `stroke="${CINNABAR}" stroke-width="3"`
      : tick.kind === "attenuated"
        ? `stroke="${CINNABAR}" stroke-width="2" stroke-dasharray="2 2"`
        : 'stroke="#2A2A2C" stroke-width="2"';
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${stroke}/>`);
  }
  if (model.total >= 3) {
    parts.push(`<text x="100" y="96" text-anchor="middle" fill="${TRACKER_TYPE}" font-size="16">${model.sealed}/${model.total}</text>`);
    parts.push(`<text x="100" y="112" text-anchor="middle" fill="${TRACKER_DIM}" font-size="8">SEALED</text>`);
  }
  $("ring").innerHTML = parts.join("");
}

function renderLedger() {
  const el = $("ledger");
  el.textContent = "";
  for (const square of ledgerModel(state.entries)) {
    // A <button>, not a <div>: focusable, Enter/Space-activated and announced
    // without re-implementing any of it. .sq:focus-visible can never apply to
    // something the keyboard cannot reach.
    const sq = document.createElement("button");
    sq.type = "button";
    sq.className = "sq";
    sq.setAttribute("aria-label", `Session ${square.index + 1}`);
    if (square.attenuated) sq.classList.add("att");
    if (square.warmth === null) {
      sq.style.background = TRACKER_HAIR;
    } else {
      const brightness = 0.7 + square.lightness * 0.2;
      const channel = (i) => Math.min(255, Math.round(
        (COOL_RGB[i] + (WARM_RGB[i] - COOL_RGB[i]) * square.warmth) * brightness));
      sq.style.background = `rgb(${channel(0)},${channel(1)},${channel(2)})`;
    }
    sq.addEventListener("click", () => selectSession(square.index));
    el.appendChild(sq);
  }
}

function selectSession(idx) {
  state.selectedIdx = idx;
  document.querySelectorAll(".sq").forEach((el, i) => {
    el.classList.toggle("selected", i === idx);
  });
  $("readout").textContent = readoutLine(state.entries[idx], idx);
}

function renderArtifact(date = new Date()) {
  const model = artifactModel(date);
  const ctx = $("artifact").getContext("2d");
  ctx.fillStyle = TRACKER_GROUND;
  ctx.fillRect(0, 0, 320, 320);
  ctx.strokeStyle = TRACKER_HAIR;
  ctx.strokeRect(8.5, 8.5, 303, 303);
  ctx.fillStyle = CINNABAR;
  ctx.fillRect(112, 70, 96, 96);
  ctx.fillStyle = TRACKER_TYPE;
  ctx.textAlign = "center";
  ctx.font = '500 14px ui-monospace, monospace';
  ctx.fillText(model.dateStr, 160, 123);
  ctx.font = '500 15px ui-monospace, monospace';
  ctx.fillText(model.wordmark, 160, 216);
}

function setVoice(text) {
  const el = $("voice");
  el.textContent = text;
  el.classList.add("fade-in");
  setTimeout(() => el.classList.remove("fade-in"), 160);
}

/* The capture sequence overrides the theme to halo-white so the screen is a
 * known light source. It is a theme token change and nothing else: the halo's
 * own flash strength is driven by the halo LEVEL below, never by the theme,
 * because a theme that could move the flash would move the illuminant between
 * frames of one burst. */
function setCaptureTheme(on) {
  document.documentElement.dataset.theme = on ? "halo-white" : "";
}

/* ── capture ───────────────────────────────────────────────────────────── */

async function buildLandmarker() {
  assertConsentGranted(consent, "FaceLandmarker");
  try {
    const { FaceLandmarker, FilesetResolver } = await import(MEDIAPIPE_BUNDLE);
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
    const guardedFactory = (_fileset, options) => createLandmarkerGuarded({
      consent,
      options,
      factory: (guardedOptions) => FaceLandmarker.createFromOptions(fileset, guardedOptions),
    });
    const built = await createLandmarkerWithFallback(
      guardedFactory,
      fileset,
      { modelAssetPath: FACE_MODEL, runningMode: "VIDEO", outputFaceBlendshapes: false },
      (message) => { $("gate-line").textContent = message; },
    );
    return built.landmarker;
  } catch (error) {
    // A model-load failure is not a camera-permission failure, and
    // describeCameraError's fallback used to claim it was one, pointing at a
    // selfie fallback the beta does not have. This is its own message.
    $("gate-line").textContent = "The reading model failed to load. Refresh the page.";
    throw error;
  }
}

function setPlateAspectRatio(video) {
  if (!video.videoWidth || !video.videoHeight) return;
  const plate = $("plate");
  if (plate) {
    plate.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  }
}

/**
 * Size and position the face guide from the ACTUAL rendered plate box, so it
 * represents the same buffer fraction the distance gate measures whatever
 * crop `object-fit: cover` is currently applying (src/qise/frame-geometry.js).
 * setPlateAspectRatio already makes the common case crop-free; this is the
 * general fix that holds even if that has not taken effect yet, or a layout
 * constraint keeps the box from matching exactly.
 */
function applyFaceGuide(video) {
  const plate = $("plate");
  const guide = $("face-guide");
  if (!plate || !guide || !video.videoWidth || !video.videoHeight) return;
  const box = plate.getBoundingClientRect();
  if (!(box.width > 0) || !(box.height > 0)) return;
  const rect = faceGuideRect({
    bufferWidth: video.videoWidth,
    bufferHeight: video.videoHeight,
    boxWidth: box.width,
    boxHeight: box.height,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  guide.style.left = `${(rect.leftFraction * 100).toFixed(3)}%`;
  guide.style.top = `${(rect.topFraction * 100).toFixed(3)}%`;
  guide.style.width = `${(rect.widthFraction * 100).toFixed(3)}%`;
  guide.style.height = `${(rect.heightFraction * 100).toFixed(3)}%`;
}

function hideReadingSurfaces() {
  const surfaces = $("reading-surfaces");
  if (surfaces) surfaces.hidden = true;
}

function showReadingSurfaces() {
  const surfaces = $("reading-surfaces");
  if (surfaces) surfaces.hidden = false;
}

function resetCaptureButton() {
  const captureBtn = $("go-capture");
  if (captureBtn) {
    captureBtn.disabled = false;
    captureBtn.textContent = "Open the camera";
  }
}

/** Every capture-assist control starts hidden; the loop reveals what applies. */
function hideAssistControls() {
  for (const id of ["screen-light", "use-current-light", "refocus-camera"]) {
    const el = $(id);
    if (el) el.hidden = true;
  }
}

/**
 * The four-chip readiness strip, driven by the SAME captureGuide() production
 * uses — one guard, one set of groupings, both surfaces.
 */
function updateCaptureGuideChips(report) {
  const guide = report ? captureGuide(report) : [
    { id: "frame", state: "waiting" }, { id: "light", state: "waiting" },
    { id: "camera", state: "waiting" }, { id: "steady", state: "waiting" },
  ];
  for (const item of guide) {
    const row = document.querySelector(`[data-guide="${item.id}"]`);
    if (row) row.dataset.state = item.state;
  }
}

/**
 * Apply what a screen-assist transition demands: reset both the measurement
 * hold and the "is it safe to drop the assist" probe, and hand exposure/WB
 * back to the camera if a lock was taken under the light that just changed.
 * Every on/off flip goes through here — there is exactly one place a burst
 * could otherwise span two lighting conditions.
 */
function makeAssistTransitionHandler({ assist, latch, dropAssistLatch, track, getCaptureMode, setCaptureMode }) {
  return (transition) => {
    if (!transition.changed) return;
    latch.reset();
    dropAssistLatch.reset();
    // The state machine flipping `assist.active` is not the same event as the
    // screen actually lighting up — ScreenAssistGuard only tracks whether the
    // assist SHOULD be on, it has never touched a pixel. Production's
    // `setScreenLight` pairs its flag flip with this exact call; beta's own
    // ScreenAssistGuard-based rewrite dropped it, so the button toggled and
    // the burst gating behaved correctly while the screen itself stayed dark
    // — "no ring light" was not a tuning problem, it was this missing line.
    exposureHalo?.setLevel(assist.active ? 1 : 0);
    if (transition.releaseExposureLock) {
      releaseCaptureMode(track)
        .then((reverted) => { setCaptureMode(reverted.captureMode); })
        .catch((error) => console.warn("beta: exposure hand-back on assist change failed", error));
    }
  };
}

async function runCapture() {
  assertConsentGranted(consent, "the capture screen");
  const runId = ++captureRun;
  if (scratch) { releaseCapture(scratch); scratch = null; }

  setCaptureTheme(true);
  exposureHalo?.reset();
  hideReadingSurfaces();
  hideAssistControls();
  updateCaptureGuideChips(null);
  const captureBtn = $("go-capture");
  if (captureBtn) {
    captureBtn.disabled = true;
    captureBtn.textContent = "Capturing…";
  }
  $("gate-line").textContent = "Opening the camera.";
  renderCalibration([]);

  const diagnostics = createDiagnosticsSession({
    enabled: diagnosticsRequested(new URLSearchParams(location.search)),
  });
  $("calibration").hidden = !diagnostics.enabled;

  const video = $("preview");
  video.hidden = false;

  // negotiate:false — the exposure lock waits until the preview is live and
  // auto-exposure has converged. Locking on the line after getUserMedia pins
  // the sensor to its dark opening value (CLAUDE.md item 53).
  const opened = await openCamera({
    consent, mediaDevices: navigator.mediaDevices, negotiate: false,
  });
  if (runId !== captureRun) {
    releaseCapture({ stream: opened.stream, images: [], landmarks: [], canvas: null });
    return;
  }

  let landmarker = null;
  try {
    await attachCameraPreview(video, opened.stream);
    setPlateAspectRatio(video);
    applyFaceGuide(video);
    const focus = await ensureContinuousFocus(opened.track);
    opened.focusSupported = focus.supported;
    landmarker = await buildLandmarker();
  } catch (error) {
    releaseCapture({
      stream: opened.stream, images: [], landmarks: [], canvas: null, landmarker, video,
    });
    setCaptureTheme(false);
    resetCaptureButton();
    activeCapture = null;
    throw error;
  }

  if (diagnostics.enabled) {
    const capabilities = typeof opened.track.getCapabilities === "function"
      ? opened.track.getCapabilities() : null;
    const settings = typeof opened.track.getSettings === "function"
      ? opened.track.getSettings() : null;
    diagnostics.recordDeviceInfo({
      userAgent: navigator.userAgent,
      deviceLabel: opened.track.label || null,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      frameRate: settings?.frameRate ?? null,
      facingMode: settings?.facingMode ?? null,
      focusCapabilities: capabilities ? { focusMode: capabilities.focusMode } : null,
      exposureCapabilities: capabilities ? { exposureMode: capabilities.exposureMode } : null,
      whiteBalanceCapabilities: capabilities ? { whiteBalanceMode: capabilities.whiteBalanceMode } : null,
      actualTrackSettings: settings,
    });
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  // Acquired after the camera opened, so a refused camera never leaves the
  // phone awake, and released by releaseCapture() on every way out.
  const wakeLock = createScreenWakeLock({ wakeLock: navigator.wakeLock, documentRef: document });
  wakeLock.acquire();
  scratch = {
    canvas, images: [], landmarks: [], stream: opened.stream, landmarker, video, wakeLock,
  };

  let captureMode = "auto";
  let captureSettled = false;
  let negotiationStarted = false;
  let exposureReleaseStarted = false;
  let lightOverrideRequested = false;

  const latch = new GreenLatch();
  // A SEPARATE latch, same hold duration: while the screen assist is active,
  // this asks "have the real gates looked clean for a full hold-worth of
  // time anyway?" — the cue to try dropping the assist and see if ambient
  // light alone can now sustain a genuine measurement (locked decision 3).
  const dropAssistLatch = new GreenLatch();
  const smoother = new PolygonSmoother();
  const assist = new ScreenAssistGuard();
  const refocus = new RefocusRecovery();
  const stall = new StallTracker();
  const drift = [];
  let previous = null;
  const startedAt = performance.now();
  let underexposureStartMs = null;
  let assistCycles = 0;
  let firstFaceRecorded = false;

  const applyAssistTransition = makeAssistTransitionHandler({
    assist, latch, dropAssistLatch, track: opened.track,
    getCaptureMode: () => captureMode,
    setCaptureMode: (mode) => { captureMode = mode; },
  });

  // Exposed so the three assist buttons — wired ONCE in init(), long before
  // this closure exists — have something live to act on. Cleared on every
  // way out of this capture, same discipline as `scratch`.
  activeCapture = {
    track: opened.track,
    assist,
    requestManualRefocus: () => {
      diagnostics.recordRefocusAttempt();
      return requestCameraRefocus(opened.track);
    },
    setCaptureMode: (mode) => { captureMode = mode; },
    getCaptureMode: () => captureMode,
    applyAssistTransition,
    requestLightOverride: () => { lightOverrideRequested = true; },
  };

  const history = await store.all();
  const scleraHistory = history.map((r) => r.sclera && r.sclera.rawRatios).filter(Boolean);

  const burst = {};
  let collecting = 0;
  let lastRois = null, lastSclera = null, lastMargins = null, lastTier = null;

  const scheduler = createFrameScheduler(video);

  const stopAfterLoopError = (error) => {
    if (runId !== captureRun) return;
    console.error("beta: live capture stopped", error);
    captureRun++;
    scheduler.stop();
    if (scratch) releaseCapture(scratch);
    scratch = null;
    activeCapture = null;
    setCaptureTheme(false);
    resetCaptureButton();
    hideAssistControls();
    $("gate-line").textContent = error?.name
      ? describeCameraError(error)
      : "The bench closed the camera. Open it again to continue.";
  };

  // Distinct DECODED video frames only, never a display repaint — see
  // src/qise/frame-scheduler.js. The re-schedule stays the LAST statement of
  // the body, wrapped, so one throwing frame reports itself and tears the
  // capture down instead of leaving a live camera behind a dead loop
  // (CLAUDE.md item 50).
  const scheduleStep = () => scheduler.schedule((frameInfo) => {
    step(frameInfo.now).catch(stopAfterLoopError);
  });

  const step = async (nowMs) => {
    if (!scratch || runId !== captureRun) return;
    // Reassigning canvas.width/height reallocates and clears the backing
    // bitmap even when the value is unchanged — real cost on every processed
    // frame now that the frame scheduler already dedupes repaints. Guarded so
    // it only happens on an actual dimension change (stream start, or a
    // format change mid-session); drawImage below still repaints every pixel
    // every frame regardless, so skipping the reassignment changes no output.
    const frameWidth = video.videoWidth || 1280;
    const frameHeight = video.videoHeight || 960;
    if (canvas.width !== frameWidth) canvas.width = frameWidth;
    if (canvas.height !== frameHeight) canvas.height = frameHeight;

    // Drawn WITHOUT a flip: the preview's mirroring is a CSS transform, which
    // does not touch the pixels drawImage and detectForVideo see. Flipping
    // here would put the buffer in the opposite space from the landmarks and
    // swap every off-midline region (CLAUDE.md item 44).
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    scratch.images = [image];
    const clearFrame = () => { image.data.fill(0); if (scratch) scratch.images = []; };

    diagnostics.recordFrame(nowMs);

    const result = landmarker.detectForVideo(video, nowMs);
    const mesh = result && result.faceLandmarks && result.faceLandmarks[0];

    if (!mesh) {
      // A lost face is the same "nothing left to sample" case CLAUDE.md item
      // 51 already names: every duration this frame tracks is reset rather
      // than continuing to accumulate across a gap where nothing was
      // measured at all.
      $("gate-line").textContent = "Bring your face into the frame.";
      exposureHalo?.setCaptureState("seeking");
      updateCaptureGuideChips(null);
      hideAssistControls();
      stall.reset();
      refocus.reset();
      underexposureStartMs = null;
      clearFrame();
      scheduleStep();
      return;
    }

    if (!firstFaceRecorded) {
      diagnostics.recordMilestone("firstFace", nowMs);
      firstFaceRecorded = true;
    }

    const pts = mesh.map((p) => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
      z: typeof p.z === "number" ? p.z * canvas.width : undefined,
    }));
    if (previous) {
      const d = pts.reduce(
        (s, p, i) => s + Math.hypot(p.x - previous[i].x, p.y - previous[i].y), 0) / pts.length;
      drift.push(d);
      if (drift.length > 5) drift.shift();
      previous.length = 0;
    }
    previous = pts;
    scratch.landmarks = [pts];

    lastRois = readRois(image, pts, { mirrored: false }, color);
    lastSclera = sampleSclera(image, pts, { mirrored: false }, { samples: scleraHistory });
    smoother.push(Object.fromEntries(Object.entries(lastRois.rois)
      .map(([k, v]) => [k, v.polygons.map((p) => p.hull)])));

    const stats = frameStats(image, lastRois, canvas.width, drift, headPose(pts));
    const elapsedMs = nowMs - startedAt;
    const gates = evaluateGates(stats, pts, lastSclera, {
      elapsedMs, acceptUnevenLight: lightOverrideRequested,
    });

    // ── autofocus recovery ────────────────────────────────────────────────
    const soft = gates.failures.some((f) => f.id === "filter");
    const refocusResult = refocus.update({ soft, nowMs, focusSupported: opened.focusSupported });
    if (refocusResult.shouldRefocus) {
      diagnostics.recordRefocusAttempt();
      requestCameraRefocus(opened.track).catch((error) => {
        console.warn("beta: automatic refocus failed", error);
      });
    }
    const refocusBtn = $("refocus-camera");
    if (refocusBtn) {
      refocusBtn.hidden = !(soft && opened.focusSupported);
      refocusBtn.dataset.emphasis = String(!refocusBtn.hidden);
    }

    // ── screen-assist: dark scenes auto-trigger, and the assist is NEVER
    // allowed to still be on when a burst completes (locked decision 3) ────
    const isUnderexposed = gates.failures.some((f) => f.id === "underexposed");
    underexposureStartMs = isUnderexposed ? (underexposureStartMs ?? nowMs) : null;
    const issueForMs = underexposureStartMs === null ? 0 : nowMs - underexposureStartMs;
    if (shouldUseScreenFlash({
      issuePresent: isUnderexposed, issueForMs, enabled: assist.active,
      dismissed: false, illuminationActive: false,
    })) {
      applyAssistTransition(assist.setActive(true, { captureMode }));
    }

    const screenLightBtn = $("screen-light");
    if (screenLightBtn) {
      screenLightBtn.hidden = !(isUnderexposed || assist.active);
      screenLightBtn.setAttribute("aria-pressed", String(assist.active));
      screenLightBtn.textContent = assist.active
        ? "Turn off screen light" : "Turn on screen light";
    }

    // Once the real gates look clean for a full hold-worth of time WHILE the
    // assist is on, try dropping it — that is the only way to find out
    // whether ambient light alone can now sustain a genuine measurement.
    // gatesPassForHold() below still refuses to complete a hold while
    // `assist.active`, so nothing can be captured in between.
    if (assist.active) {
      const readyToDrop = dropAssistLatch.update(gates.pass, nowMs);
      if (readyToDrop.ready) {
        applyAssistTransition(assist.setActive(false, { captureMode }));
        assistCycles++;
        diagnostics.recordScreenAssistCycle();
      }
    } else {
      dropAssistLatch.reset();
    }

    // Warm-up first, then lock — and never while the assist is active, since
    // a lock taken under screen light would need releasing the instant the
    // assist drops anyway. `captureSettled` gates the LATCH, not the gates,
    // so the user keeps live feedback but cannot complete a hold that ends
    // in a burst lit differently frame to frame.
    if (!negotiationStarted && gates.pass && !assist.active) {
      negotiationStarted = true;
      captureSettled = false;
      latch.reset();
      settleAndNegotiate(opened.track)
        .then((negotiated) => {
          if (runId === captureRun) captureMode = negotiated.captureMode;
        })
        .catch((error) => {
          console.warn("beta: capture mode negotiation failed", error);
          if (runId === captureRun) captureMode = "auto";
        })
        .finally(() => { if (runId === captureRun) captureSettled = true; });
    }

    // A lock correct when taken is wrong the moment the subject turns towards
    // a window. Once only — flipping back and forth is itself a moving
    // illuminant.
    if (!exposureReleaseStarted
        && (captureMode === "locked" || captureMode === "partial")
        && gates.failures.some((f) => f.id === "underexposed" || f.id === "overexposed")) {
      exposureReleaseStarted = true;
      captureSettled = false;
      latch.reset();
      releaseCaptureMode(opened.track)
        .then((reverted) => {
          if (runId !== captureRun) return;
          captureMode = reverted.captureMode;
          captureSettled = true;
        })
        .catch((error) => {
          console.warn("beta: exposure hand-back failed", error);
          if (runId === captureRun) captureSettled = true;
        });
    }

    // ── the one line shown, and the four-chip breakdown beside it ──────────
    const instruction = captureInstruction(gates);
    const worstBlockerId = assist.active ? "screen-assist" : (gates.failures[0]?.id ?? null);
    const before = stall.update(worstBlockerId, nowMs);
    if (before.blockerId) diagnostics.recordBlockerMs(before.blockerId, before.changed ? 0 : 16);

    // `assist.active` now genuinely brightens the screen (see
    // makeAssistTransitionHandler), so it must outrank the refocus message
    // here: a real, visible flash with the text still saying "sharpening" is
    // an unexplained flash by another name, and Phase 7 forbids exactly that.
    let shown = instruction;
    if (assist.active) {
      shown = {
        id: "screen-light", title: "Using the screen for light",
        detail: "Keep your face inside the guide — this turns off on its own once the room is enough.",
      };
    } else if (refocusResult.recovering) {
      shown = {
        id: "filter", title: "Hold still — sharpening",
        detail: "The camera is refocusing automatically.",
      };
    } else if (assistCycles >= 3) {
      // Locked decision 3's abstain/ask-for-better-light clause: the assist
      // has been tried and dropped repeatedly and ambient still cannot hold
      // on its own. The screen is not the fix at this point; the room is.
      shown = {
        id: "light", title: "Add real light in the room",
        detail: "The screen alone isn't quite enough here — try a lamp or daylight, then hold still.",
      };
    }
    $("gate-line").textContent = shown.detail || shown.title;
    updateCaptureGuideChips(gates);

    const currentLightAvailable = canUseCurrentLight(gates, elapsedMs);
    const useLightBtn = $("use-current-light");
    if (useLightBtn) useLightBtn.hidden = lightOverrideRequested || !currentLightAvailable;

    // ── the hold, gated through the assist guard so a burst can never
    // complete while the screen itself is the light source ────────────────
    const held = latch.update(assist.gatesPassForHold(gates.pass) && captureSettled, nowMs);
    exposureHalo?.setCaptureState(haloStateFromCapture({
      underexposed: isUnderexposed, gatesPass: gates.pass, captureSettled,
      recovering: refocusResult.recovering,
    }), held.progress);

    if (diagnostics.enabled) {
      renderCalibration(calibrationLines({
        luma: cheekLuma(stats),
        captureMode,
        haloLevel: exposureHalo?.level,
        coverage: lastRois.validFraction,
      }));
    }

    if (held.ready) {
      diagnostics.recordMilestone("ready", nowMs);
      collecting = BURST_FRAMES;
      lastMargins = gates.margins;
      lastTier = gates.captureTier;
    }

    if (collecting > 0) {
      for (const [name, roi] of Object.entries(lastRois.rois)) {
        if (!roi.pixels.length) continue;
        (burst[name] ||= []).push(trimmedMedianLab(roi.pixels, color));
      }
      collecting--;
      if (collecting === 0) {
        diagnostics.recordMilestone("capture", nowMs);
        diagnostics.setFinalCaptureMode(captureMode);
        if (diagnostics.enabled) console.table(diagnostics.summary());
        scheduler.stop();
        activeCapture = null;
        // The NEGOTIATED mode, not the one openCamera returned — that is
        // "pending", and exposure may have been handed back mid-hold.
        await finish(burst, lastRois, lastSclera, { ...opened, captureMode },
          history, lastMargins, lastTier, image, pts, stats);
        return;
      }
    }

    clearFrame();
    scheduleStep();
  };
  scheduleStep();
}

function cheekLuma(stats) {
  const values = [stats?.cheekMedianL?.left, stats?.cheekMedianL?.right].filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function correctLab(lab, gains) {
  // Round-trip through linear RGB, because the gains are diagonal in LINEAR
  // space. Applying them to Lab coordinates directly would be a different
  // operation wearing the same name.
  const { L, a, b } = lab;
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29));
  const X = 95.047 * inv(fx), Y = 100 * inv(fy), Z = 108.883 * inv(fz);
  const r = (3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z) / 100;
  const g = (-0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z) / 100;
  const bl = (0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z) / 100;
  return color.labFromLinear({ r: r * gains.r, g: g * gains.g, b: bl * gains.b });
}

/**
 * The engine scalars for this frame.
 *
 * This is the classic whole-frame path: white balance ONCE over the frame,
 * then per-region statistics. Never per region — normalising each region
 * separately drives them all toward grey and erases the between-region
 * differences the method measures (CLAUDE.md item 1).
 */
function engineScalars(image, pts) {
  let balanced = null;
  let regions = null;
  try {
    balanced = shadesOfGray(Uint8ClampedArray.from(image.data));
    ({ regions } = extractRegions(balanced, image.width, image.height, pts));
    const noise = sensorNoiseConfidence(regions);
    const boundarySensitive = Object.values(regions).some((r) => r && r.boundarySensitive);
    return { scalars: rawScalars(regions), noise, boundarySensitive };
  } finally {
    balanced?.fill?.(0);
    eraseExtractedRegions(regions);
  }
}

async function finish(burst, rois, sclera, opened, history, gateMargins, captureTier,
  image, pts, stats) {
  const reduced = reduceBurst(burst);
  const rawLab = reduced.lab;
  const correctedLab = {};
  for (const [name, lab] of Object.entries(rawLab)) {
    correctedLab[name] = !lab ? null : sclera.gains ? correctLab(lab, sclera.gains) : { ...lab };
  }

  const lumRatio = {};
  for (const [name, roi] of Object.entries(rois.rois)) {
    if (roi.pixels.length) lumRatio[name] = lumRatioP90P50(roi.pixels, color);
  }

  const metrics = computeReadingMetrics({ rawLab, correctedLab, lumRatio });
  const confidence = readingConfidence({
    scleraConfidenceValue: sclera.confidenceValue,
    validFraction: rois.validFraction,
    frameJitter: reduced.frameJitter.overall,
    captureTier,
  });

  const { scalars, noise, boundarySensitive } = engineScalars(image, pts);
  let integrated = null;
  try {
    integrated = measureIntegratedReading(image, pts);
  } catch (error) {
    // A frame that cannot carry all twelve palaces still carries a colour
    // reading. Recorded as absent, never as measured-and-empty.
    console.warn("beta: integrated reading unavailable", error);
  }

  const timestampIso = new Date().toISOString();
  const now = new Date();
  const canonicalDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const captureClass = opened.captureMode || "auto";
  const interpreted = interpretReading(metrics.corrected, history, {
    confidence, timestampIso, captureMode: captureClass,
  });

  const reading = buildReading({
    timestampIso,
    canonicalDay,
    captureClass,
    metrics,
    axes: axesOf(metrics.corrected),
    interpreted,
    integrated,
    captureTier,
    consentVersion: consent.read() && consent.read().version,
    gateMargins,
    sclera,
    roiValidity: Object.fromEntries(Object.entries(rois.rois).map(([k, v]) => [k, v.valid])),
    frameJitter: reduced.frameJitter.overall,
    confidence,
    valid: rois.accepted,
    baselineVersion: BASELINE_VERSION,
  });

  // The pixels and the mesh go now, in this tick, before anything renders.
  releaseCapture(scratch);
  scratch = null;
  setCaptureTheme(false);
  const captureBtn = $("go-capture");
  if (captureBtn) {
    captureBtn.disabled = false;
    captureBtn.textContent = "Open the camera";
  }

  await store.put(reading);

  const seal = sealStateFrom({
    sealed: true,
    boundarySensitive,
    noiseConfidence: noise.confidence,
  });
  renderSeal(seal, now);
  renderTags(seal.tags);

  const calibrating = readingStateLabel(interpreted);
  state.entries.unshift({
    timestamp: now,
    sealed: true,
    attenuated: seal.attenuated,
    deltas: interpreted.deltas,
  });
  setVoice(calibrating.calibrating
    ? calibrating.text
    : history.length === 0 ? VOICE.firstSeal : VOICE.sealed(formatTime(now)));

  renderRing();
  renderLedger();
  renderArtifact(now);
  showReadingSurfaces();
  $("gate-line").textContent = "";
}

/** The abstain surface. No seal, and the gate's own worst-first instruction. */
function renderAbstain(gates) {
  const model = abstainModel(captureInstruction(gates));
  renderSeal({ type: "abstain", variant: "outlined" }, new Date());
  setVoice(model.line);
  renderTags(model.action ? [model.action] : []);
  state.entries.unshift({ timestamp: new Date(), sealed: false, attenuated: false, deltas: null });
  renderRing();
  renderLedger();
  showReadingSurfaces();
}

/* ── share ─────────────────────────────────────────────────────────────── */

async function shareArtifact() {
  if (!navigator.share) {
    $("gate-line").textContent = "This browser cannot share from the page.";
    return;
  }
  const canvas = $("artifact");
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    console.warn("beta: artifact could not be rasterised");
    return;
  }
  try {
    await navigator.share({
      title: "Mien Shiang",
      files: [new File([blob], "mien-shiang-artifact.png", { type: "image/png" })],
    });
  } catch (error) {
    // A cancelled share is the user's choice and says nothing on screen; a
    // real failure is still reported rather than swallowed.
    if (error && error.name !== "AbortError") console.warn("beta: share failed", error);
  }
}

/* ── boot ──────────────────────────────────────────────────────────────── */

export async function init(deps = {}) {
  consent = deps.consent || createConsent();
  store = deps.store || await openStore();

  $("consent-title").textContent = VOICE.consentTitle;
  $("consent-body").textContent = VOICE.consentBody;
  $("consent-accept").textContent = VOICE.consentAccept;

  exposureHalo = createExposureHalo({
    root: $("exposure-halo"),
    // Level only. The theme never enters this expression, so the capture-time
    // halo-white override cannot change how bright the flash is.
    onLevel: (level) => {
      $("plate").style.setProperty("--halo-screen-strength", (0.18 + level * 0.72).toFixed(3));
    },
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });

  $("toLibrary").addEventListener("click", () => showPane("library"));
  $("toTracker").addEventListener("click", () => showPane("tracker"));
  $("shareBtn").addEventListener("click", () => { shareArtifact(); });
  $("go-capture").addEventListener("click", () => {
    runCapture().catch((error) => {
      console.error("beta: capture failed", error);
      $("gate-line").textContent = describeCameraError(error);
      resetCaptureButton();
    });
  });

  // The three assist controls are wired ONCE, here, and act through
  // `activeCapture` — the handle the live capture publishes at start and
  // clears on every way out (see runCapture). A click while no capture is
  // running is a no-op rather than an error: the buttons are hidden then,
  // but a stray event (a queued tap landing after teardown) must not throw.
  $("screen-light").addEventListener("click", () => {
    if (!activeCapture) return;
    const next = !activeCapture.assist.active;
    activeCapture.applyAssistTransition(
      activeCapture.assist.setActive(next, { captureMode: activeCapture.getCaptureMode() }),
    );
  });
  $("use-current-light").addEventListener("click", () => {
    activeCapture?.requestLightOverride();
  });
  $("refocus-camera").addEventListener("click", () => {
    activeCapture?.requestManualRefocus().catch((error) => {
      console.warn("beta: manual refocus failed", error);
    });
  });

  // Both doors into biometric processing are behind this: the camera AND the
  // mesh. assertConsentGranted throws rather than returning false, so a caller
  // that forgets to check cannot proceed (CLAUDE.md item 41).
  $("consent-accept").addEventListener("click", () => {
    consent.grant();
    showBench();
  });

  $("library").inert = true;
  $("library").setAttribute("aria-hidden", "true");
  if (consent.isGranted()) showBench();
}

/**
 * Move between the two panes.
 *
 * The transform alone only moves the pixels: the off-screen pane keeps its
 * controls in the tab order and in the accessibility tree, and focus stays on
 * a button that has just slid out of view. `inert` removes both, and focus is
 * moved deliberately to the pane that arrived.
 */
function showPane(name) {
  const toLibrary = name === "library";
  $("bridge").classList.toggle("lib", toLibrary);
  const tracker = $("tracker");
  const library = $("library");
  tracker.inert = toLibrary;
  tracker.setAttribute("aria-hidden", String(toLibrary));
  library.inert = !toLibrary;
  library.setAttribute("aria-hidden", String(!toLibrary));
  (toLibrary ? $("toTracker") : $("toLibrary")).focus();
}

function showBench() {
  $("consent-screen").hidden = true;
  $("tracker").hidden = false;
  setVoice(VOICE.boot);
}

export const __test__ = { engineScalars, cheekLuma, renderAbstain, state };
