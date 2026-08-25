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
 * The pinned MediaPipe bundle is self-hosted in the build artefact. Importing
 * it inside a function keeps this file's module graph clean, so
 * `node --check` and the named-export resolution test both reach it.
 *
 * It also means inference code is not loaded until after consent, which is the
 * behaviour the Phase 0 assertion is there to guarantee.
 */
import {
  createConsent, assertConsentGranted, consentBootTarget,
} from "../../qise/consent.js";
import { paletteCss } from "./palette.js";
import {
  openCamera, attachCameraPreview, describeCameraError, createLandmarkerGuarded,
  releaseCapture, GreenLatch, PolygonSmoother, BURST_FRAMES, trimmedMedianLab, reduceBurst,
  negotiateCaptureMode, canNegotiateCaptureMode, exposureAssistState, releaseCaptureMode,
  ensureContinuousFocus, requestCameraRefocus,
} from "../../qise/camera.js";
import { createLandmarkerWithFallback } from "../../landmarker.js";
import {
  fitSelfieDimensions, validateSelfieDimensions, validateSelfieFile,
} from "../../qise/upload.js";
import { readRois } from "../../qise/rois.js";
import { headPose } from "../../qise/pose.js";
import { sampleSclera } from "../../qise/sclera.js";
import {
  SETTLE_MS, ILLUMINATION_READY_MS, createIlluminationSession, illuminationPhase, meanFaceRgb,
  recordIlluminationSample, summarizeIllumination, publicIlluminationSummary,
  illuminationFrameStable, illuminationInterruption, abandonedIlluminationSummary,
} from "../../qise/illumination.js";
import { createScreenWakeLock } from "../../qise/wakelock.js";
import {
  evaluateGates, captureGuide, captureInstruction, canUseCurrentLight,
} from "../../qise/gates.js";
import { frameStats } from "../../qise/framestats.js";
import { computeReadingMetrics, lumRatioP90P50 } from "../../qise/metrics.js";
import { interpretReading, readingConfidence, axesOf, planSegment, BASELINE_VERSION } from "../../qise/baseline.js";
import { passageFor } from "../../qise/passages.js";
import { reflectionMode } from "../../qise/reading-flags.js";
import { reflectionFor } from "../../qise/reading-pipeline.js";
import { readingTiersWithHeritage, captureAuthorizationFromReading } from "../../qise/heritage-connections.js";
import {
  tier2ConnectorModel, tier3ConnectorModel,
  heritageConnectorTier2Markup, heritageConnectorTier3Markup,
} from "./heritage-view.js";
import { openStore } from "../../qise/store.js";
import { readingScreenModel, historyColumnModel } from "./screens.js";
import { SHARE_CADENCES, shareReadings } from "./share.js";
import {
  createExposureHalo, haloStateFromCapture, shouldUseScreenFlash,
} from "./exposure-halo.js";
import { bindPalaceExperience } from "./palace-experience.js";
import { createThemeController } from "./theme.js";
import { findPatterns, describePattern } from "../../qise/patterns.js";
import { compositionOf } from "../../qise/composition.js";
import { measureIntegratedReading } from "../../qise/integrated.js";
import * as color from "../../qise/color.js";

const MEDIAPIPE_BUNDLE = new URL("../../vendor/mediapipe/vision_bundle.mjs", import.meta.url).href;
const MEDIAPIPE_WASM = new URL("../../vendor/mediapipe/wasm", import.meta.url).href;
const FACE_MODEL = new URL(
  "../../vendor/mediapipe/models/face_landmarker.task", import.meta.url,
).href;

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
let screenLightRequested = false;
let screenLightRevision = 0;
let screenLightDismissed = false;
let lightOverrideRequested = false;
let screenFlashThemeColour = null;
let exposureHalo = null;
let releasePalaceExperience = () => {};

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
    if (row) {
      row.dataset.state = item.state;
      if (item.state === "adjust") row.setAttribute("aria-current", "step");
      else row.removeAttribute("aria-current");
    }
  }
  const readyCount = guide.filter((item) => item.state === "ready").length;
  if ($("capture-ready-count")) {
    $("capture-ready-count").textContent = `${readyCount} of ${guide.length} ready`;
  }
  const instruction = captureInstruction(report);
  setCapturePrompt(instruction.title, instruction.detail, instruction.id === "ready" ? "ready" : "adjust");
}

function setCapturePrompt(title, detail = "", state = "adjust") {
  const line = $("gate-line");
  const supporting = $("gate-detail");
  const coach = $("capture-coach");
  if (line && line.textContent !== title) line.textContent = title;
  if (supporting && supporting.textContent !== detail) supporting.textContent = detail;
  if (coach) coach.dataset.state = state;
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

function setScreenLight(enabled, { syncHalo = true } = {}) {
  const next = Boolean(enabled);
  if (screenLightRequested !== next) screenLightRevision++;
  screenLightRequested = next;
  const fill = $("exposure-fill");
  const button = $("screen-light");
  const themeMeta = $("theme-color");
  document.documentElement.dataset.screenFlash = String(next);
  if (next && themeMeta) {
    if (screenFlashThemeColour === null) screenFlashThemeColour = themeMeta.content;
    themeMeta.content = "#FFFDF5";
  } else if (!next && themeMeta && screenFlashThemeColour !== null) {
    themeMeta.content = screenFlashThemeColour;
    screenFlashThemeColour = null;
  }
  if (fill) fill.hidden = !next;
  if (syncHalo && exposureHalo) {
    // Programmatic activation must drive the same full-strength CSS values as
    // direct input. The old emit:false path exposed a nearly invisible 18%
    // halo, which was not enough light to shorten a mobile-camera exposure.
    exposureHalo.setLevel(next ? 1 : 0);
  }
  if (button) {
    button.setAttribute("aria-pressed", String(next));
    button.textContent = next ? "Screen flash on — tap to turn off" : "Turn on screen flash";
    button.dataset.emphasis = String(!next && !button.hidden);
  }
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
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
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
  setCapturePrompt("Opening the camera", "Bring your face into the oval.");
  $("ring-fill").setAttribute("stroke-dashoffset", "100");
  $("capture-help").hidden = true;
  clearIlluminationPhase();
  setScreenLight(false);
  exposureHalo?.reset();
  $("screen-light").hidden = true;
  $("refocus-camera").hidden = true;
  $("use-current-light").hidden = true;
  screenLightDismissed = false;
  lightOverrideRequested = false;
  $("capture-frame").dataset.previewLift = "false";
  $("illumination-state").hidden = !illuminationRequested;
  $("illumination-state").textContent = illuminationRequested
    ? "Colour response check selected"
    : "";

  const video = $("preview");
  const selfiePreview = $("selfie-preview");
  video.hidden = false;
  selfiePreview.hidden = true;
  $("selfie-status").textContent = "";
  // negotiate:false — the exposure lock happens after the preview is live and
  // AE has converged, not on the line after getUserMedia. See
  // EXPOSURE_WARMUP_MS in qise/camera.js.
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
    const focus = await ensureContinuousFocus(opened.track);
    landmarker = await buildLandmarker("VIDEO");
    opened.focusSupported = focus.supported;
    setCapturePrompt("Finding your face", "Keep your full face inside the oval.");
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
  // Held for the whole capture, and released by releaseCapture() on every way
  // out. Acquired AFTER the camera opened so a refused camera never leaves the
  // phone awake for a capture that is not happening. Not awaited and never
  // gated on: the lock is an improvement, and a capture must run identically
  // on a host that has no wake lock API at all.
  const wakeLock = createScreenWakeLock({
    wakeLock: navigator.wakeLock,
    documentRef: document,
  });
  wakeLock.acquire();
  scratch = {
    canvas, images: [], landmarks: [], stream: opened.stream, landmarker, video,
    wakeLock,
  };

  // ── EXPOSURE SETTLES BEFORE THE BURST CAN ARM ─────────────────────────────
  // Elapsed time alone is not proof that Android auto-exposure has converged.
  // Keep AE/AWB live until a measured frame is good, then lock that good state
  // before the sustained hold can arm.
  let captureMode = "auto";
  let captureSettled = false;
  let modeNegotiationStarted = false;
  let exposureReleaseStarted = false;
  let underexposedSince = null;
  let softSince = null;
  let flashIssueSince = null;
  let refocusStarted = false;

  const latch = new GreenLatch();
  const illuminationLatch = new GreenLatch(ILLUMINATION_READY_MS);
  let observedScreenLightRevision = screenLightRevision;
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
  let resumeScreenLightAfterIllumination = false;
  let illuminationSummary = publicIlluminationSummary(null, {
    requested: illuminationRequested,
    reason: illuminationRequested && reducedMotion ? "reduced-motion" : null,
  });
  let settleUntil = 0;

  const burst = {};
  let collecting = 0;
  let lastSclera = null, lastRois = null, lastMargins = null, lastCaptureTier = null;

  /**
   * Abandon a running screen-light session, wherever the loop noticed.
   *
   * ONE function called from BOTH branches, on purpose. This teardown used to
   * be written inline inside `if (mesh)`, so the gate-failure path cleared the
   * wash and the face-lost path — which is the `else` of that same `if` — did
   * not. A lost face therefore left the overlay painted at whatever colour the
   * sequence had reached, which can be blue or green at 0.62 opacity, and the
   * preview simply went dark and stayed dark.
   */
  const abandonIllumination = (reason, nowMs) => {
    illuminationSummary = abandonedIlluminationSummary(reason);
    illuminationSession = null;
    illuminationDone = true;
    settleUntil = nowMs + SETTLE_MS;
    clearIlluminationPhase();
    $("illumination-state").hidden = false;
    $("illumination-state").textContent = reason === "face-lost"
      ? "Colour response check skipped — face left the frame"
      : "Colour response check skipped — frame moved";
    // The sequence changed the light on the face part-way through the hold, so
    // the seconds already banked are not seconds of the steady frame the latch
    // is meant to be measuring.
    latch.reset();
  };

  const stopAfterLoopError = (error) => {
    if (runId !== captureRun) return;
    console.error("qise: live capture stopped", error);
    captureRun++;
    if (scratch) releaseCapture(scratch);
    scratch = null;
    clearIlluminationPhase();
    renderCaptureGuide();
    if (error?.code === "INCOMPLETE_PALACE_MEASUREMENT") {
      $("gate-line").textContent =
        "All 12 palaces need a clear, front-facing view. Keep your forehead, temples, eyes and chin inside the halo, then retry.";
      $("capture-help").hidden = false;
    } else {
      $("gate-line").textContent = error?.name
        ? describeCameraError(error)
        : "The scanner stopped. Retry the camera, or choose a selfie below.";
    }
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
      const gates = evaluateGates(stats, pts, lastSclera, {
        elapsedMs: nowMs - startedAt,
        acceptUnevenLight: lightOverrideRequested,
      });
      const illuminationStable = illuminationFrameStable(gates);

      const elapsedMs = nowMs - startedAt;
      const underexposed = gates.failures.some((failure) => failure.id === "underexposed");
      const unevenLight = gates.failures.some((failure) =>
        failure.id === "sidelight" || failure.id === "illuminant");
      const soft = gates.failures.some((failure) => failure.id === "filter");
      underexposedSince = underexposed ? (underexposedSince ?? nowMs) : null;
      softSince = soft ? (softSince ?? nowMs) : null;
      const flashIssue = underexposed || unevenLight || soft;
      flashIssueSince = flashIssue ? (flashIssueSince ?? nowMs) : null;
      const exposureAssist = exposureAssistState({
        underexposed,
        underexposedForMs: underexposedSince === null ? 0 : nowMs - underexposedSince,
        screenLightEnabled: screenLightRequested,
      });
      $("capture-frame").dataset.previewLift = String(exposureAssist.liftPreview);
      $("screen-light").hidden = !(exposureAssist.offerScreenLight || unevenLight || screenLightRequested);
      $("screen-light").dataset.emphasis = String(
        !screenLightRequested && (exposureAssist.offerScreenLight || unevenLight));
      $("refocus-camera").hidden = !(soft && opened.focusSupported);
      $("refocus-camera").dataset.emphasis = String(soft && opened.focusSupported);
      const currentLightAvailable = canUseCurrentLight(gates, elapsedMs);
      $("use-current-light").hidden = lightOverrideRequested || !currentLightAvailable;
      $("use-current-light").dataset.emphasis = String(currentLightAvailable);

      // Match the native front-camera behaviour: once darkness, uneven light,
      // or softness persists, turn the whole screen into a neutral flash. It
      // stays on through the hold and burst; a manual dismissal is respected.
      if (shouldUseScreenFlash({
        issuePresent: flashIssue,
        issueForMs: flashIssueSince === null ? 0 : nowMs - flashIssueSince,
        enabled: screenLightRequested,
        dismissed: screenLightDismissed,
        illuminationActive: Boolean(illuminationSession),
      })) {
        setScreenLight(true);
      }

      if (soft && opened.focusSupported && !illuminationSession && !refocusStarted
          && nowMs - softSince >= 700) {
        refocusStarted = true;
        requestCameraRefocus(opened.track).catch((error) => {
          console.warn("qise: automatic refocus failed", error);
        });
      }
      if (!soft) refocusStarted = false;

      if (observedScreenLightRevision !== screenLightRevision) {
        observedScreenLightRevision = screenLightRevision;
        latch.reset();
      }

      if (canNegotiateCaptureMode({
        gatesPass: gates.pass, elapsedMs, negotiationStarted: modeNegotiationStarted,
      })) {
        modeNegotiationStarted = true;
        captureSettled = false;
        latch.reset();
        negotiateCaptureMode(opened.track)
          .then((negotiated) => {
            if (runId === captureRun) captureMode = negotiated.captureMode;
          })
          .catch((error) => {
            console.warn("qise: capture mode negotiation failed", error);
            if (runId === captureRun) captureMode = "auto";
          })
          .finally(() => {
            if (runId === captureRun) captureSettled = true;
          });
      }

      renderCaptureGuide(gates);
      if (gates.pass && !captureSettled) {
        setCapturePrompt("Keep still — the camera is settling", "Stay in the oval for one moment.", "ready");
      } else if (gates.pass && gates.captureTier === "assisted") {
        setCapturePrompt("This light will work — hold still", "The reading will record reduced light confidence.", "ready");
      } else if (exposureAssist.message && underexposed) {
        const instruction = captureInstruction(gates);
        setCapturePrompt(instruction.title, instruction.detail);
      }
      $("capture-help").hidden = !currentLightAvailable;

      if (illuminationSession) {
        const interruption = illuminationInterruption({
          hasFace: true, frameStable: illuminationStable,
        });
        if (interruption.abandon) {
          abandonIllumination(interruption.reason, nowMs);
        } else {
          const active = illuminationPhase(illuminationSession, nowMs);
          if (active.done) {
            illuminationSummary = publicIlluminationSummary(
              summarizeIllumination(illuminationSession), { requested: true });
            illuminationSession = null;
            illuminationDone = true;
            settleUntil = nowMs + SETTLE_MS;
            clearIlluminationPhase();
            if (resumeScreenLightAfterIllumination && !screenLightDismissed) {
              setScreenLight(true);
            }
            latch.reset();
            $("illumination-state").hidden = false;
            $("illumination-state").textContent = "Colour response check complete";
            $("gate-line").textContent = "Screen-light check complete. Hold steady for the reading…";
          } else {
            showIlluminationPhase(active.phase);
            $("illumination-state").hidden = false;
            $("illumination-state").textContent = `Colour response check · ${active.phase.id}`;
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

      // The opted-in colour sequence happens before capture and needs stable
      // geometry, not already-perfect lighting. Requiring every light gate to
      // pass made the control appear dead in exactly the dark-scene case where
      // the user expected to see it, and the blue/green phases then failed the
      // very gates whose input they intentionally change.
      if (useIllumination && !illuminationDone && !illuminationSession) {
        const ready = illuminationLatch.update(illuminationStable, nowMs);
        if (illuminationStable) {
          $("gate-line").textContent = "Colour response check ready — hold still…";
          $("ring-fill").setAttribute("stroke-dashoffset",
            String(100 - Math.round(ready.progress * 100)));
        }
        if (ready.ready) {
          resumeScreenLightAfterIllumination = screenLightRequested;
          setScreenLight(false);
          $("screen-light").hidden = true;
          illuminationSession = createIlluminationSession(nowMs, illuminationOrderBit());
          showIlluminationPhase(illuminationSession.sequence[0]);
          $("illumination-state").hidden = false;
          $("illumination-state").textContent = "Colour response check · neutral";
          latch.reset();
        }
        clearFrame();
        scheduleStep();
        return;
      }

      // A lock taken at a good exposure can be wrong moments later — the
      // subject turns towards a window, or a lamp goes off. Handing exposure
      // back is what keeps "find more light" actionable, because a locked
      // sensor cannot respond to more light. Once only: flipping back and
      // forth would itself be a moving illuminant.
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
            if (reverted.reverted) {
              modeNegotiationStarted = false;
              exposureReleaseStarted = false;
            } else {
              captureSettled = true;
            }
          })
          .catch((error) => {
            console.warn("qise: exposure hand-back failed", error);
            if (runId === captureRun) captureSettled = true;
          });
      }

      // `captureSettled` gates the LATCH rather than the gates themselves, so
      // the user still sees live feedback during the warm-up; what they cannot
      // do is complete a hold that ends in a burst lit differently frame to
      // frame.
      const held = latch.update(gates.pass && captureSettled, nowMs);
      $("ring-fill").setAttribute("stroke-dashoffset", String(100 - Math.round(held.progress * 100)));
      exposureHalo?.setCaptureState(haloStateFromCapture({
        underexposed, gatesPass: gates.pass, captureSettled,
      }), held.progress);

      if (held.ready) {
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
          // The NEGOTIATED mode, not the one openCamera returned — that is
          // "pending" now, and if exposure was handed back part-way through
          // the hold this reading was taken under "auto". The record has to
          // say which, because captureMode is what tells a later baseline that
          // the class of capture changed.
          await finish(burst, lastRois, lastSclera, { ...opened, captureMode },
            history, lastMargins, illuminationSummary, lastCaptureTier, image, pts);
          return;
        }
      }
    } else {
      // The face is gone, so there is nothing left to sample and the wash must
      // come off the preview NOW. Without this the overlay stays painted while
      // the copy below it asks for a face, which is the one instruction the
      // darkened preview makes hardest to follow.
      if (illuminationSession) {
        const interruption = illuminationInterruption({
          hasFace: false, frameStable: false,
        });
        abandonIllumination(interruption.reason, nowMs);
      }
      setCapturePrompt("Come into view", "Centre your face inside the oval.");
      underexposedSince = null;
      softSince = null;
      flashIssueSince = null;
      refocusStarted = false;
      $("capture-frame").dataset.previewLift = "false";
      $("refocus-camera").hidden = true;
      $("use-current-light").hidden = true;
      exposureHalo?.setCaptureState("seeking");
      if (!screenLightRequested) $("screen-light").hidden = true;
      renderCaptureGuide();
      $("capture-help").hidden = true;
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
    $("gate-line").textContent = "Analyzing geometry… Mapping all 12 palaces.";
    $("selfie-status").textContent = "The selected photo will now be discarded.";
    const illumination = publicIlluminationSummary(null, {
      requested: illuminationRequested,
      reason: illuminationRequested ? "selfie-upload" : null,
    });
    await finish(
      burst, rois, sclera, { captureMode: "upload" }, history, gates.margins, illumination,
      gates.captureTier, image, pts,
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

/*
 * `captureTier` has NO DEFAULT on purpose. `src/qise/gates.js`'s
 * `evaluateGates()` is the only thing that ever produces a real value here
 * ("clean"/"assisted" when the gates passed, "waiting" when they did not),
 * and `captureAuthorizationFromReading()` (heritage-connections.js) trusts
 * this field as PROOF the capture-quality gates ran. A default parameter
 * that silently supplied "clean" would manufacture that proof for any call
 * site that forgot to derive it from real gate evidence — the reading would
 * look authorised without ever having been gated. Both current call sites
 * already pass an explicit, gate-derived tier; this assertion is what keeps
 * that true for the next one too, by failing loudly instead of silently
 * authorising.
 */
const VALID_CAPTURE_TIERS = Object.freeze(["clean", "assisted", "waiting"]);

async function finish(burst, rois, sclera, opened, history, gateMargins, illumination,
  captureTier, acceptedImage = null, acceptedPoints = null) {
  if (!VALID_CAPTURE_TIERS.includes(captureTier)) {
    throw new Error(
      `finish() requires an explicit gate-derived captureTier ("clean"/"assisted"/"waiting"); received ${JSON.stringify(captureTier)}`,
    );
  }
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

  const currentTimestamp = new Date().toISOString();
  const now = new Date();
  const canonicalDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const captureClass = opened.captureMode || "auto";
  const plan = planSegment(history, {
    timestampIso: currentTimestamp,
    canonicalDay,
    captureClass,
    current: metrics.corrected,
  });
  if (plan.replacedTimestampIso) await store.delete(plan.replacedTimestampIso);
  history = plan.history;
  const lineageId = plan.lineageId;

  const interpreted = interpretReading(metrics.corrected, history, { 
    confidence, 
    timestampIso: currentTimestamp,
    captureMode: captureClass,
  });

  let integrated = null;
  if (acceptedImage && acceptedPoints) {
    $("gate-line").textContent = "Analyzing geometry… Mapping all 12 palaces.";
    integrated = measureIntegratedReading(acceptedImage, acceptedPoints);
    $("gate-line").textContent = "12 palaces unlocked. Opening your reading…";
  }

  const reading = {
    timestampIso: currentTimestamp,
    lineageId,
    canonicalDay,
    captureClass,
    metrics,
    axes: axesOf(metrics.corrected),
    deltas: interpreted.deltas,
    compass: interpreted.compass,
    z: interpreted.z,
    composition: compositionOf({ metrics, compass: interpreted.compass }),
    integrated,
    tags: [],
    baselineVersion: BASELINE_VERSION,
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
  await renderReading(stored);
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

/* ── rendering ───────────────────────────────────────────────────────────── */

function compositionMarkup(composition, { compact = false } = {}) {
  const bar = `<div class="${compact ? "history-mini-bar" : "composition-bar"}" aria-label="Five-colour composition">${composition.items.map((item) =>
    `<span class="composition-segment" style="width:${item.value.toFixed(1)}%;background:${item.colour}" title="${esc(item.name)} ${item.value.toFixed(1)}%"></span>`).join("")}</div>`;
  if (compact) return bar;
  const featured = [composition.lead, composition.support].map((key, index) => {
    const item = composition.items.find((entry) => entry.key === key);
    return `<div class="composition-note"><strong>${esc(item.name)}</strong><span>${index ? "supporting" : "leading"} ${esc(item.note)} · ${item.value.toFixed(0)}%</span></div>`;
  }).join("");
  return `${bar}<div class="composition-lead">${featured}</div>`;
}

function integratedTodayMarkup(model) {
  if (!model?.available) return "";
  return `<p class="eyebrow">Colour + structure</p>
    <h2 id="integrated-h">${esc(model.headline)}</h2>
    <p>${esc(model.synthesis)}</p>
    <div class="integrated-mark">
      <div class="integrated-glyph" aria-hidden="true">${esc(model.element.name.slice(0, 2).toUpperCase())}</div>
      <div><strong>${esc(model.element.name)} frame</strong>
      <div class="integrated-frame">${esc(model.frameLine)}</div></div>
    </div>`;
}

function integratedStoryMarkup(model) {
  if (!model?.available) return model?.note
    ? `<section class="structure-section"><p class="muted">${esc(model.note)}</p></section>`
    : "";

  const courtNames = { upper: "Upper", middle: "Middle", lower: "Lower" };
  const courtBars = Object.entries(model.courts.percentages).map(([key, value]) =>
    `<div class="court-bar"><span>${esc(courtNames[key])}</span>
      <span class="court-track"><span class="court-fill" style="width:${value || 0}%"></span></span>
      <span class="num">${value ?? "—"}%</span></div>`).join("");
  const palaceAccents = ["chi", "huang", "qing", "bai", "hei"];
  const palaceList = model.palaces.all || model.palaces.measured;
  const palaces = palaceList.map((palace, index) => {
    const revealId = `palace-reveal-${esc(palace.key)}`;
    const status = palace.measured ? "region available" : "region unavailable";
    const reading = palace.reading;
    const sourceHeld = palace.heritageStatus !== "RUNTIME_PROSE";
    return `<article class="palace-card" data-open="false" data-palace="${esc(palace.key)}"
        style="--palace-index:${index};--palace-accent:var(--${palaceAccents[index % palaceAccents.length]})">
      <button class="palace-enter" type="button" aria-expanded="false" aria-controls="${revealId}">
        <span class="palace-number num">${String(index + 1).padStart(2, "0")}</span>
        <span class="palace-title"><strong>${esc(palace.name)}</strong>
          ${sourceHeld ? "" : `<span class="muted">${esc(palace.location)}</span>`}</span>
        <span class="palace-arrow" aria-hidden="true">↗</span>
      </button>
      <div class="palace-reveal" id="${revealId}" hidden>
        <span class="palace-tone" data-contextual="${!palace.measured}">${esc(status)}</span>
        ${reading
          ? `<p>${esc(reading)}</p>`
          : `<p class="source-note">${esc(palace.sourceReviewNote || "Heritage interpretation withheld pending source review.")}</p>`}
        ${palace.measured ? "" : `<p class="source-note">${esc(palace.notMeasuredNote)}</p>`}
      </div>
    </article>`;
  }).join("");
  const harmonyParts = (model.harmony?.components || []).map((component) =>
    `<span class="harmony-part">${esc(component.key)}${component.percent === null ? "" : ` · ${component.percent}%`}</span>`).join("");

  return `<section class="structure-section">
      <p class="eyebrow">Five Elements</p>
      <h2>${esc(model.element.name)} · ${esc(model.element.shape)} geometry</h2>
      <p class="structure-reading">${esc(model.element.reading)}</p>
      <details class="source-note"><summary>Where sources differ</summary><p>${esc(model.element.sourcesDiffer)}</p></details>
    </section>
    <section class="structure-section">
      <p class="eyebrow">Three Sections</p>
      <h2>${esc(model.courts.label)}</h2>
      <div class="court-bars">${courtBars}</div>
      <p class="structure-reading">${esc(model.courts.measurementObservation)}</p>
      <p class="source-note">${esc(model.courts.measurementCaveat)}</p>
    </section>
    <section class="structure-section palace-collection" id="palace-collection">
      <p class="eyebrow">Twelve Palaces</p>
      <div class="palace-heading"><div><h2>Measured regions, interpretation withheld</h2>
      <p class="muted">${model.palaces.measuredCount} of ${model.palaces.totalCount} regions were available in this scan. The chapter evidence is still under review.</p></div>
      <div class="palace-count" aria-label="${model.palaces.measuredCount} of ${model.palaces.totalCount} regions measured"><strong>${model.palaces.measuredCount}</strong><span>/ ${model.palaces.totalCount}</span></div></div>
      <div class="palace-grid">${palaces}</div>
      <button class="palace-delight" type="button" data-delight="palaces">Save this reading</button>
      ${model.palaces.sourceReviewNote ? `<p class="source-note">${esc(model.palaces.sourceReviewNote)}</p>` : ""}
      <details class="source-note"><summary>Placement note</summary><p>${esc(model.palaces.sourcesDiffer)}</p></details>
    </section>
    ${model.harmony ? `<section class="structure-section">
      <p class="eyebrow">Named proportion canons</p>
      <h2>${esc(model.harmony.label)}</h2>
      <p class="muted">This compares measured proportions with named historical conventions. It is not a rating of a face.</p>
      <div class="harmony-parts">${harmonyParts}</div>
      <details class="source-note"><summary>Why the sources do not form one system</summary><p>${esc(model.harmony.sourcesDiffer)}</p></details>
    </section>` : ""}`;
}

/*
 * THE REFLECTION ENGINE SURFACES, BEHIND THE ROLLOUT FLAG.
 *
 * Off by default. `?reflection=on` runs the new path; `?reflection=compare`
 * renders both engines against the same stored reading so the two can be read
 * side by side before the old one is retired. Nothing here mutates the record
 * or the existing panels — the current engine keeps writing what it always
 * wrote, and this adds surfaces beside it. That is the whole point of a
 * comparison flag: if the new path is wrong, the evidence is visible rather
 * than shipped.
 */
function renderReflection(reading, history) {
  const todayNode = $("reflection-today");
  const storyNode = $("reflection-story");
  const compareNode = $("reflection-compare");
  const whyNode = $("reflection-why");
  const whyTab = $("reading-tab-why");
  const whyPanel = document.querySelector('[data-reading-panel="why"]');
  if (!todayNode || !storyNode || !whyNode || !whyTab || !whyPanel) return;

  const mode = reflectionMode({
    search: location.search,
    hostname: location.hostname,
    storage: (() => { try { return localStorage; } catch { return null; } })(),
  });

  if (mode === "off") {
    for (const node of [todayNode, storyNode, compareNode]) if (node) node.hidden = true;
    whyTab.hidden = true;
    whyPanel.hidden = true;
    return;
  }

  const reflection = reflectionFor(reading, history);
  /*
   * Stage 3: heritage-connector material rides alongside tier2/tier3 as
   * `.connectors` (see src/qise/heritage-connections.js). Gates fail closed
   * on anything other than an explicit `true`.
   *
   * `captureQualityPassed` is derived from `reading.captureTier` — the field
   * `src/qise/gates.js`'s `evaluateGates()` writes, and the ONLY thing that
   * ever writes it. An object existing is not proof its own gates passed;
   * `captureTier` is that proof (`captureAuthorizationFromReading` fails
   * closed to `undefined` for anything other than an explicit "clean" or
   * "assisted").
   *
   * `safetyPassed` is deliberately left unset: the Qi Se tracker has no
   * safety-referral gate of its own yet (unlike the legacy Module A/B malar
   * gate), so there is nothing true to assert, and an unasserted gate must
   * suppress rather than silently pass. Wire a real safety signal here if
   * and when one is built for Qi Se — capture-quality passing must never be
   * treated as a substitute for it.
   */
  const tiers = reflection && readingTiersWithHeritage(reflection, {
    captureQualityPassed: captureAuthorizationFromReading(reading),
  });
  if (!tiers) {
    for (const node of [todayNode, storyNode, compareNode]) if (node) node.hidden = true;
    whyTab.hidden = true;
    // The panel is hidden alongside its tab, exactly as the `off` branch
    // above does. Hiding only the tab leaves a reader who already opened Why
    // looking at the PREVIOUS reading's text with no way to dismiss it —
    // stale content presented as current. Item 51's shape: a teardown
    // written into one branch of a conditional and not the other.
    whyPanel.hidden = true;
    return;
  }

  const { tier1, tier2, tier3 } = tiers;
  const heritageTier2 = tier2ConnectorModel(tier2.connectors);
  const heritageTier3 = tier3ConnectorModel(tier3.connectors);
  // One reading-level disclosure value, bound once. Story and Why each
  // render it exactly once; neither connector-markup function renders its
  // own copy (see heritage-view.js) — the surface owns disclosure, not the
  // connector card.
  const rotationDisclosure = tier2.rotationDisclosure;

  todayNode.hidden = false;
  todayNode.innerHTML = `
    <p class="eyebrow">${tier1.abstained ? "Not read today" : "Today"}</p>
    <h2>${esc(tier1.headline)}</h2>
    ${tier1.body.map((line) => `<p>${esc(line)}</p>`).join("")}
    ${tier1.history.map((line) => `<p class="muted">${esc(line)}</p>`).join("")}
    ${tier1.confidence ? `<p class="muted">${esc(tier1.confidence)}</p>` : ""}
    ${tier1.selfReport ? `<p class="muted">${esc(tier1.selfReport)}</p>` : ""}`;

  storyNode.hidden = false;
  storyNode.innerHTML = `
    <p class="eyebrow">The tradition\u2019s reading</p>
    <p class="story-passage">${esc(tier2.passage)}</p>
    <p class="muted">${esc(tier2.attribution)}</p>
    <p class="muted">${esc(rotationDisclosure)}</p>
    <p>${esc(tier2.bridge)}</p>
    <p class="reflection">${esc(tier2.question)}</p>
    ${heritageConnectorTier2Markup(heritageTier2)}`;

  if (compareNode) {
    const comparing = mode === "compare";
    compareNode.hidden = !comparing;
    if (comparing) {
      const previous = passageFor(reading.compass, reading.z || {}, reading.timestampIso);
      compareNode.innerHTML = `
        <p class="eyebrow">Side by side</p>
        <div class="section-label"><h2>Current engine</h2><span class="muted">${esc(previous.provenanceId)}</span></div>
        <p class="story-passage">${esc(previous.text)}</p>
        <div class="section-label"><h2>Reflection engine</h2><span class="muted">${esc(tier3.provenance.engine)}</span></div>
        <p class="story-passage">${esc(tier2.passage)} ${esc(tier2.bridge)} ${esc(tier2.question)}</p>`;
    }
  }

  whyTab.hidden = false;
  whyNode.innerHTML = `
    <p class="muted">${esc(rotationDisclosure)}</p>
    <div class="section-label"><h2>What produced each line</h2><span class="muted">${esc(tier3.provenance.corpus)}</span></div>
    ${["observation", "heritage", "reflection"].map((layer) => `
      <p class="eyebrow">${esc(layer)}</p>
      ${tier3.byLayer[layer].map((entry) => `
        <p>${esc(entry.sentence)}</p>
        <p class="muted">${esc(entry.component)} \u2190 ${esc(entry.because.join(", "))}</p>`).join("")}`).join("")}
    <div class="section-label"><h2>Today\u2019s state</h2><span class="muted">what makes this reading this reading</span></div>
    <div class="chips">${tier3.dimensions.map((d) =>
      `<span class="chip">${esc(d.field)}: ${esc(String(d.value))}</span>`).join("")}</div>
    <p class="muted">Carried but not part of the state: ${esc(tier3.notIdentifying.join(", "))}.</p>
    ${heritageConnectorTier3Markup(heritageTier3)}`;
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
  const integratedCard = $("reading-integrated");
  integratedCard.hidden = !m.integrated.available;
  integratedCard.innerHTML = integratedTodayMarkup(m.integrated);
  $("reading-structure-story").innerHTML = integratedStoryMarkup(m.integrated);
  releasePalaceExperience();
  releasePalaceExperience = bindPalaceExperience($("reading-structure-story"), {
    reducedMotion: reduced,
    onDelight: () => shareCurrent("today").catch((error) => {
      console.error(error);
      $("share-status").textContent = "The moment could not be prepared. Your reading is unchanged.";
    }),
  });
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
    `<div class="court"><div>${esc(c.label)}</div>
     <div class="num">${c.read}/${c.total} read</div></div>`).join("");

  $("reading-passage").textContent = m.passage.text;
  renderReflection(reading, history);

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
  exposureHalo = createExposureHalo({
    root: $("exposure-halo"),
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    onLevel: (level) => {
      const frame = $("capture-frame");
      frame.style.setProperty("--halo-screen-strength", (0.18 + level * 0.72).toFixed(3));
      frame.style.setProperty("--manual-preview-brightness", (1 + level * 0.32).toFixed(3));
      // The gesture controls screen illumination immediately. Sensor exposure
      // remains governed by the validated capture gates, avoiding driver lag.
      setScreenLight(level > 0.015, { syncHalo: false });
    },
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
  const illuminationMotionBlocked = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (illuminationMotionBlocked) {
    $("illumination-opt-in").checked = false;
    $("illumination-opt-in").disabled = true;
  }
  const renderIlluminationChoice = () => {
    const selected = Boolean($("illumination-opt-in")?.checked);
    $("illumination-choice").dataset.selected = String(selected);
    $("illumination-choice-status").textContent = illuminationMotionBlocked
      ? "Unavailable while reduced-motion mode is enabled on this device."
      : selected
        ? "Selected — the colour response check will run before capture."
        : "Off — the reading will use the normal camera only.";
  };
  $("illumination-opt-in").addEventListener("change", renderIlluminationChoice);
  renderIlluminationChoice();
  for (const button of document.querySelectorAll("[data-reading-tab]")) {
    button.addEventListener("click", () => selectReadingTab(button.dataset.readingTab));
  }
  $("today-palaces").addEventListener("click", () => {
    selectReadingTab("story", { scroll: false });
    requestAnimationFrame(() => $("palace-collection")?.scrollIntoView({ behavior: "smooth" }));
  });
  $("today-pattern").addEventListener("click", () => selectReadingTab("pattern"));
  $("today-delight").addEventListener("click", () => shareCurrent("today").catch((error) => {
    console.error(error);
    $("share-status").textContent = "The moment could not be prepared. Your reading is unchanged.";
  }));

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
  $("screen-light").addEventListener("click", () => {
    const next = !screenLightRequested;
    if (!next) screenLightDismissed = true;
    setScreenLight(next);
  });
  $("use-current-light").addEventListener("click", () => {
    lightOverrideRequested = true;
    $("use-current-light").hidden = true;
    $("capture-help").hidden = true;
    setCapturePrompt(
      "Using this light — hold still",
      "The scan will keep an honest reduced-confidence note for this photo.",
      "ready",
    );
  });
  $("refocus-camera").addEventListener("click", () => {
    const [track] = scratch?.stream?.getVideoTracks?.() || [];
    if (!track) return;
    $("gate-line").textContent = "Refocusing — hold still for a moment…";
    requestCameraRefocus(track).catch((error) => {
      console.warn("qise: manual refocus failed", error);
    });
  });
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

  const last = (await store.all()).slice(-1)[0];
  const destination = consentBootTarget(consent.isGranted(), Boolean(last));
  if (destination === "screen-reading") await renderReading(last);
  else show(destination);
}

boot().catch((err) => {
  console.error("qise: boot failed", err);
});
