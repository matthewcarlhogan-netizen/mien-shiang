/*
 * Insights engine — Phase 3A.
 *
 * Generates entertainment-only narrative content derived from face-shape
 * classification, an aesthetic harmony score, and TCM readings.
 *
 * ── TONE CONTRACT ──────────────────────────────────────────────────────────
 * Every string produced here:
 *   - Uses: "may suggest," "in TCM tradition," "tends toward."
 *   - Never uses: "you have," "you are," "your health," "disease," "condition."
 *   - Never references specific health conditions by name.
 *   - Appends the standard entertainment disclaimer to every summary.
 *
 * This module is MODULE A copy. It is registered in MODULE_A_COPY and subject
 * to copy-guard scanning. No clinical vocabulary, no assertive statements about
 * the reader, no health claims.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 * Not a personality test. Not a health assessment. Not a prediction. All
 * mappings are drawn from the Mien Shiang / TCM face-reading tradition and are
 * attributed as such. Interpretation is the reader's own.
 */

// ─────────────────────────────────────────────────────────── copy maps ────

const ENTERTAINMENT_DISCLAIMER =
  "Entertainment only. These patterns are drawn from Traditional Chinese " +
  "Medicine tradition. Not a clinical diagnosis.";

/** Per-shape teaser and narrative content.
 *
 * Each entry supplies:
 *   teaserA, teaserB — the two always-visible teaser lines
 *   summary           — one paragraph for the full report
 *   strengths         — 2–3 tradition-attributed descriptors
 *   tendencies        — 2–3 tradition-attributed tendencies (never "weaknesses")
 */
const SHAPE_COPY = {
  oblong: {
    teaserA: "In Mien Shiang, an elongated face may suggest a contemplative nature.",
    teaserB: "Classical face reading associates this shape with reflective tendencies.",
    summary:
      "In the Mien Shiang tradition, an oblong face tends toward a considered, " +
      "inward-looking quality. Classical Chinese face reading associates this " +
      "proportion with patience and a methodical approach.",
    strengths: [
      "In TCM tradition, this face proportion tends toward steadiness.",
      "Classical Mien Xiang texts associate the elongated form with careful deliberation.",
      "Both Chinese and Western portrait traditions note an association with focus.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward introspection.",
      "Classical face reading associates this form with a preference for depth over breadth.",
    ],
  },
  heart: {
    teaserA: "In Mien Shiang, a wide-forehead face may suggest creative leanings.",
    teaserB: "Classical Chinese face reading associates this shape with expressive qualities.",
    summary:
      "In the Mien Shiang tradition, a heart-shaped face tends toward expressive, " +
      "imaginative qualities. The wide forehead is classically associated with " +
      "an active mind and an interest in ideas.",
    strengths: [
      "In TCM tradition, this face proportion tends toward expressive communication.",
      "Classical Mien Xiang texts associate the wide forehead with ideation.",
      "Lavater (1778) noted an association between this form and imaginative tendencies.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward enthusiasm over caution.",
      "Classical face reading associates this form with a preference for novelty.",
    ],
  },
  square: {
    teaserA: "In Mien Shiang, a square face may suggest a grounded nature.",
    teaserB: "Classical Chinese face reading associates this shape with practical tendencies.",
    summary:
      "In the Mien Shiang tradition, a square face tends toward steadfastness and " +
      "practical resolve. Both Chinese and Western traditions associate this proportion " +
      "with perseverance.",
    strengths: [
      "In TCM tradition, this face proportion tends toward reliability.",
      "Classical Mien Xiang texts associate the square form with persistence.",
      "Both Chinese and Western face-reading traditions note an association with practicality.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward directness.",
      "Classical face reading associates this form with a preference for structure.",
    ],
  },
  round: {
    teaserA: "In Mien Shiang, a round face may suggest a sociable disposition.",
    teaserB: "Classical Chinese face reading associates this shape with warmth.",
    summary:
      "In the Mien Shiang tradition, a round face tends toward approachable, " +
      "generous qualities. Classical Chinese face reading associates this proportion " +
      "with social ease.",
    strengths: [
      "In TCM tradition, this face proportion tends toward openness.",
      "Classical Mien Xiang texts associate the round form with generosity.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward harmony-seeking.",
      "Classical face reading associates this form with adaptability.",
    ],
  },
  diamond: {
    teaserA: "In Mien Shiang, prominent cheekbones may suggest intensity.",
    teaserB: "Classical Chinese face reading associates this shape with focused drive.",
    summary:
      "In the Mien Shiang tradition, a diamond face tends toward intensity and " +
      "precision. Classical Chinese face reading associates dominant cheekbones " +
      "with focused, purposeful qualities.",
    strengths: [
      "In TCM tradition, this face proportion tends toward precision.",
      "Classical Mien Xiang texts associate this form with determination.",
      "Both Chinese and Western traditions note an association with analytical tendencies.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward intensity.",
      "Classical face reading associates this form with high standards.",
    ],
  },
  oval: {
    teaserA: "In Mien Shiang, a balanced face tends toward versatility.",
    teaserB: "Classical Chinese face reading associates this proportion with adaptability.",
    summary:
      "In the Mien Shiang tradition, balanced proportions tend toward versatility " +
      "and openness. Classical Chinese face reading associates this form with a " +
      "capacity to move between contexts.",
    strengths: [
      "In TCM tradition, this face proportion tends toward balance.",
      "Classical Mien Xiang texts associate the oval form with flexibility.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward adaptability.",
      "Classical face reading associates this form with openness to change.",
    ],
  },
  tree: {
    teaserA: "In Mien Shiang, a tall, column-like face may suggest uprightness.",
    teaserB: "Classical Chinese face reading associates this proportion with principled tendencies.",
    summary:
      "In the Mien Shiang tradition, a tree (rectangular) face tends toward integrity " +
      "and a principled approach. Classical Mien Xiang texts associate this tall, " +
      "even-width form with conscientiousness.",
    strengths: [
      "In TCM tradition, this face proportion tends toward principled conduct.",
      "Classical Mien Xiang texts associate the rectangular form with integrity.",
      "Both Chinese and Western face-reading traditions note an association with reliability.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward moral consistency.",
      "Classical face reading associates this form with careful, measured responses.",
    ],
  },
  king: {
    teaserA: "In Mien Shiang, a broad, angular jaw may suggest decisive qualities.",
    teaserB: "Classical Chinese face reading associates this shape with strong will.",
    summary:
      "In the Mien Shiang tradition, a king (pentagonal) face tends toward " +
      "decisiveness and resolve. The broad, angular jaw is classically associated " +
      "with a strong sense of direction.",
    strengths: [
      "In TCM tradition, this face proportion tends toward decisiveness.",
      "Classical Mien Xiang texts associate the angular jaw with strong will.",
      "Both Chinese and Western traditions note an association with tenacity.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward directness.",
      "Classical face reading associates this form with confidence in decision-making.",
    ],
  },
  wall: {
    teaserA: "In Mien Shiang, a broad, flat face may suggest endurance.",
    teaserB: "Classical Chinese face reading associates this shape with a measured approach.",
    summary:
      "In the Mien Shiang tradition, a wall (broad-flat) face tends toward steadiness " +
      "and endurance. Classical Mien Xiang texts associate this wide, low-relief form " +
      "with a calm, patient quality.",
    strengths: [
      "In TCM tradition, this face proportion tends toward patience.",
      "Classical Mien Xiang texts associate the broad form with stamina.",
      "Both Chinese and Western face-reading traditions note an association with composure.",
    ],
    tendencies: [
      "In TCM tradition, this proportion may suggest a tendency toward measured responses.",
      "Classical face reading associates this form with persistence under pressure.",
    ],
  },
};

/** Score-range commentary for the aesthetic harmony score. */
function scoreRange(score) {
  if (score >= 80) return "notably harmonious proportions relative to classical ideals.";
  if (score >= 60) return "proportions that align well with several classical ideals.";
  if (score >= 40) return "proportions within the common range of classical measurements.";
  return "proportions that diverge from classical ideals in interesting ways.";
}

// ─────────────────────────────────────────────────────────── main export ────

/**
 * Generate entertainment-only narrative insights.
 *
 * @param {string} faceShape  shape label from classifyFaceShape (e.g. "oval")
 * @param {number} aestheticScore  0–100 integer from calculateAestheticScore
 * @param {object} [tcmResult]  TCM reading result (optional, used for tcmNarrative)
 * @returns {{ teaserLines: string[], fullReport: object }}
 */
export function generateInsights(faceShape, aestheticScore, tcmResult = null) {
  const copy = SHAPE_COPY[faceShape] ?? SHAPE_COPY.oval;

  const teaserLines = [copy.teaserA, copy.teaserB];

  const tcmNarrative = tcmResult?.summary
    ? `In TCM tradition, the reading may suggest: ${tcmResult.summary}`
    : "In TCM tradition, the face is regarded as a map of the body's inner patterns. " +
      "Classical texts associate each region with a different organ system, though " +
      "interpretations differ between sources and practitioners.";

  const summary =
    `${copy.summary} The geometric analysis found ${scoreRange(aestheticScore)} ` +
    ENTERTAINMENT_DISCLAIMER;

  return {
    teaserLines,
    fullReport: {
      summary,
      strengths: copy.strengths,
      tendencies: copy.tendencies,
      tcmNarrative,
      reflectionPrompts: [
        "In what areas of life may the tendency described here feel most familiar to you?",
        "How does your own experience compare with the classical associations described?",
      ],
    },
  };
}
