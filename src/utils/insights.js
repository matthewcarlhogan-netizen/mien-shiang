/*
 * Insights engine — Phase 3A.
 *
 * Generates entertainment-only narrative content derived from face-shape
 * classification, the canon-match proportion, and TCM readings.
 *
 * ── WHY A CANON PROPORTION AND NOT A SCORE ─────────────────────────────────
 * This module originally took an `aestheticScore` — a 0-100 rating of a face —
 * and bucketed it into "notably harmonious" / "diverges from ideals". That is
 * a verdict about a person, which consent clause 04 promises the app does not
 * produce and which CLAUDE.md item 33 exists to prevent.
 *
 * It now takes the canon-match proportion from `reading/harmony.js`, and every
 * bucket names the canon it is measuring against. The distinction is not a
 * wording trick: "0.62 of the way to the neoclassical figure" is checkable
 * against the arithmetic and the cited convention, whereas "a 62" is a claim
 * no measurement in this repo supports.
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

/* The disclaimer wording lives in index.html under data-copy="disclaimer",
 * NOT here. It contains "clinical" and "diagnosis", and lint-bundle.js buckets
 * every prose string in a .js file as Module A copy with no disclaimer bucket
 * for JS — so as a literal it fails the copy blocklist twice. Same arrangement
 * as the summary caveat (CLAUDE.md item 24) and the share-card footer (item
 * 35): one wording in the marked template, injected into its consumers.
 *
 * The fallback is deliberately empty rather than a paraphrase. A paraphrase
 * would be a second wording nobody is maintaining, and the guards would not
 * see it drift. */
export const ENTERTAINMENT_DISCLAIMER_FALLBACK = "";

function disclaimerFrom(template) {
  const t = typeof template === "string" ? template.trim() : "";
  return t || ENTERTAINMENT_DISCLAIMER_FALLBACK;
}

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

/* Commentary on the canon-match proportion.
 *
 * Every bucket is a statement about THE CANONS — how close the measured ratios
 * sit to figures named historical conventions treated as ideal — and never
 * about the reader. The canons are named inline because an unnamed "classical
 * ideal" is exactly the generic attribution the copy guard rejects, and
 * because the three ratios are measured against three DIFFERENT canons
 * (CLAUDE.md item 33): only mouth-to-nose is a golden-section claim.
 *
 * `null` is the not-measured case and must stay distinguishable from a low
 * proportion. Absence of measurement and a measurement of absence are
 * different objects; only the first is honest when the reading was refused. */
export const CANON_NOT_MEASURED =
  "The canon proportions were not measured from this photo, so nothing here " +
  "is compared with them.";

/* The bands sit in one declared table rather than inside an expression, for
 * the same reason the harmony weights do (CLAUDE.md item 33): the cut points
 * are editorial, nothing in this repo measures them, and copy buried in a
 * conditional is copy the guard cannot enumerate. Registered for scanning. */
export const CANON_RANGES = [
  {
    min: 0.8,
    text: "proportions notably close to the Lavater neoclassical figure and " +
      "the Three Courts of Mian Xiang.",
  },
  {
    min: 0.6,
    text: "proportions near the neoclassical figure recorded by Lavater (1778) " +
      "on some ratios and further from it on others.",
  },
  {
    min: 0.4,
    text: "proportions partway between the facial fifths and the classical " +
      "Mian Xiang figure, within the tolerance those conventions allow.",
  },
  {
    min: -Infinity,
    text: "proportions that diverge from the classical Mian Xiang figure and " +
      "from the neoclassical canon Lavater set out.",
  },
];

function canonRange(canonProportion) {
  if (!Number.isFinite(canonProportion)) return CANON_NOT_MEASURED;
  return CANON_RANGES.find((b) => canonProportion >= b.min).text;
}

/* Used when no TCM reading was produced. Names the tradition inline and says
 * that the texts disagree, which is item 20's requirement, not decoration. */
export const TCM_NARRATIVE_DEFAULT =
  "In TCM tradition, the face is regarded as a map of the body's inner patterns. " +
  "Classical texts associate each region with a different organ system, though " +
  "interpretations differ between sources and practitioners.";

/* Questions put to the reader, never statements about them. */
export const REFLECTION_PROMPTS = [
  "In what areas of life may the tendency described here feel most familiar to you?",
  "How does your own experience compare with the classical associations described?",
];

// ─────────────────────────────────────────────────────────── main export ────

/**
 * Generate entertainment-only narrative insights.
 *
 * @param {string} faceShape  shape label from classifyFaceShape (e.g. "oval")
 * @param {number|null} canonProportion  canon-match proportion in [0,1], from
 *   the `canon` component of readHarmony() in reading/harmony.js. Pass null
 *   when the proportions were not measured — do NOT substitute a stand-in.
 * @param {object} [tcmResult]  TCM reading result (optional, used for tcmNarrative)
 * @param {string} [disclaimerTemplate]  the wording from the data-copy
 *   "disclaimer" template in index.html. See the note on ENTERTAINMENT_
 *   DISCLAIMER_FALLBACK for why it is not a literal in this file.
 * @returns {{ teaserLines: string[], fullReport: object }}
 */
export function generateInsights(
  faceShape, canonProportion, tcmResult = null, disclaimerTemplate = "",
) {
  const copy = SHAPE_COPY[faceShape] ?? SHAPE_COPY.oval;

  const teaserLines = [copy.teaserA, copy.teaserB];

  const tcmNarrative = tcmResult?.summary
    ? `In TCM tradition, the reading may suggest: ${tcmResult.summary}`
    : TCM_NARRATIVE_DEFAULT;

  // A statement about the measurement and the canons it was compared with,
  // never about the person measured. The not-measured branch is a whole
  // sentence of its own, so it must not take the "this photo gave" lead-in —
  // there is no value for the lead-in to introduce.
  const measured = Number.isFinite(canonProportion);
  const canonLine = measured
    ? `Measured against the named canons, this photo gave ${canonRange(canonProportion)}`
    : CANON_NOT_MEASURED;

  const summary = [copy.summary, canonLine, disclaimerFrom(disclaimerTemplate)]
    .filter(Boolean).join(" ");

  return {
    teaserLines,
    fullReport: {
      summary,
      strengths: copy.strengths,
      tendencies: copy.tendencies,
      tcmNarrative,
      reflectionPrompts: REFLECTION_PROMPTS,
    },
  };
}

/* Registered in MODULE_A_COPY so every string above is scanned rather than
 * trusted. The header of this file used to CLAIM registration while the
 * registry did not list it — the check in copy-guard.test.js only enforces
 * registration for files under src/reading/, so a module under src/utils/
 * escaped it. An unregistered surface ships unread; that is the original
 * defect item 19 records. */
export const INSIGHTS_COPY = {
  SHAPE_COPY,
  CANON_NOT_MEASURED,
  CANON_RANGES,
  TCM_NARRATIVE_DEFAULT,
  REFLECTION_PROMPTS,
};
