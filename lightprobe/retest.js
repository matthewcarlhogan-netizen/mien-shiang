/*
 * PHASE 0 LIGHT-PROBE — the retest gate, split into its two causes.
 *
 * A single combined "retest" number conflates two failures that have
 * different mechanisms, different owners, and different fixes:
 *
 *   3.1 WITHIN-PAIR CHROMATICITY DRIFT (camera-side)
 *       The a-star/b-star displacement between the LIT and UNLIT legs of ONE pair.
 *       The scene's own chromaticity does not change when a neutral lamp
 *       switches on; if a/b moves anyway, the camera's own auto-white-balance
 *       re-targeted between the two legs because the scene got brighter. This
 *       is not fixable by changing the lighting -- it is fixable only by
 *       actually locking white balance (see negotiate.js), which is why this
 *       gate correlates with lock state rather than with the lamp.
 *
 *   3.2 BETWEEN-REPEAT LEVEL DRIFT (panel-side)
 *       The L* displacement of the LIT leg across the ten repeats of the same
 *       ROI. The camera's white balance is irrelevant here -- this is asking
 *       whether the lamp itself is putting out the same brightness on repeat
 *       9 as on repeat 1. Consistent with auto-brightness on the panel or
 *       thermal throttling over the run.
 *
 * requirement 3.4: differential (lit-minus-unlit) subtraction cancels a
 * between-repeat LEVEL drift that affects both legs of a pair equally, and it
 * does so precisely when white balance is locked (so the camera is not also
 * re-targeting in response to the same brightness change). A 3.2 failure is
 * therefore evidence of a real panel problem worth knowing about, but it is
 * NOT automatically a blocker for anything built on the differential -- the
 * differential may already be cancelling it. A 3.1 failure is a blocker: it
 * is a displacement BETWEEN the two legs of the pair the differential is
 * built from, so there is nothing for the subtraction to cancel it against.
 */
import { median } from "../src/qise/baseline.js";

/** a-star/b-star units. A neutral lamp switching on should not move chromaticity. */
export const CHROMATICITY_DRIFT_MAX = 1.5;

/** L* units, across the ten repeats of one ROI's lit leg. */
export const LEVEL_DRIFT_MAX = 2.0;

export const LEVEL_DRIFT_NOTE =
  "Between-repeat L* drift on a locked-WB pair is largely cancelled by " +
  "lit-minus-unlit differential subtraction and is not by itself a Phase 5 " +
  "blocker. It is still worth reporting: it names a panel (auto-brightness " +
  "or thermal) problem separate from anything the camera did.";

export const CHROMATICITY_DRIFT_NOTE =
  "Within-pair chromaticity drift is a displacement BETWEEN the two legs " +
  "the differential is built from, so subtraction has nothing to cancel it " +
  "against. Treat any failure here as a blocker.";

/** requirement 3.1. One pair: one lit Lab sample, one unlit Lab sample. */
export function withinPairChromaticityDrift(litLab, unlitLab) {
  if (!litLab || !unlitLab) {
    return { displacement: null, pass: false, reason: "missing_leg" };
  }
  const displacement = Math.hypot(litLab.a - unlitLab.a, litLab.b - unlitLab.b);
  return { displacement, pass: displacement <= CHROMATICITY_DRIFT_MAX, reason: null };
}

/** requirement 3.2. lStarsAcrossRepeats: one L* per repeat, same ROI, same leg. */
export function betweenRepeatLevelDrift(lStarsAcrossRepeats) {
  const usable = (lStarsAcrossRepeats || []).filter(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
  if (usable.length < 2) {
    return { maxDeviation: null, median: null, pass: false, reason: "insufficient_repeats" };
  }
  const centre = median(usable);
  const maxDeviation = Math.max(...usable.map((v) => Math.abs(v - centre)));
  return { maxDeviation, median: centre, pass: maxDeviation <= LEVEL_DRIFT_MAX, reason: null };
}

/**
 * requirement 3.3: classify which of the two gates a failure belongs to, so a
 * report can attribute a failing pair/repeat to its actual cause instead of
 * reporting one undifferentiated "retest failed".
 */
export function classifyRetestFailure({ chromaticity, level }) {
  const failedChromaticity = chromaticity ? !chromaticity.pass : false;
  const failedLevel = level ? !level.pass : false;
  if (failedChromaticity && failedLevel) return "both";
  if (failedChromaticity) return "within_pair_chromaticity";
  if (failedLevel) return "between_repeat_level";
  return "none";
}

/*
 * requirement 4.3 (preserved as a design requirement, built fresh here -- see
 * the top-level report for why nothing in this repo can literally be
 * "preserved"): SPATIAL drift of the ROI between the two legs of a pair,
 * normalised by interocular distance rather than raw pixels so the threshold
 * means the same thing at any capture resolution or subject distance.
 *
 * This is a different axis from 3.1: 3.1 asks whether COLOUR moved between
 * legs, this asks whether the ROI's PIXEL POSITION moved between legs (the
 * subject shifted, or refocus/refit moved the mesh). A pair that fails this
 * is comparing two different patches of skin, which chromaticity drift alone
 * cannot detect, so it is DISCARDED rather than corrected -- there is no
 * honest way to synthesise the pixels of the position the pair should have
 * been taken at.
 */
import { interocularPx } from "../src/qise/gates.js";

export { interocularPx };

/** Fraction of interocular distance. Pairs beyond this are discarded, not corrected. */
export const PAIR_DRIFT_MAX_FRACTION = 0.02;

export function pairDrift({ litCentroidPx, unlitCentroidPx, landmarks }) {
  const reference = interocularPx(landmarks);
  if (!reference) {
    return { fraction: null, pass: false, reason: "no_interocular_reference" };
  }
  if (!litCentroidPx || !unlitCentroidPx) {
    return { fraction: null, pass: false, reason: "missing_centroid" };
  }
  const px = Math.hypot(
    litCentroidPx.x - unlitCentroidPx.x,
    litCentroidPx.y - unlitCentroidPx.y,
  );
  const fraction = px / reference;
  return { fraction, pass: fraction <= PAIR_DRIFT_MAX_FRACTION, reason: null };
}

/**
 * Discards, never corrects. Returns the surviving pairs and, separately, the
 * discarded ones with their fraction -- an audit trail of what was dropped
 * and why, rather than a silent filter.
 */
export function discardDriftedPairs(pairs) {
  const kept = [];
  const discarded = [];
  for (const pair of pairs || []) {
    const drift = pairDrift(pair);
    if (drift.pass) kept.push(pair);
    else discarded.push({ pair, drift });
  }
  return { kept, discarded };
}
