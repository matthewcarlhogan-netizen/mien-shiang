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
    reading:
      "In Mian Xiang the upper court is read as the early years and what was inherited rather than chosen — " +
      "the classical texts associate a dominant upper court with people who think before they move, and who " +
      "were shaped early by what was expected of them.",
  },
  middle: {
    hanzi: "中停",
    name: "Middle Court",
    span: "brow to the base of the nose",
    reading:
      "Classical Chinese face reading gives the middle court the middle years and the part of a life a " +
      "person drives themselves. A dominant middle court is associated in the texts with self-direction — " +
      "getting on with it rather than waiting to be asked.",
  },
  lower: {
    hanzi: "下停",
    name: "Lower Court",
    span: "base of the nose to the chin",
    reading:
      "In Mian Xiang the lower court is read as the later years, and as resolve and closeness to others. " +
      "The texts associate a dominant lower court with warmth that shows late rather than early, and with " +
      "people who become more themselves as they go on.",
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
    reading: balanced ? BALANCED_READING : COURTS[topKey].reading,
    sourcesDiffer: SOURCES_DIFFER,
    /**
     * Passed straight through from the measurement layer. The upper court is
     * measured from the top of the face oval rather than the hairline, so it
     * reads short — which makes a "dominant upper court" harder to reach than
     * it should be, and a dominant lower court easier. Anyone reading this
     * result is entitled to know that before they read the meaning.
     */
    measurementCaveat: t.caveat,
    dominanceMargin: topFrac - entries[1][1],
  };
}
