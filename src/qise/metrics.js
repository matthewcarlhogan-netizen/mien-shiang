/*
 * PHASE 5 — the five metrics. Pure, DOM-free.
 *
 * ── WHY EVERY METRIC IS COMPUTED TWICE ─────────────────────────────────────
 * Once from sclera-corrected pixels and once from raw post-ISP pixels. Storage
 * is cheap; an irreversible architectural choice is not. Phase 5b decides
 * which pipeline ships by measuring both on a real device, and it can only do
 * that if both were stored from the beginning. Whichever loses stays behind a
 * flag and both keep being stored.
 */
import { chroma, deltaE2000, sCWeight } from "./color.js";

/**
 * The regions that carry complexion colour.
 *
 * `periorbital` is excluded from the face set on purpose: the skin under the
 * eye is thinner and darker on everyone, so including it drags the mean toward
 * a constant offset that says nothing about today. It is still measured, and
 * `hei` weights it specifically — that is where it belongs.
 */
export const FACE_ROIS = Object.freeze([
  "tian", "yintang", "shangen", "zhuntou", "quan_l", "quan_r", "dige",
]);

/** The regions `ming` reads: the ones that catch a highlight. */
export const MING_ROIS = Object.freeze(["tian", "zhuntou", "quan_l", "quan_r"]);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Population SD. The set is seven regions, not a sample from a population. */
function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function percentile(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * Lustre, as the shape of a region's luminance distribution.
 *
 * Taken on UNTRIMMED pixels, unlike everything else here. The trim exists to
 * remove the tails, and the tail is precisely what this measures: a lustrous
 * surface has a specular shoulder above its own body, a matte one does not.
 * Trimming first would delete the signal and leave a ratio of 1.0 for
 * everybody.
 */
export function lumRatioP90P50(pixels, color) {
  if (!pixels || pixels.length === 0) return null;
  const L = pixels.map((p) => color.labFromSrgb8(p.r, p.g, p.b).L);
  const p50 = percentile(L, 0.50);
  if (!p50) return null;
  return percentile(L, 0.90) / p50;
}

/**
 * The five metrics for one pipeline.
 *
 * @param {Object<string,{L:number,a:number,b:number}>} lab per region
 * @param {Object<string,number>} lumRatio P90/P50 per region, untrimmed
 * @param {{baselineChroma?:number}} [options]
 */
export function computeMetrics(lab, lumRatio, options = {}) {
  const present = FACE_ROIS.filter((r) => lab && lab[r]);
  const basis = [...present].sort().join("+");

  if (present.length < 2) {
    return {
      hueVector: null, ming: null, run: null, han: null, xue: null,
      meanChroma: null, meanL: null, periorbitalL: null, basis, roisRead: present.length,
    };
  }

  /* hueVector — the mean colour coordinate across the face. The compass
   * differences it against the user's own baseline in Phase 6; storing the
   * absolute value is what lets the baseline be recomputed later without
   * re-deriving every reading. */
  const hueVector = {
    a: mean(present.map((r) => lab[r].a)),
    b: mean(present.map((r) => lab[r].b)),
  };

  /* ming — lustre. */
  const mingParts = MING_ROIS.map((r) => lumRatio && lumRatio[r]).filter((v) => typeof v === "number");
  const ming = mingParts.length ? mean(mingParts) : null;

  /*
   * run — moisture, as mean chroma.
   *
   * ── WHY THIS IS A COORDINATE DELTA AND NOT A DISTANCE ─────────────────────
   * CIELAB is perceptually non-uniform in exactly the red/yellow region where
   * all skin sits, and Euclidean dE76 over-weights chroma there. That is a real
   * problem, and it is why `han` uses dE00: `han` is a true distance comparison
   * ACROSS regions, which is where the distortion actually bites.
   *
   * `run` and the compass axes are not distances. They are coordinate deltas,
   * and dE00 does not directly apply to one — it has no direction, and
   * direction is the whole compass. Replacing them with a distance metric would
   * throw away the only thing they carry.
   *
   * Two things absorb the non-uniformity instead. Every axis is normalised by
   * the user's own MAD on that axis (Phase 6), which handles it empirically for
   * that individual at their own chroma level. And `run` is additionally scaled
   * by sCWeight of the user's BASELINE mean chroma, so a high-chroma and a
   * low-chroma user get comparable sensitivity from the same physical shift.
   *
   * Someone will otherwise "fix" this later.
   */
  const ownChroma = mean(present.map((r) => chroma(lab[r].a, lab[r].b)));
  const referenceChroma = typeof options.baselineChroma === "number" ? options.baselineChroma : ownChroma;
  const run = ownChroma * sCWeight(referenceChroma);

  /*
   * han — containment, as the negative spread of inter-region colour distance.
   *
   * dE00 here, and non-negotiably: this is the one place in the app that
   * compares one region's colour against another's, so it is the one place the
   * space's non-uniformity is measured rather than differenced away.
   *
   * Negative so that the metric runs the same way as the others: more contained
   * is a larger number.
   */
  const pairwise = [];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      pairwise.push(deltaE2000(lab[present[i]], lab[present[j]]));
    }
  }
  const han = -sd(pairwise);

  /*
   * xue — the cheek-to-forehead red differential.
   *
   * PRIMARY metric. A within-image, within-frame differential: illuminant,
   * exposure, device gain and any global tone curve cancel in the subtraction.
   * It survives even when the sclera correction is untrustworthy. Weight it
   * highest in the compass and never gate it on sclera confidence.
   */
  const cheeks = ["quan_l", "quan_r"].filter((r) => lab[r]).map((r) => lab[r].a);
  const xue = (cheeks.length && lab.tian) ? median(cheeks) - lab.tian.a : null;

  return {
    hueVector, ming, run, han, xue,
    meanChroma: ownChroma,
    // The remaining compass axes. `hei` is the one colour that is not read off
    // the face set: it is driven by -dL* and weighted by the periorbital
    // region, which is exactly the region hueVector and han exclude.
    meanL: mean(present.map((r) => lab[r].L)),
    periorbitalL: lab.periorbital ? lab.periorbital.L : null,
    basis,
    roisRead: present.length,
  };
}

/**
 * Both pipelines, from the same burst.
 *
 * @param {{rawLab:Object, correctedLab:Object, lumRatio:Object,
 *          baseline?:{raw?:Object, corrected?:Object}}} input
 */
export function computeReadingMetrics(input) {
  const { rawLab, correctedLab, lumRatio, baseline } = input;
  return {
    raw: computeMetrics(rawLab, lumRatio, { baselineChroma: baseline?.raw?.meanChroma }),
    corrected: computeMetrics(correctedLab, lumRatio, { baselineChroma: baseline?.corrected?.meanChroma }),
  };
}
