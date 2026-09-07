/*
 * PHASE 0 LIGHT-PROBE — assembling one run's report.
 *
 * This is the one place the pieces in negotiate.js, noiseFloor.js, retest.js
 * and rejections.js are wired into a single ROI verdict and a run summary.
 * Everything here is pure and DOM-free, for the same reason geometry.js sits
 * outside ui.js (CLAUDE.md item 14/18a): a module nothing can import is a
 * module nothing tests, and this probe's correctness properties (gate order,
 * per-ROI-only, the hard-wired false) are exactly the kind of thing that
 * looks right and silently isn't.
 */
import { LOCK_UNVERIFIED_SUMMARY, prefixVerdict } from "./negotiate.js";
import { lampSnr, NOISE_FLOOR_DEFINITION } from "./noiseFloor.js";
import {
  withinPairChromaticityDrift, betweenRepeatLevelDrift, classifyRetestFailure,
} from "./retest.js";

/**
 * requirement 4.1: the minimum lampSnr an ROI must clear before it can PASS,
 * checked BEFORE anything about the variance ratio is consulted.
 *
 * WHY THIS ORDER, NOT "AND": a variance ratio measures how much noise a
 * differencing step removed, which a shadowed or occluded ROI can post an
 * excellent value for while carrying essentially no lamp signal at all --
 * removing 99% of nothing is still nothing. Gating on lampSnr first means a
 * bad lampSnr fails the ROI regardless of how good its variance ratio looks;
 * a good variance ratio can never rescue a verdict lampSnr has already
 * failed. Do not rewrite this as `lampSnrOk && varianceRatioOk` computed in
 * parallel -- that reads identically for a passing case and differs exactly
 * on the shadowed-ROI case this ordering exists for.
 */
export const LAMP_SNR_MIN = 10;

/** requirement 4.5: never computed from input. A literal, always. */
export const ABSOLUTE_COLOUR_CLAIMED = false;

/**
 * One ROI's verdict. `roiInput` carries everything measured for that ROI in
 * this run; nothing here reads or produces a whole-face aggregate
 * (requirement 4.2 -- there is no such field anywhere in this module, and
 * tests/lightprobe/report.test.js asserts the report shape has none).
 */
export function roiVerdict(roiInput, { unverified }) {
  const {
    roiName, litSamples, unlitSamples, litLab, unlitLab, lStarsAcrossRepeats,
    varianceRatio,
  } = roiInput;

  const snr = lampSnr({ litSamples, unlitSamples });
  const chromaticity = withinPairChromaticityDrift(litLab, unlitLab);
  const level = betweenRepeatLevelDrift(lStarsAcrossRepeats);
  const retestCategory = classifyRetestFailure({ chromaticity, level });

  // Gate 1, and the ONLY gate that can produce FAIL on its own (see the
  // LAMP_SNR_MIN doc comment above for why this must come first).
  let verdict;
  if (snr.lampSnr === null) {
    verdict = "FAIL";
  } else if (snr.lampSnr < LAMP_SNR_MIN) {
    verdict = "FAIL";
  } else {
    verdict = "PASS";
  }

  const text =
    `${roiName}: ${verdict} ` +
    `lampSnr=${snr.lampSnr === null ? "n/a" : snr.lampSnr.toFixed(2)} ` +
    `noiseFloor=${snr.noiseFloor === null ? "n/a" : snr.noiseFloor.toFixed(4)} ` +
    `signal=${snr.signal === null ? "n/a" : snr.signal.toFixed(4)} ` +
    `varianceRatio=${varianceRatio === undefined || varianceRatio === null ? "n/a" : Number(varianceRatio).toFixed(3)} ` +
    `chromaticityDrift=${chromaticity.displacement === null ? "n/a" : chromaticity.displacement.toFixed(3)}(${chromaticity.pass ? "pass" : "fail"}) ` +
    `levelDrift=${level.maxDeviation === null ? "n/a" : level.maxDeviation.toFixed(3)}(${level.pass ? "pass" : "fail"}) ` +
    `retestCategory=${retestCategory}`;

  return {
    roi: roiName,
    verdict,
    text: prefixVerdict(text, unverified),
    lampSnr: snr.lampSnr,
    noiseFloor: snr.noiseFloor,
    signal: snr.signal,
    varianceRatio: varianceRatio ?? null,
    chromaticityDrift: chromaticity,
    levelDrift: level,
    retestCategory,
  };
}

/**
 * Full run report. `lockState` is the object probeLockState() returned;
 * `roiInputs` is one entry per ROI (never a face-level aggregate);
 * `rejectionTally` and `noPairsReason` come from rejections.js.
 */
export function buildReport({ lockState, roiInputs, rejectionTally, noPairsReason, synthetic }) {
  const rois = (roiInputs || []).map((r) => roiVerdict(r, { unverified: lockState.unverified }));
  return {
    synthetic: Boolean(synthetic),
    lockState,
    noiseFloorDefinition: NOISE_FLOOR_DEFINITION,
    rois,
    rejectionTally,
    noPairsReason,
    absoluteColourClaimed: ABSOLUTE_COLOUR_CLAIMED,
    unverifiedSummary: lockState.unverified ? LOCK_UNVERIFIED_SUMMARY : null,
  };
}

/**
 * requirement 1.2: lock state prominently, once, BEFORE any ROI verdict.
 * Baking the ordering into a pure formatter (rather than leaving it to
 * whatever prints the report) makes the ordering itself testable.
 */
export function formatReport(report) {
  const lines = [];
  lines.push(
    `LOCK STATE: ${report.lockState.captureMode.toUpperCase()} ` +
    `requested=[${(report.lockState.requested || []).join(",")}] ` +
    `locked=[${(report.lockState.locked || []).join(",")}] ` +
    `mismatches=[${(report.lockState.mismatches || []).join(",")}]`,
  );
  if (report.unverifiedSummary) lines.push(report.unverifiedSummary);
  lines.push(`noiseFloor definition: ${report.noiseFloorDefinition}`);
  for (const roi of report.rois) lines.push(roi.text);
  lines.push(`rejections: warmUp=${report.rejectionTally?.warmUp ?? 0} ` +
    `drift=${report.rejectionTally?.drift ?? 0} incomplete=${report.rejectionTally?.incomplete ?? 0}`);
  if (report.noPairsReason) lines.push(`noPairsReason: ${report.noPairsReason}`);
  lines.push(`absoluteColourClaimed: ${report.absoluteColourClaimed}`);
  if (report.synthetic) lines.push("SYNTHETIC -- not validated on hardware.");
  return lines.join("\n");
}
