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
    hanzi: "上停",
    name: "Upper Court",
    span: "hairline to brow",
  },
  middle: {
    hanzi: "中停",
    name: "Middle Court",
    span: "brow to the base of the nose",
  },
  lower: {
    hanzi: "下停",
    name: "Lower Court",
    span: "base of the nose to the chin",
  },
};

export const BALANCED_READING =
  "In Mian Xiang, three courts of near-equal length is the arrangement the classical texts single out as " +
  "balance — no season of life crowding out the others. The texts read it as evenness rather than as " +
  "excellence, and regard the balanced face as the ordinary case rather than the ideal one.";

/** Below this, the courts read as even rather than one dominating. */
export const DOMINANCE_THRESHOLD = 0.04;

export const SOURCES_DIFFER =
  "Sources differ on this — Mian Xiang texts divide the face into three courts, but they do not agree on " +
  "where the middle court ends. Some place the boundary at the base of the nose, others at the nostrils, " +
  "which shifts the proportions enough to change which court reads as dominant.";

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
    heritageReading: balanced ? BALANCED_READING : null,
    sourcesDiffer: SOURCES_DIFFER,
    measurementCaveat: t.caveat,
    dominanceMargin: topFrac - entries[1][1],
  };
}
