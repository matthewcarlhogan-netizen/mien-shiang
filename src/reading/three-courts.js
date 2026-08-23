/*
 * MODULE A — Three Courts (三停).
 *
 * The classical vertical division of the face into upper, middle and lower
 * courts, read from geometry.js's `thirds`.
 *
 * ── THE MEASUREMENT CAVEAT IS PART OF THE READING ──────────────────────────
 * The upper court classically runs from trichion (the hairline). The landmark
 * mesh has no hairline point, so it is measured from the top of the face oval
 * instead and reads SHORT. That is not a footnote to bury: it biases the whole
 * comparison against the upper court, which is exactly the thing this reading
 * is about. The caveat travels with the result.
 */

export const COURTS = {
  upper: {
    name: "Upper Section",
    span: "hairline to brow",
  },
  middle: {
    name: "Middle Section",
    span: "brow to the base of the nose",
  },
  lower: {
    name: "Lower Section",
    span: "base of the nose to the chin",
  },
};

/*
 * The received equal-sections maxim is not cleared for runtime: its attribution
 * and predicate are contradicted in the inspected witness. Keep the export so
 * older callers fail closed instead of reviving a stale paraphrase.
 */
export const BALANCED_READING = null;

/** Below this, the courts read as even rather than one dominating. */
export const DOMINANCE_THRESHOLD = 0.04;

export const SOURCES_DIFFER =
  "Sources differ on how the face is divided into three sections. Until the boundary witnesses are " +
  "verified, this view shows only measured proportions and offers no heritage interpretation.";

/**
 * @param {object} geometry `geometryReport()` output
 */
export function readThreeCourts(geometry) {
  const t = geometry?.thirds;
  if (!t || !Number.isFinite(t.upperFraction)) return null;

  const entries = [
    ["upper", t.upperFraction],
    ["middle", t.middleFraction],
    ["lower", t.lowerFraction],
  ].sort((a, b) => b[1] - a[1]);

  const [topKey, topFrac] = entries[0];
  const balanced = t.maxDeviation < DOMINANCE_THRESHOLD;

  return {
    available: true,
    balanced,
    fractions: {
      upper: t.upperFraction, middle: t.middleFraction, lower: t.lowerFraction,
    },
    dominant: balanced ? null : topKey,
    court: balanced ? null : COURTS[topKey],
    measurementObservation: `The ${balanced ? "face is balanced" : COURTS[topKey].name + " is the largest section"}.`,
    heritageReading: null,
    sourcesDiffer: SOURCES_DIFFER,
    measurementCaveat: t.caveat,
    dominanceMargin: topFrac - entries[1][1],
  };
}
