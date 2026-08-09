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
import { openCamera, createLandmarkerGuarded, releaseCapture, GreenLatch, PolygonSmoother, BURST_FRAMES, trimmedMedianLab, reduceBurst } from "../../qise/camera.js";
import { readRois } from "../../qise/rois.js";
import { headPose } from "../../qise/pose.js";
import { sampleSclera } from "../../qise/sclera.js";
import { evaluateGates } from "../../qise/gates.js";
import { computeReadingMetrics, lumRatioP90P50 } from "../../qise/metrics.js";
import { interpretReading, readingConfidence, axesOf } from "../../qise/baseline.js";
import { openStore } from "../../qise/store.js";
import { readingScreenModel, historyColumnModel } from "./screens.js";
import { SHARE_CADENCES, shareReadings } from "./share.js";
import { findPatterns, describePattern } from "../../qise/patterns.js";
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

/* ── screens ─────────────────────────────────────────────────────────────── */

function show(id) {
  for (const s of document.querySelectorAll(".screen")) {
    s.dataset.active = String(s.id === id);
  }
}

/* ── the capture loop ────────────────────────────────────────────────────── */

async function buildLandmarker() {
  // Dynamic, and only ever reached past the consent assertion.
  const { FaceLandmarker, FilesetResolver } = await import(MEDIAPIPE_BUNDLE);
  const fileset = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_BUNDLE}/wasm`);
  return createLandmarkerGuarded({
    consent,
    factory: (options) => FaceLandmarker.createFromOptions(fileset, options),
    options: {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    },
  });
}

async function runCapture() {
  assertConsentGranted(consent, "the capture screen");
  show("screen-capture");

  const video = $("preview");
  const opened = await openCamera({ consent, mediaDevices: navigator.mediaDevices });
  video.srcObject = opened.stream;
  await video.play();

  const landmarker = await buildLandmarker();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  scratch = { canvas, images: [], landmarks: [], stream: opened.stream };

  const latch = new GreenLatch();
  const smoother = new PolygonSmoother();
  const drift = [];
  let previous = null;

  const history = await store.all();
  const scleraHistory = history.map((r) => r.sclera && r.sclera.rawRatios).filter(Boolean);

  const burst = {};
  let collecting = 0;
  let lastLandmarks = null, lastSclera = null, lastRois = null, lastMargins = null;

  const step = async (nowMs) => {
    if (!scratch) return;
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
      lastLandmarks = pts;

      if (previous) {
        const d = pts.reduce((s, p, i) => s + Math.hypot(p.x - previous[i].x, p.y - previous[i].y), 0) / pts.length;
        drift.push(d);
        if (drift.length > 5) drift.shift();
      }
      previous = pts;

      lastRois = readRois(image, pts, { mirrored: false }, color);
      lastSclera = sampleSclera(image, pts, { mirrored: false }, { samples: scleraHistory });

      smoother.push(Object.fromEntries(
        Object.entries(lastRois.rois).map(([k, v]) => [k, v.polygons.map((p) => p.hull)])));

      const stats = frameStats(image, lastRois, canvas.width, drift, headPose(pts));
      const gates = evaluateGates(stats, pts, lastSclera);

      $("gate-line").textContent = gates.pass ? "Hold it there…" : gates.failures[0].message;
      const held = latch.update(gates.pass, nowMs);
      $("ring-fill").setAttribute("stroke-dashoffset", String(100 - Math.round(held.progress * 100)));

      if (held.ready) { collecting = BURST_FRAMES; lastMargins = gates.margins; }

      if (collecting > 0) {
        for (const [name, roi] of Object.entries(lastRois.rois)) {
          if (!roi.pixels.length) continue;
          (burst[name] ||= []).push(trimmedMedianLab(roi.pixels, color));
        }
        collecting--;
        if (collecting === 0) {
          await finish(burst, lastRois, lastSclera, opened, history, lastMargins);
          return;
        }
      }
    } else {
      $("gate-line").textContent = "Bring your face into the frame.";
    }

    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Frame statistics the gates need, gathered once per frame. */
function frameStats(image, rois, frameWidth, drift, pose) {
  let total = 0, hot = 0, cold = 0, lap = 0, lapN = 0;
  const cheekL = [], cheekR = [];

  for (const [name, roi] of Object.entries(rois.rois)) {
    for (const p of roi.pixels) {
      total++;
      const y = 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
      if (y >= 250) hot++;
      if (y <= 12) cold++;
      if (name === "quan_l") cheekL.push(color.labFromSrgb8(p.r, p.g, p.b).L);
      if (name === "quan_r") cheekR.push(color.labFromSrgb8(p.r, p.g, p.b).L);
    }
  }

  // Laplacian variance over one region, as a beauty-filter detector.
  const roi = rois.rois.quan_l;
  if (roi && roi.pixels.length > 32) {
    const ls = roi.pixels.map((p) => color.labFromSrgb8(p.r, p.g, p.b).L);
    const mean = ls.reduce((a, b) => a + b, 0) / ls.length;
    lap = ls.reduce((s, v) => s + (v - mean) ** 2, 0) / ls.length;
    lapN = ls.length;
  }

  const med = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[s.length >> 1];
  };

  return {
    frameWidth,
    // Real pose, from the landmarks. Feeding a literal here is what made the
    // pose gate dead code: it reported itself passing on every frame and
    // contributed a constant to the ring. See src/qise/pose.js.
    pose,
    skinPixelCount: total,
    skinPixelsAtOrAbove250: hot,
    skinPixelsAtOrBelow12: cold,
    cheekMedianL: { left: med(cheekL), right: med(cheekR) },
    landmarkDriftPx: drift.length ? drift.reduce((a, b) => a + b, 0) / drift.length : 0,
    laplacianVariance: lapN ? lap : null,
    validRoiCount: rois.validCount,
  };
}

/* ── finishing a reading ─────────────────────────────────────────────────── */

async function finish(burst, rois, sclera, opened, history, gateMargins) {
  const { lab: rawLab, frameJitter } = reduceBurst(burst);

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
  });

  const interpreted = interpretReading(metrics.corrected, history, { confidence });

  const reading = {
    timestampIso: new Date().toISOString(),
    metrics,
    axes: axesOf(metrics.corrected),
    deltas: interpreted.deltas,
    compass: interpreted.compass,
    tags: [],
    deviceFingerprintHash: await fingerprintHash(),
    captureMode: opened.captureMode,
    consentVersion: consent.read() && consent.read().version,
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

async function renderReading(reading) {
  const history = await store.all();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const m = readingScreenModel(reading, history, { reducedMotion: reduced });

  $("reading-seal").innerHTML = m.sealSvg;
  $("reading-verdict").textContent = m.verdict;

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
  const patterns = findPatterns(history).slice(0, 3).map(describePattern);
  $("reading-notices").innerHTML =
    [...notices, ...patterns].map((n) => `<p class="notice">${esc(n)}</p>`).join("");

  show("screen-reading");
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
    `<polyline fill="none" stroke="var(--hei)" stroke-width="1.5" points="${
      run.map((p) => `${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}" />`).join("")
    + measured.filter((p) => p.lowConfidence).map((p) =>
      `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2" fill="none" stroke="var(--hei)" />`).join("");
}

async function renderHistory() {
  const limit = SHARE_CADENCES[activeShareCadence].days;
  const col = historyColumnModel(await store.all(), { limit });
  $("history-column").innerHTML = col.rows.map((r) =>
    `<figure>${r.svg}<figcaption>${esc(r.date)}</figcaption></figure>`).join("")
    || `<p class="muted">Nothing recorded yet.</p>`;
  for (const button of document.querySelectorAll("[data-cadence]")) {
    const selected = button.dataset.cadence === activeShareCadence;
    button.setAttribute("aria-pressed", String(selected));
  }
  $("share-column").textContent = activeShareCadence === "today"
    ? "Share today's seal"
    : `Share ${SHARE_CADENCES[activeShareCadence].label.toLowerCase()}`;
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
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("qise: offline shell registration failed", error);
    });
  }
  store = await openStore();

  $("consent-grant").addEventListener("click", async () => {
    consent.grant();
    try {
      await runCapture();
    } catch (err) {
      // Not swallowed. A camera that never opens must say so rather than
      // leaving the user on a screen that does nothing.
      console.error("qise: capture failed", err);
      $("gate-line").textContent = "The camera did not open. Check the site's camera permission and try again.";
      show("screen-capture");
    }
  });

  $("go-capture").addEventListener("click", () => runCapture().catch((e) => console.error(e)));
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
