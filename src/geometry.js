/*
 * Facial geometry from the 478-point MediaPipe landmark set.
 *
 * PURE — no DOM, no MediaPipe import, no network. Everything here takes an
 * array of {x, y} in PIXEL space and returns numbers. That is deliberate: it
 * makes the whole geometry layer testable under `node --test` with synthetic
 * landmark sets, with no browser and no 3.76 MB model download.
 *
 * ── WHAT THIS LAYER IS AND IS NOT ──────────────────────────────────────────
 * This file measures proportions. It assigns NO meaning to them. Nothing here
 * emits a trait, a personality claim, a rating, or a rank. Interpretation is
 * Phase 2 and lives elsewhere, so that the measurement can be checked
 * independently of the reading laid over it.
 *
 * ── LANDMARK INDICES ARE VERIFIED, NOT REMEMBERED ──────────────────────────
 * The named indices below were read out of the library itself
 * (`FaceLandmarker.FACE_LANDMARKS_FACE_OVAL`, tasks-vision 0.10.18), by
 * walking the connection pairs into an ordered ring:
 *
 *   10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
 *   379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
 *   234, 127, 162, 21, 54, 103, 67, 109  → back to 10
 *
 * 10 and 152 are the two midline poles. Every other point has a mirror twin
 * the same number of steps around the ring in the opposite direction:
 *
 *   step 3  → 332 ↔ 103   (frontotemporal)
 *   step 8  → 454 ↔ 234   (bizygomatic — widest)
 *   step 12 → 397 ↔ 172   (gonial — jaw)
 *
 * LATERALITY follows the same subject-anatomical convention as the rest of
 * this repo (CLAUDE.md item 5): 234 is the SUBJECT's right, 454 the subject's
 * left. Nothing in this file depends on that being true — every measurement
 * here is a width or a ratio, and both are symmetric under a left/right swap.
 * The un-mirror step upstream still matters for the colorimetry zones.
 */

// ─────────────────────────────────────────────────────────────── indices ────

export const LM = {
  /** Top of the face OVAL. This is NOT trichion (the hairline). MediaPipe's
   *  mesh has no hairline landmark; the oval terminates at the upper forehead.
   *  Every measurement that would classically start at trichion therefore
   *  UNDERSTATES the upper third. Flagged in the output, never silently
   *  extrapolated — see `thirds()`. */
  OVAL_APEX: 10,
  MENTON: 152,          // chin, lowest midline point of the oval
  GLABELLA: 9,          // between the brows
  SUBNASALE: 2,         // base of the nose, top of the philtrum
  LABIALE_SUPERIUS: 0,  // upper lip vermilion midpoint

  ZYGION_A: 234,        // widest oval pair (subject's right)
  ZYGION_B: 454,        //                  (subject's left)
  GONION_A: 172,        // jaw pair (subject's right)
  GONION_B: 397,        //          (subject's left)
  FRONTOTEMPORAL_A: 103, // upper forehead pair (subject's right)
  FRONTOTEMPORAL_B: 332, //                     (subject's left)

  /** The four eye corners. Which of each pair is medial vs lateral is NOT
   *  hardcoded — `fifths()` sorts them by x instead, so the result is correct
   *  whichever way round they are and survives a mirrored frame. */
  EYE_CORNERS: [33, 133, 362, 263],

  /** Upper-eyelid midpoints, used for the fWHR numerator. Derived from the
   *  library's own eye rings: in FACE_LANDMARKS_RIGHT_EYE the upper lid runs
   *  246-161-160-159-158-157-173, so 159 is its midpoint; in
   *  FACE_LANDMARKS_LEFT_EYE it runs 466-388-387-386-385-384-398, so 386 is. */
  UPPER_LID_A: 159,
  UPPER_LID_B: 386,
  IRIS_CENTRE_A: 468,
  IRIS_CENTRE_B: 473,

  /** Mouth corners. Read off the perioral ROI in zones.js, whose upper-lip
   *  ring runs 61-185-40-39-37-0-267-269-270-409-291 — so 61 and 291 are its
   *  two endpoints, i.e. the corners. */
  CHEILION_A: 61,
  CHEILION_B: 291,

  /** Outer nostril edges, for nose width.
   *
   *  HONEST PROVENANCE, because it is weaker than the rest of this table: the
   *  face-oval indices above were walked out of the library's own connection
   *  set, and these were not. 129 and 358 are the widest pair in the nose_apex
   *  ROI in zones.js and are conventionally the alare points, but that is
   *  convention plus a local cross-check, not a reading of the library. If a
   *  nose-width figure ever looks systematically off, suspect these first. */
  ALARE_A: 129,
  ALARE_B: 358,

  /** Jaw ring neighbours either side of the gonial pair.
   *
   *  Taken from the face-oval ring in the header comment: on the subject's
   *  right it runs ... 58, 172, 136 ... and on the left ... 288, 397, 365 ...
   *  so these are the points immediately before and after each gonion. Using
   *  ring-adjacent points is what makes the angle at the corner meaningful —
   *  an arbitrary pair of jaw landmarks measures some other angle. */
  RAMUS_A: 58,   // subject's right, toward the ear
  JAWBODY_A: 136, // subject's right, toward the chin
  RAMUS_B: 288,  // subject's left, toward the ear
  JAWBODY_B: 365, // subject's left, toward the chin
};

// ───────────────────────────────────────────────────────────────── maths ────

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Rotate the landmark set so the inter-ocular axis is horizontal.
 *
 * Load-bearing, not cosmetic. Every width below is measured as a straight
 * point-to-point distance, but "face length" and the horizontal fifths are
 * meaningful only relative to the head's own axes. On a head tilted 15° the
 * un-normalised fifths boundaries shear badly, because they are taken from x
 * ordering. Rotating first costs one pass and removes the whole failure mode.
 *
 * The axis is taken between landmarks 33 and 263 — one corner from each eye,
 * so the line spans the face regardless of which corner is medial.
 */
export function normaliseRoll(pts) {
  const a = pts[33], b = pts[263];
  if (!a || !b) return { pts, rollDegrees: 0 };

  const theta = Math.atan2(b.y - a.y, b.x - a.x);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const cos = Math.cos(-theta), sin = Math.sin(-theta);

  const out = pts.map((p) => {
    const dx = p.x - cx, dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
  return { pts: out, rollDegrees: (theta * 180) / Math.PI };
}

// ─────────────────────────────────────────────────────────── raw measures ───

/** The four primary distances, in pixels, on roll-normalised points. */
export function faceMetrics(pts) {
  const P = (i) => pts[i];
  return {
    faceLength: dist(P(LM.OVAL_APEX), P(LM.MENTON)),
    bizygomaticWidth: dist(P(LM.ZYGION_A), P(LM.ZYGION_B)),
    bigonialWidth: dist(P(LM.GONION_A), P(LM.GONION_B)),
    frontotemporalWidth: dist(P(LM.FRONTOTEMPORAL_A), P(LM.FRONTOTEMPORAL_B)),
  };
}

/**
 * Scale-independent geometry used by the real-time measurement service.
 * Pixel distances are retained only for this in-memory report; the ratios are
 * invariant to camera resolution and neither the points nor distances cross
 * the positive storage allow-list in qise/integrated.js.
 */
export function measurementRatios(pts, metrics = faceMetrics(pts)) {
  const interPupillaryDistance = dist(pts[LM.IRIS_CENTRE_A], pts[LM.IRIS_CENTRE_B]);
  const noseToChinLength = dist(pts[LM.SUBNASALE], pts[LM.MENTON]);
  const divide = (numerator, denominator) => denominator > 0 ? numerator / denominator : NaN;
  return {
    interPupillaryDistance,
    noseToChinLength,
    interPupillaryToFaceWidth: divide(interPupillaryDistance, metrics.bizygomaticWidth),
    noseToChinToFaceLength: divide(noseToChinLength, metrics.faceLength),
    faceWidthToHeight: divide(metrics.bizygomaticWidth, metrics.faceLength),
  };
}

/**
 * Three Courts (三停) — the classical vertical thirds.
 *
 * Upper  : trichion → glabella
 * Middle : glabella → subnasale
 * Lower  : subnasale → menton
 *
 * HONEST LIMITATION, surfaced in the return value rather than buried: the mesh
 * has no trichion. `LM.OVAL_APEX` sits at the top of the face oval, which is
 * below the hairline for most faces and varies with hairline shape. So the
 * upper court is measured SHORT, and the three fractions are biased against
 * it. `trichionEstimated: false` says exactly that. Do not "fix" this by
 * scaling the upper court up by a constant — that would manufacture a
 * measurement from an assumption, which is the same error the erythema
 * constant discussion in CLAUDE.md exists to prevent.
 */
export function thirds(pts) {
  const yApex = pts[LM.OVAL_APEX].y;
  const yGlab = pts[LM.GLABELLA].y;
  const ySub = pts[LM.SUBNASALE].y;
  const yMent = pts[LM.MENTON].y;

  const upper = yGlab - yApex;
  const middle = ySub - yGlab;
  const lower = yMent - ySub;
  const total = upper + middle + lower;

  const frac = (v) => (total > 0 ? v / total : NaN);
  return {
    upper, middle, lower, total,
    upperFraction: frac(upper),
    middleFraction: frac(middle),
    lowerFraction: frac(lower),
    /** Even thirds = 1/3 each. This is the max deviation from that, so 0 is a
     *  perfectly even face and larger means one court dominates. */
    maxDeviation: Math.max(
      Math.abs(frac(upper) - 1 / 3),
      Math.abs(frac(middle) - 1 / 3),
      Math.abs(frac(lower) - 1 / 3),
    ),
    trichionEstimated: false,
    caveat:
      "The upper court is measured from the top of the face oval, not the " +
      "hairline — the landmark set has no hairline point, so this court reads " +
      "shorter than a classical measurement would make it.",
  };
}

/**
 * Facial fifths — the classical vertical divisions across eye level.
 *
 * Boundaries, left to right in image space: face edge, outer eye corner,
 * inner eye corner, inner eye corner, outer eye corner, face edge.
 *
 * The four eye corners are SORTED BY X rather than assigned by index, so this
 * is correct without depending on which of 33/133 is medial, and stays correct
 * on a mirrored frame.
 */
export function fifths(pts) {
  const corners = LM.EYE_CORNERS.map((i) => pts[i].x).sort((a, b) => a - b);
  const edges = [pts[LM.ZYGION_A].x, pts[LM.ZYGION_B].x].sort((a, b) => a - b);

  const bounds = [edges[0], ...corners, edges[1]];
  const total = bounds[5] - bounds[0];

  const segments = [];
  for (let i = 0; i < 5; i++) segments.push(bounds[i + 1] - bounds[i]);

  const fractions = segments.map((s) => (total > 0 ? s / total : NaN));
  return {
    bounds, segments, fractions, total,
    /** Even fifths = 0.2 each. */
    maxDeviation: Math.max(...fractions.map((f) => Math.abs(f - 0.2))),
  };
}

/**
 * Facial width-to-height ratio.
 *
 * ── THE DEFINITION USED HERE, STATED ONCE AND NOT VARIED ───────────────────
 *
 *     fWHR = bizygomatic width ÷ upper-face height
 *
 *   bizygomatic width  = dist(234, 454)            — widest face-oval pair
 *   upper-face height  = mean_y(159, 386) − y(0)   — upper eyelids to upper lip
 *                        (taken as |Δy|, on roll-normalised points)
 *
 * This is the EYELID-based convention (upper lip → upper eyelid), as used in
 * the behavioural literature following Carré & McCormick. It is NOT the
 * nasion-based convention, which measures from the nasion (bridge of the nose)
 * instead and yields systematically different numbers. The two are not
 * interchangeable and must never be compared across studies as if they were.
 * If this definition is ever changed, change it here, in CLAUDE.md, and in the
 * docs together — a silently swapped denominator makes every stored value
 * incomparable with every earlier one.
 *
 * ── HOW IT MAY BE PRESENTED ────────────────────────────────────────────────
 * As a neutral proportion, or not at all. It is NEVER to be surfaced as a
 * dominance, aggression, trustworthiness or threat signal, and never mapped to
 * a trait in the reading engine. The published fWHR–behaviour correlations are
 * small (r ≈ 0.10–0.16), contested, and do not survive as a statement about an
 * individual. `presentAs` carries that constraint next to the number so it
 * cannot be picked up without it.
 */
export function fwhr(pts) {
  const width = dist(pts[LM.ZYGION_A], pts[LM.ZYGION_B]);
  const lidY = (pts[LM.UPPER_LID_A].y + pts[LM.UPPER_LID_B].y) / 2;
  const height = Math.abs(pts[LM.LABIALE_SUPERIUS].y - lidY);

  return {
    value: height > 0 ? width / height : NaN,
    width,
    height,
    definition: "bizygomatic width / (upper eyelid → upper lip); eyelid-based, not nasion-based",
    presentAs: "neutral proportion only — never as a dominance or aggression signal",
  };
}

/**
 * Yaw / frontality check.
 *
 * Widths measured in the image plane shrink as the head turns, and every ratio
 * below depends on widths. A face at 25° of yaw will classify differently from
 * the same face square-on. Rather than silently returning a confident wrong
 * answer, measure the asymmetry and report it.
 *
 * Method: take the midline through the two oval poles (apex, menton) and
 * compare the perpendicular distances of the two zygia. On a frontal face they
 * are equal; yaw makes one shorter.
 */
export function frontality(pts) {
  const a = pts[LM.OVAL_APEX], b = pts[LM.MENTON];
  const vx = b.x - a.x, vy = b.y - a.y;
  const len = Math.hypot(vx, vy) || 1;

  const perp = (p) => Math.abs((p.x - a.x) * vy - (p.y - a.y) * vx) / len;
  const dA = perp(pts[LM.ZYGION_A]);
  const dB = perp(pts[LM.ZYGION_B]);
  const sum = dA + dB;

  // 0 = perfectly symmetric about the midline, 1 = one side has collapsed.
  const asymmetry = sum > 0 ? Math.abs(dA - dB) / sum : NaN;

  return {
    leftOffset: dA,
    rightOffset: dB,
    asymmetry,
    /** Above this the widths are not trustworthy enough to classify a shape.
     *  Chosen to be conservative: it errs toward declaring a photo unusable
     *  rather than reporting a shape derived from a turned head. */
    frontal: asymmetry <= 0.12,
  };
}

// ─────────────────────────────────────────────────────── shape classifier ───

/*
 * Rule-based, fully transparent face-shape classifier.
 *
 * ── WHAT THESE THRESHOLDS ARE ──────────────────────────────────────────────
 * Conventional proportion heuristics of the kind used in styling and portrait
 * literature, expressed here as explicit constants. They are NOT validated
 * anthropometric classes, there is no labelled ground truth in this repo, and
 * no clinical or scientific weight attaches to the label. They are the same
 * category of object as the severity constants described in CLAUDE.md:
 * reasoned starting points, not fitted values.
 *
 * The rules are ordered and the FIRST match wins. Every rule records the ratio
 * that fired it, its value, and the threshold it had to beat, so any label can
 * be traced back to arithmetic. That trace is what the debug view renders.
 */

export const SHAPE_THRESHOLDS = {
  LONG: 1.45,          // faceLength / bizygomatic at or above this reads long
  SHORT: 1.25,         // below this reads short
  UNIFORM_SPREAD: 0.12, // max spread between the three widths for "uniform"
  WIDE_JAW: 0.90,      // bigonial / bizygomatic
  WIDE_FOREHEAD: 0.88, // frontotemporal / bizygomatic
  HEART_FOREHEAD: 0.93,
  HEART_TAPER: 0.80,   // bigonial / frontotemporal
  DIAMOND_TAPER: 0.88,
};

export function shapeRatios(m) {
  const widths = [m.frontotemporalWidth, m.bizygomaticWidth, m.bigonialWidth];
  return {
    lengthToWidth: m.faceLength / m.bizygomaticWidth,
    jawToCheek: m.bigonialWidth / m.bizygomaticWidth,
    foreheadToCheek: m.frontotemporalWidth / m.bizygomaticWidth,
    jawToForehead: m.bigonialWidth / m.frontotemporalWidth,
    widthSpread: (Math.max(...widths) - Math.min(...widths)) / m.bizygomaticWidth,
  };
}

/**
 * @returns {{shape, because, ratios, alternatives}} — `because` is the list of
 * tests the winning rule required, each with its measured value and threshold.
 */
export function classifyFaceShape(metrics) {
  const r = shapeRatios(metrics);
  const T = SHAPE_THRESHOLDS;

  const test = (label, value, op, threshold) => ({
    label, value, op, threshold,
    passed: op === ">=" ? value >= threshold : value < threshold,
  });

  // Ordered. First rule whose every test passes wins.
  const rules = [
    {
      shape: "oblong",
      tests: [
        test("faceLength / bizygomaticWidth", r.lengthToWidth, ">=", T.LONG),
        test("width spread across forehead/cheek/jaw", r.widthSpread, "<", T.UNIFORM_SPREAD),
      ],
      reads: "long, with forehead, cheekbones and jaw close to the same width",
    },
    {
      shape: "heart",
      tests: [
        test("frontotemporalWidth / bizygomaticWidth", r.foreheadToCheek, ">=", T.HEART_FOREHEAD),
        test("bigonialWidth / frontotemporalWidth", r.jawToForehead, "<", T.HEART_TAPER),
      ],
      reads: "widest across the forehead, tapering to a narrow chin",
    },
    {
      shape: "square",
      tests: [
        test("faceLength / bizygomaticWidth", r.lengthToWidth, "<", T.SHORT),
        test("bigonialWidth / bizygomaticWidth", r.jawToCheek, ">=", T.WIDE_JAW),
        test("frontotemporalWidth / bizygomaticWidth", r.foreheadToCheek, ">=", T.WIDE_FOREHEAD),
      ],
      reads: "short relative to its width, with a jaw nearly as wide as the cheekbones",
    },
    {
      shape: "round",
      tests: [
        test("faceLength / bizygomaticWidth", r.lengthToWidth, "<", T.SHORT),
        test("bigonialWidth / bizygomaticWidth", r.jawToCheek, "<", T.WIDE_JAW),
      ],
      reads: "short relative to its width, with a softer jawline",
    },
    {
      shape: "diamond",
      tests: [
        test("frontotemporalWidth / bizygomaticWidth", r.foreheadToCheek, "<", T.DIAMOND_TAPER),
        test("bigonialWidth / bizygomaticWidth", r.jawToCheek, "<", T.DIAMOND_TAPER),
      ],
      reads: "widest across the cheekbones, narrowing at both the forehead and the jaw",
    },
  ];

  for (const rule of rules) {
    if (rule.tests.every((t) => t.passed)) {
      return {
        shape: rule.shape,
        reads: rule.reads,
        because: rule.tests,
        ratios: r,
        /** Rules that failed on exactly one test — i.e. near misses. Shown in
         *  the debug view so a borderline face does not look decisive. */
        alternatives: rules
          .filter((x) => x !== rule && x.tests.filter((t) => !t.passed).length === 1)
          .map((x) => ({ shape: x.shape, missedBy: x.tests.filter((t) => !t.passed) })),
      };
    }
  }

  // Oval is the residual class, not a positive finding. Saying so is the
  // honest form: it means "no other rule matched", not "this face is oval".
  return {
    shape: "oval",
    reads: "balanced proportions — no other rule's conditions were met",
    because: [],
    ratios: r,
    residual: true,
    alternatives: rules
      .filter((x) => x.tests.filter((t) => !t.passed).length === 1)
      .map((x) => ({ shape: x.shape, missedBy: x.tests.filter((t) => !t.passed) })),
  };
}

// ──────────────────────────────────────────────── canon proportions ─────────

/*
 * Proportions that named historical canons make a claim about.
 *
 * ── EACH RATIO IS COMPARED TO ITS OWN CANON, NOT ALL OF THEM TO PHI ────────
 * This is the correction that matters here. Only ONE of the three ratios below
 * is a golden-ratio claim. The other two have canonical values of 1/3 and 1/5,
 * from the Three Courts and the facial fifths respectively, and comparing them
 * to 1.618 would not be a stricter test — it would be a different and false
 * one, scoring every face against a number no tradition ever applied to that
 * measurement.
 *
 * So each entry carries the canon it is measured against and where that canon
 * comes from. Nothing here says a face SHOULD match; the value is a distance
 * from a historical convention, and the reading layer is what frames it.
 */

export const CANON = {
  /** Neoclassical: the mouth is phi times the width of the nose. */
  MOUTH_TO_NOSE: { value: (1 + Math.sqrt(5)) / 2, tolerance: 0.35 },
  /** Three Courts: the middle court is a third of the face. */
  MIDDLE_COURT: { value: 1 / 3, tolerance: 0.08 },
  /** Facial fifths: the inter-ocular gap is a fifth of the width. */
  CENTRAL_FIFTH: { value: 1 / 5, tolerance: 0.06 },
};

/**
 * How closely a measured value sits to a canonical one, in [0, 1].
 *
 * 1 is an exact match and 0 is a full tolerance away or further. The tolerance
 * is what makes this a match rather than a rank: without one, the only way to
 * turn a distance into a score is to compare faces to each other, which is the
 * thing this file does not do.
 *
 * The tolerances are reasoned starting points, in the same category as every
 * other constant in this repo that has no labelled data behind it.
 */
export function canonMatch(value, canon) {
  if (!Number.isFinite(value)) return null;
  const d = Math.abs(value - canon.value) / canon.tolerance;
  return Math.max(0, 1 - d);
}

/** The three canon-bearing ratios, measured. No meaning attached. */
export function canonProportions(pts, courts, five) {
  const noseWidth = dist(pts[LM.ALARE_A], pts[LM.ALARE_B]);
  const mouthWidth = dist(pts[LM.CHEILION_A], pts[LM.CHEILION_B]);

  return {
    mouthToNose: {
      value: noseWidth > 0 ? mouthWidth / noseWidth : NaN,
      canon: CANON.MOUTH_TO_NOSE.value,
      source: "neoclassical proportion, after Lavater and the della Porta tradition",
    },
    middleCourt: {
      value: courts.middleFraction,
      canon: CANON.MIDDLE_COURT.value,
      source: "the Three Courts of Mian Xiang",
    },
    centralFifth: {
      value: five.fractions[2],
      canon: CANON.CENTRAL_FIFTH.value,
      source: "the facial fifths",
    },
  };
}

/**
 * Bilateral symmetry, from mirror-twin distances about the midline.
 *
 * ── A FLAT PHOTO CANNOT SEPARATE ASYMMETRY FROM YAW ────────────────────────
 * A turned head shortens one side of every pair, which is indistinguishable
 * here from a face that is genuinely uneven. `frontality()` already measures
 * that confusion; this returns `reliable: false` when it is too large, and the
 * reading layer must drop the component rather than report a number it cannot
 * stand behind. Reporting a symmetry figure from a turned head is the single
 * easiest way for this measurement to be confidently wrong.
 */
export const SYMMETRY_PAIRS = [
  [LM.FRONTOTEMPORAL_A, LM.FRONTOTEMPORAL_B],
  [LM.ZYGION_A, LM.ZYGION_B],
  [LM.GONION_A, LM.GONION_B],
  [LM.RAMUS_A, LM.RAMUS_B],
  [LM.JAWBODY_A, LM.JAWBODY_B],
];

export function symmetryIndex(pts, pose) {
  const a = pts[LM.OVAL_APEX], b = pts[LM.MENTON];
  const vx = b.x - a.x, vy = b.y - a.y;
  const len = Math.hypot(vx, vy) || 1;
  const perp = (p) => Math.abs((p.x - a.x) * vy - (p.y - a.y) * vx) / len;

  const deviations = [];
  for (const [i, j] of SYMMETRY_PAIRS) {
    const dA = perp(pts[i]), dB = perp(pts[j]);
    const sum = dA + dB;
    if (sum > 0) deviations.push(Math.abs(dA - dB) / sum);
  }
  if (!deviations.length) return { value: null, reliable: false, pairs: 0 };

  const mean = deviations.reduce((x, y) => x + y, 0) / deviations.length;
  return {
    /** 1 is perfectly even about the midline, 0 is one side collapsed. */
    value: 1 - Math.min(mean * 2, 1),
    meanDeviation: mean,
    pairs: deviations.length,
    reliable: pose.frontal,
    caveat: pose.frontal ? null
      : "The head is turned far enough that evenness cannot be separated from the angle of the photo.",
  };
}

/**
 * Gonial angle — the corner of the jaw, in degrees, averaged over both sides.
 *
 * Measured at each gonion between its two RING-ADJACENT neighbours, so the
 * angle is the one the jaw outline actually turns through at that point. An
 * arbitrary set of nearby jaw landmarks measures some other angle and still
 * returns a plausible number.
 *
 * A smaller angle is a sharper corner. Nothing here calls that better.
 */
export function jawAngle(pts) {
  const at = (prev, vertex, next) => {
    const p = pts[prev], v = pts[vertex], n = pts[next];
    const ax = p.x - v.x, ay = p.y - v.y;
    const bx = n.x - v.x, by = n.y - v.y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) return NaN;
    const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (la * lb)));
    return (Math.acos(cos) * 180) / Math.PI;
  };

  const right = at(LM.RAMUS_A, LM.GONION_A, LM.JAWBODY_A);
  const left = at(LM.RAMUS_B, LM.GONION_B, LM.JAWBODY_B);
  const both = [right, left].filter(Number.isFinite);
  return {
    right, left,
    degrees: both.length ? both.reduce((a, b) => a + b, 0) / both.length : NaN,
  };
}

/**
 * How far the cheekbones stand out from the forehead and jaw.
 *
 * Deliberately NOT compared to a canon: there is no classical figure for this
 * the way there is for the courts and the fifths, and inventing one would be
 * manufacturing a standard rather than measuring against a historical one.
 * Reported as a plain proportion for the reading layer to describe.
 */
export function cheekboneProminence(m) {
  const others = (m.frontotemporalWidth + m.bigonialWidth) / 2;
  return {
    value: others > 0 ? m.bizygomaticWidth / others : NaN,
    definition: "bizygomatic width / mean of frontotemporal and bigonial widths",
  };
}

// ────────────────────────────────────────────────────────────── orchestra ───

/**
 * Full geometry report for one landmark set.
 * @param {{x:number,y:number}[]} rawPts 478 points in pixel space.
 */
export function geometryReport(rawPts) {
  if (!Array.isArray(rawPts) || rawPts.length !== 478) {
    throw new Error(`geometryReport expects 478 landmarks, got ${rawPts?.length}`);
  }

  const { pts, rollDegrees } = normaliseRoll(rawPts);
  const metrics = faceMetrics(pts);
  const pose = frontality(pts);
  const shape = classifyFaceShape(metrics);
  const courts = thirds(pts);
  const five = fifths(pts);

  return {
    rollDegrees,
    pose,
    metrics,
    measurementRatios: measurementRatios(pts, metrics),
    thirds: courts,
    fifths: five,
    fwhr: fwhr(pts),
    shape,
    canon: canonProportions(pts, courts, five),
    symmetry: symmetryIndex(pts, pose),
    jaw: jawAngle(pts),
    cheekbones: cheekboneProminence(metrics),
    /** Set when the head is turned far enough that the widths — and therefore
     *  the shape label built on them — should not be trusted. The label is
     *  still returned so the debug view can show its working, but the UI must
     *  not present it as a finding. */
    shapeReliable: pose.frontal,
  };
}
