/*
 * PHASE 3 — capture gates. Pure, DOM-free.
 *
 * ── WHY EVERY GATE RETURNS A MARGIN ────────────────────────────────────────
 * A boolean tells the user they failed. A margin tells the interface how close
 * they are, which is what drives the ring, and it is persisted on the reading
 * so a capture that scraped through at +0.02 can be told apart later from one
 * that sailed through at +0.8. Without that, every accepted reading looks
 * equally good in the history and the marginal ones are invisible.
 *
 * Margins are normalised so they are comparable across gates: 0 is exactly on
 * the threshold, positive is passing, and the WORST margin is the one the UI
 * shows. Comparing raw degrees against raw pixels against a variance would
 * make "worst" meaningless.
 *
 * ── WHY THE MOTION THRESHOLD IS 6px AND NOT 2px ────────────────────────────
 * 2px is below the floor set by human physiology. Breathing moves the head,
 * and so does ballistocardiographic motion — the cranial displacement driven
 * by blood ejection from the aortic arch, which is involuntary and continuous.
 * Sub-2px stillness is not achievable handheld by anyone, so a 2px gate is not
 * a strict gate, it is a gate nobody passes, and a gate nobody passes kills
 * the product rather than protecting it.
 *
 * Stability is bought instead by burst capture (Phase 4): fifteen frames and a
 * median across them, which averages out exactly the motion this gate would
 * otherwise have to forbid.
 */
import { SCLERA_MIN_PIXELS, SCLERA_ABSOLUTE_TOLERANCE } from "./sclera.js";
import { MIN_VALID_ROIS } from "./rois.js";

export const POSE_YAW_MAX = 12;
export const POSE_PITCH_MAX = 12;
export const POSE_ROLL_MAX = 8;
export const DISTANCE_MIN_FRACTION = 0.22;
export const EXPOSURE_MAX_FRACTION = 0.02;
export const OVEREXPOSED_LEVEL = 250;
export const UNDEREXPOSED_LEVEL = 12;
export const SIDELIGHT_MAX_DELTA_L = 6;
export const MOTION_MAX_PX = 6;
export const FILTER_MIN_LAPLACIAN_VARIANCE = 8;

/**
 * After this long, small camera/room-light imperfections may be accepted.
 * Geometry, readable regions, open eyes and beauty-filter checks stay hard.
 */
export const CAPTURE_GRACE_MS = 3500;

export const ASSISTED_LIMITS = Object.freeze({
  overexposed: 0.06,
  underexposed: 0.06,
  sidelight: 9,
  illuminant: 0.35,
  motion: 9,
});

export const ASSISTABLE_GATES = Object.freeze(Object.keys(ASSISTED_LIMITS));
export const LIGHT_OVERRIDE_DELAY_MS = 5000;
export const OVERRIDABLE_LIGHT_GATES = Object.freeze(["sidelight", "illuminant"]);

/** Outer eye corners. See the note in evaluateGates on which span this is. */
export const OUTER_CANTHI = Object.freeze([33, 263]);

/** Clamp a normalised margin so one wild gate cannot dominate the ring. */
const clampMargin = (m) => Math.max(-1, Math.min(1, m));

/** Margin for a "must stay below `limit`" gate. */
const marginBelow = (value, limit) => clampMargin(limit === 0 ? 0 : (limit - value) / limit);

/** Margin for a "must reach `limit`" gate. */
const marginAbove = (value, limit) => clampMargin(limit === 0 ? 0 : (value - limit) / limit);

/**
 * Distance between the outer eye corners, in pixels.
 *
 * The outer canthi, not the inner. On MediaPipe's canonical mesh at nominal
 * framing the outer span is ~35% of frame width and the inner span ~15%, so a
 * 22% threshold read against the inner canthi would reject every correctly
 * framed capture — and would look like a user who never gets close enough.
 */
export function interocularPx(landmarks) {
  const [a, b] = OUTER_CANTHI.map((i) => landmarks && landmarks[i]);
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/*
 * The gates, in the order they are declared.
 *
 * Each `evaluate` returns one of three shapes:
 *   { value, limit, margin }        a real measurement — PASS or FAIL
 *   { blocked: true, blockedBy, reason }   a prerequisite is unavailable
 *   null                             this gate itself has nothing to measure
 *
 * A gate that cannot be evaluated is reported as a failure with a margin of
 * -1 rather than skipped: a missing input is not a pass. That much has not
 * changed. What DOES matter, and did not exist before item 54's aftermath
 * proved it was needed twice: BLOCKED and UNAVAILABLE are not the same
 * failure as FAIL, and must never be shown as one.
 *
 * ── WHY BLOCKED IS NOT THE SAME AS FAIL ─────────────────────────────────────
 * `illuminant` cannot judge a light it was never handed a sample of. When
 * `sampleSclera` refuses — too few surviving pixels, or too dark to trust —
 * illuminant has measured NOTHING, and returning `null` for that used to be
 * indistinguishable from "measured, and it is unusual light": both landed at
 * `margin: -1`, the floor of the scale, which SORTS AHEAD of every real
 * failure. The result: a face that failed only on eye visibility was told to
 * change its lamps, permanently, in every room, because the fabricated
 * failure always outranked the real one. `blocked: true` with a `blockedBy`
 * and a `reason` lets `captureInstruction` defer to the ACTUAL cause instead.
 *
 * The same shape covers `filter`: a Laplacian variance of `null` means the
 * cheek ROIs did not carry enough pixels to run the kernel, not that the
 * frame is blurry. Where that traces to `roiValidity` being short, it is
 * reported blocked by roiValidity, not as a sharpness verdict on a value that
 * was never computed.
 *
 * MESSAGES STATE THE FIX, NEVER THE FAULT. No "sorry", no "invalid", no
 * "failed". The user is trying to take a photograph, not passing an exam.
 */
export const GATES = Object.freeze([
  {
    id: "pose",
    message: "Look straight at the camera.",
    evaluate: ({ pose }) => {
      if (!pose) return null;

      // Only the axes that were actually MEASURED are judged. `Math.abs(null)`
      // is 0, so treating an unmeasured axis as a number silently reports it
      // as perfectly straight — which is the same defect as a gate whose input
      // is missing passing by default, one level further down.
      //
      // Roll comes from two landmarks and is always available; yaw and pitch
      // need MediaPipe's transformation matrix. A frame with only roll is
      // still worth gating on roll, and the reading records which axes were
      // checked rather than implying all three were.
      const limits = { yaw: POSE_YAW_MAX, pitch: POSE_PITCH_MAX, roll: POSE_ROLL_MAX };
      const measured = Object.keys(limits).filter((k) => typeof pose[k] === "number" && Number.isFinite(pose[k]));
      if (measured.length === 0) return null;

      const parts = measured.map((k) => marginBelow(Math.abs(pose[k]), limits[k]));
      // The worst axis governs: a head straight in yaw and 20 degrees off in
      // roll is not two-thirds acceptable.
      return {
        value: { ...pose, axesChecked: measured },
        limit: limits,
        margin: Math.min(...parts),
      };
    },
  },
  {
    id: "distance",
    message: "Move a little closer.",
    evaluate: ({ frameWidth }, landmarks) => {
      const px = interocularPx(landmarks);
      if (px === null || !frameWidth) return null;
      const fraction = px / frameWidth;
      return { value: fraction, limit: DISTANCE_MIN_FRACTION, margin: marginAbove(fraction, DISTANCE_MIN_FRACTION) };
    },
  },
  {
    id: "overexposed",
    message: "Too bright — turn away from the window.",
    evaluate: ({ skinPixelCount, skinPixelsAtOrAbove250 }) => {
      if (!skinPixelCount) return null;
      const fraction = skinPixelsAtOrAbove250 / skinPixelCount;
      return { value: fraction, limit: EXPOSURE_MAX_FRACTION, margin: marginBelow(fraction, EXPOSURE_MAX_FRACTION) };
    },
  },
  {
    id: "underexposed",
    message: "Too dark — find more light.",
    evaluate: ({ skinPixelCount, skinPixelsAtOrBelow12 }) => {
      if (!skinPixelCount) return null;
      const fraction = skinPixelsAtOrBelow12 / skinPixelCount;
      return { value: fraction, limit: EXPOSURE_MAX_FRACTION, margin: marginBelow(fraction, EXPOSURE_MAX_FRACTION) };
    },
  },
  {
    id: "sidelight",
    message: "Light's coming from one side. Face the light.",
    evaluate: ({ cheekMedianL }) => {
      if (!cheekMedianL || typeof cheekMedianL.left !== "number" || typeof cheekMedianL.right !== "number") return null;
      const delta = Math.abs(cheekMedianL.left - cheekMedianL.right);
      return { value: delta, limit: SIDELIGHT_MAX_DELTA_L, margin: marginBelow(delta, SIDELIGHT_MAX_DELTA_L) };
    },
  },
  {
    id: "illuminant",
    message: "This light is unusual. Try daylight or a plain white lamp.",
    // The coarse backstop only. The personal sclera baseline in Phase 2 is what
    // separates strange light from bloodshot eyes; this catches the case where
    // the illuminant is so far off neutral that no correction is trustworthy.
    //
    // This gate DEPENDS on the sclera sample: it has no illuminant to judge
    // until `sampleSclera` produces `rawRatios`. A dependent gate returning
    // `null` here is indistinguishable from a REAL illuminant failure once the
    // harness collapses everything to `unevaluated`, and that collapse is
    // exactly the defect this evaluate exists to avoid (see the BLOCKED vs
    // FAILED note above `evaluateGates`). So this reports BLOCKED, carrying
    // sclera's own refusal reason verbatim — "too_few_pixels" or "too_dark" —
    // rather than inventing a coloured-light diagnosis for a measurement that
    // was never taken.
    evaluate: (_stats, _landmarks, sclera) => {
      if (!sclera) return { blocked: true, blockedBy: "sclera", reason: "no_sclera" };
      if (!sclera.rawRatios) {
        return { blocked: true, blockedBy: "sclera", reason: sclera.reason || "no_sclera" };
      }
      const worst = Math.max(...["r", "g", "b"].map((k) => Math.abs(sclera.rawRatios[k] - 1)));
      return { value: worst, limit: SCLERA_ABSOLUTE_TOLERANCE, margin: marginBelow(worst, SCLERA_ABSOLUTE_TOLERANCE) };
    },
  },
  {
    id: "sclera",
    message: "Open your eyes a little wider.",
    evaluate: (_stats, _landmarks, sclera) => {
      if (!sclera) return null;
      return { value: sclera.pixelCount, limit: SCLERA_MIN_PIXELS, margin: marginAbove(sclera.pixelCount, SCLERA_MIN_PIXELS) };
    },
  },
  {
    id: "motion",
    message: "Hold still.",
    evaluate: ({ landmarkDriftPx }) => {
      if (typeof landmarkDriftPx !== "number") return null;
      return { value: landmarkDriftPx, limit: MOTION_MAX_PX, margin: marginBelow(landmarkDriftPx, MOTION_MAX_PX) };
    },
  },
  {
    id: "filter",
    message: "Camera looks soft. Hold still and clean the lens.",
    // Defocus and smoothing filters both remove spatial high-frequency detail,
    // so the real four-neighbour Laplacian variance collapses. The UI names
    // both actionable causes instead of accusing every soft frame of filtering.
    //
    // `laplacianVariance` is also `null` whenever the cheek ROIs did not carry
    // enough located pixels to run the four-neighbour kernel at all (see
    // `spatialLaplacianVariance`'s `minSamples` floor in framestats.js) — that
    // is not a blur measurement, it is the ABSENCE of one, and item 54 exists
    // precisely because those two were once conflated. When the ROI count is
    // independently known to be short, this reports BLOCKED by roiValidity
    // rather than guessing "soft" from a sharpness the frame never produced.
    evaluate: ({ laplacianVariance, validRoiCount }) => {
      if (typeof laplacianVariance === "number") {
        return {
          value: laplacianVariance,
          limit: FILTER_MIN_LAPLACIAN_VARIANCE,
          margin: marginAbove(laplacianVariance, FILTER_MIN_LAPLACIAN_VARIANCE),
        };
      }
      if (typeof validRoiCount === "number" && validRoiCount < MIN_VALID_ROIS) {
        return { blocked: true, blockedBy: "roiValidity", reason: "insufficient_roi_samples" };
      }
      return null;
    },
  },
  {
    id: "roiValidity",
    message: "Can't read part of your face clearly. Try facing the light.",
    evaluate: ({ validRoiCount }) => {
      if (typeof validRoiCount !== "number") return null;
      return { value: validRoiCount, limit: MIN_VALID_ROIS, margin: marginAbove(validRoiCount, MIN_VALID_ROIS) };
    },
  },
]);

/** The ten technical gates condensed into four things a person can act on. */
export const CAPTURE_GUIDE_GROUPS = Object.freeze([
  { id: "frame", label: "Face", gates: ["pose", "distance", "sclera", "roiValidity"] },
  { id: "light", label: "Light", gates: ["overexposed", "underexposed", "sidelight", "illuminant"] },
  { id: "camera", label: "Clear", gates: ["filter"] },
  { id: "steady", label: "Still", gates: ["motion"] },
]);

const CAPTURE_INSTRUCTIONS = Object.freeze({
  pose: {
    title: "Look straight at the camera",
    detail: "Keep your head level and look into the lens.",
  },
  distance: {
    title: "Move a little closer",
    detail: "Let your face comfortably fill the oval.",
  },
  overexposed: {
    title: "Step out of direct light",
    detail: "Move back from the window or lamp until bright patches disappear.",
  },
  underexposed: {
    title: "Add light in front of you",
    detail: "Put a window or white lamp behind the phone, or use the screen light below.",
  },
  sidelight: {
    title: "Put the light behind your phone",
    detail: "Keep looking forward. Move the phone towards the light until both cheeks look even.",
  },
  illuminant: {
    title: "Switch to plain white light",
    detail: "Turn off coloured lamps and use daylight or a white lamp behind the phone.",
  },
  sclera: {
    title: "Open your eyes naturally",
    detail: "Look into the lens and keep both eyes fully visible.",
  },
  motion: {
    title: "Hold still for one second",
    detail: "Almost ready. Keep the phone and your head steady.",
  },
  filter: {
    title: "Sharpen the picture",
    detail: "Wipe the lens, remove portrait blur, then hold the phone steady.",
  },
  roiValidity: {
    title: "Show your whole face",
    detail: "Keep your forehead, temples, eyes and chin inside the oval.",
  },
});

/**
 * A gate whose reason names WHY it could not measure — the eyes were not
 * legible, the scene was too dim to read them, or there was no sclera sample
 * at all. Keyed by the gate that is BLOCKED, then by that gate's own
 * `reason`, both of which come from the domain module that actually knows
 * (sclera.js), never guessed here.
 */
const BLOCKED_INSTRUCTIONS = Object.freeze({
  illuminant: {
    too_few_pixels: {
      title: "Open your eyes naturally",
      detail: "The light check reads the whites of your eyes — keep both fully open and facing the lens.",
    },
    too_dark: {
      title: "Add light before this check can run",
      detail: "It's too dim to read your eyes clearly yet. Add light in front of you, then hold still.",
    },
    no_sclera: {
      title: "Look into the lens",
      detail: "Keep both eyes visible so the light check can run.",
    },
  },
});

/**
 * A gate that could not be measured at all, and has no cleaner root cause to
 * point at — distinct from BLOCKED_INSTRUCTIONS, which names a specific
 * upstream reason. This is the honest fallback: say what is missing, never a
 * fix for a symptom (blur, colour) that was never observed (CLAUDE.md item 54).
 */
const UNAVAILABLE_INSTRUCTIONS = Object.freeze({
  filter: {
    title: "Show more of your face",
    detail: "Move a little closer so your cheeks fill the guide — sharpness can't be measured yet.",
  },
  pose: {
    title: "Look straight at the camera",
    detail: "Hold your head level so the angle can be measured.",
  },
  distance: {
    title: "Bring your face into the oval",
    detail: "Distance can't be measured until the eyes are visible.",
  },
  motion: {
    title: "Hold still for a moment",
    detail: "A couple of steady frames are needed before stillness can be measured.",
  },
  sclera: {
    title: "Look into the lens",
    detail: "Keep both eyes visible so they can be read.",
  },
  roiValidity: {
    title: "Show your whole face",
    detail: "Keep the forehead, temples, eyes and chin inside the oval.",
  },
  overexposed: {
    title: "Bring your face into the oval",
    detail: "Exposure can't be checked until skin is visible.",
  },
  underexposed: {
    title: "Bring your face into the oval",
    detail: "Exposure can't be checked until skin is visible.",
  },
  sidelight: {
    title: "Bring your face into the oval",
    detail: "Both cheeks need to be visible before they can be compared.",
  },
});

/**
 * Whether a failure entry represents a MEASUREMENT that came back outside its
 * allowed range, as opposed to one that could not be taken at all.
 *
 * Reports built by `evaluateGates` always carry `status`. Reports built BY
 * HAND — a handful of tests construct `{ id, message, unevaluated }` directly
 * to drive `captureInstruction` without a full gate run — do not, and for
 * those the pre-existing contract holds: anything not explicitly marked
 * `unevaluated` is a real failure. Absence of `status` must fall back to that
 * older, narrower signal rather than silently reclassifying every hand-built
 * fixture as unmeasurable.
 */
const isMeasuredFailure = (failure) => (
  failure.status ? failure.status === "fail" : !failure.unevaluated
);

const instructionForFailure = (failure) => ({
  id: failure.id,
  ...(CAPTURE_INSTRUCTIONS[failure.id] || {
    title: failure.message,
    detail: "Follow the guide in the camera preview.",
  }),
});

/**
 * Resolve a BLOCKED or UNAVAILABLE entry to an instruction naming its real
 * cause, never a fix for the symptom it could not observe.
 *
 * Two rungs, cheapest and most specific first:
 *  1. The gate that blocks this one is ITSELF present among this frame's
 *     failures as a genuine measured failure (e.g. sclera failing its own
 *     pixel-count floor) — use that gate's own, already-correct instruction.
 *     This is what makes `too_few_pixels` show "open your eyes wider" without
 *     illuminant needing to know that copy exists.
 *  2. The blocking gate PASSED on its own terms but the dependent still could
 *     not measure (sclera's pixel count is fine; its median lightness is not
 *     — `too_dark`). There is no failing entry to defer to, so the reason
 *     travels via `BLOCKED_INSTRUCTIONS`, keyed by gate and by that reason.
 * Failing both, `UNAVAILABLE_INSTRUCTIONS` is the honest fallback: the
 * measurement itself could not be obtained, and the copy says so.
 */
function instructionForDependent(entry, allFailures) {
  if (entry.blockedBy) {
    const root = allFailures.find(
      (failure) => failure.id === entry.blockedBy && isMeasuredFailure(failure),
    );
    if (root) return instructionForFailure(root);
    const reasonTable = BLOCKED_INSTRUCTIONS[entry.id];
    if (reasonTable && entry.reason && reasonTable[entry.reason]) {
      return { id: entry.id, ...reasonTable[entry.reason] };
    }
  }
  if (UNAVAILABLE_INSTRUCTIONS[entry.id]) {
    return { id: entry.id, ...UNAVAILABLE_INSTRUCTIONS[entry.id] };
  }
  return instructionForFailure(entry);
}

/**
 * One plain next action, instead of making a person diagnose ten gates.
 *
 * MEASURED failures are considered first, worst-first as `evaluateGates`
 * already ordered them — a gate that came back outside its allowed range is
 * always more informative than one that could not be read at all. Only when
 * NOTHING has actually been measured as a defect does a BLOCKED or
 * UNAVAILABLE entry surface, and even then it is resolved to its root cause
 * rather than shown as its own generic complaint (see `instructionForDependent`).
 *
 * This is the fix for CLAUDE.md item 54: previously every unevaluated gate
 * carried `margin: -1`, the floor of the scale, which sorted it ahead of
 * every REAL failure and let "the light check has no sclera sample" print as
 * "this light is unusual" — a diagnosis of a condition nobody measured.
 */
export function captureInstruction(report) {
  if (!report) {
    return { id: "starting", title: "Opening the camera", detail: "Bring your face into the oval." };
  }
  const failures = report.failures || [];
  if (failures.length === 0) {
    return {
      id: "ready",
      title: "That's it — hold still",
      detail: "Keep looking at the lens. The photo takes itself.",
    };
  }
  const primary = failures.find(isMeasuredFailure);
  if (primary) return instructionForFailure(primary);
  return instructionForDependent(failures[0], failures);
}

/**
 * An explicit escape hatch for rooms with unavoidable side/coloured light.
 * Clipped exposure, missing measurements, blur, pose and framing remain hard
 * stops; accepting those would manufacture confidence rather than reduce it.
 */
export function canUseCurrentLight(report, elapsedMs = 0) {
  const failures = report && Array.isArray(report.failures) ? report.failures : [];
  const allowed = new Set(OVERRIDABLE_LIGHT_GATES);
  const hasOverridableLight = failures.some((failure) => allowed.has(failure.id) && !failure.unevaluated);
  return elapsedMs >= LIGHT_OVERRIDE_DELAY_MS
    && hasOverridableLight
    // Motion is still enforced after the choice; it must not make the choice
    // flicker away while a thumb is moving towards the button.
    && failures.every((failure) =>
      (allowed.has(failure.id) || failure.id === "motion") && !failure.unevaluated);
}

export function captureGuide(report) {
  const margins = report && report.margins ? report.margins : {};
  const failures = report && Array.isArray(report.failures) ? report.failures : [];
  const tolerated = new Set((report && report.tolerated || []).map((failure) => failure.id));

  return CAPTURE_GUIDE_GROUPS.map((group) => {
    const values = group.gates.map((id) => margins[id]).filter(Number.isFinite);
    const ready = values.length === group.gates.length
      && group.gates.every((id) => margins[id] >= 0 || tolerated.has(id));
    const activeFailure = failures.find((failure) => group.gates.includes(failure.id));
    return {
      id: group.id,
      label: group.label,
      ready,
      assisted: group.gates.some((id) => tolerated.has(id)),
      state: ready ? "ready" : (values.length ? "adjust" : "waiting"),
      message: activeFailure ? activeFailure.message : null,
    };
  });
}

/**
 * Run every gate.
 *
 * Every entry in `failures` (and every entry in `results`, reachable via
 * `worst`) carries a `status` of `"fail"`, `"blocked"` or `"unavailable"`.
 * Only `"fail"` is a measurement that came back outside its allowed range;
 * the other two mean nothing was measured, for two different reasons
 * (`blockedBy`/`reason` name which, see the note above `GATES`). Consumers
 * choosing what to TELL the user — `captureInstruction` — must prefer a
 * `"fail"` over either of the other two, never rank them by margin alone:
 * margin is `-1` for both non-measurements by construction, which is exactly
 * what let a blocked gate outrank a real one before this file distinguished
 * them.
 *
 * @param {Object} frameStats see the individual gates for the fields each uses
 * @param {Array<{x:number,y:number}>} landmarks
 * @param {Object} scleraResult from sampleSclera
 * @returns {{pass:boolean, failures:Array, margins:Object, worst:Object|null}}
 */
export function evaluateGates(frameStats, landmarks, scleraResult, options = {}) {
  const stats = frameStats || {};
  const failures = [];
  const margins = {};
  const results = [];

  for (const gate of GATES) {
    const outcome = gate.evaluate(stats, landmarks, scleraResult);

    if (outcome === null || outcome.blocked) {
      // A gate that could not be evaluated is a failure, not a pass. Treating
      // an absent input as "nothing to complain about" is how a capture path
      // ships with half its checks quietly inert. `margin` stays -1, the
      // floor of the scale, so the RING and the grace/tolerance machinery
      // below are completely unchanged — a blocked or unavailable gate is
      // excluded from `ASSISTED_LIMITS` tolerance exactly as an unevaluated
      // one always was (both carry `unevaluated: true`).
      //
      // What DOES change is which of these a person is TOLD about:
      // `status` distinguishes a gate with nowhere to point (`unavailable`)
      // from one with a named, upstream cause (`blocked`, `blockedBy`,
      // `reason`) — `captureInstruction` uses this to defer to the root
      // cause instead of printing a diagnosis for a measurement that was
      // never taken.
      margins[gate.id] = -1;
      const f = outcome && outcome.blocked
        ? {
          id: gate.id, message: gate.message, margin: -1, unevaluated: true,
          status: "blocked", blockedBy: outcome.blockedBy || null, reason: outcome.reason || null,
        }
        : {
          id: gate.id, message: gate.message, margin: -1, unevaluated: true,
          status: "unavailable", blockedBy: null, reason: null,
        };
      failures.push(f);
      results.push(f);
      continue;
    }

    margins[gate.id] = outcome.margin;
    const entry = {
      id: gate.id, message: gate.message, margin: outcome.margin, value: outcome.value, limit: outcome.limit,
      unevaluated: false, status: outcome.margin < 0 ? "fail" : "pass", blockedBy: null, reason: null,
    };
    results.push(entry);
    if (outcome.margin < 0) failures.push(entry);
  }

  // Sorted worst-first so the UI can take failures[0] and show one line.
  failures.sort((a, b) => a.margin - b.margin);
  const worst = results.reduce((w, r) => (w === null || r.margin < w.margin ? r : w), null);

  const elapsedMs = typeof options.elapsedMs === "number" && !Number.isNaN(options.elapsedMs)
    ? options.elapsedMs
    : 0;
  const graceReached = elapsedMs >= CAPTURE_GRACE_MS;
  const tolerated = graceReached ? failures.filter((failure) => {
    const assistedLimit = ASSISTED_LIMITS[failure.id];
    if (!Number.isFinite(assistedLimit) || failure.unevaluated) return false;
    return failure.id === "underexposed" || failure.id === "overexposed"
      || failure.id === "sidelight" || failure.id === "illuminant"
      || failure.id === "motion"
      ? failure.value <= assistedLimit
      : false;
  }) : [];
  if (options.acceptUnevenLight) {
    const alreadyTolerated = new Set(tolerated.map((failure) => failure.id));
    for (const failure of failures) {
      if (OVERRIDABLE_LIGHT_GATES.includes(failure.id)
          && !failure.unevaluated && !alreadyTolerated.has(failure.id)) {
        tolerated.push(failure);
      }
    }
  }
  const toleratedIds = new Set(tolerated.map((failure) => failure.id));
  const unresolved = failures.filter((failure) => !toleratedIds.has(failure.id));
  const strictPass = failures.length === 0;
  const assistedPass = !strictPass && graceReached && unresolved.length === 0;

  return {
    pass: strictPass || assistedPass,
    strictPass,
    captureTier: strictPass ? "clean" : (assistedPass ? "assisted" : "waiting"),
    failures: assistedPass ? [] : failures,
    tolerated,
    margins,
    worst,
  };
}
