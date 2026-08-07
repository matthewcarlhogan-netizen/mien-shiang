/*
 * MODULE A — the entertainment reading's interface to the colorimetry engine.
 *
 * ── THE BOUNDARY THIS FILE IS ──────────────────────────────────────────────
 * In goes `rawScalars()` output: neutral physical quantities (log-ratio
 * differences, texture contrast deltas, ridge responses, lightness and
 * blue-yellow axes). Out come glow / vitality / radiance values, and nothing
 * else.
 *
 * This module MUST NOT import from `engine.js` anything that names a
 * condition, and MUST NOT consume `analyse()`. `analyse()` emits
 * `condition: "erythema" | "pallor" | "hyperpigmentation" | "xerosis" | …`,
 * which is clinical vocabulary — consuming it would put clinical labels inside
 * Module A on day one, and the boundary would exist on paper only. The whole
 * point of `rawScalars()` is that it is the layer BELOW labelling.
 *
 * Nothing here may emit health vocabulary in any string it returns. A test
 * asserts that against a blocklist over the entire returned object.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 * `glowIndex` is a property OF THIS PHOTO'S complexion measurement, not a
 * property of the person. It is not an attractiveness rating, not a rank, not
 * a percentile, and there is deliberately no API here for comparing one
 * person's value to another's or to a population. Read the guard test.
 *
 * ── NO READING COPY LIVES HERE ─────────────────────────────────────────────
 * This returns VALUES. Sentences shown to a user are written in the copy layer
 * once this boundary exists, and are not to be inlined here — otherwise the
 * copy deck and the module boundary drift apart, which is the thing the
 * boundary is for.
 */

/* Full-scale constants converting physical quantities to 0..1 components.
 *
 * These are reasoned starting points, not fitted values. There is no labelled
 * ground truth in this repo for "glow" any more than there is for severity
 * (CLAUDE.md, "Severity scaling is uncalibrated"). Same category of object,
 * same honesty required of anything built on them. */
export const GLOW_SCALES = {
  /** Spread of pigment difference across zones at which evenness reads as 0. */
  PIGMENT_SPREAD_FULL: 8.0,
  /** Texture contrast rise at which smoothness reads as 0. */
  TEXTURE_FULL: 0.35,
  /** Ridge prominence rise at which surface clarity reads as 0. */
  RIDGE_FULL: 0.06,
  /** |ΔL*| from baseline at which luminosity variation reads as 0. */
  LUMINOSITY_FULL: 12.0,
  /** Colour departure from the subject's own baseline at which warmth
   *  reads as 0. Symmetric — both directions are a departure from balance. */
  WARMTH_FULL: 9.0,
};

/** Relative contribution of each component to the composite. */
export const GLOW_WEIGHTS = {
  evenness: 0.30,
  smoothness: 0.25,
  clarity: 0.20,
  luminosity: 0.15,
  warmth: 0.10,
};

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** Components fall as the measured quantity rises above the subject's own baseline. */
const inverse = (v, full) => (Number.isFinite(v) ? clamp01(1 - Math.max(0, v) / full) : null);

/**
 * @param {{baseline:object, zones:object}} raw  `rawScalars()` output
 * @returns complexion values only — no conditions, no copy, no rating
 */
export function readComplexion(raw) {
  const zones = Object.values(raw?.zones ?? {});
  const baseline = raw?.baseline ?? {};

  if (!zones.length) {
    return {
      glowIndex: null,
      components: {},
      componentsUsed: [],
      componentsUnavailable: ["evenness", "smoothness", "clarity", "luminosity", "warmth"],
      warmthAvailable: false,
      note: "notEnoughSkinVisible",
    };
  }

  // ── evenness: how uniform pigment is across the face ──────────────────────
  const mi = zones.map((z) => z.deltaMi).filter(Number.isFinite);
  const pigmentSpread = mi.length ? Math.max(...mi) - Math.min(...mi) : null;
  const evenness = pigmentSpread === null
    ? null : clamp01(1 - pigmentSpread / GLOW_SCALES.PIGMENT_SPREAD_FULL);

  // ── smoothness: surface texture relative to the subject's own baseline ────
  const tex = zones.map((z) => z.deltaContrast).filter(Number.isFinite);
  const smoothness = tex.length ? inverse(mean(tex), GLOW_SCALES.TEXTURE_FULL) : null;

  // ── clarity: prominence of surface lines ──────────────────────────────────
  const ridge = zones.map((z) => z.ridgeDelta).filter(Number.isFinite);
  const clarity = ridge.length ? inverse(mean(ridge), GLOW_SCALES.RIDGE_FULL) : null;

  // ── luminosity: how evenly light sits across the face ─────────────────────
  const Ls = zones.map((z) => z.L).filter(Number.isFinite);
  const lumSpread = Ls.length ? Math.max(...Ls) - Math.min(...Ls) : null;
  const luminosity = lumSpread === null
    ? null : clamp01(1 - lumSpread / GLOW_SCALES.LUMINOSITY_FULL);

  // ── warmth: STRUCTURALLY ABSENT when colour cannot be measured ────────────
  //
  // `deltaEi` is null for every zone in the low-confidence regime — the
  // physical limit at deeper skin tones (CLAUDE.md). The correct response is
  // to DROP this component and redistribute its weight, never to score it 0.
  // A zero would drag the composite down and make the app quietly report a
  // worse complexion reading for darker skin, which is precisely the bias the
  // self-referencing measurement design exists to avoid. The component is
  // absent, and `warmthAvailable` says so.
  const ei = zones.map((z) => z.deltaEi).filter(Number.isFinite);
  const warmth = ei.length
    ? clamp01(1 - Math.abs(mean(ei)) / GLOW_SCALES.WARMTH_FULL)
    : null;

  const components = { evenness, smoothness, clarity, luminosity, warmth };

  // Weighted mean over AVAILABLE components only; the divisor is the weight
  // actually present, so dropping one rescales rather than penalises.
  const used = Object.entries(components).filter(([, v]) => v !== null);
  const unavailable = Object.entries(components).filter(([, v]) => v === null).map(([k]) => k);

  const weightPresent = used.reduce((s, [k]) => s + GLOW_WEIGHTS[k], 0);
  const glowIndex = weightPresent > 0
    ? Math.round((used.reduce((s, [k, v]) => s + GLOW_WEIGHTS[k] * v, 0) / weightPresent) * 100)
    : null;

  return {
    /** 0–100, a reading of THIS PHOTO's complexion. Never a rating of a
     *  person, never ranked, never compared across people. */
    glowIndex,

    /**
     * Which components the index was actually computed from, as a stable
     * sorted key.
     *
     * ── WHY THIS FIELD EXISTS ─────────────────────────────────────────────
     * Because the weights rescale over available components, an index built
     * from four components IS NOT COMPARABLE with one built from five. A face
     * whose warmth reads 0.67 scores 97 with warmth included and 100 with it
     * dropped — the number went UP because the missing component was the
     * below-average one, not because the complexion changed.
     *
     * That is the correct behaviour (scoring a missing component 0 would
     * systematically penalise deeper skin tones, which is exactly the bias the
     * self-referencing design exists to avoid), but it makes cross-regime
     * comparison meaningless.
     *
     * So any trend or history feature MUST group by `basis` and refuse to plot
     * across a change in it. A glow-over-time chart that ignores this would
     * show a step change whenever lighting moved the subject between
     * confidence regimes, and would read as a real change in the person.
     */
    basis: used.map(([k]) => k).sort().join("+"),

    components,
    componentsUsed: used.map(([k]) => k),
    componentsUnavailable: unavailable,
    /** False when colour could not be measured from this photo. Consumers must
     *  branch on this rather than treating a missing warmth as a low warmth. */
    warmthAvailable: warmth !== null,
    /** Machine-readable note keys only — never sentences. The copy layer owns
     *  the words, so that the copy lint has exactly one surface to scan. */
    note: warmth === null ? "colourNotMeasurableFromThisPhoto" : null,
    /** Carried through so the copy layer can explain coverage without reaching
     *  back into the engine and re-deriving it. */
    zonesRead: Object.keys(raw.zones).length,
    toneBand: baseline.band ?? null,
  };
}
