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
 * Each `evaluate` returns `{ value, limit, margin }` or null when the input
 * needed is absent. A gate that cannot be evaluated is reported as a failure
 * with a margin of -1 rather than skipped: a missing input is not a pass.
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
      const parts = [
        marginBelow(Math.abs(pose.yaw), POSE_YAW_MAX),
        marginBelow(Math.abs(pose.pitch), POSE_PITCH_MAX),
        marginBelow(Math.abs(pose.roll), POSE_ROLL_MAX),
      ];
      // The worst axis governs: a head straight in yaw and 20 degrees off in
      // roll is not two-thirds acceptable.
      return { value: pose, limit: { yaw: POSE_YAW_MAX, pitch: POSE_PITCH_MAX, roll: POSE_ROLL_MAX }, margin: Math.min(...parts) };
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
    evaluate: (_stats, _landmarks, sclera) => {
      if (!sclera || !sclera.rawRatios) return null;
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
    message: "Turn off beauty filters — they change the colour.",
    // A smoothing filter removes high-frequency detail, so the Laplacian
    // variance of skin collapses. It is not a perfect detector and is not
    // meant to be; it catches the aggressive default-on filters that would
    // otherwise silently rewrite the measurement.
    evaluate: ({ laplacianVariance }) => {
      if (typeof laplacianVariance !== "number") return null;
      return { value: laplacianVariance, limit: FILTER_MIN_LAPLACIAN_VARIANCE, margin: marginAbove(laplacianVariance, FILTER_MIN_LAPLACIAN_VARIANCE) };
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

/**
 * Run every gate.
 *
 * @param {Object} frameStats see the individual gates for the fields each uses
 * @param {Array<{x:number,y:number}>} landmarks
 * @param {Object} scleraResult from sampleSclera
 * @returns {{pass:boolean, failures:Array, margins:Object, worst:Object|null}}
 */
export function evaluateGates(frameStats, landmarks, scleraResult) {
  const stats = frameStats || {};
  const failures = [];
  const margins = {};
  const results = [];

  for (const gate of GATES) {
    const outcome = gate.evaluate(stats, landmarks, scleraResult);

    if (outcome === null) {
      // A gate that could not be evaluated is a failure, not a pass. Treating
      // an absent input as "nothing to complain about" is how a capture path
      // ships with half its checks quietly inert.
      margins[gate.id] = -1;
      const f = { id: gate.id, message: gate.message, margin: -1, unevaluated: true };
      failures.push(f);
      results.push(f);
      continue;
    }

    margins[gate.id] = outcome.margin;
    const entry = { id: gate.id, message: gate.message, margin: outcome.margin, value: outcome.value, limit: outcome.limit };
    results.push(entry);
    if (outcome.margin < 0) failures.push(entry);
  }

  // Sorted worst-first so the UI can take failures[0] and show one line.
  failures.sort((a, b) => a.margin - b.margin);
  const worst = results.reduce((w, r) => (w === null || r.margin < w.margin ? r : w), null);

  return { pass: failures.length === 0, failures, margins, worst };
}
