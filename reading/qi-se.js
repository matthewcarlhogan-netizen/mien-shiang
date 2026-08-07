/*
 * MODULE A — qi se (氣色), the complexion reading.
 *
 * Consumes `adapters/entertainment.js` output and NOTHING else. It never sees
 * the labelled observation path, so no condition name can reach it.
 *
 * Permitted vocabulary: glow, vitality, radiance, warmth, clarity, luminosity,
 * evenness. Forbidden: any condition name, any severity language, any clinical
 * term. Enforced by tests/copy-guard.test.js over this file's output.
 *
 * ── THE PARTIAL-BASIS RULE ─────────────────────────────────────────────────
 * The adapter drops a component it could not measure rather than scoring it
 * zero, and rescales. That is correct, but it means a reading built on two
 * colour signals is NOT the same object as one built on three, and presenting
 * them identically would be a quiet lie about how much was seen.
 *
 * So a reduced basis is always stated in the reading itself, in a sentence the
 * reader cannot miss — never a footnote, never omitted, and never smoothed
 * over by presenting the rescaled number as though it were complete.
 */

/** Of the adapter's five components, these three are colour-derived. */
export const COLOUR_SIGNALS = ["warmth", "luminosity", "evenness"];

/** Names used when telling the reader which signal was missing. */
export const SIGNAL_NAMES = {
  warmth: "complexion warmth",
  luminosity: "luminosity",
  evenness: "evenness",
};

export const BANDS = [
  {
    min: 75, key: "bright",
    reading:
      "In Mian Xiang, qi se (氣色) is the reading of complexion rather than structure — the weather of a " +
      "face rather than its architecture. The classical texts read a bright, settled complexion as qi " +
      "moving freely, and they regard it as the reading of a particular day rather than of a person.",
  },
  {
    min: 55, key: "steady",
    reading:
      "In Mian Xiang, qi se (氣色) reads the weather of a face rather than its architecture. The classical " +
      "texts read a steady, even complexion as qi moving without hurry — the ordinary and unremarkable " +
      "case, which the texts rate more kindly than the striking one.",
  },
  {
    min: 0, key: "quiet",
    reading:
      "In Mian Xiang, qi se (氣色) reads the weather of a face rather than its architecture. The classical " +
      "texts read a quieter complexion as qi gathered inward rather than spent outward, and they are " +
      "explicit that this is a passing season — qi se is the one part of the reading they expect to change " +
      "week to week.",
  },
];

export const SOURCES_DIFFER =
  "Sources differ on this — Mian Xiang texts agree that qi se changes and structure does not, but they " +
  "disagree on how far it can be read at all from a still likeness rather than in person, where a " +
  "practitioner would be watching it move.";

/**
 * @param {object} complexion `readComplexion()` output from the Module A adapter
 */
export function readQiSe(complexion) {
  if (!complexion || complexion.glowIndex === null) {
    return {
      available: false,
      why: "notEnoughSkinVisible",
      note:
        "There wasn't enough clear skin in this photo to read qi se from, so the complexion reading is " +
        "left out rather than guessed at.",
    };
  }

  const present = COLOUR_SIGNALS.filter((s) => complexion.components[s] !== null);
  const missing = COLOUR_SIGNALS.filter((s) => complexion.components[s] === null);
  const basisComplete = missing.length === 0;

  const band = BANDS.find((b) => complexion.glowIndex >= b.min) ?? BANDS[BANDS.length - 1];

  // Stated whenever the basis is short, in the reading rather than beside it.
  const basisNote = basisComplete
    ? null
    : `Today's reading is based on ${numberWord(present.length)} of three colour signals — ` +
      `${listNames(missing)} wasn't measurable in this lighting.`;

  return {
    available: true,
    glowIndex: complexion.glowIndex,
    band: band.key,
    reading: band.reading,
    /** Present exactly when the basis is short. The UI must render it with the
     *  reading, never collapsed into a tooltip. */
    basisNote,
    basisComplete,
    signalsUsed: present,
    signalsMissing: missing,
    /** Carried from the adapter so a history feature can refuse to compare
     *  readings built on different component sets. */
    basis: complexion.basis,
    warmth: complexion.components.warmth,
    luminosity: complexion.components.luminosity,
    evenness: complexion.components.evenness,
    clarity: complexion.components.clarity,
    sourcesDiffer: SOURCES_DIFFER,
  };
}

function numberWord(n) {
  return ["zero", "one", "two", "three"][n] ?? String(n);
}

function listNames(keys) {
  const names = keys.map((k) => SIGNAL_NAMES[k] ?? k);
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}
