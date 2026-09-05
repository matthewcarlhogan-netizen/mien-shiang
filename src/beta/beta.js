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
} from "../qise/camera.js";
import { createLandmarkerWithFallback } from "../landmarker.js";
import { evaluateGates, captureInstruction } from "../qise/gates.js";
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

function hideReadingSurfaces() {
  const surfaces = $("reading-surfaces");
  if (surfaces) surfaces.hidden = true;
}

function showReadingSurfaces() {
  const surfaces = $("reading-surfaces");
  if (surfaces) surfaces.hidden = false;
}

async function runCapture() {
  assertConsentGranted(consent, "the capture screen");
  const runId = ++captureRun;
  if (scratch) { releaseCapture(scratch); scratch = null; }

  setCaptureTheme(true);
  exposureHalo?.reset();
  hideReadingSurfaces();
  const captureBtn = $("go-capture");
  if (captureBtn) {
    captureBtn.disabled = true;
    captureBtn.textContent = "Capturing…";
  }
  $("gate-line").textContent = "Opening the camera.";
  renderCalibration([]);

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
    const focus = await ensureContinuousFocus(opened.track);
    opened.focusSupported = focus.supported;
    landmarker = await buildLandmarker();
  } catch (error) {
    releaseCapture({
      stream: opened.stream, images: [], landmarks: [], canvas: null, landmarker, video,
    });
    setCaptureTheme(false);
    throw error;
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

  const latch = new GreenLatch();
  const smoother = new PolygonSmoother();
  const drift = [];
  let previous = null;
  const startedAt = performance.now();
  let underexposureStartMs = null;

  const history = await store.all();
  const scleraHistory = history.map((r) => r.sclera && r.sclera.rawRatios).filter(Boolean);

  const burst = {};
  let collecting = 0;
  let lastRois = null, lastSclera = null, lastMargins = null, lastTier = null;

  const stopAfterLoopError = (error) => {
    if (runId !== captureRun) return;
    console.error("beta: live capture stopped", error);
    captureRun++;
    if (scratch) releaseCapture(scratch);
    scratch = null;
    setCaptureTheme(false);
    const captureBtn = $("go-capture");
    if (captureBtn) {
      captureBtn.disabled = false;
      captureBtn.textContent = "Open the camera";
    }
    $("gate-line").textContent = error?.name
      ? describeCameraError(error)
      : "The bench closed the camera. Open it again to continue.";
  };

  // The re-schedule is the last statement of the body and the body is wrapped,
  // so one throwing frame reports itself and tears the capture down instead of
  // leaving a live camera behind a dead loop (CLAUDE.md item 50).
  const scheduleStep = () => requestAnimationFrame((time) => {
    step(time).catch(stopAfterLoopError);
  });

  const step = async (nowMs) => {
    if (!scratch || runId !== captureRun) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;

    // Drawn WITHOUT a flip: the preview's mirroring is a CSS transform, which
    // does not touch the pixels drawImage and detectForVideo see. Flipping
    // here would put the buffer in the opposite space from the landmarks and
    // swap every off-midline region (CLAUDE.md item 44).
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    scratch.images = [image];
    const clearFrame = () => { image.data.fill(0); if (scratch) scratch.images = []; };

    const result = landmarker.detectForVideo(video, nowMs);
    const mesh = result && result.faceLandmarks && result.faceLandmarks[0];

    if (!mesh) {
      $("gate-line").textContent = "Bring your face into the frame.";
      exposureHalo?.setCaptureState("seeking");
      clearFrame();
      scheduleStep();
      return;
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
    const gates = evaluateGates(stats, pts, lastSclera, { elapsedMs });

    const isUnderexposed = gates.failures.some((f) => f.id === "underexposed");
    if (isUnderexposed) {
      if (underexposureStartMs === null) underexposureStartMs = nowMs;
    } else {
      underexposureStartMs = null;
    }

    const issueForMs = underexposureStartMs !== null ? nowMs - underexposureStartMs : 0;
    if (shouldUseScreenFlash({
      issuePresent: isUnderexposed,
      issueForMs,
      enabled: exposureHalo?.level > 0,
      dismissed: false,
      illuminationActive: false,
    })) {
      exposureHalo?.setLevel(1);
    }

    const instruction = captureInstruction(gates);
    $("gate-line").textContent = instruction.detail || instruction.title;

    // Warm-up first, then lock. `captureSettled` gates the LATCH, not the
    // gates, so the user keeps live feedback but cannot complete a hold that
    // ends in a burst lit differently frame to frame.
    if (!negotiationStarted && gates.pass) {
      negotiationStarted = true;
      settleAndNegotiate(opened.track)
        .then((negotiated) => {
          if (runId === captureRun) captureMode = negotiated.captureMode;
        })
        .catch((error) => {
          console.warn("beta: capture mode negotiation failed", error);
          if (runId === captureRun) captureMode = "auto";
        })
        .finally(() => { if (runId === captureRun) captureSettled = true; });
      latch.reset();
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

    const held = latch.update(gates.pass && captureSettled, nowMs);
    exposureHalo?.setCaptureState(haloStateFromCapture({
      underexposed: gates.failures.some((f) => f.id === "underexposed"),
      gatesPass: gates.pass,
      captureSettled,
    }), held.progress);

    renderCalibration(calibrationLines({
      luma: cheekLuma(stats),
      captureMode,
      haloLevel: exposureHalo?.level,
      coverage: lastRois.validFraction,
    }));

    if (held.ready) {
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
