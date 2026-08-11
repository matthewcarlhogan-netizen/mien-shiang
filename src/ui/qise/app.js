/*
 * PHASE 9 — DOM wiring for the Qi Se tracker.
 *
 * ── WHAT IS AND IS NOT HERE ────────────────────────────────────────────────
 * Only wiring. Every decision this file appears to make is made somewhere
 * testable: gates in gates.js, the burst in camera.js, the compass in
 * baseline.js, the words in passages.js, the geometry in seal.js. What is left
 * is reading values out of one module and putting them into an element, which
 * is the part no test in this repository can reach.
 *
 * ── WHY MEDIAPIPE IS A DYNAMIC IMPORT ──────────────────────────────────────
 * `src/analysis.js` imports the MediaPipe bundle from a CDN at MODULE scope,
 * which is why nothing can load it under `node --test` and why it shipped a
 * hard syntax error behind 155 green tests (CLAUDE.md item 18a). Importing it
 * inside a function instead keeps this file's module graph clean, so
 * `node --check` and the named-export resolution test both reach it.
 *
 * It also means the CDN is not touched until after consent, which is the
 * behaviour the Phase 0 assertion is there to guarantee.
 */
import { createConsent, assertConsentGranted } from "../../qise/consent.js";
import { paletteCss } from "./palette.js";
import {
  openCamera, attachCameraPreview, describeCameraError, createLandmarkerGuarded,
  releaseCapture, GreenLatch, PolygonSmoother, BURST_FRAMES, trimmedMedianLab, reduceBurst,
} from "../../qise/camera.js";
import { createLandmarkerWithFallback } from "../../landmarker.js";
import {
  fitSelfieDimensions, validateSelfieDimensions, validateSelfieFile,
} from "../../qise/upload.js";
import { readRois } from "../../qise/rois.js";
import { headPose } from "../../qise/pose.js";
import { sampleSclera } from "../../qise/sclera.js";
import {
  SETTLE_MS, createIlluminationSession, illuminationPhase, meanFaceRgb,
  recordIlluminationSample, summarizeIllumination, publicIlluminationSummary,
} from "../../qise/illumination.js";
import { evaluateGates, captureGuide } from "../../qise/gates.js";
import { frameStats } from "../../qise/framestats.js";
import { computeReadingMetrics, lumRatioP90P50 } from "../../qise/metrics.js";
import { interpretReading, readingConfidence, axesOf } from "../../qise/baseline.js";
import { openStore } from "../../qise/store.js";
import { readingScreenModel, historyColumnModel } from "./screens.js";
import { SHARE_CADENCES, shareReadings } from "./share.js";
import { createThemeController } from "./theme.js";
import { findPatterns, describePattern } from "../../qise/patterns.js";
import { compositionOf } from "../../qise/composition.js";
import * as color from "../../qise/color.js";

const MEDIAPIPE_BUNDLE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const consent = createConsent();
let store = null;
let scratch = null;
let activeShareCadence = "week";
let captureRun = 0;
let activeReadingTab = "today";
let illuminationRequested = false;

/* ── screens ─────────────────────────────────────────────────────────────── */

function show(id) {
  for (const s of document.querySelectorAll(".screen")) {
    s.dataset.active = String(s.id === id);
  }
}

function selectReadingTab(name, { scroll = true } = {}) {
  const target = document.querySelector(`[data-reading-panel="${name}"]`);
  if (!target) return;
  activeReadingTab = name;
  for (const panel of document.querySelectorAll("[data-reading-panel]")) {
    panel.hidden = panel !== target;
  }
  for (const button of document.querySelectorAll("[data-reading-tab]")) {
    const selected = button.dataset.readingTab === name;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCaptureGuide(report = null) {
  const guide = report ? captureGuide(report) : [
    { id: "frame", state: "waiting" }, { id: "light", state: "waiting" },
    { id: "camera", state: "waiting" }, { id: "steady", state: "waiting" },
  ];
  for (const item of guide) {
    const row = document.querySelector(`[data-guide="${item.id}"]`);
    if (row) row.dataset.state = item.state;
  }
}

function showIlluminationPhase(phase) {
  const wash = $("illumination-wash");
  if (!wash || !phase) return;
  wash.hidden = false;
  wash.style.backgroundColor = phase.colour;
  wash.style.opacity = String(phase.opacity);
}

function clearIlluminationPhase() {
  const wash = $("illumination-wash");
  if (!wash) return;
  wash.style.opacity = "0";
  wash.hidden = true;
}

function illuminationOrderBit() {
  const value = new Uint8Array(1);
  crypto.getRandomValues(value);
  return value[0] & 1;
}

/* ── the capture loop ────────────────────────────────────────────────────── */

async function buildLandmarker(runningMode = "VIDEO") {
  // Dynamic, and only ever reached past the consent assertion.
  assertConsentGranted(consent, "FaceLandmarker");
  const { FaceLandmarker, FilesetResolver } = await import(MEDIAPIPE_BUNDLE);
  const fileset = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_BUNDLE}/wasm`);
  const guardedFactory = (_resolvedFileset, options) => createLandmarkerGuarded({
    consent, options,
    factory: (guardedOptions) => FaceLandmarker.createFromOptions(fileset, guardedOptions),
  });
  const built = await createLandmarkerWithFallback(
    guardedFactory,
    fileset,
    { modelAssetPath: FACE_MODEL, runningMode, outputFaceBlendshapes: false },
    (message) => { if ($("gate-line")) $("gate-line").textContent = message; },
  );
  return built.landmarker;
}

async function runCapture() {
  assertConsentGranted(consent, "the capture screen");
  const runId = ++captureRun;
  if (scratch) {
    releaseCapture(scratch);
    scratch = null;
  }
  show("screen-capture");
  renderCaptureGuide();
  $("gate-line").textContent = "Starting the camera…";
  $("ring-fill").setAttribute("stroke-dashoffset", "100");
  $("capture-help").hidden = true;
  clearIlluminationPhase();

  const video = $("preview");
  const selfiePreview = $("selfie-preview");
  video.hidden = false;
  selfiePreview.hidden = true;
  $("selfie-status").textContent = "";
  const opened = await openCamera({ consent, mediaDevices: navigator.mediaDevices });
  if (runId !== captureRun) {
    releaseCapture({ stream: opened.stream, images: [], landmarks: [], canvas: null });
    return;
  }

  let landmarker = null;
  try {
    await attachCameraPreview(video, opened.stream);
    landmarker = await buildLandmarker("VIDEO");
  } catch (error) {
    releaseCapture({
      stream: opened.stream, images: [], landmarks: [], canvas: null,
      landmarker, video,
    });
    throw error;
  }
  if (runId !== captureRun) {
    if (typeof landmarker.close === "function") landmarker.close();
    releaseCapture({ stream: opened.stream, images: [], landmarks: [], canvas: null, video });
    return;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  scratch = {
    canvas, images: [], landmarks: [], stream: opened.stream, landmarker, video,
  };

  const latch = new GreenLatch();
  const smoother = new PolygonSmoother();
  const drift = [];
  let previous = null;
  const startedAt = performance.now();

  const history = await store.all();
  const scleraHistory = history.map((r) => r.sclera && r.sclera.rawRatios).filter(Boolean);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const useIllumination = illuminationRequested && !reducedMotion;
  let illuminationDone = !useIllumination;
  let illuminationSession = null;
  let illuminationSummary = publicIlluminationSummary(null, {
    requested: illuminationRequested,
    reason: illuminationRequested && reducedMotion ? "reduced-motion" : null,
  });
  let settleUntil = 0;

  const burst = {};
  let collecting = 0;
  let lastSclera = null, lastRois = null, lastMargins = null, lastCaptureTier = "clean";

  const stopAfterLoopError = (error) => {
    if (runId !== captureRun) return;
    console.error("qise: live capture stopped", error);
    captureRun++;
    if (scratch) releaseCapture(scratch);
    scratch = null;
    clearIlluminationPhase();
    renderCaptureGuide();
    $("gate-line").textContent = error?.name
      ? describeCameraError(error)
      : "The scanner stopped. Retry the camera, or choose a selfie below.";
  };
  const scheduleStep = () => requestAnimationFrame((time) => {
    step(time).catch(stopAfterLoopError);
  });

  const step = async (nowMs) => {
    if (!scratch || runId !== captureRun) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;

    // ── THE CANVAS AND THE LANDMARKS MUST BE IN THE SAME SPACE ─────────────
    // Drawn WITHOUT a flip, deliberately. The preview is mirrored by a CSS
    // `transform: scaleX(-1)` on the <video>, and a CSS transform does not
    // touch the pixels that drawImage and detectForVideo see — both get the
    // un-mirrored stream. Flipping the canvas here therefore does not
    // "un-mirror" anything; it puts the pixel buffer into the opposite space
    // from the landmark coordinates, so every off-midline region samples its
    // reflection and quan_l/quan_r swap. That is CLAUDE.md item 5's inversion
    // arriving through the back door, past the `mirrored` flag that exists to
    // prevent it — the flag was correct and the buffer underneath it was not.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    scratch.images = [image];
    const clearFrame = () => {
      image.data.fill(0);
      if (scratch) scratch.images = [];
    };
    const result = landmarker.detectForVideo(video, nowMs);
    const mesh = result && result.faceLandmarks && result.faceLandmarks[0];

    if (mesh) {
      // z is carried through, not dropped. Without it `headPose` can only
      // measure roll, and the pose gate silently stops checking two of its
      // three axes. MediaPipe normalises z by image WIDTH, the same as x, so
      // it is scaled the same way.
      const pts = mesh.map((p) => ({
        x: p.x * canvas.width,
        y: p.y * canvas.height,
        z: typeof p.z === "number" ? p.z * canvas.width : undefined,
      }));
      if (previous) {
        const d = pts.reduce((s, p, i) => s + Math.hypot(p.x - previous[i].x, p.y - previous[i].y), 0) / pts.length;
        drift.push(d);
        if (drift.length > 5) drift.shift();
        previous.length = 0;
      }
      previous = pts;
      scratch.landmarks = [pts];

      lastRois = readRois(image, pts, { mirrored: false }, color);
      lastSclera = sampleSclera(image, pts, { mirrored: false }, { samples: scleraHistory });

      smoother.push(Object.fromEntries(
        Object.entries(lastRois.rois).map(([k, v]) => [k, v.polygons.map((p) => p.hull)])));

      const stats = frameStats(image, lastRois, canvas.width, drift, headPose(pts));
      const gates = evaluateGates(stats, pts, lastSclera, { elapsedMs: nowMs - startedAt });

      $("gate-line").textContent = gates.pass
        ? (gates.captureTier === "assisted"
          ? "Good — balancing this light on your device…"
          : "Hold it there…")
        : gates.failures[0].message;
      renderCaptureGuide(gates);
      $("capture-help").hidden = nowMs - startedAt < 6000;

      if (illuminationSession) {
        if (!gates.pass) {
          illuminationSummary = publicIlluminationSummary(
            { outcome: "inconclusive", phasesRead: 0 },
            { requested: true, reason: "frame-moved" });
          illuminationSession = null;
          illuminationDone = true;
          settleUntil = nowMs + SETTLE_MS;
          clearIlluminationPhase();
          latch.reset();
        } else {
          const active = illuminationPhase(illuminationSession, nowMs);
          if (active.done) {
            illuminationSummary = publicIlluminationSummary(
              summarizeIllumination(illuminationSession), { requested: true });
            illuminationSession = null;
            illuminationDone = true;
            settleUntil = nowMs + SETTLE_MS;
            clearIlluminationPhase();
            latch.reset();
            $("gate-line").textContent = "Screen-light check complete. Hold steady for the reading…";
          } else {
            showIlluminationPhase(active.phase);
            recordIlluminationSample(
              illuminationSession, active.phase.key, meanFaceRgb(lastRois));
            $("gate-line").textContent = "Optional screen-light check in progress…";
            $("ring-fill").setAttribute("stroke-dashoffset",
              String(100 - Math.round(((active.index + 1) / illuminationSession.sequence.length) * 100)));
            clearFrame();
            scheduleStep();
            return;
          }
        }
      }

      const held = latch.update(gates.pass, nowMs);
      $("ring-fill").setAttribute("stroke-dashoffset", String(100 - Math.round(held.progress * 100)));

      if (held.ready) {
        if (useIllumination && !illuminationDone) {
          illuminationSession = createIlluminationSession(nowMs, illuminationOrderBit());
          showIlluminationPhase(illuminationSession.sequence[0]);
          latch.reset();
          clearFrame();
          scheduleStep();
          return;
        }
        if (nowMs < settleUntil) {
          latch.reset();
        } else {
          collecting = BURST_FRAMES;
          lastMargins = gates.margins;
          lastCaptureTier = gates.captureTier;
        }
      }

      if (collecting > 0) {
        for (const [name, roi] of Object.entries(lastRois.rois)) {
          if (!roi.pixels.length) continue;
          (burst[name] ||= []).push(trimmedMedianLab(roi.pixels, color));
        }
        collecting--;
        if (collecting === 0) {
          clearFrame();
          await finish(burst, lastRois, lastSclera, opened, history, lastMargins,
            illuminationSummary, lastCaptureTier);
          return;
        }
      }
    } else {
      $("gate-line").textContent = "Bring your face into the frame.";
      renderCaptureGuide();
      $("capture-help").hidden = nowMs - startedAt < 6000;
    }

    clearFrame();
    scheduleStep();
  };
  scheduleStep();
}

async function decodeSelfie(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap, width: bitmap.width, height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch { /* Safari formats can still decode through an image element. */ }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("The selected image could not be decoded."));
      image.src = url;
    });
    return {
      source: image, width: image.naturalWidth, height: image.naturalHeight,
      release: () => { image.src = ""; URL.revokeObjectURL(url); },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function discardSelfieScratch() {
  if (scratch) releaseCapture(scratch);
  scratch = null;
  const canvas = $("selfie-preview");
  canvas.hidden = true;
}

async function runSelfie(file) {
  assertConsentGranted(consent, "selfie processing");
  const fileCheck = validateSelfieFile(file);
  if (!fileCheck.ok) {
    $("selfie-status").textContent = fileCheck.message;
    return;
  }

  const runId = ++captureRun;
  if (scratch) releaseCapture(scratch);
  scratch = null;
  show("screen-capture");
  clearIlluminationPhase();
  renderCaptureGuide();
  $("capture-help").hidden = true;
  $("ring-fill").setAttribute("stroke-dashoffset", "100");
  $("gate-line").textContent = "Checking your selfie on this device…";
  $("selfie-status").textContent = "Preparing the original photo…";

  const video = $("preview");
  video.hidden = true;
  video.srcObject = null;
  const canvas = $("selfie-preview");
  canvas.hidden = false;

  let decoded = null;
  let landmarker = null;
  try {
    decoded = await decodeSelfie(file);
    const dimensionCheck = validateSelfieDimensions(decoded.width, decoded.height);
    if (!dimensionCheck.ok) throw new Error(dimensionCheck.message);
    const fitted = fitSelfieDimensions(decoded.width, decoded.height);
    canvas.width = fitted.width;
    canvas.height = fitted.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("This browser could not prepare the selfie.");
    ctx.drawImage(decoded.source, 0, 0, fitted.width, fitted.height);
    decoded.release();
    decoded = null;

    const image = ctx.getImageData(0, 0, fitted.width, fitted.height);
    scratch = {
      canvas, images: [image], landmarks: [], stream: null, landmarker: null, video: null,
    };
    landmarker = await buildLandmarker("IMAGE");
    scratch.landmarker = landmarker;
    if (runId !== captureRun) {
      discardSelfieScratch();
      return;
    }

    const result = landmarker.detect(canvas);
    const mesh = result?.faceLandmarks?.[0];
    if (!mesh) {
      $("gate-line").textContent = "Choose a selfie with one full, front-facing face.";
      $("selfie-status").textContent = "No clear face was found. The selected photo was discarded.";
      discardSelfieScratch();
      return;
    }

    const pts = mesh.map((point) => ({
      x: point.x * canvas.width,
      y: point.y * canvas.height,
      z: typeof point.z === "number" ? point.z * canvas.width : undefined,
    }));
    scratch.landmarks = [pts];
    const history = await store.all();
    const scleraHistory = history.map((reading) => reading.sclera?.rawRatios).filter(Boolean);
    const rois = readRois(image, pts, { mirrored: false }, color);
    const sclera = sampleSclera(image, pts, { mirrored: false }, { samples: scleraHistory });
    const gates = evaluateGates(
      frameStats(image, rois, canvas.width, [], headPose(pts)), pts, sclera,
      { elapsedMs: Number.POSITIVE_INFINITY },
    );
    renderCaptureGuide(gates);
    if (!gates.pass) {
      $("gate-line").textContent = gates.failures[0].message;
      $("selfie-status").textContent = "Choose another selfie using the shot guide. This photo was discarded.";
      discardSelfieScratch();
      return;
    }

    const burst = {};
    for (const [name, roi] of Object.entries(rois.rois)) {
      if (!roi.pixels.length) continue;
      const sample = trimmedMedianLab(roi.pixels, color);
      burst[name] = Array.from({ length: BURST_FRAMES }, () => ({ ...sample }));
    }
    $("ring-fill").setAttribute("stroke-dashoffset", "0");
    $("gate-line").textContent = "Selfie ready. Writing your reading…";
    $("selfie-status").textContent = "The selected photo will now be discarded.";
    const illumination = publicIlluminationSummary(null, {
      requested: illuminationRequested,
      reason: illuminationRequested ? "selfie-upload" : null,
    });
    await finish(
      burst, rois, sclera, { captureMode: "upload" }, history, gates.margins, illumination,
      gates.captureTier,
    );
  } catch (error) {
    decoded?.release?.();
    if (runId === captureRun) {
      console.error("qise: selfie processing failed", error);
      discardSelfieScratch();
      $("gate-line").textContent = "Choose another clear, front-facing selfie.";
      $("selfie-status").textContent = `${error?.message || "The selected image could not be read."} The photo was discarded.`;
    }
  }
}

/* ── finishing a reading ─────────────────────────────────────────────────── */

async function finish(burst, rois, sclera, opened, history, gateMargins, illumination, captureTier = "clean") {
  const reduced = reduceBurst(burst);
  const rawLab = reduced.lab;
  // A still image has no temporal samples. Do not report duplicated analysis
  // rows as measured zero jitter; null says that stability was not observed.
  const frameJitter = opened.captureMode === "upload"
    ? { ...reduced.frameJitter, overall: null }
    : reduced.frameJitter;

  const correctedLab = {};
  for (const [name, lab] of Object.entries(rawLab)) {
    if (!lab) { correctedLab[name] = null; continue; }
    correctedLab[name] = sclera.gains
      ? correctLab(lab, sclera.gains)
      : { ...lab };
  }

  const lumRatio = {};
  for (const [name, roi] of Object.entries(rois.rois)) {
    if (roi.pixels.length) lumRatio[name] = lumRatioP90P50(roi.pixels, color);
  }

  const metrics = computeReadingMetrics({ rawLab, correctedLab, lumRatio });
  const confidence = readingConfidence({
    scleraConfidenceValue: sclera.confidenceValue,
    validFraction: rois.validFraction,
    frameJitter: frameJitter.overall,
    captureTier,
  });

  const interpreted = interpretReading(metrics.corrected, history, { confidence });

  const reading = {
    timestampIso: new Date().toISOString(),
    metrics,
    axes: axesOf(metrics.corrected),
    deltas: interpreted.deltas,
    compass: interpreted.compass,
    composition: compositionOf({ metrics, compass: interpreted.compass }),
    tags: [],
    deviceFingerprintHash: await fingerprintHash(),
    captureMode: opened.captureMode,
    captureTier,
    readingState: interpreted.state,
    baselineProgress: Math.min(4, history.filter((item) => item && item.valid !== false).length + 1),
    consentVersion: consent.read() && consent.read().version,
    illumination,
    // The margins from the frame that opened the burst. gates.js normalises
    // them precisely so a capture that scraped through at +0.02 can later be
    // told apart from one that sailed through, and storing null here would
    // have made that claim false of every record ever written.
    gateMargins,
    sclera,
    roiValidity: Object.fromEntries(Object.entries(rois.rois).map(([k, v]) => [k, v.valid])),
    frameJitter: frameJitter.overall,
    confidence,
    valid: rois.accepted,
  };

  // The pixels and the mesh go now, in this tick, before anything is rendered.
  releaseCapture(scratch);
  scratch = null;

  const stored = await store.put(reading);
  await renderReading({ ...stored, z: interpreted.compass ? interpreted.compass.z : null });
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

async function fingerprintHash() {
  const raw = [navigator.userAgent, screen.width, screen.height, devicePixelRatio].join("|");
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + [...new Uint8Array(digest)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── rendering ───────────────────────────────────────────────────────────── */

function compositionMarkup(composition, { compact = false } = {}) {
  const bar = `<div class="${compact ? "history-mini-bar" : "composition-bar"}" aria-label="Five-colour composition">${composition.items.map((item) =>
    `<span class="composition-segment" style="width:${item.value.toFixed(1)}%;background:${item.colour}" title="${esc(item.cjk)} ${esc(item.name)} ${item.value.toFixed(1)}%"></span>`).join("")}</div>`;
  if (compact) return bar;
  const featured = [composition.lead, composition.support].map((key, index) => {
    const item = composition.items.find((entry) => entry.key === key);
    return `<div class="composition-note"><strong><span class="cjk">${esc(item.cjk)}</span> ${esc(item.name)}</strong><span>${index ? "supporting" : "leading"} ${esc(item.note)} · ${item.value.toFixed(0)}%</span></div>`;
  }).join("");
  return `${bar}<div class="composition-lead">${featured}</div>`;
}

async function renderReading(reading) {
  const history = await store.all();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const m = readingScreenModel(reading, history, { reducedMotion: reduced });

  $("reading-seal").innerHTML = m.sealSvg;
  $("reading-verdict").textContent = m.verdict;
  $("reading-hook").textContent = m.hook.title;
  $("reading-reflection").textContent = m.hook.reflection;
  $("reading-reflection-story").textContent = m.hook.reflection;
  $("reading-stage").textContent = m.calibration.active
    ? `Anchor ${m.calibration.current} of ${m.calibration.required}`
    : "Personal shift";
  $("composition-basis").textContent = m.composition.basis === "personal-shift"
    ? "vs your pattern"
    : "today’s capture";
  $("reading-composition").innerHTML = compositionMarkup(m.composition);
  $("story-eyebrow").textContent = m.calibration.active ? "How it becomes yours" : "The tradition’s reading";
  $("story-heading").textContent = m.calibration.active ? "Why the first mark matters" : "The story beneath today";

  const progress = $("pattern-progress");
  progress.hidden = !m.calibration.active;
  progress.innerHTML = m.calibration.active
    ? `<p class="eyebrow">Building your baseline</p><h2 id="pattern-progress-h">${esc(m.calibration.title)}</h2>
       <p class="muted">${m.calibration.remaining === 1 ? "One more comparable scan" : `${m.calibration.remaining} more comparable scans`} will unlock your first personal change reading.</p>
       <div class="pattern-dots" aria-label="${m.calibration.current} of 4 anchor readings">${Array.from({ length: 4 }, (_, index) =>
         `<span class="pattern-dot" data-filled="${index < m.calibration.current}"></span>`).join("")}</div>
       <div class="pattern-count num">${m.calibration.current} / 4 anchors</div>`
    : "";
  $("pattern-range").hidden = m.calibration.active;
  $("reading-spark").hidden = m.calibration.active;

  $("reading-gauges").innerHTML = m.gauges.map((g) => g.measured
    ? `<div class="gauge"><div class="gauge-label"><span>${esc(g.label)}</span><span class="muted">${esc(g.relativeLabel)}</span></div>
       <div class="gauge-track">
         <div class="gauge-band" style="left:${(g.band.from * 100).toFixed(1)}%;width:${((g.band.to - g.band.from) * 100).toFixed(1)}%"></div>
         <div class="gauge-mark" style="left:${(g.mark * 100).toFixed(1)}%"></div>
       </div></div>`
    : `<div class="gauge"><div class="gauge-label"><span>${esc(g.label)}</span><span class="muted">${esc(g.relativeLabel)} (${g.n}/4)</span></div></div>`).join("");

  $("reading-courts").innerHTML = m.courts.map((c) =>
    `<div class="court"><div class="cjk">${esc(c.cjk)}</div>
     <div class="muted">${esc(c.label)}</div>
     <div class="num">${c.read}/${c.total} read</div></div>`).join("");

  $("reading-passage").textContent = m.passage.text;

  $("reading-tags").innerHTML = m.tags.length
    ? m.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")
    : `<span class="chip muted">No tags on this reading</span>`;

  drawSparkline($("reading-spark"), m.sparkline);

  const notices = [];
  if (m.lowConfidence) {
    notices.push("This one is marked hollow: the capture was harder to measure than usual.");
  }
  if (reading.sclera && reading.sclera.confidence === "sclera-drift") {
    notices.push("Your eyes look different today, so today's colour reading is less reliable.");
  }
  if (m.sparkline.basisChanged) {
    notices.push("The line breaks where the set of readable areas changed — the two stretches are not on the same footing.");
  }
  if (reading.captureTier === "assisted") {
    notices.push("This scan used the room-light tolerance. It stays in the column, with a small confidence reduction.");
  }
  const patterns = findPatterns(history).slice(0, 3).map(describePattern);
  $("reading-notices").innerHTML =
    [...notices, ...patterns].map((n) => `<p class="notice">${esc(n)}</p>`).join("");

  activeReadingTab = "today";
  selectReadingTab(activeReadingTab, { scroll: false });
  show("screen-reading");
  window.scrollTo({ top: 0 });
}

function drawSparkline(svg, model) {
  const measured = model.points.filter((p) => p.value !== null);
  if (measured.length < 2) { svg.innerHTML = ""; return; }
  const span = (model.max - model.min) || 1;
  const x = (i) => (i / Math.max(1, model.points.length - 1)) * 300;
  const y = (v) => 40 - ((v - model.min) / span) * 36;

  // Broken into runs: a basis change is a discontinuity, not a slope.
  const runs = [];
  let current = [];
  let basis = null;
  for (const p of model.points) {
    if (p.value === null) { if (current.length) runs.push(current); current = []; continue; }
    if (basis !== null && p.basis !== basis) { if (current.length) runs.push(current); current = []; }
    basis = p.basis;
    current.push(p);
  }
  if (current.length) runs.push(current);

  svg.innerHTML = runs.filter((r) => r.length > 1).map((run) =>
    `<polyline fill="none" stroke="var(--qise-ink)" stroke-width="1.5" points="${
      run.map((p) => `${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}" />`).join("")
    + measured.filter((p) => p.lowConfidence).map((p) =>
      `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2" fill="none" stroke="var(--qise-ink)" />`).join("");
}

async function renderHistory() {
  const limit = SHARE_CADENCES[activeShareCadence].days;
  const history = await store.all();
  const col = historyColumnModel(history, { limit });
  $("history-column").innerHTML = col.rows.map((r) =>
    `<figure><button type="button" class="history-card" data-reading-timestamp="${esc(r.timestampIso)}" aria-label="Open reading from ${esc(r.date)}">
       ${r.svg}<div class="history-copy"><span class="history-date">${esc(r.date)}</span><h2>${esc(r.hook)}</h2>
       ${compositionMarkup(r.composition, { compact: true })}<span class="muted">${r.composition.basis === "personal-shift" ? "Personal shift" : "Baseline anchor"}</span></div>
     </button></figure>`).join("")
    || `<p class="muted">Nothing recorded yet.</p>`;
  for (const button of document.querySelectorAll("[data-reading-timestamp]")) {
    button.addEventListener("click", () => {
      const selected = history.find((item) => item.timestampIso === button.dataset.readingTimestamp);
      if (selected) renderReading(selected).catch((error) => console.error(error));
    });
  }
  for (const button of document.querySelectorAll("[data-cadence]")) {
    const selected = button.dataset.cadence === activeShareCadence;
    button.setAttribute("aria-pressed", String(selected));
  }
  $("share-column").textContent = activeShareCadence === "today"
    ? "Share my colour seal"
    : (col.n === 1 ? "Share my colour column" : `Share ${col.n}-reading column`);
  show("screen-history");
}

async function shareCurrent(cadence) {
  const status = document.querySelector('.screen[data-active="true"] .share-status') || $("share-status");
  status.textContent = "Preparing your private share card…";
  const result = await shareReadings(await store.all(), cadence);
  status.textContent = {
    empty: "Complete a face scan before sharing.",
    shared: "Shared. The card contains no face photo or raw measurements.",
    downloaded: "Saved as a PNG. The card contains no face photo or raw measurements.",
    cancelled: "Share cancelled. Nothing was sent.",
  }[result.status] || "Share card ready.";
}

/* ── boot ────────────────────────────────────────────────────────────────── */

async function boot() {
  document.getElementById("qise-palette").textContent = paletteCss();
  let themeStorage = null;
  try { themeStorage = window.localStorage; } catch { /* session-only theme */ }
  createThemeController({
    root: document.documentElement,
    button: $("theme-toggle"),
    storage: themeStorage,
    media: window.matchMedia("(prefers-color-scheme: dark)"),
    themeMeta: $("theme-color"),
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("qise: offline shell registration failed", error);
    });
  }
  store = await openStore();

  const showConsentStep = (step) => {
    $("consent-step-purpose").hidden = step !== "purpose";
    $("consent-step-privacy").hidden = step !== "privacy";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  $("consent-next").addEventListener("click", () => showConsentStep("privacy"));
  $("consent-back").addEventListener("click", () => showConsentStep("purpose"));
  for (const button of document.querySelectorAll("[data-reading-tab]")) {
    button.addEventListener("click", () => selectReadingTab(button.dataset.readingTab));
  }

  $("consent-grant").addEventListener("click", async () => {
    illuminationRequested = Boolean($("illumination-opt-in")?.checked);
    consent.grant();
    try {
      await runCapture();
    } catch (err) {
      // Not swallowed. A camera that never opens must say so rather than
      // leaving the user on a screen that does nothing.
      console.error("qise: capture failed", err);
      $("gate-line").textContent = describeCameraError(err);
      show("screen-capture");
    }
  });

  $("selfie-upload").addEventListener("click", () => {
    captureRun++;
    if (scratch) releaseCapture(scratch);
    scratch = null;
    $("preview").hidden = true;
    $("gate-line").textContent = "Choose an original selfie from this device.";
  });
  $("selfie-upload").addEventListener("change", (event) => {
    const input = event.currentTarget;
    const [file] = input.files || [];
    runSelfie(file).catch((error) => {
      console.error(error);
      $("selfie-status").textContent = "That selfie could not be read. Choose another original photo.";
    }).finally(() => { input.value = ""; });
  });
  $("go-capture").addEventListener("click", () => runCapture().catch((error) => {
    console.error(error);
    $("gate-line").textContent = describeCameraError(error);
    show("screen-capture");
  }));
  $("restart-capture").addEventListener("click", () => runCapture().catch((e) => {
    console.error(e);
    $("gate-line").textContent = describeCameraError(e);
  }));
  $("go-history").addEventListener("click", () => renderHistory().catch((e) => console.error(e)));
  $("back-reading").addEventListener("click", () => show("screen-reading"));
  $("share-today").addEventListener("click", () => shareCurrent("today").catch((e) => {
    console.error(e);
    const status = document.querySelector('.screen[data-active="true"] .share-status') || $("share-status");
    status.textContent = "The share card could not be created. Your reading is still stored on this device.";
  }));
  $("share-column").addEventListener("click", () => shareCurrent(activeShareCadence).catch((e) => {
    console.error(e);
    const status = document.querySelector('.screen[data-active="true"] .share-status') || $("share-status");
    status.textContent = "The share card could not be created. Your readings are unchanged.";
  }));
  for (const button of document.querySelectorAll("[data-cadence]")) {
    button.addEventListener("click", () => {
      activeShareCadence = button.dataset.cadence;
      renderHistory().catch((e) => console.error(e));
    });
  }

  $("export-all").addEventListener("click", async () => {
    const doc = await store.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "qise-readings.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("withdraw").addEventListener("click", async () => {
    await consent.withdraw({ deleteAll: () => store.deleteAll() });
    location.reload();
  });

  if (consent.isGranted()) show("screen-reading");
  else show("screen-consent");

  const last = (await store.all()).slice(-1)[0];
  if (last) await renderReading(last);
  else if (consent.isGranted()) show("screen-capture");
}

boot().catch((err) => {
  console.error("qise: boot failed", err);
});
