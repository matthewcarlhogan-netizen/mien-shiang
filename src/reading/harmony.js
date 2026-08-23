/*
 * MODULE A — proportion harmony.
 *
 * ── WHAT THIS IS, AND THE LINE IT DOES NOT CROSS ───────────────────────────
 * This reports how closely a set of measured proportions sits to what NAMED
 * historical canons treated as ideal. That is a statement about the canons.
 *
 * It is NOT a rating of a face, and the difference is not a wording trick — it
 * changes what the number means and what it can be wrong about. "These
 * proportions are 0.62 of the way to the neoclassical figure" is checkable
 * against the arithmetic and against the cited convention. "This face is a 62"
 * is a claim about a person that no measurement in this repo supports, that
 * the copy guards reject, and that geometry.js says in its own header it does
 * not make.
 *
 * Consequences that follow, and must not be quietly undone:
 *
 *   - No comparison between people, ever. No percentile, no rank, no "above
 *     average". There is no population here to be average against.
 *   - The canons DISAGREE, and that is surfaced rather than resolved. The
 *     neoclassical mouth-to-nose figure and the Mian Xiang Three Courts come
 *     from different centuries and different projects.
 *   - Every component names its source inline, per the Module A copy rules.
 *   - `basis` travels with the value. A face measured on two components is not
 *     comparable with one measured on four, exactly as with glowIndex.
 *
 * Pure. No DOM. Consumes geometryReport() and rawScalars() — never analyse(),
 * which carries condition labels Module A may not see.
 */

import { canonMatch, CANON } from "../geometry.js";

/**
 * Component weights.
 *
 * From the brief. They are editorial — how much each convention counts toward
 * the composite is a presentation choice, not a measurement, and no data here
 * supports one split over another. Stated as a table so the choice is visible
 * rather than buried in an expression.
 */
export const HARMONY_WEIGHTS = {
  canon: 4 / 9,
  symmetry: 3 / 9,
  jaw: 2 / 9,
};

/**
 * Gonial angle range used to place a jaw on a 0-1 scale.
 *
 * Not a canon — no classical text gives a gonial angle in degrees. These are
 * the bounds of the ordinary adult range as used in cephalometric description,
 * so the value says where in the normal range a jaw sits, and explicitly not
 * whether that is good. A sharper corner is neither better nor worse here.
 */
export const JAW_ANGLE_SHARP = 110;
export const JAW_ANGLE_SOFT = 145;

/** Cheekbone prominence bounds, likewise descriptive rather than canonical. */
export const CHEEKBONE_FLAT = 0.98;
export const CHEEKBONE_HIGH = 1.18;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Surface evenness from the neutral scalars.
 *
 * Consumes rawScalars() ONLY. `analyse()` would carry condition names into the
 * entertainment module, which is the boundary violation CLAUDE.md item 16
 * describes — and it would look harmless, because it returns the same numbers.
 *
 * Returns null rather than a default when the scalars are absent or the colour
 * regime refused to measure. A stand-in value here would let the composite
 * imply a reading that did not happen.
 */
export function surfaceEvenness(raw) {
  if (!raw || !raw.zones) return null;
  const spread = [];
  for (const z of Object.values(raw.zones)) {
    if (z.deltaContrast !== null && Number.isFinite(z.deltaContrast)) {
      spread.push(Math.abs(z.deltaContrast));
    }
  }
  if (spread.length < 3) return null;
  const mean = spread.reduce((a, b) => a + b, 0) / spread.length;
  // 0.006 is TEXTURE_CONTRAST_FULL_SCALE — one full scale of departure from
  // the subject's own baseline reads as fully uneven.
  return { value: clamp01(1 - mean / 0.006), zones: spread.length };
}

/**
 * @param {object} geometry  geometryReport() output
 * @param {object} [raw]     rawScalars() output, for the optional surface term
 */
export function readHarmony(geometry, raw) {
  if (!geometry) return null;

  const components = [];

  // ── canon proportions ──────────────────────────────────────────────────
  const canonEntries = [
    ["mouthToNose", CANON.MOUTH_TO_NOSE], ["middleCourt", CANON.MIDDLE_COURT],
    ["centralFifth", CANON.CENTRAL_FIFTH],
  ];
  const canonParts = [];
  for (const [key, spec] of canonEntries) {
    const m = geometry.canon?.[key];
    const match = m ? canonMatch(m.value, spec) : null;
    if (match !== null) canonParts.push({ key, match, value: m.value, canon: m.canon, source: m.source });
  }
  if (canonParts.length) {
    components.push({
      key: "canon",
      value: canonParts.reduce((a, p) => a + p.match, 0) / canonParts.length,
      weight: HARMONY_WEIGHTS.canon,
      parts: canonParts,
    });
  }

  // ── symmetry, dropped rather than guessed when the head is turned ──────
  const sym = geometry.symmetry;
  if (sym && sym.value !== null && sym.reliable) {
    components.push({
      key: "symmetry",
      value: clamp01(sym.value),
      weight: HARMONY_WEIGHTS.symmetry,
    });
  }

  // ── jaw ─────────────────────────────────────────────────
  if (Number.isFinite(geometry.jaw?.degrees)) {
    const d = geometry.jaw.degrees;
    components.push({
      key: "jaw",
      value: clamp01((JAW_ANGLE_SOFT - d) / (JAW_ANGLE_SOFT - JAW_ANGLE_SHARP)),
      weight: HARMONY_WEIGHTS.jaw,
      degrees: d,
    });
  }

  if (!components.length) {
    return { module: "A", value: null, basis: "", components: [], sourcesDiffer: SOURCES_DIFFER };
  }

  /* Rescale over the components actually measured, exactly as glowIndex does.
   * The consequence is the same and is just as easy to miss: dropping a
   * below-average component RAISES the composite, so two runs over different
   * component sets are not comparable and nothing may plot them together. */
  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const weighted = components.reduce((a, c) => a + c.value * c.weight, 0) / totalWeight;

  const surface = surfaceEvenness(raw);
  const modifier = surface ? (surface.value - 0.5) * 0.2 : 0;

  return {
    module: "A",
    /** 0-100, how closely these proportions sit to the named canons. Never a
     *  rating of a person, and never comparable between people. */
    value: Math.round(clamp01(weighted + modifier) * 100),
    withoutSurface: Math.round(clamp01(weighted) * 100),
    surface,
    /** Sorted component keys. Group by this before comparing two results. */
    basis: components.map((c) => c.key).sort().join("+"),
    components,
    dropped: sym && !sym.reliable ? [{ key: "symmetry", why: sym.caveat }] : [],
    sourcesDiffer: SOURCES_DIFFER,
  };
}

/**
 * Where the canons disagree, the UI says so — the pattern every other reading
 * surface follows. These conventions are not one system: the neoclassical
 * figures were a Renaissance and Enlightenment project in European portraiture,
 * and the Three Courts and facial fifths are Mian Xiang. They were never meant
 * to be combined, and combining them is a decision this app made.
 */
export const SOURCES_DIFFER =
  "Sources differ, and these ones were never one system. The golden-section "
  + "figure comes from European art theory, while the Three Courts and the "
  + "facial fifths come from Mian Xiang. Putting them in one view is a choice "
  + "this app made, not something the texts agree on.";

/** The framing shown above the value. Registered for the copy scan. */
export const HARMONY_LEAD =
  "How closely these proportions sit to what the traditions below treated as "
  + "canonical. This describes the conventions, not the person reading it.";

export const HARMONY_NOT_MEASURED =
  "Not enough of the face was measured to compare against the canons.";
