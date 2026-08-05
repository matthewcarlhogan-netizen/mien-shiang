/*
 * Expression and asymmetry from MediaPipe's 52 blendshape coefficients.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ───────────────────────────────
 * Blendshapes describe the face's CONFIGURATION AT THE MOMENT OF CAPTURE.
 * A smile coefficient means the person was smiling in that frame. It does not
 * mean the person is cheerful, agreeable, confident, or anything else about
 * who they are. Expression is STATE, never personality.
 *
 * Nothing in this module may be consumed by the reading engine as a trait
 * input. Its legitimate uses are: telling the user their eyes were shut,
 * telling them the reading was taken mid-expression so the proportions moved,
 * and reporting left/right asymmetry as a neutral observation.
 *
 * ── LATERALITY ─────────────────────────────────────────────────────────────
 * The coefficient names carry "Left"/"Right" in the ARKit convention, which is
 * subject-anatomical — the same convention as the landmark indices (CLAUDE.md
 * item 5). Nothing here depends on it: the asymmetry measure is |L − R|, which
 * is unchanged if the two are swapped.
 */

/** Coefficient pairs used for the asymmetry index. Suffix-stripped base names. */
export const PAIRED_SHAPES = [
  "browDown", "browOuterUp", "cheekSquint", "eyeBlink", "eyeSquint", "eyeWide",
  "mouthDimple", "mouthFrown", "mouthLowerDown", "mouthPress", "mouthSmile",
  "mouthStretch", "mouthUpperUp", "noseSneer",
];

/** Normalise MediaPipe's category array into a plain {name: score} map. */
export function toScoreMap(blendshapes) {
  const map = Object.create(null);
  for (const c of blendshapes?.categories ?? []) {
    map[c.categoryName ?? c.displayName] = c.score;
  }
  return map;
}

const get = (m, k) => (typeof m[k] === "number" ? m[k] : 0);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/**
 * @param {{categories:Array}} blendshapes  `result.faceBlendshapes[0]`
 * @returns expression state + asymmetry, all in 0..1
 */
export function expressionState(blendshapes) {
  const m = toScoreMap(blendshapes);

  const pairs = PAIRED_SHAPES.map((base) => {
    const left = get(m, `${base}Left`);
    const right = get(m, `${base}Right`);
    return { shape: base, left, right, delta: Math.abs(left - right) };
  });

  const smile = mean([get(m, "mouthSmileLeft"), get(m, "mouthSmileRight")]);
  const blink = mean([get(m, "eyeBlinkLeft"), get(m, "eyeBlinkRight")]);
  const browRaise = mean([
    get(m, "browInnerUp"), get(m, "browOuterUpLeft"), get(m, "browOuterUpRight"),
  ]);

  return {
    /** Higher = closer to a rest face. MediaPipe emits a `_neutral` shape. */
    neutral: get(m, "_neutral"),
    smile,
    jawOpen: get(m, "jawOpen"),
    eyesClosed: blink,
    browRaise,
    pairs,
    /** Mean absolute left/right difference across the paired coefficients.
     *  A neutral observation about this photo. NOT a symmetry "score", not a
     *  rating, and explicitly not comparable between people. */
    asymmetryIndex: mean(pairs.map((p) => p.delta)),

    /** Capture-quality flags. These exist so the UI can tell the user the
     *  photo was taken mid-expression, which moves the very proportions the
     *  geometry layer measures. */
    flags: {
      eyesClosed: blink > 0.5,
      strongExpression: smile > 0.4 || get(m, "jawOpen") > 0.4,
    },
  };
}

/**
 * Guard rail, exported so tests can assert it and reviewers can find it.
 * Any future code that tries to route expression output into trait generation
 * should fail this check loudly rather than silently reviving physiognomy of
 * the "your smile means you are warm" kind.
 */
export const EXPRESSION_IS_STATE_NOT_TRAIT = Object.freeze({
  mayInform: ["capture quality warnings", "asymmetry observation", "retake prompts"],
  mayNotInform: ["personality", "character", "mood as disposition", "any trait output"],
});
