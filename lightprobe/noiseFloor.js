/*
 * PHASE 0 LIGHT-PROBE — the noise floor lampSnr divides by.
 *
 * ── WHAT THE DENOMINATOR ACTUALLY IS (requirement 2.1) ─────────────────────
 * noiseFloor() takes one sample PER FRAME (the ROI's mean value on one raw
 * channel) drawn from a burst of repeated frames of a scene that is not
 * changing -- the unlit leg of a pair, held still. It returns a robust
 * temporal standard deviation of that sample across frames:
 *
 *   noiseFloor = 1.4826 * MAD(samples)
 *
 * 1.4826 is the standard MAD-to-sigma scale factor for a normal distribution
 * (same constant used nowhere else in this repo, but the same reasoning as
 * src/qise/baseline.js's median/MAD choice: a mean/SD pair is dragged around
 * by the exact single bad frame -- a sensor read glitch, a compression
 * artefact -- that a robust statistic exists to sit above).
 *
 * median/mad are reused from src/qise/baseline.js rather than reimplemented,
 * for the reason CLAUDE.md item 47 gives for not keeping a second copy of a
 * measurement: two copies of the same order-statistic machinery can drift.
 *
 * ── WHAT THIS DOES AND DOES NOT CAPTURE (requirements 2.2 / 2.3) ───────────
 * This is FRAME-TO-FRAME (temporal) variance ONLY. It is computed from N
 * repeated frames of the SAME static scene, so it captures whatever changes
 * frame to frame: shot noise, sensor read noise, and any temporal dithering
 * the ISP applies.
 *
 * It does NOT capture, and cannot capture by construction:
 *
 *   - FIXED-PATTERN NOISE. A per-pixel bias that is identical on every frame
 *     (e.g. a hot pixel, per-pixel gain non-uniformity) produces zero
 *     frame-to-frame variance -- it is a constant added to every sample, and
 *     a temporal-difference measure is blind to a constant by construction.
 *     It survives subtraction untouched.
 *
 *   - ISP NON-LINEARITY. Gamma curves, tone mapping and any other systematic,
 *     repeatable transform the ISP applies are not stochastic and produce no
 *     frame-to-frame spread either. They also survive subtraction untouched.
 *
 * Both of the above can still bias lampSnr's SIGNAL term (the lit-minus-unlit
 * delta) even though this gate cannot see either one in the denominator. This
 * gate answers "how much of the observed delta could be temporal noise", not
 * "is the delta trustworthy in an absolute sense" -- that second question
 * needs a fixed-pattern/linearity characterisation this instrument does not
 * attempt.
 */
import { mad } from "../src/qise/baseline.js";

const MAD_TO_SIGMA = 1.4826;

/** requirement 2.1/2.2: named so a report can print what it measured, not a bare number. */
export const NOISE_FLOOR_DEFINITION =
  "1.4826 * MAD of the ROI's per-frame channel mean across a burst of " +
  "repeated frames of one static (unlit) scene -- frame-to-frame temporal " +
  "variance only. Excludes fixed-pattern noise and ISP non-linearity (see " +
  "the file header for why both are structurally invisible to this measure).";

/**
 * Robust temporal noise floor from a burst of per-frame scalar samples.
 * Returns null (not NaN, not 0) when there are too few frames to say
 * anything -- a floor of 0 from one frame would make lampSnr infinite and
 * read as a perfect measurement instead of an unanswerable one.
 */
export function temporalNoiseFloor(frameSamples) {
  const usable = (frameSamples || []).filter(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
  if (usable.length < 3) return null;
  return MAD_TO_SIGMA * mad(usable);
}

/**
 * lampSnr = signal / noiseFloor.
 *
 * signal is the lit-minus-unlit delta on the same channel the noise floor was
 * measured on -- an SNR is only meaningful when both terms are the same
 * physical quantity.
 *
 * Returns { lampSnr, noiseFloor, signal } rather than a bare ratio, per
 * requirement 2.4: a ratio without its denominator printed alongside it is
 * not auditable from the report alone.
 */
export function lampSnr({ litSamples, unlitSamples }) {
  const lit = (litSamples || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  const unlit = (unlitSamples || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (lit.length === 0 || unlit.length === 0) {
    return { lampSnr: null, noiseFloor: null, signal: null, reason: "insufficient_frames" };
  }

  const meanLit = lit.reduce((a, b) => a + b, 0) / lit.length;
  const meanUnlit = unlit.reduce((a, b) => a + b, 0) / unlit.length;
  const signal = meanLit - meanUnlit;

  const noiseFloor = temporalNoiseFloor(unlit);
  if (noiseFloor === null) {
    return { lampSnr: null, noiseFloor: null, signal, reason: "insufficient_frames" };
  }
  if (noiseFloor === 0) {
    return { lampSnr: null, noiseFloor: 0, signal, reason: "zero_noise_floor" };
  }

  return { lampSnr: signal / noiseFloor, noiseFloor, signal, reason: null };
}
